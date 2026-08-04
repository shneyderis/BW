// js/drill.js — Універсальний drill-down: категорія → контрагенти → транзакції
// Використання з будь-якої таблиці: onclick="drillGo(${drID({tp:'Расход',cat:'...',yr:'2025'})})"
// Рівні визначаються полями опису: без cat/acc → список категорій; cat → контрагенти; acc → транзакції.
// Опис: {tp, asset?, yr?, mm?, src?, geo?, mgr?, cat?, acc?}
let DRS=[];const DRREG=[];
function drID(o){DRREG.push(o);return DRREG.length-1}
// фільтри з глобального filterbar → опис drill (chan відображається як cat)
function drF(f){const o={};if(f.yr!=="ALL")o.yr=f.yr;if(f.mm!=="ALL")o.mm=f.mm;if(f.src!=="ALL")o.src=f.src;if(f.geo!=="ALL")o.geo=f.geo;if(f.mgr!=="ALL")o.mgr=f.mgr;if(f.chan!=="ALL")o.cat=f.chan;return o}
window.drillGo=function(i){const o=DRREG[i];if(!o)return;DRS=[o];renderDrill()};
window.drillPush=function(i){const o=DRREG[i];if(!o)return;DRS.push(o);renderDrill()};
window.drillBack=function(){DRS.pop();DRS.length?renderDrill():closeModal()};

function drillTx(o){
  let l=T.filter(t=>t.tp===o.tp&&(o.asset?isA(t):!isA(t)));
  if(o.yr)l=l.filter(t=>t.yr===o.yr);
  if(o.mm)l=l.filter(t=>t.mm===o.mm);
  if(o.src)l=l.filter(t=>t.st===o.src);
  if(o.geo)l=l.filter(t=>t.geo===o.geo);
  if(o.mgr)l=l.filter(t=>t.mgr===o.mgr);
  if(o.cat)l=l.filter(t=>t.cat===o.cat);
  if(o.acc)l=l.filter(t=>(t.alias||t.name||"(без назви)")===o.acc);
  return l;
}

function renderDrill(){
  const o=DRS[DRS.length-1],c$=cs();
  const list=drillTx(o);
  const isExp=o.tp==="Расход";
  const vClr=isExp?"rd":"g";
  const kpiClr=isExp?"#ef4444":"#10b981";
  const val=t=>toCur(isExp?Math.abs(t.nt):t.nt);
  const total=list.reduce((s,t)=>s+val(t),0);
  const per=(o.yr?(o.mm?MN[parseInt(o.mm)-1]+" "+o.yr:o.yr):"всі роки")+(o.src?" · "+o.src:"");
  const back=DRS.length>1?`<button class="flt" style="margin-bottom:8px" onclick="drillBack()">← Назад</button>`:"";
  let title,body;
  if(o.acc){
    title=o.acc;
    const rows=[...list].sort((a,b)=>b.mo.localeCompare(a.mo)).slice(0,300);
    body=`${o.cat?`<div style="font-size:9px;color:#7d8196;margin-bottom:6px">${esc(o.cat)}</div>`:""}
      <div class="sec">Транзакції${list.length>300?` (показано 300 з ${list.length})`:` (${list.length})`}</div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>Місяць</th><th>Призначення</th><th>Категорія</th><th class="r">Сума</th><th class="r">Вал.</th><th class="r">Дж.</th><th>Менеджер</th></tr>
      ${rows.map(t=>{const orig=t.money&&t.money!=="UAH"&&t.sm?ff(Math.abs(t.sm))+" "+esc(t.money):"—";return`<tr><td>${t.ym}</td><td style="font-size:9px">${esc((t.name||"—").substring(0,42))}</td><td style="font-size:9px;color:#7d8196">${esc(t.cat.substring(0,26))}</td><td class="r ${vClr}">${ff(val(t))}${c$}</td><td class="r" style="color:#7d8196;font-size:9px">${orig}</td><td class="r" style="color:#7d8196;font-size:9px">${t.st}</td><td style="font-size:9px;color:#7d8196">${esc(t.mgr||"")}</td></tr>`}).join("")}
      <tr class="tot"><td>Разом</td><td></td><td></td><td class="r ${vClr}">${ff(total)}${c$}</td><td></td><td></td><td></td></tr></table></div>`;
  } else if(o.cat){
    title=o.cat;
    const by={};list.forEach(t=>{const a=t.alias||t.name||"(без назви)";if(!by[a])by[a]={s:0,c:0,l:""};by[a].s+=val(t);by[a].c++;if(t.ym>by[a].l)by[a].l=t.ym});
    const arr=Object.entries(by).sort((a,b)=>b[1].s-a[1].s);
    body=`<div class="sec">Контрагенти (${arr.length}) · клік → транзакції</div>
      <table class="tbl"><tr><th>Контрагент</th><th class="r">Сума</th><th class="r">%</th><th class="r">Опер.</th><th class="r">Ост.міс</th></tr>
      ${arr.map(([a,d])=>`<tr class="click" onclick="drillPush(${drID({...o,acc:a})})"><td>${esc(a.substring(0,36))}</td><td class="r ${vClr}">${ff(d.s)}${c$}</td><td class="r">${total?(d.s/total*100).toFixed(1):"0.0"}%</td><td class="r">${d.c}</td><td class="r" style="color:#7d8196;font-size:9px">${d.l}</td></tr>`).join("")}
      <tr class="tot"><td>Разом</td><td class="r ${vClr}">${ff(total)}${c$}</td><td class="r">100%</td><td class="r">${list.length}</td><td></td></tr></table>`;
  } else {
    title=o.asset?"Основні фонди":isExp?"Витрати (OPEX)":"Доходи";
    const by={};list.forEach(t=>{const cn=t.cat||"???";if(!by[cn])by[cn]={s:0,c:0};by[cn].s+=val(t);by[cn].c++});
    const arr=Object.entries(by).sort((a,b)=>b[1].s-a[1].s);
    body=`<div class="sec">Категорії (${arr.length}) · клік → контрагенти</div>
      <table class="tbl"><tr><th>Категорія</th><th class="r">Сума</th><th class="r">%</th><th class="r">Опер.</th></tr>
      ${arr.map(([cn,d])=>`<tr class="click" onclick="drillPush(${drID({...o,cat:cn})})"><td>${esc(cn.substring(0,34))}</td><td class="r ${vClr}">${ff(d.s)}${c$}</td><td class="r">${total?(d.s/total*100).toFixed(1):"0.0"}%</td><td class="r">${d.c}</td></tr>`).join("")}
      <tr class="tot"><td>Разом</td><td class="r ${vClr}">${ff(total)}${c$}</td><td class="r">100%</td><td class="r">${list.length}</td></tr></table>`;
  }
  document.getElementById("modal").innerHTML=`<div class="modal-c"><button class="modal-close" onclick="closeModal()">✕</button>${back}<h2>${esc(title)}</h2>
    <div class="kpis" style="margin-bottom:8px"><div class="kpi"><div class="l">${per}</div><div class="v" style="color:${kpiClr}">${ff(total)}${c$}</div><div class="s">${list.length} опер</div></div></div>${body}</div>`;
  document.getElementById("modal").classList.remove("hidden");
}
