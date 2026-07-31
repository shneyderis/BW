// js/auth.js — Authentication, session management, Google Sign-In

let currentRole=null,currentUser=null;

// SHA-256 → hex (потребує secure context: https або localhost)
async function sha256Hex(s){
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

// Google Sign-In callback
// Увага: підпис JWT клієнтом не перевіряється (немає бекенду) — перевіряємо aud/exp/email_verified.
window.handleGoogleAuth=function(response){
  let payload;
  try{
    const b64=response.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    payload=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64),c=>c.charCodeAt(0))));
  }catch(e){document.getElementById("login-err").textContent="Помилка авторизації";return}
  if(payload.aud!==GOOGLE_CLIENT_ID||payload.exp*1000<Date.now()||payload.email_verified===false){
    document.getElementById("login-err").textContent="Недійсний токен";return}
  const email=(payload.email||"").toLowerCase();
  const user=USERS[email]||USERS_DEFAULT[email];
  if(!user||!user.active){document.getElementById("login-err").textContent="Доступ заборонено: "+email;return}
  const role=user.role||"manager";
  const tabs=user.tabs||ROLES[role]?.tabs||[];
  currentRole=role;
  currentUser={email,name:user.name||payload.name||email,role,picture:payload.picture||""};
  sessionStorage.setItem("bw_role",role);
  sessionStorage.setItem("bw_user",JSON.stringify(currentUser));
  sessionStorage.setItem("bw_ts",String(Date.now()));
  document.getElementById("user-info").textContent=currentUser.name;
  showApp(tabs);
};

async function doLogin(){
  const p=document.getElementById("login-pass").value;
  if(!p)return;
  const h=await sha256Hex(p);
  for(const[role,cfg]of Object.entries(ROLES)){
    if(cfg.passHash===h){
      currentRole=role;
      currentUser={email:"",name:role,role,picture:""};
      sessionStorage.setItem("bw_role",role);
      sessionStorage.setItem("bw_user",JSON.stringify(currentUser));
      sessionStorage.setItem("bw_ts",String(Date.now()));
      document.getElementById("user-info").textContent=role;
      showApp(cfg.tabs);return}
  }
  document.getElementById("login-err").textContent="Невірний пароль";
}

function doLogout(){
  sessionStorage.clear();currentRole=null;currentUser=null;
  wcLoaded=false;wcError="";WO=[];WP=[];WCU=[];
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("login-pass").value="";
  document.getElementById("user-info").textContent="";
}

function showApp(tabs){
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.querySelectorAll('.tab').forEach(btn=>{
    const id=btn.getAttribute('onclick')?.match(/sw\('(\w+)'/)?.[1];
    if(id){btn.classList.toggle("hidden",!tabs.includes(id));if(!tabs.includes(id)&&btn.classList.contains("on")){btn.classList.remove("on")}}
  });
  const firstVisible=document.querySelector('.tab:not(.hidden)');
  if(firstVisible&&!document.querySelector('.tab.on:not(.hidden)')){firstVisible.classList.add("on");const id=firstVisible.getAttribute('onclick')?.match(/sw\('(\w+)'/)?.[1];if(id){['balance','pl','sales','goods','exp','salary','shop','stock','cash','mkt','partners','uk','production','unrec','settings'].forEach(t=>document.getElementById('t-'+t).classList.add('hidden'));document.getElementById('t-'+id).classList.remove('hidden')}}
  load();
}

// Init Google Sign-In button
(function(){
  if(GOOGLE_CLIENT_ID){
    window.addEventListener("load",()=>{
      if(window.google&&google.accounts){
        google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:handleGoogleAuth});
        google.accounts.id.renderButton(document.getElementById("google-btn"),{theme:"filled_black",size:"large",text:"signin_with",width:220});
      }
    });
  } else {
    const gb=document.getElementById("google-btn");if(gb)gb.style.display="none";
    const sep=gb?.previousElementSibling;if(sep&&sep.textContent.includes("або"))sep.style.display="none";
  }
})();

// Auto-login from session with 30-min timeout
(function(){
  const r=sessionStorage.getItem("bw_role");
  const ts=parseInt(sessionStorage.getItem("bw_ts")||"0");
  if(r&&(Date.now()-ts<30*60*1000)){
    currentRole=r;
    try{currentUser=JSON.parse(sessionStorage.getItem("bw_user"))}catch(e){}
    if(currentUser)document.getElementById("user-info").textContent=currentUser.name||r;
    const user=currentUser&&currentUser.email?USERS[currentUser.email]||USERS_DEFAULT[currentUser.email]:null;
    const tabs=user?.tabs||ROLES[r]?.tabs||[];
    showApp(tabs);
  } else{sessionStorage.clear()}
})();

// Reset timeout on activity
["click","keydown","scroll"].forEach(e=>document.addEventListener(e,()=>{if(currentRole)sessionStorage.setItem("bw_ts",String(Date.now()))}));

// Load users from Sheets
async function loadUsers(){
  try{
    const data=await csvF("Users");
    if(data.length){
      data.forEach(r=>{
        const email=(gv(r,"email")||"").toLowerCase().trim();
        if(!email)return;
        USERS[email]={
          name:gv(r,"name")||gv(r,"ім")||"",
          role:gv(r,"role")||gv(r,"роль")||"manager",
          tabs:(gv(r,"tabs")||"").split(",").map(s=>s.trim()).filter(Boolean),
          phone:gv(r,"phone")||gv(r,"телефон")||"",
          active:(gv(r,"active")||"true")!=="false"
        };
        if(!USERS[email].tabs.length)USERS[email].tabs=null;
      });
      console.log("Users loaded:",Object.keys(USERS).length);
    }
  }catch(e){console.warn("Users sheet not found, using defaults")}
}
