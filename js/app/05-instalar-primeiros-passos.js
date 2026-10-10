/* Gestão do Rebanho — js/app/05-instalar-primeiros-passos.js
   Tela de instalação do app e cadastro inicial obrigatório.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= V134: INSTALAR O APP =======================
   PWA: Android e computador (Chrome/Edge) oferecem o instalador do navegador
   (evento beforeinstallprompt); no iPhone a Apple só permite pelo Safari →
   Compartilhar → Adicionar à Tela de Início, então mostramos o passo a passo. */
let _promptInstalar=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();_promptInstalar=e;});
window.addEventListener("appinstalled",()=>{_promptInstalar=null;try{localStorage.setItem("rebanho_instalado","1");}catch(_){}});
const appInstalado=()=>window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
const ehIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const linkDoApp=()=>{const u=new URL("./",location.href);return u.origin+u.pathname;};
const icoCompartilhar=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-5px"><path d="M8 7l4-4 4 4"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>`;
const icoAdicionar=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
function telaInstalar(){
  topoPagina();fechar();
  const passo=(n,html)=>`<div class="row" style="justify-content:flex-start;gap:12px;align-items:flex-start;padding:10px 0;${n>1?"border-top:1px solid var(--linha)":""}">
      <div style="min-width:30px;height:30px;border-radius:50%;background:var(--verde);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</div>
      <div style="flex:1;line-height:1.5">${html}</div></div>`;
  let corpo;
  if(appInstalado()){
    corpo=`<div class="card" style="cursor:default;border-left:4px solid var(--verde)"><div class="ti">✅ O app já está instalado neste aparelho</div>
      <div class="meta" style="margin-top:6px">Você está usando o app pelo ícone da tela inicial. As atualizações chegam sozinhas.</div></div>`;
  }else if(ehIOS()){
    corpo=`<div class="card" style="cursor:default"><div class="ti" style="margin-bottom:4px">📱 No iPhone ou iPad</div>
      ${passo(1,"Abra este app no <b>Safari</b> (o navegador da bússola azul).")}
      ${passo(2,`Toque em <b>Compartilhar</b> ${icoCompartilhar} — na barra de baixo (ou no alto, no iPad).`)}
      ${passo(3,`Role a lista e toque em <b>Adicionar à Tela de Início</b> ${icoAdicionar}.`)}
      ${passo(4,"Toque em <b>Adicionar</b>. O ícone do boi aparece na tela inicial; abra sempre por ele.")}</div>
      <div class="meta" style="margin:0 4px 12px">Se estiver em outro navegador (Chrome, por exemplo), o caminho é parecido: menu Compartilhar → Adicionar à Tela de Início.</div>`;
  }else if(_promptInstalar){
    corpo=`<div class="card" style="cursor:default"><div class="ti">📲 Instalar neste aparelho</div>
      <div class="meta" style="margin:6px 0 12px">O app ganha ícone na tela inicial e abre em tela cheia, como um aplicativo comum. Funciona também sem internet.</div>
      <button class="btn" style="margin:0" onclick="instalarAgora()">Instalar agora</button></div>`;
  }else{
    corpo=`<div class="card" style="cursor:default"><div class="ti" style="margin-bottom:4px">📲 No Android ou no computador</div>
      ${passo(1,"Abra este app no <b>Chrome</b> (ou Edge).")}
      ${passo(2,"Toque no menu <b>⋮</b> (três pontinhos).")}
      ${passo(3,"Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b> e confirme.")}</div>`;
  }
  $t.innerHTML=`<button class="voltar" onclick="renderSeguro()">‹ Voltar</button>
    <div class="sechead"><span class="sic">📲</span><h2>Instalar o app</h2></div>
    ${corpo}
    <div class="card" style="cursor:default"><div class="ti">🤝 Enviar para outra pessoa</div>
      <div class="meta" style="margin:6px 0 10px;overflow-wrap:anywhere">${esc(linkDoApp())}</div>
      <button class="btn btn-sec" style="margin:0" onclick="compartilharLinkApp()">Compartilhar o link</button></div>`;
}
async function instalarAgora(){
  if(!_promptInstalar)return telaInstalar();
  _promptInstalar.prompt();
  try{const r=await _promptInstalar.userChoice;if(r&&r.outcome==="accepted"){try{localStorage.setItem("rebanho_instalado","1");}catch(_){}}}catch(_){}
  _promptInstalar=null;telaInstalar();
}
async function compartilharLinkApp(){
  const url=linkDoApp(),texto="Gestão do Rebanho — app para controle do rebanho e das finanças da propriedade.";
  try{if(navigator.share){await navigator.share({title:"Gestão do Rebanho",text:texto,url});return;}}catch(_){return;}
  try{await navigator.clipboard.writeText(url);alert("Link copiado. Cole no WhatsApp ou onde quiser.");}catch(_){prompt("Copie o link:",url);}
}
function avisoInstalarHome(){
  if(appInstalado())return "";
  try{if(localStorage.getItem("rebanho_aviso_instalar_oculto")==="1")return "";}catch(_){}
  return `<div class="card" id="aviso_instalar" style="border-left:4px solid var(--verde);cursor:default">
    <div class="ti" style="font-size:15px">📲 Instale o app no seu celular</div>
    <div class="meta" style="margin:4px 0 10px">Fica com ícone na tela inicial, abre em tela cheia e funciona sem internet.</div>
    <div class="lado"><button class="btn" style="margin:0" onclick="telaInstalar()">Como instalar</button>
      <button class="btn btn-sec" style="margin:0" onclick="try{localStorage.setItem('rebanho_aviso_instalar_oculto','1')}catch(_){};document.getElementById('aviso_instalar').remove()">Agora não</button></div></div>`;
}

