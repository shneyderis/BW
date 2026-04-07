// js/tabs/mkt.js — Marketing v3: Email + Instagram + Meta Ads
// Data synced by Apps Script (sync.gs) into Sheets

async function loadMkt(){
  if(mktLoaded)return;
  try{
    // Все дані ТІЛЬКИ з Google Sheets (синхронізовані sync.gs)
    const[lists,camps,igPosts,metaAds]=await Promise.all([
      csvF("SP_Lists").catch(()=>[]),
      csvF("SP_Campaigns").catch(()=>[]),
      csvF("IG_Posts").catch(()=>[]),
      csvF("Meta_Ads").catch(()=>[])
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

    // Instagram Posts
    IG.posts=(igPosts||[]).map(p=>({
      id:gv(p,"id")||"",
      timestamp:gv(p,"timestamp")||"",
      date:(gv(p,"timestamp")||"").substring(0,10),
      caption:(gv(p,"caption")||"").substring(0,120),
      media_type:gv(p,"media_type")||"",
      permalink:gv(p,"permalink")||"",
      likes:pn(gv(p,"like_count")),
      comments:pn(gv(p,"comments_count")),
      reach:pn(gv(p,"reach")),
      saved:pn(gv(p,"saved")),
      engagement:pn(gv(p,"engagement"))
    })).sort((a,b)=>(b.timestamp||"").localeCompare(a.timestamp||""));

    // Meta Ads
    MA.campaigns=(metaAds||[]).map(a=>({
      id:gv(a,"campaign_id")||"",
      name:gv(a,"campaign_name")||"",
      status:gv(a,"status")||"",
      objective:gv(a,"objective")||"",
      date_start:gv(a,"date_start")||"",
      date_stop:gv(a,"date_stop")||"",
      spend:parseFloat(gv(a,"spend"))||0,
      impressions:pn(gv(a,"impressions")),
      reach:pn(gv(a,"reach")),
      clicks:pn(gv(a,"clicks")),
      ctr:parseFloat(gv(a,"ctr"))||0,
      cpc:parseFloat(gv(a,"cpc"))||0,
      cpm:parseFloat(gv(a,"cpm"))||0,
      link_clicks:pn(gv(a,"actions_link_click")),
      purchases:pn(gv(a,"actions_purchase")),
      purchase_value:parseFloat(gv(a,"action_values_purchase"))||0
    })).sort((a,b)=>b.spend-a.spend);

    console.log("MKT loaded: SP",SP.campaigns.length,"camps, IG",IG.posts.length,"posts, Ads",MA.campaigns.length,"campaigns");
  }catch(e){mktError=e.message;console.error("MKT load error:",e)}
  mktLoaded=true;
}

async function rMkt(){
  const el=document.getElementById("t-mkt");if(!el)return;
  if(!mktLoaded){el.innerHTML='<div class="info">⏳ Загрузка маркетингових даних...</div>';loadMkt().then(()=>rMkt());return}
  const c$=cs();
  const spLists=SP.lists||[];
  const spCamp=SP.campaigns||[];
  const igPosts=IG.posts||[];
  const adCamps=MA.campaigns||[];

  // === EMAIL STATS ===
  const campWithStats=spCamp.filter(c=>c.opened_email_qty>0);
  const avgOpenReal=campWithStats.length?campWithStats.reduce((s,c)=>s+(c.opened_email_qty/c.all_email_qty*100),0)/campWithStats.length:0;
  const avgClickReal=campWithStats.length?campWithStats.reduce((s,c)=>s+(c.clicked_email_qty/c.all_email_qty*100),0)/campWithStats.length:0;
  const recentCamp=spCamp.filter(c=>c.send_date&&c.send_date>="2024");
  const lastCampDate=spCamp.length?spCamp[0].send_date:"—";
  const campByYr={};spCamp.forEach(c=>{const y=(c.send_date||"").substring(0,4);if(y>="2020"){if(!campByYr[y])campByYr[y]={cnt:0,sent:0,opened:0};campByYr[y].cnt++;campByYr[y].sent+=c.all_email_qty;campByYr[y].opened+=c.opened_email_qty}});
  const yrSummary=Object.entries(campByYr).sort((a,b)=>b[0].localeCompare(a[0]));

  // === IG STATS ===
  const igTotal=igPosts.length;
  const igTotalLikes=igPosts.reduce((s,p)=>s+p.likes,0);
  const igTotalComments=igPosts.reduce((s,p)=>s+p.comments,0);
  const igTotalReach=igPosts.reduce((s,p)=>s+p.reach,0);
  const igAvgEng=igTotal?igPosts.reduce((s,p)=>s+p.engagement,0)/igTotal:0;
  const igAvgLikes=igTotal?igTotalLikes/igTotal:0;
  const igAvgReach=igTotal?igTotalReach/igTotal:0;
  const igEngRate=igTotalReach>0?((igTotalLikes+igTotalComments)/igTotalReach*100):0;

  // IG by type — avg likes, avg reach per type
  const igByType={};
  igPosts.forEach(p=>{
    const t=p.media_type||"OTHER";
    if(!igByType[t])igByType[t]={cnt:0,likes:0,comments:0,reach:0};
    igByType[t].cnt++;igByType[t].likes+=p.likes;igByType[t].comments+=p.comments;igByType[t].reach+=p.reach;
  });

  // Top posts by engagement
  const topPosts=igPosts.slice().sort((a,b)=>(b.likes+b.comments)-(a.likes+a.comments)).slice(0,5);
  // Top by reach
  const topReach=igPosts.slice().sort((a,b)=>b.reach-a.reach).slice(0,5);

  const igRecent=igPosts.slice(0,15);

  // === ADS STATS ===
  const adsTotalSpend=adCamps.reduce((s,a)=>s+a.spend,0);
  const adsTotalImpr=adCamps.reduce((s,a)=>s+a.impressions,0);
  const adsTotalClicks=adCamps.reduce((s,a)=>s+a.clicks,0);
  const adsTotalPurchases=adCamps.reduce((s,a)=>s+a.purchases,0);
  const adsTotalRevenue=adCamps.reduce((s,a)=>s+a.purchase_value,0);
  const adsROAS=adsTotalSpend>0?(adsTotalRevenue/adsTotalSpend):0;
  const adsCTR=adsTotalImpr>0?(adsTotalClicks/adsTotalImpr*100):0;
  const adsCPA=adsTotalPurchases>0?(adsTotalSpend/adsTotalPurchases):0;

  // === CORRELATION: IG posts → orders ===
  let igCorrelHTML="";
  const corrOrders=WO;
  if(igRecent.length&&corrOrders.length){
    const igCorrData=igRecent.filter(p=>p.date).map(p=>{
      const dObj=new Date(p.date);if(isNaN(dObj))return null;
      const after3d=new Date(dObj);after3d.setDate(after3d.getDate()+3);
      const before=new Date(dObj);before.setDate(before.getDate()-3);
      const ordAfter=corrOrders.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=dObj&&od<=after3d&&(o.status==="completed"||o.status==="processing")});
      const ordBefore=corrOrders.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=before&&od<dObj&&(o.status==="completed"||o.status==="processing")});
      const revAfter=ordAfter.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const revBefore=ordBefore.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const lift=revBefore>0?((revAfter-revBefore)/revBefore*100):0;
      return{caption:p.caption,date:p.date,type:p.media_type,likes:p.likes,reach:p.reach,ordBefore:ordBefore.length,ordAfter:ordAfter.length,revAfter,lift};
    }).filter(Boolean);
    if(igCorrData.length){
      igCorrelHTML=`<div class="cc"><h3>📸 Кореляція: пости → замовлення (±3 дні)</h3>
        <table class="tbl"><tr><th>Пост</th><th class="r">Дата</th><th class="r">Тип</th><th class="r">❤</th><th class="r">Reach</th><th class="r">Зам.до</th><th class="r">Зам.після</th><th class="r">Lift</th></tr>
        ${igCorrData.map(p=>{const lc=p.lift>10?"g":p.lift<-10?"rd":"";return`<tr>
          <td style="font-size:9px">${(p.caption||"—").substring(0,22)}</td>
          <td class="r" style="color:#7d8196;font-size:9px">${p.date}</td>
          <td class="r" style="font-size:9px">${p.type}</td>
          <td class="r">${p.likes}</td>
          <td class="r">${ff(p.reach)}</td>
          <td class="r">${p.ordBefore}</td>
          <td class="r">${p.ordAfter}</td>
          <td class="r ${lc}">${p.lift>0?"+":""}${p.lift.toFixed(0)}%</td>
        </tr>`}).join("")}</table></div>`;
    }
  }

  // === EMAIL CORRELATION ===
  let emailCorrelHTML="";
  if(recentCamp.length&&corrOrders.length){
    const corrData=recentCamp.filter(c=>c.send_date&&c.all_email_qty>100).slice(0,12).map(c=>{
      const d=c.send_date.substring(0,10);
      const dObj=new Date(d);if(isNaN(dObj))return null;
      const after3d=new Date(dObj);after3d.setDate(after3d.getDate()+3);
      const before=new Date(dObj);before.setDate(before.getDate()-3);
      const ordAfter=corrOrders.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=dObj&&od<=after3d&&(o.status==="completed"||o.status==="processing")});
      const ordBefore=corrOrders.filter(o=>{const od=new Date((o.date_created||"").substring(0,10));return od>=before&&od<dObj&&(o.status==="completed"||o.status==="processing")});
      const revAfter=ordAfter.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const revBefore=ordBefore.reduce((s,o)=>s+parseFloat(o.total||0),0);
      const lift=revBefore>0?((revAfter-revBefore)/revBefore*100):0;
      return{name:(c.name||"").substring(0,28),date:d,sent:c.all_email_qty,openPct:c.all_email_qty?(c.opened_email_qty/c.all_email_qty*100):0,ordBefore:ordBefore.length,ordAfter:ordAfter.length,revAfter,lift};
    }).filter(Boolean);
    if(corrData.length){
      emailCorrelHTML=`<div class="cc"><h3>📧 Кореляція: розсилки → замовлення (±3 дні)</h3>
        <table class="tbl"><tr><th>Кампанія</th><th class="r">Дата</th><th class="r">Sent</th><th class="r">Open%</th><th class="r">Зам.до</th><th class="r">Зам.після</th><th class="r">Виручка</th><th class="r">Lift</th></tr>
        ${corrData.map(c=>{const lc=c.lift>10?"g":c.lift<-10?"rd":"";return`<tr>
          <td style="font-size:9px">${c.name}</td>
          <td class="r" style="color:#7d8196;font-size:9px">${c.date}</td>
          <td class="r">${ff(c.sent)}</td>
          <td class="r" style="color:${c.openPct>15?"#10b981":"#7d8196"}">${c.openPct.toFixed(1)}%</td>
          <td class="r">${c.ordBefore}</td><td class="r">${c.ordAfter}</td>
          <td class="r g">${ff(c.revAfter)}₴</td>
          <td class="r ${lc}">${c.lift>0?"+":""}${c.lift.toFixed(0)}%</td>
        </tr>`}).join("")}</table></div>`;
    }
  }

  // ========== RENDER ==========
  el.innerHTML=`
    ${mktError?'<div class="warn">⚠ '+mktError+'</div>':""}

    <div class="sec">📧 Email-маркетинг (SendPulse)</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Підписників</div><div class="v" style="color:#3b82f6">${ff(SP.totalSubs||0)}</div><div class="s">${spLists.length} списків</div></div>
      <div class="kpi"><div class="l">Кампаній</div><div class="v">${spCamp.length}</div><div class="s">Ост: ${(lastCampDate||"").substring(0,10)}</div></div>
      <div class="kpi"><div class="l">Open rate</div><div class="v" style="color:${avgOpenReal>15?"#10b981":"#f59e0b"}">${avgOpenReal.toFixed(1)}%</div></div>
      <div class="kpi"><div class="l">Click rate</div><div class="v" style="color:${avgClickReal>3?"#10b981":"#7d8196"}">${avgClickReal.toFixed(1)}%</div></div>
    </div>
    <div class="cc"><h3>Розсилки помісячно</h3><canvas id="cMktM" height="100"></canvas></div>
    <div class="row">
      <div class="cc"><h3>Списки</h3><table class="tbl"><tr><th>Список</th><th class="r">Всього</th><th class="r">Активних</th></tr>
        ${spLists.sort((a,b)=>b.all_email_qty-a.all_email_qty).map(l=>`<tr><td>${(l.name||"").substring(0,25)}</td><td class="r">${ff(l.all_email_qty)}</td><td class="r" style="color:#10b981">${ff(l.active_email_qty)}</td></tr>`).join("")}</table></div>
      <div class="cc"><h3>По роках</h3><table class="tbl"><tr><th>Рік</th><th class="r">Камп.</th><th class="r">Надіслано</th><th class="r">Open%</th></tr>
        ${yrSummary.map(([y,d])=>{const op=d.sent>0?(d.opened/d.sent*100):0;return`<tr><td>${y}</td><td class="r">${d.cnt}</td><td class="r">${ff(d.sent)}</td><td class="r" style="color:${op>15?"#10b981":"#7d8196"}">${op.toFixed(1)}%</td></tr>`}).join("")}</table></div>
    </div>
    <div class="cc"><h3>Останні кампанії</h3><table class="tbl"><tr><th>Кампанія</th><th class="r">Дата</th><th class="r">Sent</th><th class="r">Open%</th><th class="r">Click%</th></tr>
      ${recentCamp.slice(0,10).map(c=>{const or=c.all_email_qty>0?(c.opened_email_qty/c.all_email_qty*100):0;const cr=c.all_email_qty>0?(c.clicked_email_qty/c.all_email_qty*100):0;return`<tr>
        <td style="font-size:9px">${(c.name||"—").substring(0,28)}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${(c.send_date||"").substring(0,10)}</td>
        <td class="r">${ff(c.all_email_qty)}</td>
        <td class="r" style="color:${or>20?"#10b981":or>10?"#f59e0b":"#7d8196"}">${or.toFixed(1)}%</td>
        <td class="r" style="color:${cr>3?"#10b981":"#7d8196"}">${cr.toFixed(1)}%</td>
      </tr>`}).join("")}</table></div>
    ${emailCorrelHTML}

    <div class="sec">📸 Instagram · SMM аналітика</div>
    ${igTotal?`
      <div class="kpis">
        <div class="kpi"><div class="l">Постів</div><div class="v">${igTotal}</div></div>
        <div class="kpi"><div class="l">Engagement Rate</div><div class="v" style="color:${igEngRate>3?"#10b981":igEngRate>1?"#f59e0b":"#ef4444"}">${igEngRate.toFixed(2)}%</div><div class="s">(likes+comments)/reach</div></div>
        <div class="kpi"><div class="l">Сер. лайків</div><div class="v" style="color:#e11d48">${igAvgLikes.toFixed(0)}</div><div class="s">за пост</div></div>
        <div class="kpi"><div class="l">Сер. охоплення</div><div class="v" style="color:#8b5cf6">${ff(igAvgReach)}</div><div class="s">за пост</div></div>
        <div class="kpi"><div class="l">Всього ❤</div><div class="v" style="color:#e11d48">${ff(igTotalLikes)}</div></div>
        <div class="kpi"><div class="l">Всього reach</div><div class="v" style="color:#8b5cf6">${ff(igTotalReach)}</div></div>
      </div>

      <div class="cc"><h3>Engagement та Reach по постах</h3><canvas id="cIgEng" height="120"></canvas></div>

      <div class="row">
        <div class="cc"><h3>📊 Типи контенту (ефективність)</h3>
          <table class="tbl"><tr><th>Тип</th><th class="r">Пости</th><th class="r">Сер.❤</th><th class="r">Сер.Reach</th><th class="r">Eng.Rate</th></tr>
          ${Object.entries(igByType).sort((a,b)=>b[1].reach-a[1].reach).map(([t,d])=>{
            const avgL=(d.likes/d.cnt).toFixed(0);
            const avgR=(d.reach/d.cnt).toFixed(0);
            const er=d.reach>0?((d.likes+d.comments)/d.reach*100).toFixed(2):"0";
            const clr=t==="VIDEO"?"#8b5cf6":t==="CAROUSEL_ALBUM"?"#3b82f6":"#10b981";
            return`<tr><td style="color:${clr};font-weight:600">${t}</td><td class="r">${d.cnt}</td><td class="r" style="color:#e11d48">${avgL}</td><td class="r" style="color:#8b5cf6">${ff(avgR)}</td><td class="r">${er}%</td></tr>`
          }).join("")}</table></div>
        <div class="cc"><h3>🏆 Топ-5 по лайках</h3>
          <table class="tbl"><tr><th>Пост</th><th class="r">❤</th><th class="r">💬</th><th class="r">Reach</th></tr>
          ${topPosts.map(p=>`<tr>
            <td style="font-size:9px">${(p.caption||"—").substring(0,30)}</td>
            <td class="r" style="color:#e11d48;font-weight:700">${p.likes}</td>
            <td class="r">${p.comments}</td>
            <td class="r" style="color:#8b5cf6">${ff(p.reach)}</td>
          </tr>`).join("")}</table></div>
      </div>

      <div class="row">
        <div class="cc"><h3>🔥 Топ-5 по охопленню</h3>
          <table class="tbl"><tr><th>Пост</th><th class="r">Reach</th><th class="r">❤</th><th class="r">ER%</th></tr>
          ${topReach.map(p=>{const er=p.reach>0?((p.likes+p.comments)/p.reach*100).toFixed(1):"0";return`<tr>
            <td style="font-size:9px">${(p.caption||"—").substring(0,30)}</td>
            <td class="r" style="color:#8b5cf6;font-weight:700">${ff(p.reach)}</td>
            <td class="r" style="color:#e11d48">${p.likes}</td>
            <td class="r">${er}%</td>
          </tr>`}).join("")}</table></div>
        <div class="cc"><h3>📅 Останні пости</h3>
          <table class="tbl"><tr><th>Пост</th><th class="r">Дата</th><th class="r">Тип</th><th class="r">❤</th><th class="r">Reach</th></tr>
          ${igRecent.slice(0,10).map(p=>`<tr>
            <td style="font-size:9px">${(p.caption||"—").substring(0,25)}</td>
            <td class="r" style="color:#7d8196;font-size:9px">${p.date}</td>
            <td class="r" style="font-size:8px">${p.media_type==="VIDEO"?"🎬":p.media_type==="CAROUSEL_ALBUM"?"📸":"🖼"}</td>
            <td class="r" style="color:#e11d48">${p.likes}</td>
            <td class="r" style="color:#8b5cf6">${ff(p.reach)}</td>
          </tr>`).join("")}</table></div>
      </div>

      ${igCorrelHTML||`<div class="info">Кореляція пости→замовлення: WC_Orders ${WO.length?WO.length+" записів, але дати не збігаються":"порожній"}. Для кореляції потрібні WC замовлення з датами.</div>`}
    `:'<div class="info">IG_Posts порожній. Запустіть syncIGPosts() в Apps Script.</div>'}

    <div class="sec">📢 Meta Ads</div>
    ${adCamps.length?`
      <div class="kpis">
        <div class="kpi"><div class="l">Кампаній</div><div class="v">${adCamps.length}</div><div class="s">active: ${adCamps.filter(a=>a.status==="ACTIVE").length}</div></div>
        ${adsTotalSpend>0?`
          <div class="kpi"><div class="l">Витрати</div><div class="v rd">${ff(adsTotalSpend)}$</div></div>
          <div class="kpi"><div class="l">Покази</div><div class="v">${ff(adsTotalImpr)}</div><div class="s">CTR ${adsCTR.toFixed(2)}%</div></div>
          <div class="kpi"><div class="l">ROAS</div><div class="v" style="color:${adsROAS>=3?"#10b981":adsROAS>=1?"#f59e0b":"#ef4444"}">${adsROAS.toFixed(2)}x</div></div>
        `:`<div class="kpi"><div class="l">Статус</div><div class="v" style="color:#f59e0b">Історія</div><div class="s">insights недоступні (>37 міс)</div></div>`}
      </div>
      <div class="cc"><h3>Кампанії (${adCamps.length})</h3><table class="tbl"><tr><th>Кампанія</th><th class="r">Статус</th><th class="r">Старт</th>${adsTotalSpend>0?'<th class="r">Витрати</th><th class="r">Покази</th><th class="r">Кліки</th>':""}</tr>
        ${adCamps.map(a=>{const st=a.status==="ACTIVE"?"#10b981":a.status==="PAUSED"?"#f59e0b":"#7d8196";return`<tr>
          <td style="font-size:9px">${(a.name||"—").substring(0,30)}</td>
          <td class="r" style="color:${st};font-size:9px">${a.status||""}</td>
          <td class="r" style="color:#7d8196;font-size:9px">${(a.date_start||"").substring(0,10)}</td>
          ${adsTotalSpend>0?`<td class="r rd">${ff(a.spend)}$</td><td class="r">${ff(a.impressions)}</td><td class="r" style="color:#3b82f6">${ff(a.clicks)}</td>`:""}
          <td class="r ${rc}">${roas.toFixed(2)}x</td>
        </tr>`}).join("")}</table></div>
      <div class="cc"><h3>Витрати vs Дохід по кампаніях</h3><canvas id="cAdsBar" height="120"></canvas></div>
    `:`<div class="info">${adCamps.length?`Meta Ads: знайдено ${adCamps.length} кампаній, але витрати = 0₴ за останні 90 днів. Можливо реклама не запущена або кампанії архівні.`:"Meta_Ads порожній. Запустіть syncMetaAds() в Apps Script."}</div>`}
  `;

  // === CHARTS ===
  // Email monthly
  const campByMo={};recentCamp.forEach(c=>{const m=(c.send_date||"").substring(0,7);if(!m)return;if(!campByMo[m])campByMo[m]={sent:0,opened:0};campByMo[m].sent+=c.all_email_qty;campByMo[m].opened+=c.opened_email_qty});
  const cMos=Object.keys(campByMo).sort();
  if(cMos.length>1){
    dc("cMktM");CH.cMktM=new Chart(document.getElementById("cMktM"),{type:"bar",data:{labels:cMos,datasets:[
      {label:"Opened",data:cMos.map(m=>campByMo[m].opened),backgroundColor:"#10b981",borderRadius:1},
      {label:"Not opened",data:cMos.map(m=>campByMo[m].sent-campByMo[m].opened),backgroundColor:"rgba(125,129,150,.3)",borderRadius:1}
    ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }

  // IG engagement chart
  if(igRecent.length>1&&document.getElementById("cIgEng")){
    const igChD=igRecent.slice(0,20).reverse();
    dc("cIgEng");CH.cIgEng=new Chart(document.getElementById("cIgEng"),{type:"bar",data:{labels:igChD.map(p=>p.date.substring(5)),datasets:[
      {label:"Likes",data:igChD.map(p=>p.likes),backgroundColor:"#e11d48",borderRadius:1},
      {label:"Comments",data:igChD.map(p=>p.comments),backgroundColor:"#8b5cf6",borderRadius:1},
      {label:"Saved",data:igChD.map(p=>p.saved),backgroundColor:"#f59e0b",borderRadius:1}
    ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}}}}});
  }

  // Ads spend vs revenue chart
  if(adCamps.length&&document.getElementById("cAdsBar")){
    const adChD=adCamps.filter(a=>a.spend>0).slice(0,10);
    dc("cAdsBar");CH.cAdsBar=new Chart(document.getElementById("cAdsBar"),{type:"bar",data:{labels:adChD.map(a=>(a.name||"?").substring(0,15)),datasets:[
      {label:"Витрати $",data:adChD.map(a=>a.spend),backgroundColor:"rgba(239,68,68,.5)",borderRadius:2},
      {label:"Дохід $",data:adChD.map(a=>a.purchase_value),backgroundColor:"#10b981",borderRadius:2}
    ]},options:{indexAxis:"y",responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>"$"+fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}
