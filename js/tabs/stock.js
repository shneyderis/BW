// js/tabs/stock.js — Stock tab (Stock_Data new format + 3_Stock fallback)
function rStock(){
  const el=document.getElementById("t-stock");
  if(SD.length){
    const wines=[...new Set(SD.map(r=>gv(r,"wine")||""))].filter(Boolean).sort();
    const dates=[...new Set(SD.map(r=>gv(r,"date")||""))].sort();const lastDate=dates[dates.length-1]||"";
    const current={};
    wines.forEach(w=>{const rows=SD.filter(r=>(gv(r,"wine")||"")===w).sort((a,b)=>(gv(a,"date")||"").localeCompare(gv(b,"date")||""));const lastBal=rows.filter(r=>(gv(r,"type")||"").toLowerCase()==="balance").pop();const totalBottling=rows.filter(r=>(gv(r,"type")||"").toLowerCase()==="bottling").reduce((s,r)=>s+pn(gv(r,"qty")),0);current[w]={bal:lastBal?pn(gv(lastBal,"qty")):0,bottling:totalBottling,lastDate:lastBal?gv(lastBal,"date"):""}});
    const totalBtl=Object.values(current).reduce((s,c)=>s+c.bal,0);const totalBottling=Object.values(current).reduce((s,c)=>s+c.bottling,0);
    const recentDates=dates.slice(-8);const balByDate={};
    recentDates.forEach(d=>{balByDate[d]={};wines.forEach(w=>{const row=SD.find(r=>(gv(r,"wine")||"")===w&&(gv(r,"date")||"")===d&&(gv(r,"type")||"").toLowerCase()==="balance");balByDate[d][w]=row?pn(gv(row,"qty")):null})});
    el.innerHTML=`<div class="info">Stock_Data · до: ${lastDate} · ${wines.length} позиций</div>
      <div class="kpis"><div class="kpi"><div class="l">Позиций</div><div class="v">${wines.length}</div></div><div class="kpi"><div class="l">Бутылок</div><div class="v">${ff(totalBtl)}</div></div><div class="kpi"><div class="l">Разлито</div><div class="v" style="color:#3b82f6">${ff(totalBottling)}</div></div></div>
      <div class="cc"><h3>Остатки</h3>${Object.entries(current).sort((a,b)=>b[1].bal-a[1].bal).map(([w,d])=>{const pct=totalBtl>0?(d.bal/totalBtl*100):0;const co=d.bal<=0?"#ef4444":d.bal<50?"#f59e0b":"#10b981";return'<div class="si"><div class="top"><span class="nm">'+w+'</span><span style="color:'+co+';font-weight:600">'+ff(d.bal)+' бут</span></div><div class="bar"><div class="bf" style="width:'+Math.min(pct*3,100)+'%;background:'+co+'"></div></div><div class="bot"><span>Разлито: '+ff(d.bottling)+'</span><span>'+d.lastDate+'</span></div></div>'}).join("")}</div>
      ${recentDates.length>1?'<div class="cc"><h3>Динамика</h3><canvas id="cStk" height="120"></canvas></div>':""}`;
    if(recentDates.length>1){const topW=Object.entries(current).sort((a,b)=>b[1].bal-a[1].bal).slice(0,6).map(([w])=>w);dc("cStk");CH.cStk=new Chart(document.getElementById("cStk"),{type:"line",data:{labels:recentDates.map(d=>d.substring(5)),datasets:topW.map((w,i)=>({label:w.substring(0,15),data:recentDates.map(d=>balByDate[d][w]),borderColor:CC[i%CC.length],tension:.3,pointRadius:2,borderWidth:1.5,spanGaps:true}))},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:8},boxWidth:8}}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}}}}})}
  } else {
    const it=SK.map(s=>{const w=gv(s,"вино")||"";const vi=gv(s,"урожай")||"";const st=pn(gv(s,"остаток")||"0");const so=pn(gv(s,"продано")||"0");const av=pn(gv(s,"сред")||"0");const mr=gv(s,"запас")||"";const mo=mr&&mr!=="N/A"?parseFloat(mr):null;return{w,vi,st,so,av,mo}}).filter(s=>s.st>0);
    it.sort((a,b)=>{if(a.mo===null)return 1;if(b.mo===null)return-1;return a.mo-b.mo});
    const tb=it.reduce((s,i)=>s+i.st,0),lo=it.filter(i=>i.mo!==null&&i.mo<2).length,lo3=it.filter(i=>i.mo!==null&&i.mo<3).length,sk=it.filter(i=>i.mo!==null&&i.mo>15).length;
    el.innerHTML=`<div class="info">3_Stock (старый). Stock_Data пуст.</div>
      <div class="kpis"><div class="kpi"><div class="l">Позиций</div><div class="v">${it.length}</div></div><div class="kpi"><div class="l">Бутылок</div><div class="v">${ff(tb)}</div></div><div class="kpi"><div class="l">Крит.</div><div class="v rd">${lo}</div><div class="s">&lt;2м</div></div><div class="kpi"><div class="l">Заканч.</div><div class="v" style="color:#e11d48">${lo3}</div></div><div class="kpi"><div class="l">Застр.</div><div class="v" style="color:#f59e0b">${sk}</div></div></div>
      ${it.map(i=>{const t=i.st+i.so,p=t>0?(i.st/t*100):0;const cr=i.mo!==null&&i.mo<2;const lw=i.mo!==null&&i.mo<3;const st=i.mo!==null&&i.mo>15;const cl=cr||lw?"low":st?"stk":"";const co=cr?"#ef4444":lw?"#e11d48":st?"#f59e0b":"#10b981";return'<div class="si '+cl+'"><div class="top"><span class="nm">'+i.w+' '+i.vi+'</span><span style="color:'+co+';font-weight:600">'+ff(i.st)+' · '+(i.mo!==null?i.mo.toFixed(1)+'м':'N/A')+'</span></div><div class="bar"><div class="bf" style="width:'+p+'%;background:'+co+'"></div></div><div class="bot"><span>Продано: '+ff(i.so)+'</span><span>~'+i.av+'/мес</span></div></div>'}).join("")}`;
  }
}
