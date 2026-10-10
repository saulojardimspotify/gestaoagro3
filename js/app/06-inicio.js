/* Gestão do Rebanho — js/app/06-inicio.js
   Página inicial (pendências, atalhos, rebanho hoje, financeiro) e atalhos.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= INÍCIO ======================= */
function homeMoney(v){
  return moeda(Number(v)||0);
}
async function telaInicio(){
  topoPagina();
  const {propriedades,lotes,animais,pastos}=await tudo();
  const ativos=animais.filter(a=>a.status==="Ativo");
  const ano=String(new Date().getFullYear());
  const lancs=(await getAll("lancamentos")).filter(l=>l.tipo!=="partida_contabil"&&(l.data||"").slice(0,4)===ano);
  const receita=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.valor||0),0);
  const cpv=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.custo||0),0);
  const despesas=lancs.filter(l=>l.tipo==="despesa").reduce((s,l)=>s+(l.valor||0),0);
  const ganhoReal=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.ganhoRealizado||0),0);
  const resultado=receita-cpv-despesas+ganhoReal;
  const todosLancs=(await getAll("lancamentos")).filter(l=>l.tipo!=="partida_contabil"); // V121: em aberto de qualquer ano
  const aReceber=somaAReceber(todosLancs);
  const aPagar=somaAPagar(todosLancs)
    +(await getAll("insumo_mov")).filter(m=>m.tipo==="entrada"&&!m.pago).reduce((s,m)=>s+(m.valorTotal||0),0);

  // V141: valor do rebanho (custo de estoque dos ativos) — mesma regra do Financeiro › Resumo
  const valorRebanho=ativos.reduce((s,a)=>s+(a.custoEstoque||0),0);
  // V148: nascidos na propriedade (custo zero no estoque, por isso fora do "valor do rebanho")
  const nascidosProp=ativos.filter(a=>a.nascidoNaPropriedade===true);
  const idadeMeses=a=>{const t=dataParaTs(a.dataNascimento);if(t==null)return null;const n=new Date(t),h=new Date();return (h.getFullYear()-n.getFullYear())*12+(h.getMonth()-n.getMonth())-(h.getDate()<n.getDate()?1:0);};
  const nasAte24=nascidosProp.filter(a=>{const m=idadeMeses(a);return m!=null&&m<=24;}).length;
  const nasAcima24=nascidosProp.filter(a=>{const m=idadeMeses(a);return m!=null&&m>24;}).length;
  const nasSemData=nascidosProp.length-nasAte24-nasAcima24;
  // V143: rebanho hoje por propriedade, dono e lote (em abas)
  const {marcas}=await tudo();
  const loteDe=id=>lotes.find(l=>l.id===id);
  const propDe=a=>{const l=loteDe(a.loteAtualId);return l&&propriedades.find(p=>p.id===l.propriedadeId)?l.propriedadeId:"__sem";};
  const contar=(lista,fn)=>{const m=new Map();for(const a of lista){const k=fn(a);m.set(k,(m.get(k)||0)+1);}return m;};
  const ordenar=arr=>arr.filter(x=>x.n>0).sort((x,y)=>y.n-x.n||String(x.nome).localeCompare(String(y.nome)));
  const linha=x=>`<div class="reb-lin${x.onclick?" rt":""}" ${x.onclick?`onclick="${x.onclick}"`:""}><div class="reb-txt"><div class="reb-nome">${x.nome}</div>${x.sub?`<div class="reb-sub">${x.sub}</div>`:""}</div><div class="reb-n">${x.n}</div>${x.chev?`<span class="reb-chev">⌄</span>`:""}</div>${x.det||""}`;
  // propriedades (tocar abre os lotes da propriedade)
  const cProp=contar(ativos,propDe);
  const porProp=ordenar([...propriedades.map(p=>({id:p.id,nome:esc(p.nome),n:cProp.get(p.id)||0})),{id:"__sem",nome:"Sem propriedade",n:cProp.get("__sem")||0}]).map((x,k)=>{
    const daProp=ativos.filter(a=>propDe(a)===x.id);
    const cl=contar(daProp,a=>loteDe(a.loteAtualId)?a.loteAtualId:"__sem");
    const itens=ordenar([...lotes.map(l=>({nome:esc(l.nome),n:cl.get(l.id)||0,onclick:`verLote('${l.id}')`})),{nome:"Sem lote",n:cl.get("__sem")||0,onclick:`abrirAnimaisFiltro('lote','__sem')`}]);
    return {...x,chev:true,onclick:`abrirRebDet(this,'rbp${k}')`,
      det:`<div class="reb-det" id="rbp${k}">${itens.map(i=>`<div class="rd" onclick="${i.onclick}"><span>${i.nome}</span><b>${i.n}</b></div>`).join("")}</div>`};
  });
  // donos
  const cDono=contar(ativos,a=>a.marcaId&&marcas.find(m=>m.id===a.marcaId)?a.marcaId:"__sem");
  const porDono=ordenar([...marcas.map(m=>({nome:esc(m.sigla||m.nome||"Marca"),sub:m.sigla&&m.nome?esc(m.nome):"",n:cDono.get(m.id)||0,onclick:`abrirAnimaisFiltro('marca','${m.id}')`})),
    {nome:"Sem dono informado",n:cDono.get("__sem")||0,onclick:`abrirAnimaisFiltro('marca','__sem')`}]);
  // lotes
  const cLote=contar(ativos,a=>loteDe(a.loteAtualId)?a.loteAtualId:"__sem");
  const porLote=ordenar([...lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);return{nome:esc(l.nome),sub:p?esc(p.nome):"",n:cLote.get(l.id)||0,onclick:`verLote('${l.id}')`};}),
    {nome:"Sem lote",n:cLote.get("__sem")||0,onclick:`abrirAnimaisFiltro('lote','__sem')`}]);
  let abaReb="prop";try{abaReb=localStorage.getItem("rebanho_home_aba")||"prop";}catch(_){}
  if(!["prop","dono","lote"].includes(abaReb))abaReb="prop";
  const listaReb=(k,arr)=>`<div class="reb-lista${abaReb===k?" on":""}" data-reb="${k}">${arr.length?arr.map(linha).join(""):`<div class="meta" style="padding:12px 0">Nenhum animal ativo.</div>`}</div>`;
  const blocoRebanho=`<div class="card reb-card">
      <div class="reb-total"><b>${ativos.length}</b><div><div class="rt1">${ativos.length===1?"animal ativo":"animais ativos"}</div><div class="rt2">${propriedades.length>1?"Todas as propriedades":(propriedades[0]?esc(propriedades[0].nome):"")}</div></div></div>
      <div class="reb-abas">${[["prop","Propriedades"],["dono","Donos"],["lote","Lotes"]].map(([k,t])=>`<button class="${abaReb===k?"on":""}" onclick="trocarAbaReb('${k}')">${t}</button>`).join("")}</div>
      ${listaReb("prop",porProp)}${listaReb("dono",porDono)}${listaReb("lote",porLote)}
    </div>`;

  // Nome do usuário
  const user=await authUser();
  let perfilLocal=null; try{perfilLocal=await getRaw("perfil","perfil");}catch(_){}
  const nomeCompleto=(user&&user.user_metadata&&user.user_metadata.full_name)
    ||(perfilLocal&&perfilLocal.nome)
    ||(user&&user.email?user.email.split("@")[0]:"produtor(a)");
  const primeiroNome=String(nomeCompleto).trim().split(/\s+/)[0]||"produtor(a)";

  // Avisos importantes
  const hojeTs=dataParaTs(hoje());
  const iconeAviso=(typeof ICONE_AVISO!=="undefined"&&ICONE_AVISO)||{};
  // 1) desmamas que passaram do prazo (210 dias)
  const desmAtras=animais.filter(a=>a.nascidoNaPropriedade===true&&a.status==="Ativo"&&!a.desmamado&&a.dataNascimento)
    .map(a=>({a,d:DIAS_DESMAMA-diasEntre(dataParaTs(a.dataNascimento),Date.now())}))
    .filter(x=>x.d<0).sort((x,y)=>x.d-y.d);
  // 2) avisos com data nos próximos 10 dias (V147) — doses atrasadas também aparecem
  const DIAS_AVISO_HOME=10;
  const pendAvisos=(await getAll("avisos")).filter(a=>!a.feito&&a.data);
  const diasAte=a=>Math.round((dataParaTs(a.data)-hojeTs)/86400000);
  const eventosFut=pendAvisos.filter(a=>{const d=diasAte(a);return d<=DIAS_AVISO_HOME&&(d>=0||a.tipo==="Próxima dose");})
    .sort((x,y)=>(x.data||"").localeCompare(y.data||""));
  const maisAdiante=pendAvisos.filter(a=>diasAte(a)>DIAS_AVISO_HOME).length;
  // 3) pastos há mais de 3 meses no mesmo estado (ocupado ou reservado)
  const pastos3m=(pastos||[]).filter(p=>(p.status==="Ocupado"||p.status==="Descanso")&&diasEntre(p.statusDesde||p.criadoEm,Date.now())>90)
    .map(p=>({p,d:diasEntre(p.statusDesde||p.criadoEm,Date.now())})).sort((x,y)=>y.d-x.d);

  const itensAviso=[];
  desmAtras.forEach(x=>itensAviso.push(`<div class="card rt" onclick="verAnimal('${x.a.id}')" style="border-left:4px solid #c0392b">
    <div class="ti" style="font-size:15px">🍼 Desmama atrasada — ${esc(rotuloCod(x.a))}</div>
    <div class="meta" style="color:#c0392b;font-weight:600">Passou ${-x.d} dia(s) do prazo de 210 dias</div></div>`));
  eventosFut.forEach(a=>{const dd=Math.round((dataParaTs(a.data)-hojeTs)/86400000);
    const quando=dd<0?`atrasada há ${-dd} dia(s)`:dd===0?"hoje":(dd===1?"amanhã":`em ${dd} dias`);
    itensAviso.push(`<div class="card rt" onclick="telaAvisos()" style="border-left:4px solid #e0a800">
      <div class="ti" style="font-size:15px">${iconeAviso[a.tipo]||"🔔"} ${esc(a.tipo||"Evento")} — ${quando}</div>
      ${a.detalhe?`<div class="meta">${esc(a.detalhe)}</div>`:""}
      <div class="meta">📅 ${fmt(a.data)}</div></div>`);});
  pastos3m.forEach(x=>{const meses=Math.floor(x.d/30);
    itensAviso.push(`<div class="card rt" onclick="verPasto('${x.p.id}')" style="border-left:4px solid #e0a800">
      <div class="ti" style="font-size:15px">🌱 ${esc(x.p.nome)} — ${x.p.status==="Ocupado"?"ocupado":"reservado"} há ${x.d} dias</div>
      <div class="meta">Mais de 3 meses no mesmo estado (${meses} ${meses===1?"mês":"meses"})</div></div>`);});

  const linkMais=maisAdiante?`<div class="meta rt" style="margin:2px 4px 10px;cursor:pointer;color:var(--verde);font-weight:600" onclick="telaAvisos()">${maisAdiante} aviso(s) mais adiante · ver em Avisos ›</div>`:"";
  const blocoAvisos=itensAviso.length
    ? `<div class="h3" style="margin-top:4px">🔔 Avisos importantes</div>${itensAviso.join("")}${linkMais}`
    : `<div class="card" style="border-left:4px solid var(--verde)"><div class="ti" style="font-size:15px;color:var(--verde-esc)">✅ Tudo em dia</div><div class="meta" style="margin-top:4px">Sem desmamas atrasadas, avisos para os próximos ${DIAS_AVISO_HOME} dias ou pastos há mais de 3 meses no mesmo estado.</div></div>${linkMais}`;

  $t.innerHTML=`
    <div class="home-greet">
      <h2>Olá, ${esc(primeiroNome)}.</h2>
      <div class="hg-sub">Seja bem-vindo(a) 👋</div>
    </div>

    ${avisoInstalarHome()}
    ${blocoAvisos}

    <div class="home-sec">${ico("grade")}Atalhos rápidos</div>
    <div class="atalhos">
      <button class="atalho" onclick="atalhoTrocarPasto()"><span class="at-ic">${ico("pasto")}</span>Trocar lote de pasto</button>
      <button class="atalho" onclick="atalhoServico()"><span class="at-ic">${ico("chave")}</span>Serviço prestado</button>
      <button class="atalho" onclick="atalhoEstoque()"><span class="at-ic">${ico("caixa")}</span>Entrada no estoque</button>
      <button class="atalho" onclick="formNovoAviso()"><span class="at-ic">${ico("sino")}</span>Cadastrar aviso</button>
    </div>

    <div class="home-sec">${ico("boi")}Rebanho hoje<span class="hs-mais" onclick="abrirAnimaisOperacional()">Ver animais ›</span></div>
    ${blocoRebanho}

    <div class="home-sec">${ico("carteira")}Financeiro ${ano}<span class="hs-mais" onclick="menuFinanceiro()">Detalhes ›</span></div>
    <div class="fin-home">
      <div class="fh res" onclick="menuFinanceiro()"><div class="l">Resultado líquido de ${ano}</div><div class="v ${resultado<0?"neg":""}">${homeMoney(resultado)}</div></div>
      <div class="fh" onclick="menuFinanceiro()"><div class="l">Valor do rebanho</div><div class="v">${homeMoney(valorRebanho)}</div></div>
      <div class="fh" onclick="menuFinanceiro()"><div class="l">A pagar</div><div class="v ${aPagar>0?"neg":""}">${homeMoney(aPagar)}</div></div>
      <div class="fh" onclick="menuFinanceiro()"><div class="l">Receita</div><div class="v">${homeMoney(receita)}</div></div>
      <div class="fh" onclick="menuFinanceiro()"><div class="l">Custos + despesas</div><div class="v neg">${homeMoney(despesas)}</div></div>
      <div class="fh nasc" style="grid-column:1/-1;cursor:pointer" onclick="abrirAnimaisFiltro('desmama','todos')">
        <div class="l">Nascidos na propriedade · fora do valor do rebanho</div>
        <div style="display:flex;gap:10px;margin-top:6px">
          <div style="flex:1;background:var(--verde-lite);border-radius:12px;padding:8px 10px"><div class="l">Até 24 meses</div><div class="v">${nasAte24}</div></div>
          <div style="flex:1;background:var(--verde-lite);border-radius:12px;padding:8px 10px"><div class="l">Acima de 24 meses</div><div class="v">${nasAcima24}</div></div>
        </div>
        <div class="l" style="margin-top:6px;font-size:11.5px">Entram com custo zero no estoque (modelo de custo), então não somam no valor do rebanho.${nasSemData?` ${nasSemData} sem data de nascimento.`:""}</div>
      </div>
    </div>
</div>`;
}
/* V143: abas e detalhes do bloco "Rebanho hoje" */
function trocarAbaReb(k){
  try{localStorage.setItem("rebanho_home_aba",k);}catch(_){}
  document.querySelectorAll(".reb-abas button").forEach((b,i)=>b.classList.toggle("on",["prop","dono","lote"][i]===k));
  document.querySelectorAll(".reb-lista").forEach(l=>l.classList.toggle("on",l.dataset.reb===k));
}
function abrirRebDet(el,id){
  const d=document.getElementById(id);if(!d)return;
  const on=!d.classList.contains("on");d.classList.toggle("on",on);el.classList.toggle("aberto",on);
  el.style.borderBottom=on?"none":"";
}
/* ======================= V141: ATALHOS DA PÁGINA INICIAL ======================= */
// Abre a lista de Animais já filtrada (ex.: por dono ou por lote)
async function abrirAnimaisFiltro(tipo,crit){
  if(await exigirCadastroInicial())return;
  aba="painel";marcarNav("painel");
  await telaAnimais();
  const t=document.getElementById("f_tipo");if(!t)return;
  t.value=tipo;atualizarCriterioFiltroAnimais();
  const c=document.getElementById("f_criterio");if(c){c.value=crit;filtrarAnimais();}
}
// Trocar o lote de pasto: fecha o período do pasto antigo e ocupa o novo
async function atalhoTrocarPasto(){
  if(!(await podeUsarApp("Trocar lote de pasto")))return;
  const {propriedades,lotes,pastos,animais}=await tudo();
  if(!lotes.length)return alert("Cadastre um lote primeiro.");
  if(!pastos.length)return alert("Cadastre um pasto primeiro (Gestão Operacional › Gestão de Pastos).");
  const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||"";
  const ativosLote=id=>animais.filter(a=>a.status==="Ativo"&&a.loteAtualId===id).length;
  const pastoDoLote=id=>pastos.find(p=>p.status==="Ocupado"&&p.loteId===id);
  const optLote=`<option value="">— selecione —</option>`+lotes.map(l=>{const pa=pastoDoLote(l.id);
    return`<option value="${l.id}">${esc(l.nome)} (${ativosLote(l.id)})${pa?` — hoje no ${esc(pa.nome)}`:""}</option>`;}).join("");
  const sit=p=>p.status==="Ocupado"?`ocupado${p.loteId?` por ${esc((lotes.find(l=>l.id===p.loteId)||{}).nome||"lote")}`:""}`:(p.status==="Descanso"?"em descanso":"livre");
  const optPasto=`<option value="">— selecione —</option>`+pastos.map(p=>`<option value="${p.id}">${esc(p.nome)}${propriedades.length>1&&nomeProp(p.propriedadeId)?` · ${esc(nomeProp(p.propriedadeId))}`:""} — ${sit(p)}</option>`).join("");
  abrir(`<h2>Trocar lote de pasto</h2>
    <label>Lote *</label><select id="tp_lote">${optLote}</select>
    <label>Novo pasto *</label><select id="tp_pasto">${optPasto}</select>
    <label>Data da troca</label><input id="tp_data" type="date" value="${hoje()}" max="${hoje()}">
    <label>O pasto de onde o lote saiu fica</label>
    <select id="tp_saida"><option value="Descanso">Em descanso (capim recuperando)</option><option value="Livre">Livre</option></select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarTrocaPasto()">Salvar</button></div>`);
}
async function salvarTrocaPasto(){
  const loteId=val("tp_lote"),pastoId=val("tp_pasto"),data=val("tp_data")||hoje(),saida=val("tp_saida")||"Descanso";
  if(!loteId)return alert("Selecione o lote.");
  if(!pastoId)return alert("Selecione o novo pasto.");
  if(data>hoje())return alert("A data da troca não pode ser no futuro.");
  const quando=data===hoje()?Date.now():dataParaTs(data);
  const pastos=await getAll("pastos");
  const destino=pastos.find(p=>p.id===pastoId);if(!destino)return;
  if(destino.status==="Ocupado"&&destino.loteId===loteId)return alert("Este lote já está nesse pasto.");
  if(destino.status==="Ocupado"&&destino.loteId&&destino.loteId!==loteId){
    const outro=await get("lotes",destino.loteId);
    return alert(`O pasto ${destino.nome} está ocupado pelo lote ${outro?outro.nome:"outro"}. Troque esse lote de pasto primeiro ou escolha outro pasto.`);
  }
  const fechaPeriodo=(p)=>{if(!p.historico)p.historico=[];if(p.statusDesde==null)p.statusDesde=p.criadoEm||quando;
    p.historico.push({status:p.status||"Livre",inicio:p.statusDesde,fim:quando,loteId:p.loteId||null});p.statusDesde=quando;};
  // pasto de onde o lote sai
  for(const p of pastos.filter(x=>x.id!==pastoId&&x.status==="Ocupado"&&x.loteId===loteId)){
    fechaPeriodo(p);p.status=saida;p.loteId=null;await put("pastos",p);
  }
  fechaPeriodo(destino);destino.status="Ocupado";destino.loteId=loteId;await put("pastos",destino);
  fechar();alert("Troca de pasto registrada.");renderSeguro();
}
// Serviço prestado: abre o lançamento como custo de produção · mão de obra
async function atalhoServico(){
  if(typeof finNovoClassificado!=="function")return formLancamento();
  await finNovoClassificado("custo");
  const h=document.querySelector("#md h2");if(h)h.textContent="Serviço prestado";
  const c=document.getElementById("lc_cat");if(c&&[...c.options].some(o=>o.value==="Mão de obra"))c.value="Mão de obra";
  const d=document.getElementById("lc_desc");if(d&&!d.value)d.placeholder="Ex: diária de vaqueiro, roçada, veterinário…";
}
// Entrada no estoque: escolhe o item (ou cadastra um novo) e abre a entrada
async function atalhoEstoque(){
  if(!(await podeUsarApp("Registrar entrada no estoque")))return;
  const itens=(await getAll("insumos")).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
  const grupo=(g,t)=>{const arr=itens.filter(i=>(i.grupo||"gado")===g);return arr.length?`<optgroup label="${t}">${arr.map(i=>`<option value="${i.id}">${esc(i.nome)} — saldo ${numFmt(i.saldo||0)} ${esc(i.unidade||"un")}</option>`).join("")}</optgroup>`:"";};
  abrir(`<h2>Entrada no estoque</h2>
    <div class="meta" style="margin-bottom:6px">Medicamentos, sal, arame, estacas e outros itens.</div>
    ${itens.length?`<label>Item *</label><select id="ae_item"><option value="">— selecione —</option>${grupo("gado","Insumos do gado")}${grupo("manutencao","Manutenção da propriedade")}</select>
    <button class="btn" style="margin-top:16px" onclick="if(!val('ae_item'))return alert('Selecione o item.');formEntradaInsumo(val('ae_item'))">Continuar</button>`
    :`<div class="meta" style="margin:8px 0">Ainda não há itens cadastrados no estoque.</div>`}
    <div class="lado" style="margin-top:10px"><button class="btn btn-sec" onclick="formNovoInsumo('gado')">+ Item do gado</button>
      <button class="btn btn-sec" onclick="formNovoInsumo('manutencao')">+ Item de manutenção</button></div>
    <button class="btn-fant" style="margin-top:6px" onclick="fechar()">Cancelar</button>`);
}
function marcarNav(a){
  document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("ativo",x.dataset.aba===a));
}
async function abrirOperacional(){
  if(await exigirCadastroInicial())return;
  aba="painel";
  marcarNav("painel");
  telaPainel();
}
async function abrirLotesOperacional(){
  if(await exigirCadastroInicial())return;
  aba="painel";
  marcarNav("painel");
  telaLotesGrupos();
}
// V152: entrada única para Lotes e Grupos
async function telaLotesGrupos(){
  topoPagina();
  const {lotes,animais,grupos,grupo_animais}=await tudo();
  const ativos=animais.filter(a=>a.status==="Ativo");
  const ativosIds=new Set(ativos.map(a=>a.id));
  const emLote=ativos.filter(a=>lotes.some(l=>l.id===a.loteAtualId)).length;
  const emGrupo=new Set(grupo_animais.filter(v=>ativosIds.has(v.animalId)&&grupos.some(g=>g.id===v.grupoId)).map(v=>v.animalId)).size;
  $t.innerHTML=`<button class="voltar" onclick="irAba('painel')">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">${ico("cerca")}</span><h2>Lotes e Grupos</h2></div>
    <div class="meta" style="margin:-4px 4px 14px">O <b>lote</b> é onde o animal está (cada animal fica em um só). O <b>grupo</b> é uma classificação extra — o mesmo animal pode estar em vários grupos sem mudar de lote.</div>
    <div class="mod-list">
      ${mod(ico("cerca"),"Lotes",`${lotes.length} lote(s) · ${emLote} animal(is) ativo(s)`,"telaLotes()")}
      ${mod(ico("pessoas"),"Grupos",`${grupos.length} grupo(s) · ${emGrupo} animal(is) em algum grupo`,"telaGrupos()")}
    </div>`;
}
async function abrirAnimaisOperacional(){
  if(await exigirCadastroInicial())return;
  aba="painel";
  marcarNav("painel");
  telaAnimais();
}
