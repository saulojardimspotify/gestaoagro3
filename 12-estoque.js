/* Gestão do Rebanho — js/app/12-estoque.js
   Estoque de Insumos: itens, entradas, consumos e ficha do item.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= ESTOQUE DE INSUMOS ======================= */
function catsDoGrupo(g){return g==="manutencao"?CAT_INSUMO_MANUT:CAT_INSUMO_GADO;}
const numFmt=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:3});

async function telaEstoque(){
  if(!(await podeUsarApp("Estoque de insumos")))return;
  topoPagina();
  const insumos=(await getAll("insumos")).sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));
  const movs=await getAll("insumo_mov");
  const valorTotal=insumos.reduce((s,i)=>s+(i.saldo||0)*(i.custoMedio||0),0);
  const aPagarIns=movs.filter(m=>m.tipo==="entrada"&&!m.pago).reduce((s,m)=>s+(m.valorTotal||0),0);
  const bloco=(gkey,gnome,gic)=>{
    const itens=insumos.filter(i=>i.grupo===gkey);
    const linhas=itens.length?itens.map(i=>{
      const vv=(i.saldo||0)*(i.custoMedio||0);
      const baixo=(i.saldo||0)<=0;
      return `<div class="card">
        <div class="row"><div class="ti" style="font-size:15px">${esc(i.nome)}</div>
          <div style="white-space:nowrap"><button class="btn-fant" style="padding:2px 6px;color:var(--verde)" onclick="formEditarInsumo('${i.id}')">✎</button>
          <button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="excluirInsumo('${i.id}')">✕</button></div></div>
        <div class="meta">${esc(i.categoria||"")}${i.categoria?" · ":""}Saldo: <b style="color:${baixo?'#c0392b':'var(--texto)'}">${numFmt(i.saldo)} ${esc(i.unidade||"un")}</b> · ${moeda(i.custoMedio||0)}/${esc(i.unidade||"un")} · ${moeda(vv)}</div>
        <div style="margin-top:8px;display:flex;gap:10px">
          <button class="btn btn-sec" style="margin:0;flex:1" onclick="formEntradaInsumo('${i.id}')">＋ Entrada</button>
          <button class="btn btn-sec" style="margin:0;flex:1" onclick="formConsumoInsumo('${i.id}')">${(typeof ehMedicamentoEstoque==='function'&&ehMedicamentoEstoque(i))?'💉 Aplicar':'－ Consumo'}</button>
        </div></div>`;
    }).join(""):`<div class="meta" style="padding:2px 4px 8px">Nenhum item cadastrado neste grupo.</div>`;
    return `<div class="h3">${gic} ${gnome}</div>
      <button class="btn btn-sec" onclick="formNovoInsumo('${gkey}')">+ Novo item</button>
      ${linhas}`;
  };
  $t.innerHTML=`<button class="voltar" onclick="telaPainel()">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">📦</span><h2>Estoque de Insumos</h2></div>
    <div class="fin-cards" style="margin-bottom:6px">
      <div class="fin-c"><div class="cl">📦 Valor em estoque</div><div class="cv">${moeda(valorTotal)}</div></div>
      <div class="fin-c"><div class="cl">📌 A pagar (compras)</div><div class="cv">${moeda(aPagarIns)}</div></div>
    </div>
    ${bloco("gado","Insumos do gado","💊")}
    ${bloco("manutencao","Manutenção da propriedade","🔧")}
    <div class="h3">Últimos movimentos</div>
    ${await histEstoque(insumos,movs)}`;
}
/* V149: ficha do item de estoque (tocar na linha) e foto do produto */
async function fichaInsumo(id){
  const it=await get("insumos",id);if(!it)return telaEstoque();
  const movs=(await getAll("insumo_mov")).filter(m=>m.insumoId===id);
  const un=esc(it.unidade||"un"),med=typeof ehMedicamentoEstoque==="function"&&ehMedicamentoEstoque(it);
  const info=[["Categoria",it.categoria],["Tipo",it.tipoMed],["Fabricante",it.fabricante],["Marca comercial",it.marca],["Observação",it.obs]].filter(x=>x[1]);
  const hist=await histEstoque([it],movs);
  abrir(`<h2>${esc(it.nome)}</h2>
    <div class="est-ficha-foto" onclick="document.getElementById('in_foto_file').click()">${it.foto?`<img src="${it.foto}" alt="">`:`<div style="text-align:center">${ico("camera")}<div class="meta" style="margin-top:6px">Toque para adicionar foto</div></div>`}</div>
    <input type="file" id="in_foto_file" accept="image/*" style="display:none" onchange="fotoInsumo(this,'${id}')">
    ${it.foto?`<button class="btn-fant" style="color:var(--perigo);padding:0 0 8px" onclick="removerFotoInsumo('${id}')">Remover foto</button>`:""}
    <div class="fin-cards" style="margin-bottom:8px">
      <div class="fin-c"><div class="cl">Saldo</div><div class="cv">${numFmt(it.saldo||0)} ${un}</div></div>
      <div class="fin-c"><div class="cl">Custo médio</div><div class="cv">${moeda(it.custoMedio||0)}/${un}</div></div>
    </div>
    <div class="meta" style="margin-bottom:8px">Valor em estoque: <b>${moeda((it.saldo||0)*(it.custoMedio||0))}</b></div>
    ${info.map(([k,v])=>`<div class="meta">${k}: <b>${esc(v)}</b></div>`).join("")}
    <div class="est-acoes" style="margin-top:14px"><button class="btn btn-sec" onclick="formEntradaInsumo('${id}')">＋ Entrada</button><button class="btn btn-sec" onclick="formConsumoInsumo('${id}')">－ ${med?"Aplicar":"Saída"}</button></div>
    <button class="btn btn-sec" style="margin-top:10px" onclick="formEditarInsumo('${id}')">✎ Editar dados</button>
    <div class="h3" style="margin:14px 0 6px">Movimentos</div>${hist}
    <div class="lado" style="margin-top:12px"><button class="btn btn-sec" onclick="fechar()">Fechar</button><button class="btn-fant" style="color:var(--perigo);flex:1" onclick="excluirInsumo('${id}')">Excluir item</button></div>`);
}
function fotoInsumo(input,id){const f=input.files&&input.files[0];if(!f)return;
  lerFotoRedimensionada(f,async d=>{const it=await get("insumos",id);if(!it)return;it.foto=d;await put("insumos",it);fichaInsumo(id);telaEstoqueManter();});}
