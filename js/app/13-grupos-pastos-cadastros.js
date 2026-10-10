/* Gestão do Rebanho — js/app/13-grupos-pastos-cadastros.js
   Grupos, cadastro de pastos, saída de animal e edição do animal.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ---------- GRUPOS DE ANIMAIS ----------
   Um animal continua com apenas UM lote atual, mas pode participar de vários
   grupos simultaneamente (ex.: IATF 2026, Novilhas, Protocolo sanitário). */
async function telaGrupos(){
  topoPagina();
  $t.dataset.syncScreen="grupos";
  const {grupos,grupo_animais,animais}=await tudo();
  const ativos=new Set(animais.filter(a=>a.status==="Ativo").map(a=>a.id));
  const conta=gid=>grupo_animais.filter(v=>v.grupoId===gid&&ativos.has(v.animalId)).length;
  let itens=grupos.map(g=>`<div class="card row rt" onclick="verGrupo('${g.id}')">
    <div><div class="ti">👥 ${esc(g.nome)}</div>${g.descricao?`<div class="meta">${esc(g.descricao)}</div>`:""}</div>
    <span class="badge">${conta(g.id)} 🐄</span></div>`).join("");
  $t.innerHTML=`<button class="voltar" onclick="telaLotesGrupos()">‹ Lotes e Grupos</button>
    <div class="sechead"><span class="sic">👥</span><h2>Grupos</h2></div>
    <div class="meta" style="margin:-8px 4px 14px">O lote indica onde o animal está. Grupos são classificações simultâneas e não alteram o lote atual.</div>
    <button class="btn" onclick="formNovoGrupo()">+ Novo grupo</button>
    ${itens||`<div class="vazio"><div class="big">👥</div><b>Nenhum grupo</b><div class="meta">Crie grupos para reunir animais por finalidade, protocolo ou categoria.</div></div>`}`;
}
async function formNovoGrupo(id){
  if(!(await podeUsarApp(id?"Editar grupo":"Cadastrar grupo")))return;
  const g=id?await get("grupos",id):null;
  abrir(`<h2>${g?"Editar grupo":"Novo grupo"}</h2>
    <label>Nome *</label><input id="g_nome" value="${g?esc(g.nome||""):""}" placeholder="Ex: IATF 2026">
    <label>Descrição / finalidade</label><input id="g_desc" value="${g?esc(g.descricao||""):""}" placeholder="Ex: Novilhas do protocolo de reprodução">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarGrupoAnimal('${id||""}')">Salvar</button></div>`);
}
async function salvarGrupoAnimal(id){
  const nome=val("g_nome");if(!nome)return alert("Informe o nome do grupo.");
  const g=id?(await get("grupos",id)):{id:uid(),criadoEm:Date.now()};
  g.nome=nome;g.descricao=val("g_desc");
  await put("grupos",g);fechar();telaGrupos();
}
async function verGrupo(id){
  topoPagina();
  $t.dataset.syncScreen="grupo:"+id;
  const g=await get("grupos",id);if(!g)return telaGrupos();
  const {animais,lotes,grupo_animais}=await tudo();
  const ids=new Set(grupo_animais.filter(v=>v.grupoId===id).map(v=>v.animalId));
  const membros=animais.filter(a=>ids.has(a.id)&&a.status==="Ativo");
  const nomeLote=lid=>(lotes.find(l=>l.id===lid)||{}).nome||"—";
  const itens=membros.map(a=>`<div class="card row">
    <div class="rt" style="flex:1" onclick="verAnimal('${a.id}')"><div class="ti">${esc(rotulo(a))} ${(a.brinco||a.nome)?`<span class="chip chip-id">${codAnimal(a)}</span>`:""}</div><div class="meta">▦ ${esc(nomeLote(a.loteAtualId))}</div></div>
    <button class="btn-fant" style="padding:5px 8px;color:var(--perigo)" onclick="removerAnimalGrupo('${id}','${a.id}')">✕</button></div>`).join("");
  $t.innerHTML=`<button class="voltar" onclick="telaGrupos()">‹ Grupos</button>
    <div class="card"><div class="ti" style="font-size:20px">👥 ${esc(g.nome)}</div>${g.descricao?`<div class="meta">${esc(g.descricao)}</div>`:""}<div class="meta" style="margin-top:5px">${membros.length} animal(is) ativo(s)</div></div>
    <button class="btn" onclick="adicionarAnimaisGrupo('${id}')">+ Adicionar animais</button>
    <div class="lado"><button class="btn btn-sec" onclick="formNovoGrupo('${id}')">✎ Editar grupo</button><button class="btn btn-perigo" onclick="excluirGrupo('${id}')">Excluir grupo</button></div>
    <div class="h3">Animais do grupo</div>${itens||`<div class="meta">Nenhum animal neste grupo.</div>`}`;
}
async function adicionarAnimaisGrupo(grupoId){
  const animais=(await getAll("animais")).filter(a=>a.status==="Ativo");
  const vinculos=await getAll("grupo_animais");
  const ja=new Set(vinculos.filter(v=>v.grupoId===grupoId).map(v=>v.animalId));
  const disp=animais.filter(a=>!ja.has(a.id));
  if(!disp.length)return alert("Todos os animais ativos já pertencem a este grupo.");
  const opts=disp.map(a=>`<label style="display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--linha);padding:11px 2px;margin:0;color:var(--texto)"><input type="checkbox" class="ga_ck" value="${a.id}" style="width:20px;height:20px"> <span>${esc(rotuloCod(a))}</span></label>`).join("");
  abrir(`<h2>Adicionar ao grupo</h2><div class="meta" style="margin-bottom:10px">Selecione um ou vários animais.</div>${opts}
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarAnimaisGrupo('${grupoId}')">Adicionar</button></div>`);
}
async function salvarAnimaisGrupo(grupoId){
  const ids=[...document.querySelectorAll(".ga_ck:checked")].map(x=>x.value);
  if(!ids.length)return alert("Selecione pelo menos um animal.");
  const existentes=await getAll("grupo_animais");
  for(const animalId of ids){
    if(existentes.some(v=>v.grupoId===grupoId&&v.animalId===animalId))continue;
    await put("grupo_animais",{id:uid(),grupoId,animalId,criadoEm:Date.now()});
  }
  fechar();verGrupo(grupoId);
}
async function removerAnimalGrupo(grupoId,animalId){
  const v=(await getAll("grupo_animais")).find(x=>x.grupoId===grupoId&&x.animalId===animalId);if(!v)return;
  await del("grupo_animais",v.id);verGrupo(grupoId);
}
async function excluirGrupo(id){
  const g=await get("grupos",id);if(!g)return;
  if(!confirm(`Excluir o grupo "${g.nome}"? Os animais não serão apagados.`))return;
  const vs=(await getAll("grupo_animais")).filter(v=>v.grupoId===id);
  for(const v of vs)await del("grupo_animais",v.id);
  await del("grupos",id);telaGrupos();
}
async function gerenciarGruposAnimal(animalId){
  const a=await get("animais",animalId);if(!a)return;
  const grupos=await getAll("grupos"),vinculos=await getAll("grupo_animais");
  if(!grupos.length){
    abrir(`<h2>👥 Grupos — ${esc(rotulo(a))}</h2><div class="meta">Nenhum grupo foi criado ainda.</div><button class="btn" style="margin-top:16px" onclick="fechar();formNovoGrupo()">+ Criar primeiro grupo</button><button class="btn-fant" onclick="fechar()">Fechar</button>`);return;
  }
  const meus=new Set(vinculos.filter(v=>v.animalId===animalId).map(v=>v.grupoId));
  const opts=grupos.map(g=>`<label style="display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--linha);padding:11px 2px;margin:0;color:var(--texto)"><input type="checkbox" class="ag_ck" value="${g.id}" ${meus.has(g.id)?"checked":""} style="width:20px;height:20px"> <span><b>${esc(g.nome)}</b>${g.descricao?`<span class="meta" style="display:block">${esc(g.descricao)}</span>`:""}</span></label>`).join("");
  abrir(`<h2>👥 Grupos — ${esc(rotulo(a))}</h2><div class="meta" style="margin-bottom:10px">O animal pode pertencer a vários grupos ao mesmo tempo. O lote atual não será alterado.</div>${opts}
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarGruposDoAnimal('${animalId}')">Salvar</button></div>`);
}
async function salvarGruposDoAnimal(animalId){
  const selecionados=new Set([...document.querySelectorAll(".ag_ck:checked")].map(x=>x.value));
  const vinculos=(await getAll("grupo_animais")).filter(v=>v.animalId===animalId);
  const atuais=new Set(vinculos.map(v=>v.grupoId));
  for(const v of vinculos)if(!selecionados.has(v.grupoId))await del("grupo_animais",v.id);
  for(const grupoId of selecionados)if(!atuais.has(grupoId))await put("grupo_animais",{id:uid(),grupoId,animalId,criadoEm:Date.now()});
  fechar();verAnimal(animalId);
}

