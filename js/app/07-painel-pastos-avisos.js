/* Gestão do Rebanho — js/app/07-painel-pastos-avisos.js
   Gestão Operacional (módulos), pastos, avisos e próximas doses.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= PAINEL (dashboard) ======================= */
async function telaPainel(){
  topoPagina();
  const {propriedades,marcas,lotes,animais,pastos}=await tudo();
  const ativos=animais.filter(a=>a.status==="Ativo");
  const total=ativos.length;
  const cfg=await getConfig();
  const dias=diasDesde(cfg.ultimoBackup), freq=cfg.lembreteDias||7;
  const precisaBackup=animais.length>0 && !_lembreteOculto && (dias===null||dias>=freq);
  const lembrete=precisaBackup?`
    <div class="card" style="border-left:4px solid #e0a800;background:#fffdf5">
      <b>☁️ Hora de fazer backup</b>
      <div class="meta" style="margin:4px 0 10px">${dias===null?"Você ainda não salvou nenhum backup.":`Último backup há ${dias} dia(s).`} Salve no iCloud/Arquivos pra não perder nada.</div>
      <button class="btn" style="margin:0 0 8px" onclick="salvarNuvem()">☁️ Salvar backup agora</button>
      <button class="btn-fant" style="padding:6px" onclick="_lembreteOculto=true;telaPainel()">Agora não</button>
    </div>`:"";
  let pastoResumo="";
  if(pastos.length){
    const contaLote=lid=>ativos.filter(a=>a.loteAtualId===lid).length;
    const linhaPasto=pt=>{
      const n=(pt.status==="Ocupado"&&pt.loteId)?contaLote(pt.loteId):0;
      return `<div class="row" style="padding:8px 0;border-top:1px solid var(--linha)">
        <div class="ti" style="font-size:15px">${esc(pt.nome)}</div>
        <div>${pt.status==="Ocupado"?`<span class="badge">${n} 🐄</span>`:pastoStatusChip(pt)}</div></div>`;
    };
    let grupos="";
    for(const pr of propriedades){
      const meus=pastos.filter(pt=>pt.propriedadeId===pr.id);
      if(!meus.length)continue;
      grupos+=`<div class="meta" style="font-weight:700;color:var(--verde-esc);margin:12px 0 2px">${esc(pr.nome)}</div>${meus.map(linhaPasto).join("")}`;
    }
    const orfaos=pastos.filter(pt=>!propriedades.find(pr=>pr.id===pt.propriedadeId));
    if(orfaos.length)grupos+=`<div class="meta" style="font-weight:700;margin:12px 0 2px">Sem propriedade</div>${orfaos.map(linhaPasto).join("")}`;
    pastoResumo=`<div class="card"><div class="ti" style="font-size:16px">🌱 Animais por pasto</div>${grupos}</div>`;
  }

  const contaProp=pid=>ativos.filter(a=>propDoAnimal(a,lotes)===pid);
  const contaMarca=(arr,mid)=>arr.filter(a=>a.marcaId===mid).length;

  let props="";
  if(propriedades.length===0){
    props=`<div class="card vazio"><div class="big">🏡</div><b>Nenhuma propriedade</b>
      <div class="meta">Toque no + e cadastre sua primeira propriedade.</div></div>`;
  }else{
    for(const p of propriedades){
      const arr=contaProp(p.id);
      let cols=marcas.map(m=>`<div class="m"><div class="ms">${esc(m.sigla)}</div><div class="mn">${contaMarca(arr,m.id)}</div></div>`).join("");
      props+=`<div class="prop" onclick="verPropriedade('${p.id}')">
        <div class="top">
          <div class="thumb">${p.foto?`<img src="${p.foto}" alt="Foto de ${esc(p.nome)}">`:"🌳"}</div>
          <div style="flex:1"><div class="nome">${esc(p.nome)}</div>
            <div class="loc">📍 ${esc(p.local||"")}</div></div>
          <div class="chev">›</div>
        </div>
        <div class="stats">
          <div class="tot"><div class="lbl">Total de animais</div><div class="big">${arr.length}</div></div>
          ${marcas.length?`<div class="marcas">${cols}</div>`:""}
        </div></div>`;
    }
  }

  $t.innerHTML=`
    <button class="voltar" onclick="irAba('inicio')">‹ Início</button>
    ${lembrete}
    <div class="hero">
      <div class="cabeca"><div class="tile"><img src="img/boi.png" alt="boi"></div><div class="rot">Total do Rebanho</div></div>
      <div class="num">${total}</div><div class="peq">animais cadastrados</div>
    </div>

    ${pastoResumo}
    <div class="sechead"><span class="sic">🏠</span><h2>Propriedades cadastradas</h2></div>
    ${props}

    <div class="sechead" style="margin-top:22px"><span class="sic">▦</span><h2>Módulos do sistema</h2></div>
    <div class="submod">${ico("boi")}Rebanho e Manejo</div>
    <div class="grid">
      ${mod(ico("boi"),"Animais","Cadastro, nascimentos, desmama, consulta e histórico.","abrirAnimaisOperacional()")}
      ${mod(ico("etiqueta"),"Venda / Morte de Animal","Venda individual, múltipla, por lote ou grupo e registro de morte.","telaVendaMorteAnimal()")}
      ${mod(ico("seringa"),"Eventos de Manejo","Marcar, medicar ou trocar de lote.","telaManejo()")}
      ${mod(ico("cerca"),"Lotes e Grupos","Lotes por propriedade e grupos de animais.","abrirLotesOperacional()")}
    </div>
    <div class="submod">${ico("caixa")}Recursos e Alertas</div>
    <div class="grid">
      ${mod(ico("pasto"),"Gestão de Pastos","Pastos, capim, área e situação.","telaGestaoPasto()")}
      ${mod(ico("caixa"),"Estoque de Insumos","Medicamentos, sal, e itens de manutenção.","telaEstoque()")}
      ${mod(ico("sino"),"Avisos","Eventos, manejos e alertas que exigem atenção.","telaAvisos()")}
      ${mod(ico("calc"),"Calculadora da Pecuária","Ferramentas para cálculos de negociações e indicadores.","telaCalculadoraPecuaria()")}
    </div>
`;
}
const mod=(ic,t,d,fn)=>`<div class="mod" onclick="${fn}"><div class="mic">${ic}</div>
  <div class="mt">${t}</div><div class="md">${d}</div><div class="chev">›</div></div>`;

