// sync.gs — Google Apps Script: WooCommerce + Meta/IG → Google Sheets
// Расположение: основная таблица → Extensions → Apps Script
// Скопируй функции в существующий sync.gs в Apps Script

// ============ CONFIG ============
var WC_BASE = "https://beykush.com/wp-json/wc/v3";
var WC_CK = "ck_5b87215529858139d17b602945170ae4d9c8adbd";
var WC_CS = "cs_3ad054a505185162e849a92bf019979e6c037c93";

// Meta/Instagram — заменить на свой long-lived token
// Получить: https://developers.facebook.com/tools/explorer/
// Permissions: pages_read_engagement, instagram_basic, instagram_manage_insights, ads_read
var META_TOKEN = "YOUR_META_TOKEN_HERE";
var IG_ACCOUNT_ID = "YOUR_IG_BUSINESS_ACCOUNT_ID";  // Instagram Business Account ID
var META_AD_ACCOUNT_ID = "YOUR_AD_ACCOUNT_ID";       // act_XXXXXXXXX
var META_PAGE_ID = "YOUR_PAGE_ID";                    // Facebook Page ID

/**
 * Синхронизация WC заказов в лист WC_Orders
 * Включает utm_source из meta_data
 */
function syncWCOrders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("WC_Orders");
  if (!sheet) {
    sheet = ss.insertSheet("WC_Orders");
  }

  // Заголовки — включая utm_source
  var headers = [
    "id", "status", "date_created", "total", "currency",
    "billing_first_name", "billing_last_name", "billing_email",
    "billing_city", "billing_country", "billing_phone",
    "shipping_city", "shipping_country",
    "payment_method", "payment_method_title",
    "utm_source",
    "items_count", "coupon_codes"
  ];

  // Загрузка всех заказов из WC API (пагинация)
  var allOrders = [];
  var page = 1;
  while (true) {
    var url = WC_BASE + "/orders?consumer_key=" + WC_CK + "&consumer_secret=" + WC_CS
      + "&per_page=100&page=" + page
      + "&orderby=date&order=desc";
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) {
        Logger.log("WC orders page " + page + " HTTP " + resp.getResponseCode());
        break;
      }
      var orders = JSON.parse(resp.getContentText());
      if (!orders.length) break;
      allOrders = allOrders.concat(orders);
      Logger.log("WC orders page " + page + ": " + orders.length + " orders");
      if (orders.length < 100) break;
      page++;
    } catch (e) {
      Logger.log("WC orders error page " + page + ": " + e.message);
      break;
    }
  }

  if (!allOrders.length) {
    Logger.log("No WC orders fetched");
    return;
  }

  // Маппинг заказов в строки
  var rows = allOrders.map(function(o) {
    // UTM source из meta_data
    var utmSource = "";
    (o.meta_data || []).forEach(function(m) {
      if (m.key === "_metorik_utm_source") utmSource = m.value || "";
    });

    // Количество товаров в заказе
    var itemsCount = (o.line_items || []).reduce(function(s, li) {
      return s + (li.quantity || 1);
    }, 0);

    // Купоны
    var coupons = (o.coupon_lines || []).map(function(c) { return c.code || ""; }).join(", ");

    var b = o.billing || {};
    var s = o.shipping || {};

    return [
      o.id || "",
      o.status || "",
      o.date_created || "",
      o.total || "0",
      o.currency || "UAH",
      b.first_name || "",
      b.last_name || "",
      b.email || "",
      b.city || "",
      b.country || "",
      b.phone || "",
      s.city || "",
      s.country || "",
      o.payment_method || "",
      o.payment_method_title || "",
      utmSource,
      itemsCount,
      coupons
    ];
  });

  // Записываем в лист
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log("WC_Orders synced: " + rows.length + " orders, " + headers.length + " columns");
}

/**
 * Инкрементальная синхронизация — только новые заказы за последние 3 дня
 * Обновляет существующие и добавляет новые
 */
