/* Gestão do Rebanho — js/app/01-config-conta.js
   Configuração do Supabase, sessão da conta e permissões de uso.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= CONTA E NUVEM (Supabase) =======================
   A chave publicável vai no app (é pública). A proteção dos dados é feita pelas regras (RLS) do banco. */
const SUPABASE_URL="https://homosmdrqtdxtmmmnbpd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_FcTVOwopuWb8WbzJaqEE5A_GGO1g9Ve";
const CLOUD_APP_VERSION="77";
const AUTH_STORAGE_KEY="rebanho_supabase_session";

function authSession(){
  try{return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)||"null");}catch(e){return null;}
}
function saveAuthSession(s){
  if(s)localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify(s));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
}
async function sbFetch(path,opt={}){
  const session=authSession();
  const headers=Object.assign({
    "apikey":SUPABASE_PUBLISHABLE_KEY,
    "Content-Type":"application/json"
  },opt.headers||{});
  if(session&&session.access_token)headers["Authorization"]="Bearer "+session.access_token;
  // V76: não permite que respostas GET da API sejam reaproveitadas pelo cache
  // HTTP do navegador. O service worker também ignora todo domínio externo.
  const res=await fetch(SUPABASE_URL+path,Object.assign({},opt,{headers,cache:"no-store"}));
  let body=null;
  const ct=res.headers.get("content-type")||"";
  try{body=ct.includes("application/json")?await res.json():await res.text();}catch(e){}
  if(res.status===401&&session&&session.refresh_token&&!opt._retry){
    const ok=await refreshAuthSession();
    if(ok)return sbFetch(path,Object.assign({},opt,{_retry:true}));
  }
  if(!res.ok){
    const msg=(body&&typeof body==="object"&&(body.msg||body.message||body.error_description||body.error))||String(body||("HTTP "+res.status));
    throw new Error(msg);
  }
  return body;
}
async function refreshAuthSession(){
  const s=authSession(); if(!s||!s.refresh_token)return false;
  try{
    const res=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token",{
      method:"POST",
      headers:{"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({refresh_token:s.refresh_token})
    });
    if(!res.ok){saveAuthSession(null);return false;}
    const n=await res.json(); saveAuthSession(n); return true;
  }catch(e){return false;}
}
async function authUser(){
  const s=authSession(); if(!s)return null;
  if(s.user)return s.user;
  try{return await sbFetch("/auth/v1/user");}catch(e){return null;}
}

function sessaoLocalValida(){
  const s=authSession();
  return !!(s&&s.user&&s.user.id);
}
async function exigirConta(acao){
  const user=await authUser();
  if(user)return user;
  const offline=!navigator.onLine;
  abrir(`<h2>Entre na sua conta</h2>
    <div class="meta">${offline
      ?"Este aparelho ainda não possui uma sessão autenticada salva. Conecte-se à internet para entrar pela primeira vez."
      :"Para usar o Gestão do Rebanho, entre ou crie sua conta."}</div>
    ${acao?`<div class="meta" style="margin-top:8px">Ação: <b>${esc(acao)}</b></div>`:""}
    <button class="btn" style="margin-top:16px" onclick="fechar();formLoginCloud()">Entrar / criar conta</button>
    <button class="btn-fant" onclick="fechar()">Cancelar</button>`);
  return null;
}
async function podeUsarApp(acao){
  return !!(await exigirConta(acao));
}
