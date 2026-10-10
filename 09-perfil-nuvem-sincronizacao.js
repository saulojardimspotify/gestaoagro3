/* Gestão do Rebanho — js/app/09-perfil-nuvem-sincronizacao.js
   Perfil, conta, sincronização com a nuvem e backup em nuvem.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= PERFIL / CONFIG ======================= */
async function telaPerfil(){
  topoPagina();
  const user=await authUser();

  if(!user){
    $t.innerHTML=`
      <div class="card" style="text-align:center;margin-top:10px">
        <div class="avatar" style="margin:4px auto 10px">👤</div>
        <b>Entre na sua conta</b>
        <div class="meta" style="margin:4px 0 12px">Sua conta é também o seu perfil e identifica os dados deste aparelho.</div>
        <button class="btn" style="margin:0" onclick="formLoginCloud()">Entrar / criar conta</button>
        <div class="cloud-note" style="margin-top:12px">O primeiro login precisa de internet. Depois, a sessão fica salva neste aparelho para uso offline.</div>
      </div>`;
    return;
  }

  const {propriedades,marcas,lotes,animais,eventos,medicamentos,grupos}=await tudo();
  const cfg=await getConfig(); const _dias=diasDesde(cfg.ultimoBackup); const _freq=cfg.lembreteDias||7;
  const p=await carregarPerfilIntegrado(user);

  $t.innerHTML=`
    <div class="card" style="display:flex;align-items:center;gap:14px">
      <div class="avatar-wrap" onclick="formPerfil()">
        <div class="avatar">${avatarHTML(p.foto,p.nome||user.email||"Usuário")}</div><div class="avatar-cam">📷</div>
      </div>
      <div style="flex:1;min-width:0">
        <div class="ti" style="font-size:19px">${esc(p.nome||"Usuário")}</div>
        ${p.funcao?`<div class="meta">${esc(p.funcao)}</div>`:""}
        ${p.localizacao?`<div class="meta">📍 ${esc(p.localizacao)}</div>`:""}
        <div class="meta">✉️ ${esc(user.email||"")}</div>
        ${p.telefone?`<div class="meta">📞 ${esc(p.telefone)}</div>`:""}
      </div>
      <button class="btn-fant" style="padding:6px;color:var(--verde)" onclick="formPerfil()">✎</button>
    </div>
    <div class="card"><div class="ti">Resumo</div>
      <div class="meta" style="margin-top:4px">${propriedades.length} propriedades · ${lotes.length} lotes · ${grupos.length} grupos · ${animais.length} animais · ${eventos.length} eventos</div></div>
    <button class="btn btn-sec" onclick="telaInstalar()">📲 ${appInstalado()?"App instalado · compartilhar link":"Instalar o app no celular"}</button>
    <div class="sechead"><h2 style="font-size:16px">Cadastros</h2></div>
    <button class="btn btn-sec" onclick="gerenciarMarcas()">🏷 Marcas / donos (${marcas.length})</button>
    <button class="btn btn-sec" onclick="formNovaPropriedade()">🏡 Nova propriedade</button>
    <div class="sechead" style="margin-top:18px"><h2 style="font-size:16px">Nuvem e backup</h2></div>
    <div id="cloudAccountBox"><div class="cloud-card"><div class="meta">Verificando sua conta…</div></div></div>
    <div class="sechead" style="margin-top:18px"><h2 style="font-size:16px">Backup manual</h2></div>
    <div class="card" style="border-left:4px solid var(--verde)">
      <b>⚠ Faça backup com frequência.</b>
      <div class="meta" style="margin-top:4px">Use o arquivo .json como cópia extra de segurança ou para transferência manual.</div>
      <div class="meta" style="margin-top:6px">${cfg.ultimoBackup?`Último backup: há ${_dias} dia(s).`:"Nenhum backup salvo ainda."}</div></div>
    <button class="btn btn-sec" onclick="exportar()">⬇ Baixar backup (.json)</button>
    <label style="display:block;font-size:13px;color:var(--muted);margin:4px 4px 5px;font-weight:600">Lembrar de fazer backup a cada</label>
    <select onchange="salvarFreq(this.value)" style="margin-bottom:12px">
      <option value="3" ${_freq===3?"selected":""}>3 dias</option>
      <option value="7" ${_freq===7?"selected":""}>7 dias</option>
      <option value="15" ${_freq===15?"selected":""}>15 dias</option>
      <option value="30" ${_freq===30?"selected":""}>30 dias</option></select>
    <label class="btn btn-sec" style="text-align:center;cursor:pointer">⬆ Importar backup
      <input type="file" accept="application/json" onchange="importar(this)" style="display:none"></label>`;
  renderContaNuvem();
}

