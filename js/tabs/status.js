// js/tabs/status.js — 📋 Статус: задачі, стан джерел, стан проєкту (STATUS.md), останній звіт, білд.
let _stMd=null,_stRep=null,_stLoading=false;
async function loadStatusDocs(){
  if(_stLoading)return;_stLoading=true;
  try{const r=await fetch("STATUS.md?t="+Date.now());_stMd=r.ok?await r.text():"";}catch(e){_stMd=""}
  try{const r=await fetch("reports/latest.md?t="+Date.now());_stRep=r.ok?await r.text():"";}catch(e){_stRep=""}
  rStatus();
}
function rStatus(){
  const el=document.getElementById("t-status");if(!el)return;
  if(_stMd===null&&!_stLoading)loadStatusDocs();
  const b=typeof BUILD!=="undefined"?BUILD:{date:"?",note:""};
  const nowStr=HEALTH.computedAt?HEALTH.computedAt.toLocaleString("uk-UA"):"—";
  const secDone=_stMd?mdSection(_stMd,"Зараз"):"";
  const secWait=_stMd?mdSection(_stMd,"Очікує"):"";
  const secNext=_stMd?mdSection(_stMd,"Далі"):"";
  const secBugs=_stMd?mdSection(_stMd,"Відомі проблеми"):"";
  const secLog=_stMd?mdSection(_stMd,"Журнал змін"):"";
  el.innerHTML=`
    <div class="sec">📋 Статус · дані та проєкт</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Задач</div><div class="v" style="color:${(HEALTH.tasks||[]).some(t=>t.pri==="high")?"#ef4444":(HEALTH.tasks||[]).length?"#f59e0b":"#10b981"}">${(HEALTH.tasks||[]).length}</div><div class="s">${(HEALTH.tasks||[]).filter(t=>t.pri==="high").length} термінових</div></div>
      <div class="kpi"><div class="l">Джерела ✓</div><div class="v g">${HEALTH.counts.ok||0}</div><div class="s">з ${HEALTH.list.length}</div></div>
      <div class="kpi"><div class="l">Застаріло / помилки</div><div class="v rd">${(HEALTH.counts.stale||0)+(HEALTH.counts.error||0)+(HEALTH.counts.missing||0)}</div><div class="s">⚠ ${HEALTH.counts.warn||0} застаріває</div></div>
      <div class="kpi"><div class="l">Версія дашборду</div><div class="v" style="font-size:14px">${esc(b.date)}</div><div class="s" title="${esc(b.note)}">${esc((b.note||"").substring(0,40))}${(b.note||"").length>40?"…":""}</div></div>
    </div>
    <div style="font-size:9px;color:#7d8196;margin:-4px 0 8px">Перевірено ${nowStr} · <a href="#" onclick="healthCompute();render();return false" style="color:#7d8196">перерахувати</a> · <a href="#" onclick="location.reload();return false" style="color:#7d8196">перезавантажити дані</a></div>
    ${healthTasksHTML({open:true})}
    ${healthTableHTML()}
    ${SYNC_LOG.length?`<div class="cc"><h3>Sync_Log — останні запуски${srcI("BW_Looker_Data → Sync_Log")}</h3><table class="tbl"><tr><th>Джерело</th><th>Результат</th><th class="r">Коли</th></tr>
      ${(()=>{const seen=new Set();return SYNC_LOG.slice().sort((a,b)=>(b.d?b.d.getTime():0)-(a.d?a.d.getTime():0)).filter(r=>{if(seen.has(r.source))return false;seen.add(r.source);return true}).map(r=>`<tr><td style="font-size:9px">${esc(r.source)}</td><td style="font-size:9px;color:${/^ERROR/i.test(r.result)?"#ef4444":"#10b981"}">${esc(r.result.substring(0,70))}</td><td class="r" style="font-size:9px;color:#7d8196">${r.iso||esc(r.ts)} · ${agoStr(r.d)}</td></tr>`).join("")})()}</table></div>`:
      `<div class="info">Лист Sync_Log не прочитано — стан автоматичних синхронізацій невідомий. Перевірте, що лист існує в BW_Looker_Data і доступний за посиланням.</div>`}
    <div class="row">
      <div class="cc md"><h3>Стан проєкту <span class="srcnote-i"><a href="${ghFile("STATUS.md")}" target="_blank" rel="noopener">STATUS.md ↗</a></span></h3>${_stMd===null?'<div class="info">⏳</div>':_stMd?mdToHtml(secDone||_stMd.substring(0,3000)):'<div class="info">STATUS.md не знайдено</div>'}${secWait?`<h3 style="margin-top:10px;color:#f59e0b">Очікує від власника</h3>${mdToHtml(secWait)}`:""}</div>
      <div class="cc md"><h3>Далі за планом</h3>${secNext?mdToHtml(secNext):'<div style="font-size:10px;color:#7d8196">— секція «Далі» у STATUS.md порожня</div>'}
        ${secBugs?`<h3 style="margin-top:10px">Відомі проблеми</h3>${mdToHtml(secBugs)}`:""}</div>
    </div>
    ${secLog?`<div class="cc md"><h3>Журнал змін</h3>${mdToHtml(secLog)}</div>`:""}
    <div class="cc md"><h3>Останній аналіз даних <span class="srcnote-i"><a href="${ghFile("reports/latest.md")}" target="_blank" rel="noopener">reports/latest.md ↗</a></span></h3>
      ${_stRep===null?'<div class="info">⏳</div>':_stRep?mdToHtml(_stRep):'<div style="font-size:10px;color:#7d8196">Звіту ще немає. Як отримати: <code>python3 tools/pull_sheets.py</code> → <code>python3 tools/analyze.py</code> → commit (або попросити Claude зробити аналіз).</div>'}</div>
  `;
}