async function removerFotoInsumo(id){const it=await get("insumos",id);if(!it)return;it.foto="";await put("insumos",it);fichaInsumo(id);telaEstoqueManter();}
// Redesenha a lista do estoque por trás da ficha, mantendo as seções abertas
async function telaEstoqueManter(){if(document.querySelector(".est113-sec"))await telaEstoque();}
async function histEstoque(insumos,movs){
  const nomeIns=id=>(insumos.find(i=>i.id===id)||{}).nome||"item removido";
  const arr=movs.slice().sort((a,b)=>(b.data||"").localeCompare(a.data||"")||(b.criadoEm||0)-(a.criadoEm||0)).map(m=>{
    const ent=m.tipo==="entrada";
    const cor=ent?"var(--verde)":"var(--perigo)";
    const vv=ent?(m.valorTotal||0):((m.qtd||0)*(m.custoUnit||0));
    return `<div class="card"><div class="row"><div class="ti" style="font-size:14px">${ent?"＋":"－"} ${esc(nomeIns(m.insumoId))}</div>
      <div style="font-weight:800;color:${cor};white-space:nowrap">${ent?"":"−"}${moeda(vv)}</div></div>
      <div class="meta">${fmt(m.data)} · ${numFmt(m.qtd)} ${esc(m.unidade||"")}${ent?(m.pago?" · pago":" · a pagar"):""}${m.obs?" · "+esc(m.obs):""}</div>
      <div style="margin-top:4px">${ent&&!m.pago?`<button class="btn-fant" style="padding:2px 8px 2px 0;color:var(--verde);font-weight:600" onclick="pagarEntradaInsumo('${m.id}')">Marcar pago</button>`:""}<button class="btn-fant" style="padding:2px 8px;color:var(--perigo)" onclick="excluirMovInsumo('${m.id}')">Excluir</button></div></div>`;
  });
  return arr.length?verMais(arr,"movimento(s)"):`<div class="meta" style="padding:2px 4px 8px">Sem movimentos ainda.</div>`;
}
async function formNovoInsumo(grupo,editId,catPadrao){
  const ed=editId?await get("insumos",editId):null;
  const g=ed?ed.grupo:(grupo||"gado");
  const cats=catsDoGrupo(g);
  const catAtual=ed?ed.categoria:(catPadrao&&cats.includes(catPadrao)?catPadrao:cats[0]);
  const [exemplo,unSug]=exemploInsumo(g,catAtual);
  const unAtual=ed?ed.unidade:unSug;
  const optCat=cats.map(c=>`<option value="${esc(c)}" ${c===catAtual?"selected":""}>${c}</option>`).join("");
  const optUn=UNID_INSUMO.map(u=>`<option value="${u}" ${u===unAtual?"selected":""}>${u}</option>`).join("");
  const med=g==="gado"&&CAT_MED_ESTOQUE.includes(catAtual);
  abrir(`<h2>${ed?"Editar item":"Novo item de estoque"}</h2>
    <label>Grupo</label><input value="${g==="manutencao"?"Manutenção da propriedade":"Insumos do gado"}" disabled>
    <input type="hidden" id="in_grupo" value="${g}">
    <label>Categoria</label><select id="in_cat" onchange="trocarCategoriaInsumo(${ed?"true":"false"})">${optCat}</select>
    <label>Nome *</label><input id="in_nome" value="${ed?esc(ed.nome||""):""}" placeholder="${esc(exemplo)}">
    <div id="in_grp_med" style="display:${med?"block":"none"}">
      <div id="in_grp_tipo" style="display:${catAtual==="Medicamento"?"block":"none"}"><label>Tipo de medicamento</label>
        <select id="in_tipomed"><option value="">— selecione —</option>${TIPOS_MEDICAMENTO.map(t=>`<option value="${t}" ${ed&&ed.tipoMed===t?"selected":""}>${t}</option>`).join("")}</select></div>
      <label>Fabricante</label><input id="in_fab" value="${ed?esc(ed.fabricante||""):""}" placeholder="Ex: Zoetis, MSD, Ourofino">
      <label>Marca comercial</label><input id="in_marca" value="${ed?esc(ed.marca||""):""}" placeholder="Ex: Ivomec Gold">
      <label>Observação</label><input id="in_obs" value="${ed?esc(ed.obs||""):""}" placeholder="Ex: carência de 35 dias, guardar na geladeira">
    </div>
    <label>Unidade</label><select id="in_un">${optUn}</select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarInsumo(${ed?`'${ed.id}'`:""})">Salvar</button></div>`);
}
function trocarCategoriaInsumo(editando){
  const g=val("in_grupo")||"gado",cat=val("in_cat");
  const [exemplo,unSug]=exemploInsumo(g,cat);
  const n=document.getElementById("in_nome");if(n)n.placeholder=exemplo;
  if(!editando){const u=document.getElementById("in_un");if(u)u.value=unSug;}
  const med=g==="gado"&&CAT_MED_ESTOQUE.includes(cat);
  const gm=document.getElementById("in_grp_med");if(gm)gm.style.display=med?"block":"none";
  const gt=document.getElementById("in_grp_tipo");if(gt)gt.style.display=cat==="Medicamento"?"block":"none";
}
async function formEditarInsumo(id){formNovoInsumo(null,id);}
async function salvarInsumo(id){
  const nome=val("in_nome"); if(!nome)return alert("Dê um nome ao item.");
  const grupo=val("in_grupo")||"gado", categoria=val("in_cat"), unidade=val("in_un");
  const med=grupo==="gado"&&CAT_MED_ESTOQUE.includes(categoria);
  const extra=med?{tipoMed:categoria==="Medicamento"?val("in_tipomed"):"",fabricante:val("in_fab"),marca:val("in_marca"),obs:val("in_obs")}:{};
  if(id){const it=await get("insumos",id);if(it){it.nome=nome;it.categoria=categoria;it.unidade=unidade;Object.assign(it,extra);await put("insumos",it);}}
  else await put("insumos",{id:uid(),nome,grupo,categoria,unidade,saldo:0,custoMedio:0,...extra,criadoEm:Date.now()});
  fechar();telaEstoque();
}
async function excluirInsumo(id){
  const movs=(await getAll("insumo_mov")).filter(m=>m.insumoId===id);
  if(movs.length)return alert("Este item tem movimentos registrados. Exclua os movimentos antes (ou mantenha o item para o histórico).");
  if(!confirm("Excluir este item de estoque?"))return;
  await del("insumos",id);fechar();telaEstoque();
}
async function formEntradaInsumo(id){
  const it=await get("insumos",id); if(!it){telaEstoque();return;}
  abrir(`<h2>Entrada — ${esc(it.nome)}</h2>
    <div class="meta" style="margin-bottom:8px">Saldo atual: <b>${numFmt(it.saldo)} ${esc(it.unidade||"un")}</b> · custo médio ${moeda(it.custoMedio||0)}</div>
    <label>Quantidade (${esc(it.unidade||"un")}) *</label><input id="en_qtd" inputmode="decimal" placeholder="Ex: 10">
    <label>Valor total pago (R$) *</label><input id="en_valor" inputmode="decimal" placeholder="Ex: 250">
    <label>Data</label><input id="en_data" type="date" value="${hoje()}">
    <label>Forma de pagamento</label><select id="en_forma"><option value="vista">À vista</option><option value="prazo">A prazo (fica a pagar)</option></select>
    <label>Observação (opcional)</label><input id="en_obs" placeholder="Ex: nota, fornecedor…">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEntradaInsumo('${id}')">Salvar</button></div>`);
}
async function salvarEntradaInsumo(id){
  const qtd=numBR("en_qtd"), valor=numBR("en_valor");
  if(qtd==null||qtd<=0)return alert("Informe a quantidade.");
  if(valor==null||valor<0)return alert("Informe o valor total.");
  const it=await get("insumos",id); if(!it)return;
  const saldoAnt=it.saldo||0, custoAnt=it.custoMedio||0, novoSaldo=saldoAnt+qtd;
  it.custoMedio=novoSaldo>0?((saldoAnt*custoAnt)+valor)/novoSaldo:0; // média móvel ponderada
  it.saldo=novoSaldo;
  await put("insumos",it);
  const forma=(document.getElementById("en_forma")||{}).value||"vista";
  await put("insumo_mov",{id:uid(),insumoId:id,tipo:"entrada",qtd,unidade:it.unidade||"un",
    valorTotal:valor,pago:forma==="vista",data:val("en_data"),obs:val("en_obs"),criadoEm:Date.now()});
  fechar();telaEstoque();
}
async function pagarEntradaInsumo(movId){
  const m=await get("insumo_mov",movId); if(!m)return telaEstoque();
  abrir(`<h2>Registrar pagamento</h2><div class="meta" style="margin-bottom:8px">Compra de insumo · ${moeda(m.valorTotal||0)}</div>
    <label>Data do pagamento</label><input id="pi_data" type="date" value="${hoje()}">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarPagtoInsumo('${movId}')">Salvar</button></div>`);
}
async function salvarPagtoInsumo(movId){
  const m=await get("insumo_mov",movId); if(!m)return fechar();
  const d=val("pi_data")||hoje(); if(d>hoje())return alert("A data do pagamento não pode ser no futuro.");
  m.pago=true;m.dataPagamento=d;await put("insumo_mov",m); fechar(); telaEstoque(); // V121: vira evento de pagamento no Diário
}
async function formConsumoInsumo(id){
  const it=await get("insumos",id); if(!it){telaEstoque();return;}
  if(ehMedicamentoEstoque(it))return formAplicacao({voltar:"estoque",medId:id}); // V144: remédio/vacina = aplicação
  if((it.saldo||0)<=0)return alert("Sem saldo para consumir. Registre uma entrada primeiro.");
  const {propriedades,lotes,pastos,grupos,animais}=await tudo();
  const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||"";
  const nAn=fn=>ativos.filter(fn).length;
  // V150: listas para marcar vários destinos
  window._consumoListas={
    propriedade:propriedades.map(p=>({id:p.id,t:p.nome,s:`${nAn(a=>(lotes.find(l=>l.id===a.loteAtualId)||{}).propriedadeId===p.id)} animal(is)`})),
    pasto:pastos.map(p=>({id:p.id,t:p.nome,s:[propriedades.length>1?nomeProp(p.propriedadeId):"",p.status==="Ocupado"&&p.loteId?`lote ${nomeLote(p.loteId)}`:(p.status==="Descanso"?"em descanso":"livre")].filter(Boolean).join(" · ")})),
    lote:lotes.map(l=>({id:l.id,t:l.nome,s:`${nAn(a=>a.loteAtualId===l.id)} animal(is)${propriedades.length>1&&nomeProp(l.propriedadeId)?" · "+nomeProp(l.propriedadeId):""}`})),
    grupo:(grupos||[]).map(g=>({id:g.id,t:g.nome,s:""})),
    animal:ativos.map(a=>({id:a.id,t:rotuloCod(a),s:nomeLote(a.loteAtualId)}))};
  const sug=it.grupo==="manutencao"?"pasto":"rebanho";
  abrir(`<h2>Consumo — ${esc(it.nome)}</h2>
    <div class="meta" style="margin-bottom:8px">Saldo: <b>${numFmt(it.saldo)} ${esc(it.unidade||"un")}</b> · custo médio ${moeda(it.custoMedio||0)}</div>
    <label>Quantidade usada (${esc(it.unidade||"un")}) *</label><input id="co_qtd" inputmode="decimal" placeholder="Ex: 2">
    <label>Data</label><input id="co_data" type="date" value="${hoje()}" max="${hoje()}">
    <label>Usado em *</label>
    <select id="co_apr_tipo" onchange="trocarDestinoConsumo()">
      ${[["rebanho",`Todo o rebanho (${ativos.length} animais ativos)`],["propriedade","Propriedades"],["pasto","Pastos"],["lote","Lotes"],["grupo","Grupos"],["animal","Animais"]].map(([k,t])=>`<option value="${k}" ${k===sug?"selected":""}>${t}</option>`).join("")}
    </select>
    <div id="co_apr_box" style="display:none;margin-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 2px 4px">
        <span id="co_apr_cont" class="meta">0 marcado(s)</span>
        <button type="button" class="btn-fant" style="padding:4px 0;color:var(--verde);font-weight:700" onclick="marcarTodosDestinoConsumo()">Marcar todos</button></div>
      <input id="co_apr_busca" placeholder="Buscar…" oninput="filtrarDestinoConsumo()" style="display:none;margin-bottom:6px">
      <div id="co_apr_lista" style="max-height:240px;overflow:auto;border-top:1px solid var(--linha)"></div>
    </div>
    <div id="co_apr_resumo" class="meta" style="margin-top:6px"></div>
    <label>Observação (opcional)</label><input id="co_obs" placeholder="${it.grupo==="manutencao"?"Ex: conserto da cerca do pasto Serra":"Ex: cocho do lote Bezerras"}">
    <div class="meta" style="margin-top:6px">O valor consumido (custo médio × quantidade) vira <b>custo de produção</b>, dividido entre os animais do destino, com a partida D Custo de produção / C Estoque de insumos.</div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarConsumoInsumo('${id}')">Registrar consumo</button></div>`);
  trocarDestinoConsumo();
}
function trocarDestinoConsumo(){
  const t=val("co_apr_tipo")||"rebanho",box=document.getElementById("co_apr_box"),lista=document.getElementById("co_apr_lista");
  if(!box||!lista)return;
  box.style.display=t==="rebanho"?"none":"block";
  const b=document.getElementById("co_apr_busca");if(b){b.style.display=t==="animal"?"block":"none";b.value="";}
  const arr=(window._consumoListas||{})[t]||[];
  lista.innerHTML=arr.length?arr.map(x=>`<label class="co-ck" data-b="${esc((x.t+" "+x.s).toLowerCase())}" style="display:flex;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--linha)">
      <input type="checkbox" class="co_apr_ck" value="${x.id}" onchange="resumoDestinoConsumo()" style="width:20px;height:20px;flex:0 0 auto">
      <span><b>${esc(x.t)}</b>${x.s?`<span class="meta" style="display:block">${esc(x.s)}</span>`:""}</span></label>`).join(""):`<div class="meta" style="padding:10px 0">Nada cadastrado.</div>`;
  resumoDestinoConsumo();
}
function filtrarDestinoConsumo(){const t=(val("co_apr_busca")||"").toLowerCase();document.querySelectorAll(".co-ck").forEach(l=>l.style.display=!t||l.dataset.b.includes(t)?"flex":"none");}
function marcarTodosDestinoConsumo(){
  const cks=[...document.querySelectorAll(".co-ck")].filter(l=>l.style.display!=="none").map(l=>l.querySelector("input"));
  const todos=cks.every(c=>c.checked);cks.forEach(c=>c.checked=!todos);resumoDestinoConsumo();
}
// Resolve o destino marcado: animais atingidos, propriedade e divisão do custo por lote
async function resolverDestinoConsumo(tipo,ids){
  const {lotes,pastos,animais}=await tudo();const ativos=animais.filter(a=>a.status==="Ativo");
  const propDoLote=id=>(lotes.find(l=>l.id===id)||{}).propriedadeId||null;
  let anim=[],props=[];
  if(tipo==="rebanho")anim=ativos;
  else if(tipo==="propriedade"){anim=ativos.filter(a=>ids.includes(propDoLote(a.loteAtualId)));props=ids.slice();}
  else if(tipo==="pasto"){const ps=pastos.filter(p=>ids.includes(p.id));const ls=ps.filter(p=>p.status==="Ocupado"&&p.loteId).map(p=>p.loteId);
    anim=ativos.filter(a=>ls.includes(a.loteAtualId));props=[...new Set(ps.map(p=>p.propriedadeId).filter(Boolean))];}
  else if(tipo==="lote")anim=ativos.filter(a=>ids.includes(a.loteAtualId));
  else if(tipo==="grupo"){const vs=(await getAll("grupo_animais")).filter(v=>ids.includes(v.grupoId));anim=ativos.filter(a=>vs.some(v=>v.animalId===a.id));}
  else if(tipo==="animal")anim=ativos.filter(a=>ids.includes(a.id));
  if(!props.length)props=[...new Set(anim.map(a=>propDoLote(a.loteAtualId)).filter(Boolean))];
  return {anim,propriedadeId:props.length===1?props[0]:null};
}
async function resumoDestinoConsumo(){
  const t=val("co_apr_tipo")||"rebanho";const ids=[...document.querySelectorAll(".co_apr_ck:checked")].map(c=>c.value);
  const c=document.getElementById("co_apr_cont");if(c)c.textContent=`${ids.length} marcado(s)`;
  const r=document.getElementById("co_apr_resumo");if(!r)return;
  if(t!=="rebanho"&&!ids.length){r.textContent="";return;}
  const {anim}=await resolverDestinoConsumo(t,ids);
  r.innerHTML=anim.length?`Custo dividido entre <b>${anim.length} animal(is)</b>.`:`Nenhum animal ativo nesse destino: o custo fica na propriedade, sem divisão por lote.`;
}
async function salvarConsumoInsumo(id){
  const qtd=numBR("co_qtd");
  if(qtd==null||qtd<=0)return alert("Informe a quantidade.");
  const it=await get("insumos",id); if(!it)return;
  if(qtd>(it.saldo||0)+1e-9)return alert("Quantidade maior que o saldo ("+numFmt(it.saldo)+" "+(it.unidade||"un")+").");
  const custoUnit=it.custoMedio||0;
  it.saldo=(it.saldo||0)-qtd; await put("insumos",it);
  const data=val("co_data"), obs=val("co_obs"), movId=uid();
  await put("insumo_mov",{id:movId,insumoId:id,tipo:"consumo",qtd,unidade:it.unidade||"un",custoUnit,data,obs,criadoEm:Date.now()});
  const catDesp=DESPESA_DE_INSUMO[it.grupo]||"Outros";
  await put("lancamentos",{id:uid(),tipo:"despesa",categoria:catDesp,valor:qtd*custoUnit,classe:"admin",
    data,descricao:`Consumo ${it.nome} (${numFmt(qtd)} ${it.unidade||"un"})`,propriedadeId:null,
    pago:true,origem:"consumo_insumo",refId:movId,criadoEm:Date.now()});
  fechar();telaEstoque();
}
async function excluirMovInsumo(movId){
  const m=await get("insumo_mov",movId); if(!m){telaEstoque();return;}
  if(m.aplicacaoId)return alert("Este consumo veio de uma aplicação de medicamento. Para desfazer, exclua a aplicação no histórico de manejo (Manejo › Histórico) ou na ficha do animal: o estoque e o custo voltam sozinhos.");
  if(!confirm("Excluir este movimento? O saldo e o custo médio serão recalculados."))return;
  if(m.tipo==="consumo"){
    const lancs=(await getAll("lancamentos")).filter(l=>l.origem==="consumo_insumo"&&l.refId===movId);
    for(const l of lancs)await del("lancamentos",l.id);
  }
  await del("insumo_mov",movId);
  await reconstruirInsumo(m.insumoId);
  telaEstoque();
}
async function reconstruirInsumo(insumoId){
  const it=await get("insumos",insumoId); if(!it)return;
  const movs=(await getAll("insumo_mov")).filter(m=>m.insumoId===insumoId)
    .sort((a,b)=>(a.data||"").localeCompare(b.data||"")||(a.criadoEm||0)-(b.criadoEm||0));
  let saldo=0, custo=0;
  for(const m of movs){
    if(m.tipo==="entrada"){const ns=saldo+(m.qtd||0);custo=ns>0?((saldo*custo)+(m.valorTotal||0))/ns:0;saldo=ns;}
    else{saldo=Math.max(0,saldo-(m.qtd||0));}
  }
  it.saldo=saldo; it.custoMedio=custo; await put("insumos",it);
}