/* ---------- Conta Supabase / backup em nuvem ---------- */
async function renderContaNuvem(){
  const box=document.getElementById("cloudAccountBox"); if(!box)return;
  const user=await authUser();
  if(!user){box.innerHTML="";return;}
  let ultimo="";
  try{
    const b=await buscarBackupCloud(false);
    if(b&&b.updated_at)ultimo=`Último backup na nuvem: ${new Date(b.updated_at).toLocaleString('pt-BR')}`;
  }catch(e){}
  box.innerHTML=`<div class="cloud-card">
    <div class="row"><div style="min-width:0"><div class="ti">☁️ Conta conectada</div>
      <div class="meta" style="overflow-wrap:anywhere">${esc(user.email||"Usuário")}</div></div>
      <span class="cloud-status on">Conectado</span></div>
    ${ultimo?`<div class="meta" style="margin-top:8px">${esc(ultimo)}</div>`:""}
    <div id="syncStatusBox" style="margin-top:10px"></div>
    <button class="btn" style="margin-top:10px" onclick="sincronizarAgora()">↻ Sincronizar agora</button>
    <div class="cloud-grid">
      <button class="btn btn-sec" onclick="salvarBackupCloud()">☁️ Backup na nuvem</button>
      <button class="btn btn-sec" onclick="restaurarBackupCloud()">↥ Restaurar backup</button>
    </div>
    <button class="btn btn-perigo" style="margin-top:14px;margin-bottom:0" onclick="confirmarLogout()">Sair da conta</button>
    <div class="cloud-note">A sincronização mantém seus dados atualizados entre aparelhos. A cópia de segurança serve como uma proteção adicional para recuperação.</div>
  </div>`;
  atualizarStatusSyncUI();
}
function formLoginCloud(){
  abrir(`<h2>Conta do Rebanho</h2>
    <div class="meta">Escolha como deseja continuar.</div>

    <button class="btn" style="margin-top:18px" onclick="formEntrarCloud()">Entrar</button>
    <button class="btn btn-sec" onclick="formCriarContaCloud()">Criar conta</button>

    <button class="btn-fant" onclick="fechar()">Cancelar</button>`);
}

function formEntrarCloud(msg=""){
  abrir(`<h2>Entrar</h2>
    ${msg?`<div class="card" style="background:#f3faf5;border-left:4px solid var(--verde);box-shadow:none;margin-bottom:14px">
      <b style="color:var(--verde-esc)">✅ Cadastro realizado com sucesso</b>
      <div class="meta" style="margin-top:4px">${esc(msg)}</div>
    </div>`:`<div class="meta">Use o e-mail e a senha da sua conta.</div>`}

    <label>E-mail</label>
    <input id="cl_email" type="email" autocomplete="email" placeholder="seu@email.com">

    <label>Senha</label>
    <input id="cl_senha" type="password" autocomplete="current-password" placeholder="Sua senha">

    <div id="cl_msg" class="meta" style="margin-top:10px"></div>

    <button class="btn" style="margin-top:18px" onclick="entrarCloud()">Entrar</button>
    <button class="btn btn-sec" onclick="formCriarContaCloud()">Ainda não tenho conta</button>
    <button class="btn-fant" onclick="formLoginCloud()">‹ Voltar</button>`);
}

