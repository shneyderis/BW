// js/tabs/sales.js — Sales tab
function rSales(f){
  const el=document.getElementById("t-sales"),c$=cs();
  const ft=fl(T,f,"Доход");
  const pd=CHS.map(c=>{const v=ft.filter(t=>t.cat===c).reduce((s,t)=>s+toCur(t.nt),0);return{n:CSH[c]||c,c,v}}).filter(x=>x.v>1000);
  const bm={};ft.forEach(t=>{const m=t.mgr;if(!m||m==="-"||m==="="||!m.trim())return;if(!bm[m])bm[m]={s:0,c:0,cnt:0};bm[m].s+=toCur(t.nt);bm[m].c+=toCur(t.com);bm[m].cnt++});
  const mgrs=Object.entries(bm).map(([n,d])=>({n,...d})).sort((a,b)=>b.s-a.s);
  const bc={};ft.forEach(t=>{const a=t.alias||t.name;if(!a||a==="#ignore")return;if(!bc[a])bc[a]={s:0,cnt:0,src:t.st};bc[a].s+=toCur(t.nt);bc[a].cnt++});
  const topC=Object.entries(bc).map(([n,d])=>({n,...d})).sort((a,b)=>b.s-a.s).slice(0,15);
  const expFt=ft.filter(t=>t.cat==="Продаж, Експорт");
  const expEUR=expFt.filter(t=>t.money==="EUR").reduce((s,t)=>s+t.sm,0);
  const expUSD=expFt.filter(t=>t.money==="USD").reduce((s,t)=>s+t.sm,0);
  const r1f=ft.filter(t=>t.st==="1Ф").reduce((s,t)=>s+toCur(t.nt),0);
  const r2f=ft.filter(t=>t.st==="2Ф").reduce((s,t)=>s+toCur(t.nt),0);
  const totalR=ft.reduce((s,t)=>s+toCur(t.nt),0);
  const chYrs=aY();const chD=chYrs.map(y=>{const yt=T.filter(t=>t.yr===y&&t.tp==="Доход");const o={};CHS.forEach(c=>{o[CSH[c]]=toCur(yt.filter(t=>t.cat===c).reduce((s,t)=>s+t.nt,0))});return{year:y,...o}});
  el.innerHTML=`
    <div class="kpis">
      <div class="kpi"><div class="l">Всего</div><div class="v g">${fm(totalR)}${c$}</div></div>
      <div class="kpi"><div class="l">1Ф</div><div class="v">${fm(r1f)}${c$}</div><div class="s">${totalR?(r1f/totalR*100).toFixed(0):'0'}%</div></div>
      <div class="kpi"><div class="l">2Ф</div><div class="v">${fm(r2f)}${c$}</div><div class="s">${totalR?(r2f/totalR*100).toFixed(0):'0'}%</div></div>
      ${expFt.length?'<div class="kpi"><div class="l">Экспорт €</div><div class="v" style="color:#3b82f6">'+ff(expEUR)+'€</div></div><div class="kpi"><div class="l">Экспорт $</div><div class="v" style="color:#f59e0b">'+ff(expUSD)+'$</div></div>':''}
    </div>
    <div class="cc"><h3>Каналы по годам</h3><canvas id="c5" height="120"></canvas><div style="display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:6px">${CHS.map((c,i)=>'<span style="display:flex;align-items:center;gap:3px;font-size:8px;color:#7d8196"><i style="width:5px;height:5px;border-radius:2px;display:inline-block;background:'+CC[i]+'"></i>'+CSH[c]+'</span>').join("")}</div></div>
    <div class="cc"><h3>Сезонность: выручка ${sY(f)} vs ${pYr(sY(f))}</h3><canvas id="cSeas" height="80"></canvas></div>
    <div class="row">
      <div class="cc"><h3>Каналы</h3><canvas id="c3" height="180"></canvas></div>
      <div class="cc"><h3>Менеджеры</h3>${mgrs.map(m=>'<div class="mg" onclick="showMgr(\''+m.n.replace(/'/g,"\\'")+'\')"><div><div class="n">'+m.n+'</div><div class="s">КМ '+(m.s?(m.c/m.s*100).toFixed(1):0)+'% · '+m.cnt+' опер</div></div><div><div class="v">'+ff(m.s)+c$+'</div><div class="s">'+ff(m.c)+c$+'</div></div></div>').join("")}
        ${mgrs.length?'<div class="mg" style="cursor:default"><div><div class="n">Итого</div></div><div><div class="v">'+ff(mgrs.reduce((s,m)=>s+m.s,0))+c$+'</div></div></div>':''}</div>
    </div>
    <div class="cc"><h3>Топ контрагентов</h3><table class="tbl"><tr><th>Контрагент</th><th class="r">1Ф/2Ф</th><th class="r">Сумма</th><th class="r">Опер.</th></tr>
      ${topC.map(c=>'<tr class="click" onclick="showContr(\''+c.n.replace(/'/g,"\\'")+'\')"><td>'+c.n.substring(0,30)+'</td><td class="r" style="color:#7d8196">'+c.src+'</td><td class="r g">'+ff(c.s)+c$+'</td><td class="r">'+c.cnt+'</td></tr>').join("")}
      <tr class="tot"><td>Итого (топ-15)</td><td></td><td class="r g">${ff(topC.reduce((s,c)=>s+c.s,0))}${c$}</td><td class="r">${topC.reduce((s,c)=>s+c.cnt,0)}</td></tr></table></div>`;
  dc("c5");CH.c5=new Chart(document.getElementById("c5"),{type:"bar",data:{labels:chYrs,datasets:CHS.map((c,i)=>({label:CSH[c],data:chD.map(d=>d[CSH[c]]||0),backgroundColor:CC[i],borderRadius:2}))},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{stacked:true,ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  dc("c3");CH.c3=new Chart(document.getElementById("c3"),{type:"doughnut",data:{labels:pd.map(x=>x.n),datasets:[{data:pd.map(x=>x.v),backgroundColor:CC.slice(0,pd.length),borderWidth:0}]},options:{responsive:true,cutout:"55%",plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:8},boxWidth:7,padding:4}},tooltip:{callbacks:{label:c=>c.label+": "+ff(c.raw)+cs()}}}}});
  const sy_s=sY(f),py_s=pYr(sy_s);const sR1={},sR2={};
  T.filter(t=>t.yr===sy_s&&t.tp==="Доход").forEach(t=>{sR1[t.mm]=(sR1[t.mm]||0)+toCur(t.nt)});
  T.filter(t=>t.yr===py_s&&t.tp==="Доход").forEach(t=>{sR2[t.mm]=(sR2[t.mm]||0)+toCur(t.nt)});
  dc("cSeas");CH.cSeas=new Chart(document.getElementById("cSeas"),{type:"line",data:{labels:MN,datasets:[{label:sy_s,data:MMa.map(m=>sR1[m]||0),borderColor:"#10b981",backgroundColor:"rgba(16,185,129,.1)",fill:true,tension:.3,pointRadius:3,pointBackgroundColor:"#10b981",borderWidth:2},{label:py_s,data:MMa.map(m=>sR2[m]||0),borderColor:"rgba(139,92,246,.6)",borderDash:[4,3],tension:.3,pointRadius:2,pointBackgroundColor:"#8b5cf6",borderWidth:1.5,fill:false}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}