async function finConfig(){
  if(!(await podeUsarApp("Acessar configurações financeiras")))return;
  topoPagina();
  $t.innerHTML=`${finHead()}${finTabsBar("config")}
    <div class="card"><b>Como as contas funcionam</b>
      <div class="meta" style="margin-top:8px;line-height:1.55">• Regime de <b>competência</b>: cada valor entra na data do fato, não na data do pagamento.<br>
      • <b>Compra de animal</b> não é despesa — vira <b>estoque</b> (ativo) pelo preço de compra.<br>
      • <b>Modelo de custo</b>: o rebanho fica registrado pelo que custou; o lucro aparece na venda.<br>
      • <b>Bezerro nascido</b> na propriedade entra no estoque com custo <b>zero</b>: o custo de produzi-lo já está nas despesas do período.<br>
      • <b>Venda</b>: <b>D</b> Banco/Clientes · <b>C</b> Receita e <b>D</b> CPV · <b>C</b> Estoque (custo de compra dos animais vendidos; zero para os nascidos).<br>
      • <b>Morte</b> de animal comprado: baixa o estoque como <b>perda</b> (<b>D</b> Perda com morte de animais · <b>C</b> Estoque), despesa sem saída de caixa.<br>
      • <b>Excluir</b> um lançamento, compra de insumo ou animal <b>estorna</b> as partidas dele no Livro Diário (partida inversa na mesma data). Excluir o evento de morte desfaz a baixa.<br>
      • <b>À vista</b> entra no caixa na data do fato; <b>a prazo</b> fica em Clientes (a receber) ou Fornecedores (a pagar).<br>
      • <b>Pagamento e recebimento</b> são eventos próprios, com data e valor (aceita parcelas): <b>D</b> Banco · <b>C</b> Clientes ou <b>D</b> Fornecedores · <b>C</b> Banco. O lançamento original não é reescrito.<br>
      • <b>Compra de animal</b> gera o lançamento "Compra de animais" (não é despesa): à vista já sai paga; a prazo entra em "A pagar".<br>
      • <b>Valor do rebanho</b> (contábil) = soma do custo de estoque dos animais ativos.</div></div>
    <div class="meta" style="padding:0 4px;margin-top:8px;line-height:1.5">Não sou contador — para fins de imposto (Livro Caixa do Produtor Rural, que é regime de caixa) confirme com um contador rural.</div>`;
}