function formCriarContaCloud(){
  abrir(`<h2>Criar conta</h2>
    <div class="meta">Crie sua conta para identificar e proteger os dados do rebanho.</div>

    <label>Nome *</label>
    <input id="cl_nome" autocomplete="name" placeholder="Seu nome">

    <label>E-mail *</label>
    <input id="cl_email" type="email" autocomplete="email" placeholder="seu@email.com">

    <label>Senha *</label>
    <input id="cl_senha" type="password" autocomplete="new-password" placeholder="Crie uma senha">

    <label>Confirmar senha *</label>
    <input id="cl_senha2" type="password" autocomplete="new-password" placeholder="Repita a senha">

    <div id="cl_msg" class="meta" style="margin-top:10px"></div>

    <button class="btn" style="margin-top:18px" onclick="criarContaCloud()">Criar conta</button>
    <button class="btn btn-sec" onclick="formEntrarCloud()">Já tenho conta</button>
    <button class="btn-fant" onclick="formLoginCloud()">‹ Voltar</button>`);
}
/* V154: mensagens do Supabase em português e proteção contra toque duplo nos botões de conta */
let _authOcupado=false;
function traduzirErroAuth(msg){
  const m=String(msg||"");
  if(/duplicate key|already registered|already exists|users_email_partial_key|User already/i.test(m))return "Este e-mail já tem cadastro. Use Entrar (ou recupere a senha).";
  if(/Invalid login credentials/i.test(m))return "E-mail ou senha incorretos.";
  if(/Email not confirmed|not confirmed|verified/i.test(m))return "Confirme sua conta pelo link enviado ao seu e-mail antes de entrar.";
  if(/rate limit|too many|security purposes/i.test(m))return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
  if(/Password should be|weak password/i.test(m))return "Senha fraca: use pelo menos 8 caracteres, misturando letras e números.";
  if(/invalid.*email|Unable to validate email/i.test(m))return "E-mail inválido. Confira o endereço digitado.";
  if(/Failed to fetch|NetworkError|Load failed/i.test(m))return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  return m||"Não foi possível concluir. Tente de novo.";
}
function travarBotoesConta(on){
  document.querySelectorAll("#md .btn,#md .btn-fant").forEach(b=>{b.disabled=on;b.style.opacity=on?".55":"";});
}
function cloudMsg(t,erro=false){
  const el=document.getElementById("cl_msg"); if(el){el.textContent=t;el.style.color=erro?"var(--perigo)":"var(--muted)";}
}
async function entrarCloud(){
  if(_authOcupado)return;
  const email=val("cl_email"),password=val("cl_senha");
  if(!email||!password)return cloudMsg("Informe e-mail e senha.",true);
  cloudMsg("Entrando…");
  _authOcupado=true;travarBotoesConta(true);
  try{
    const s=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{
      method:"POST",
      headers:{"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({email,password})
    }).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error_description||b.msg||b.message||"Não foi possível entrar.");return b;});
    saveAuthSession(s);
    await prepararContaLocal();
    await sincronizarPerfilCloud();
    await sincronizarAgora({silencioso:true});
    fechar(); irAba("inicio");
  }catch(e){
    cloudMsg(traduzirErroAuth(e.message||"Erro ao entrar."),true);
  }finally{_authOcupado=false;travarBotoesConta(false);}
}
async function criarContaCloud(){
  const nome=val("cl_nome"),email=val("cl_email"),password=val("cl_senha"),password2=val("cl_senha2");
  if(!nome)return cloudMsg("Informe seu nome para criar a conta.",true);
  if(!email)return cloudMsg("Informe seu e-mail.",true);
  if(!password)return cloudMsg("Crie uma senha.",true);
  if(password.length<8)return cloudMsg("A senha deve ter pelo menos 8 caracteres.",true);
  if(password!==password2)return cloudMsg("As senhas não coincidem.",true);
  if(_authOcupado)return;
  cloudMsg("Criando conta…");
  _authOcupado=true;travarBotoesConta(true);
  try{
    const r=await fetch(SUPABASE_URL+"/auth/v1/signup",{
      method:"POST",
      headers:{"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({email,password,data:{app:"Gestão do Rebanho",full_name:nome}})
    });
    const b=await r.json();
    if(!r.ok)throw new Error(b.msg||b.message||b.error_description||"Não foi possível criar a conta.");
    // O Supabase responde "ok" sem identidades quando o e-mail já existe (não revela a conta)
    const u=b.user||b;if(u&&Array.isArray(u.identities)&&u.identities.length===0)throw new Error("already registered");
    // Mesmo que o Supabase devolva sessão imediata, o fluxo da V56
    // sempre leva o usuário para a tela de login após o cadastro.
    saveAuthSession(null);
    formEntrarCloud("Confira seu e-mail e confirme a conta antes de entrar.");
  }catch(e){cloudMsg(traduzirErroAuth(e.message||"Erro ao criar conta."),true);}
  finally{_authOcupado=false;travarBotoesConta(false);}
}
function confirmarLogout(){
  if(!confirm("Deseja realmente sair da sua conta?"))return;
  sairCloud();
}
async function sairCloud(){
  try{await sbFetch("/auth/v1/logout",{method:"POST"});}catch(e){}
  saveAuthSession(null);
  const m=await garantirSyncMeta();
  m.active_user_id=null;
  m.active_org_id=null;
  await putRaw("sync_meta",m);
  aba="inicio";
  document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("ativo",x.dataset.aba==="inicio"));
  telaBloqueada();
}
async function cloudOrgId(){
  const u=await authUser(); if(!u)throw new Error("Entre na sua conta primeiro.");
  const rows=await sbFetch("/rest/v1/organization_members?select=organization_id&user_id=eq."+encodeURIComponent(u.id)+"&limit=1");
  if(!rows||!rows.length)throw new Error("Sua conta ainda não possui uma organização. Execute o SQL de configuração do Supabase no projeto.");
  return rows[0].organization_id;
}
async function cloudDeviceId(){
  const m=await garantirSyncMeta(); return m.device_id;
}

async function prepararContaLocal(){
  const user=await authUser(); if(!user)return null;
  const meta=await garantirSyncMeta();

  // Offline: mantém a organização previamente associada ao aparelho.
  if(!navigator.onLine){
    if(meta.active_user_id===user.id&&meta.active_org_id)return meta.active_org_id;
    return null;
  }

  const org=await cloudOrgId();
  meta.active_user_id=user.id;
  meta.active_org_id=org;

  // Na primeira adoção da V59, os dados antigos sem organização passam a
  // pertencer à primeira organização autenticada neste aparelho.
  if(!meta.legacy_claimed_org_id){
    for(const s of SYNC_STORES){
      const arr=await getAllRaw(s);
      for(const o of arr){
        if(!o.organization_id){
          o.organization_id=org;
          if(o.sync_status==="synced")o.sync_status="pending_update";
          else if(!o.sync_status)o.sync_status="pending_create";
          await putRaw(s,o);
        }
      }
    }
    meta.legacy_claimed_org_id=org;
  }

  await putRaw("sync_meta",meta);
  return org;
}

