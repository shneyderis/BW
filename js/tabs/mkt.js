// js/tabs/mkt.js — Marketing v3: Email + Instagram + Meta Ads
// Data synced by Apps Script (sync.gs) into Sheets

async function loadMkt(){
  if(mktLoaded)return;
  try{
    // Все дані ТІЛЬКИ з Google Sheets (синхронізовані sync.gs)
    const[lists,camps,igPosts,metaAds,add1]=await Promise.all([
      csvF("SP_Lists").catch(()=>[]),
      csvF("SP_Campaigns").catch(()=>[]),
      csvF("IG_Posts").catch(()=>[]),
      csvF("Meta_Ads").catch(()=>[]),
      csvF("ADD1").catch(()=>[])
    ]);

    // Meta Ads: prefer ADD1 (manual export from Ads Manager) over Meta_Ads (API)
    const adsSource=(add1||[]).length?add1:metaAds;

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
      engagement:pn(gv(p,"engagement")),
      media_url:gv(p,"media_url")||""
    })).sort((a,b)=>(b.timestamp||"").localeCompare(a.timestamp||""));

    // Meta Ads
    // Parse ads from ADD1 (Ads Manager export) or Meta_Ads (API)
    MA.campaigns=(adsSource||[]).map(a=>{
      // ADD1 columns: Назва оголошення, Показ реклами, Витрачена сума (EUR), Покази, Охоплення, Кліки посилання, CTR, CPC, CPM, Результати, Індикатор результату
      const name=gv(a,"назва оголошення")||gv(a,"campaign_name")||"";
      const status=gv(a,"показ реклами")||gv(a,"status")||"";
      const spend=parseFloat(gv(a,"витрачена сума")||gv(a,"spend")||0);
      const impressions=pn(gv(a,"покази")||gv(a,"impressions"));
      const reach=pn(gv(a,"охоплення")||gv(a,"reach"));
      const linkClicks=pn(gv(a,"кліки посилання")||gv(a,"clicks"));
      const allClicks=pn(gv(a,"кліки (усі)")||0);
      const ctr=parseFloat(gv(a,"ctr (рейтинг")||gv(a,"ctr")||0);
      const cpc=parseFloat(gv(a,"cpc (ціна за клік")||gv(a,"cpc")||0);
      const cpm=parseFloat(gv(a,"cpm (ціна за 1000")||gv(a,"cpm")||0);
      const results=pn(gv(a,"результати")||0);
      const resultType=gv(a,"індикатор результату")||"";
      const costPerResult=parseFloat(gv(a,"ціна за результати")||0);
      const dateStart=gv(a,"початок звітності")||gv(a,"date_start")||"";
      const dateEnd=gv(a,"завершення звітності")||gv(a,"date_stop")||"";
      const quality=gv(a,"оцінювання якості")||"";
      const engRate=gv(a,"оцінка коефіцієнта взаємодії")||"";
      const convRate=gv(a,"оцінка коефіцієнта конверсії")||"";
      const purchases=resultType.includes("purchase")?results:0;
      const landingViews=pn(gv(a,"перегляди цільової")||0);
      return{name,status,spend,impressions,reach,clicks:linkClicks||allClicks,ctr,cpc,cpm,
        results,resultType,costPerResult,purchases,purchase_value:0,
        date_start:dateStart,date_stop:dateEnd,quality,engRate,convRate,landingViews};
    }).filter(a=>a.name).sort((a,b)=>b.spend-a.spend);

    console.log("MKT loaded: SP",SP.campaigns.length,"camps, IG",IG.posts.length,"posts, Ads",MA.campaigns.length,"campaigns");
  }catch(e){mktError=e.message;console.error("MKT load error:",e)}
  mktLoaded=true;
}