/* ======================= V126: PRIMEIROS PASSOS =======================
   Conta sem nenhum animal e sem o cadastro básico é levada, na ordem, a cadastrar:
   1) propriedade  2) marca / dono  3) lote  4) pasto.
   Antes de decidir, se este aparelho nunca sincronizou, busca os dados da nuvem
   (quem já usa o app em outro aparelho não precisa refazer nada). */
let _onbSyncTentado=false;
async function pendenciasIniciais(){
  if(!_onbSyncTentado){
    _onbSyncTentado=true;
    try{
      const m=await garantirSyncMeta();
      if(!m.last_sync_at&&navigator.onLine&&authSession()){
        $t.innerHTML=`<div class="vazio" style="padding-top:60px"><div class="big">☁️</div><b>Carregando seus dados…</b><div class="meta">Buscando o que já está salvo na sua conta.</div></div>`;
        await sincronizarAgora({silencioso:true});
      }
    }catch(e){}
  }
  const [props,marcas,lotes,pastos,animais]=await Promise.all(["propriedades","marcas","lotes","pastos","animais"].map(getAll));
  if(animais.length)return null; // quem já tem animais não é bloqueado
  const passos=[
    {k:"propriedade",ok:props.length>0,titulo:"Propriedade",ic:"🏡"},
    {k:"marca",ok:marcas.length>0,titulo:"Marca / dono",ic:"🏷"},
    {k:"lote",ok:lotes.length>0,titulo:"Lote",ic:"▤"},
    {k:"pasto",ok:pastos.length>0,titulo:"Pasto",ic:"🌱"}
  ];
  if(passos.every(p=>p.ok))return null;
  return {passos,props,marcas,lotes,pastos};
}
async function exigirCadastroInicial(){
  const pend=await pendenciasIniciais();
  if(pend){aba="inicio";marcarNav("inicio");telaPrimeirosPassos(pend);return true;}
  return false;
}
async function telaPrimeirosPassos(pend){
  pend=pend||await pendenciasIniciais();
  if(!pend)return renderSeguro();
  topoPagina();
  const {passos,props,lotes}=pend;
  const atual=passos.find(p=>!p.ok),n=passos.indexOf(atual)+1;
  const lista=passos.map((p,i)=>`<div class="row" style="padding:9px 0;${i?"border-top:1px solid var(--linha)":""}">
      <div style="font-weight:${p===atual?800:600};color:${p.ok?"var(--verde)":p===atual?"var(--texto)":"var(--muted)"}">${p.ic} ${i+1}. ${p.titulo}</div>
      <div class="meta" style="font-weight:700;color:${p.ok?"var(--verde)":"var(--muted)"}">${p.ok?"✓ feito":p===atual?"agora":"depois"}</div></div>`).join("");
  const optProp=props.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join("");
  const optLote=lotes.map(l=>`<option value="${l.id}">${esc(l.nome)}</option>`).join("");
  let form="";
  if(atual.k==="propriedade")form=`
    <div class="meta">Onde o rebanho fica. Você pode cadastrar outras depois.</div>
    <label>Nome da propriedade *</label><input id="onb_nome" placeholder="Ex: Sítio Árvore">
    <label>Localização</label><input id="onb_local" placeholder="Ex: Campos dos Goytacazes - RJ">`;
  else if(atual.k==="marca")form=`
    <div class="meta">Identifica o dono dos animais (a marca a ferro). Todo animal precisa de uma.</div>
    <label>Sigla da marca *</label><input id="onb_sigla" placeholder="Ex: SJ">
    <label>Nome do dono</label><input id="onb_dono" placeholder="Ex: Saulo Jardim">`;
  else if(atual.k==="lote")form=`
    <div class="meta">Grupo de animais manejados juntos. Todo animal fica em um lote.</div>
    ${props.length>1?`<label>Propriedade *</label><select id="onb_prop">${optProp}</select>`:`<input type="hidden" id="onb_prop" value="${props[0].id}">`}
    <label>Nome do lote *</label><input id="onb_nome" placeholder="Ex: Engorda 2026">
    <label>Descrição</label><input id="onb_desc" placeholder="Ex: garrotes comprados em setembro">`;
  else form=`
    <div class="meta">A área onde o lote está. Depois dá para cadastrar os outros pastos em Gestão de Pastos.</div>
    ${props.length>1?`<label>Propriedade *</label><select id="onb_prop">${optProp}</select>`:`<input type="hidden" id="onb_prop" value="${props[0].id}">`}
    <label>Nome do pasto *</label><input id="onb_nome" placeholder="Ex: Pasto da Frente">
    <div class="lado"><div><label>Área (ha)</label><input id="onb_area" inputmode="decimal" placeholder="Ex: 12"></div>
      <div><label>Capim</label><input id="onb_capim" placeholder="Ex: Braquiária"></div></div>
    <label>Situação</label><select id="onb_status">
      ${lotes.length?`<option value="Ocupado">Ocupado pelo lote</option>`:""}<option value="Livre">Livre</option><option value="Descanso">Em descanso</option></select>
    ${lotes.length>1?`<label>Lote no pasto</label><select id="onb_lote">${optLote}</select>`:(lotes.length?`<input type="hidden" id="onb_lote" value="${lotes[0].id}">`:"")}`;
  $t.innerHTML=`<div class="sechead" style="margin-top:6px"><span class="sic">🚀</span><h2>Primeiros passos</h2></div>
    <div class="meta" style="margin:-6px 4px 14px">Antes de cadastrar animais, o app precisa destes 4 cadastros básicos. Leva menos de 2 minutos.</div>
    <div class="card" style="cursor:default">${lista}</div>
    <div class="card" style="cursor:default;border-left:4px solid var(--verde)">
      <div class="meta" style="font-weight:700;color:var(--verde)">Passo ${n} de 4</div>
      <div class="ti" style="font-size:19px;margin-bottom:4px">${atual.ic} ${atual.titulo}</div>
      ${form}
      <button class="btn" style="margin:18px 0 0" onclick="salvarPassoInicial('${atual.k}')">Salvar e continuar</button>
    </div>
    <div class="meta" style="margin:6px 4px">Já usa o app em outro aparelho? Entre com a mesma conta e toque em Perfil → Sincronizar agora, ou restaure um backup.</div>`;
}
async function salvarPassoInicial(k){
  const nome=((document.getElementById("onb_nome")||{}).value||"").trim().replace(/\s+/g," ");
  if(k==="propriedade"){
    if(!nome)return alert("Informe o nome da propriedade.");
    await put("propriedades",{id:uid(),nome,local:val("onb_local"),criadoEm:Date.now()});
  }else if(k==="marca"){
    const sigla=val("onb_sigla");if(!sigla)return alert("Informe a sigla da marca.");
    await put("marcas",{id:uid(),sigla,nome:val("onb_dono")});
  }else if(k==="lote"){
    if(!nome)return alert("Dê um nome ao lote.");
    const dup=await loteComMesmoNome(nome);if(dup)return alert(`Já existe um lote chamado "${dup.nome}".`);
    await put("lotes",{id:uid(),nome,descricao:val("onb_desc"),propriedadeId:val("onb_prop"),criadoEm:Date.now()});
  }else if(k==="pasto"){
    if(!nome)return alert("Dê um nome ao pasto.");
    const status=val("onb_status")||"Livre";
    await put("pastos",{id:uid(),propriedadeId:val("onb_prop"),nome,areaHa:numBR("onb_area"),tipoCapim:val("onb_capim"),
      status,loteId:status==="Ocupado"?(val("onb_lote")||null):null,criadoEm:Date.now(),statusDesde:Date.now(),historico:[]});
  }
  const pend=await pendenciasIniciais();
  if(pend)return telaPrimeirosPassos(pend);
  // concluído
  $t.innerHTML=`<div class="vazio" style="padding-top:40px"><div class="big">✅</div><b style="font-size:20px">Tudo pronto!</b>
      <div class="meta" style="margin:8px 0 22px">Propriedade, marca, lote e pasto cadastrados. Agora você já pode cadastrar os animais.</div></div>
    <button class="btn" onclick="abrirAnimaisOperacional();formNovoAnimal()">🐄 Cadastrar o primeiro animal</button>
    <button class="btn btn-sec" onclick="irAba('inicio')">Ir para o início</button>`;
}