function syncWCOrdersIncremental() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("WC_Orders");
  if (!sheet) {
    syncWCOrders(); // Полная синхронизация если листа нет
    return;
  }

  // Дата 3 дня назад
  var since = new Date();
  since.setDate(since.getDate() - 3);
  var sinceISO = since.toISOString();

  // Загрузка новых заказов
  var newOrders = [];
  var page = 1;
  while (true) {
    var url = WC_BASE + "/orders?consumer_key=" + WC_CK + "&consumer_secret=" + WC_CS
      + "&per_page=100&page=" + page
      + "&after=" + sinceISO
      + "&orderby=date&order=desc";
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) break;
      var orders = JSON.parse(resp.getContentText());
      if (!orders.length) break;
      newOrders = newOrders.concat(orders);
      if (orders.length < 100) break;
      page++;
    } catch (e) {
      Logger.log("WC incremental error: " + e.message);
      break;
    }
  }

  if (!newOrders.length) {
    Logger.log("No new WC orders since " + sinceISO);
    return;
  }

  // Существующие ID в листе
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf("id");
  if (idCol === -1) { syncWCOrders(); return; }

  var existingIds = {};
  for (var i = 1; i < data.length; i++) {
    existingIds[String(data[i][idCol])] = i + 1; // row number (1-based)
  }

  var added = 0, updated = 0;
  newOrders.forEach(function(o) {
    var utmSource = "";
    (o.meta_data || []).forEach(function(m) {
      if (m.key === "_metorik_utm_source") utmSource = m.value || "";
    });
    var itemsCount = (o.line_items || []).reduce(function(s, li) { return s + (li.quantity || 1); }, 0);
    var coupons = (o.coupon_lines || []).map(function(c) { return c.code || ""; }).join(", ");
    var b = o.billing || {}, s = o.shipping || {};

    var row = [
      o.id || "", o.status || "", o.date_created || "", o.total || "0", o.currency || "UAH",
      b.first_name || "", b.last_name || "", b.email || "",
      b.city || "", b.country || "", b.phone || "",
      s.city || "", s.country || "",
      o.payment_method || "", o.payment_method_title || "",
      utmSource, itemsCount, coupons
    ];

    var existingRow = existingIds[String(o.id)];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      updated++;
    } else {
      sheet.appendRow(row);
      added++;
    }
  });

  Logger.log("WC incremental: " + added + " added, " + updated + " updated");
}

/**
 * Синхронизация WC товаров в лист WC_Products
 */
function syncWCProducts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("WC_Products");
  if (!sheet) {
    sheet = ss.insertSheet("WC_Products");
  }

  var headers = [
    "id", "name", "status", "price", "regular_price", "sale_price",
    "stock_status", "stock_quantity", "sku",
    "categories"
  ];

  var allProducts = [];
  var page = 1;
  while (true) {
    var url = WC_BASE + "/products?consumer_key=" + WC_CK + "&consumer_secret=" + WC_CS
      + "&per_page=100&page=" + page;
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) break;
      var products = JSON.parse(resp.getContentText());
      if (!products.length) break;
      allProducts = allProducts.concat(products);
      if (products.length < 100) break;
      page++;
    } catch (e) {
      Logger.log("WC products error: " + e.message);
      break;
    }
  }

  var rows = allProducts.map(function(p) {
    var cats = (p.categories || []).map(function(c) { return c.name; }).join(", ");
    return [
      p.id || "", p.name || "", p.status || "", p.price || "", p.regular_price || "", p.sale_price || "",
      p.stock_status || "", p.stock_quantity !== null ? p.stock_quantity : "",
      p.sku || "", cats
    ];
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log("WC_Products synced: " + rows.length + " products");
}


// ============ META / INSTAGRAM ============

/**
 * Хелпер: запрос к Graph API
 */
function metaFetch_(path) {
  var url = "https://graph.facebook.com/v19.0/" + path
    + (path.indexOf("?") === -1 ? "?" : "&") + "access_token=" + META_TOKEN;
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) {
    Logger.log("Meta API error: " + resp.getResponseCode() + " " + resp.getContentText().substring(0, 200));
    return null;
  }
  return JSON.parse(resp.getContentText());
}

/**
 * Синхронизація IG постів → лист IG_Posts
 * Бере останні 100 постів з insights (likes, comments, reach, impressions, saves)
 */
