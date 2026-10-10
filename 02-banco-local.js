/* Gestão do Rebanho — js/app/02-banco-local.js
   Banco local (IndexedDB): abrir, ler, gravar e excluir com metadados de sincronização.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= BANCO (IndexedDB, offline) ======================= */
/*
  Tudo é gravado primeiro aqui (funciona sem internet) e depois sincronizado com a nuvem.

  Metadados adicionados automaticamente aos registros:
  - created_at: criação local
  - updated_at: última alteração local
  - deleted_at: exclusão lógica (tombstone) para futura sincronização
  - sync_status: pending_create / pending_update / pending_delete / synced
  - sync_version: contador local de alterações

  A store "sync_meta" guarda somente dados técnicos deste aparelho e NÃO entra no backup.
*/
const DB="rebanho_v2";
const DB_VERSION=10;
const SYNC_SCHEMA_VERSION=4;
const DATA_STORES=["propriedades","marcas","lotes","animais","eventos","medicamentos","perfil","pastos","avisos","lancamentos","grupos","grupo_animais","insumos","insumo_mov"];
const SYNC_STORES=["propriedades","marcas","lotes","animais","eventos","medicamentos","pastos","avisos","lancamentos","grupos","grupo_animais","insumos","insumo_mov"];
let _syncRunning=false,_syncTimer=null,_syncLastError="",_syncLastResult=null;
let db;

const agoraISO=()=>new Date().toISOString();
const isoLegado=o=>{
  const ts=o&&(o.criadoEm||o.feitoEm);
  if(typeof ts==="number"&&Number.isFinite(ts))return new Date(ts).toISOString();
  return agoraISO();
};

function abrirDB(){return new Promise((ok,er)=>{const r=indexedDB.open(DB,DB_VERSION);
  r.onupgradeneeded=e=>{
    const d=e.target.result, t=e.target.transaction;
    const criar=n=>{if(!d.objectStoreNames.contains(n))d.createObjectStore(n,{keyPath:"id"});};
    DATA_STORES.forEach(criar);
    criar("sync_meta");

    // Migra registros antigos sem alterar os dados funcionais do usuário.
    // Todos ficam pendentes de criação para que, no futuro, possam ser enviados
    // ao primeiro backend configurado sem perder registros já existentes.
    for(const nome of DATA_STORES){
      const st=t.objectStore(nome);
      const req=st.openCursor();
      req.onsuccess=ev=>{
        const c=ev.target.result;
        if(!c)return;
        const o=c.value, base=o.created_at||isoLegado(o);
        let mudou=false;
        if(!o.created_at){o.created_at=base;mudou=true;}
        if(!o.updated_at){o.updated_at=base;mudou=true;}
        if(o.deleted_at===undefined){o.deleted_at=null;mudou=true;}
        if(!o.sync_status){o.sync_status="pending_create";mudou=true;}
        if(!Number.isFinite(o.sync_version)){o.sync_version=1;mudou=true;}
        if(mudou)c.update(o);
        c.continue();
      };
    }
  };
  r.onsuccess=async e=>{
    db=e.target.result;
    await garantirSyncMeta();
    ok();
  };
  r.onerror=er;
});}

function tx(s,m="readonly"){return db.transaction(s,m).objectStore(s);}
function getAllRaw(s){return new Promise((ok,er)=>{const r=tx(s).getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>er(r.error);});}
function getRaw(s,id){return new Promise((ok,er)=>{const r=tx(s).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error);});}
function putRaw(s,o){return new Promise((ok,er)=>{const r=tx(s,"readwrite").put(o);r.onsuccess=()=>ok(o);r.onerror=()=>er(r.error);});}
function hardDel(s,id){return new Promise((ok,er)=>{const r=tx(s,"readwrite").delete(id);r.onsuccess=()=>ok();r.onerror=()=>er(r.error);});}

async function activeOrgIdLocal(){
  try{const m=await getRaw("sync_meta","device");return m&&m.active_org_id||null;}catch(e){return null;}
}
async function getAll(s){
  const arr=await getAllRaw(s);
  const ativos=arr.filter(o=>!o.deleted_at);
  if(!SYNC_STORES.includes(s))return ativos;
  const org=await activeOrgIdLocal();
  if(!org)return ativos;
  return ativos.filter(o=>!o.organization_id||o.organization_id===org);
}
async function get(s,id){
  const o=await getRaw(s,id);
  if(!o||o.deleted_at)return undefined;
  if(SYNC_STORES.includes(s)){
    const org=await activeOrgIdLocal();
    if(org&&o.organization_id&&o.organization_id!==org)return undefined;
  }
  return o;
}
function agendarSync(ms=1800){
  if(!navigator.onLine||!authSession())return;
  clearTimeout(_syncTimer);
  _syncTimer=setTimeout(()=>sincronizarAgora({silencioso:true}),ms);
}
async function put(s,o){
  const agora=agoraISO();
  if(!o.created_at)o.created_at=agora;
  o.updated_at=agora;
  if(o.deleted_at===undefined)o.deleted_at=null;
  o.sync_version=(Number.isFinite(o.sync_version)?o.sync_version:0)+1;
  if(!o.sync_status)o.sync_status="pending_create";
  else if(o.sync_status==="synced")o.sync_status="pending_update";
  if(SYNC_STORES.includes(s)){
    const org=await activeOrgIdLocal();
    if(org&&!o.organization_id)o.organization_id=org;
  }
  const r=await putRaw(s,o);
  if(SYNC_STORES.includes(s))agendarSync();
  return r;
}
async function del(s,id){
  const o=await getRaw(s,id);
  if(!o)return;
  const _aplV144=s==="eventos"&&!o.deleted_at&&o.aplicacaoId&&!window._suspenderEstornoV119?o.aplicacaoId:null;
  const agora=agoraISO();
  if(!o.created_at)o.created_at=agora;
  o.updated_at=agora;
  o.deleted_at=agora;
  o.sync_status="pending_delete";
  o.sync_version=(Number.isFinite(o.sync_version)?o.sync_version:0)+1;
  if(SYNC_STORES.includes(s)){
    const org=await activeOrgIdLocal();
    if(org&&!o.organization_id)o.organization_id=org;
  }
  const r=await putRaw(s,o);
  if(SYNC_STORES.includes(s))agendarSync();
  if(_aplV144)await ajustarAplicacaoAposExclusao(_aplV144);
  return r;
}
async function garantirSyncMeta(){
  let m=await getRaw("sync_meta","device");
  if(!m){
    m={id:"device",device_id:crypto.randomUUID?crypto.randomUUID():("dev-"+Date.now()+"-"+Math.random()),
      schema_version:SYNC_SCHEMA_VERSION,last_sync_at:null,last_server_sync_at:null,active_org_id:null,active_user_id:null,
      legacy_claimed_org_id:null,criado_em:agoraISO()};
    await putRaw("sync_meta",m);
  }else{
    let mudou=false;
    if(m.schema_version!==SYNC_SCHEMA_VERSION){m.schema_version=SYNC_SCHEMA_VERSION;mudou=true;}
    if(m.active_org_id===undefined){m.active_org_id=null;mudou=true;}
    if(m.active_user_id===undefined){m.active_user_id=null;mudou=true;}
    if(m.last_server_sync_at===undefined){m.last_server_sync_at=null;mudou=true;}
    if(m.legacy_claimed_org_id===undefined){m.legacy_claimed_org_id=null;mudou=true;}
    if(mudou)await putRaw("sync_meta",m);
  }
  return m;
}
