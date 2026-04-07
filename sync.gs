/**
 * Beykush Winery — Data Sync to Google Sheets v4
 * SendPulse + WooCommerce + Meta/Instagram + Facebook
 */

const CONFIG = {
  SP_APIKEY: 'sp_apikey_d946cffb25603f31e60a035793c33da83a21328418b2d5d63a4bb5056022a70c',
  SP_BASE: 'https://api.sendpulse.com',
  WC_BASE: 'https://beykush.com/wp-json/wc/v3',
  WC_KEY: 'ck_5b87215529858139d17b602945170ae4d9c8adbd',
  WC_SECRET: 'cs_3ad054a505185162e849a92bf019979e6c037c93',
  SPREADSHEET_ID: '1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ',
  META_TOKEN: 'EAAM1ECaLsGgBRHNGnpf5RFWFu8jDZB8SoV2Eil0fyCNz06mSzAhTpf1QOeHaoHKIg3GRl0lFyx4dNiZCaJhIsBbRnZBzfkIGIZBHVLs7xnAfVZAB26tmxSjRE65gu0PnREmza6mgABJtZAaMZC7HU3iarXc9LT9sIFv2ZBBZCRA54RI6J7hBNsX4ztsVBXNQSpZCgKuqEEKgLvEuNI7h9rRhlZCptA8fiZCebazya0km5Y8ZAiZCvgZAhsYnWYXeInyjwRGec3vmzyqibZCU4NnZClpw4iohUuUEz',
  IG_ACCOUNT_ID: '17841400059003944',
  META_PAGE_ID: '160594843975804',
  META_AD_ACCOUNT_ID: 'act_359511770',
};

// ============================================================
// MAIN SYNC FUNCTIONS
// ============================================================