/* ---------- Helpers de datas e histórico ---------- */
// Dias inteiros entre dois instantes (fim = agora, se não informado)
const diasEntre=(ini,fim)=>{if(!ini)return 0;return Math.max(0,Math.floor(((fim||Date.now())-ini)/86400000));};
// Timestamp -> "AAAA-MM-DD" no fuso local (compatível com fmt())
const tsData=ts=>{const d=new Date(ts);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,'0')+"-"+String(d.getDate()).padStart(2,'0');};
// Lista com "Ver mais": mostra os 10 primeiros; o resto abre ao tocar.
let _vmN=0;
function verMais(itens,rotulo){
  if(!itens||!itens.length)return"";
  if(itens.length<=10)return itens.join("");
  const id="vm"+(++_vmN);
  return itens.slice(0,10).join("")
    +`<div id="${id}" style="display:none">${itens.slice(10).join("")}</div>`
    +`<button class="btn btn-sec" style="margin-top:10px" onclick="var e=document.getElementById('${id}');e.style.display='block';this.remove();">Ver mais ${itens.length-10}${rotulo?" "+rotulo:""}</button>`;
}

/* ---------- Histórico de situação do pasto ---------- */
// Reconstrói os períodos (fechados + o período atual em aberto)
function periodosPasto(pt){
  const hist=(pt.historico||[]).map(p=>({...p}));
  const aberto={status:pt.status||"Livre",inicio:pt.statusDesde||pt.criadoEm||Date.now(),fim:null,loteId:pt.loteId||null};
  return [...hist,aberto];
}
// Soma de dias por situação
function resumoPasto(pt){
  const d={Descanso:0,Ocupado:0,Livre:0};
  for(const p of periodosPasto(pt))d[p.status]=(d[p.status]||0)+diasEntre(p.inicio,p.fim);
  return d;
}
// Outros eventos registráveis no pasto (herbicida, roçada, etc.)
const PASTO_EVENTOS=["Herbicida","Roçada","Adubação","Calagem","Reforma / Plantio","Limpeza de cerca","Análise de solo","Outro"];
const ICONE_PASTO_EV={"Herbicida":"🧪","Roçada":"🌾","Adubação":"🌿","Calagem":"⚪","Reforma / Plantio":"🌱","Limpeza de cerca":"🚧","Análise de solo":"🔬","Outro":"📌"};
// "AAAA-MM-DD" -> timestamp local ao meio-dia (evita erro de fuso)
const dataParaTs=s=>{if(!s)return null;const[a,m,d]=s.split("-").map(Number);return new Date(a,(m||1)-1,d||1,12,0,0).getTime();};
// ---------- Desmama ----------
const DIAS_DESMAMA=210;
// V120 — modelo de custo: o bezerro nascido entra no estoque com custo ZERO, porque o custo de
// criá-lo (sal, vacina, mão de obra da vaca) já foi lançado como despesa. Não existe mais
// "ganho a realizar". (O painel de engorda/valor de mercado está desativado desde a V129 — ver desativados/.)
const CUSTO_BEZERRO=0;
function desmamaInfo(a){
  if(a.desmamado)return {desmamado:true,dataDesmama:a.dataDesmama||""};
  if(!a.dataNascimento)return {desmamado:false,semData:true};
  const idade=diasEntre(dataParaTs(a.dataNascimento),Date.now());
  return {desmamado:false,idadeDias:idade,diasRestantes:DIAS_DESMAMA-idade};
}
function desmamaLabel(a){
  const d=desmamaInfo(a);
  if(d.desmamado)return `✅ Desmamado${d.dataDesmama?` em ${fmt(d.dataDesmama)}`:""}`;
  if(d.semData)return `🍼 Desmama: informe a data de nascimento`;
  if(d.diasRestantes>0)return `🍼 Desmama em ${d.diasRestantes} dia(s)`;
  if(d.diasRestantes===0)return `🍼 Desmama é hoje!`;
  return `⚠️ Desmama atrasada há ${-d.diasRestantes} dia(s)`;
}