function payloadSync(o){
  const p={...o};
  delete p.sync_status;
  return p;
}
function cloudRecordToLocal(row){
  const p={...(row.payload||{})};
  p.id=p.id||row.record_id;
  p.organization_id=row.organization_id;
  p.updated_at=row.record_updated_at;
  p.deleted_at=row.deleted_at||null;
  p.sync_version=Number(row.sync_version||p.sync_version||1);
  p.sync_status="synced";
  return p;
}
function cloudMaisNovo(row,local){
  if(!local)return true;
  const ct=Date.parse(row.record_updated_at||0)||0;
  const lt=Date.parse(local.updated_at||0)||0;
  if(ct!==lt)return ct>lt;
  return Number(row.sync_version||0)>=Number(local.sync_version||0);
}
// Estritamente mais novo (usado para decidir o que rebaixar): evita reaplicar
// registros idênticos e não depende do relógio do servidor.
function cloudNewerStrict(row,local){
  if(!local)return true;
  const ct=Date.parse(row.record_updated_at||0)||0;
  const lt=Date.parse(local.updated_at||0)||0;
  if(ct!==lt)return ct>lt;
  return Number(row.sync_version||0)>Number(local.sync_version||0);
}

// V154: devolve (id -> linha completa da nuvem) dos registros em que a nuvem está estritamente mais nova
async function versoesMaisNovasNaNuvem(org,store,lote){
  const out=new Map();
  const inList="("+lote.map(o=>'"'+String(o.id)+'"').join(",")+")";
  const base="/rest/v1/sync_records?organization_id=eq."+encodeURIComponent(org)+"&store_name=eq."+encodeURIComponent(store)+"&record_id=in."+encodeURIComponent(inList);
  const manifesto=await sbFetch("/rest/v1/sync_records?select=record_id,record_updated_at,deleted_at,sync_version&"+base.split("?")[1])||[];
  const ids=manifesto.filter(r=>{const l=lote.find(o=>String(o.id)===String(r.record_id));return l&&cloudNewerStrict(r,l);}).map(r=>String(r.record_id));
  if(!ids.length)return out;
  const inIds="("+ids.map(x=>'"'+x+'"').join(",")+")";
  const rows=await sbFetch("/rest/v1/sync_records?select=organization_id,store_name,record_id,payload,record_updated_at,deleted_at,sync_version&organization_id=eq."+encodeURIComponent(org)+"&store_name=eq."+encodeURIComponent(store)+"&record_id=in."+encodeURIComponent(inIds))||[];
  for(const r of rows)out.set(String(r.record_id),r);
  return out;
}
async function pushPendentes(org,user,device){
  let enviados=0,recebidos=0;
  for(const s of SYNC_STORES){
    const locais=(await getAllRaw(s)).filter(o=>
      o.organization_id===org && o.sync_status!=="synced"
    );
    if(!locais.length)continue;

    // Lotes pequenos evitam requisições muito grandes quando houver fotos/base64.
    for(let i=0;i<locais.length;i+=25){
      let lote=locais.slice(i,i+25);
      // V154: antes de enviar, confere se a nuvem já tem uma versão MAIS NOVA do mesmo registro
      // (feita em outro aparelho). Nesse caso a versão da nuvem vale: é baixada e a local antiga
      // não é enviada. Sem isso, um aparelho que ficou offline com uma edição antiga sobrescrevia
      // a edição mais nova e os aparelhos ficavam com dados diferentes.
      const conflitos=await versoesMaisNovasNaNuvem(org,s,lote);
      if(conflitos.size){
        for(const [id,row] of conflitos){await putRaw(s,cloudRecordToLocal(row));recebidos++;}
        lote=lote.filter(o=>!conflitos.has(String(o.id)));
        if(!lote.length)continue;
      }
      const body=lote.map(o=>({
        organization_id:org,
        store_name:s,
        record_id:String(o.id),
        payload:payloadSync(o),
        record_updated_at:o.updated_at||agoraISO(),
        deleted_at:o.deleted_at||null,
        sync_version:Number(o.sync_version||1),
        updated_by:user.id,
        source_device_id:device
      }));
      const resp=await sbFetch("/rest/v1/sync_records?on_conflict=organization_id,store_name,record_id",{
        method:"POST",
        headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify(body)
      })||[];

      const mapa=new Map(resp.map(r=>[String(r.record_id),r]));
      for(const local of lote){
        const remoto=mapa.get(String(local.id));
        if(!remoto)continue;
        const atual=await getRaw(s,local.id);
        if(!atual)continue;

        if(cloudMaisNovo(remoto,atual) &&
           (Date.parse(remoto.record_updated_at||0)>Date.parse(atual.updated_at||0) ||
            Number(remoto.sync_version||0)>Number(atual.sync_version||0))){
          await putRaw(s,cloudRecordToLocal(remoto));
          recebidos++;
        }else{
          atual.organization_id=org;
          atual.sync_status="synced";
          await putRaw(s,atual);
        }
        enviados++;
      }
    }
  }
  return {enviados,recebidos};
}

