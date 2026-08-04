// js/tabs/salary.js — Salary/Payroll tab

function rSalary(f){
  const el=document.getElementById("t-salary");if(!el)return;
  const c$=cs(),sy=sY(f),py=pYr(sy);

  // ZP categories from app.js
  const zpCats=["ЗП менеджерів","ЗП Виноградник","ЗП Виноробня","ЗП Готель","ЗП Цибак","BW Света","BW Наташа","BW Таня"];
  const isZP=t=>zpCats.some(z=>t.cat.includes(z));

  // All salary transactions
  const allZP=T.filter(t=>t.tp==="Расход"&&isZP(t));
  const yrZP=allZP.filter(t=>t.yr===sy);
  const pyZP=allZP.filter(t=>t.yr===py);
  const totalYr=yrZP.reduce((s,t)=>s+Math.abs(t.amt),0);
  const totalPy=pyZP.reduce((s,t)=>s+Math.abs(t.amt),0);
  const delta=totalPy>0?((totalYr-totalPy)/totalPy*100):0;

  // By category
  const byCat={};
  yrZP.forEach(t=>{const c=t.cat;if(!byCat[c])byCat[c]={sum:0,cnt:0};byCat[c].sum+=Math.abs(t.amt);byCat[c].cnt++});
  const catArr=Object.entries(byCat).sort((a,b)=>b[1].sum-a[1].sum);

  // Previous year by category
  const byCatPy={};
  pyZP.forEach(t=>{const c=t.cat;if(!byCatPy[c])byCatPy[c]={sum:0};byCatPy[c].sum+=Math.abs(t.amt)});

  // By month
  const byMonth={};
  yrZP.forEach(t=>{if(!byMonth[t.mm])byMonth[t.mm]=0;byMonth[t.mm]+=Math.abs(t.amt)});
  const pyByMonth={};
  pyZP.forEach(t=>{if(!pyByMonth[t.mm])pyByMonth[t.mm]=0;pyByMonth[t.mm]+=Math.abs(t.amt)});

  // By person (named categories like "BW Света")
  const byPerson={};
  yrZP.forEach(t=>{
    let person=t.cat;
    if(person.startsWith("ЗП "))person=person.substring(3);
    if(person.startsWith("BW "))person=person.substring(3);
    if(!byPerson[person])byPerson[person]={sum:0,cnt:0,months:{}};
    byPerson[person].sum+=Math.abs(t.amt);byPerson[person].cnt++;
    byPerson[person].months[t.mm]=(byPerson[person].months[t.mm]||0)+Math.abs(t.amt);
  });
  const personArr=Object.entries(byPerson).sort((a,b)=>b[1].sum-a[1].sum);

  // Revenue for % calculation
  const revYr=T.filter(t=>t.yr===sy&&t.tp==="Доход"&&!isA(t)).reduce((s,t)=>s+t.nt,0);

  // Staff from 1C
  const staff=C1&&C1.staff?C1.staff:[];
  const activeStaff=staff.filter(s=>s.active==="true"||s.active===true);

  // Average monthly salary
  const monthsWithData=Object.keys(byMonth).length||1;
  const avgMonthly=totalYr/monthsWithData;

  el.innerHTML=`
    <div class="sec">💼 Зарплати · ${sy}</div>
    ${srcN([srcP("Dashboard_Data — виписки, категорії «ЗП …» та «BW …»",maxD(allZP,t=>t.ym)),staff.length?srcP("1С → співробітники (1c_staff.csv)"):""])}
    <div class="kpis">
      <div class="kpi"><div class="l">ФОП за ${sy}</div><div class="v rd">${ff(toCur(totalYr))}${c$}</div><div class="s">${delta>0?"+":""}${delta.toFixed(0)}% vs ${py}</div></div>
      <div class="kpi"><div class="l">Сер./місяць</div><div class="v">${ff(toCur(avgMonthly))}${c$}</div></div>
      <div class="kpi"><div class="l">% від виручки</div><div class="v" style="color:${revYr&&(totalYr/revYr*100)>30?"#ef4444":"#f59e0b"}">${revYr?(totalYr/revYr*100).toFixed(1):0}%</div></div>
      <div class="kpi"><div class="l">Категорій</div><div class="v">${catArr.length}</div></div>
      ${activeStaff.length?`<div class="kpi"><div class="l">Співробітників (1С)</div><div class="v">${activeStaff.length}</div><div class="s">з ${staff.length} всього</div></div>`:""}
    </div>

    <div class="cc"><h3>ЗП помісячно: ${sy} vs ${py}</h3><canvas id="cSalM" height="100"></canvas></div>

    <div class="row">
      <div class="cc"><h3>По категоріях${srcI("Dashboard_Data")}</h3>
        <table class="tbl"><tr><th>Категорія</th><th class="r">${sy}</th><th class="r">${py}</th><th class="r">Δ%</th><th class="r">% від ЗП</th></tr>
        ${catArr.map(([c,d])=>{const prev=byCatPy[c]?.sum||0;const chg=prev>0?((d.sum-prev)/prev*100):0;const pct=totalYr>0?(d.sum/totalYr*100):0;return`<tr>
          <td style="font-size:9px">${c}</td>
          <td class="r rd">${ff(toCur(d.sum))}${c$}</td>
          <td class="r" style="color:#7d8196">${ff(toCur(prev))}${c$}</td>
          <td class="r" style="color:${chg>10?"#ef4444":chg<-10?"#10b981":"#7d8196"}">${prev?((chg>0?"+":"")+chg.toFixed(0)+"%"):"—"}</td>
          <td class="r">${pct.toFixed(1)}%</td>
        </tr>`}).join("")}
        <tr class="tot"><td>Разом</td><td class="r rd">${ff(toCur(totalYr))}${c$}</td><td class="r" style="color:#7d8196">${ff(toCur(totalPy))}${c$}</td><td class="r">${delta>0?"+":""}${delta.toFixed(0)}%</td><td class="r">100%</td></tr>
        </table></div>
      <div class="cc"><h3>Структура ЗП</h3><canvas id="cSalPie" height="160"></canvas></div>
    </div>

    <div class="cc"><h3>По підрозділах/особах</h3>
      <table class="tbl"><tr><th>Підрозділ/Особа</th><th class="r">Сума ${sy}</th><th class="r">Сер./міс</th><th class="r">Опер.</th></tr>
      ${personArr.map(([p,d])=>{const avgM=Object.keys(d.months).length?d.sum/Object.keys(d.months).length:0;return`<tr>
        <td>${p}</td>
        <td class="r rd">${ff(toCur(d.sum))}${c$}</td>
        <td class="r">${ff(toCur(avgM))}${c$}</td>
        <td class="r">${d.cnt}</td>
      </tr>`}).join("")}
      </table></div>

    ${activeStaff.length?`<div class="cc"><h3>Співробітники (1С)${srcI("1c_staff.csv")}</h3>
      <table class="tbl"><tr><th>ПІБ</th><th class="r">Актуальний</th><th class="r">В архіві</th></tr>
      ${activeStaff.map(s=>`<tr>
        <td style="font-size:9px">${s.name||"—"}</td>
        <td class="r g">✓</td>
        <td class="r">${s.archived?"так":"—"}</td>
      </tr>`).join("")}
      </table></div>`:""}
  `;

  // Charts
  dc("cSalM");CH.cSalM=new Chart(document.getElementById("cSalM"),{type:"bar",
    data:{labels:MN,datasets:[
      {label:sy,data:MMa.map(m=>toCur(byMonth[m]||0)),backgroundColor:"#ef4444",borderRadius:2},
      {label:py,data:MMa.map(m=>toCur(pyByMonth[m]||0)),type:"line",borderColor:"#7d8196",borderDash:[5,3],pointRadius:3,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}
    ]},
    options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});

  if(catArr.length){
    dc("cSalPie");CH.cSalPie=new Chart(document.getElementById("cSalPie"),{type:"doughnut",
      data:{labels:catArr.map(([c])=>c.substring(0,18)),datasets:[{data:catArr.map(([,d])=>toCur(d.sum)),backgroundColor:CC.concat(["#64748b","#0ea5e9","#d946ef","#84cc16"])}]},
      options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:8},boxWidth:8,padding:3}},tooltip:{callbacks:{label:ctx=>ctx.label+": "+ff(ctx.raw)+cs()}}}}});
  }
}