async function telaNascimentos(){return abrirAnimaisOperacional();}
async function telaNascimentosAntiga(){
  topoPagina();
  const {animais,lotes}=await tudo();
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const rotMae=id=>{const m=animais.find(a=>a.id===id);return m?rotulo(m):"—";};
  const nascidos=animais.filter(a=>a.nascidoNaPropriedade===true)
    .sort((x,y)=>(y.dataNascimento||"").localeCompare(x.dataNascimento||""));
  const nascItens=nascidos.map(a=>{
    const info=desmamaInfo(a);
    const atrasado=!a.desmamado&&!info.semData&&info.diasRestantes<=0;
    const ctrl=_editNasc?`<div style="white-space:nowrap">
        <button class="btn-fant" style="padding:2px 6px;color:var(--verde)" onclick="event.stopPropagation();formEditarAnimal('${a.id}')">✎</button>
      </div>`:"";
    const linhaDesmama=`<div class="meta" style="margin-top:6px${atrasado?';color:#c0392b;font-weight:600':(a.desmamado?';color:var(--verde)':'')}">${desmamaLabel(a)}</div>`;
    // no modo edição, permite corrigir a data da desmama já registrada (ou desfazê-la)
    const ctrlDesmama=(_editNasc&&a.desmamado)?`<div style="margin-top:6px">
        <button class="btn-fant" style="padding:2px 8px 2px 0;color:var(--verde);font-weight:600" onclick="event.stopPropagation();formDesmama('${a.id}')">✎ Corrigir data da desmama</button>
        <button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="event.stopPropagation();desfazerDesmama('${a.id}')">Desfazer</button>
      </div>`:"";
    return `<div class="card rt" onclick="verAnimal('${a.id}')">
      <div class="row"><div class="ti">${esc(rotulo(a))} ${(a.brinco||a.nome)?`<span class="chip chip-id">${codAnimal(a)}</span>`:""}</div>${ctrl}</div>
      <div class="meta chips-linha" style="margin-top:8px">${sexoChip(a.sexo)}<span class="chip chip-lote">▦ ${esc(nomeLote(a.loteAtualId))}</span></div>
      <div class="meta" style="margin-top:6px">Mãe: <b>${a.maeId?esc(rotMae(a.maeId)):"—"}</b> · Nascimento: ${a.dataNascimento?fmt(a.dataNascimento):"—"}</div>
      ${linhaDesmama}${ctrlDesmama}</div>`;
  });
  let lst=nascidos.length?verMais(nascItens,"bezerro(s)"):`<div class="vazio"><div class="big">🍼</div><b>Nenhum nascimento registrado</b><div class="meta">Toque em "Registrar nascimento" para incluir o primeiro bezerro.</div></div>`;
  $t.innerHTML=`<button class="voltar" onclick="_editNasc=false;irAba('painel')">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">🍼</span><h2>Nascimentos</h2></div>
    <button class="btn" onclick="formNovoAnimal(null,true)">+ Registrar nascimento</button>
    <button class="btn btn-sec" onclick="formDesmama()">🍼 Registrar desmama</button>
    <button class="btn btn-sec" onclick="_editNasc=!_editNasc;telaNascimentos()">${_editNasc?"✓ Concluir edição":"✎ Editar nascimento e desmama"}</button>
    <div class="meta" style="margin:8px 4px 10px">${nascidos.length} bezerro(s) nascido(s) na propriedade.${_editNasc?" Toque em ✎ para editar o nascimento; nos já desmamados dá para corrigir a data.":""}</div>
    ${lst}`;
}
async function formDesmama(animalId){
  const {animais}=await tudo();
  if(animalId){
    const a=animais.find(x=>x.id===animalId);if(!a){fechar();return;}
    const corrigindo=a.desmamado;
    const dataInicial=(corrigindo&&a.dataDesmama)?a.dataDesmama:hoje();
    abrir(`<h2>${corrigindo?"Corrigir data da desmama":"Registrar desmama"}</h2>
      <div class="meta" style="margin-bottom:10px"><b>${esc(rotuloCod(a))}</b>${a.dataNascimento?` · nasc. ${fmt(a.dataNascimento)}`:""}</div>
      <label>Data da desmama</label><input id="dm_data" type="date" value="${dataInicial}">
      <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
        <button class="btn" onclick="salvarDesmama('${animalId}')">Salvar</button></div>`);
    return;
  }
  const naoDesmamados=animais.filter(a=>a.nascidoNaPropriedade===true&&!a.desmamado).sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  if(!naoDesmamados.length){
    abrir(`<h2>Registrar desmama</h2><div class="meta">Todos os bezerros já estão desmamados. 🎉</div>
      <button class="btn btn-sec" style="margin-top:14px" onclick="fechar()">Fechar</button>`);return;
  }
  const opt=naoDesmamados.map(a=>`<option value="${a.id}">${esc(rotuloCod(a))}</option>`).join("");
  abrir(`<h2>Registrar desmama</h2>
    <label>Bezerro *</label><select id="dm_animal">${opt}</select>
    <label>Data da desmama</label><input id="dm_data" type="date" value="${hoje()}">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarDesmama()">Salvar</button></div>`);
}
async function salvarDesmama(animalId){
  const id=animalId||(document.getElementById("dm_animal")||{}).value;
  if(!id)return alert("Selecione o bezerro.");
  const a=await get("animais",id);if(!a)return;
  const dd=val("dm_data")||hoje();
  if(dd>hoje())return alert("A data da desmama não pode ser no futuro.");
  if(a.dataNascimento&&dd<a.dataNascimento)return alert("A desmama não pode ser antes do nascimento ("+fmt(a.dataNascimento)+").");
  const jaEra=a.desmamado;
  a.desmamado=true;a.dataDesmama=val("dm_data")||hoje();
  await put("animais",a);
  if(jaEra){
    const evs=(await getAll("eventos")).filter(e=>e.animalId===id&&e.tipo==="Desmama");
    if(evs.length){const ev=evs[0];ev.data=a.dataDesmama;await put("eventos",ev);}
  }else{
    await registrarEvento(id,"Desmama",a.dataDesmama,"Bezerro desmamado");
  }
  fechar();voltarDesmama(animalId?id:null);
}
async function desfazerDesmama(animalId){
  if(!confirm("Desfazer a desmama deste bezerro?"))return;
  const a=await get("animais",animalId);if(!a)return;
  a.desmamado=false;a.dataDesmama="";
  await put("animais",a);
  const evs=(await getAll("eventos")).filter(e=>e.animalId===animalId&&e.tipo==="Desmama");
  for(const ev of evs)await del("eventos",ev.id);
  voltarDesmama(animalId);
}