async function pullCloud(org){
  /*
    V75: pull por reconciliação de conteúdo, independente de server_updated_at.

    Motivo: em tabelas padrão do Supabase, server_updated_at é definido no INSERT
    e NÃO muda no UPDATE (sem trigger). O pull incremental antigo (server_updated_at
    >= cursor) portanto NÃO enxergava EDIÇÕES feitas em outro aparelho — só
    inserções. Mover um animal de grupo/lote é uma edição, então não propagava.

    Agora, para cada store: baixamos um "manifesto" leve (só record_id +
    record_updated_at + sync_version + deleted_at, SEM payload/fotos), comparamos
    com o local pelo record_updated_at (que sempre avança a cada edição no app) e
    só baixamos o payload completo dos registros que realmente mudaram. Cobre
    inserções, edições e exclusões em TODAS as tabelas, sem depender do relógio
    do servidor e sem rebaixar fotos inalteradas.
  */
  let aplicados=0,consultados=0;
  const PAGE=500;
  for(const store of SYNC_STORES){
    // 1) Manifesto leve (paginado), só metadados.
    const remotos=[]; let offset=0;
    while(true){
      const path=
        "/rest/v1/sync_records?select=record_id,record_updated_at,deleted_at,sync_version"+
        "&organization_id=eq."+encodeURIComponent(org)+
        "&store_name=eq."+encodeURIComponent(store)+
        "&order=record_id.asc&limit="+PAGE+"&offset="+offset;
      const rows=await sbFetch(path)||[];
      remotos.push(...rows);
      offset+=rows.length;
      if(rows.length<PAGE)break;
    }
    consultados+=remotos.length;

    // 2) Decide quais precisam do payload completo (novos ou estritamente mais novos).
    const precisa=[];
    for(const r of remotos){
      const local=await getRaw(store,r.record_id);
      if(!local || cloudNewerStrict(r,local) ||
         (local.organization_id&&local.organization_id!==org)){
        precisa.push(String(r.record_id));
      }
    }
    if(!precisa.length)continue;

    // 3) Baixa o payload completo só dos que mudaram, em lotes.
    for(let i=0;i<precisa.length;i+=50){
      const ids=precisa.slice(i,i+50);
      const inList="("+ids.map(x=>'"'+x+'"').join(",")+")";
      const path=
        "/rest/v1/sync_records?select=organization_id,store_name,record_id,payload,record_updated_at,deleted_at,sync_version"+
        "&organization_id=eq."+encodeURIComponent(org)+
        "&store_name=eq."+encodeURIComponent(store)+
        "&record_id=in."+encodeURIComponent(inList);
      const rows=await sbFetch(path)||[];
      for(const row of rows){
        const local=await getRaw(store,row.record_id);
        const localDeOutraOrg=!!(local&&local.organization_id&&local.organization_id!==org);
        // Preserva alteração local pendente que seja mais nova que a nuvem.
        if(!local || localDeOutraOrg || local.sync_status==="synced" || cloudNewerStrict(row,local)){
          await putRaw(store,cloudRecordToLocal(row));
          aplicados++;
        }
      }
    }
  }
  // Mantém carimbo de tempo apenas para exibição; o pull não depende dele.
  const meta=await garantirSyncMeta();
  meta.last_server_sync_at=agoraISO();
  await putRaw("sync_meta",meta);
  return {aplicados,consultados,cursor:meta.last_server_sync_at};
}

async function marcarTudoSincronizado(org){
  // Depois do pull, itens iguais ao servidor já foram conciliados.
  // Mantém pendentes somente alterações que ocorreram durante a sincronização.
  for(const s of SYNC_STORES){
    const arr=await getAllRaw(s);
    for(const o of arr){
      if(o.organization_id!==org || o.sync_status==="synced")continue;
      // não força status aqui: um put simultâneo precisa continuar pendente
    }
  }
}

async function sincronizarAgora({silencioso=false}={}){
  if(_syncRunning)return _syncLastResult;
  if(!navigator.onLine){
    _syncLastError="Sem internet";
    if(!silencioso)alert("Sem internet. As alterações ficarão pendentes e serão sincronizadas quando a conexão voltar.");
    atualizarStatusSyncUI();
    return null;
  }
  const user=await authUser();
  if(!user){
    if(!silencioso)formLoginCloud();
    return null;
  }

  _syncRunning=true;_syncLastError="";
  atualizarStatusSyncUI("sincronizando");
  try{
    const org=await prepararContaLocal();
    if(!org)throw new Error("Não foi possível identificar a organização da conta.");
    const device=await cloudDeviceId();

    const push=await pushPendentes(org,user,device);
    const pull=await pullCloud(org);
    await numerarSemCodigo(); await migrarMedicamentosParaEstoque(); // V133/V142: animais antigos que chegaram de outro aparelho

    const meta=await garantirSyncMeta();
    meta.last_sync_at=agoraISO();
    meta.active_org_id=org;
    meta.active_user_id=user.id;
    await putRaw("sync_meta",meta);

    const totalAplicados=push.recebidos+pull.aplicados;
    _syncLastResult={...push,pull:pull.aplicados,consultados:pull.consultados,quando:meta.last_sync_at};
    atualizarStatusSyncUI("ok");

    // V74: atualiza automaticamente tanto a lista de grupos quanto o detalhe
    // do grupo que estiver aberto. Isso faz um novo vínculo aparecer na tela
    // assim que chegar de outro aparelho, sem fechar/reabrir o PWA.
    if(totalAplicados>0){
      const syncScreen=$t.dataset.syncScreen||"";
      if(syncScreen==="grupos")await telaGrupos();
      else if(syncScreen.startsWith("grupo:"))await verGrupo(syncScreen.slice(6));
    }

    if(!silencioso){
      alert(`Sincronização concluída.\nEnviados: ${push.enviados}\nRecebidos/aplicados: ${totalAplicados}`);
      // No Perfil, atualiza contadores/status. Nas subtelas, preserva a tela.
      if(aba==="perfil")await renderSeguro();
    }
    return _syncLastResult;
  }catch(e){
    _syncLastError=e.message||String(e);
    atualizarStatusSyncUI("erro");
    if(!silencioso)alert("Não foi possível sincronizar: "+_syncLastError);
    return null;
  }finally{
    _syncRunning=false;
  }
}

