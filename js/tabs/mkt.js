// js/tabs/mkt.js — Marketing v2: reads from Google Sheets (SP_Lists, SP_Campaigns)
// No more direct SendPulse/Meta API calls from browser
// Data synced by Apps Script (sync.gs) into Sheets

async function loadMkt(){
  if(mktLoaded)return;
  try{
    // Read from Google Sheets instead of API
    const[lists,camps]=await Promise.all([
      csvF("SP_Lists").catch(()=>[]),
      csvF("SP_Campaigns").catch(()=>[])
    ]);
    
    SP.lists=(lists||[]).map(l=>({
      name:gv(l,"name")||"",
      all_email_qty:pn(gv(l,"all_count")),
      active_email_qty:pn(gv(l,"active_count")),
      created:gv(l,"created_at")||""
    }));
    
    SP.campaigns=(camps||[]).map(c=>({
      name:gv(c,"name")||"",
      status:gv(c,"status")||"",
      send_date:gv(c,"send_date")||"",
      all_email_qty:pn(gv(c,"all_count")||gv(c,"sent_count")),
      opened_email_qty:pn(gv(c,"opened")),
      clicked_email_qty:pn(gv(c,"clicked")),
      open_rate:parseFloat(gv(c,"open_rate"))||0,
      click_rate:parseFloat(gv(c,"click_rate"))||0
    })).sort((a,b)=>(b.send_date||"").localeCompare(a.send_date||""));

    SP.totalSubs=SP.lists.reduce((s,l)=>s+l.all_email_qty,0);

  }catch(e){mktError=e.message;console.error("MKT load error:",e)}
  mktLoaded=true;
}