// V123: depois de registrar/corrigir desmama, volta para a lista de Animais ou para a ficha do animal
function voltarDesmama(animalId){
  if(document.getElementById("f_tipo")&&document.getElementById("lista"))return abrirAnimaisOperacional();
  if(animalId)return verAnimal(animalId);
  return abrirAnimaisOperacional();
}
async function telaGestaoPasto(){
  if(!(await podeUsarApp("Acessar gestão do pasto")))return;
  topoPagina();
  const {propriedades,lotes,animais,pastos}=await tudo();
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const contaLote=lid=>animais.filter(a=>a.loteAtualId===lid&&a.status==="Ativo").length;
  const cardPasto=pt=>{
    const n=(pt.status==="Ocupado"&&pt.loteId)?contaLote(pt.loteId):0;
    const r=resumoPasto(pt);
    const diasLinha=pt.status==="Ocupado"?`🐄 ${r.Ocupado} dia(s) ocupado`
      :pt.status==="Descanso"?`🌿 ${r.Descanso} dia(s) reservado`:"";
    const ctrl=_editPastos?`<div style="white-space:nowrap"><button class="btn-fant" style="padding:4px 8px;color:var(--verde)" onclick="formEditarPasto('${pt.id}')">✎</button>
        <button class="btn-fant" style="padding:4px 8px;color:var(--perigo)" onclick="excluirPastoLista('${pt.id}')">✕</button></div>`:"";
    return `<div class="card">
      <div class="row"><div class="ti">${esc(pt.nome)}</div>${ctrl}</div>
      <div class="meta">${[pt.areaHa!=null?pt.areaHa+" ha":"",pt.tipoCapim].filter(Boolean).map(esc).join(" · ")||"—"}</div>
      <div class="meta" style="margin-top:6px">${pastoStatusChip(pt)}${pt.status==="Ocupado"&&pt.loteId?`<span class="chip chip-lote">▦ ${esc(nomeLote(pt.loteId))} · ${n} 🐄</span>`:""}</div>
      ${diasLinha?`<div class="meta" style="margin-top:8px">${diasLinha}</div>`:""}
      <button class="btn-fant" style="padding:8px 0 0;color:var(--verde);font-weight:600" onclick="verPasto('${pt.id}')">📋 Ver histórico ›</button></div>`;
  };
  let lst="";
  for(const pr of propriedades){
    const meus=pastos.filter(pt=>pt.propriedadeId===pr.id);
    if(!meus.length)continue;
    lst+=`<div class="h3">${esc(pr.nome)}</div>`+meus.map(cardPasto).join("");
  }
  const orfaos=pastos.filter(pt=>!propriedades.find(pr=>pr.id===pt.propriedadeId));
  if(orfaos.length)lst+=`<div class="h3">Sem propriedade</div>`+orfaos.map(cardPasto).join("");
  if(!pastos.length)lst=`<div class="vazio"><div class="big">🌱</div><b>Nenhum pasto cadastrado</b><div class="meta">Toque em "Novo pasto" para começar.</div></div>`;
  $t.innerHTML=`<button class="voltar" onclick="_editPastos=false;irAba('painel')">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">🌱</span><h2>Gestão do Pasto</h2></div>
    <div class="lado"><button class="btn" onclick="formNovoPasto()">+ Novo pasto</button>
      ${pastos.length?`<button class="btn btn-sec" onclick="_editPastos=!_editPastos;telaGestaoPasto()">${_editPastos?"✓ Concluir":"✎ Editar"}</button>`:""}</div>
    ${_editPastos?`<div class="meta" style="margin:2px 4px 6px">Modo edição ligado — toque em ✎ para editar ou ✕ para excluir um pasto.</div>`:""}
    ${lst}`;
}
async function excluirPastoLista(id){
  const pt=await get("pastos",id);
  if(!confirm(`Apagar o pasto "${pt?pt.nome:""}"?`))return;
  await del("pastos",id); telaGestaoPasto();
}
async function verPasto(id){
  topoPagina();
  const pt=await get("pastos",id);
  if(!pt){telaGestaoPasto();return;}
  const {propriedades,lotes}=await tudo();
  const nomeLote=lid=>(lotes.find(l=>l.id===lid)||{}).nome||"—";
  const nomeProp=pid=>(propriedades.find(p=>p.id===pid)||{}).nome||"Sem propriedade";
  const r=resumoPasto(pt);
  const rot={Descanso:["🌿","Em descanso"],Ocupado:["🐄","Ocupado"],Livre:["⬜","Livre"]};
  // junta situações (períodos) + outros eventos, do mais recente ao mais antigo
  const entradas=[];
  (pt.historico||[]).forEach((p,i)=>entradas.push({kind:"per",ref:String(i),status:p.status,inicio:p.inicio,fim:p.fim,loteId:p.loteId,ordena:p.inicio||0}));
  entradas.push({kind:"per",ref:"atual",status:pt.status||"Livre",inicio:pt.statusDesde||pt.criadoEm||Date.now(),fim:null,loteId:pt.loteId||null,ordena:pt.statusDesde||pt.criadoEm||0});
  (pt.manejos||[]).forEach(m=>entradas.push({kind:"man",ref:m.id,tipo:m.tipo,data:m.data,obs:m.obs,ordena:dataParaTs(m.data)||0}));
  entradas.sort((a,b)=>b.ordena-a.ordena);
  const bE=fn=>`<button class="btn-fant" style="padding:2px 6px;color:var(--verde)" onclick="${fn}">✎</button>`;
  const bX=fn=>`<button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="${fn}">✕</button>`;
  const itens=entradas.map(e=>{
    if(e.kind==="per"){
      const [ic,txt]=rot[e.status]||rot.Livre;
      const fimTxt=e.fim?fmt(tsData(e.fim)):"agora";
      const dias=diasEntre(e.inicio,e.fim);
      const loteTxt=(e.status==="Ocupado"&&e.loteId)?`▦ ${esc(nomeLote(e.loteId))}`:"";
      const ctrl=bE(`editarPeriodoPasto('${id}','${e.ref}')`)+(e.ref!=="atual"?bX(`excluirPeriodoPasto('${id}','${e.ref}')`):"");
      return `<div class="evt"><div class="row"><div class="tp">${ic} ${txt}</div><div style="white-space:nowrap">${ctrl}</div></div>
        <div class="dt">${fmt(tsData(e.inicio))} → ${fimTxt} · ${dias} dia(s)</div>${loteTxt?`<div class="de">${loteTxt}</div>`:""}</div>`;
    }else{
      const ic=ICONE_PASTO_EV[e.tipo]||"📌";
      const ctrl=bE(`formEventoPasto('${id}','${e.ref}')`)+bX(`excluirEventoPasto('${id}','${e.ref}')`);
      return `<div class="evt"><div class="row"><div class="tp">${ic} ${esc(e.tipo)}</div><div style="white-space:nowrap">${ctrl}</div></div>
        <div class="dt">${e.data?fmt(e.data):"—"}</div>${e.obs?`<div class="de">${esc(e.obs)}</div>`:""}</div>`;
    }
  });
  $t.innerHTML=`<button class="voltar" onclick="telaGestaoPasto()">‹ Gestão do Pasto</button>
    <div class="card"><div class="ti" style="font-size:19px">🌱 ${esc(pt.nome)}</div>
      <div class="meta">${esc(nomeProp(pt.propriedadeId))}${[pt.areaHa!=null?" · "+pt.areaHa+" ha":"",pt.tipoCapim?" · "+esc(pt.tipoCapim):""].join("")}</div>
      <div class="meta" style="margin-top:8px">${pastoStatusChip(pt)}${pt.status==="Ocupado"&&pt.loteId?`<span class="chip chip-lote">▦ ${esc(nomeLote(pt.loteId))}</span>`:""}</div></div>
    <div class="grid">
      <div class="card" style="text-align:center"><div style="font-size:30px;font-weight:800;color:var(--verde)">${r.Descanso}</div><div class="meta">dia(s) reservado<br>(em descanso)</div></div>
      <div class="card" style="text-align:center"><div style="font-size:30px;font-weight:800;color:var(--verde-esc)">${r.Ocupado}</div><div class="meta">dia(s) ocupado</div></div>
    </div>
    <button class="btn btn-sec" onclick="formEventoPasto('${id}')">+ Registrar evento no pasto</button>
    <div class="h3">Histórico</div>
    ${itens.length?verMais(itens,"registro(s)"):`<div class="meta">Sem registros ainda.</div>`}`;
}
/* ---------- Eventos do pasto (herbicida, roçada, etc.) ---------- */
async function formEventoPasto(pastoId,eventoId){
  const pt=await get("pastos",pastoId);
  const ev=(eventoId&&(pt.manejos||[]).find(m=>m.id===eventoId))||null;
  const optTipo=PASTO_EVENTOS.map((t,i)=>`<option value="${esc(t)}" ${ev?(ev.tipo===t?"selected":""):(i===0?"selected":"")}>${ICONE_PASTO_EV[t]||""} ${t}</option>`).join("");
  abrir(`<h2>${ev?"Editar evento":"Registrar evento no pasto"}</h2>
    <label>Tipo *</label><select id="ep_tipo">${optTipo}</select>
    <label>Data</label><input id="ep_data" type="date" value="${ev?ev.data:hoje()}">
    <label>Observação (opcional)</label><input id="ep_obs" value="${ev?esc(ev.obs||""):""}" placeholder="Ex: produto, dose, área…">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEventoPasto('${pastoId}'${eventoId?`,'${eventoId}'`:""})">Salvar</button></div>`);
}
async function salvarEventoPasto(pastoId,eventoId){
  const pt=await get("pastos",pastoId);
  if(!pt.manejos)pt.manejos=[];
  const tipo=val("ep_tipo"),data=val("ep_data"),obs=val("ep_obs");
  if(eventoId){const m=pt.manejos.find(x=>x.id===eventoId);if(m){m.tipo=tipo;m.data=data;m.obs=obs;}}
  else pt.manejos.push({id:uid(),tipo,data,obs,criadoEm:Date.now()});
  await put("pastos",pt);fechar();verPasto(pastoId);
}
async function excluirEventoPasto(pastoId,eventoId){
  if(!confirm("Excluir este evento do histórico?"))return;
  const pt=await get("pastos",pastoId);
  pt.manejos=(pt.manejos||[]).filter(m=>m.id!==eventoId);
  await put("pastos",pt);verPasto(pastoId);
}
/* ---------- Editar/excluir situações (períodos) ---------- */
async function editarPeriodoPasto(pastoId,ref){
  const pt=await get("pastos",pastoId);
  const {lotes}=await tudo();
  const aberto=(ref==="atual");
  const per=aberto?{status:pt.status||"Livre",inicio:pt.statusDesde||pt.criadoEm||Date.now(),fim:null,loteId:pt.loteId||null}:(pt.historico||[])[Number(ref)];
  if(!per){verPasto(pastoId);return;}
  const optStatus=["Livre","Descanso","Ocupado"].map(s=>`<option value="${s}" ${per.status===s?"selected":""}>${s}</option>`).join("");
  const optLote=`<option value="">— nenhum —</option>`+lotes.map(l=>`<option value="${l.id}" ${per.loteId===l.id?"selected":""}>${esc(l.nome)}</option>`).join("");
  abrir(`<h2>Editar situação</h2>
    <label>Situação</label><select id="pp_status">${optStatus}</select>
    <label>Lote (se ocupado)</label><select id="pp_lote">${optLote}</select>
    <label>Início</label><input id="pp_ini" type="date" value="${tsData(per.inicio)}">
    ${aberto?`<div class="meta" style="margin-top:10px">Fim: <b>em aberto (agora)</b> — é a situação atual do pasto.</div>`:`<label>Fim</label><input id="pp_fim" type="date" value="${per.fim?tsData(per.fim):hoje()}">`}
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarPeriodoPasto('${pastoId}','${ref}')">Salvar</button></div>`);
}
async function salvarPeriodoPasto(pastoId,ref){
  const pt=await get("pastos",pastoId);
  const status=val("pp_status");
  const loteId=status==="Ocupado"?(val("pp_lote")||null):null;
  const ini=dataParaTs(val("pp_ini"));
  if(ref==="atual"){
    pt.status=status;pt.loteId=loteId;if(ini)pt.statusDesde=ini;
  }else{
    const i=Number(ref);const arr=pt.historico||[];
    if(arr[i]){const fim=dataParaTs(val("pp_fim"));
      if(ini&&fim&&fim<ini){alert("A data de fim não pode ser anterior ao início.");return;}
      arr[i]={status,inicio:ini,fim,loteId};pt.historico=arr;}
  }
  await put("pastos",pt);fechar();verPasto(pastoId);
}
async function excluirPeriodoPasto(pastoId,ref){
  if(ref==="atual")return;
  if(!confirm("Excluir este período do histórico? Os dias contados serão recalculados."))return;
  const pt=await get("pastos",pastoId);
  const i=Number(ref);
  if((pt.historico||[])[i]){pt.historico.splice(i,1);await put("pastos",pt);}
  verPasto(pastoId);
}