async function statusSync(){
  const meta=await garantirSyncMeta();
  let pendentes=0;
  if(meta.active_org_id){
    for(const s of SYNC_STORES){
      const arr=await getAllRaw(s);
      pendentes+=arr.filter(o=>o.organization_id===meta.active_org_id&&o.sync_status!=="synced").length;
    }
  }
  return {pendentes,last_sync_at:meta.last_sync_at,erro:_syncLastError};
}
async function atualizarStatusSyncUI(forcar=""){
  const el=document.getElementById("syncStatusBox"); if(!el)return;
  const st=await statusSync();
  if(forcar==="sincronizando"||_syncRunning){
    el.innerHTML=`<span class="cloud-status">↻ Sincronizando…</span>`;
    return;
  }
  if(forcar==="erro"||st.erro){
    el.innerHTML=`<span class="cloud-status" style="background:#fff2ee;color:var(--perigo)">⚠ Falha na sincronização</span>
      <div class="cloud-note">${esc(st.erro||"Tente novamente.")}</div>`;
    return;
  }
  const quando=st.last_sync_at?new Date(st.last_sync_at).toLocaleString("pt-BR"):"Ainda não sincronizado";
  el.innerHTML=`<span class="cloud-status ${st.pendentes===0?"on":""}">
      ${st.pendentes===0?"✓ Sincronizado":`${st.pendentes} pendente(s)`}
    </span><div class="cloud-note">${esc(quando)}</div>`;
}

let _ultimoAutoSync=0;
let _autoSyncInterval=null;
const AUTO_SYNC_INTERVAL_MS=30000;

function solicitarAutoSync(delay=350,{ignorarJanela=false}={}){
  // No iPhone não tentamos manter o app trabalhando em segundo plano.
  // Assim que ele volta a ficar visível, o visibilitychange/pageshow dispara
  // uma nova sincronização.
  if(document.visibilityState==="hidden"||!authSession()||!navigator.onLine||_syncRunning)return;
  const agora=Date.now();
  // Evita três sincronizações seguidas quando focus/pageshow/visibilitychange
  // disparam juntos ao voltar para o PWA. A sincronização periódica continua
  // livre para rodar a cada 30 s enquanto a tela estiver ativa.
  if(!ignorarJanela&&agora-_ultimoAutoSync<12000)return;
  _ultimoAutoSync=agora;
  clearTimeout(_syncTimer);
  _syncTimer=setTimeout(async()=>{
    try{
      await prepararContaLocal();
      await sincronizarAgora({silencioso:true});
      atualizarStatusSyncUI();
    }catch(e){
      _syncLastError=e.message||String(e);
      console.warn("Sincronização em segundo plano:",e);
      atualizarStatusSyncUI("erro");
    }
  },delay);
}

window.addEventListener("online",()=>solicitarAutoSync(300,{ignorarJanela:true}));
window.addEventListener("pageshow",()=>solicitarAutoSync(450));
window.addEventListener("focus",()=>solicitarAutoSync(450));
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")solicitarAutoSync(300,{ignorarJanela:true});
});

