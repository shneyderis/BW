// js/data.js — Data loading: CSV (Google Sheets / local), NBU, Settings, utilities
// SID, SID2 defined in config.js

function pn(s){if(!s||s==="")return 0;s=String(s).trim();let ng=false;if(s.startsWith("(")&&s.endsWith(")")){ng=true;s=s.slice(1,-1)}if(s.startsWith("-")){ng=true;s=s.slice(1)}s=s.replace(/[₴$€\s]/g,"").replace(/,/g,"");let n=parseFloat(s);return isNaN(n)?0:ng?-n:n}
const fm=n=>{if(!n&&n!==0)return"—";const a=Math.abs(n);if(a>=1e6)return(n/1e6).toFixed(1)+"M";if(a>=1e3)return(n/1e3).toFixed(0)+"K";return n.toFixed(0)};
const ff=n=>n?new Intl.NumberFormat("uk-UA",{maximumFractionDigits:0}).format(n):"0";
function gv(o,s){for(const k of Object.keys(o)){if(k.trim().toLowerCase().startsWith(s.toLowerCase()))return o[k]}return""}
function toCur(v){if(SETS.dispCur==="EUR")return v/FX.EUR;if(SETS.dispCur==="USD")return v/FX.USD;return v}
function cs(){return SETS.dispCur==="EUR"?"€":SETS.dispCur==="USD"?"$":"₴"}

// ===== Джерело даних: Google Sheets (за замовчуванням) або локальні CSV =====
// ?src=local  → data/sheets/<лист>.csv   (знімок, який робить tools/pull_sheets.py)
// ?src=test   → tests/fixtures/sheets/   (синтетичні дані для тестів)
const DATA_SRC=(()=>{try{const p=new URLSearchParams(location.search).get("src");if(p)return p;return""}catch(e){return""}})();
const DATA_SRC_DIR=DATA_SRC==="local"?"data/sheets/":DATA_SRC==="test"?"tests/fixtures/sheets/":"";

// ===== Службові примітки про джерела даних =====
// maxD(arr, r=>r.date) → остання дата у наборі (YYYY-MM-DD або YYYY-MM)
function maxD(arr,fn){let m="";const lim=new Date(Date.now()+86400000).toISOString().substring(0,10);(arr||[]).forEach(r=>{let d=String(fn(r)||"").substring(0,10);const x=d.match(/^(\d{2})\.(\d{2})\.(\d{4})/);if(x)d=x[3]+"-"+x[2]+"-"+x[1];if(d>m&&d<=lim)m=d});return/^\d{4}/.test(m)?m:""}
// srcP("Книга → лист","2025-07","dd") → "● Книга → лист · дані до 2025-07 (2 міс тому)"; id — джерело з health.js (кольорова крапка)
function srcP(name,last,id){
  const h=(typeof HEALTH!=="undefined"&&id)?HEALTH.byId[id]:null;
  const dot=h?hdot(id):"";const cls=h?h.status:"";
  const ago=last&&typeof agoStr==="function"?agoStr(last):"";
  return`<span class="sp${cls?" hs-"+cls:""}">${dot}${name}${last?` · дані до <b>${last}</b>${ago?` <i style="opacity:.8">(${ago})</i>`:""}`:""}</span>`;
}
// srcN([...]) → блок-примітка вгорі вкладки
function srcN(parts){const a=(Array.isArray(parts)?parts:[parts]).filter(Boolean);return a.length?`<div class="srcnote">ℹ ${a.join("")}</div>`:""}
// srcI("лист","дата") → маленька примітка в заголовку таблиці
function srcI(name,last){return`<span class="srcnote-i">${name}${last?` · дані до <b>${last}</b>`:""}</span>`}
// Книги (файли) Google Sheets — реальні назви + клікабельні посилання на файл
function bkA(sid,name){return`<a href="https://docs.google.com/spreadsheets/d/${sid}/edit" target="_blank" rel="noopener">${name}</a>`}
function BK_MAIN(){return bkA(SID,"BW_Looker_Data")}
function BK_ACC(){return bkA(SID2,"BW_accounts")}
function BK_1C(){return bkA(SID3,"beykush_data")}

