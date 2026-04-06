// js/tabs/unrec.js — Unrecognized transactions tab
function rUnrec(){
  const el=document.getElementById("t-unrec");
  const unrec=T.filter(t=>t.cat==="???"||t.cat===""||t.cat.includes("???"));
  const byA={};unrec.forEach(t=>{const a=t.alias||t.name||"(пусто)";if(!byA[a])byA[a]={cnt:0,amt:0,src:t.src};byA[a].cnt++;byA[a].amt+=t.amt});
  const sorted=Object.entries(byA).map(([n,d])=>({n,...d})).sort((a,b)=>Math.abs(b.amt)-Math.abs(a.amt));
  el.innerHTML=`
    ${sorted.length?'<div class="warn">'+sorted.length+' нераспознанных на '+ff(Math.abs(sorted.reduce((s,x)=>s+x.amt,0)))+' ₴</div>':'<div class="info">Все контрагенты распознаны ✓</div>'}
    <div class="cc"><h3>Нераспознанные</h3><table class="tbl"><tr><th>Контрагент</th><th class="r">Источник</th><th class="r">Сумма</th><th class="r">Опер.</th></tr>
      ${sorted.map(x=>'<tr><td>'+x.n.substring(0,35)+'</td><td class="r" style="color:#7d8196">'+x.src+'</td><td class="r '+(x.amt>0?"g":"rd")+'">'+ff(x.amt)+' ₴</td><td class="r">'+x.cnt+'</td></tr>').join("")}</table></div>`;
}
