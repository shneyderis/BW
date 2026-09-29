// js/tabs/salary.js — 💼 ЗП: Аналітика виплат · Менеджери (комісії) · Відомість (Payroll)
// Джерела: Dashboard_Data (виплати «ЗП …»/«BW …», продажі з менеджером, колонка commission),
//          workerNEW («Коміссія Фінальна» — ставка клієнта), листи Payroll / Payroll_Adj (оклади, бонуси, аванси).
let PAYROLL=[],PAYROLL_ADJ=[],payrollLoaded=false;
let _salView="analytics",_salYM="",_salMgr=null;

async function loadPayroll(){
  try{
    const[p,a]=await Promise.all([csvF("Payroll").catch(()=>[]),csvF("Payroll_Adj").catch(()=>[])]);
    PAYROLL=(p||[]).map(r=>({employee:(gv(r,"employee")||gv(r,"співробітник")||"").trim(),role:(gv(r,"role")||"staff").trim().toLowerCase(),manager:(gv(r,"manager_name")||gv(r,"менеджер")||"").trim(),
      base:pn(gv(r,"base")||gv(r,"оклад")),currency:(gv(r,"currency")||"UAH").trim().toUpperCase(),pct:parseFloat(String(gv(r,"commission_pct")||gv(r,"комісія")||"").replace(",","."))||0,
      zpCat:(gv(r,"zp_category")||gv(r,"категорія")||"").trim(),from:(gv(r,"date_from")||"").substring(0,10),active:(gv(r,"active")||"true").trim().toLowerCase()!=="false",notes:gv(r,"notes")||""})).filter(r=>r.employee);
    PAYROLL_ADJ=(a||[]).map(r=>({employee:(gv(r,"employee")||"").trim(),month:(gv(r,"month")||"").substring(0,7),type:(gv(r,"type")||"bonus").trim().toLowerCase(),amount:pn(gv(r,"amount")),note:gv(r,"note")||""})).filter(r=>r.employee&&r.month);
    if(PAYROLL.length)console.log("Payroll loaded:",PAYROLL.length,"rows,",PAYROLL_ADJ.length,"adj");
  }catch(e){console.warn("Payroll load:",e)}
  payrollLoaded=true;
}

// ---------- ставки комісії ----------
let _wnByAlias=null;
function _rateFromStr(v){if(v===undefined||v===null||v==="")return null;const s=String(v).trim();const hasPct=s.includes("%");const n=parseFloat(s.replace("%","").replace(",","."));if(isNaN(n))return null;if(hasPct)return n;return n<1?n*100:n}
// Рядок Payroll для менеджера (за manager_name), актуальний на місяць
function payrollRowFor(pred,ym){const end=ym+"-31";const rows=PAYROLL.filter(r=>pred(r)&&(!r.from||r.from<=end)).sort((a,b)=>(b.from||"").localeCompare(a.from||""));return rows[0]||null}
// Ставка комісії для операції t: workerNEW (клієнт) → Payroll (менеджер) → Settings mgr_commission_default → немає
function commRate(t,ym){
  if(!_wnByAlias){_wnByAlias={};Object.entries(WN||{}).forEach(([k,v])=>{if(k==="_err")return;if(v.alias)_wnByAlias[v.alias]=v})}
  const w=WN[t.name]||(t.alias?_wnByAlias[t.alias]:null)||(t.alias?WN[t.alias]:null);
  const rw=w?_rateFromStr(w.commission):null;
  if(rw!==null)return{rate:rw,src:"клієнт (workerNEW)"};
  const pr=t.mgr?payrollRowFor(r=>r.manager===t.mgr||r.employee===t.mgr,ym):null;
  if(pr&&pr.pct)return{rate:pr.pct,src:"менеджер (Payroll)"};
  const d=typeof getSettingValue==="function"?getSettingValue("mgr_commission_default",ym+"-01"):null;
  if(d!==null&&!isNaN(d))return{rate:d,src:"за замовчуванням (Settings)"};
  return{rate:0,src:"ставка не задана"};
}
// Комісії всіх менеджерів за місяць
function mgrCommissions(ym){
  const rows=T.filter(t=>t.tp==="Доход"&&t.ym===ym&&t.mgr&&t.mgr!=="-"&&t.mgr!=="="&&t.mgr.trim());
  const by={};
  rows.forEach(t=>{
    const m=t.mgr.trim();if(!by[m])by[m]={mgr:m,sales:0,comm:0,fromCol:0,byRate:0,noRate:0,noRateSum:0,n:0,cust:{}};
    const b=by[m];const sale=t.nt;b.sales+=sale;b.n++;
    let comm,src,rate=null;
    if(t.com>0){comm=t.com;src="колонка commission"}else{const r=commRate(t,ym);rate=r.rate;src=r.src;comm=sale*r.rate/100;if(!r.rate){b.noRate++;b.noRateSum+=sale}}
    b.comm+=comm;if(t.com>0)b.fromCol+=comm;else b.byRate+=comm;
    const cn=t.alias||t.name||"(без назви)";if(!b.cust[cn])b.cust[cn]={sales:0,comm:0,n:0,src,rate};b.cust[cn].sales+=sale;b.cust[cn].comm+=comm;b.cust[cn].n++;
  });
  return Object.values(by).sort((a,b)=>b.comm-a.comm);
}
function _monthsWithIncome(){return[...new Set(T.filter(t=>t.tp==="Доход").map(t=>t.ym))].sort()}