function rMkt(){
  const el=document.getElementById("t-mkt");if(!el)return;
  if(!mktLoaded){el.innerHTML='<div class="info">⏳ Загрузка маркетингових даних...</div>';loadMkt().then(()=>rMkt());return}
  const c$=cs();
  const spLists=SP.lists||[];
  const spCamp=SP.campaigns||[];
  
  // Stats
  const campWithSent=spCamp.filter(c=>c.all_email_qty>0);
  const avgOpen=campWithSent.length?campWithSent.reduce((s,c)=>s+(c.all_email_qty>0?(c.opened_email_qty/c.all_email_qty*100):0),0)/campWithSent.length:0;
  const avgClick=campWithSent.length?campWithSent.reduce((s,c)=>s+(c.all_email_qty>0?(c.clicked_email_qty/c.all_email_qty*100):0),0)/campWithSent.length:0;

  // Recent campaigns (last 2 years)
  const recentCamp=spCamp.filter(c=>{
    if(!c.send_date)return false;
    return c.send_date>="2024";
  });
  const lastCampDate=spCamp.length?spCamp[0].send_date:"—";

  // Campaigns with actual stats (non-zero opens)
  const campWithStats=spCamp.filter(c=>c.opened_email_qty>0);
  const avgOpenReal=campWithStats.length?campWithStats.reduce((s,c)=>s+(c.opened_email_qty/c.all_email_qty*100),0)/campWithStats.length:0;
  const avgClickReal=campWithStats.length?campWithStats.reduce((s,c)=>s+(c.clicked_email_qty/c.all_email_qty*100),0)/campWithStats.length:0;

  // Correlation with WC orders
  let correlHTML="";
  if(recentCamp.length&&WO.length){
    const corrData=recentCamp.filter(c=>c.send_date&&c.all_email_qty>100).slice(0,12).map(c=>{
      const d=c.send_date.substring(0,10);
      const dObj=new Date(d);if(isNaN(dObj))return null;
      const after3d=new Date(dObj);after3d.setDate(after3d.getDate()+3);
      const before=new Date(dObj);before.setDate(before.getDate()-3);
      const ordAfter=WO.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=dObj&&od<=after3d&&(o.status==="completed"||o.status==="processing")});
      const ordBefore=WO.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=before&&od<dObj&&(o.status==="completed"||o.status==="processing")});
      const revAfter=ordAfter.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const revBefore=ordBefore.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const lift=revBefore>0?((revAfter-revBefore)/revBefore*100):0;
      return{name:(c.name||"").substring(0,28),date:d,sent:c.all_email_qty,opened:c.opened_email_qty,openPct:c.all_email_qty?(c.opened_email_qty/c.all_email_qty*100):0,ordBefore:ordBefore.length,ordAfter:ordAfter.length,revAfter,lift};
    }).filter(Boolean);

    if(corrData.length){
      correlHTML=`<div class="cc"><h3>Кореляція: розсилки → замовлення (±3 дні)</h3>
        <table class="tbl"><tr><th>Кампанія</th><th class="r">Дата</th><th class="r">Sent</th><th class="r">Open%</th><th class="r">Зам.до</th><th class="r">Зам.після</th><th class="r">Виручка</th><th class="r">Lift</th></tr>
        ${corrData.map(c=>{const liftCl=c.lift>10?"g":c.lift<-10?"rd":"";return`<tr>
          <td style="font-size:9px">${c.name}</td>
          <td class="r" style="color:#7d8196;font-size:9px">${c.date}</td>
          <td class="r">${ff(c.sent)}</td>
          <td class="r" style="color:${c.openPct>15?"#10b981":"#7d8196"}">${c.openPct.toFixed(1)}%</td>
          <td class="r">${c.ordBefore}</td>
          <td class="r">${c.ordAfter}</td>
          <td class="r g">${ff(c.revAfter)}₴</td>
          <td class="r ${liftCl}">${c.lift>0?"+":""}${c.lift.toFixed(0)}%</td>
        </tr>`}).join("")}</table></div>`;
    }
  }

  // Campaigns by year summary
  const campByYr={};spCamp.forEach(c=>{const y=(c.send_date||"").substring(0,4);if(y>="2020"){if(!campByYr[y])campByYr[y]={cnt:0,sent:0,opened:0};campByYr[y].cnt++;campByYr[y].sent+=c.all_email_qty;campByYr[y].opened+=c.opened_email_qty}});
  const yrSummary=Object.entries(campByYr).sort((a,b)=>b[0].localeCompare(a[0]));

  el.innerHTML=`
    ${mktError?'<div class="warn">⚠ '+mktError+'</div>':""}
    <div class="info">Дані з Google Sheets (SP_Lists, SP_Campaigns). Оновлення: sync.gs щоденно.</div>
    <div class="kpis">
      <div class="kpi"><div class="l">📧 Підписників</div><div class="v" style="color:#3b82f6">${ff(SP.totalSubs||0)}</div><div class="s">${spLists.length} списків</div></div>
      <div class="kpi"><div class="l">📨 Кампаній</div><div class="v">${spCamp.length}</div><div class="s">Ост: ${(lastCampDate||"").substring(0,10)}</div></div>
      <div class="kpi"><div class="l">📖 Open rate (сер.)</div><div class="v" style="color:${avgOpenReal>15?"#10b981":"#f59e0b"}">${avgOpenReal.toFixed(1)}%</div><div class="s">${campWithStats.length} камп. зі стат.</div></div>
      <div class="kpi"><div class="l">🖱 Click rate (сер.)</div><div class="v" style="color:${avgClickReal>3?"#10b981":"#7d8196"}">${avgClickReal.toFixed(1)}%</div></div>
    </div>

    <div class="row">
      <div class="cc"><h3>📧 Списки розсилок</h3>
        <table class="tbl"><tr><th>Список</th><th class="r">Всього</th><th class="r">Активних</th></tr>
        ${spLists.sort((a,b)=>b.all_email_qty-a.all_email_qty).map(l=>`<tr><td>${(l.name||"").substring(0,25)}</td><td class="r">${ff(l.all_email_qty)}</td><td class="r" style="color:#10b981">${ff(l.active_email_qty)}</td></tr>`).join("")}</table>
      </div>
      <div class="cc"><h3>📊 Кампанії по роках</h3>
        <table class="tbl"><tr><th>Рік</th><th class="r">Кампаній</th><th class="r">Відправлено</th><th class="r">Відкрито</th><th class="r">Open%</th></tr>
        ${yrSummary.map(([y,d])=>{const op=d.sent>0?(d.opened/d.sent*100):0;return`<tr><td>${y}</td><td class="r">${d.cnt}</td><td class="r">${ff(d.sent)}</td><td class="r">${ff(d.opened)}</td><td class="r" style="color:${op>15?"#10b981":"#7d8196"}">${op.toFixed(1)}%</td></tr>`}).join("")}</table>
      </div>
    </div>

    <div class="cc"><h3>📨 Останні кампанії</h3>
      <table class="tbl"><tr><th>Кампанія</th><th class="r">Дата</th><th class="r">Sent</th><th class="r">Open</th><th class="r">Open%</th><th class="r">Click</th><th class="r">Click%</th></tr>
      ${recentCamp.slice(0,15).map(c=>{const or=c.all_email_qty>0?(c.opened_email_qty/c.all_email_qty*100):0;const cr=c.all_email_qty>0?(c.clicked_email_qty/c.all_email_qty*100):0;return`<tr>
        <td style="font-size:9px">${(c.name||"—").substring(0,25)}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${(c.send_date||"").substring(0,10)}</td>
        <td class="r">${ff(c.all_email_qty)}</td>
        <td class="r">${ff(c.opened_email_qty)}</td>
        <td class="r" style="color:${or>20?"#10b981":or>10?"#f59e0b":"#7d8196"}">${or.toFixed(1)}%</td>
        <td class="r">${ff(c.clicked_email_qty)}</td>
        <td class="r" style="color:${cr>3?"#10b981":"#7d8196"}">${cr.toFixed(1)}%</td>
      </tr>`}).join("")}</table>
    </div>

    ${correlHTML}`;
}