// CSV export utility
function exportCSV(filename,headers,rows){
  const csvRows=[headers.join(",")];
  rows.forEach(r=>{csvRows.push(r.map(c=>{const s=String(c==null?"":c);return s.includes(",")||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s}).join(","))});
  const blob=new Blob(["﻿"+csvRows.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

// CSV text → масив обʼєктів за заголовком (RFC4180: лапки, коми, переноси)
function parseCSV(t){
  if(!t||t.length<5)return[];if(t.charCodeAt(0)===0xFEFF)t=t.substring(1);
  const rows=[];let c=[],q=false,f="";
  for(let i=0;i<t.length;i++){const x=t[i];if(q){if(x==='"'&&t[i+1]==='"'){f+='"';i++}else if(x==='"')q=false;else f+=x}else{if(x==='"')q=true;else if(x===','){c.push(f);f=""}else if(x==='\n'||(x==='\r'&&t[i+1]==='\n')){c.push(f);f="";rows.push(c);c=[];if(x==='\r')i++}else f+=x}}
  if(f||c.length){c.push(f);rows.push(c)}if(rows.length<2)return[];
  const h=rows[0].map(x=>x.trim());return rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>{o[k]=r[i]!==undefined?r[i].trim():""});return o});
}
// Локальний файл CSV (data/*.csv, tests/fixtures/*) → масив обʼєктів; [] якщо файла немає
async function csvLocal(path){
  try{const r=await fetch(path,{cache:"no-store"});if(!r.ok)return[];const ct=r.headers.get("content-type")||"";const t=await r.text();if(ct.includes("html")||t.trim().startsWith("<"))return[];return parseCSV(t)}catch(e){return[]}
}

async function csvF(sh,sid){
  if(DATA_SRC_DIR)return csvLocal(DATA_SRC_DIR+sh+".csv");
  const cacheKey="bw_csv_"+sh;
  try{
    const ctrl=new AbortController();const tid=setTimeout(()=>ctrl.abort(),8000);
    const r=await fetch(`https://docs.google.com/spreadsheets/d/${sid||SID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sh)}`,{signal:ctrl.signal});
    clearTimeout(tid);
    if(!r.ok){console.warn("csvF("+sh+"): HTTP "+r.status);return[]}
    const ct=r.headers.get("content-type")||"";
    if(ct.includes("html")){console.warn("csvF("+sh+"): got HTML, sheet probably missing");return[]}
    const t=await r.text();const data=parseCSV(t);
    try{localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data}))}catch(e){}
    return data;
  }catch(e){
    // Offline fallback: try localStorage cache
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");if(cached&&cached.data){console.warn("csvF("+sh+"): offline, using cache from",new Date(cached.ts).toLocaleString());return cached.data}}catch(e2){}
    throw e;
  }
}

async function nbuF(){
  if(DATA_SRC_DIR){FX.EUR=48.5;FX.USD=41.3;return}
  try{const r=await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json");const d=await r.json();const e=d.find(x=>x.cc==="EUR"),u=d.find(x=>x.cc==="USD");if(e)FX.EUR=e.rate;if(u)FX.USD=u.rate}catch(e){}
}

async function loadSettings(){
  try{
    const data=await csvF("Settings");
    if(data.length){
      SETTINGS=data.map(row=>({
        setting_key:gv(row,"setting_key")||row["setting_key"]||"",
        value:gv(row,"value")||row["value"]||"",
        date_from:gv(row,"date_from")||row["date_from"]||"",
        description:gv(row,"description")||row["description"]||""
      }));
      console.log("Settings loaded:",SETTINGS.length);
    }
  }catch(e){console.warn("Settings load failed:",e);SETTINGS=[]}
}

function getSettingValue(key, date){
  if(!SETTINGS||!SETTINGS.length)return null;
  const d=typeof date==='string'?new Date(date):date;
  const matching=SETTINGS.filter(s=>s.setting_key===key).sort((a,b)=>new Date(b.date_from)-new Date(a.date_from));
  for(const s of matching){if(new Date(s.date_from)<=d)return parseFloat(s.value)}
  return matching.length?parseFloat(matching[matching.length-1].value):null;
}