function iniciarSyncEmSegundoPlano(){
  // A sincronização jamais participa do caminho crítico de abertura da interface.
  // Faz uma primeira tentativa logo após renderizar e, enquanto o PWA estiver
  // realmente aberto/visível, consulta alterações dos outros aparelhos a cada
  // 30 segundos. O intervalo não tenta executar quando o app está oculto.
  solicitarAutoSync(350,{ignorarJanela:true});
  if(_autoSyncInterval)clearInterval(_autoSyncInterval);
  _autoSyncInterval=setInterval(()=>{
    if(document.visibilityState==="visible"&&navigator.onLine&&authSession()){
      solicitarAutoSync(0,{ignorarJanela:true});
    }
  },AUTO_SYNC_INTERVAL_MS);
}
async function salvarBackupCloud(){
  if(!navigator.onLine)return alert("Sem internet. O backup local continua disponível.");
  try{
    const u=await authUser(); if(!u)return formLoginCloud();
    const org=await cloudOrgId(),device=await cloudDeviceId(),payload=await dadosBackup();
    const body={user_id:u.id,organization_id:org,device_id:device,payload,app_version:CLOUD_APP_VERSION,updated_at:new Date().toISOString()};
    await sbFetch("/rest/v1/cloud_backups?on_conflict=user_id,device_id",{
      method:"POST",
      headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
      body:JSON.stringify(body)
    });
    await marcarBackup(); _lembreteOculto=true;
    alert("Backup salvo na nuvem com sucesso.");
    telaPerfil();
  }catch(e){alert("Não foi possível salvar na nuvem: "+e.message);}
}
async function buscarBackupCloud(mostrarErro=true){
  try{
    const u=await authUser(); if(!u)throw new Error("Entre na sua conta primeiro.");
    const rows=await sbFetch("/rest/v1/cloud_backups?select=id,payload,created_at,updated_at,device_id,app_version&user_id=eq."+encodeURIComponent(u.id)+"&order=updated_at.desc&limit=1");
    return rows&&rows.length?rows[0]:null;
  }catch(e){if(mostrarErro)alert("Não foi possível consultar a nuvem: "+e.message);return null;}
}
async function restaurarBackupCloud(){
  if(!navigator.onLine)return alert("Você precisa de internet para restaurar o backup da nuvem.");
  const b=await buscarBackupCloud(); if(!b)return alert("Nenhum backup encontrado na sua conta.");
  const quando=new Date(b.updated_at||b.created_at).toLocaleString("pt-BR");
  if(!confirm(`Restaurar o backup da nuvem de ${quando}? Isso substituirá os dados locais deste aparelho.`))return;
  try{
    await restaurarDadosBackup(b.payload,false);
    await marcarBackup();
    alert("Backup da nuvem restaurado com sucesso.");
    irAba("painel");
  }catch(e){alert("Não foi possível restaurar: "+e.message);}
}

async function buscarPerfilCloud(){
  const u=await authUser(); if(!u)return null;
  const rows=await sbFetch("/rest/v1/profiles?select=user_id,full_name,role_title,location,phone,avatar_data,updated_at&user_id=eq."+encodeURIComponent(u.id)+"&limit=1");
  return rows&&rows.length?rows[0]:null;
}
function perfilCloudParaLocal(cp,user){
  return {
    id:"perfil",
    user_id:user.id,
    nome:(cp&&cp.full_name)||((user.user_metadata||{}).full_name)||"",
    funcao:(cp&&cp.role_title)||"",
    localizacao:(cp&&cp.location)||"",
    telefone:(cp&&cp.phone)||"",
    foto:(cp&&cp.avatar_data)||"",
    email:user.email||"",
    cloud_updated_at:(cp&&cp.updated_at)||null
  };
}
async function sincronizarPerfilCloud(){
  const user=await authUser(); if(!user)return null;
  let local=await get("perfil","perfil");
  if(!navigator.onLine){
    if(local){local.email=user.email||local.email||"";return local;}
    return perfilCloudParaLocal(null,user);
  }
  try{
    const cp=await buscarPerfilCloud();
    const p=perfilCloudParaLocal(cp,user);
    await put("perfil",p);
    return p;
  }catch(e){
    if(local){local.email=user.email||local.email||"";return local;}
    return perfilCloudParaLocal(null,user);
  }
}
async function carregarPerfilIntegrado(user){
  const local=await get("perfil","perfil");
  if(navigator.onLine){
    try{return await sincronizarPerfilCloud();}catch(e){}
  }
  if(local){
    local.email=user.email||local.email||"";
    return local;
  }
  return perfilCloudParaLocal(null,user);
}

/* ---------- Perfil do usuário ---------- */
const iniciais=nome=>((nome||"").trim().split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase()||"?");
const avatarHTML=(foto,nome)=>foto?`<img src="${foto}" alt="">`:`<span>${esc(iniciais(nome))}</span>`;
function lerFotoRedimensionada(file,cb){
  const rd=new FileReader();
  rd.onload=e=>{const img=new Image();
    img.onload=()=>{let w=img.width,h=img.height;const max=400;
      if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);cb(c.toDataURL("image/jpeg",0.82));};
    img.src=e.target.result;};
  rd.readAsDataURL(file);
}
function pickFoto(input){const f=input.files[0];if(!f)return;
  lerFotoRedimensionada(f,d=>{_perfilFoto=d;document.getElementById("pf_avatar").innerHTML=`<img src="${d}" alt="">`;});}
function pickFotoAnimal(input){const f=input.files[0];if(!f)return;
  lerFotoRedimensionada(f,d=>{_animalFoto=d;const el=document.getElementById("an_avatar");if(el)el.innerHTML=`<img src="${d}" alt="">`;});}