async function telaAvisos(){
  topoPagina();
  const {propriedades,pastos,animais}=await tudo();
  const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||"";
  // Na tela de Avisos, só exibimos categorias que realmente possuem itens.
  // Backup pertence à área de Perfil/Conta e não deve aparecer aqui.
  const bloco=(arr,titulo)=>arr.length
    ? `<div class="h3">${titulo}</div>`+arr.map(p=>`<div class="card"><div class="ti" style="font-size:15px">${esc(p.nome)}</div><div class="meta">${esc(nomeProp(p.propriedadeId))}</div></div>`).join("")
    : "";
  const descanso=pastos.filter(p=>p.status==="Descanso");
  const livres=pastos.filter(p=>p.status==="Livre");
  // desmama: bezerros não desmamados, faltando até 30 dias ou já atrasados
  const desmamaProx=animais.filter(a=>a.nascidoNaPropriedade===true&&a.status==="Ativo"&&!a.desmamado&&a.dataNascimento)
    .map(a=>({a,d:DIAS_DESMAMA-diasEntre(dataParaTs(a.dataNascimento),Date.now())}))
    .filter(x=>x.d<=30).sort((x,y)=>x.d-y.d);
  const blocoDesmama=desmamaProx.length
    ? `<div class="h3">🍼 Desmama próxima (até 30 dias)</div>`+desmamaProx.map(x=>{
        const txt=x.d>0?`faltam ${x.d} dia(s)`:(x.d===0?"é hoje!":`atrasada há ${-x.d} dia(s)`);
        const cor=x.d<=0?"#c0392b":"var(--muted)";
        return `<div class="card rt" onclick="formDesmama('${x.a.id}')"><div class="ti" style="font-size:15px">${esc(rotuloCod(x.a))}</div>
          <div class="meta" style="color:${cor}">🍼 Desmama ${txt} · nasc. ${fmt(x.a.dataNascimento)}</div></div>`;
      }).join("")
    : "";
  // avisos personalizados (eventos futuros criados pelo usuário)
  const todosAvisos=(await getAll("avisos")).filter(a=>!a.feito);
  const blocoDoses=await blocoProximasDoses(todosAvisos.filter(a=>a.tipo==="Próxima dose"),animais);
  const avisosCustom=todosAvisos.filter(a=>a.tipo!=="Próxima dose")
    .sort((x,y)=>(x.data||"").localeCompare(y.data||"")||(x.hora||"").localeCompare(y.hora||""));
  const hojeTs=dataParaTs(hoje());
  const itensAviso=avisosCustom.map(a=>{
    const d=dataParaTs(a.data)!=null?Math.round((dataParaTs(a.data)-hojeTs)/86400000):null;
    const quando=d==null?"":(d>1?`em ${d} dias`:(d===1?"amanhã":(d===0?"hoje":`atrasado há ${-d} dia(s)`)));
    const cor=d==null?"var(--muted)":(d<0?"#c0392b":(d===0?"#b8860b":"var(--muted)"));
    return `<div class="card"><div class="row"><div class="ti" style="font-size:15px">${ICONE_AVISO[a.tipo]||"🔔"} ${esc(a.tipo)}</div>
        <div style="white-space:nowrap"><button class="btn-fant" style="padding:2px 6px;color:var(--verde)" onclick="formEditarAviso('${a.id}')">✎</button>
          <button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="excluirAviso('${a.id}')">✕</button></div></div>
      ${a.detalhe?`<div class="meta">${esc(a.detalhe)}</div>`:""}
      <div class="meta" style="color:${cor};font-weight:600">📅 ${fmt(a.data)}${a.hora?` · ${esc(a.hora)}`:""}${quando?` · ${quando}`:""}</div>
      <button class="btn-fant" style="padding:6px 0 0;color:var(--verde);font-weight:600" onclick="marcarAvisoFeito('${a.id}')">✓ Marcar como concluído</button></div>`;
  });
  const blocoEventos=itensAviso.length
    ? `<div class="h3">📌 Próximos eventos</div>`+verMais(itensAviso,"evento(s)")
    : "";
  const podeNotif=("Notification" in window);
  const btnNotif=(podeNotif&&Notification.permission!=="granted")
    ? `<button class="btn btn-sec" onclick="ativarNotificacoes()">🔔 Ativar lembretes no celular</button>` : "";
  $t.innerHTML=`<button class="voltar" onclick="irAba('painel')">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">🔔</span><h2>Avisos</h2></div>
    <button class="btn" onclick="formNovoAviso()">+ Cadastrar aviso</button>
    ${btnNotif}
    ${blocoDoses}
    ${blocoEventos}
    ${blocoDesmama}
    ${bloco(descanso,"🌿 Pastos em descanso")}
    ${bloco(livres,"⬜ Pastos livres")}`;
}
/* ---------- V145: próximas doses (lembretes criados na aplicação) ---------- */
async function blocoProximasDoses(avs,animais){
  if(!avs.length)return "";
  const insumos=await getAll("insumos");
  const hojeTs=dataParaTs(hoje());
  const porMed=new Map();
  for(const a of avs){const k=a.medicamentoId||"__";if(!porMed.has(k))porMed.set(k,[]);porMed.get(k).push(a);}
  const meds=[...porMed.entries()].map(([k,arr])=>({k,arr:arr.sort((x,y)=>(x.data||"").localeCompare(y.data||"")),it:insumos.find(i=>i.id===k)}))
    .sort((x,y)=>(x.arr[0].data||"").localeCompare(y.arr[0].data||""));
  return `<div class="h3">💉 Próximas doses</div>`+meds.map(({arr,it})=>{
    const nome=it?it.nome+(it.marca?` · ${it.marca}`:""):"Medicamento";
    const saldoTxt=it?`Estoque: ${numFmt(it.saldo||0)} ${esc(it.unidade||"un")}`:"";
    const itens=arr.map(a=>{
      const an=(a.animalIds||[]).map(id=>animais.find(x=>x.id===id)).filter(x=>x&&x.status==="Ativo");
      const d=Math.round((dataParaTs(a.data)-hojeTs)/86400000);
      const quando=d>1?`em ${d} dias`:d===1?"amanhã":d===0?"hoje":`atrasada há ${-d} dia(s)`;
      const cor=d<0?"#c0392b":d<=3?"#b8860b":"var(--muted)";
      const precisa=a.dosePrevista?a.dosePrevista*an.length:null;
      const falta=it&&precisa!=null&&precisa>(it.saldo||0)+1e-9;
      const nomes=an.slice(0,6).map(x=>esc(rotuloCod(x))).join(", ")+(an.length>6?` e mais ${an.length-6}`:"");
      return `<div style="padding:10px 0;border-top:1px solid var(--linha)">
        <div style="display:flex;justify-content:space-between;gap:8px"><b style="color:${cor}">📅 ${fmt(a.data)} · ${quando}</b>
          <span style="white-space:nowrap"><button class="btn-fant" style="padding:2px 6px;color:var(--verde)" onclick="formEditarProximaDose('${a.id}')">✎</button><button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="excluirAviso('${a.id}')">✕</button></span></div>
        <div class="meta" style="margin-top:3px">${an.length?`<b>${an.length} animal(is):</b> ${nomes}`:"Nenhum animal ativo neste lembrete."}</div>
        ${a.dosePrevista?`<div class="meta">Dose: ${numFmt(a.dosePrevista)} ${esc(a.unidade||"")} por animal${precisa!=null&&an.length?` · total ${numFmt(precisa)} ${esc(a.unidade||"")}`:""}${a.via?` · ${esc(a.via)}`:""}</div>`:""}
        ${falta?`<div class="meta" style="color:#c0392b;font-weight:600">Estoque insuficiente para esta dose — registre uma entrada.</div>`:""}
        ${an.length?`<button class="btn btn-sec" style="margin:8px 0 0" onclick="aplicarProximaDose('${a.id}')">💉 Aplicar agora</button>`:""}
      </div>`;}).join("");
    return `<div class="card" style="cursor:default"><div class="ti" style="font-size:16px">💊 ${esc(nome)}</div><div class="meta">${saldoTxt}</div>${itens}</div>`;
  }).join("");
}
async function aplicarProximaDose(id){
  const a=await get("avisos",id);if(!a)return telaAvisos();
  const ativos=new Set((await getAll("animais")).filter(x=>x.status==="Ativo").map(x=>x.id));
  formAplicacao({voltar:"avisos",avisoId:id,medId:a.medicamentoId,animalIds:(a.animalIds||[]).filter(x=>ativos.has(x)),dose:a.dosePrevista,via:a.via});
}
async function formEditarProximaDose(id){
  const a=await get("avisos",id);if(!a)return;
  abrir(`<h2>Próxima dose</h2><div class="meta" style="margin-bottom:6px">${esc(a.detalhe||"")}</div>
    <label>Data *</label><input id="pd_data" type="date" value="${a.data||hoje()}">
    <label>Hora (opcional)</label><input id="pd_hora" type="time" value="${esc(a.hora||"")}">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarProximaDose('${id}')">Salvar</button></div>`);
}
async function salvarProximaDose(id){
  const a=await get("avisos",id);if(!a)return;const d=val("pd_data");if(!d)return alert("Informe a data.");
  a.data=d;a.hora=val("pd_hora");a.notificadoEm=null;await put("avisos",a);fechar();telaAvisos();
}
/* ---------- Avisos personalizados ---------- */
async function formNovoAviso(aviso){
  const ed=aviso||null;
  const optTipo=TIPOS_AVISO.map((t,i)=>`<option value="${t}" ${ed?(ed.tipo===t?"selected":""):(i===0?"selected":"")}>${ICONE_AVISO[t]||""} ${t}</option>`).join("");
  abrir(`<h2>${ed?"Editar aviso":"Cadastrar aviso"}</h2>
    <label>Tipo de aviso</label><select id="av_tipo">${optTipo}</select>
    <label>Detalhes *</label><input id="av_det" value="${ed?esc(ed.detalhe||""):""}" placeholder="Ex: comprar sal mineral, chamar veterinário…">
    <label>Data do evento *</label><input id="av_data" type="date" value="${ed?ed.data:hoje()}">
    <label>Hora (opcional)</label><input id="av_hora" type="time" value="${ed?esc(ed.hora||""):""}">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarAviso(${ed?`'${ed.id}'`:""})">Salvar</button></div>`);
}
async function formEditarAviso(id){const a=await get("avisos",id);if(!a)return;if(a.tipo==="Próxima dose")return formEditarProximaDose(id);formNovoAviso(a);}
async function salvarAviso(id){
  const tipo=val("av_tipo"), det=val("av_det"), data=val("av_data"), hora=val("av_hora");
  if(!det)return alert("Descreva o aviso.");
  if(!data)return alert("Escolha a data do evento.");
  if(id){const a=await get("avisos",id);if(a){a.tipo=tipo;a.detalhe=det;a.data=data;a.hora=hora;a.notificadoEm=null;await put("avisos",a);}}
  else await put("avisos",{id:uid(),tipo,detalhe:det,data,hora,feito:false,notificadoEm:null,criadoEm:Date.now()});
  fechar();telaAvisos();
}
async function excluirAviso(id){if(!confirm("Excluir este aviso?"))return;await del("avisos",id);telaAvisos();}
async function marcarAvisoFeito(id){const a=await get("avisos",id);if(a){a.feito=true;a.feitoEm=Date.now();await put("avisos",a);}telaAvisos();}
async function ativarNotificacoes(){
  if(!("Notification" in window))return alert("Este aparelho não suporta notificações no navegador.");
  try{const p=await Notification.requestPermission();
    if(p==="granted"){alert("Lembretes ativados! Ao abrir o app, você será avisado dos eventos do dia.");checarNotificacoes();}
    else alert("Permissão não concedida. Você ainda vê os eventos aqui na lista.");
  }catch(e){alert("Não foi possível ativar as notificações neste aparelho.");}
  telaAvisos();
}
async function checarNotificacoes(){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const hojeStr=hoje(); const hojeTs=dataParaTs(hojeStr);
  const avisos=await getAll("avisos");
  const devidos=avisos.filter(a=>!a.feito&&dataParaTs(a.data)<=hojeTs&&a.notificadoEm!==hojeStr);
  if(!devidos.length)return;
  for(const a of devidos){a.notificadoEm=hojeStr;await put("avisos",a);}
  const corpo=devidos.map(a=>`${ICONE_AVISO[a.tipo]||"•"} ${a.tipo}: ${a.detalhe}`).join("\n");
  const titulo=devidos.length>1?`${devidos.length} avisos para hoje`:"Aviso do rebanho";
  try{
    const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();
    const opts={body:corpo,icon:"img/icon-192.png",badge:"img/icon-192.png",tag:"avisos-rebanho"};
    if(reg&&reg.showNotification)await reg.showNotification(titulo,opts);
    else new Notification(titulo,opts);
  }catch(e){}
}

