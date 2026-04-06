// js/tabs/mkt.js — Marketing tab (SendPulse + Meta/IG)
const SP_ID="sp_id_d16b50be9be18644e8f2315c4e3f7218",SP_SEC="sp_sk_87d61a53e266999e1c97f299633948c1";
const META_TOKEN="EAAQr51VWS9QBRFUjeLDuOkgE45cTIRAgL2vYu2tOeZAsFx04U0uxjq7J5z98VgzZCZC9mhxllHfit5GHmjEoX7nC6CirqZChGsOB0GD4ZAnOt2jEzvs4aDczBtZC0BMQe99rN48AmjYxdfhHVKmV6S4w3If6P1qWA8Pl0HNayYtdtw3gPs8EpnZC6EDnZBa8LPFcV1jr2TW0VcJC2CBwQLCEfHtdofb6eaoRIy8ZD";
let spToken="";

async function spAuth(){try{const r=await fetch("/api/sp/oauth/access_token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grant_type:"client_credentials",client_id:SP_ID,client_secret:SP_SEC})});const d=await r.json();if(d.access_token)spToken=d.access_token}catch(e){console.error("SP auth:",e)}}
async function spGet(ep){if(!spToken)await spAuth();if(!spToken)return null;try{const r=await fetch("/api/sp/"+ep,{headers:{"Authorization":"Bearer "+spToken}});return await r.json()}catch(e){return null}}
async function metaGet(ep){try{const r=await fetch("/api/meta/"+ep+(ep.includes("?")?"&":"?")+"access_token="+META_TOKEN);return await r.json()}catch(e){return null}}

async function loadMkt(){
  if(mktLoaded)return;
  try{
    const[lists,campaigns]=await Promise.all([spGet("addressbooks").catch(()=>null),spGet("campaigns?limit=100&offset=0").catch(()=>null)]);
    SP.lists=lists||[];SP.campaigns=Array.isArray(campaigns)?campaigns.sort((a,b)=>((b.send_date||b.created||"").localeCompare(a.send_date||a.created||""))):[];
    SP.totalSubs=Array.isArray(SP.lists)?SP.lists.reduce((s,l)=>s+(l.all_email_qty||l.active_email_qty||0),0):0;
    const recentCamps=SP.campaigns.slice(0,10);
    for(const c of recentCamps){if(c.id){try{const st=await spGet("campaigns/"+c.id);if(st){c.opened_email_qty=st.opened||st.opened_email_qty||c.opened_email_qty;c.clicked_email_qty=st.clicked||st.clicked_email_qty||c.clicked_email_qty;c.all_email_qty=st.sent||st.all_email_qty||c.all_email_qty}}catch(e){}}}
    const pages=await metaGet("me/accounts?fields=id,name,fan_count,access_token").catch(()=>null);META.pages=pages?.data||[];
    if(META.pages.length){const page=META.pages[0];META.pageToken=page.access_token;const igRes=await metaGet(page.id+"?fields=instagram_business_account").catch(()=>null);if(igRes?.instagram_business_account?.id){const igId=igRes.instagram_business_account.id;META.ig=await metaGet(igId+"?fields=id,name,username,followers_count,media_count,biography").catch(()=>({});const media=await metaGet(igId+"/media?fields=id,caption,timestamp,like_count,comments_count,media_type&limit=20").catch(()=>null);META.media=media?.data||[]}}
  }catch(e){mktError=e.message;console.error("MKT error:",e)}
  mktLoaded=true;
}

function rMkt(){
  const el=document.getElementById("t-mkt");if(!el)return;
  if(!mktLoaded){el.innerHTML='<div class="info">⏳ Загрузка маркетинговых данных...</div>';loadMkt().then(()=>rMkt());return}
  const c$=cs();const spLists=Array.isArray(SP.lists)?SP.lists:[];const spCamp=Array.isArray(SP.campaigns)?SP.campaigns:[];
  const lastCamp=spCamp.length?spCamp[0]:null;const lastCampDate=lastCamp?(lastCamp.send_date||lastCamp.created||""):"—";
  let avgOpen=0,avgClick=0;const campWithStats=spCamp.filter(c=>c.all_email_qty>0);
  if(campWithStats.length){avgOpen=campWithStats.reduce((s,c)=>s+(c.opened_email_qty||0)/c.all_email_qty*100,0)/campWithStats.length;avgClick=campWithStats.reduce((s,c)=>s+(c.clicked_email_qty||0)/c.all_email_qty*100,0)/campWithStats.length}
  const fbPage=META.pages&&META.pages.length?META.pages[0]:null;const igMedia=Array.isArray(META.media)?META.media:[];
  const igTotalLikes=igMedia.reduce((s,m)=>s+(m.like_count||0),0);const igTotalComments=igMedia.reduce((s,m)=>s+(m.comments_count||0),0);const igAvgEng=igMedia.length?(igTotalLikes+igTotalComments)/igMedia.length:0;
  let correlHTML="";
  if(spCamp.length&&WO.length){const corrData=spCamp.filter(c=>c.send_date).slice(0,8).map(c=>{const d=c.send_date.substring(0,10);const dObj=new Date(d);const after3d=new Date(dObj);after3d.setDate(after3d.getDate()+3);const before=new Date(dObj);before.setDate(before.getDate()-3);const ordAfter=WO.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=dObj&&od<=after3d&&(o.status==="completed"||o.status==="processing")});const ordBefore=WO.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=before&&od<dObj&&(o.status==="completed"||o.status==="processing")});const revAfter=ordAfter.reduce((s,o)=>s+parseFloat(o.total||0),0);const revBefore=ordBefore.reduce((s,o)=>s+parseFloat(o.total||0),0);const lift=revBefore>0?((revAfter-revBefore)/revBefore*100):0;return{name:(c.name||c.subject||"").substring(0,25),date:d,ordAfter:ordAfter.length,ordBefore:ordBefore.length,sent:c.all_email_qty||0,opened:c.opened_email_qty||0,lift}});
  correlHTML=`<div class="cc"><h3>Корреляция: рассылки → заказы (±3 дня)</h3><table class="tbl"><tr><th>Кампания</th><th class="r">Дата</th><th class="r">Sent</th><th class="r">Зак.до</th><th class="r">Зак.после</th><th class="r">Lift</th></tr>${corrData.map(c=>{const liftCl=c.lift>0?"g":c.lift<0?"rd":"";return`<tr><td style="font-size:9px">${c.name}</td><td class="r" style="color:#7d8196">${c.date}</td><td class="r">${c.sent}</td><td class="r">${c.ordBefore}</td><td class="r">${c.ordAfter}</td><td class="r ${liftCl}">${c.lift>0?"+":""}${c.lift.toFixed(0)}%</td></tr>`}).join("")}</table></div>`}
  el.innerHTML=`${mktError?'<div class="warn">⚠ '+mktError+'</div>':""}
    <div class="kpis">
      <div class="kpi"><div class="l">📧 Подписчиков</div><div class="v" style="color:#3b82f6">${ff(SP.totalSubs||0)}</div><div class="s">${spLists.length} списков</div></div>
      <div class="kpi"><div class="l">📨 Кампаний</div><div class="v">${spCamp.length}</div><div class="s">Посл: ${lastCampDate.substring(0,10)}</div></div>
      <div class="kpi"><div class="l">📖 Open rate</div><div class="v" style="color:#10b981">${avgOpen.toFixed(1)}%</div></div>
      <div class="kpi"><div class="l">🖱 Click rate</div><div class="v" style="color:#f59e0b">${avgClick.toFixed(1)}%</div></div>
      ${fbPage?'<div class="kpi"><div class="l">👥 FB</div><div class="v" style="color:#3b82f6">'+ff(fbPage.fan_count||0)+'</div></div>':""}
      ${META.ig?.followers_count?'<div class="kpi"><div class="l">📸 IG</div><div class="v" style="color:#e11d48">'+ff(META.ig.followers_count)+'</div></div>':""}
    </div>
    <div class="row">
      <div class="cc"><h3>📧 Списки</h3>${spLists.length?'<table class="tbl"><tr><th>Список</th><th class="r">Подп.</th></tr>'+spLists.sort((a,b)=>(b.all_email_qty||0)-(a.all_email_qty||0)).slice(0,10).map(l=>'<tr><td>'+((l.name||"").substring(0,25))+'</td><td class="r">'+ff(l.all_email_qty||0)+'</td></tr>').join("")+'</table>':'<p style="font-size:10px;color:#7d8196">Нет данных</p>'}</div>
      <div class="cc"><h3>📨 Кампании</h3>${spCamp.length?'<table class="tbl"><tr><th>Кампания</th><th class="r">Дата</th><th class="r">Open%</th></tr>'+spCamp.slice(0,8).map(c=>{const or=c.all_email_qty?(c.opened_email_qty||0)/c.all_email_qty*100:0;return'<tr><td style="font-size:9px">'+(c.name||"—").substring(0,22)+'</td><td class="r" style="color:#7d8196">'+(c.send_date||"").substring(0,10)+'</td><td class="r '+(or>20?"g":"")+'">'+or.toFixed(1)+'%</td></tr>'}).join("")+'</table>':'<p style="font-size:10px;color:#7d8196">Нет данных</p>'}</div>
    </div>${correlHTML}`;
}