function sobreApp(){abrir(`<h2>Gestão do Rebanho</h2>
  <div class="meta">Controle de rebanho por lote e grupos — vacinação, manejo, nascimentos, saídas e histórico por animal.</div>
  <div class="meta" style="margin-top:8px">Funciona offline. Os dados ficam guardados neste aparelho — lembre de fazer backup em Perfil.</div>
  <button class="btn" style="margin-top:16px" onclick="fechar()">Fechar</button>`);}

function formNovaPropriedade(){abrir(`<h2>Nova propriedade</h2>
  <label>Nome *</label><input id="p_nome" placeholder="Ex: Fazenda Garrafão">
  <label>Localização</label><input id="p_local" placeholder="Ex: Garrafão - Campos RJ">
  <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
    <button class="btn" onclick="salvarPropriedade()">Salvar</button></div>`);}
async function salvarPropriedade(){const n=val("p_nome");if(!n)return alert("Dê um nome.");
  await put("propriedades",{id:uid(),nome:n,local:val("p_local"),criadoEm:Date.now()});fechar();render();}

async function formNovoLote(propFixa){
  if(!(await podeUsarApp("Cadastrar lote")))return;
  const props=await getAll("propriedades");
  if(props.length===0){fechar();return alert("Cadastre uma propriedade primeiro (menu + ).");}
  const opt=props.map(p=>`<option value="${p.id}" ${p.id===propFixa?"selected":""}>${esc(p.nome)}</option>`).join("");
  abrir(`<h2>Novo lote</h2>
    <label>Propriedade *</label><select id="l_prop">${opt}</select>
    <label>Nome do lote *</label><input id="l_nome" placeholder="Ex: Bezerras 2025">
    <label>Descrição</label><input id="l_desc" placeholder="Ex: piquete 3, recria">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarLote()">Salvar</button></div>`);}