async function rMkt(){
  const el=document.getElementById("t-mkt");if(!el)return;
  if(!mktLoaded){el.innerHTML='<div class="info">⏳ Завантаження маркетингових даних...</div>';loadMkt().then(()=>rMkt()).catch(e=>{el.innerHTML='<div class="warn">Помилка: '+e.message+'</div>';console.error("rMkt error:",e)});return}
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

  // ========== BUILD TIMELINE (configurable period) ==========
  if(!window._mktDays)window._mktDays=30;
  const tlStart=new Date();tlStart.setDate(tlStart.getDate()-window._mktDays);
  const tlStartStr=tlStart.toISOString().substring(0,10);
  const tlDays=[];for(let d=new Date(tlStart);d<=new Date();d.setDate(d.getDate()+1))tlDays.push(d.toISOString().substring(0,10));

  // Orders by day
  const ordByDay={};
  corrOrders.filter(o=>o.status==="completed"||o.status==="processing").forEach(o=>{
    const d=(o.date_created||"").replace(/ .*/,"").substring(0,10).replace("T","");
    if(d.length===10){if(!ordByDay[d])ordByDay[d]={cnt:0,rev:0};ordByDay[d].cnt++;ordByDay[d].rev+=parseFloat(o.total||0)}
  });

  // IG posts by day (reach as value)
  const igByDay={};
  igPosts.forEach(p=>{if(p.date&&p.date>=tlStartStr){igByDay[p.date]={reach:p.reach,likes:p.likes,label:(p.caption||"").substring(0,25)}}});

  // Emails by day (sent as value)
  const emailByDay={};
  recentCamp.forEach(c=>{const d=(c.send_date||"").substring(0,10);if(d&&d>=tlStartStr){if(!emailByDay[d])emailByDay[d]={sent:0,labels:[]};emailByDay[d].sent+=c.all_email_qty;emailByDay[d].labels.push((c.name||"").substring(0,20))}});

  // Scale IG reach and email sent to fit on orders axis
  const maxOrd=Math.max(...tlDays.map(d=>ordByDay[d]?.cnt||0),1);
  const maxIGReach=Math.max(...Object.values(igByDay).map(v=>v.reach),1);
  const maxEmailSent=Math.max(...Object.values(emailByDay).map(v=>v.sent),1);

  const hasTimeline=tlDays.some(d=>ordByDay[d]||igByDay[d]||emailByDay[d]);

  // ========== RENDER ==========
  el.innerHTML=`
    ${mktError?'<div class="warn">⚠ '+mktError+'</div>':""}

    ${hasTimeline?`<div class="sec">📊 Маркетинг Timeline
      <span style="float:right;font-size:10px;font-weight:400">
        ${[30,60,90,180].map(d=>`<button class="flt" style="margin-left:3px;${window._mktDays===d?"background:#9f1239;color:#fff;border-color:#9f1239":""}" onclick="window._mktDays=${d};render()">${d}д</button>`).join("")}
      </span>
    </div>
    <div class="cc"><h3>Замовлення · Розсилки · IG пости (по днях, ${window._mktDays}д)</h3><canvas id="cTimeline" height="160"></canvas></div>`:""}

    ${(()=>{
      // === AI INSIGHTS ===
      const insights=[];

      // 1. Find days with peak orders and what happened before
      const peakDays=tlDays.filter(d=>ordByDay[d]&&ordByDay[d].cnt>=5).map(d=>{
        const prev1=tlDays[tlDays.indexOf(d)-1]||"";
        const prev2=tlDays[tlDays.indexOf(d)-2]||"";
        const igBefore=[igByDay[d],igByDay[prev1],igByDay[prev2]].filter(Boolean);
        const emBefore=[emailByDay[d],emailByDay[prev1],emailByDay[prev2]].filter(Boolean);
        return{date:d,orders:ordByDay[d].cnt,rev:ordByDay[d].rev,ig:igBefore,em:emBefore};
      });
      peakDays.forEach(p=>{
        const causes=[];
        if(p.ig.length)causes.push("📸 IG пост: "+p.ig.map(i=>i.label).join(", ")+" (reach "+ff(p.ig[0].reach)+")");
        if(p.em.length)causes.push("📧 Розсилка: "+p.em.map(e=>e.labels[0]).join(", ")+" (sent "+ff(p.em[0].sent)+")");
        if(causes.length)insights.push({type:"peak",icon:"📈",text:`<b>${p.date}</b>: ${p.orders} замовлень, ${ff(p.rev)}₴`,detail:causes.join(" + "),color:"#10b981"});
        else insights.push({type:"peak",icon:"📈",text:`<b>${p.date}</b>: ${p.orders} замовлень, ${ff(p.rev)}₴`,detail:"Без видимої маркетингової активності — можливо сарафанне радіо або повторні клієнти",color:"#f59e0b"});
      });

      // 2. IG type effectiveness
      if(Object.keys(igByType).length>1){
        const best=Object.entries(igByType).sort((a,b)=>{const erA=a[1].reach>0?(a[1].likes+a[1].comments)/a[1].reach:0;const erB=b[1].reach>0?(b[1].likes+b[1].comments)/b[1].reach:0;return erB-erA})[0];
        const erBest=best[1].reach>0?((best[1].likes+best[1].comments)/best[1].reach*100):0;
        insights.push({type:"ig",icon:"📸",text:`<b>${best[0]}</b> — найефективніший тип контенту (ER ${erBest.toFixed(1)}%)`,detail:`Сер. reach: ${ff(best[1].reach/best[1].cnt)}, сер. лайків: ${(best[1].likes/best[1].cnt).toFixed(0)}. Рекомендація: робити більше ${best[0]}.`,color:"#e11d48"});
      }

      // 3. Email open rate trend
      const recentEmails=recentCamp.slice(0,5);
      const olderEmails=recentCamp.slice(5,10);
      if(recentEmails.length&&olderEmails.length){
        const recentOR=recentEmails.reduce((s,c)=>s+(c.all_email_qty>0?c.opened_email_qty/c.all_email_qty*100:0),0)/recentEmails.length;
        const olderOR=olderEmails.reduce((s,c)=>s+(c.all_email_qty>0?c.opened_email_qty/c.all_email_qty*100:0),0)/olderEmails.length;
        const diff=recentOR-olderOR;
        insights.push({type:"email",icon:"📧",text:`Open rate ${diff>0?"зростає":"падає"}: ${recentOR.toFixed(1)}% (останні 5) vs ${olderOR.toFixed(1)}% (попередні 5)`,detail:diff>2?"Аудиторія стає більш залученою — гарний знак.":diff<-2?"Можливо втома від розсилок. Спробуйте змінити теми або частоту.":"Стабільний рівень — добре.",color:diff>0?"#10b981":"#ef4444"});
      }

      // 4. Wasted marketing: post/email without sales boost
      const wastedIG=igPosts.filter(p=>p.date>=tlStartStr).filter(p=>{
        const d=p.date;const next1=tlDays[tlDays.indexOf(d)+1]||"";const next2=tlDays[tlDays.indexOf(d)+2]||"";
        const ordAfter=(ordByDay[next1]?.cnt||0)+(ordByDay[next2]?.cnt||0);
        const ordBefore=(ordByDay[tlDays[tlDays.indexOf(d)-1]]?.cnt||0)+(ordByDay[tlDays[tlDays.indexOf(d)-2]]?.cnt||0);
        return p.reach>3000&&ordAfter<ordBefore;
      });
      if(wastedIG.length)insights.push({type:"waste",icon:"⚠",text:`${wastedIG.length} пост(ів) з reach >3K без росту продажів`,detail:wastedIG.slice(0,3).map(p=>`"${(p.caption||"").substring(0,25)}" reach:${ff(p.reach)}`).join(", "),color:"#f59e0b"});

      // 5. Best combo
      const comboDays=tlDays.filter(d=>igByDay[d]&&emailByDay[d]);
      if(comboDays.length){
        const comboAvgOrd=comboDays.reduce((s,d)=>{const n1=tlDays[tlDays.indexOf(d)+1]||"";return s+(ordByDay[n1]?.cnt||0)},0)/comboDays.length;
        const normalAvgOrd=tlDays.filter(d=>!igByDay[d]&&!emailByDay[d]&&ordByDay[d]).reduce((s,d)=>s+ordByDay[d].cnt,0)/(tlDays.filter(d=>!igByDay[d]&&!emailByDay[d]&&ordByDay[d]).length||1);
        if(comboAvgOrd>normalAvgOrd)insights.push({type:"combo",icon:"🔥",text:`Комбо IG+Email в один день → ${comboAvgOrd.toFixed(1)} замовлень наступного дня (vs ${normalAvgOrd.toFixed(1)} без активності)`,detail:"Рекомендація: планувати розсилку і IG пост на один день.",color:"#10b981"});
      }

      return insights.length?`<div class="cc" style="border-color:rgba(139,92,246,.3)"><h3 style="color:#8b5cf6">🧠 AI-аналіз маркетингу</h3>
        ${insights.map(i=>`<div style="margin-bottom:8px;padding:6px 8px;background:#0c0e13;border-radius:5px;border-left:3px solid ${i.color}">
          <div style="font-size:10px"><span style="margin-right:4px">${i.icon}</span>${i.text}</div>
          <div style="font-size:9px;color:#7d8196;margin-top:2px">${i.detail}</div>
        </div>`).join("")}
      </div>`:"";
    })()}

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
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${igRecent.slice(0,12).map(p=>{
            const er=p.reach>0?((p.likes+p.comments)/p.reach*100).toFixed(1):"0";
            const typeIcon=p.media_type==="VIDEO"?"🎬":p.media_type==="CAROUSEL_ALBUM"?"📸":"🖼";
            const hasImg=p.media_url&&p.media_url.startsWith("http");
            return`<div style="background:#0c0e13;border-radius:6px;border:1px solid #232738;overflow:hidden">
              ${hasImg?`<a href="${p.permalink}" target="_blank" style="display:block"><img src="${p.media_url}" style="width:100%;height:130px;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'"></a>`
              :`<div style="height:50px;display:flex;align-items:center;justify-content:center;font-size:24px;background:#151821">${typeIcon}</div>`}
              <div style="padding:8px">
                <div style="font-size:9px;color:#7d8196;margin-bottom:4px">${p.date} · ${typeIcon} ${p.media_type}</div>
                <div style="font-size:10px;line-height:1.3;margin-bottom:6px;max-height:36px;overflow:hidden">${(p.caption||"—").substring(0,80)}</div>
                <div style="display:flex;justify-content:space-between;font-size:9px">
                  <span style="color:#e11d48">❤ ${p.likes}</span>
                  <span>💬 ${p.comments}</span>
                  <span style="color:#8b5cf6">👁 ${ff(p.reach)}</span>
                  <span style="color:#10b981">ER ${er}%</span>
                </div>
              </div>
            </div>`}).join("")}
          </div></div>
      </div>

      ${igCorrelHTML||`<div class="info">Кореляція пости→замовлення: WC_Orders ${WO.length?WO.length+" записів, але дати не збігаються":"порожній"}. Для кореляції потрібні WC замовлення з датами.</div>`}
    `:'<div class="info">IG_Posts порожній. Запустіть syncIGPosts() в Apps Script.</div>'}

    ${adCamps.length?`<div class="sec">📢 Meta / Facebook Ads</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Витрати €</div><div class="v rd">${ff(adsTotalSpend)}€</div><div class="s">${adCamps.filter(a=>a.spend>0).length} оголошень</div></div>
        <div class="kpi"><div class="l">Покази</div><div class="v">${ff(adsTotalImpr)}</div><div class="s">CPM ${adsTotalImpr>0?(adsTotalSpend/adsTotalImpr*1000).toFixed(2):0}€</div></div>
        <div class="kpi"><div class="l">Охоплення</div><div class="v" style="color:#8b5cf6">${ff(adCamps.reduce((s,a)=>s+a.reach,0))}</div></div>
        <div class="kpi"><div class="l">Кліки</div><div class="v" style="color:#3b82f6">${ff(adsTotalClicks)}</div><div class="s">CPC ${adsTotalClicks>0?(adsTotalSpend/adsTotalClicks).toFixed(2):0}€</div></div>
        <div class="kpi"><div class="l">Покупки</div><div class="v g">${adCamps.reduce((s,a)=>s+a.purchases,0)}</div><div class="s">CPA ${(()=>{const p=adCamps.reduce((s,a)=>s+a.purchases,0);return p>0?(adsTotalSpend/p).toFixed(2):"—"})()}€</div></div>
        <div class="kpi"><div class="l">Ціна/результат</div><div class="v">${(()=>{const r=adCamps.reduce((s,a)=>s+a.results,0);return r>0?(adsTotalSpend/r).toFixed(2):"—"})()}€</div><div class="s">${ff(adCamps.reduce((s,a)=>s+a.results,0))} результатів</div></div>
      </div>
      <div class="cc"><h3>Оголошення (${adCamps.filter(a=>a.spend>0).length} з витратами)</h3>
        <table class="tbl"><tr><th>Оголошення</th><th class="r">Статус</th><th class="r">Витрати €</th><th class="r">Покази</th><th class="r">Кліки</th><th class="r">Результати</th><th class="r">Ціна/рез.</th><th class="r">Якість</th></tr>
        ${adCamps.filter(a=>a.spend>0).map(a=>{
          const stClr=a.status==="active"?"#10b981":a.status.includes("not_")?"#7d8196":"#f59e0b";
          const qClr=a.quality.includes("Вище")?"#10b981":a.quality.includes("Нижче")?"#ef4444":a.quality.includes("Середній")?"#f59e0b":"#7d8196";
          return`<tr>
          <td style="font-size:9px">${(a.name||"—").substring(0,28)}</td>
          <td class="r" style="color:${stClr};font-size:8px">${a.status==="active"?"●":a.status==="inactive"?"○":"◌"}</td>
          <td class="r rd">${a.spend.toFixed(2)}€</td>
          <td class="r">${ff(a.impressions)}</td>
          <td class="r" style="color:#3b82f6">${ff(a.clicks)}</td>
          <td class="r g">${a.results||"—"}</td>
          <td class="r">${a.costPerResult?a.costPerResult.toFixed(2)+"€":"—"}</td>
          <td class="r" style="color:${qClr};font-size:8px">${a.quality||"—"}</td>
        </tr>`}).join("")}</table></div>
      <div class="cc"><h3>Витрати по оголошеннях</h3><canvas id="cAdsBar" height="${Math.max(80,adCamps.filter(a=>a.spend>0).length*18)}"></canvas></div>
    `:""}
  `;

  // === CHARTS ===
  // Timeline (daily, 30 days)
  if(hasTimeline&&document.getElementById("cTimeline")){
    // IG reach as scatter points (sized by reach)
    const igPoints=tlDays.map((d,i)=>{const ig=igByDay[d];return ig?{x:i,y:ig.reach/500,label:ig.label,reach:ig.reach,likes:ig.likes}:null}).filter(Boolean);
    // Email sent as scatter points
    const emailPoints=tlDays.map((d,i)=>{const em=emailByDay[d];return em?{x:i,y:em.sent/200,label:em.labels.join(", "),sent:em.sent}:null}).filter(Boolean);

    dc("cTimeline");CH.cTimeline=new Chart(document.getElementById("cTimeline"),{type:"bar",
      data:{labels:tlDays.map(d=>d.substring(5)),datasets:[
        {label:"Замовлення",data:tlDays.map(d=>ordByDay[d]?.cnt||0),backgroundColor:"rgba(16,185,129,.6)",borderRadius:2,yAxisID:"y",order:2},
        {label:"Виручка ₴",data:tlDays.map(d=>ordByDay[d]?.rev||0),type:"line",borderColor:"#f59e0b",borderWidth:2,pointRadius:0,tension:.3,yAxisID:"y1",order:1},
        {label:"📸 IG (reach/500)",data:tlDays.map(d=>{const ig=igByDay[d];return ig?ig.reach/500:null}),type:"scatter",
          pointRadius:tlDays.map(d=>{const ig=igByDay[d];return ig?Math.max(4,Math.min(ig.reach/1000,15)):0}),
          pointBackgroundColor:"rgba(225,29,72,.7)",pointBorderColor:"#e11d48",yAxisID:"y",order:0},
        {label:"📧 Email (sent/200)",data:tlDays.map(d=>{const em=emailByDay[d];return em?em.sent/200:null}),type:"scatter",
          pointRadius:tlDays.map(d=>{const em=emailByDay[d];return em?Math.max(5,Math.min(em.sent/300,15)):0}),
          pointBackgroundColor:"rgba(59,130,246,.7)",pointBorderColor:"#3b82f6",pointStyle:"rectRot",yAxisID:"y",order:0}
      ]},
      options:{responsive:true,
        plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},
          tooltip:{callbacks:{
            title:ctx=>{const i=ctx[0]?.dataIndex;return tlDays[i]||""},
            label:ctx=>{
              const ds=ctx.dataset.label;const d=tlDays[ctx.dataIndex];
              if(ds.includes("IG")){const ig=igByDay[d];return ig?`📸 ${ig.label} — reach:${ff(ig.reach)} ❤${ig.likes}`:ds}
              if(ds.includes("Email")){const em=emailByDay[d];return em?`📧 ${em.labels[0]} — sent:${ff(em.sent)}`:ds}
              if(ds.includes("Виручка"))return`Виручка: ${ff(ctx.raw)}₴`;
              return`Замовлень: ${ctx.raw}`;
            }
          }}
        },
        scales:{
          x:{ticks:{color:"#7d8196",font:{size:7},maxTicksLimit:15},grid:{color:"#1e2130"}},
          y:{position:"left",title:{display:true,text:"Замовлення",color:"#7d8196",font:{size:8}},ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},
          y1:{position:"right",title:{display:true,text:"Виручка ₴",color:"#f59e0b",font:{size:8}},ticks:{color:"#f59e0b",font:{size:9},callback:v=>fm(v)+"₴"},grid:{display:false}}
        }
      }
    });
  }

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
  if(adsTotalSpend>0&&document.getElementById("cAdsBar")){
    const adChD=adCamps.filter(a=>a.spend>0).sort((a,b)=>b.spend-a.spend).slice(0,15);
    dc("cAdsBar");CH.cAdsBar=new Chart(document.getElementById("cAdsBar"),{type:"bar",data:{labels:adChD.map(a=>(a.name||"?").substring(0,20)),datasets:[
      {label:"Витрати €",data:adChD.map(a=>a.spend),backgroundColor:"rgba(239,68,68,.5)",borderRadius:2},
      {label:"Результати",data:adChD.map(a=>a.results),backgroundColor:"#10b981",borderRadius:2}
    ]},options:{indexAxis:"y",responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"€"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}
