// js/data.js — Data loading: CSV, NBU, Settings
// SID, SID2 defined in config.js

function pn(s){if(!s||s==="")return 0;s=String(s).trim();let ng=false;if(s.startsWith("(")&&s.endsWith(")")){ng=true;s=s.slice(1,-1)}if(s.startsWith("-")){ng=true;s=s.slice(1)}s=s.replace(/[₴$€\s]/g,"").replace(/,/g,"");let n=parseFloat(s);return isNaN(n)?0:ng?-n:n}
const fm=n=>{if(!n&&n!==0)return"—";const a=Math.abs(n);if(a>=1e6)return(n/1e6).toFixed(1)+"M";if(a>=1e3)return(n/1e3).toFixed(0)+"K";return n.toFixed(0)};
const ff=n=>n?new Intl.NumberFormat("uk-UA",{maximumFractionDigits:0}).format(n):"0";
function gv(o,s){for(const k of Object.keys(o)){if(k.trim().toLowerCase().startsWith(s.toLowerCase()))return o[k]}return""}
function toCur(v){if(SETS.dispCur==="EUR")return v/FX.EUR;if(SETS.dispCur==="USD")return v/FX.USD;return v}
function cs(){return SETS.dispCur==="EUR"?"€":SETS.dispCur==="USD"?"$":"₴"}

// ===== Службові примітки про джерела даних =====
// maxD(arr, r=>r.date) → остання дата у наборі (YYYY-MM-DD або YYYY-MM)
function maxD(arr,fn){let m="";(arr||[]).forEach(r=>{const d=String(fn(r)||"").substring(0,10);if(d>m)m=d});return/^\d{4}/.test(m)?m:""}
// srcP("Книга → лист","2025-07") → рядок "Книга → лист · дані до 2025-07"
function srcP(name,last){return name+(last?` · дані до <b>${last}</b>`:"")}
// srcN([...]) → непомітний блок-примітка вгорі вкладки
function srcN(parts){const a=(Array.isArray(parts)?parts:[parts]).filter(Boolean);return a.length?`<div class="srcnote">ℹ ${a.join("&ensp;·&ensp;")}</div>`:""}
// srcI("лист","дата") → маленька примітка в заголовку таблиці
function srcI(name,last){return`<span class="srcnote-i">${srcP(name,last)}</span>`}
// Книги (файли) Google Sheets — реальні назви + клікабельні посилання на файл
function bkA(sid,name){return`<a href="https://docs.google.com/spreadsheets/d/${sid}/edit" target="_blank" rel="noopener">${name}</a>`}
function BK_MAIN(){return bkA(SID,"BW_Looker_Data")}
function BK_ACC(){return bkA(SID2,"BW_accounts")}
function BK_1C(){return bkA(SID3,"beykush_data")}

// CSV export utility
function exportCSV(filename,headers,rows){
  const csvRows=[headers.join(",")];
  rows.forEach(r=>{csvRows.push(r.map(c=>{const s=String(c==null?"":c);return s.includes(",")||s.includes('"')||s.includes('\n')?'"'+s.replace(/"/g,'""')+'"':s}).join(","))});
  const blob=new Blob(["\uFEFF"+csvRows.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

async function csvF(sh,sid){
  const cacheKey="bw_csv_"+sh;
  try{
    const ctrl=new AbortController();const tid=setTimeout(()=>ctrl.abort(),8000);
    const r=await fetch(`https://docs.google.com/spreadsheets/d/${sid||SID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sh)}`,{signal:ctrl.signal});
    clearTimeout(tid);
    if(!r.ok){console.warn("csvF("+sh+"): HTTP "+r.status);return[]}
    const ct=r.headers.get("content-type")||"";
    if(ct.includes("html")){console.warn("csvF("+sh+"): got HTML, sheet probably missing");return[]}
    const t=await r.text();if(!t||t.length<5)return[];const rows=[];let c=[],q=false,f="";
    for(let i=0;i<t.length;i++){const x=t[i];if(q){if(x==='"'&&t[i+1]==='"'){f+='"';i++}else if(x==='"')q=false;else f+=x}else{if(x==='"')q=true;else if(x===','){c.push(f);f=""}else if(x==='\n'||(x==='\r'&&t[i+1]==='\n')){c.push(f);f="";rows.push(c);c=[];if(x==='\r')i++}else f+=x}}
    if(f||c.length){c.push(f);rows.push(c)}if(rows.length<2)return[];
    const h=rows[0].map(x=>x.trim());const data=rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>{o[k]=r[i]!==undefined?r[i].trim():""});return o});
    try{localStorage.setItem(cacheKey,JSON.stringify({ts:Date.now(),data}))}catch(e){}
    return data;
  }catch(e){
    // Offline fallback: try localStorage cache
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");if(cached&&cached.data){console.warn("csvF("+sh+"): offline, using cache from",new Date(cached.ts).toLocaleString());return cached.data}}catch(e2){}
    throw e;
  }
}

async function nbuF(){
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