// Miniatura do animal para listas e ficha (foto ou 🐄)
const animalThumb=(a,size)=>`<div class="an-thumb" style="width:${size}px;height:${size}px">${a.foto?`<img src="${esc(a.foto)}" alt="">`:"🐄"}</div>`;
// Amplia uma foto em tela cheia; toque em qualquer lugar fecha
function ampliarFoto(src){
  if(!src)return;
  const d=document.createElement("div");
  d.className="lightbox";
  const img=document.createElement("img");img.src=src;
  d.appendChild(img);
  const x=document.createElement("div");x.className="lb-x";x.textContent="✕";
  d.appendChild(x);
  d.onclick=()=>d.remove();
  document.body.appendChild(d);
}
async function ampliarFotoAnimal(id){const a=await get("animais",id);if(a&&a.foto)ampliarFoto(a.foto);}
async function pickFotoPropriedade(pid,input){
  const f=input.files[0];if(!f)return;
  lerFotoRedimensionada(f,async d=>{
    const p=await get("propriedades",pid);if(!p)return;
    p.foto=d;
    await put("propriedades",p);
    verPropriedade(pid);
  });
}
async function formPerfil(){
  const user=await authUser();
  if(!user)return formLoginCloud();
  const p=await carregarPerfilIntegrado(user);
  _perfilFoto=p.foto||"";
  abrir(`<h2>Editar perfil</h2>
    <div style="display:flex;justify-content:center;margin:6px 0 8px">
      <div class="avatar-wrap" onclick="document.getElementById('pf_file').click()">
        <div class="avatar" id="pf_avatar">${avatarHTML(_perfilFoto,p.nome||user.email)}</div><div class="avatar-cam">📷</div>
      </div>
    </div>
    <input type="file" id="pf_file" accept="image/*" style="display:none" onchange="pickFoto(this)">
    <label>Nome *</label><input id="pf_nome" value="${esc(p.nome||"")}">
    <label>Função na gestão</label><input id="pf_funcao" value="${esc(p.funcao||"")}" placeholder="Ex: Proprietário, Gerente, Veterinário…">
    <label>Localização</label><input id="pf_local" value="${esc(p.localizacao||"")}" placeholder="Ex: Campos - RJ">
    <label>E-mail da conta</label><input type="email" value="${esc(user.email||"")}" disabled style="background:#f4f6f4;color:var(--muted)">
    <label>Telefone</label><input id="pf_tel" type="tel" value="${esc(p.telefone||"")}" placeholder="Ex: (22) 99999-9999">
    <div class="meta" style="margin-top:8px">O e-mail pertence à sua conta. Nome, foto e demais dados formam o seu perfil.</div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarPerfil()">Salvar</button></div>`);
}
async function salvarPerfil(){
  const user=await authUser();
  if(!user)return alert("Entre na sua conta primeiro.");
  const nome=val("pf_nome");if(!nome)return alert("Informe seu nome.");
  const p=(await get("perfil","perfil"))||{id:"perfil"};
  p.id="perfil";p.user_id=user.id;p.nome=nome;p.funcao=val("pf_funcao");p.localizacao=val("pf_local");
  p.email=user.email||"";p.telefone=val("pf_tel");p.foto=_perfilFoto||"";
  await put("perfil",p);

  if(navigator.onLine){
    try{
      await sbFetch("/rest/v1/profiles?on_conflict=user_id",{
        method:"POST",
        headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify({
          user_id:user.id,
          full_name:p.nome,
          role_title:p.funcao||null,
          location:p.localizacao||null,
          phone:p.telefone||null,
          avatar_data:p.foto||null,
          updated_at:new Date().toISOString()
        })
      });
    }catch(e){
      alert("Perfil salvo neste aparelho, mas não foi possível atualizar a nuvem agora: "+e.message);
      fechar();telaPerfil();return;
    }
  }
  fechar();telaPerfil();
}
async function gerenciarMarcas(){
  if(!(await podeUsarApp("Gerenciar marcas / donos")))return;
  const marcas=await getAll("marcas");
  let lst=marcas.map(m=>`<div class="sheet-item"><span class="si">🏷</span>
    <div style="flex:1"><b>${esc(m.sigla)}</b> ${m.nome?`· ${esc(m.nome)}`:""}</div>
    <button class="btn-fant" style="padding:4px;color:var(--perigo)" onclick="del('marcas','${m.id}').then(gerenciarMarcas)">✕</button></div>`).join("")||`<div class="meta">Nenhuma marca ainda.</div>`;
  abrir(`<h2>Marcas / donos</h2>${lst}
    <label>Nova marca — sigla *</label><input id="m_sig" placeholder="Ex: SJ">
    <label>Nome do dono (opcional)</label><input id="m_nome" placeholder="Ex: Sítio São João">
    <div class="lado" style="margin-top:16px"><button class="btn btn-sec" onclick="fechar()">Fechar</button>
      <button class="btn" onclick="salvarMarca()">Adicionar</button></div>`);
}
async function salvarMarca(){const s=val("m_sig");if(!s)return alert("Informe a sigla.");
  await put("marcas",{id:uid(),sigla:s,nome:val("m_nome")});gerenciarMarcas();}