function syncAll() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const log = [];
  try { log.push(['SendPulse Lists', syncSPLists(ss), new Date()]); } catch(e) { log.push(['SendPulse Lists', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['SendPulse Campaigns', syncSPCampaigns(ss), new Date()]); } catch(e) { log.push(['SendPulse Campaigns', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['WC Orders', syncWCOrders(ss), new Date()]); } catch(e) { log.push(['WC Orders', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['WC Products', syncWCProducts(ss), new Date()]); } catch(e) { log.push(['WC Products', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['IG Posts', syncIGPosts(ss), new Date()]); } catch(e) { log.push(['IG Posts', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['FB Posts', syncFBPosts(ss), new Date()]); } catch(e) { log.push(['FB Posts', 'ERROR: ' + e.message, new Date()]); }
  try { log.push(['Meta Ads', syncMetaAds(ss), new Date()]); } catch(e) { log.push(['Meta Ads', 'ERROR: ' + e.message, new Date()]); }
  try { ensureSettingsSheet(ss); log.push(['Settings', 'OK', new Date()]); } catch(e) { log.push(['Settings', 'ERROR: ' + e.message, new Date()]); }
  writeLog(ss, log);
}

function syncSendPulse() { const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); syncSPLists(ss); syncSPCampaigns(ss); }
function syncWooCommerce() { const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); syncWCOrders(ss); syncWCProducts(ss); }
function syncAllMarketing() { const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); syncIGPosts(ss); syncFBPosts(ss); syncMetaAds(ss); }

// ============================================================
// SENDPULSE
// ============================================================

function spFetch_(path) {
  const resp = UrlFetchApp.fetch(CONFIG.SP_BASE + path, {
    headers: { 'Authorization': 'Bearer ' + CONFIG.SP_APIKEY },
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) throw new Error('SP ' + path + ' → ' + resp.getResponseCode());
  return JSON.parse(resp.getContentText());
}

function syncSPLists(ss) {
  const lists = spFetch_('/addressbooks');
  const rows = [['id', 'name', 'all_count', 'active_count', 'inactive_count', 'created_at']];
  for (const l of lists) {
    rows.push([l.id, l.name, l.all_email_qty || 0, l.active_email_qty || 0, l.inactive_email_qty || 0, l.creationdate || '']);
  }
  writeSheet_(ss, 'SP_Lists', rows);
  return rows.length - 1 + ' lists';
}

function syncSPCampaigns(ss) {
  let allCampaigns = [];
  let offset = 0;
  while (true) {
    const batch = spFetch_('/campaigns?limit=100&offset=' + offset);
    if (!Array.isArray(batch) || batch.length === 0) break;
    allCampaigns = allCampaigns.concat(batch);
    if (batch.length < 100) break;
    offset += 100;
    Utilities.sleep(300);
  }
  const rows = [['id', 'name', 'status', 'send_date', 'sender_name', 'sender_email',
                 'all_count', 'sent_count', 'delivered', 'opened', 'clicked',
                 'unsubscribed', 'complained', 'bounced', 'open_rate', 'click_rate']];
  for (const c of allCampaigns) {
    const st = c.statistics || {};
    const sent = st.sent || c.all_email_qty || 0;
    const opened = st.opening || 0;
    const clicked = st.link_redirected || 0;
    rows.push([c.id, c.name||'', c.status||'', c.send_date||'', (c.message||{}).sender_name||'', (c.message||{}).sender_email||'',
      c.all_email_qty||0, sent, sent, opened, clicked, st.unsubscribe||0, 0, st.error||0,
      sent > 0 ? (opened/sent*100).toFixed(1) : 0, sent > 0 ? (clicked/sent*100).toFixed(1) : 0]);
  }
  writeSheet_(ss, 'SP_Campaigns', rows);
  return allCampaigns.length + ' campaigns';
}

// ============================================================
// WOOCOMMERCE
// ============================================================

function wcFetch_(path, params) {
  const qs = Object.entries(params || {}).map(([k,v]) => k + '=' + encodeURIComponent(v)).join('&');
  const fullUrl = CONFIG.WC_BASE + path + '?' + qs + '&consumer_key=' + CONFIG.WC_KEY + '&consumer_secret=' + CONFIG.WC_SECRET;
  const resp = UrlFetchApp.fetch(fullUrl, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('WC ' + path + ' → ' + resp.getResponseCode());
  return JSON.parse(resp.getContentText());
}

function syncWCOrders(ss) {
  const allOrders = [];
  let page = 1;
  while (true) {
    const batch = wcFetch_('/orders', { per_page: 100, page: page, orderby: 'date', order: 'desc' });
    if (!batch || batch.length === 0) break;
    allOrders.push(...batch);
    if (batch.length < 100) break;
    page++;
    Utilities.sleep(500);
  }
  const rows = [['id','date_created','status','total','currency','payment_method','payment_method_title',
    'billing_first_name','billing_last_name','billing_email','billing_city','billing_country','billing_phone',
    'shipping_city','shipping_country','utm_source','items_count','items_detail','coupon_codes','customer_note']];
  for (const o of allOrders) {
    const items = (o.line_items || []).map(i => i.name + ' x' + i.quantity).join('; ');
    const coupons = (o.coupon_lines || []).map(c => c.code).join(', ');
    let utm = '';
    (o.meta_data || []).forEach(m => { if (m.key === '_metorik_utm_source') utm = m.value || ''; });
    const b = o.billing || {}, s = o.shipping || {};
    rows.push([o.id, o.date_created||'', o.status||'', parseFloat(o.total)||0, o.currency||'UAH',
      o.payment_method||'', o.payment_method_title||'',
      b.first_name||'', b.last_name||'', b.email||'', b.city||'', b.country||'', b.phone||'',
      s.city||'', s.country||'', utm, (o.line_items||[]).length, items, coupons, o.customer_note||'']);
  }
  writeSheet_(ss, 'WC_Orders', rows);
  return allOrders.length + ' orders';
}

function syncWCProducts(ss) {
  const allProducts = [];
  let page = 1;
  while (true) {
    const batch = wcFetch_('/products', { per_page: 100, page: page });
    if (!batch || batch.length === 0) break;
    allProducts.push(...batch);
    if (batch.length < 100) break;
    page++;
    Utilities.sleep(500);
  }
  const rows = [['id','name','sku','status','price','regular_price','sale_price','stock_quantity','stock_status','categories','total_sales']];
  for (const p of allProducts) {
    const cats = (p.categories || []).map(c => c.name).join(', ');
    rows.push([p.id, p.name||'', p.sku||'', p.status||'', parseFloat(p.price)||0, parseFloat(p.regular_price)||0,
      parseFloat(p.sale_price)||0, p.stock_quantity||0, p.stock_status||'', cats, p.total_sales||0]);
  }
  writeSheet_(ss, 'WC_Products', rows);
  return allProducts.length + ' products';
}

function syncWCOrdersIncremental() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('WC_Orders');
  if (!sheet) { syncWCOrders(ss); return; }
  const after = new Date(); after.setDate(after.getDate() - 2);
  const newOrders = [];
  let page = 1;
  while (true) {
    const batch = wcFetch_('/orders', { per_page: 100, page: page, modified_after: after.toISOString() });
    if (!batch || batch.length === 0) break;
    newOrders.push(...batch);
    if (batch.length < 100) break;
    page++;
    Utilities.sleep(500);
  }
  if (newOrders.length === 0) return;
  const data = sheet.getDataRange().getValues();
  const existingIds = new Set(data.slice(1).map(r => String(r[0])));
  const headers = data[0];
  const colCount = headers.length;
  let added = 0, updated = 0;
  for (const o of newOrders) {
    const items = (o.line_items||[]).map(i=>i.name+' x'+i.quantity).join('; ');
    const coupons = (o.coupon_lines||[]).map(c=>c.code).join(', ');
    let utm = '';
    (o.meta_data||[]).forEach(m => { if(m.key==='_metorik_utm_source') utm=m.value||''; });
    const b=o.billing||{}, s=o.shipping||{};
    const row = [o.id, o.date_created||'', o.status||'', parseFloat(o.total)||0, o.currency||'UAH',
      o.payment_method||'', o.payment_method_title||'',
      b.first_name||'', b.last_name||'', b.email||'', b.city||'', b.country||'', b.phone||'',
      s.city||'', s.country||'', utm, (o.line_items||[]).length, items, coupons, o.customer_note||''];
    if (existingIds.has(String(o.id))) {
      for (let i=1; i<data.length; i++) { if(String(data[i][0])===String(o.id)) { sheet.getRange(i+1,1,1,colCount).setValues([row]); updated++; break; } }
    } else { sheet.appendRow(row); added++; }
  }
  Logger.log('WC incremental: ' + added + ' added, ' + updated + ' updated');
}

// ============================================================
// META / INSTAGRAM / FACEBOOK
// ============================================================

function metaFetch_(path) {
  const url = 'https://graph.facebook.com/v21.0/' + path + (path.indexOf('?') === -1 ? '?' : '&') + 'access_token=' + CONFIG.META_TOKEN;
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    Logger.log('Meta API ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 150));
    return null;
  }
  return JSON.parse(resp.getContentText());
}

function discoverMetaIds() {
  const pages = metaFetch_('me/accounts?fields=id,name,instagram_business_account');
  if (pages && pages.data) pages.data.forEach(p => {
    Logger.log('FB Page: ' + p.name + ' → PAGE_ID: ' + p.id);
    if (p.instagram_business_account) Logger.log('  IG → IG_ACCOUNT_ID: ' + p.instagram_business_account.id);
  });
  const ads = metaFetch_('me/adaccounts?fields=id,name,account_status');
  if (ads && ads.data) ads.data.forEach(a => Logger.log('Ad Account: ' + a.name + ' → ' + a.id));
}

function syncIGPosts(ss) {
  if (!ss) ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const data = metaFetch_(CONFIG.IG_ACCOUNT_ID + '/media?fields=id,timestamp,caption,media_type,permalink,like_count,comments_count&limit=100');
  if (!data || !data.data) { Logger.log('No IG posts'); return '0 posts'; }
  const rows = [['id','timestamp','caption','media_type','permalink','like_count','comments_count','reach','saved','engagement']];
  for (const p of data.data) {
    let reach = 0, saved = 0;
    try {
      const ins = metaFetch_(p.id + '/insights?metric=reach,saved');
      if (ins && ins.data) ins.data.forEach(m => {
        if (m.name === 'reach') reach = m.values[0].value || 0;
        if (m.name === 'saved') saved = m.values[0].value || 0;
      });
    } catch(e) {}
    const likes = p.like_count || 0, comments = p.comments_count || 0;
    rows.push([p.id, p.timestamp||'', (p.caption||'').substring(0,200), p.media_type||'', p.permalink||'',
      likes, comments, reach, saved, likes+comments+saved]);
  }
  writeSheet_(ss, 'IG_Posts', rows);
  return (rows.length-1) + ' posts';
}

function syncFBPosts(ss) {
  if (!ss) ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  if (!CONFIG.META_PAGE_ID) { Logger.log('No META_PAGE_ID'); return '0'; }
  const data = metaFetch_(CONFIG.META_PAGE_ID + '/posts?fields=id,created_time,message,type,permalink_url,likes.summary(true),comments.summary(true),shares&limit=100');
  if (!data || !data.data) { Logger.log('No FB posts'); return '0 posts'; }
  const rows = [['id','created_time','message','type','permalink_url','likes','comments','shares','reach','engaged_users','clicks']];
  for (const p of data.data) {
    const likes = (p.likes && p.likes.summary) ? p.likes.summary.total_count : 0;
    const comments = (p.comments && p.comments.summary) ? p.comments.summary.total_count : 0;
    const shares = p.shares ? p.shares.count : 0;
    let reach = 0, engaged = 0, clicks = 0;
    try {
      const ins = metaFetch_(p.id + '/insights?metric=post_reach,post_engaged_users,post_clicks');
      if (ins && ins.data) ins.data.forEach(m => {
        const val = m.values && m.values[0] ? m.values[0].value : 0;
        if (m.name === 'post_reach') reach = val;
        if (m.name === 'post_engaged_users') engaged = val;
        if (m.name === 'post_clicks') clicks = val;
      });
    } catch(e) {}
    rows.push([p.id, p.created_time||'', (p.message||'').substring(0,200), p.type||'', p.permalink_url||'',
      likes, comments, shares, reach, engaged, clicks]);
  }
  writeSheet_(ss, 'FB_Posts', rows);
  return (rows.length-1) + ' posts';
}

function syncMetaAds(ss) {
  if (!ss) ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  if (!CONFIG.META_AD_ACCOUNT_ID) { Logger.log('No META_AD_ACCOUNT_ID'); return '0'; }
  const since = new Date(); since.setFullYear(since.getFullYear() - 3);
  const sinceStr = Utilities.formatDate(since, 'GMT', 'yyyy-MM-dd');
  const untilStr = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd');
  const data = metaFetch_(CONFIG.META_AD_ACCOUNT_ID + '/campaigns?fields=id,name,status,objective,start_time&limit=100');
  if (!data || !data.data) { Logger.log('No Meta campaigns'); return '0'; }
  const rows = [['campaign_id','campaign_name','status','objective','date_start','date_stop',
    'spend','impressions','reach','clicks','ctr','cpc','cpm','link_clicks','purchases','purchase_value']];
  for (const camp of data.data) {
    let ins = null;
    try { ins = metaFetch_(camp.id + '/insights?fields=spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values&time_range={"since":"'+sinceStr+'","until":"'+untilStr+'"}'); } catch(e) {}
    if (!ins || !ins.data || !ins.data.length) ins = {data:[{}]};
    const d = ins.data[0];
    let linkClicks=0, purchases=0, purchaseValue=0;
    (d.actions||[]).forEach(a => { if(a.action_type==='link_click') linkClicks=parseInt(a.value||0); if(a.action_type==='purchase'||a.action_type==='offsite_conversion.fb_pixel_purchase') purchases=parseInt(a.value||0); });
    (d.action_values||[]).forEach(a => { if(a.action_type==='purchase'||a.action_type==='offsite_conversion.fb_pixel_purchase') purchaseValue=parseFloat(a.value||0); });
    if (true) { // Include all campaigns, even with 0 spend
      rows.push([camp.id, camp.name||'', camp.status||'', camp.objective||'', camp.start_time||sinceStr, untilStr,
        parseFloat(d.spend||0), parseInt(d.impressions||0), parseInt(d.reach||0), parseInt(d.clicks||0),
        parseFloat(d.ctr||0).toFixed(2), parseFloat(d.cpc||0).toFixed(2), parseFloat(d.cpm||0).toFixed(2),
        linkClicks, purchases, purchaseValue.toFixed(2)]);
    }
  }
  writeSheet_(ss, 'Meta_Ads', rows);
  return (rows.length-1) + ' campaigns';
}

// ============================================================
// UTILS
// ============================================================

function ensureSettingsSheet(ss) {
  let sheet = ss.getSheetByName('Settings');
  if (sheet) return;
  sheet = ss.insertSheet('Settings');
  sheet.getRange(1,1,1,4).setValues([['setting_key','value','date_from','description']]);
  sheet.getRange(2,1,4,4).setValues([
    ['fop_tax','5','2024-01-01','Єдиний податок ФОП %'],
    ['fop_bank','2.5','2024-01-01','Банк процесинг ФОП %'],
    ['vat_rate','20','2024-01-01','ПДВ %'],
    ['nds_divisor','1.2','2024-01-01','Дільник ПДВ для PRIVAT/VOSTOK'],
  ]);
  sheet.setFrozenRows(1);
}

function writeSheet_(ss, name, rows) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.clearContents();
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
}

function writeLog(ss, entries) {
  let sheet = ss.getSheetByName('Sync_Log');
  if (!sheet) { sheet = ss.insertSheet('Sync_Log'); sheet.getRange(1,1,1,3).setValues([['source','result','timestamp']]); sheet.setFrozenRows(1); }
  if (entries.length > 0) { const lr = sheet.getLastRow(); sheet.getRange(lr+1, 1, entries.length, 3).setValues(entries); }
  if (sheet.getLastRow() > 501) sheet.deleteRows(2, sheet.getLastRow() - 501);
}