/* V122 — nome de lote único (ignora maiúsculas, acentos e espaços extras) + edição do lote */
const chaveNomeLote=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLocaleLowerCase("pt-BR");
async function loteComMesmoNome(nome,ignorarId){
  const k=chaveNomeLote(nome);
  return (await getAll("lotes")).find(l=>l.id!==ignorarId&&chaveNomeLote(l.nome)===k)||null;
}
async function salvarLote(){const n=val("l_nome").replace(/\s+/g," ");if(!n)return alert("Dê um nome ao lote.");
  const dup=await loteComMesmoNome(n);
  if(dup)return alert(`Já existe um lote chamado "${dup.nome}". Escolha outro nome.`);
  await put("lotes",{id:uid(),nome:n,descricao:val("l_desc"),propriedadeId:val("l_prop"),criadoEm:Date.now()});fechar();render();}
async function formEditarLote(id){
  if(!(await podeUsarApp("Editar lote")))return;
  const l=await get("lotes",id);if(!l)return;
  const props=await getAll("propriedades");
  const opt=props.map(p=>`<option value="${p.id}" ${p.id===l.propriedadeId?"selected":""}>${esc(p.nome)}</option>`).join("");
  abrir(`<h2>Editar lote</h2>
    <label>Propriedade *</label><select id="le_prop">${opt}</select>
    <label>Nome do lote *</label><input id="le_nome" value="${esc(l.nome||"")}">
    <label>Descrição</label><input id="le_desc" value="${esc(l.descricao||"")}" placeholder="Ex: piquete 3, recria">
    <div class="meta" style="margin-top:8px">Os animais continuam no lote; se mudar a propriedade, eles passam a contar na nova propriedade.</div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEdicaoLote('${id}')">Salvar</button></div>`);
}
async function salvarEdicaoLote(id){
  const l=await get("lotes",id);if(!l)return fechar();
  const n=val("le_nome").replace(/\s+/g," ");if(!n)return alert("Dê um nome ao lote.");
  const dup=await loteComMesmoNome(n,id);
  if(dup)return alert(`Já existe outro lote chamado "${dup.nome}". Escolha outro nome.`);
  const novaProp=val("le_prop")||l.propriedadeId;
  if(novaProp!==l.propriedadeId){
    const n=(await getAll("animais")).filter(a=>a.loteAtualId===id&&a.status==="Ativo").length;
    if(n&&!confirm(`Mudar a propriedade deste lote leva junto ${n} animal(is) ativo(s). Continuar?`))return;
  }
  l.nome=n;l.descricao=val("le_desc");l.propriedadeId=novaProp;
  await put("lotes",l);fechar();verLote(id);
}
