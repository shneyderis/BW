// js/tabs/pl.js — P&L tab
function rPL(f){
  const el=document.getElementById("t-pl"),sy=sY(f),py=pYr(sy),mm=mxMM(sy),c$=cs();
  const opex=T.filter(t=>!isA(t));
  const yearSelected=f.yr!=="ALL";
  const monthSelected=f.mm!=="ALL";
  const sr=opex.filter(t=>t.yr===sy&&t.tp==="Доход").reduce((s,t)=>s+t.nt,0);
  const se=opex.filter(t=>t.yr===sy&&t.tp==="Расход").reduce((s,t)=>s+t.nt,0);
  const assetY=T.filter(t=>isA(t)&&t.yr===sy&&t.tp==="Расход").reduce((s,t)=>s+Math.abs(t.nt),0);
  const sp=sr+se,sm=sr?(sp/sr*100).toFixed(1):"0";
  const pr=opex.filter(t=>t.yr===py&&parseInt(t.mm)<=mm&&t.tp==="Доход").reduce((s,t)=>s+t.nt,0);
  const gr=pr?((sr-pr)/pr*100).toFixed(1):"0";const ytd=mm<12?" →"+MN[mm-1]:"";
  const uahB=BL.filter(b=>gv(b,"валют")==="UAH").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const eurB=BL.filter(b=>gv(b,"валют")==="EUR").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const usdB=BL.filter(b=>gv(b,"валют")==="USD").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const totalB=uahB+eurB*FX.EUR+usdB*FX.USD;
  let chartHTML="",detailHTML="";
  if(!yearSelected){
    const yrs=aY();
    const bd=yrs.map(y=>{const ox=opex.filter(t=>t.yr===y);const r=ox.filter(t=>t.tp==="Доход").reduce((s,t)=>s+t.nt,0);const e=ox.filter(t=>t.tp==="Расход").reduce((s,t)=>s+t.nt,0);const a=T.filter(t=>isA(t)&&t.yr===y&&t.tp==="Расход").reduce((s,t)=>s+Math.abs(t.nt),0);return{y,r:toCur(r),e:toCur(Math.abs(e)),p:toCur(r+e),a:toCur(a),m:r?((r+e)/r*100):0}});
    chartHTML=`<div class="row"><div class="cc"><h3>P&L по роках (без осн.фондів)</h3><canvas id="c1" height="150"></canvas></div><div class="cc"><h3>Маржинальність %</h3><canvas id="c1m" height="150"></canvas></div></div>`;
    detailHTML=`<div class="cc"><h3>Зведена таблиця</h3><table class="tbl"><tr><th></th>${yrs.map(y=>'<th class="r">'+y+'</th>').join("")}<th class="r">Разом</th></tr>
      <tr><td>Виручка нетто</td>${bd.map(d=>'<td class="r g">'+fm(d.r)+'</td>').join("")}<td class="r g">${fm(bd.reduce((s,d)=>s+d.r,0))}</td></tr>
      <tr><td>OPEX</td>${bd.map(d=>'<td class="r rd">'+fm(d.e)+'</td>').join("")}<td class="r rd">${fm(bd.reduce((s,d)=>s+d.e,0))}</td></tr>
      <tr><td>Осн.фонди</td>${bd.map(d=>'<td class="r" style="color:#3b82f6">'+fm(d.a)+'</td>').join("")}<td class="r" style="color:#3b82f6">${fm(bd.reduce((s,d)=>s+d.a,0))}</td></tr>
      <tr class="tot"><td>Прибуток</td>${bd.map(d=>'<td class="r '+(d.p>0?"g":"rd")+'">'+fm(d.p)+'</td>').join("")}<td class="r">${fm(bd.reduce((s,d)=>s+d.p,0))}</td></tr>
      <tr><td>Маржа</td>${bd.map(d=>'<td class="r">'+d.m.toFixed(1)+'%</td>').join("")}<td class="r"></td></tr></table></div>`;
  } else if(yearSelected && !monthSelected){
    const ms1={},ms2={},me1={},me2={},ma1={};
    opex.filter(t=>t.yr===sy&&t.tp==="Доход").forEach(t=>{ms1[t.mm]=(ms1[t.mm]||0)+toCur(t.nt)});
    opex.filter(t=>t.yr===py&&t.tp==="Доход").forEach(t=>{ms2[t.mm]=(ms2[t.mm]||0)+toCur(t.nt)});
    opex.filter(t=>t.yr===sy&&t.tp==="Расход").forEach(t=>{me1[t.mm]=(me1[t.mm]||0)+toCur(Math.abs(t.nt))});
    opex.filter(t=>t.yr===py&&t.tp==="Расход").forEach(t=>{me2[t.mm]=(me2[t.mm]||0)+toCur(Math.abs(t.nt))});
    T.filter(t=>isA(t)&&t.yr===sy&&t.tp==="Расход").forEach(t=>{ma1[t.mm]=(ma1[t.mm]||0)+toCur(Math.abs(t.nt))});
    chartHTML=`<div class="cc"><h3>Виручка помісячно ${sy} vs ${py}</h3><canvas id="c2r" height="90"></canvas></div>
      <div class="cc"><h3>Витрати помісячно ${sy} vs ${py} + осн.фонды</h3><canvas id="c2e" height="90"></canvas></div>
      <div class="cc"><h3>Сезонність: прибуток ${sy} vs ${py}</h3><canvas id="c2s" height="80"></canvas></div>`;
    const chD=CHS.map(c=>{const v=opex.filter(t=>t.yr===sy&&t.tp==="Доход"&&t.cat===c).reduce((s,t)=>s+t.nt,0);const vp=opex.filter(t=>t.yr===py&&t.tp==="Доход"&&t.cat===c).reduce((s,t)=>s+t.nt,0);return{n:CSH[c]||c,v:toCur(v),vp:toCur(vp)}}).filter(x=>x.v>0||x.vp>0);
    const expD=[...new Set(opex.filter(t=>t.yr===sy&&t.tp==="Расход").map(t=>t.cat))].map(c=>{const v=opex.filter(t=>t.yr===sy&&t.tp==="Расход"&&t.cat===c).reduce((s,t)=>s+t.nt,0);const vp=opex.filter(t=>t.yr===py&&t.tp==="Расход"&&t.cat===c).reduce((s,t)=>s+t.nt,0);return{c,v:toCur(Math.abs(v)),vp:toCur(Math.abs(vp))}}).sort((a,b)=>b.v-a.v).slice(0,12);
    const trS=chD.reduce((s,x)=>s+x.v,0),trP=chD.reduce((s,x)=>s+x.vp,0);
    const teS=expD.reduce((s,x)=>s+x.v,0),teP=expD.reduce((s,x)=>s+x.vp,0);
    detailHTML=`<div class="row">
      <div class="cc"><h3>Доходи по каналах</h3><table class="tbl"><tr><th>Канал</th><th class="r">${sy}</th><th class="r">${py}</th><th class="r">Δ%</th></tr>
        ${chD.map(x=>{const d=x.vp?((x.v-x.vp)/x.vp*100).toFixed(0):"—";return'<tr><td>'+x.n+'</td><td class="r g">'+ff(x.v)+'</td><td class="r" style="color:#7d8196">'+ff(x.vp)+'</td><td class="r" style="color:'+(d>0?"#10b981":"#ef4444")+'">'+(d>0?"+":"")+d+'%</td></tr>'}).join("")}
        <tr class="tot"><td>Разом</td><td class="r g">${ff(trS)}</td><td class="r" style="color:#7d8196">${ff(trP)}</td><td class="r">${trP?((trS-trP)/trP*100).toFixed(0)+"%":"—"}</td></tr></table></div>
      <div class="cc"><h3>Витрати по категоріях (OPEX)</h3><table class="tbl"><tr><th>Категорія</th><th class="r">${sy}</th><th class="r">%выр</th><th class="r">${py}</th></tr>
        ${expD.map(x=>{const pct=trS?(x.v/trS*100).toFixed(1):"—";return'<tr><td>'+x.c.substring(0,22)+'</td><td class="r rd">'+ff(x.v)+'</td><td class="r">'+pct+'%</td><td class="r" style="color:#7d8196">'+ff(x.vp)+'</td></tr>'}).join("")}
        <tr class="tot"><td>Разом OPEX</td><td class="r rd">${ff(teS)}</td><td class="r">${trS?(teS/trS*100).toFixed(1):"—"}%</td><td class="r" style="color:#7d8196">${ff(teP)}</td></tr></table></div>
    </div>`;
  } else {
    chartHTML=`<div class="info">Дані згруповані помісячно.</div>`;
    const ft=fl(opex,f);const rev=ft.filter(t=>t.tp==="Доход");const exp=ft.filter(t=>t.tp==="Расход");
    const byAlias={};rev.forEach(t=>{const a=t.alias||t.name;if(!byAlias[a])byAlias[a]={s:0,c:0};byAlias[a].s+=toCur(t.nt);byAlias[a].c++});
    const top=Object.entries(byAlias).sort((a,b)=>b[1].s-a[1].s).slice(0,10);
    detailHTML=`<div class="row">
      <div class="cc"><h3>Доходи за ${MN[parseInt(f.mm)-1]} ${sy}: 1Ф / 2Ф</h3>
        <div class="kpis"><div class="kpi"><div class="l">1Ф</div><div class="v g">${ff(toCur(rev.filter(t=>t.st==="1Ф").reduce((s,t)=>s+t.nt,0)))}${c$}</div></div><div class="kpi"><div class="l">2Ф</div><div class="v g">${ff(toCur(rev.filter(t=>t.st==="2Ф").reduce((s,t)=>s+t.nt,0)))}${c$}</div></div></div>
        <table class="tbl"><tr><th>Контрагент</th><th class="r">Сума</th></tr>${top.map(([n,d])=>'<tr><td>'+n.substring(0,30)+'</td><td class="r g">'+ff(d.s)+c$+'</td></tr>').join("")}</table></div>
      <div class="cc"><h3>Витрати за ${MN[parseInt(f.mm)-1]} ${sy}</h3>
        ${(()=>{const bc={};exp.forEach(t=>{bc[t.cat]=(bc[t.cat]||0)+toCur(Math.abs(t.nt))});return Object.entries(bc).sort((a,b)=>b[1]-a[1]).map(([c,v])=>'<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px"><span>'+c.substring(0,25)+'</span><span class="rd">'+ff(v)+c$+'</span></div>').join("")})()}</div>
    </div>`;
  }
  el.innerHTML=`
    <div class="kpis">
      <div class="kpi"><div class="l">Виручка нетто ${sy}${ytd}</div><div class="v g">${fm(toCur(sr))}${c$}</div><div class="s">${gr>0?"+":""}${gr}% vs ${py}${ytd}</div></div>
      <div class="kpi"><div class="l">OPEX ${sy}</div><div class="v rd">${fm(toCur(Math.abs(se)))}${c$}</div></div>
      <div class="kpi"><div class="l">Осн.фонди</div><div class="v" style="color:#3b82f6">${fm(toCur(assetY))}${c$}</div></div>
      <div class="kpi"><div class="l">Прибуток</div><div class="v" style="color:${sp>0?'#10b981':'#ef4444'}">${fm(toCur(sp))}${c$}</div><div class="s">Маржа ${sm}%</div></div>
      <div class="kpi"><div class="l">Баланс</div><div class="v" style="color:#f59e0b">${ff(toCur(totalB))}${c$}</div><div class="s">${BL.length?`₴${ff(uahB)} €${ff(eurB)} $${ff(usdB)}`:'<span style="color:#7d8196">(дані не завантажені)</span>'}</div></div>
    </div>${chartHTML}${detailHTML}`;
  if(!yearSelected){
    const yrs=aY();const bd=yrs.map(y=>{const ox=opex.filter(t=>t.yr===y);const r=ox.filter(t=>t.tp==="Доход").reduce((s,t)=>s+t.nt,0);const e=ox.filter(t=>t.tp==="Расход").reduce((s,t)=>s+t.nt,0);return{y,r:toCur(r),e:toCur(Math.abs(e)),p:toCur(r+e),m:r?((r+e)/r*100):0}});
    dc("c1");CH.c1=new Chart(document.getElementById("c1"),{type:"bar",data:{labels:yrs,datasets:[{label:"Виручка",data:bd.map(x=>x.r),backgroundColor:"#10b981",borderRadius:3},{label:"Витрати",data:bd.map(x=>x.e),backgroundColor:"rgba(239,68,68,.6)",borderRadius:3},{label:"Прибуток",data:bd.map(x=>x.p),backgroundColor:"#8b5cf6",borderRadius:3}]},options:COB});
    dc("c1m");CH.c1m=new Chart(document.getElementById("c1m"),{type:"line",data:{labels:yrs,datasets:[{label:"Маржа",data:bd.map(x=>x.m),borderColor:"#f59e0b",backgroundColor:"rgba(245,158,11,.1)",fill:true,tension:.3,pointRadius:3,pointBackgroundColor:"#f59e0b",borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>v.toFixed(0)+"%"},grid:{color:"#1e2130"}}}}});
  } else if(!monthSelected){
    const ms1={},ms2={},me1={},me2={};
    opex.filter(t=>t.yr===sy&&t.tp==="Доход").forEach(t=>{ms1[t.mm]=(ms1[t.mm]||0)+toCur(t.nt)});
    opex.filter(t=>t.yr===py&&t.tp==="Доход").forEach(t=>{ms2[t.mm]=(ms2[t.mm]||0)+toCur(t.nt)});
    opex.filter(t=>t.yr===sy&&t.tp==="Расход").forEach(t=>{me1[t.mm]=(me1[t.mm]||0)+toCur(Math.abs(t.nt))});
    opex.filter(t=>t.yr===py&&t.tp==="Расход").forEach(t=>{me2[t.mm]=(me2[t.mm]||0)+toCur(Math.abs(t.nt))});
    T.filter(t=>isA(t)&&t.yr===sy&&t.tp==="Расход").forEach(t=>{me1[t.mm]=(me1[t.mm]||0)+toCur(Math.abs(t.nt))});
    dc("c2r");CH.c2r=new Chart(document.getElementById("c2r"),{type:"bar",data:{labels:MN,datasets:[{label:sy,data:MMa.map(m=>ms1[m]||0),backgroundColor:"#10b981",borderRadius:3},{label:py,data:MMa.map(m=>ms2[m]||0),backgroundColor:"rgba(139,92,246,.35)",borderRadius:3}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
    dc("c2e");CH.c2e=new Chart(document.getElementById("c2e"),{type:"bar",data:{labels:MN,datasets:[{label:"OPEX "+sy,data:MMa.map(m=>me1[m]||0),backgroundColor:"rgba(239,68,68,.55)",borderRadius:3},{label:"OPEX "+py,data:MMa.map(m=>me2[m]||0),backgroundColor:"rgba(239,68,68,.2)",borderRadius:3}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
    const mp1s={},mp2s={};MMa.forEach(m=>{mp1s[m]=(ms1[m]||0)-(me1[m]||0);mp2s[m]=(ms2[m]||0)-(me2[m]||0)});
    dc("c2s");CH.c2s=new Chart(document.getElementById("c2s"),{type:"line",data:{labels:MN,datasets:[{label:"Прибуток "+sy,data:MMa.map(m=>mp1s[m]),borderColor:"#10b981",backgroundColor:"rgba(16,185,129,.08)",fill:true,tension:.3,pointRadius:3,pointBackgroundColor:"#10b981",borderWidth:2},{label:"Прибуток "+py,data:MMa.map(m=>mp2s[m]),borderColor:"rgba(139,92,246,.6)",borderDash:[4,3],tension:.3,pointRadius:2,pointBackgroundColor:"#8b5cf6",borderWidth:1.5,fill:false}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }
}
