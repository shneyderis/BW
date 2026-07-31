// js/config.js — Sheet IDs, Google OAuth
const SID="1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ";
const SID2="1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w";
const SID3="1fw_8kPlr-FZEflfLpUw13PP1HXmezbkjjfiI1EtX6mU"; // 1C Бухгалтерія
// Metorik token живе ТІЛЬКИ в Apps Script (Script Properties) — фронтенду він не потрібен

// Google OAuth Client ID — отримати: console.cloud.google.com → APIs → Credentials → OAuth 2.0
const GOOGLE_CLIENT_ID = ""; // Поки пусто — Google Sign-In не покажеться, працює пароль

// Password fallback (працює завжди, навіть без Google)
// Паролі зберігаються як SHA-256 хеші (не відкритим текстом).
// Змінити пароль: вкладка ⚙ Налаштування → "Зміна паролю" → скопіювати хеш сюди.
const ROLES={
  owner:{passHash:"874cf08dd6e3c431afdd617011e1b25b2a50bb75dc60e16e6f9b5807881a2616",tabs:["balance","pl","sales","goods","exp","salary","shop","stock","cash","mkt","partners","uk","production","unrec","settings"]},
  manager:{passHash:"5bc99ba04638d4cdfaad36d1d2234a220d1f0f73887d742d7bee7ced3f8e6c5b",tabs:["sales","goods","shop","stock","mkt","partners"]},
  accountant:{passHash:"86b62542ecf1077f87b6693ec196574b4089619a6a7cdbba7243b0f65485347e",tabs:["balance","pl","goods","exp","cash","partners","unrec"]}
};

// Users list for Google Auth — email → {name, role, tabs, phone, active}
// Later will be loaded from Google Sheets "Users" tab
const USERS_DEFAULT = {
  "shneyderis@gmail.com": {name:"Shneyderis",role:"owner",tabs:null,active:true},
};
