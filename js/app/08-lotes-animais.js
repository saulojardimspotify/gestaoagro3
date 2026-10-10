/* Gestão do Rebanho — js/app/08-lotes-animais.js
   Lotes e lista/ficha de animais.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= LOTES ======================= */
async function telaLotes(){
  topoPagina();
  const {propriedades,lotes,animais}=await tudo();
  const conta=id=>animais.filter(a=>a.loteAtualId===id&&a.status==="Ativo").length;
  const qtdNome={};for(const l of lotes){const k=chaveNomeLote(l.nome);qtdNome[k]=(qtdNome[k]||0)+1;}
  const repetido=l=>qtdNome[chaveNomeLote(l.nome)]>1;
  const chipRep=l=>repetido(l)?` <span class="chip chip-off" style="color:var(--perigo)">nome repetido</span>`:"";
  const nRep=lotes.filter(repetido).length;
  let html=`<button class="voltar" onclick="telaLotesGrupos()">‹ Lotes e Grupos</button>
    <div class="sechead"><span class="sic">${ico("cerca")}</span><h2>Lotes</h2></div>
    <button class="btn" onclick="formNovoLote()">+ Novo lote</button>`;
  if(nRep)html+=`<div class="card" style="border-left:4px solid var(--perigo);cursor:default"><b>${nRep} lotes com nome repetido</b><div class="meta" style="margin-top:4px">Foram criados antes desta versão. Abra um deles e toque em ✎ Editar para renomear, ou apague o que estiver vazio.</div></div>`;
  if(lotes.length===0){html+=`<div class="vazio"><div class="big">▤</div><b>Nenhum lote</b><div class="meta">Crie um lote para organizar o rebanho.</div></div>`;}
  else{
    for(const p of propriedades){
      const ls=lotes.filter(l=>l.propriedadeId===p.id);if(!ls.length)continue;
      html+=`<div class="h3">${esc(p.nome)}</div>`;
      for(const l of ls)html+=`<div class="card row rt" onclick="verLote('${l.id}')">
        <div><div class="ti">${esc(l.nome)}${chipRep(l)}</div>${l.descricao?`<div class="meta">${esc(l.descricao)}</div>`:""}</div>
        <span class="badge">${conta(l.id)} 🐄</span></div>`;
    }
    const orfaos=lotes.filter(l=>!propriedades.find(p=>p.id===l.propriedadeId));
    if(orfaos.length){html+=`<div class="h3">Sem propriedade</div>`;
      for(const l of orfaos)html+=`<div class="card row rt" onclick="verLote('${l.id}')">
        <div class="ti">${esc(l.nome)}${chipRep(l)}</div><span class="badge">${conta(l.id)} 🐄</span></div>`;}
  }
  $t.innerHTML=html;
}
async function verLote(id){
  topoPagina();
  const l=await get("lotes",id),p=l.propriedadeId?await get("propriedades",l.propriedadeId):null;
  const _todosAn=await getAll("animais");_animaisPorId=new Map(_todosAn.map(a=>[a.id,a]));
  const animais=_todosAn.filter(a=>a.loteAtualId===id&&a.status==="Ativo");
  const nomeLote=l.nome;
  let lst=animais.length?"":`<div class="meta" style="padding:8px 4px">Nenhum animal ativo neste lote.</div>`;
  for(const a of animais.sort((x,y)=>(x.codigo||0)-(y.codigo||0)||String(x.brinco||"").localeCompare(String(y.brinco||""))))lst+=linhaAnimal(a,nomeLote,false); // V144: animal sem brinco não trava a tela
  $t.innerHTML=`<button class="voltar" onclick="telaLotes()">‹ Lotes</button>
    <div class="card"><div class="row"><div class="ti" style="font-size:19px">${esc(l.nome)}</div>
      <button class="btn-fant" style="padding:4px 8px;color:var(--verde);font-weight:700" onclick="formEditarLote('${id}')">✎ Editar</button></div>
      ${p?`<div class="meta">${esc(p.nome)}</div>`:""}
      ${l.descricao?`<div class="meta">${esc(l.descricao)}</div>`:""}
      <div class="meta">${animais.length} animais ativos</div></div>
    <button class="btn" onclick="formMedicarLote('${id}')">💊 Medicamento aplicado no lote inteiro</button>
    <div class="lado"><button class="btn btn-sec" onclick="formNovoAnimal('${id}')">+ Animal</button>
      <button class="btn btn-perigo" onclick="apagarLote('${id}')">Apagar</button></div>
    <div class="h3">Animais</div>${lst}`;
}

