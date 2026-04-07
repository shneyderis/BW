// js/tabs/settings.js — Settings tab with role/permissions management

const ALL_TABS=[
  {id:"pl",label:"P&L",icon:"📊"},
  {id:"sales",label:"Продажі",icon:"💰"},
  {id:"exp",label:"Витрати",icon:"📉"},
  {id:"assets",label:"Осн.фонди",icon:"🏭"},
  {id:"shop",label:"Магазин",icon:"🛒"},
  {id:"stock",label:"Склад",icon:"📦"},
  {id:"cash",label:"Кеш-фло",icon:"💵"},
  {id:"mkt",label:"Маркетинг",icon:"📣"},
  {id:"partners",label:"Партнери",icon:"🤝"},
  {id:"unrec",label:"Нерозпізнані",icon:"⚠️"},
  {id:"settings",label:"Налаштування",icon:"⚙"}
];

function rSettings(){
  const el=document.getElementById("t-settings");
  const isOwner=currentRole==="owner";

  // Group settings by key
  let settingsHTML="";
  if(SETTINGS.length){
    const byKey={};
    SETTINGS.forEach(s=>{if(!byKey[s.setting_key])byKey[s.setting_key]=[];byKey[s.setting_key].push(s)});
    const keys=Object.keys(byKey).sort();
    settingsHTML=`<div class="cc"><h3>Налаштування з Google Sheet</h3>
      ${keys.map(k=>{
        const rows=byKey[k].sort((a,b)=>(b.date_from||"").localeCompare(a.date_from||""));
        const cur=rows[0];
        const hist=rows.length>1?rows.slice(1):[];
        return`<div style="margin-bottom:10px;padding:8px;background:#0c0e13;border-radius:5px;border:1px solid #232738">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${hist.length?4:0}px">
            <span style="font-weight:600;font-size:11px">${k}</span>
            <span style="font-size:13px;font-weight:700;color:#10b981">${cur.value}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:#7d8196">
            <span>${cur.description||""}</span>
            <span>з ${cur.date_from||"—"}</span>
          </div>
          ${hist.length?`<div style="margin-top:4px;padding-top:4px;border-top:1px solid #232738">
            <div style="font-size:8px;color:#7d8196;margin-bottom:2px">Історія змін:</div>
            ${hist.map(h=>`<div style="display:flex;justify-content:space-between;font-size:9px;color:#7d8196;padding:1px 0">
              <span>${h.date_from||"—"}</span><span>${h.value}</span>
            </div>`).join("")}
          </div>`:""}
        </div>`}).join("")}
    </div>`;
  }

  // Roles & permissions
  const rolesHTML=`<div class="cc"><h3>Ролі та доступ</h3>
    <table class="tbl">
      <tr>
        <th>Вкладка</th>
        ${Object.keys(ROLES).map(r=>`<th class="r" style="text-transform:capitalize">${r}</th>`).join("")}
      </tr>
      ${ALL_TABS.map(t=>`<tr>
        <td>${t.icon} ${t.label}</td>
        ${Object.entries(ROLES).map(([role,cfg])=>{
          const has=cfg.tabs.includes(t.id);
          const chkId="perm_"+role+"_"+t.id;
          if(isOwner){
            return`<td class="r"><input type="checkbox" id="${chkId}" ${has?"checked":""} onchange="togglePerm('${role}','${t.id}',this.checked)" style="accent-color:#9f1239"></td>`;
          }
          return`<td class="r" style="color:${has?"#10b981":"#7d8196"}">${has?"✓":"—"}</td>`;
        }).join("")}
      </tr>`).join("")}
    </table>
    ${isOwner?`<div style="margin-top:8px;font-size:9px;color:#7d8196">Натисніть на чекбокс щоб змінити доступ. Зміни діють до перезавантаження сторінки.</div>
    <button class="flt" style="margin-top:6px" onclick="resetPerms()">Скинути до стандартних</button>`
    :`<div style="margin-top:6px;font-size:9px;color:#7d8196">Тільки owner може змінювати права доступу.</div>`}
  </div>`;

  // Passwords (only for owner)
  const pwHTML=isOwner?`<div class="cc"><h3>Паролі</h3>
    <table class="tbl">
      <tr><th>Роль</th><th>Пароль</th><th class="r">Вкладок</th></tr>
      ${Object.entries(ROLES).map(([role,cfg])=>`<tr>
        <td style="font-weight:600;text-transform:capitalize">${role}</td>
        <td><input type="text" value="${cfg.password}" style="width:120px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="ROLES['${role}'].password=this.value"></td>
        <td class="r">${cfg.tabs.length}</td>
      </tr>`).join("")}
    </table>
    <div style="margin-top:6px;font-size:9px;color:#f59e0b">⚠ Паролі зберігаються в коді (config.js). Для збереження змін потрібен коміт.</div>
  </div>`:"";

  // Data sources
  const srcHTML=`<div class="cc"><h3>Джерела даних</h3>
    <table class="tbl">
      <tr><th>Джерело</th><th class="r">Записів</th><th class="r">Статус</th></tr>
      <tr><td>Dashboard_Data</td><td class="r">${ff(T.length)}</td><td class="r g">✓</td></tr>
      <tr><td>Баланси (PRIVAT_BALANCES)</td><td class="r">${BL.length}</td><td class="r ${BL.length?"g":"rd"}">${BL.length?"✓":"—"}</td></tr>
      <tr><td>3_Stock / Stock_Data</td><td class="r">${SK.length||SD.length}</td><td class="r ${SK.length||SD.length?"g":"rd"}">${SK.length||SD.length?"✓":"—"}</td></tr>
      <tr><td>WC замовлення (Sheets)</td><td class="r">${WO.length}</td><td class="r ${WO.length?"g":"rd"}">${WO.length?"✓":"—"}</td></tr>
      <tr><td>WC товари (Sheets)</td><td class="r">${WP.length}</td><td class="r ${WP.length?"g":"rd"}">${WP.length?"✓":"—"}</td></tr>
      <tr><td>SP кампанії</td><td class="r">${(SP.campaigns||[]).length}</td><td class="r g">✓</td></tr>
      <tr><td>IG пости</td><td class="r">${IG.posts.length}</td><td class="r ${IG.posts.length?"g":""}">${IG.posts.length?"✓":"очікує токен"}</td></tr>
      <tr><td>Meta Ads</td><td class="r">${MA.campaigns.length}</td><td class="r ${MA.campaigns.length?"g":""}">${MA.campaigns.length?"✓":"очікує токен"}</td></tr>
      <tr><td>1С Продажі</td><td class="r">${ff(C1.sales.length)}</td><td class="r ${C1.sales.length?"g":"rd"}">${C1.sales.length?"✓":"—"}</td></tr>
      <tr><td>1С Контрагенти</td><td class="r">${C1.partners.length}</td><td class="r ${C1.partners.length?"g":"rd"}">${C1.partners.length?"✓":"—"}</td></tr>
      <tr><td>1С Банк</td><td class="r">${ff((C1.bank||[]).length)}</td><td class="r ${(C1.bank||[]).length?"g":"rd"}">${(C1.bank||[]).length?"✓":"—"}</td></tr>
      <tr><td>1С Номенклатура</td><td class="r">${C1.products.length}</td><td class="r ${C1.products.length?"g":"rd"}">${C1.products.length?"✓":"—"}</td></tr>
      <tr><td>Settings</td><td class="r">${SETTINGS.length}</td><td class="r g">✓</td></tr>
    </table></div>`;

  el.innerHTML=`
    <div class="cc"><h3>Налаштування ФОП (магазин)</h3><table class="tbl">
      <tr><td>Єдиний податок %</td><td class="r"><input type="number" value="${SETS.fopTax}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopTax=parseFloat(this.value);render()"></td></tr>
      <tr><td>Банк комісія %</td><td class="r"><input type="number" value="${SETS.fopBank}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopBank=parseFloat(this.value);render()"></td></tr>
    </table></div>
    ${rolesHTML}
    ${pwHTML}
    ${settingsHTML}
    <div class="cc"><h3>Курси НБУ</h3><p style="font-size:11px">€1 = ${FX.EUR.toFixed(4)} ₴ · $1 = ${FX.USD.toFixed(4)} ₴</p></div>
    ${srcHTML}
    <div class="cc"><h3>Поточна сесія</h3>
      <p style="font-size:10px;color:#7d8196">Роль: <b style="color:#e4e5ea">${currentRole}</b> · Таймаут: 30 хв неактивності</p>
      <button class="flt" style="margin-top:4px" onclick="doLogout()">Вийти</button>
    </div>`;
}

// Toggle permission for a role
window.togglePerm=function(role,tabId,enabled){
  if(!ROLES[role])return;
  const tabs=ROLES[role].tabs;
  if(enabled&&!tabs.includes(tabId)){
    tabs.push(tabId);
  }else if(!enabled){
    ROLES[role].tabs=tabs.filter(t=>t!==tabId);
  }
  // Re-apply current user's tabs if their role changed
  if(role===currentRole){
    document.querySelectorAll('.tab').forEach(btn=>{
      const id=btn.getAttribute('onclick')?.match(/sw\('(\w+)'/)?.[1];
      if(id)btn.classList.toggle("hidden",!ROLES[currentRole].tabs.includes(id));
    });
  }
  render();
};

// Reset to defaults
window.resetPerms=function(){
  ROLES.owner.tabs=["pl","sales","exp","assets","shop","stock","cash","mkt","partners","unrec","settings"];
  ROLES.manager.tabs=["sales","shop","stock","mkt"];
  ROLES.accountant.tabs=["pl","exp","assets","cash","partners","unrec"];
  render();
};