/* ---------- PASTOS / PIQUETES ---------- */
async function formNovoPasto(propFixa){
  if(!(await podeUsarApp("Cadastrar pasto")))return;
  const {propriedades,lotes}=await tudo();
  if(!propriedades.length){fechar();return alert("Cadastre uma propriedade primeiro.");}
  const optProp=propriedades.map(p=>`<option value="${p.id}" ${p.id===propFixa?"selected":""}>${esc(p.nome)}</option>`).join("");
  const optLotes=`<option value="">— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);return`<option value="${l.id}">${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");
  abrir(`<h2>Novo pasto</h2>
    <label>Propriedade *</label><select id="pt_prop">${optProp}</select>
    <label>Nome do pasto *</label><input id="pt_nome" placeholder="Ex: Pasto 1">
    <label>Área total (ha)</label><input id="pt_area" inputmode="decimal" placeholder="Ex: 12">
    <label>Tipo de capim</label><input id="pt_capim" placeholder="Ex: Braquiária, Mombaça, Tifton…">
    <label>Situação</label>
    <select id="pt_status" onchange="togglePastoLote()">
      <option value="Livre">Livre</option>
      <option value="Ocupado">Ocupado (com lote)</option>
      <option value="Descanso">Em descanso (capim recuperando)</option></select>
    <div id="grp_pasto_lote" style="display:none"><label>Lote no pasto</label><select id="pt_lote">${optLotes}</select></div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarPasto()">Salvar</button></div>`);
}
function togglePastoLote(pref){
  const el=document.getElementById(pref?"pe_status":"pt_status");
  const grp=document.getElementById(pref?"grp_pasto_lote_e":"grp_pasto_lote");
  grp.style.display=el.value==="Ocupado"?"block":"none";
}
async function salvarPasto(){
  const nome=val("pt_nome");if(!nome)return alert("Dê um nome ao pasto.");
  const status=val("pt_status");
  await put("pastos",{id:uid(),propriedadeId:val("pt_prop"),nome,areaHa:numBR("pt_area"),
    tipoCapim:val("pt_capim"),status,loteId:status==="Ocupado"?(val("pt_lote")||null):null,
    criadoEm:Date.now(),statusDesde:Date.now(),historico:[]});
  fechar();telaGestaoPasto();
}
async function formEditarPasto(id){
  const pt=await get("pastos",id);
  const {propriedades,lotes}=await tudo();
  const optProp=propriedades.map(p=>`<option value="${p.id}" ${p.id===pt.propriedadeId?"selected":""}>${esc(p.nome)}</option>`).join("");
  const optLotes=`<option value="">— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);return`<option value="${l.id}" ${l.id===pt.loteId?"selected":""}>${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");
  const st=pt.status||"Livre";
  const opt=(v,t)=>`<option value="${v}" ${v===st?"selected":""}>${t}</option>`;
  abrir(`<h2>Editar pasto</h2>
    <label>Propriedade *</label><select id="pe_prop">${optProp}</select>
    <label>Nome do pasto *</label><input id="pe_nome" value="${esc(pt.nome||"")}">
    <label>Área total (ha)</label><input id="pe_area" inputmode="decimal" value="${pt.areaHa??""}">
    <label>Tipo de capim</label><input id="pe_capim" value="${esc(pt.tipoCapim||"")}">
    <label>Situação</label>
    <select id="pe_status" onchange="togglePastoLote(true)">
      ${opt("Livre","Livre")}${opt("Ocupado","Ocupado (com lote)")}${opt("Descanso","Em descanso (capim recuperando)")}</select>
    <div id="grp_pasto_lote_e" style="display:${st==="Ocupado"?"block":"none"}"><label>Lote no pasto</label><select id="pe_lote">${optLotes}</select></div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEdicaoPasto('${id}')">Salvar</button></div>
    <button class="btn-fant" style="margin-top:10px" onclick="excluirPasto('${id}')">Apagar pasto</button>`);
}
async function salvarEdicaoPasto(id){
  const nome=val("pe_nome");if(!nome)return alert("Dê um nome ao pasto.");
  const pt=await get("pastos",id);
  const novoStatus=val("pe_status");
  const novoLote=novoStatus==="Ocupado"?(val("pe_lote")||null):null;
  // garante os campos de histórico em pastos antigos
  if(!pt.historico)pt.historico=[];
  if(pt.statusDesde==null)pt.statusDesde=pt.criadoEm||Date.now();
  // se a situação mudou, fecha o período atual e abre um novo
  if(novoStatus!==(pt.status||"Livre")){
    pt.historico.push({status:pt.status||"Livre",inicio:pt.statusDesde,fim:Date.now(),loteId:pt.loteId||null});
    pt.statusDesde=Date.now();
  }
  pt.propriedadeId=val("pe_prop");pt.nome=nome;pt.areaHa=numBR("pe_area");pt.tipoCapim=val("pe_capim");
  pt.status=novoStatus;pt.loteId=novoLote;
  await put("pastos",pt);fechar();telaGestaoPasto();
}
async function excluirPasto(id){
  const pt=await get("pastos",id);
  if(!confirm(`Apagar o pasto "${pt?pt.nome:""}"?`))return;
  await del("pastos",id);fechar();telaGestaoPasto();
}

async function formNovoAnimal(loteFixo,nascimento){
  if(!(await podeUsarApp(nascimento?"Registrar nascimento":"Cadastrar animal")))return;
  _animalFoto="";
  const {propriedades,marcas,lotes,animais}=await tudo();
  // V67: nenhum animal pode ser criado sem que exista ao menos uma Marca / dono; mãe é opcional.
  // A validação acontece antes da exigência de lote para orientar o cadastro na ordem correta.
  if(marcas.length===0){
    fechar();
    abrir(`<h2>🏷 Cadastre uma marca / dono primeiro</h2>
      <div class="meta" style="margin:8px 0 16px">Antes de ${nascimento?"registrar um nascimento":"cadastrar um animal"}, é necessário identificar o proprietário do animal.</div>
      <button class="btn" onclick="fechar();gerenciarMarcas()">+ Cadastrar marca / dono</button>
      <button class="btn btn-sec" onclick="fechar()">Cancelar</button>`);
    return;
  }
  if(lotes.length===0){fechar();return alert("Crie um lote primeiro.");}
  const optLotes=`<option value="" ${loteFixo?"":"selected"}>— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);
    return`<option value="${l.id}" ${l.id===loteFixo?"selected":""}>${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");
  const femeas=animais.filter(a=>a.sexo==="F").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const optMae=`<option value="">— nenhuma —</option>`+
    femeas.map(m=>`<option value="${m.id}">${esc(rotuloCod(m))}</option>`).join("");
  const optMarca=`<option value="">— selecione —</option>`+
    marcas.map(m=>`<option value="${m.id}">${esc(m.sigla)}${m.nome?` · ${esc(m.nome)}`:""}</option>`).join("");
  // no fluxo de nascimento, já é nascido na propriedade (sem toggle)
  const toggle=nascimento?"":`
    <label>Nasceu na propriedade?</label>
    <select id="a_nasceu" onchange="toggleOrigem()">
      <option value="sim">Sim — nasceu aqui</option>
      <option value="nao" selected>Não — comprado</option>
    </select>`;
  abrir(`<h2>${nascimento?"Registrar nascimento":"Novo animal"}</h2>
    <div style="display:flex;justify-content:center;margin:6px 0 10px">
      <div class="avatar-wrap" style="width:74px;height:74px" onclick="document.getElementById('an_file').click()">
        <div class="avatar" id="an_avatar" style="width:74px;height:74px;border-radius:14px;font-size:30px">${_animalFoto?`<img src="${_animalFoto}" alt="">`:"🐄"}</div>
        <div class="avatar-cam">📷</div>
      </div>
    </div>
    <input type="file" id="an_file" accept="image/*" style="display:none" onchange="pickFotoAnimal(this)">
    <div class="meta" style="text-align:center;margin:-4px 0 10px">Foto do animal (opcional)</div>
    <label>Brinco / identificação (único)</label><input id="a_brinco" placeholder="Opcional">
    <label>Nome (opcional)</label><input id="a_nome">
    <label>Sexo *</label><select id="a_sexo"><option value="F">Fêmea</option><option value="M">Macho</option></select>
    ${campoRaca("a","",true)}
    ${toggle}
    <div id="grp_nasc" style="display:${nascimento?"block":"none"}">
      <label>Data de nascimento</label><input id="a_nasc" type="date" value="${hoje()}">
      <label>Mãe (opcional)</label><select id="a_mae">${optMae}</select>
    </div>
    <div id="grp_compra" style="display:${nascimento?"none":"block"}">
      <label>Peso de compra (kg vivo)</label><input id="a_pesocompra" inputmode="decimal" placeholder="Ex: 180">
      <label>Preço de compra (R$)</label><input id="a_precocompra" inputmode="decimal" placeholder="Ex: 2500 — vira o custo de estoque">
    </div>
    <label>Marca / dono *</label><select id="a_marca">${optMarca}</select>
    <label>Lote *</label><select id="a_lote">${optLotes}</select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarAnimal(${!!nascimento})">Salvar</button></div>`);}
function toggleOrigem(){
  const nasceu=(document.getElementById("a_nasceu")||{}).value==="sim";
  document.getElementById("grp_nasc").style.display=nasceu?"block":"none";
  document.getElementById("grp_compra").style.display=nasceu?"none":"block";
}
async function salvarAnimal(nascimento){
  const nasceu = nascimento || ((document.getElementById("a_nasceu")||{}).value==="sim");
  const maeId = nasceu ? (val("a_mae")||null) : null;
  const marcaId = val("a_marca")||null;
  const brinco = val("a_brinco");
  if(!marcaId)return alert("Selecione a marca / dono do animal.");
  if(!val("a_lote"))return alert("Selecione o lote do animal.");
  const _rc=lerRaca("a",true);if(_rc.erro)return alert(_rc.erro);
  if(nasceu&&val("a_nasc")>hoje())return alert("A data de nascimento não pode ser no futuro.");
  if(brinco && await brincoEmUso(brinco))return alert(`Já existe um animal com o brinco / identificação "${brinco}". Cada animal deve ter uma identificação única.`);
  const a={id:uid(),codigo:await proximoCodigo(),
    brinco,nome:val("a_nome"),sexo:val("a_sexo"),raca:_rc.raca,
    nascidoNaPropriedade:!!nasceu,
    dataNascimento: nasceu ? val("a_nasc") : "",
    pesoCompraKg: nasceu ? null : numBR("a_pesocompra"),
    custoEstoque: nasceu ? CUSTO_BEZERRO : (numBR("a_precocompra")||0),
    maeId,marcaId,loteAtualId:val("a_lote"),status:"Ativo",foto:_animalFoto||"",criadoEm:Date.now()};
  await put("animais",a);
  if(maeId){const m=await get("animais",maeId);await registrarEvento(a.id,"Nascimento",a.dataNascimento,`Filho(a) de ${m?rotuloCod(m):"—"}`);}
  const naLista=!!(document.getElementById("f_tipo")&&document.getElementById("lista"));
  fechar(); if(naLista)abrirAnimaisOperacional(); else render();
}

/* ---------- SAÍDA DE ANIMAL (morte / venda) ---------- */
function blocoSaida(s){
  if(s.tipo==="Morte")
    return `<div class="card" style="border-left:4px solid var(--perigo);margin-top:10px">
      <b>Saída: Morte</b><div class="meta" style="margin-top:2px">${fmt(s.data)}${s.causa?` — Causa: ${esc(s.causa)}`:""}</div></div>`;
  const arr=s.pesoLiquido!=null?(s.pesoLiquido/15):null;
  return `<div class="card" style="border-left:4px solid var(--verde);margin-top:10px">
    <b>Saída: Venda</b>
    <div class="meta" style="margin-top:2px">${fmt(s.data)}</div>
    <div class="meta" style="margin-top:4px">
      Preço da @: ${s.precoArroba!=null?moeda(s.precoArroba):"—"}<br>
      Peso bruto: ${s.pesoBruto!=null?s.pesoBruto+" kg":"—"} · Peso líquido: ${s.pesoLiquido!=null?s.pesoLiquido+" kg":"—"}${arr!=null?` (${arr.toFixed(1)} @)`:""}<br>
      ${s.condicoes?`Condições: ${esc(s.condicoes)}<br>`:""}
      ${s.valor!=null?`<b>Valor estimado: ${moeda(s.valor)}</b>`:""}
    </div></div>`;
}
async function formSaida(animalId){
  if(!(await podeUsarApp("Registrar saída do animal")))return;
  let seletor="";
  if(!animalId){
    const {lotes,animais}=await tudo();
    const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
    if(!ativos.length){fechar();return alert("Não há animais ativos para dar saída.");}
    const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
    seletor=`<label>Animal *</label><select id="s_animal">`+
      ativos.map(a=>`<option value="${a.id}">${esc(rotuloCod(a))} — ${esc(nomeLote(a.loteAtualId))}</option>`).join("")+`</select>`;
  }
  abrir(`<h2>Saída de animal</h2>
    ${seletor}
    <label>Motivo *</label>
    <select id="s_tipo" onchange="toggleSaida()"><option value="Venda">Venda</option><option value="Morte">Morte</option></select>
    <label>Data e hora</label>
    <div class="lado"><input id="s_data" type="date" value="${hoje()}"><input id="s_hora" type="time" value="${horaAgora()}"></div>
    <div id="grp_morte" style="display:none">
      <label>Causa da morte</label><input id="s_causa" placeholder="Ex: doença, acidente, predador…">
    </div>
    <div id="grp_venda">
      <label>Preço da arroba (@) — R$</label><input id="s_preco" inputmode="decimal" placeholder="Ex: 320">
      <label>Peso de venda bruto (kg)</label><input id="s_bruto" inputmode="decimal" placeholder="Ex: 480">
      <label>Peso de venda líquido (kg)</label><input id="s_liq" inputmode="decimal" placeholder="Ex: 255">
      <label>Valor total da venda (R$)</label><input id="s_valor" inputmode="decimal" placeholder="Se vazio, calcula por @ × peso líquido">
      <label>Forma de recebimento</label><select id="s_forma"><option value="vista">À vista (entra no caixa)</option><option value="prazo">A prazo (fica a receber)</option></select>
      <label>Condições (tara, desconto por @, etc.)</label><textarea id="s_cond" placeholder="Texto livre"></textarea>
    </div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn btn-perigo" onclick="salvarSaida(${animalId?`'${animalId}'`:"null"})">Registrar saída</button></div>`);}
function toggleSaida(){
  const venda=document.getElementById("s_tipo").value==="Venda";
  document.getElementById("grp_venda").style.display=venda?"block":"none";
  document.getElementById("grp_morte").style.display=venda?"none":"block";
}
async function salvarSaida(animalId){
  const id = animalId || (document.getElementById("s_animal")||{}).value;
  if(!id)return alert("Selecione o animal.");
  const tipo=val("s_tipo"), data=val("s_data"), hora=val("s_hora");
  let saida={tipo,data,hora}, det="";
  if(tipo==="Morte"){
    saida.causa=val("s_causa");
    det=`Causa: ${saida.causa||"não informada"}`;
  }else{
    const preco=numBR("s_preco"), bruto=numBR("s_bruto"), liq=numBR("s_liq"), cond=val("s_cond");
    const valorInformado=numBR("s_valor");
    const valorCalc=(preco!=null&&liq!=null)?preco*(liq/15):null;
    const valor=valorInformado!=null?valorInformado:valorCalc;
    saida={...saida,precoArroba:preco,pesoBruto:bruto,pesoLiquido:liq,condicoes:cond,valor};
    det=`@ ${preco!=null?moeda(preco):"—"} · bruto ${bruto??"—"}kg · líq ${liq??"—"}kg`+
        (valor!=null?` · total ${moeda(valor)}`:"")+(cond?` · ${cond}`:"");
  }
  await registrarEvento(id,tipo,data,det,{hora});   // já muda o status para Morto/Vendido
  const a=await get("animais",id); a.saida=saida; await put("animais",a);
  // Integração financeira: venda gera receita (competência) + CPV / baixa de estoque
  if(tipo==="Venda"&&saida.valor!=null){
    const forma=(document.getElementById("s_forma")||{}).value||"vista";
    const lote=a.loteAtualId?await get("lotes",a.loteAtualId):null;
    await put("lancamentos",{id:uid(),tipo:"receita",categoria:"Venda de animais",valor:saida.valor,
      custo:a.custoEstoque||0, formaRecebimento:forma,
      ganhoRealizado: a.nascidoNaPropriedade===true ? (a.custoEstoque||0) : 0,
      data,descricao:`Venda ${rotuloCod(a)}`,propriedadeId:lote?lote.propriedadeId:null,
      pago:forma==="vista",origem:"venda_animal",refId:id,modeloCusto:"v120",criadoEm:Date.now()});
  }
  fechar(); irAba('animais');
}

/* ---------- EDITAR DADOS DO ANIMAL ---------- */
async function formEditarAnimal(id){
  const a=await get("animais",id);
  _animalFoto=a.foto||"";
  const {propriedades,marcas,lotes,animais}=await tudo();
  const optLotes=lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);
    return`<option value="${l.id}" ${l.id===a.loteAtualId?"selected":""}>${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");
  const femeas=animais.filter(x=>x.sexo==="F"&&x.id!==id).sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const optMae=`<option value="">— nenhuma —</option>`+
    femeas.map(m=>`<option value="${m.id}" ${m.id===a.maeId?"selected":""}>${esc(rotuloCod(m))}</option>`).join("");
  const optMarca=`<option value="">— sem marca —</option>`+
    marcas.map(m=>`<option value="${m.id}" ${m.id===a.marcaId?"selected":""}>${esc(m.sigla)}${m.nome?` · ${esc(m.nome)}`:""}</option>`).join("");
  const nasceu = a.nascidoNaPropriedade===true;
  abrir(`<h2>Editar dados ${codAnimal(a)}</h2>
    <div style="display:flex;justify-content:center;margin:6px 0 10px">
      <div class="avatar-wrap" style="width:74px;height:74px" onclick="document.getElementById('an_file').click()">
        <div class="avatar" id="an_avatar" style="width:74px;height:74px;border-radius:14px;font-size:30px">${_animalFoto?`<img src="${_animalFoto}" alt="">`:"🐄"}</div>
        <div class="avatar-cam">📷</div>
      </div>
    </div>
    <input type="file" id="an_file" accept="image/*" style="display:none" onchange="pickFotoAnimal(this)">
    <div class="meta" style="text-align:center;margin:-4px 0 10px">Toque para ${_animalFoto?"trocar":"adicionar"} a foto</div>
    <label>Brinco / identificação (único)</label><input id="e_brinco" value="${esc(a.brinco||"")}" placeholder="Opcional">
    <label>Nome (opcional)</label><input id="e_nome" value="${esc(a.nome||"")}">
    <label>Sexo *</label><select id="e_sexo">
      <option value="F" ${a.sexo==="F"?"selected":""}>Fêmea</option>
      <option value="M" ${a.sexo==="M"?"selected":""}>Macho</option></select>
    ${campoRaca("e",a.raca||"",false)}
    <label>Nasceu na propriedade?</label>
    <select id="e_nasceu" onchange="toggleOrigemEdit()">
      <option value="sim" ${nasceu?"selected":""}>Sim — nasceu aqui</option>
      <option value="nao" ${!nasceu?"selected":""}>Não — comprado</option></select>
    <div id="grp_nasc_e" style="display:${nasceu?"block":"none"}">
      <label>Data de nascimento</label><input id="e_nasc" type="date" value="${a.dataNascimento||hoje()}">
      <label>Mãe (opcional)</label><select id="e_mae">${optMae}</select>
    </div>
    <div id="grp_compra_e" style="display:${nasceu?"none":"block"}">
      <label>Data da compra (aquisição)</label><input id="e_datacompra" type="date" value="${dataAquisicao(a)||hoje()}">
      <label>Peso de compra (kg vivo)</label><input id="e_pesocompra" inputmode="decimal" value="${a.pesoCompraKg??""}">
      <label>Custo de estoque (R$)</label><input id="e_custo" inputmode="decimal" value="${a.custoEstoque!=null?String(a.custoEstoque).replace('.',','):""}" placeholder="Preço de compra">
    </div>
    <label>Marca / dono</label><select id="e_marca">${optMarca}</select>
    <label>Lote *</label><select id="e_lote">${optLotes}</select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEdicaoAnimal('${id}')">Salvar</button></div>`);}
function toggleOrigemEdit(){
  const nasceu=document.getElementById("e_nasceu").value==="sim";
  document.getElementById("grp_nasc_e").style.display=nasceu?"block":"none";
  document.getElementById("grp_compra_e").style.display=nasceu?"none":"block";
}
async function salvarEdicaoAnimal(id){
  const a=await get("animais",id);
  const nasceu=document.getElementById("e_nasceu").value==="sim";
  const brinco=val("e_brinco");
  if(brinco && await brincoEmUso(brinco,id))return alert(`Já existe outro animal com o brinco / identificação "${brinco}". Cada animal deve ter uma identificação única.`);
  a.brinco=brinco;
  a.nome=val("e_nome");
  a.sexo=val("e_sexo");
  const _rc=lerRaca("e",false);if(_rc.erro)return alert(_rc.erro);
  a.raca=_rc.raca;
  a.nascidoNaPropriedade=nasceu;
  a.dataNascimento = nasceu ? val("e_nasc") : "";
  a.pesoCompraKg = nasceu ? null : numBR("e_pesocompra");
  if(!nasceu){const dc=val("e_datacompra");if(dc>hoje())return alert("A data da compra não pode ser no futuro.");if(dc)a.dataCompra=dc;}
  if(nasceu&&val("e_nasc")>hoje())return alert("A data de nascimento não pode ser no futuro.");
  a.custoEstoque = nasceu ? CUSTO_BEZERRO : (numBR("e_custo")||0);
  a.maeId = nasceu ? (val("e_mae")||null) : null;
  a.marcaId = val("e_marca")||null;
  a.foto = _animalFoto||"";
  const novoLote=val("e_lote");
  const loteMudou = novoLote && novoLote!==a.loteAtualId;
  await put("animais",a);
  if(loteMudou) await moverAnimal(id,novoLote);   // registra a movimentação no histórico
  fechar(); verAnimal(id);
}

async function formMedicarLote(loteId){return formAplicacao({voltar:"lote",loteId});}
async function formMover(id){const _ab=await get("animais",id);if(_ab&&_ab.status&&_ab.status!=="Ativo")return alert(`Este animal está baixado (${_ab.status}). Não é possível mover de lote.`);
  if(!(await podeUsarApp("Mover animal de lote")))return;const a=await get("animais",id);
  const {propriedades,lotes}=await tudo();const outros=lotes.filter(l=>l.id!==a.loteAtualId);
  if(!outros.length)return alert("Não há outro lote.");
  const opt=`<option value="">— selecione —</option>`+outros.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);
    return`<option value="${l.id}">${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");
  abrir(`<h2>Mover de lote</h2><label>Novo lote</label><select id="mv_lote">${opt}</select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="confMover('${id}')">Mover</button></div>`);}
async function confMover(id){if(!val("mv_lote"))return alert("Selecione o novo lote.");await moverAnimal(id,val("mv_lote"));fechar();verAnimal(id);}