// ---------- головний рендер ----------
function rSalary(f){
  const el=document.getElementById("t-salary");if(!el)return;
  const months=_monthsWithIncome();
  if(!_salYM||!months.includes(_salYM))_salYM=months[months.length-1]||"";
  const tabs=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">
    <div class="sh-tabs" style="margin:0">
      <button class="sh-tab ${_salView==="analytics"?"on":""}" onclick="_salView='analytics';render()">Аналітика виплат</button>
      <button class="sh-tab ${_salView==="managers"?"on":""}" onclick="_salView='managers';_salMgr=null;render()">Менеджери · комісії</button>
      <button class="sh-tab ${_salView==="ledger"?"on":""}" onclick="_salView='ledger';render()">Відомість</button>
    </div>
    ${_salView!=="analytics"?`<select class="flt" id="salYM">${months.slice().reverse().map(m=>`<option value="${m}" ${m===_salYM?"selected":""}>${ymLabel(m)}</option>`).join("")}</select>`:""}
  </div>`;
  const bind=()=>{const s=document.getElementById("salYM");if(s)s.onchange=e=>{_salYM=e.target.value;_salMgr=null;render()}};
  if(_salView==="managers"){rSalMgr(el,tabs);bind();return}
  if(_salView==="ledger"){rSalLedger(el,tabs);bind();return}
  rSalAnalytics(el,tabs,f);
}

// ---------- 1. Аналітика фактичних виплат (Dashboard_Data) ----------
function rSalAnalytics(el,tabs,f){
  const c$=cs(),sy=sY(f),py=pYr(sy);
  const isZP=t=>ZP.some(z=>t.cat.includes(z));
  const allZP=T.filter(t=>t.tp==="Расход"&&isZP(t));
  const yrZP=allZP.filter(t=>t.yr===sy),pyZP=allZP.filter(t=>t.yr===py);
  const totalYr=yrZP.reduce((s,t)=>s+Math.abs(t.amt),0),totalPy=pyZP.reduce((s,t)=>s+Math.abs(t.amt),0);
  const delta=totalPy>0?((totalYr-totalPy)/totalPy*100):0;
  const byCat={};yrZP.forEach(t=>{const c=t.cat;if(!byCat[c])byCat[c]={sum:0,cnt:0};byCat[c].sum+=Math.abs(t.amt);byCat[c].cnt++});
  const catArr=Object.entries(byCat).sort((a,b)=>b[1].sum-a[1].sum);
  const byCatPy={};pyZP.forEach(t=>{const c=t.cat;if(!byCatPy[c])byCatPy[c]={sum:0};byCatPy[c].sum+=Math.abs(t.amt)});
  const byMonth={};yrZP.forEach(t=>{byMonth[t.mm]=(byMonth[t.mm]||0)+Math.abs(t.amt)});
  const pyByMonth={};pyZP.forEach(t=>{pyByMonth[t.mm]=(pyByMonth[t.mm]||0)+Math.abs(t.amt)});
  const byPerson={};yrZP.forEach(t=>{let p=t.cat;if(p.startsWith("ЗП "))p=p.substring(3);if(p.startsWith("BW "))p=p.substring(3);if(!byPerson[p])byPerson[p]={sum:0,cnt:0,months:{}};byPerson[p].sum+=Math.abs(t.amt);byPerson[p].cnt++;byPerson[p].months[t.mm]=(byPerson[p].months[t.mm]||0)+Math.abs(t.amt)});
  const personArr=Object.entries(byPerson).sort((a,b)=>b[1].sum-a[1].sum);
  const revYr=T.filter(t=>t.yr===sy&&t.tp==="Доход"&&!isA(t)).reduce((s,t)=>s+t.nt,0);
  const staff=C1&&C1.staff?C1.staff:[];const activeStaff=staff.filter(s=>s.active==="true"||s.active===true);
  const monthsWithData=Object.keys(byMonth).length||1;const avgMonthly=totalYr/monthsWithData;

  el.innerHTML=`${tabs}
    <div class="sec">💼 Виплати ЗП · ${sy}</div>
    ${srcN([srcP(BK_MAIN()+" → Dashboard_Data — виписки, категорії «ЗП …» та «BW …»",maxD(allZP,t=>t.ym),"dd"),staff.length?srcP("1С: файл data/1c_staff.csv — співробітники","","c1"):""])}
    <div class="kpis">
      <div class="kpi"><div class="l">Виплачено за ${sy}</div><div class="v rd">${ff(toCur(totalYr))}${c$}</div><div class="s">${delta>0?"+":""}${delta.toFixed(0)}% vs ${py}</div></div>
      <div class="kpi"><div class="l">Сер./місяць</div><div class="v">${ff(toCur(avgMonthly))}${c$}</div><div class="s">${monthsWithData} міс з виплатами</div></div>
      <div class="kpi"><div class="l">% від виручки</div><div class="v" style="color:${revYr&&(totalYr/revYr*100)>30?"#ef4444":"#f59e0b"}">${revYr?(totalYr/revYr*100).toFixed(1):0}%</div></div>
      <div class="kpi"><div class="l">Категорій</div><div class="v">${catArr.length}</div></div>
      ${activeStaff.length?`<div class="kpi"><div class="l">Співробітників (1С)</div><div class="v">${activeStaff.length}</div><div class="s">з ${staff.length} всього</div></div>`:""}
    </div>
    <div class="cc"><h3>ЗП помісячно: ${sy} vs ${py}</h3><canvas id="cSalM" height="100"></canvas></div>
    <div class="row">
      <div class="cc"><h3>По категоріях${srcI("Dashboard_Data")}</h3>
        <table class="tbl"><tr><th>Категорія</th><th class="r">${sy}</th><th class="r">${py}</th><th class="r">Δ%</th><th class="r">% від ЗП</th></tr>
        ${catArr.map(([c,d])=>{const prev=byCatPy[c]?.sum||0;const chg=prev>0?((d.sum-prev)/prev*100):0;const pct=totalYr>0?(d.sum/totalYr*100):0;return`<tr class="click" onclick="drillGo(${drID({tp:"Расход",cat:c,yr:sy})})"><td style="font-size:9px">${esc(c)}</td><td class="r rd">${ff(toCur(d.sum))}${c$}</td><td class="r" style="color:#7d8196">${ff(toCur(prev))}${c$}</td><td class="r" style="color:${chg>10?"#ef4444":chg<-10?"#10b981":"#7d8196"}">${prev?((chg>0?"+":"")+chg.toFixed(0)+"%"):"—"}</td><td class="r">${pct.toFixed(1)}%</td></tr>`}).join("")}
        <tr class="tot"><td>Разом</td><td class="r rd">${ff(toCur(totalYr))}${c$}</td><td class="r" style="color:#7d8196">${ff(toCur(totalPy))}${c$}</td><td class="r">${delta>0?"+":""}${delta.toFixed(0)}%</td><td class="r">100%</td></tr></table></div>
      <div class="cc"><h3>Структура ЗП</h3><canvas id="cSalPie" height="160"></canvas></div>
    </div>
    <div class="cc"><h3>По підрозділах/особах</h3>
      <table class="tbl"><tr><th>Підрозділ/Особа</th><th class="r">Сума ${sy}</th><th class="r">Сер./міс</th><th class="r">Опер.</th></tr>
      ${personArr.map(([p,d])=>{const avgM=Object.keys(d.months).length?d.sum/Object.keys(d.months).length:0;return`<tr><td>${esc(p)}</td><td class="r rd">${ff(toCur(d.sum))}${c$}</td><td class="r">${ff(toCur(avgM))}${c$}</td><td class="r">${d.cnt}</td></tr>`}).join("")}</table></div>
    ${activeStaff.length?`<div class="cc"><h3>Співробітники (1С)${srcI("1c_staff.csv")}</h3><table class="tbl"><tr><th>ПІБ</th><th class="r">Актуальний</th><th class="r">В архіві</th></tr>
      ${activeStaff.map(s=>`<tr><td style="font-size:9px">${esc(s.name||"—")}</td><td class="r g">✓</td><td class="r">${s.archived==="true"?"так":"—"}</td></tr>`).join("")}</table></div>`:""}`;
  dc("cSalM");CH.cSalM=new Chart(document.getElementById("cSalM"),{type:"bar",data:{labels:MN,datasets:[{label:sy,data:MMa.map(m=>toCur(byMonth[m]||0)),backgroundColor:"#ef4444",borderRadius:2},{label:py,data:MMa.map(m=>toCur(pyByMonth[m]||0)),type:"line",borderColor:"#7d8196",borderDash:[5,3],pointRadius:3,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}]},
    options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  if(catArr.length){dc("cSalPie");CH.cSalPie=new Chart(document.getElementById("cSalPie"),{type:"doughnut",data:{labels:catArr.map(([c])=>c.substring(0,18)),datasets:[{data:catArr.map(([,d])=>toCur(d.sum)),backgroundColor:CC.concat(["#64748b","#0ea5e9","#d946ef","#84cc16"])}]},options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:8},boxWidth:8,padding:3}},tooltip:{callbacks:{label:ctx=>ctx.label+": "+ff(ctx.raw)+cs()}}}}})}
}

// ---------- 2. Менеджери: комісії за місяць ----------
function rSalMgr(el,tabs){
  const ym=_salYM;if(!ym){el.innerHTML=tabs+'<div class="info">Немає доходів у Dashboard_Data</div>';return}
  _wnByAlias=null;
  const arr=mgrCommissions(ym);
  const noMgr=T.filter(t=>t.tp==="Доход"&&t.ym===ym&&(!t.mgr||t.mgr==="-"||t.mgr==="="||!t.mgr.trim())&&CHS.includes(t.cat)&&t.cat!=="Доход, ФОП"&&t.cat!=="Доход, каса БВ");
  const noMgrSum=noMgr.reduce((s,t)=>s+t.nt,0);
  const totSales=arr.reduce((s,m)=>s+m.sales,0),totComm=arr.reduce((s,m)=>s+m.comm,0),totNoRate=arr.reduce((s,m)=>s+m.noRate,0);
  const src=srcN([srcP(BK_MAIN()+" → Dashboard_Data — доходи з менеджером, колонка commission",ym,"dd"),srcP("ставки клієнтів: workerNEW «Коміссія Фінальна» ("+BK_ACC()+")","","wn"),srcP("ставки менеджерів: лист Payroll (commission_pct)","","payroll")]);
  const legend=`<div style="font-size:9px;color:#7d8196;margin-bottom:8px">Комісія по операції = колонка <b>commission</b> у Dashboard_Data, якщо заповнена; інакше нетто × ставка: <b>клієнта</b> (workerNEW) → <b>менеджера</b> (Payroll commission_pct) → <b>mgr_commission_default</b> (Settings). Якщо ставки немає ніде — 0 і позначка «без ставки».</div>`;

  if(_salMgr){
    const m=arr.find(x=>x.mgr===_salMgr);
    if(!m){_salMgr=null;return rSalMgr(el,tabs)}
    const cust=Object.entries(m.cust).sort((a,b)=>b[1].comm-a[1].comm||b[1].sales-a[1].sales);
    el.innerHTML=`${tabs}${src}<button class="flt" style="margin-bottom:8px" onclick="_salMgr=null;render()">← Усі менеджери</button>
      <div class="kpis"><div class="kpi"><div class="l">${esc(m.mgr)} · ${ymLabel(ym)}</div><div class="v g">${ff(m.sales)}₴</div><div class="s">${m.n} операцій</div></div>
        <div class="kpi"><div class="l">Комісія</div><div class="v" style="color:#f59e0b">${ff(m.comm)}₴</div><div class="s">${m.sales?(m.comm/m.sales*100).toFixed(2):0}% ефективна</div></div>
        <div class="kpi"><div class="l">З колонки commission</div><div class="v">${ff(m.fromCol)}₴</div></div>
        <div class="kpi"><div class="l">Розраховано за ставкою</div><div class="v">${ff(m.byRate)}₴</div>${m.noRate?`<div class="s" style="color:#ef4444">${m.noRate} опер. без ставки (${ff(m.noRateSum)}₴)</div>`:""}</div></div>
      <div class="cc"><h3>По клієнтах · клік → транзакції</h3><table class="tbl"><tr><th>Клієнт</th><th class="r">Продажі</th><th class="r">Ставка</th><th>Джерело ставки</th><th class="r">Комісія</th><th class="r">Опер.</th></tr>
        ${cust.map(([n,d])=>`<tr class="click" onclick="drillGo(${drID({tp:"Доход",yr:ym.substring(0,4),mm:ym.substring(5,7),mgr:m.mgr,acc:n})})"><td style="font-size:10px">${esc(n.substring(0,32))}</td><td class="r g">${ff(d.sales)}₴</td><td class="r">${d.rate!==null&&d.rate!==undefined?d.rate+"%":"—"}</td><td style="font-size:9px;color:${d.src==="ставка не задана"?"#ef4444":"#7d8196"}">${esc(d.src)}</td><td class="r" style="color:#f59e0b">${ff(d.comm)}₴</td><td class="r">${d.n}</td></tr>`).join("")}
        <tr class="tot"><td>Разом</td><td class="r g">${ff(m.sales)}₴</td><td></td><td></td><td class="r" style="color:#f59e0b">${ff(m.comm)}₴</td><td class="r">${m.n}</td></tr></table></div>`;
    return;
  }
  el.innerHTML=`${tabs}${src}${legend}
    <div class="kpis">
      <div class="kpi"><div class="l">Продажі з менеджером · ${ymLabel(ym)}</div><div class="v g">${ff(totSales)}₴</div><div class="s">${arr.length} менеджерів</div></div>
      <div class="kpi"><div class="l">Комісії до нарахування</div><div class="v" style="color:#f59e0b">${ff(totComm)}₴</div><div class="s">${totSales?(totComm/totSales*100).toFixed(2):0}% від продажів</div></div>
      <div class="kpi"><div class="l">Без ставки</div><div class="v" style="color:${totNoRate?"#ef4444":"#10b981"}">${totNoRate}</div><div class="s">операцій</div></div>
      <div class="kpi" style="cursor:pointer" onclick="goTab('sales')"><div class="l">⚠ Без менеджера</div><div class="v" style="color:${noMgr.length?"#f59e0b":"#10b981"}">${ff(noMgrSum)}₴</div><div class="s">${noMgr.length} опер. → Продажі</div></div>
    </div>
    <div class="cc"><h3>Менеджери · ${ymLabel(ym)} <span class="srcnote-i">клік → по клієнтах</span><button class="flt" style="float:right;font-size:9px" onclick="exportMgrCommCSV()">Експорт CSV</button></h3>
      ${arr.length?`<table class="tbl"><tr><th>Менеджер</th><th class="r">Продажі (нетто)</th><th class="r">Комісія</th><th class="r">Ефект. %</th><th class="r">З колонки</th><th class="r">За ставкою</th><th class="r">Без ставки</th><th class="r">Опер.</th></tr>
      ${arr.map(m=>`<tr class="click" onclick="_salMgr='${m.mgr.replace(/\\/g,"\\\\").replace(/'/g,"\\'")}';render()"><td>${esc(m.mgr)}</td><td class="r g">${ff(m.sales)}₴</td><td class="r" style="color:#f59e0b;font-weight:600">${ff(m.comm)}₴</td><td class="r">${m.sales?(m.comm/m.sales*100).toFixed(2):0}%</td><td class="r" style="color:#7d8196">${ff(m.fromCol)}₴</td><td class="r" style="color:#7d8196">${ff(m.byRate)}₴</td><td class="r" style="color:${m.noRate?"#ef4444":"#7d8196"}">${m.noRate||"—"}</td><td class="r">${m.n}</td></tr>`).join("")}
      <tr class="tot"><td>Разом</td><td class="r g">${ff(totSales)}₴</td><td class="r" style="color:#f59e0b">${ff(totComm)}₴</td><td class="r">${totSales?(totComm/totSales*100).toFixed(2):0}%</td><td class="r">${ff(arr.reduce((s,m)=>s+m.fromCol,0))}₴</td><td class="r">${ff(arr.reduce((s,m)=>s+m.byRate,0))}₴</td><td class="r">${totNoRate||"—"}</td><td class="r">${arr.reduce((s,m)=>s+m.n,0)}</td></tr></table>`:'<div class="info">За цей місяць немає продажів із заповненим менеджером.</div>'}</div>
    <div class="cc"><h3>Комісії по місяцях (усі менеджери)</h3><canvas id="cSalComm" height="90"></canvas></div>`;
  window.exportMgrCommCSV=function(){exportCSV(`commissions_${ym}.csv`,["Менеджер","Продажі","Комісія","Ефект.%","З колонки","За ставкою","Без ставки","Операцій"],arr.map(m=>[m.mgr,m.sales.toFixed(0),m.comm.toFixed(0),m.sales?(m.comm/m.sales*100).toFixed(2):"0",m.fromCol.toFixed(0),m.byRate.toFixed(0),m.noRate,m.n]))};
  const months=_monthsWithIncome().slice(-12);const byM=months.map(m=>mgrCommissions(m).reduce((s,x)=>s+x.comm,0));
  dc("cSalComm");CH.cSalComm=new Chart(document.getElementById("cSalComm"),{type:"bar",data:{labels:months.map(ymLabel),datasets:[{data:byM,backgroundColor:"#f59e0b",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>ff(c.raw)+"₴"}}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

// ---------- 3. Відомість за місяць (Payroll + комісії + коригування vs факт) ----------
function toUAH(v,cur){return cur==="EUR"?v*FX.EUR:cur==="USD"?v*FX.USD:v}
function rSalLedger(el,tabs){
  const ym=_salYM;
  const src=srcN([srcP(BK_MAIN()+" → листи Payroll (оклади, ставки) та Payroll_Adj (бонуси/аванси)","","payroll"),srcP("Dashboard_Data — факт виплат за категоріями zp_category",ym,"dd")]);
  if(!PAYROLL.length){
    el.innerHTML=`${tabs}${src}<div class="cc"><h3>Відомість ЗП — потрібен лист Payroll</h3>
      <div class="info">Лист <b>Payroll</b> у книзі ${BK_MAIN()} ще не створено. Після створення відомість рахується автоматично: оклад + комісія менеджера + бонуси − аванси/утримання → до виплати, поруч — фактично виплачено з Dashboard_Data.</div>
      <div class="sec">Лист Payroll (один рядок на співробітника; нова версія окладу — новий рядок з date_from)</div>
      <pre class="md-code" style="font-size:9.5px">employee,role,manager_name,base,currency,commission_pct,zp_category,date_from,active,notes
Світлана,manager,Света,20000,UAH,5,BW Света,2026-01-01,true,менеджер HoReCa
Іван Петренко,staff,,18000,UAH,,ЗП Виноробня,2025-06-01,true,</pre>
      <ul class="md-list" style="font-size:10px;color:#c9ccd8;line-height:1.6">
        <li><b>role</b>: manager (рахується комісія) або staff</li>
        <li><b>manager_name</b>: точно як у колонці «менеджер» Dashboard_Data (щоб знайти продажі)</li>
        <li><b>commission_pct</b>: ставка менеджера у %, якщо для клієнта немає ставки у workerNEW</li>
        <li><b>zp_category</b>: категорія витрат у Dashboard_Data, куди записуються виплати цій людині (для порівняння план/факт)</li>
        <li><b>currency</b>: UAH / EUR / USD (перерахунок за курсом НБУ)</li>
      </ul>
      <div class="sec">Лист Payroll_Adj (опційно — бонуси, аванси, утримання)</div>
      <pre class="md-code" style="font-size:9.5px">employee,month,type,amount,note
Світлана,2026-04,bonus,3000,план виконано
Світлана,2026-04,advance,5000,аванс 15.04</pre>
      <div style="font-size:9px;color:#7d8196">type = bonus (+) | advance (−) | deduction (−)</div></div>`;
    return;
  }
  const comm=mgrCommissions(ym);const commBy={};comm.forEach(m=>commBy[m.mgr]=m);
  const emps=[...new Set(PAYROLL.map(r=>r.employee))];
  const rows=emps.map(e=>{
    const r=payrollRowFor(x=>x.employee===e,ym);if(!r||!r.active)return null;
    const base=toUAH(r.base,r.currency);
    const cm=r.role==="manager"?(commBy[r.manager]||commBy[r.employee]||null):null;
    const commission=cm?cm.comm:0;
    const adj=PAYROLL_ADJ.filter(a=>a.employee===e&&a.month===ym);
    const bonus=adj.filter(a=>a.type==="bonus").reduce((s,a)=>s+a.amount,0);
    const advance=adj.filter(a=>a.type==="advance").reduce((s,a)=>s+a.amount,0);
    const deduction=adj.filter(a=>a.type==="deduction").reduce((s,a)=>s+a.amount,0);
    const toPay=base+commission+bonus-advance-deduction;
    const paid=r.zpCat?T.filter(t=>t.tp==="Расход"&&t.ym===ym&&t.cat===r.zpCat).reduce((s,t)=>s+Math.abs(t.amt),0):null;
    return{e,r,base,commission,cm,bonus,advance,deduction,toPay,paid,adj};
  }).filter(Boolean).sort((a,b)=>b.toPay-a.toPay);
  const tot=k=>rows.reduce((s,x)=>s+(x[k]||0),0);
  const paidTot=rows.filter(x=>x.paid!==null).reduce((s,x)=>s+x.paid,0);
  el.innerHTML=`${tabs}${src}
    <div class="kpis">
      <div class="kpi"><div class="l">До виплати · ${ymLabel(ym)}</div><div class="v" style="color:#f59e0b">${ff(tot("toPay"))}₴</div><div class="s">${rows.length} співробітників</div></div>
      <div class="kpi"><div class="l">Оклади</div><div class="v">${ff(tot("base"))}₴</div></div>
      <div class="kpi"><div class="l">Комісії</div><div class="v" style="color:#f59e0b">${ff(tot("commission"))}₴</div></div>
      <div class="kpi"><div class="l">Бонуси − аванси</div><div class="v">${ff(tot("bonus")-tot("advance")-tot("deduction"))}₴</div></div>
      <div class="kpi"><div class="l">Фактично виплачено</div><div class="v ${paidTot>=tot("toPay")?"g":"rd"}">${ff(paidTot)}₴</div><div class="s">з Dashboard_Data (zp_category)</div></div>
    </div>
    <div class="cc"><h3>Відомість · ${ymLabel(ym)}<button class="flt" style="float:right;font-size:9px" onclick="exportLedgerCSV()">Експорт CSV</button></h3>
      <div class="tbl-wrap"><table class="tbl"><tr><th>Співробітник</th><th>Роль</th><th class="r">Оклад</th><th class="r">Комісія</th><th class="r">Бонус</th><th class="r">Аванс/утрим.</th><th class="r">До виплати</th><th class="r">Виплачено</th><th class="r">Різниця</th></tr>
      ${rows.map(x=>{const diff=x.paid!==null?x.paid-x.toPay:null;return`<tr>
        <td style="font-size:10px"><b>${esc(x.e)}</b>${x.r.notes?`<div style="font-size:8px;color:#7d8196">${esc(x.r.notes)}</div>`:""}</td>
        <td style="font-size:9px;color:#7d8196">${x.r.role}${x.r.role==="manager"&&x.r.manager?` · ${esc(x.r.manager)}`:""}</td>
        <td class="r">${ff(x.base)}₴${x.r.currency!=="UAH"?`<div style="font-size:8px;color:#7d8196">${ff(x.r.base)} ${x.r.currency}</div>`:""}</td>
        <td class="r" style="color:#f59e0b">${x.r.role==="manager"?(x.cm?ff(x.commission)+"₴":'<span style="color:#7d8196" title="немає продажів з таким менеджером за місяць">0</span>'):"—"}${x.cm&&x.cm.noRate?`<div style="font-size:8px;color:#ef4444">${x.cm.noRate} без ставки</div>`:""}</td>
        <td class="r g">${x.bonus?ff(x.bonus)+"₴":"—"}</td>
        <td class="r rd">${x.advance+x.deduction?ff(x.advance+x.deduction)+"₴":"—"}</td>
        <td class="r" style="font-weight:700">${ff(x.toPay)}₴</td>
        <td class="r">${x.paid!==null?ff(x.paid)+"₴":'<span style="color:#7d8196" title="не задано zp_category">—</span>'}</td>
        <td class="r" style="color:${diff===null?"#7d8196":Math.abs(diff)<1?"#10b981":diff<0?"#ef4444":"#f59e0b"}">${diff===null?"—":(diff>0?"+":"")+ff(diff)+"₴"}</td></tr>`}).join("")}
      <tr class="tot"><td>Разом</td><td></td><td class="r">${ff(tot("base"))}₴</td><td class="r" style="color:#f59e0b">${ff(tot("commission"))}₴</td><td class="r g">${ff(tot("bonus"))}₴</td><td class="r rd">${ff(tot("advance")+tot("deduction"))}₴</td><td class="r">${ff(tot("toPay"))}₴</td><td class="r">${ff(paidTot)}₴</td><td class="r">${ff(paidTot-tot("toPay"))}₴</td></tr></table></div>
      <div style="font-size:9px;color:#7d8196;margin-top:6px">Оклад — рядок Payroll з найпізнішим date_from ≤ кінця місяця. Комісія — з вкладки «Менеджери · комісії». Виплачено — витрати Dashboard_Data за місяць у категорії zp_category.</div></div>
    ${rows.some(x=>x.adj.length)?`<div class="cc"><h3>Коригування за місяць (Payroll_Adj)</h3><table class="tbl"><tr><th>Співробітник</th><th>Тип</th><th class="r">Сума</th><th>Примітка</th></tr>${rows.flatMap(x=>x.adj.map(a=>`<tr><td>${esc(x.e)}</td><td style="color:${a.type==="bonus"?"#10b981":"#ef4444"}">${a.type}</td><td class="r">${ff(a.amount)}₴</td><td style="font-size:9px;color:#7d8196">${esc(a.note)}</td></tr>`)).join("")}</table></div>`:""}`;
  window.exportLedgerCSV=function(){exportCSV(`payroll_${ym}.csv`,["Співробітник","Роль","Оклад","Комісія","Бонус","Аванс/утримання","До виплати","Виплачено","Різниця"],rows.map(x=>[x.e,x.r.role,x.base.toFixed(0),x.commission.toFixed(0),x.bonus.toFixed(0),(x.advance+x.deduction).toFixed(0),x.toPay.toFixed(0),x.paid!==null?x.paid.toFixed(0):"",x.paid!==null?(x.paid-x.toPay).toFixed(0):""]))};
}
