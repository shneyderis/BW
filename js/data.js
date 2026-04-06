// js/data.js — Data loading: CSV, WooCommerce, NBU, Settings
const SID="1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ";
const SID2="1pcg8U9NBF7PpjUi8AFm7L8o4-EEclG_ApbKvODl0mgA";
const WC="/api/wc";
const WCK="consumer_key=ck_5b87215529858139d17b602945170ae4d9c8adbd&consumer_secret=cs_3ad054a505185162e849a92bf019979e6c037c93";

function pn(s){if(!s||s==="")return 0;s=String(s).trim();let ng=false;if(s.startsWith("(")&&s.endsWith(")")){ng=true;s=s.slice(1,-1)}if(s.startsWith("-")){ng=true;s=s.slice(1)}s=s.replace(/[₴$€\s]/g,"").replace(/,/g,"");let n=parseFloat(s);return isNaN(n)?0:ng?-n:n}
const fm=n=>{if(!n&&n!==0)return"—";const a=Math.abs(n);if(a>=1e6)return(n/1e6).toFixed(1)+"M";if(a>=1e3)return(n/1e3).toFixed(0)+"K";return n.toFixed(0)};
const ff=n=>n?new Intl.NumberFormat("uk-UA",{maximumFractionDigits:0}).format(n):"0";
function gv(o,s){for(const k of Object.keys(o)){if(k.trim().toLowerCase().startsWith(s.toLowerCase()))return o[k]}return""}
function toCur(v){if(SETS.dispCur==="EUR")return v/FX.EUR;if(SETS.dispCur==="USD")return v/FX.USD;return v}
function cs(){return SETS.dispCur==="EUR"?"€":SETS.dispCur==="USD"?"$":"₴"}

async function csvF(sh,sid){
  const r=await fetch(`https://docs.google.com/spreadsheets/d/${sid||SID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sh)}`);
  const t=await r.text();const rows=[];let c=[],q=false,f="";
  for(let i=0;i<t.length;i++){const x=t[i];if(q){if(x==='"'&&t[i+1]==='"'){f+='"';i++}else if(x==='"')q=false;else f+=x}else{if(x==='"')q=true;else if(x===','){c.push(f);f=""}else if(x==='\n'||(x==='\r'&&t[i+1]==='\n')){c.push(f);f="";rows.push(c);c=[];if(x==='\r')i++}else f+=x}}
  if(f||c.length){c.push(f);rows.push(c)}if(rows.length<2)return[];
  const h=rows[0].map(x=>x.trim());return rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>{o[k]=r[i]!==undefined?r[i].trim():""});return o});
}

async function wcF(ep,p=""){
  let all=[],pg=1;
  while(pg<=100){
    try{
      const ctrl=new AbortController();const tid=setTimeout(()=>ctrl.abort(),15000);
      const r=await fetch(`${WC}/${ep}?${WCK}&per_page=100&page=${pg}&${p}`,{signal:ctrl.signal});
      clearTimeout(tid);if(!r.ok){console.error("WC",ep,"page",pg,"HTTP",r.status);if(r.status===401||r.status===403)throw new Error("WC auth "+r.status);break}
      const d=await r.json();if(!d.length)break;all=all.concat(d);console.log("WC",ep,"page",pg,"got",d.length);if(d.length<100)break;pg++
    }catch(e){if(e.name==="AbortError")throw new Error("WC timeout: "+ep);throw e}
  }
  return all;
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