function syncIGPosts() {
  if (META_TOKEN === "YOUR_META_TOKEN_HERE") { Logger.log("Set META_TOKEN first"); return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("IG_Posts");
  if (!sheet) sheet = ss.insertSheet("IG_Posts");

  var headers = [
    "id", "timestamp", "caption", "media_type", "permalink",
    "like_count", "comments_count",
    "reach", "impressions", "saved", "engagement"
  ];

  // Отримуємо пости
  var data = metaFetch_(IG_ACCOUNT_ID + "/media?fields=id,timestamp,caption,media_type,permalink,like_count,comments_count&limit=100");
  if (!data || !data.data) { Logger.log("No IG posts"); return; }

  var posts = data.data;
  var rows = [];

  posts.forEach(function(p) {
    // Insights для кожного поста
    var reach = 0, impressions = 0, saved = 0;
    try {
      var ins = metaFetch_(p.id + "/insights?metric=reach,impressions,saved");
      if (ins && ins.data) {
        ins.data.forEach(function(m) {
          if (m.name === "reach") reach = m.values[0].value || 0;
          if (m.name === "impressions") impressions = m.values[0].value || 0;
          if (m.name === "saved") saved = m.values[0].value || 0;
        });
      }
    } catch(e) { /* insights may fail for some post types */ }

    var likes = p.like_count || 0;
    var comments = p.comments_count || 0;
    var engagement = likes + comments + saved;

    rows.push([
      p.id || "",
      p.timestamp || "",
      (p.caption || "").substring(0, 200),
      p.media_type || "",
      p.permalink || "",
      likes, comments,
      reach, impressions, saved, engagement
    ]);
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log("IG_Posts synced: " + rows.length + " posts");
}

/**
 * Синхронізація Meta Ads → лист Meta_Ads
 * Рекламні кампанії з insights за останні 90 днів
 */
function syncMetaAds() {
  if (META_TOKEN === "YOUR_META_TOKEN_HERE") { Logger.log("Set META_TOKEN first"); return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Meta_Ads");
  if (!sheet) sheet = ss.insertSheet("Meta_Ads");

  var headers = [
    "campaign_id", "campaign_name", "status", "objective",
    "date_start", "date_stop",
    "spend", "impressions", "reach", "clicks",
    "ctr", "cpc", "cpm",
    "actions_link_click", "actions_purchase", "action_values_purchase"
  ];

  // Кампанії з insights за 90 днів
  var since = new Date();
  since.setDate(since.getDate() - 90);
  var sinceStr = Utilities.formatDate(since, "GMT", "yyyy-MM-dd");
  var untilStr = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");

  var data = metaFetch_(META_AD_ACCOUNT_ID + "/campaigns?fields=id,name,status,objective&limit=100");
  if (!data || !data.data) { Logger.log("No Meta campaigns"); return; }

  var rows = [];
  data.data.forEach(function(camp) {
    // Insights per campaign
    var ins = metaFetch_(camp.id + "/insights?fields=spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values"
      + "&time_range={\"since\":\"" + sinceStr + "\",\"until\":\"" + untilStr + "\"}");

    var spend=0, impr=0, reach=0, clicks=0, ctr=0, cpc=0, cpm=0;
    var linkClicks=0, purchases=0, purchaseValue=0;

    if (ins && ins.data && ins.data.length) {
      var d = ins.data[0];
      spend = parseFloat(d.spend || 0);
      impr = parseInt(d.impressions || 0);
      reach = parseInt(d.reach || 0);
      clicks = parseInt(d.clicks || 0);
      ctr = parseFloat(d.ctr || 0);
      cpc = parseFloat(d.cpc || 0);
      cpm = parseFloat(d.cpm || 0);

      (d.actions || []).forEach(function(a) {
        if (a.action_type === "link_click") linkClicks = parseInt(a.value || 0);
        if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") purchases = parseInt(a.value || 0);
      });
      (d.action_values || []).forEach(function(a) {
        if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") purchaseValue = parseFloat(a.value || 0);
      });
    }

    if (spend > 0 || impr > 0) {
      rows.push([
        camp.id, camp.name || "", camp.status || "", camp.objective || "",
        sinceStr, untilStr,
        spend, impr, reach, clicks,
        ctr.toFixed(2), cpc.toFixed(2), cpm.toFixed(2),
        linkClicks, purchases, purchaseValue.toFixed(2)
      ]);
    }
  });

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  Logger.log("Meta_Ads synced: " + rows.length + " campaigns with spend/impressions");
}

/**
 * Повна синхронізація всього маркетингу
 */
function syncAllMarketing() {
  syncIGPosts();
  syncMetaAds();
  Logger.log("All marketing synced");
}
