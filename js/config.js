// js/config.js — Sheet IDs, credentials, Google OAuth
const SID="1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ";
const SID2="1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w";
const SID3="1fw_8kPlr-FZEflfLpUw13PP1HXmezbkjjfiI1EtX6mU"; // 1C Бухгалтерія
const METORIK_UK_TOKEN="mtk_8yjvfwcu0gjhkn0z53wpliv6el0jfc1a7gvm5d8z6icvqvao"; // Wines of Ukraine UK Metorik

// Google OAuth Client ID — отримати: console.cloud.google.com → APIs → Credentials → OAuth 2.0
const GOOGLE_CLIENT_ID = ""; // Поки пусто — Google Sign-In не покажеться, працює пароль

// Password fallback (працює завжди, навіть без Google)
const ROLES={
  owner:{password:"beykush2024",tabs:["balance","pl","sales","exp","assets","shop","stock","cash","mkt","partners","uk","production","unrec","settings"]},
  manager:{password:"sales2024",tabs:["sales","shop","stock","mkt","partners"]},
  accountant:{password:"acc2024",tabs:["balance","pl","exp","assets","cash","partners","unrec"]}
};

// Users list for Google Auth — email → {name, role, tabs, phone, active}
// Later will be loaded from Google Sheets "Users" tab
const USERS_DEFAULT = {
  "shneyderis@gmail.com": {name:"Shneyderis",role:"owner",tabs:null,active:true},
};
