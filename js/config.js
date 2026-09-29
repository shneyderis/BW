// js/config.js — Sheet IDs, credentials, Google OAuth
const SID="1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ";
const SID2="1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w";
const SID3="1fw_8kPlr-FZEflfLpUw13PP1HXmezbkjjfiI1EtX6mU"; // 1C Бухгалтерія
// Ключі API (SendPulse, WooCommerce, Meta, Metorik) живуть ТІЛЬКИ у Script Properties Apps Script (див. sync.gs), не в репозиторії.

// Google OAuth Client ID — отримати: console.cloud.google.com → APIs → Credentials → OAuth 2.0
const GOOGLE_CLIENT_ID = ""; // Поки пусто — Google Sign-In не покажеться, працює пароль

// Password fallback (працює завжди, навіть без Google)
const ROLES={
  owner:{password:"beykush2024",tabs:["balance","pl","sales","goods","exp","salary","shop","stock","cash","mkt","partners","uk","production","unrec","status","settings"]},
  manager:{password:"sales2024",tabs:["sales","goods","shop","stock","mkt","partners","status"]},
  accountant:{password:"acc2024",tabs:["balance","pl","goods","exp","salary","cash","partners","unrec","status"]}
};

// Users list for Google Auth — email → {name, role, tabs, phone, active}
// Later will be loaded from Google Sheets "Users" tab
const USERS_DEFAULT = {
  "shneyderis@gmail.com": {name:"Shneyderis",role:"owner",tabs:null,active:true},
};
