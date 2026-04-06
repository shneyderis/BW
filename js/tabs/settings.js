// js/tabs/settings.js — Settings tab
function rSettings(){
  const el=document.getElementById("t-settings");
  // Show settings from Google Sheet if loaded
  const settingsRows=SETTINGS.length?SETTINGS.map(s=>`<tr><td>${s.setting_key}</td><td class="r">${s.value}</td><td class="r" style="color:#7d8196">${s.date_from}</td><td style="color:#7d8196;font-size:9px">${s.description}</td></tr>`).join(""):"";
  el.innerHTML=`
    <div class="cc"><h3>Настройки ФОП (магазин)</h3><table class="tbl">
      <tr><td>Единый налог %</td><td class="r"><input type="number" value="${SETS.fopTax}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopTax=parseFloat(this.value);render()"></td></tr>
      <tr><td>Банк комиссия %</td><td class="r"><input type="number" value="${SETS.fopBank}" step="0.5" style="width:55px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:2px 5px;border-radius:3px;font-family:inherit;font-size:11px" onchange="SETS.fopBank=parseFloat(this.value);render()"></td></tr>
    </table></div>
    ${SETTINGS.length?`<div class="cc"><h3>Настройки из Google Sheet</h3><table class="tbl"><tr><th>Ключ</th><th class="r">Значение</th><th class="r">Дата с</th><th>Описание</th></tr>${settingsRows}</table></div>`:""}
    <div class="cc"><h3>Курсы НБУ</h3><p style="font-size:11px">€1 = ${FX.EUR.toFixed(4)} ₴ · $1 = ${FX.USD.toFixed(4)} ₴</p></div>
    <div class="cc"><h3>Источники данных</h3><p style="font-size:10px;color:#7d8196">Google Sheet: ${SID}<br>Балансы: PRIVAT_BALANCES (BW_Accounts)<br>Склад: Stock_Data (${SD.length}) + 3_Stock (${SK.length})<br>WooCommerce: ${WO.length} заказов, ${WP.length} товаров<br>Settings: ${SETTINGS.length} записей</p></div>
    <div class="cc"><h3>Кэш WC</h3><button class="flt" onclick="localStorage.removeItem('bw_wc_cache');location.reload()">Сбросить кэш WC</button></div>`;
}
