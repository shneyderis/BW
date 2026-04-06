// js/tabs/settings.js — Settings tab
function rSettings(){
  const el=document.getElementById("t-settings");
  // Group settings by key
  let settingsHTML="";
  if(SETTINGS.length){
    const byKey={};
    SETTINGS.forEach(s=>{if(!byKey[s.setting_key])byKey[s.setting_key]=[];byKey[s.setting_key].push(s)});
    const keys=Object.keys(byKey).sort();
    settingsHTML=`<div class="cc"><h3>Настройки з Google Sheet</h3>
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
  el.innerHTML=`
    <div class="cc"><h3>Настройки ФОП (магазин)</h3><table class="tbl">
      <tr><td>Единый налог %</td><td class="r"><input type="number" value="${SETS.fopTax}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopTax=parseFloat(this.value);render()"></td></tr>
      <tr><td>Банк комиссия %</td><td class="r"><input type="number" value="${SETS.fopBank}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopBank=parseFloat(this.value);render()"></td></tr>
    </table></div>
    ${settingsHTML}
    <div class="cc"><h3>Курсы НБУ</h3><p style="font-size:11px">€1 = ${FX.EUR.toFixed(4)} ₴ · $1 = ${FX.USD.toFixed(4)} ₴</p></div>
    <div class="cc"><h3>Джерела даних</h3><p style="font-size:10px;color:#7d8196">Google Sheet: ${SID}<br>Баланси: PRIVAT_BALANCES (BW_Accounts)<br>Склад: Stock_Data (${SD.length}) + 3_Stock (${SK.length})<br>WC замовлень: ${WO.length}, товарів: ${WP.length}<br>IG постів: ${IG.posts.length}, Meta Ads: ${MA.campaigns.length}<br>Settings: ${SETTINGS.length} записів</p></div>`;
}