async function verPropriedade(pid){
  topoPagina();
  const p=await get("propriedades",pid);
  const {lotes,animais,pastos}=await tudo();
  const meusLotes=lotes.filter(l=>l.propriedadeId===pid);
  const conta=lid=>animais.filter(a=>a.loteAtualId===lid&&a.status==="Ativo").length;
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  let lst=meusLotes.length?"":`<div class="meta" style="padding:8px 4px">Nenhum lote nesta propriedade.</div>`;
  for(const l of meusLotes)lst+=`<div class="card row rt" onclick="verLote('${l.id}')">
    <div><div class="ti">${esc(l.nome)}</div>${l.descricao?`<div class="meta">${esc(l.descricao)}</div>`:""}</div>
    <span class="badge">${conta(l.id)} 🐄</span></div>`;
  const meusPastos=pastos.filter(pt=>pt.propriedadeId===pid);
  let plst=meusPastos.length?"":`<div class="meta" style="padding:8px 4px">Nenhum pasto cadastrado.</div>`;
  for(const pt of meusPastos)plst+=`<div class="card rt" onclick="formEditarPasto('${pt.id}')">
    <div class="ti">${esc(pt.nome)}</div>
    <div class="meta" style="margin-top:2px">${[pt.areaHa!=null?pt.areaHa+" ha":"",pt.tipoCapim].filter(Boolean).map(esc).join(" · ")||"—"}</div>
    <div class="meta" style="margin-top:6px">${pastoStatusChip(pt)}${pt.status==="Ocupado"&&pt.loteId?`<span class="chip chip-lote">▦ ${esc(nomeLote(pt.loteId))}</span>`:""}</div></div>`;
  $t.innerHTML=`<button class="voltar" onclick="irAba('painel')">‹ Gestão Operacional</button>
    <div class="card">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="prop-foto-wrap" onclick="document.getElementById('prop_foto_${pid}').click()">
          <div class="prop-foto">${p.foto?`<img src="${p.foto}" alt="Foto de ${esc(p.nome)}">`:"🌳"}</div>
          <div class="prop-foto-cam">📷</div>
        </div>
        <div style="flex:1;min-width:0">
          <div class="ti" style="font-size:20px">${esc(p.nome)}</div>
          <div class="meta">📍 ${esc(p.local||"")}</div>
          <div class="meta" style="margin-top:5px;color:var(--verde)">Toque na foto para alterar</div>
        </div>
      </div>
      <input type="file" id="prop_foto_${pid}" accept="image/*" style="display:none"
        onchange="pickFotoPropriedade('${pid}',this)">
    </div>
    <button class="btn btn-sec" onclick="formNovoLote('${pid}')">+ Novo lote nesta propriedade</button>
    <div class="h3">Lotes</div>${lst}
    <button class="btn btn-sec" style="margin-top:10px" onclick="formNovoPasto('${pid}')">+ Novo pasto</button>
    <div class="h3">Pastos</div>${plst}
    <button class="btn-fant" style="margin-top:12px" onclick="apagarPropriedade('${pid}')">Apagar propriedade</button>`;
}
const pastoStatusChip=pt=>{
  const m={Ocupado:["chip-lote","Ocupado"],Descanso:["chip-marca","Em descanso"],Livre:["chip-off","Livre"]};
  const [cls,txt]=m[pt.status]||m.Livre;
  return `<span class="chip ${cls}">${txt}</span>`;
};