/* ======================= ANIMAIS ======================= */
let _dadosAnimais=null;
async function telaAnimais(){
  topoPagina();
  const {propriedades,lotes,animais,marcas,medicamentos,pastos,grupos,grupo_animais}=await tudo();
  const eventos=await getAll("eventos");
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const marcaSigla=id=>{const m=marcas.find(x=>x.id===id);return m?(m.sigla||m.nome||""):"";};
  // conjunto de medicamentos aplicados a cada animal
  const medPorAnimal={};
  for(const e of eventos){if(e.tipo==="Medicamento"&&e.medicamentoId){(medPorAnimal[e.animalId]=medPorAnimal[e.animalId]||new Set()).add(e.medicamentoId);}}
  // grupos podem conter o mesmo animal simultaneamente
  const gruposPorAnimal={};
  for(const v of grupo_animais){(gruposPorAnimal[v.animalId]=gruposPorAnimal[v.animalId]||new Set()).add(v.grupoId);}
  // pasto atual é inferido pelo lote que está ocupando o pasto
  const pastosPorLote={};
  for(const pt of pastos){if(pt.loteId){(pastosPorLote[pt.loteId]=pastosPorLote[pt.loteId]||new Set()).add(pt.id);}}
  _dadosAnimais={animais,nomeLote,marcaSigla,medPorAnimal,gruposPorAnimal,pastosPorLote,marcas,medicamentos,lotes,pastos,grupos};

  let html=`<button class="voltar" onclick="irAba('painel')">‹ Gestão Operacional</button>
    <button class="btn" onclick="formNovoAnimal()">+ Novo animal</button>
    <button class="btn btn-sec" onclick="formDesmama()">🍼 Registrar desmama</button>`;
  if(lotes.length===0){html+=`<div class="vazio"><div class="big">🐄</div><b>Crie um lote primeiro</b><div class="meta">Todo animal pertence a um lote.</div></div>`;return void($t.innerHTML=html);}
  if(animais.length===0){html+=`<div class="vazio"><div class="big">🐄</div><b>Nenhum animal</b><div class="meta">Cadastre um animal ou registre um nascimento.</div></div>`;return void($t.innerHTML=html);}
  html+=`<input id="busca" placeholder="Buscar por brinco, nome ou nº…" oninput="filtrarAnimais()" style="margin-bottom:10px">
    <div class="filtros-animais">
      <select id="f_tipo" onchange="atualizarCriterioFiltroAnimais()">
        <option value="">Escolher tipo de filtro</option>
        <option value="marca">Marca / dono</option>
        <option value="med">Medicação</option>
        <option value="nasc">Nascimento</option>
        <option value="desmama">Desmama</option>
        <option value="grupo">Grupo</option>
        <option value="pasto">Pasto</option>
        <option value="lote">Lote</option>
        <option value="sexo">Sexo</option>
        <option value="raca">Raça</option>
        <option value="status">Situação do animal</option>
      </select>
      <select id="f_criterio" onchange="filtrarAnimais()" disabled>
        <option value="">Primeiro escolha o tipo de filtro</option>
      </select>
    </div>
    <div class="row" style="margin:0 4px 8px"><span id="animais_count" class="meta"></span>
      <button id="limpar_filtros_animais" class="btn-fant" style="padding:2px 6px;color:var(--verde);display:none" onclick="limparFiltrosAnimais()">Limpar filtro</button></div>
    <div id="lista"></div>`;
  $t.innerHTML=html;
  filtrarAnimais();
}
function atualizarCriterioFiltroAnimais(){
  if(!_dadosAnimais)return;
  const tipo=(document.getElementById("f_tipo")||{}).value||"";
  const c=document.getElementById("f_criterio");if(!c)return;
  const {marcas,medicamentos,lotes,pastos,grupos}=_dadosAnimais;
  let opts=[];
  if(tipo==="marca"){
    opts=marcas.map(m=>[m.id,(m.sigla?m.sigla+" · ":"")+(m.nome||m.sigla||"Marca")]);
    opts.push(["__sem","Sem marca / dono"]);
  }else if(tipo==="med"){
    opts=medicamentos.map(m=>[m.id,m.nome||"Medicamento"]);opts.push(["__sem","Sem medicação registrada"]);
  }else if(tipo==="nasc"){
    opts=[["1","Último 1 mês"],["3","Últimos 3 meses"],["5","Últimos 5 meses"],["7","Últimos 7 meses"],["12","Últimos 12 meses"],["__sem","Sem data de nascimento"]];
  }else if(tipo==="desmama"){
    opts=[["todos","Todos os nascidos na propriedade"],["desmamados","Desmamados"],["adesmamar","Vão desmamar (ainda com a mãe)"]];
  }else if(tipo==="grupo"){
    opts=grupos.map(g=>[g.id,g.nome||"Grupo"]);opts.push(["__sem","Sem grupo"]);
  }else if(tipo==="pasto"){
    opts=pastos.map(pt=>[pt.id,pt.nome||"Pasto"]);opts.push(["__sem","Sem pasto atual"]);
  }else if(tipo==="lote"){
    opts=lotes.map(l=>[l.id,l.nome||"Lote"]);opts.push(["__sem","Sem lote"]);
  }else if(tipo==="sexo"){
    opts=[["F","Fêmea"],["M","Macho"]];
  }else if(tipo==="raca"){
    const outras=[...new Set((_dadosAnimais.animais||[]).map(a=>a.raca).filter(r=>r&&!RACAS.includes(r)))].sort();
    opts=[...RACAS.map(r=>[r,r]),...outras.map(r=>[r,r]),["__sem","Raça não informada"]];
  }else if(tipo==="status"){
    opts=[["Ativo","Ativo"],["Vendido","Vendido"],["Morto","Morto"]];
  }
  if(!tipo){c.innerHTML='<option value="">Primeiro escolha o tipo de filtro</option>';c.disabled=true;}
  else if(!opts.length){c.innerHTML='<option value="">Nenhuma opção cadastrada</option>';c.disabled=true;}
  else{c.innerHTML='<option value="">Escolha o critério</option>'+opts.map(([v,n])=>`<option value="${esc(v)}">${esc(n)}</option>`).join("");c.disabled=false;}
  filtrarAnimais();
}
function limparFiltrosAnimais(){
  const tipo=document.getElementById("f_tipo");if(tipo)tipo.value="";
  const c=document.getElementById("f_criterio");if(c){c.innerHTML='<option value="">Primeiro escolha o tipo de filtro</option>';c.value="";c.disabled=true;}
  const b=document.getElementById("busca");if(b)b.value="";
  filtrarAnimais();
}
function filtrarAnimais(){
  if(!_dadosAnimais)return;
  const {animais,nomeLote,marcaSigla,medPorAnimal,gruposPorAnimal,pastosPorLote}=_dadosAnimais;
  const t=(val("busca")||"").toLowerCase();
  const tipo=(document.getElementById("f_tipo")||{}).value||"";
  const criterio=(document.getElementById("f_criterio")||{}).value||"";
  let limite=null;
  if(tipo==="nasc"&&criterio&&criterio!=="__sem"){const d=new Date();d.setMonth(d.getMonth()-Number(criterio));limite=d.getTime();}
  const lista=animais.slice().sort((x,y)=>(x.codigo||0)-(y.codigo||0)).filter(a=>{
    if(t){const blob=((a.brinco||"")+" "+(a.nome||"")+" "+codAnimal(a)).toLowerCase();if(!blob.includes(t))return false;}
    if(!tipo||!criterio)return true;
    if(tipo==="marca")return criterio==="__sem"?!a.marcaId:a.marcaId===criterio;
    if(tipo==="med"){
      const s=medPorAnimal[a.id];return criterio==="__sem"?(!s||s.size===0):!!(s&&s.has(criterio));
    }
    if(tipo==="nasc"){
      if(criterio==="__sem")return !a.dataNascimento;
      if(!a.dataNascimento)return false;const dn=dataParaTs(a.dataNascimento);return dn!=null&&dn>=limite;
    }
    if(tipo==="desmama"){
      if(a.nascidoNaPropriedade!==true)return false;
      if(criterio==="desmamados")return !!a.desmamado;
      if(criterio==="adesmamar")return !a.desmamado;
      return true;
    }
    if(tipo==="grupo"){
      const s=gruposPorAnimal[a.id];return criterio==="__sem"?(!s||s.size===0):!!(s&&s.has(criterio));
    }
    if(tipo==="pasto"){
      const s=pastosPorLote[a.loteAtualId];return criterio==="__sem"?(!s||s.size===0):!!(s&&s.has(criterio));
    }
    if(tipo==="lote")return criterio==="__sem"?!a.loteAtualId:a.loteAtualId===criterio;
    if(tipo==="sexo")return a.sexo===criterio;
    if(tipo==="raca")return criterio==="__sem"?!a.raca:a.raca===criterio;
    if(tipo==="status")return a.status===criterio;
    return true;
  });
  if(tipo==="desmama"&&criterio==="adesmamar")lista.sort((x,y)=>{const dx=desmamaInfo(x),dy=desmamaInfo(y);return (dx.semData?1e9:dx.diasRestantes)-(dy.semData?1e9:dy.diasRestantes);});
  const cont=document.getElementById("lista");
  if(cont)cont.innerHTML=lista.length?lista.map(a=>{a._marcaSigla=marcaSigla(a.marcaId);return linhaAnimal(a,nomeLote(a.loteAtualId),true);}).join(""):`<div class="meta" style="padding:12px 4px">Nenhum animal com esse filtro.</div>`;
  const cEl=document.getElementById("animais_count");if(cEl)cEl.textContent=`${lista.length} de ${animais.length} animal(is)`;
  const limpar=document.getElementById("limpar_filtros_animais");if(limpar)limpar.style.display=(t||tipo||criterio)?"block":"none";
}
// V123: "Nasc. dd/mm/aaaa" ou "Compra dd/mm/aaaa" ao lado do nome / código
function dataAquisicao(a){
  if(!a)return "";
  if(a.dataCompra)return a.dataCompra;
  return a.criadoEm?tsData(a.criadoEm):"";
}
function origemTag(a){
  if(!a)return "";
  if(a.nascidoNaPropriedade===true)return `<span class="origem-tag">Nasc. ${a.dataNascimento?fmt(a.dataNascimento):"—"}</span>`;
  if(a.nascidoNaPropriedade===false){const d=dataAquisicao(a);return `<span class="origem-tag">Compra ${d?fmt(d):"—"}</span>`;}
  return "";
}
function desmamaLinhaLista(a){
  if(a.nascidoNaPropriedade!==true||a.status!=="Ativo")return "";
  const d=desmamaInfo(a);
  const atras=!d.desmamado&&!d.semData&&d.diasRestantes<0;
  return `<div class="meta" style="margin-top:6px${atras?";color:#c0392b;font-weight:600":d.desmamado?";color:var(--verde)":""}">${desmamaLabel(a)}</div>`;
}
function linhaAnimal(a,nomeLote,mostraLote){
  const sx=sexoChip(a.sexo);
  const st=a.status!=="Ativo"?`<span class="chip chip-off">${a.status}</span>`:"";
  const idchip=(a.brinco||a.nome)?`${(a.brinco||a.nome)?`<span class="chip chip-id">${codAnimal(a)}</span>`:""}`:"";
  return `<div class="card rt" data-b="${esc(((a.brinco||"")+" "+(a.nome||"")+" "+codAnimal(a)).toLowerCase())}" onclick="verAnimal('${a.id}')">
    <div style="display:flex;gap:12px;align-items:center">
      ${animalThumb(a,46)}
      <div style="flex:1;min-width:0">
        <div class="ti">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}${origemTag(a)}</div>
        <div class="meta chips-linha" style="margin-top:8px">${sx}${st}${idchip}${mostraLote?`<span class="chip chip-lote">▦ ${esc(nomeLote)}</span>`:""}
          ${a._marcaSigla?`<span class="chip chip-marca">${esc(a._marcaSigla)}</span>`:""}</div>
        ${a.nascidoNaPropriedade===true?`<div class="meta" style="margin-top:6px">Mãe: <b>${esc(maeTexto(a))}</b></div>`:""}
        ${desmamaLinhaLista(a)}
      </div>
    </div></div>`;
}
async function verAnimal(id){
  topoPagina();
  const a=await get("animais",id),{lotes,marcas}=await tudo();
  const nomeLote=(lotes.find(l=>l.id===a.loteAtualId)||{}).nome||"—";
  const marca=marcas.find(m=>m.id===a.marcaId);
  const mae=a.maeId?await get("animais",a.maeId):null;
  const filhos=(await getAll("animais")).filter(f=>f.maeId===id);
  const gruposTodos=await getAll("grupos");
  const vinculosGrupo=(await getAll("grupo_animais")).filter(v=>v.animalId===id);
  const gruposAnimal=vinculosGrupo.map(v=>gruposTodos.find(g=>g.id===v.grupoId)).filter(Boolean);
  const gruposChips=gruposAnimal.map(g=>`<span class="chip chip-marca">👥 ${esc(g.nome)}</span>`).join("");
  const eventos=(await getAll("eventos")).filter(e=>e.animalId===id)
    .sort((x,y)=>y.data.localeCompare(x.data)||y.criadoEm-x.criadoEm);
  const {medicamentos}=await tudo();
  const nomeMed=id=>{const m=medicamentos.find(x=>x.id===id);return m?m.nome:"";};
  const evItens=eventos.map(e=>{
    const quando=fmt(e.data)+(e.hora?` ${e.hora}`:"");
    const med=e.medicamentoId?`${esc(nomeMed(e.medicamentoId))}${e.via?` (${esc(e.via)})`:""}${e.dose?` · ${esc(e.dose)}`:""}`:"";
    return `<div class="evt"><div class="row"><div class="tp">${esc(e.tipo)}</div>
      <button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="excluirEvento('${e.id}','${id}')">✕</button></div>
      <div class="dt">${quando}</div>${med?`<div class="de">${med}</div>`:""}${e.detalhes?`<div class="de">${esc(e.detalhes)}</div>`:""}</div>`;
  });
  let tl=eventos.length?verMais(evItens,"evento(s)"):`<div class="meta">Sem eventos ainda.</div>`;
  $t.innerHTML=`<button class="voltar" onclick="telaAnimais()">‹ Animais</button>
    <div class="card">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div class="an-thumb" style="width:84px;height:84px;font-size:34px${a.foto?';cursor:zoom-in':''}" ${a.foto?`onclick="ampliarFotoAnimal('${id}')"`:""}>${a.foto?`<img src="${esc(a.foto)}" alt="">`:"🐄"}</div>
        <div style="flex:1;min-width:0">
          <div class="ti" style="font-size:20px">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""} ${(a.brinco||a.nome)?`<span class="chip chip-id">${codAnimal(a)}</span>`:""}${origemTag(a)}</div>
          <div class="meta chips-linha" style="margin-top:8px">
            ${sexoChip(a.sexo)}
            <span class="chip chip-lote">▦ ${esc(nomeLote)}</span>
            ${marca?`<span class="chip chip-marca">${esc(marca.sigla)}</span>`:""}
            ${a.castrado?`<span class="chip chip-off">✂️ Castrado</span>`:""}
            ${a.status!=="Ativo"?`<span class="chip chip-off">${a.status}</span>`:""}
            ${gruposChips}</div>
        </div>
      </div>
      <div class="meta" style="margin-top:8px">
        ${a.nascidoNaPropriedade?`Origem: nascido na propriedade<br>`:(a.nascidoNaPropriedade===false?`Origem: comprado em ${dataAquisicao(a)?fmt(dataAquisicao(a)):"—"}${a.pesoCompraKg?` — ${a.pesoCompraKg} kg vivo`:""}<br>`:"")}
        ${a.custoEstoque?`Custo de estoque: ${moeda(a.custoEstoque)}<br>`:""}
        ${a.raca?`Raça: ${esc(a.raca)}<br>`:`Raça: não informada<br>`}
        ${a.dataNascimento?`Nascimento: ${fmt(a.dataNascimento)}<br>`:""}
        ${mae?`Mãe: <b onclick="verAnimal('${mae.id}')" style="color:var(--verde);cursor:pointer">${esc(nomeMae(mae))}</b><br>`:(a.nascidoNaPropriedade===true?`Mãe: não informada<br>`:"")}
        ${filhos.length?`Filhos: ${filhos.length}`:""}</div>
      ${a.saida?blocoSaida(a.saida):""}</div>
    ${a.nascidoNaPropriedade===true?blocoDesmamaFicha(a):""}
    <div class="animal-actions">
      <button class="btn btn-sec" onclick="formEditarAnimal('${id}')">✎ Editar dados</button>
      <button class="btn btn-sec" onclick="gerenciarGruposAnimal('${id}')">👥 Grupos (${gruposAnimal.length})</button>
      ${a.status==="Ativo"?`<div class="lado"><button class="btn" onclick="formMedicarAnimal('${id}')">💊 Medicar</button>
        <button class="btn btn-sec" onclick="formMover('${id}')">↷ Mover lote</button></div>
      <button class="btn btn-sec" onclick="formEvento('${id}')">+ Registrar evento de manejo</button>
      ${a.sexo==="M"&&!a.castrado?`<button class="btn btn-sec" onclick="castrarAnimal('${id}')">✂️ Registrar castração</button>`:""}`
      :`<div class="meta" style="margin:2px 4px 12px">Animal ${String(a.status||"baixado").toLowerCase()}: manejo, medicação e troca de lote não se aplicam mais.</div>`}
    </div>
    ${a.status==="Ativo"?`<button class="btn btn-perigo animal-saida" onclick="formSaida('${id}')">↩ Registrar saída (morte/venda)</button>`:""}
    <div class="h3">Histórico</div>${tl}
    <button class="btn-fant" onclick="apagarAnimal('${id}')">Apagar animal</button>`;
}

// V123: desmama fica na ficha de quem nasceu na propriedade (a página "Nascimentos" foi removida)
function blocoDesmamaFicha(a){
  const d=desmamaInfo(a);
  const atras=!d.desmamado&&!d.semData&&d.diasRestantes<0;
  const botoes=a.desmamado
    ?`<button class="btn-fant" style="padding:6px 10px 0 0;color:var(--verde);font-weight:600" onclick="formDesmama('${a.id}')">✎ Corrigir data da desmama</button>
      <button class="btn-fant" style="padding:6px 10px 0 0;color:var(--perigo)" onclick="desfazerDesmama('${a.id}')">Desfazer desmama</button>`
    :(a.status==="Ativo"?`<button class="btn btn-sec" style="margin:10px 0 0" onclick="formDesmama('${a.id}')">🍼 Registrar desmama</button>`:"");
  return `<div class="card" style="cursor:default;border-left:4px solid ${atras?"#c0392b":"var(--verde)"}">
    <div class="meta">Desmama</div>
    <div class="ti" style="font-size:16px;${atras?"color:#c0392b":""}">${desmamaLabel(a)}</div>
    ${botoes}</div>`;
}
