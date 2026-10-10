/* Gestão do Rebanho — js/app/14-manejo-medicamentos.js
   Manejo, aplicação de medicamentos integrada ao estoque e formulários de evento.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= MANEJO ======================= */
async function telaManejo(){
  if(!(await podeUsarApp("Acessar manejo")))return;
  topoPagina();
  const {animais,eventos,medicamentos}=await tudo();
  const nomeAnimal=id=>{const a=animais.find(x=>x.id===id);return a?rotuloCod(a):"Animal não encontrado";};
  const nomeMed=id=>{const m=medicamentos.find(x=>x.id===id);return m?m.nome:"Medicamento não informado";};
  const gruposManejo=(tipo)=>{
    const evs=eventos.filter(e=>e.tipo===tipo).sort((a,b)=>(b.data||"").localeCompare(a.data||"")||(b.hora||"").localeCompare(a.hora||"")||(b.criadoEm||0)-(a.criadoEm||0));
    const mapa=new Map();
    for(const e of evs){
      const chave=[e.tipo,e.data||"",e.hora||"",e.detalhes||"",e.medicamentoId||"",e.via||"",e.dose||""].join("|");
      if(!mapa.has(chave))mapa.set(chave,{...e,animalIds:[],eventoIds:[]});
      const g=mapa.get(chave);g.animalIds.push(e.animalId);g.eventoIds.push(e.id);
    }
    return [...mapa.values()];
  };
  const sec=(tipo,icone,titulo)=>{
    const grupos=gruposManejo(tipo);
    if(!grupos.length)return `<div class="manejo-sec"><div class="manejo-sec-head"><div class="manejo-sec-title">${icone} ${titulo}</div><span class="manejo-count">0</span></div><div class="meta">Nenhum registro ainda.</div></div>`;
    const regsArr=grupos.map(g=>{
      const nomes=g.animalIds.map(nomeAnimal);
      const quem=nomes.length<=3?nomes.map(esc).join(", "):`${nomes.slice(0,3).map(esc).join(", ")} +${nomes.length-3}`;
      let tituloReg="";
      let detalhe="";
      if(tipo==="Medicamento"){
        tituloReg=esc(nomeMed(g.medicamentoId));
        detalhe=[g.via?`Via: ${esc(g.via)}`:"",g.dose?`Dose: ${esc(g.dose)}`:"",g.detalhes?esc(g.detalhes):""].filter(Boolean).join(" · ");
      }else if(tipo==="Marcação"){
        tituloReg="Marcação realizada";
        detalhe=g.detalhes?esc(g.detalhes):"Sem observação";
      }else if(tipo==="Castração"){
        tituloReg="Castração";
        detalhe=g.detalhes?esc(g.detalhes):"";
      }else if(tipo==="Outro"){
        tituloReg=esc(g.detalhes||"Outro evento");
      }else{
        tituloReg=esc(g.detalhes||tipo);
      }
      const quando=`${fmt(g.data)}${g.hora?` · ${esc(g.hora)}`:""}`;
      const ctrl=tipo!=="Movimentação"?`<div style="margin-top:8px">
        <button class="btn-fant" style="padding:2px 10px 2px 0;color:var(--verde);font-weight:600" onclick="editarGrupoManejo('${tipo}','${g.eventoIds.join(",")}')">✎ Editar</button>
        <button class="btn-fant" style="padding:2px 6px;color:var(--perigo)" onclick="excluirGrupoManejo('${tipo}','${g.eventoIds.join(",")}')">✕ Excluir</button></div>`:"";
      return `<div class="manejo-reg"><div class="mr-top"><div class="mr-title">${tituloReg}</div><div class="mr-date">${quando}</div></div><div class="mr-meta">${quem}${detalhe?`<br>${detalhe}`:""}</div>${ctrl}</div>`;
    });
    return `<div class="manejo-sec"><div class="manejo-sec-head"><div class="manejo-sec-title">${icone} ${titulo}</div><span class="manejo-count">${grupos.length}</span></div>${verMais(regsArr,"registro(s)")}</div>`;
  };
  $t.innerHTML=`<button class="voltar" onclick="irAba('painel')">‹ Gestão Operacional</button>
    <div class="sechead"><span class="sic">☑</span><h2>Manejo</h2></div>
    <div class="meta" style="margin:0 4px 14px">Escolha a ação e depois selecione em quais animais ela será registrada.</div>
    <div class="mod-list">
    ${mod(ico("ferro"),"Marcar animais","Registrar marcação (ferro).","formManejo('Marcação')")}
    ${mod(ico("seringa"),"Medicamento aplicado","Vacinas, injeção, pour on, spray, brinco, ingestão…","telaMedicamentosManejo()")}
    ${mod(ico("setas"),"Trocar de lote","Selecione vários animais e mova todos de uma vez.","telaTrocaLote()")}
    ${mod(ico("tesoura"),"Outros","Castração e outros eventos de manejo.","formManejo('Outros')")}
    </div>
    <div class="manejo-hist">
      <div class="sechead"><span class="sic">🗂</span><h2>Histórico de manejo</h2></div>
      ${sec("Medicamento","💊","Medicações realizadas")}
      ${sec("Marcação","🔥","Marcações de animais")}
      ${sec("Movimentação","↷","Trocas de lote")}
      ${sec("Castração","✂️","Castrações")}
      ${sec("Outro","📌","Outros eventos")}
    </div>`;
}
async function telaMedicamentosManejo(medPre){
  if(!(await podeUsarApp("Acessar medicamentos e vacinação")))return;
  topoPagina();
  const {propriedades,lotes,animais,medicamentos,eventos}=await tudo();
  const insumos=await getAll("insumos");
  const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const optAnimais=ativos.map(a=>`<option value="${a.id}">${esc(rotuloCod(a))} — ${esc(nomeLote(a.loteAtualId))}</option>`).join("");
  const optLotes=lotes.length?`<option value="">— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);return `<option value="${l.id}">${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join(""):"";
  const optMed=medicamentos.length?`<option value="">— selecione —</option>`+optMedicamentos(medicamentos):"";
  // V142: histórico de aplicações — uma linha por aplicação (mesmo produto, data, hora, via, dose e observação)
  const nomeMed=id=>{const m=insumos.find(x=>x.id===id);return m?m.nome+(m.marca?` · ${m.marca}`:""):"Medicamento não informado";};
  const animalPorId=new Map(animais.map(a=>[a.id,a]));
  const grupos=new Map();
  for(const e of eventos.filter(e=>e.tipo==="Medicamento")){
    const k=e.aplicacaoId||[e.data||"",e.hora||"",e.medicamentoId||"",e.via||"",e.dose||"",e.detalhes||""].join("|");
    if(!grupos.has(k))grupos.set(k,{e,ids:[],evIds:[]});
    grupos.get(k).ids.push(e.animalId);grupos.get(k).evIds.push(e.id);
  }
  const regs=[...grupos.values()].sort((a,b)=>(b.e.data||"").localeCompare(a.e.data||"")||(b.e.hora||"").localeCompare(a.e.hora||""));
  const quem=ids=>{
    const an=ids.map(id=>animalPorId.get(id)).filter(Boolean);
    if(an.length<=3)return an.map(a=>esc(rotuloCod(a))).join(", ")||"Animal não encontrado";
    const lotesN=[...new Set(an.map(a=>nomeLote(a.loteAtualId)))];
    return `<b>${an.length} animais</b>${lotesN.length<=2?` · ${lotesN.map(esc).join(", ")}`:""}`;
  };
  const itensHist=regs.map(({e,ids,evIds})=>`<div class="manejo-reg"><div class="mr-top"><div class="mr-title">${esc(nomeMed(e.medicamentoId))}</div><div class="mr-date" style="display:flex;align-items:center;gap:6px">${fmt(e.data)}${e.hora?` · ${esc(e.hora)}`:""}<button class="btn-fant" title="Excluir aplicação" style="padding:0 2px;color:var(--perigo);font-size:15px;line-height:1" onclick="excluirAplicacaoHist('${evIds.join(",")}')">✕</button></div></div>
    <div class="mr-meta">${quem(ids)}${e.via||e.dose?`<br>${[e.via,e.dose?(e.doseQtd&&ids.length>1?`${e.dose} por animal · total ${numFmt(e.doseQtd*ids.length)} ${e.unidade||""}`:e.dose):""].filter(Boolean).map(esc).join(" · ")}`:""}${e.aplicacaoId?`<br><span style="color:var(--verde)">✓ baixa no estoque</span>`:""}${e.detalhes?`<br>${esc(e.detalhes)}`:""}</div></div>`);
  const totalAnimais=regs.reduce((s,r)=>s+r.ids.length,0);

  $t.innerHTML=`<button class="voltar" onclick="telaManejo()">‹ Manejo</button>
    <div class="sechead"><span class="sic">💊</span><h2>Medicamentos e Vacinação</h2></div>
    <div class="meta" style="margin:0 4px 14px">Registre as aplicações e consulte o que já foi aplicado. Os medicamentos e vacinas são cadastrados no <a href="#" onclick="event.preventDefault();gerenciarMedicamentos()" style="color:var(--verde);font-weight:600">Estoque de Insumos</a>.</div>

    <div class="med-acoes">
      <button type="button" class="med-acao-btn" onclick="formAplicacao({voltar:'pagina'})">
        <span class="med-acao-ico">💉</span>
        <span class="med-acao-conteudo"><strong>Registrar aplicação</strong><small>Aplica, dá baixa no estoque e lança o custo</small></span>
        <span class="med-acao-seta">›</span>
      </button>
    </div>

    <div class="card" style="padding:18px;margin-bottom:18px;cursor:default">
      <div class="h3" style="margin:0 0 4px">Histórico de aplicações</div>
      <div class="meta" style="margin-bottom:8px">${regs.length?`${regs.length} aplicação(ões) · ${totalAnimais} dose(s) em animais`:"Nenhuma aplicação registrada ainda."}</div>
      ${verMais(itensHist,"aplicação(ões)")}
    </div>`;
  if(medPre)formAplicacao({voltar:"pagina",medId:medPre});
}

/* ======================= V144: APLICAÇÃO INTEGRADA AO ESTOQUE =======================
   Uma aplicação de medicamento/vacina faz tudo de uma vez:
   histórico de cada animal + baixa no estoque + custo de produção (Sanidade) ligado aos
   animais/lote/grupo + partida D Custo de produção / C Estoque de insumos.
   Sem saldo suficiente no estoque, a aplicação não é registrada. */
let _apCtx={};
async function formAplicacao(opts){
  if(!(await podeUsarApp("Registrar aplicação de medicamento")))return;
  _apCtx=Object.assign({voltar:"pagina"},opts||{});
  const {propriedades,lotes,animais,grupos,grupo_animais}=await tudo();
  const meds=await listaMedicamentos();
  if(!meds.length)return abrir(semMedicamentoHtml("Registrar aplicação"));
  if(!meds.some(m=>(m.saldo||0)>0))return abrir(`<h2>Registrar aplicação</h2>
    <div class="meta">Nenhum medicamento ou vacina com saldo no estoque. Registre a entrada (compra) do produto no Estoque de Insumos antes de aplicar.</div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="atalhoEstoque()">Entrada no estoque</button></div>`);
  const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const ativosIds=new Set(ativos.map(a=>a.id));
  const pre=new Set(_apCtx.animalIds||[]);
  const qtdGrupo=gid=>new Set(grupo_animais.filter(v=>v.grupoId===gid&&ativosIds.has(v.animalId)).map(v=>v.animalId)).size;
  const optAn=`<option value="">— selecione —</option>`+ativos.map(a=>`<option value="${a.id}" ${a.id===_apCtx.animalId?"selected":""}>${esc(rotuloCod(a))} — ${esc(nomeLote(a.loteAtualId))}</option>`).join("");
  const optLt=`<option value="">— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);const n=ativos.filter(a=>a.loteAtualId===l.id).length;return`<option value="${l.id}" ${l.id===_apCtx.loteId?"selected":""}>${esc(l.nome)}${p&&propriedades.length>1?` — ${esc(p.nome)}`:""} (${n})</option>`;}).join("");
  const optGr=`<option value="">— selecione —</option>`+(grupos||[]).map(g=>`<option value="${g.id}">${esc(g.nome)} (${qtdGrupo(g.id)})</option>`).join("");
  const checks=ativos.map(a=>`<label class="ap-ck" data-b="${esc((rotuloCod(a)+" "+nomeLote(a.loteAtualId)).toLowerCase())}" style="display:flex;gap:10px;align-items:center;padding:8px 2px;border-bottom:1px solid var(--linha)">
      <input type="checkbox" class="ap_multi" value="${a.id}" ${pre.has(a.id)?"checked":""} onchange="resumoAplicacao()" style="width:20px;height:20px;flex:0 0 auto">
      <span><b>${esc(rotuloCod(a))}</b><span class="meta" style="display:block">${esc(nomeLote(a.loteAtualId))}</span></span></label>`).join("");
  const optMed=`<option value="">— selecione —</option>`+meds.map(m=>{const sem=(m.saldo||0)<=0;
    return `<option value="${m.id}" ${sem?"disabled":""} ${m.id===_apCtx.medId&&!sem?"selected":""}>${esc(m.nome)}${m.marca?` · ${esc(m.marca)}`:""} — ${sem?"sem estoque":`estoque ${numFmt(m.saldo)} ${esc(m.unidade||"un")}`}</option>`;}).join("");
  const alvo0=_apCtx.animalIds?"varios":(_apCtx.loteId?"lote":"animal");
  abrir(`<h2>Registrar aplicação</h2>
    <label>Aplicar em *</label>
    <select id="ap_alvo" onchange="alvoAplicacao()">
      <option value="animal" ${alvo0==="animal"?"selected":""}>Um animal</option>
      <option value="varios" ${alvo0==="varios"?"selected":""}>Vários animais</option>
      <option value="grupo">Um grupo</option>
      <option value="lote" ${alvo0==="lote"?"selected":""}>Lote inteiro</option>
    </select>
    <div id="ap_g_animal"><label>Animal *</label><select id="ap_animal" onchange="resumoAplicacao()">${optAn}</select></div>
    <div id="ap_g_varios" style="display:none"><label>Animais *</label>
      <input id="ap_busca" placeholder="Buscar por identificação ou lote…" oninput="filtrarChecksAplicacao()">
      <div id="ap_cont" class="meta" style="margin:6px 2px">0 selecionado(s)</div>
      <div style="max-height:240px;overflow:auto;border-top:1px solid var(--linha)">${checks||`<div class="meta" style="padding:10px 0">Nenhum animal ativo.</div>`}</div></div>
    <div id="ap_g_grupo" style="display:none"><label>Grupo *</label><select id="ap_grupo" onchange="resumoAplicacao()">${optGr}</select></div>
    <div id="ap_g_lote" style="display:none"><label>Lote *</label><select id="ap_lote" onchange="resumoAplicacao()">${optLt}</select></div>
    <label>Medicamento / vacina *</label><select id="ap_med" onchange="resumoAplicacao()">${optMed}</select>
    <label id="ap_dose_lbl">Dose por animal *</label><input id="ap_dose" inputmode="decimal" placeholder="Ex: 5" value="${_apCtx.dose!=null?String(_apCtx.dose).replace(".",","):""}" oninput="resumoAplicacao()">
    <label>Via de aplicação</label><select id="ap_via">${VIAS.map(v=>`<option value="${v}" ${v===_apCtx.via?"selected":""}>${v}</option>`).join("")}</select>
    <label>Data e hora</label>
    <div class="lado"><input id="ap_data" type="date" value="${hoje()}" max="${hoje()}"><input id="ap_hora" type="time" value="${horaAgora()}"></div>
    <label>Observação (opcional)</label><input id="ap_obs" value="${_apCtx.avisoId?"Dose de reforço":""}" placeholder="Ex: reforço, lote/validade do frasco, quem aplicou…">
    <label>Tem próxima dose (reforço)?</label>
    <select id="ap_prox" onchange="toggleProxDose()"><option value="nao">Não</option><option value="sim">Sim — criar lembrete em Avisos</option></select>
    <div id="ap_g_prox" style="display:none">
      <label>Daqui a quantos dias? *</label><input id="ap_prox_dias" inputmode="numeric" placeholder="Ex: 21" oninput="calcDataProxDose()">
      <label>Data da próxima dose *</label><input id="ap_prox_data" type="date" oninput="document.getElementById('ap_prox_dias').value=''">
      <label>Aplicar a próxima dose em</label>
      <select id="ap_prox_quem" onchange="resumoAplicacao()"><option value="todos">Todos os animais desta aplicação</option><option value="alguns">Escolher animais</option></select>
      <div id="ap_prox_lista" style="display:none;max-height:220px;overflow:auto;border-top:1px solid var(--linha);margin-top:8px"></div>
    </div>
    <div id="ap_resumo" class="card" style="margin-top:12px;padding:12px;cursor:default;background:var(--verde-lite);box-shadow:none"></div>
    <div class="lado" style="margin-top:14px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarAplicacao()">Registrar</button></div>`);
  alvoAplicacao();
}
// V146: excluir uma aplicação pelo histórico (devolve ao estoque e estorna o custo pelo hook do del)
async function excluirAplicacaoHist(idsCsv){
  const ids=idsCsv.split(",").filter(Boolean);if(!ids.length)return;
  const ev=await get("eventos",ids[0]);
  const comBaixa=!!(ev&&ev.aplicacaoId);
  const msg=`Excluir esta aplicação de ${ids.length} animal(is)?`+(comBaixa?`\n\nA quantidade volta para o estoque, o custo é estornado na contabilidade e o lembrete de próxima dose (se houver) é removido.`:"");
  if(!confirm(msg))return;
  await excluirEventosEmBloco(ids);
  telaMedicamentosManejo();
}
// Exclui vários eventos e ajusta cada aplicação uma vez só (um estorno pelo total)
async function excluirEventosEmBloco(ids){
  const apls=new Set();
  for(const id of ids){const e=await get("eventos",id);if(e&&e.aplicacaoId)apls.add(e.aplicacaoId);}
  _ajustandoAplicacao=true;
  try{for(const id of ids)await del("eventos",id);}finally{_ajustandoAplicacao=false;}
  for(const a of apls)await ajustarAplicacaoAposExclusao(a);
}
function toggleProxDose(){
  const on=val("ap_prox")==="sim";const g=document.getElementById("ap_g_prox");if(g)g.style.display=on?"block":"none";
  if(on&&!val("ap_prox_data")){const d=document.getElementById("ap_prox_dias");if(d&&!d.value)d.value="21";calcDataProxDose();}
  resumoAplicacao();
}
function calcDataProxDose(){
  const n=parseInt(val("ap_prox_dias"),10);const el=document.getElementById("ap_prox_data");
  if(el&&n>0)el.value=somarDias(val("ap_data")||hoje(),n);
}
function alvoAplicacao(){
  const a=val("ap_alvo")||"animal";
  ["animal","varios","grupo","lote"].forEach(k=>{const el=document.getElementById("ap_g_"+k);if(el)el.style.display=a===k?"block":"none";});
  resumoAplicacao();
}
function filtrarChecksAplicacao(){
  const t=(val("ap_busca")||"").toLowerCase();
  document.querySelectorAll(".ap-ck").forEach(l=>l.style.display=!t||l.dataset.b.includes(t)?"flex":"none");
}
async function animaisDaAplicacao(){
  const alvo=val("ap_alvo")||"animal";
  const todos=await getAll("animais");const ativos=todos.filter(a=>a.status==="Ativo");
  if(alvo==="animal"){const id=val("ap_animal");return {alvo,ids:id?[id]:[],refId:id||null};}
  if(alvo==="varios"){const ids=[...document.querySelectorAll(".ap_multi:checked")].map(c=>c.value);return {alvo,ids,refId:null};}
  if(alvo==="grupo"){const g=val("ap_grupo");if(!g)return {alvo,ids:[],refId:null};
    const ok=new Set(ativos.map(a=>a.id));const vs=await getAll("grupo_animais");
    return {alvo,ids:[...new Set(vs.filter(v=>v.grupoId===g&&ok.has(v.animalId)).map(v=>v.animalId))],refId:g};}
  const l=val("ap_lote");return {alvo,ids:l?ativos.filter(a=>a.loteAtualId===l).map(a=>a.id):[],refId:l||null};
}
async function resumoAplicacao(){
  const box=document.getElementById("ap_resumo");if(!box)return;
  const cont=document.getElementById("ap_cont");if(cont)cont.textContent=document.querySelectorAll(".ap_multi:checked").length+" selecionado(s)";
  const medId=val("ap_med");const it=medId?await get("insumos",medId):null;
  const un=it?(it.unidade||"un"):"";
  const lbl=document.getElementById("ap_dose_lbl");if(lbl)lbl.textContent=`Dose por animal${un?` (${un})`:""} *`;
  const {ids}=await animaisDaAplicacao();const dose=numBR("ap_dose");
  const pl=document.getElementById("ap_prox_lista");
  if(pl){const alguns=val("ap_prox")==="sim"&&val("ap_prox_quem")==="alguns";pl.style.display=alguns?"block":"none";
    if(alguns){const marcados=new Set([...pl.querySelectorAll("input:checked")].map(c=>c.value));const primeira=!pl.dataset.ok;
      const todos=await getAll("animais");
      pl.innerHTML=ids.map(id=>{const a=todos.find(x=>x.id===id);return a?`<label style="display:flex;gap:10px;align-items:center;padding:7px 2px;border-bottom:1px solid var(--linha)"><input type="checkbox" class="ap_prox_ck" value="${id}" ${primeira||marcados.has(id)?"checked":""} style="width:20px;height:20px"><b>${esc(rotuloCod(a))}</b></label>`:"";}).join("")||`<div class="meta" style="padding:8px 0">Escolha primeiro os animais da aplicação.</div>`;
      pl.dataset.ok="1";}}
  if(!it){box.innerHTML=`<div class="meta">Escolha o produto e a dose para ver o total e o custo.</div>`;return;}
  const total=(dose>0?dose:0)*ids.length, saldo=it.saldo||0, custo=total*(it.custoMedio||0);
  const falta=total>saldo+1e-9;
  box.innerHTML=`<div class="meta">${ids.length} animal(is) × ${dose>0?numFmt(dose):"—"} ${esc(un)} = <b>${numFmt(total)} ${esc(un)}</b></div>
    <div class="meta">Saldo no estoque: <b>${numFmt(saldo)} ${esc(un)}</b>${total>0&&!falta?` · fica ${numFmt(saldo-total)} ${esc(un)}`:""}</div>
    <div class="meta">Custo (custo médio × total): <b>${moeda(custo)}</b> → custo de produção · Sanidade</div>
    ${falta?`<div class="meta" style="color:var(--perigo);font-weight:700;margin-top:4px">Estoque insuficiente para esta aplicação.</div>`:""}`;
}
async function salvarAplicacao(){
  const {alvo,ids,refId}=await animaisDaAplicacao();
  if(alvo==="animal"&&!ids.length)return alert("Selecione o animal.");
  if(alvo==="varios"&&!ids.length)return alert("Selecione pelo menos um animal.");
  if(alvo==="grupo"&&!refId)return alert("Selecione o grupo.");
  if(alvo==="lote"&&!refId)return alert("Selecione o lote.");
  if(!ids.length)return alert(alvo==="grupo"?"Esse grupo não tem animais ativos.":"Esse lote não tem animais ativos.");
  const medId=val("ap_med");if(!medId)return alert("Selecione o medicamento ou vacina.");
  const it=await get("insumos",medId);if(!it)return alert("Produto não encontrado no estoque.");
  const dose=numBR("ap_dose");if(dose==null||!(dose>0))return alert("Informe a dose por animal.");
  const data=val("ap_data")||hoje(),hora=val("ap_hora"),via=val("ap_via"),obs=val("ap_obs");
  if(data>hoje())return alert("A data da aplicação não pode ser no futuro.");
  const un=it.unidade||"un",total=dose*ids.length,saldo=it.saldo||0;
  if(saldo<=0)return alert(`Não há ${it.nome} no estoque. Registre a entrada (compra) no Estoque de Insumos antes de aplicar.`);
  if(total>saldo+1e-9)return alert(`Estoque insuficiente de ${it.nome}: a aplicação precisa de ${numFmt(total)} ${un} e o saldo é ${numFmt(saldo)} ${un}. Registre uma entrada no Estoque de Insumos ou diminua a quantidade de animais.`);
  let prox=null;
  if(val("ap_prox")==="sim"){
    const dp=val("ap_prox_data");
    if(!dp)return alert("Informe em quantos dias (ou a data) da próxima dose.");
    if(dp<=data)return alert("A próxima dose precisa ser depois da data desta aplicação.");
    const pids=val("ap_prox_quem")==="alguns"?[...document.querySelectorAll(".ap_prox_ck:checked")].map(c=>c.value):ids.slice();
    if(!pids.length)return alert("Escolha em quais animais será a próxima dose.");
    prox={data:dp,ids:pids};
  }
  const r=await registrarAplicacaoEstoque({it,ids,alvo,refId,dose,data,hora,via,obs});
  const v0=_apCtx.voltar;
  // V145: aplicação feita a partir de um lembrete de próxima dose
  if(_apCtx.avisoId){const av=await get("avisos",_apCtx.avisoId);
    if(av){const resto=(av.animalIds||[]).filter(id=>!ids.includes(id));
      if(resto.length){av.animalIds=resto;av.detalhe=`${it.nome} — ${resto.length} animal(is)`;}
      else{av.feito=true;av.feitoEm=Date.now();av.aplicacaoFeitaId=r.aplicacaoId;}
      await put("avisos",av);}}
  // V145: lembrete da próxima dose em Avisos
  if(prox)await put("avisos",{id:uid(),tipo:"Próxima dose",detalhe:`${it.nome} — ${prox.ids.length} animal(is)`,data:prox.data,hora:"",
    feito:false,notificadoEm:null,medicamentoId:it.id,animalIds:prox.ids,dosePrevista:dose,unidade:it.unidade||"un",via,
    origemAplicacaoId:r.aplicacaoId,criadoEm:Date.now()});
  fechar();
  alert(`Aplicação registrada em ${ids.length} animal(is). Baixa de ${numFmt(total)} ${un} no estoque${r.valor>0?` · custo ${moeda(r.valor)}`:""}.${prox?`\n\nLembrete criado em Avisos: próxima dose em ${fmt(prox.data)} para ${prox.ids.length} animal(is).`:""}`);
  if(v0==="avisos")return telaAvisos();
  const v=_apCtx.voltar;
  if(v==="animal"&&_apCtx.animalId)return verAnimal(_apCtx.animalId);
  if(v==="lote"&&_apCtx.loteId)return verLote(_apCtx.loteId);
  if(v==="estoque")return telaEstoque();
  return telaMedicamentosManejo();
}
async function registrarAplicacaoEstoque({it,ids,alvo,refId,dose,data,hora,via,obs}){
  const un=it.unidade||"un",total=dose*ids.length,custoUnit=it.custoMedio||0,valor=total*custoUnit;
  const aplicacaoId=uid(),movId=uid();
  const {lotes,animais}=await tudo();
  const anim=ids.map(id=>animais.find(a=>a.id===id)).filter(Boolean);
  const rateioLotes={};for(const a of anim){const k=a.loteAtualId||"__sem";rateioLotes[k]=(rateioLotes[k]||0)+dose*custoUnit;}
  const props=[...new Set(anim.map(a=>(lotes.find(l=>l.id===a.loteAtualId)||{}).propriedadeId||null))];
  const propriedadeId=props.length===1?props[0]:null;
  for(const id of ids)await registrarEvento(id,"Medicamento",data,obs,{hora,medicamentoId:it.id,via,dose:`${numFmt(dose)} ${un}`,doseQtd:dose,unidade:un,aplicacaoId,movId});
  it.saldo=Math.max(0,(it.saldo||0)-total);await put("insumos",it);
  await put("insumo_mov",{id:movId,insumoId:it.id,tipo:"consumo",qtd:total,unidade:un,custoUnit,data,
    obs:`Aplicação em ${ids.length} animal(is)`,origem:"aplicacao",aplicacaoId,criadoEm:Date.now()});
  if(valor>0){
    const apr=alvo==="lote"?{apropriacaoTipo:"lote",apropriacaoId:refId}:alvo==="grupo"?{apropriacaoTipo:"grupo",apropriacaoId:refId}
      :ids.length===1?{apropriacaoTipo:"animal",apropriacaoId:ids[0]}:{apropriacaoTipo:"animais",apropriacaoId:null,apropriacaoIds:ids.slice()};
    await put("lancamentos",{id:uid(),tipo:"despesa",natureza:"custo",classe:"custo",categoria:"Sanidade",valor,data,
      descricao:`Aplicação ${it.nome} (${numFmt(total)} ${un}) · ${ids.length} animal(is)`,propriedadeId,pago:true,
      origem:"consumo_insumo",refId:movId,aplicacaoId,rateioLotes,contaV144:true,...apr,criadoEm:Date.now()});
  }
  return {aplicacaoId,movId,valor};
}
// Excluir animais de uma aplicação devolve ao estoque a dose deles e ajusta o custo
let _ajustandoAplicacao=false;
async function ajustarAplicacaoAposExclusao(aplicacaoId){
  if(_ajustandoAplicacao||!aplicacaoId)return;
  _ajustandoAplicacao=true;
  try{
    const restantes=(await getAll("eventos")).filter(e=>e.aplicacaoId===aplicacaoId);
    const mov=(await getAll("insumo_mov")).find(m=>m.aplicacaoId===aplicacaoId);if(!mov)return;
    const lanc=(await getAll("lancamentos")).find(l=>l.origem==="consumo_insumo"&&l.refId===mov.id);
    const avs=(await getAll("avisos")).filter(a=>a.origemAplicacaoId===aplicacaoId&&!a.feito);
    if(!restantes.length){
      if(lanc)await del("lancamentos",lanc.id);
      await del("insumo_mov",mov.id);
      for(const a of avs)await del("avisos",a.id); // V145: sem aplicação, sem lembrete de reforço
    }else{
      for(const a of avs){const ok=(a.animalIds||[]).filter(id=>restantes.some(e=>e.animalId===id));
        if(!ok.length)await del("avisos",a.id);else if(ok.length!==(a.animalIds||[]).length){a.animalIds=ok;a.detalhe=a.detalhe.replace(/\d+ animal\(is\)$/,`${ok.length} animal(is)`);await put("avisos",a);}}
      const novaQtd=restantes.reduce((s,e)=>s+(Number(e.doseQtd)||0),0);
      const fator=mov.qtd>0?novaQtd/mov.qtd:0;
      mov.qtd=novaQtd;mov.obs=`Aplicação em ${restantes.length} animal(is)`;await put("insumo_mov",mov);
      if(lanc){lanc.valor=novaQtd*(mov.custoUnit||0);
        if(lanc.rateioLotes)for(const k in lanc.rateioLotes)lanc.rateioLotes[k]*=fator;
        if(lanc.apropriacaoIds)lanc.apropriacaoIds=lanc.apropriacaoIds.filter(id=>restantes.some(e=>e.animalId===id));
        lanc.descricao=lanc.descricao.replace(/\(([\d.,]+) ([^)]*)\) · \d+ animal\(is\)/,`(${numFmt(novaQtd)} $2) · ${restantes.length} animal(is)`);
        await put("lancamentos",lanc);}
    }
    await reconstruirInsumo(mov.insumoId);
  }catch(e){console.error("Ajuste da aplicação V144:",e);}
  finally{_ajustandoAplicacao=false;}
}
// V154: removidas as funções do antigo painel de aplicação (substituído por formAplicacao, que dá baixa no estoque)

async function telaTrocaLote(){
  if(!(await podeUsarApp("Trocar animais de lote")))return;
  topoPagina();
  const {propriedades,lotes,animais}=await tudo();
  const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  if(!lotes.length){
    $t.innerHTML=`<button class="voltar" onclick="telaManejo()">‹ Manejo</button>
      <div class="sechead"><span class="sic">↷</span><h2>Trocar de lote</h2></div>
      <div class="card" style="padding:20px"><div class="meta">Cadastre pelo menos dois lotes para realizar uma troca.</div></div>`;
    return;
  }
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"Sem lote";
  const optOrigem=lotes.map(l=>`<option value="${l.id}">${esc(l.nome)}</option>`).join("");
  const optDestino=lotes.map(l=>{const pr=propriedades.find(p=>p.id===l.propriedadeId);return `<option value="${l.id}">${esc(l.nome)}${pr?` — ${esc(pr.nome)}`:""}</option>`;}).join("");
  const cards=ativos.map(a=>`<label class="troca-animal" data-lote="${a.loteAtualId||""}" style="display:flex;align-items:center;gap:12px;padding:13px 10px;border-bottom:1px solid var(--borda);cursor:pointer">
      <input type="checkbox" class="troca-check" value="${a.id}" onchange="atualizarSelecaoTroca()" style="width:24px;height:24px;min-width:24px;margin:0;accent-color:var(--verde)">
      <div style="flex:1;min-width:0"><b>${esc(rotuloCod(a))}</b><div class="meta" style="margin-top:2px">${esc(nomeLote(a.loteAtualId))}</div></div>
    </label>`).join("") || `<div class="meta" style="padding:14px 0">Nenhum animal ativo cadastrado.</div>`;
  $t.innerHTML=`<button class="voltar" onclick="telaManejo()">‹ Manejo</button>
    <div class="sechead"><span class="sic">↷</span><h2>Trocar de lote</h2></div>
    <div class="meta" style="margin:0 4px 14px">Marque todos os animais que deseja movimentar e escolha o lote de destino.</div>

    <div class="card" style="padding:18px;margin-bottom:18px">
      <label>Mostrar animais do lote</label>
      <select id="tl_origem" onchange="filtrarAnimaisTroca()">
        <option value="">Todos os lotes</option>${optOrigem}
      </select>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 8px">
        <b id="tl_contagem">0 selecionados</b>
        <button class="btn-fant" style="padding:6px 0;color:var(--verde);font-weight:700" onclick="marcarVisiveisTroca()">Selecionar visíveis</button>
      </div>
      <div id="tl_animais" style="max-height:48vh;overflow:auto;border-top:1px solid var(--borda);border-bottom:1px solid var(--borda)">${cards}</div>
      <button class="btn-fant" id="tl_limpar" style="display:none;margin-top:8px;padding:8px 0;color:var(--verde)" onclick="limparSelecaoTroca()">Limpar seleção</button>
    </div>

    <div class="card" style="padding:18px;margin-bottom:18px">
      <label>Lote de destino *</label>
      <select id="tl_destino">${optDestino}</select>
      <label>Data e hora</label>
      <div class="lado"><input id="tl_data" type="date" value="${hoje()}"><input id="tl_hora" type="time" value="${horaAgora()}"></div>
      <button class="btn" style="margin-top:16px" onclick="salvarTrocaMultipla()">Mover animais selecionados</button>
    </div>`;
}
function checksTroca(){return [...document.querySelectorAll(".troca-check")];}
function atualizarSelecaoTroca(){
  const n=checksTroca().filter(c=>c.checked).length;
  const el=document.getElementById("tl_contagem");if(el)el.textContent=`${n} selecionado${n===1?"":"s"}`;
  const limpar=document.getElementById("tl_limpar");if(limpar)limpar.style.display=n?"block":"none";
}
function filtrarAnimaisTroca(){
  const lote=(document.getElementById("tl_origem")||{}).value||"";
  document.querySelectorAll(".troca-animal").forEach(el=>{el.style.display=(!lote||el.dataset.lote===lote)?"flex":"none";});
}
function marcarVisiveisTroca(){
  document.querySelectorAll(".troca-animal").forEach(el=>{if(el.style.display!=="none"){const c=el.querySelector(".troca-check");if(c)c.checked=true;}});
  atualizarSelecaoTroca();
}
function limparSelecaoTroca(){checksTroca().forEach(c=>c.checked=false);atualizarSelecaoTroca();}
async function salvarTrocaMultipla(){
  const ids=checksTroca().filter(c=>c.checked).map(c=>c.value);
  if(!ids.length)return alert("Selecione pelo menos um animal.");
  const destino=val("tl_destino");
  if(!destino)return alert("Selecione o lote de destino.");
  const data=val("tl_data"),hora=val("tl_hora");
  const lotes=await getAll("lotes");
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const nomeDest=nomeLote(destino);
  let movidos=0,jaEstavam=0;
  for(const id of ids){
    const a=await get("animais",id);if(!a)continue;
    if(a.loteAtualId===destino){jaEstavam++;continue;}
    const de=nomeLote(a.loteAtualId);
    a.loteAtualId=destino;await put("animais",a);
    await registrarEvento(id,"Movimentação",data,`De "${de}" para "${nomeDest}"`,{hora});
    movidos++;
  }
  if(!movidos)return alert("Os animais selecionados já pertencem ao lote de destino.");
  alert(`${movidos} animal(is) movido(s) para ${nomeDest}.${jaEstavam?` ${jaEstavam} já estava(m) nesse lote.`:""}`);
  telaTrocaLote();
}

async function formManejo(tipo){
  if(tipo==="Medicamento")return formAplicacao({voltar:"manejo"}); // V144: aplicação integrada ao estoque
  const {propriedades,lotes,animais,medicamentos,grupos,grupo_animais}=await tudo();
  if(!lotes.length){fechar();return alert("Cadastre lote e animais primeiro.");}
  const ativos=animais.filter(a=>a.status==="Ativo").sort((x,y)=>(x.codigo||0)-(y.codigo||0));
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
  const optAnimais=ativos.map(a=>`<option value="${a.id}">${esc(rotuloCod(a))} — ${esc(nomeLote(a.loteAtualId))}</option>`).join("");
  const optLotes=`<option value="">— selecione —</option>`+lotes.map(l=>{const p=propriedades.find(x=>x.id===l.propriedadeId);return`<option value="${l.id}">${esc(l.nome)}${p?` — ${esc(p.nome)}`:""}</option>`;}).join("");

  const ativosIds=new Set(ativos.map(a=>a.id));
  const qtdGrupo=gid=>new Set(grupo_animais.filter(v=>v.grupoId===gid&&ativosIds.has(v.animalId)).map(v=>v.animalId)).size;
  const optGrupos=(grupos||[]).map(g=>`<option value="${g.id}">${esc(g.nome)} — ${qtdGrupo(g.id)} animal(is)</option>`).join("");
  const checksAnimais=ativos.map(a=>`<label class="mj-multi-item" data-busca="${esc((rotuloCod(a)+" "+(a.brinco||"")+" "+nomeLote(a.loteAtualId)).toLowerCase())}" style="display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--linha);padding:10px 2px;margin:0;color:var(--texto)">
      <input type="checkbox" class="mj_multi_ck" value="${a.id}" onchange="atualizarContagemManejo()" style="width:20px;height:20px;flex:0 0 auto">
      <span style="min-width:0"><b>${esc(rotuloCod(a))}</b><span class="meta" style="display:block">▦ ${esc(nomeLote(a.loteAtualId))}</span></span>
    </label>`).join("");

  let especifico="";
  if(tipo==="Medicamento"){
    const optMed=medicamentos.length
      ? `<option value="">— selecione —</option>`+optMedicamentos(medicamentos)
      : `<option value="">— nenhum no estoque —</option>`;
    especifico=`<label>Medicamento${medicamentos.length?"":" (cadastre no Estoque de Insumos)"}</label>
      <select id="mj_med">${optMed}</select>
      <label>Via de aplicação</label><select id="mj_via">${VIAS.map(v=>`<option value="${v}">${v}</option>`).join("")}</select>
      <label>Dose (opcional)</label><input id="mj_dose" placeholder="Ex: 5 ml">
      <label>Observação (opcional)</label><input id="mj_obs">`;
  }else if(tipo==="Marcação"){
    especifico=`<label>Observação (opcional)</label><input id="mj_obs" placeholder="Ex: ferro IJG, mossa…">`;
  }else if(tipo==="Movimentação"){
    especifico=`<label>Lote de destino *</label><select id="mj_destino">${optLotes}</select>`;
  }else if(tipo==="Outros"){
    especifico=`<label>Tipo do evento</label>
      <select id="mj_sub" onchange="toggleOutro()">
        <option value="Castração">Castração (somente machos)</option>
        <option value="Outro">Outro (especificar)</option>
      </select>
      <div id="grp_outro" style="display:none"><label>Qual evento? *</label><input id="mj_qual" placeholder="Ex: descorna, exame, pesagem…"></div>
      <label>Observação (opcional)</label><input id="mj_obs">`;
  }

  const alvos=tipo==="Marcação"?`
      <option value="animal">Um animal específico</option>
      <option value="varios">Vários animais</option>
      <option value="grupo">Um grupo</option>
      <option value="lote">Lote inteiro</option>`:`
      <option value="animal">Um animal específico</option>
      <option value="lote">Lote inteiro</option>`;
  const titulo=tipo==="Movimentação"?"Trocar de lote":(tipo==="Marcação"?"Marcar animais":(tipo==="Outros"?"Outros eventos":"Medicamento aplicado"));
  abrir(`<h2>${titulo}</h2>
    <label>Aplicar a</label>
    <select id="mj_alvo" onchange="toggleAlvo()">${alvos}</select>
    <div id="grp_animal"><label>Animal</label><select id="mj_animal">${optAnimais||`<option value="">— nenhum animal ativo —</option>`}</select></div>
    ${tipo==="Marcação"?`<div id="grp_varios" style="display:none">
      <label>Selecionar animais</label>
      <input id="mj_busca" placeholder="Buscar por identificação ou lote…" oninput="filtrarAnimaisManejo()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 2px 4px;gap:8px">
        <span id="mj_contagem" class="meta">0 selecionados</span>
        <button type="button" class="btn-fant" style="padding:4px 0;color:var(--verde);font-weight:700" onclick="marcarVisiveisManejo()">Selecionar visíveis</button>
      </div>
      <div style="max-height:260px;overflow:auto;border-top:1px solid var(--linha)">${checksAnimais||`<div class="meta" style="padding:10px 0">Nenhum animal ativo.</div>`}</div>
    </div>
    <div id="grp_grupo" style="display:none"><label>Grupo</label><select id="mj_grupo">${optGrupos||`<option value="">— nenhum grupo cadastrado —</option>`}</select></div>`:""}
    <div id="grp_lote" style="display:none"><label>Lote</label><select id="mj_lote">${optLotes}</select></div>
    <label>Data e hora</label>
    <div class="lado"><input id="mj_data" type="date" value="${hoje()}"><input id="mj_hora" type="time" value="${horaAgora()}"></div>
    ${especifico}
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarManejo('${tipo}')">Registrar</button></div>`);
}
function toggleAlvo(){
  const alvo=(document.getElementById("mj_alvo")||{}).value||"animal";
  const mapa={grp_animal:"animal",grp_varios:"varios",grp_grupo:"grupo",grp_lote:"lote"};
  Object.entries(mapa).forEach(([id,tipo])=>{const el=document.getElementById(id);if(el)el.style.display=alvo===tipo?"block":"none";});
}
function atualizarContagemManejo(){
  const n=document.querySelectorAll(".mj_multi_ck:checked").length;
  const el=document.getElementById("mj_contagem");if(el)el.textContent=`${n} selecionado${n===1?"":"s"}`;
}
function filtrarAnimaisManejo(){
  const q=((document.getElementById("mj_busca")||{}).value||"").trim().toLowerCase();
  document.querySelectorAll(".mj-multi-item").forEach(el=>{el.style.display=(!q||(el.dataset.busca||"").includes(q))?"flex":"none";});
}
function marcarVisiveisManejo(){
  document.querySelectorAll(".mj-multi-item").forEach(el=>{if(el.style.display!=="none"){const c=el.querySelector(".mj_multi_ck");if(c)c.checked=true;}});
  atualizarContagemManejo();
}
function toggleOutro(){
  const el=document.getElementById("grp_outro");
  if(el)el.style.display=(document.getElementById("mj_sub").value==="Outro")?"block":"none";
}
async function salvarManejo(tipo){
  const alvo=document.getElementById("mj_alvo").value;
  const data=val("mj_data"), hora=val("mj_hora");
  const todos=await getAll("animais");
  let lista=[];
  if(alvo==="animal"){
    const id=(document.getElementById("mj_animal")||{}).value;
    if(!id)return alert("Selecione o animal.");
    lista=[id];
  }else if(alvo==="varios"){
    lista=[...document.querySelectorAll(".mj_multi_ck:checked")].map(c=>c.value);
    if(!lista.length)return alert("Selecione pelo menos um animal.");
  }else if(alvo==="grupo"){
    const grupoId=(document.getElementById("mj_grupo")||{}).value;
    if(!grupoId)return alert("Selecione o grupo.");
    const vinculos=await getAll("grupo_animais");
    const ativos=new Set(todos.filter(a=>a.status==="Ativo").map(a=>a.id));
    lista=[...new Set(vinculos.filter(v=>v.grupoId===grupoId&&ativos.has(v.animalId)).map(v=>v.animalId))];
    if(!lista.length)return alert("Esse grupo não tem animais ativos.");
  }else{
    const loteId=(document.getElementById("mj_lote")||{}).value;
    if(!loteId)return alert("Selecione o lote.");
    lista=todos.filter(a=>a.loteAtualId===loteId&&a.status==="Ativo").map(a=>a.id);
    if(!lista.length)return alert("Esse lote não tem animais ativos.");
  }
  let n=0;
  if(tipo==="Movimentação"){
    const destino=val("mj_destino");
    if(!destino)return alert("Selecione o lote de destino.");
    const lotes=await getAll("lotes");
    const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||"—";
    const nomeDest=nomeLote(destino);
    for(const id of lista){
      const a=await get("animais",id);
      if(a.loteAtualId===destino)continue;
      const de=nomeLote(a.loteAtualId);
      a.loteAtualId=destino;await put("animais",a);
      await registrarEvento(id,"Movimentação",data,`De "${de}" para "${nomeDest}"`,{hora});n++;
    }
    if(!n){fechar();return alert("Os animais já estão nesse lote.");}
  }else if(tipo==="Marcação"){
    const obs=val("mj_obs");
    for(const id of lista){await registrarEvento(id,"Marcação",data,obs,{hora});n++;}
  }else if(tipo==="Medicamento"){
    const medId=(document.getElementById("mj_med")||{}).value||null;
    if(!medId)return alert("Selecione o medicamento ou vacina.");
    const via=val("mj_via"), dose=val("mj_dose"), obs=val("mj_obs");
    for(const id of lista){await registrarEvento(id,"Medicamento",data,obs,{hora,medicamentoId:medId,via,dose});n++;}
  }else if(tipo==="Outros"){
    const sub=(document.getElementById("mj_sub")||{}).value||"Castração";
    const obs=val("mj_obs");
    if(sub==="Castração"){
      for(const id of lista){const a=await get("animais",id);if(!a||a.sexo!=="M")continue;a.castrado=true;a.dataCastracao=data;await put("animais",a);await registrarEvento(id,"Castração",data,obs,{hora});n++;}
      if(!n){fechar();return alert("Nenhum macho entre os selecionados para castrar.");}
    }else{
      const qual=val("mj_qual");if(!qual)return alert("Descreva qual foi o evento.");
      const det=[qual,obs].filter(Boolean).join(" · ");
      for(const id of lista){await registrarEvento(id,"Outro",data,det,{hora});n++;}
    }
  }
  fechar();render();alert(`Registrado em ${n} animal(is).`);
}
async function editarGrupoManejo(tipo,idsCsv){
  const ids=idsCsv.split(",");
  const ev=await get("eventos",ids[0]); if(!ev){telaManejo();return;}
  const medicamentos=await listaMedicamentos();
  if(ev.medicamentoId&&!medicamentos.some(m=>m.id===ev.medicamentoId)){const x=await get("insumos",ev.medicamentoId);if(x)medicamentos.unshift(x);}
  let campos="";
  if(tipo==="Medicamento"&&ev.aplicacaoId){
    const m=medicamentos.find(x=>x.id===ev.medicamentoId);
    campos=`<div class="card" style="cursor:default;background:var(--verde-lite);box-shadow:none;padding:12px"><b>${esc(m?m.nome:"Medicamento")}</b> · ${esc(ev.dose||"")} por animal
        <div class="meta" style="margin-top:4px">Esta aplicação deu baixa no estoque. Para trocar o produto ou a dose, exclua e registre de novo.</div></div>
      <label>Via de aplicação</label><select id="em_via">${VIAS.map(v=>`<option value="${v}" ${ev.via===v?"selected":""}>${v}</option>`).join("")}</select>
      <label>Observação (opcional)</label><input id="em_obs" value="${esc(ev.detalhes||"")}">`;
  }else if(tipo==="Medicamento"){
    const optMed=optMedicamentos(medicamentos,ev.medicamentoId)||`<option value="">— nenhum —</option>`;
    campos=`<label>Medicamento</label><select id="em_med">${optMed}</select>
      <label>Via de aplicação</label><select id="em_via">${VIAS.map(v=>`<option value="${v}" ${ev.via===v?"selected":""}>${v}</option>`).join("")}</select>
      <label>Dose (opcional)</label><input id="em_dose" value="${esc(ev.dose||"")}">
      <label>Observação (opcional)</label><input id="em_obs" value="${esc(ev.detalhes||"")}">`;
  }else if(tipo==="Outro"){
    campos=`<label>Descrição do evento *</label><input id="em_det" value="${esc(ev.detalhes||"")}">`;
  }else{
    campos=`<label>Observação (opcional)</label><input id="em_obs" value="${esc(ev.detalhes||"")}">`;
  }
  abrir(`<h2>Editar registro</h2>
    <div class="meta" style="margin-bottom:10px">A alteração vale para os <b>${ids.length}</b> animal(is) deste registro.</div>
    ${campos}
    <label>Data e hora</label>
    <div class="lado"><input id="em_data" type="date" value="${ev.data||hoje()}"><input id="em_hora" type="time" value="${ev.hora||horaAgora()}"></div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarGrupoManejo('${tipo}','${idsCsv}')">Salvar</button></div>`);
}
async function salvarGrupoManejo(tipo,idsCsv){
  const ids=idsCsv.split(",");
  const patch={data:val("em_data"),hora:val("em_hora")};
  if(patch.data>hoje())return alert("A data não pode ser no futuro.");
  if(tipo==="Medicamento"&&!document.getElementById("em_med")){
    patch.via=val("em_via");patch.detalhes=val("em_obs");
    const ev0=await get("eventos",ids[0]);
    if(ev0&&ev0.aplicacaoId){ // mantém estoque e custo na mesma data da aplicação
      const mov=(await getAll("insumo_mov")).find(m=>m.aplicacaoId===ev0.aplicacaoId);
      if(mov&&mov.data!==patch.data){mov.data=patch.data;await put("insumo_mov",mov);
        const l=(await getAll("lancamentos")).find(x=>x.origem==="consumo_insumo"&&x.refId===mov.id);if(l){l.data=patch.data;await put("lancamentos",l);}}
    }
  }else if(tipo==="Medicamento"){
    patch.medicamentoId=(document.getElementById("em_med")||{}).value||null;
    patch.via=val("em_via");patch.dose=val("em_dose");patch.detalhes=val("em_obs");
  }else if(tipo==="Outro"){
    const det=val("em_det");if(!det)return alert("Descreva o evento.");patch.detalhes=det;
  }else{
    patch.detalhes=val("em_obs");
  }
  for(const id of ids){const e=await get("eventos",id);if(!e)continue;Object.assign(e,patch);await put("eventos",e);}
  fechar();telaManejo();
}
async function excluirGrupoManejo(tipo,idsCsv){
  const ids=idsCsv.split(",");
  if(!confirm(`Excluir este registro? Ele será removido de ${ids.length} animal(is).`))return;
  await excluirEventosEmBloco(ids);
  telaManejo();
}

/* ---------- Cadastro de medicamentos ----------
   V142: o cadastro de medicamentos agora é feito no Estoque de Insumos (grupo "Insumos do gado").
   As funções antigas levam para lá, para nenhum botão antigo ficar sem destino. */
async function gerenciarMedicamentos(){fechar();aba="painel";marcarNav("painel");telaEstoque();}
async function formEditarMedicamento(id){if(await get("insumos",id))return formNovoInsumo(null,id);gerenciarMedicamentos();}

async function formMedicarAnimal(id){const _ab=await get("animais",id);if(_ab&&_ab.status&&_ab.status!=="Ativo")return alert(`Este animal está baixado (${_ab.status}). Não é possível medicar.`);return formAplicacao({voltar:"animal",animalId:id});}
async function castrarAnimal(id){const _ab=await get("animais",id);if(_ab&&_ab.status&&_ab.status!=="Ativo")return alert(`Este animal está baixado (${_ab.status}). Não é possível registrar castração.`);
  const a=await get("animais",id);if(!a)return;
  if(a.sexo!=="M")return alert("Só é possível registrar castração em machos.");
  abrir(`<h2>✂️ Registrar castração</h2>
    <div class="meta" style="margin-bottom:8px"><b>${esc(rotuloCod(a))}</b></div>
    <label>Data</label><input id="ct_data" type="date" value="${hoje()}">
    <label>Observação (opcional)</label><input id="ct_obs" placeholder="Ex: método, responsável…">
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarCastracao('${id}')">Salvar</button></div>`);
}
async function salvarCastracao(id){
  const a=await get("animais",id);if(!a)return;
  a.castrado=true;a.dataCastracao=val("ct_data")||hoje();
  await put("animais",a);
  await registrarEvento(id,"Castração",a.dataCastracao,val("ct_obs"),{});
  fechar();verAnimal(id);
}
async function formEvento(id,tipoFixo){const _ab=await get("animais",id);if(_ab&&_ab.status&&_ab.status!=="Ativo")return alert(`Este animal está baixado (${_ab.status}). Não é possível registrar evento de manejo.`);
  if(!(await podeUsarApp("Registrar manejo")))return;
  const opt=TIPOS.map(t=>`<option value="${t}" ${t===tipoFixo?"selected":""}>${t}</option>`).join("");
  abrir(`<h2>${tipoFixo||"Registrar evento"}</h2>
    <label>Tipo</label><select id="e_tipo">${opt}</select>
    <label>Data e hora</label>
    <div class="lado"><input id="e_data" type="date" value="${hoje()}"><input id="e_hora" type="time" value="${horaAgora()}"></div>
    <label>Detalhes</label><textarea id="e_det" placeholder="Ex: vacina, dose, peso, observações…"></textarea>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarEvento('${id}')">Salvar</button></div>`);}
async function salvarEvento(id){await registrarEvento(id,val("e_tipo"),val("e_data"),val("e_det"),{hora:val("e_hora")});fechar();verAnimal(id);}

async function apagarPropriedade(id){
  const ls=(await getAll("lotes")).filter(l=>l.propriedadeId===id);
  if(ls.length)return alert("Apague os lotes desta propriedade antes.");
  if(!confirm("Apagar esta propriedade?"))return;await del("propriedades",id);irAba('painel');}
async function apagarLote(id){
  const as=(await getAll("animais")).filter(a=>a.loteAtualId===id);
  const ativos=as.filter(a=>a.status==="Ativo").length, baixados=as.length-ativos;
  if(ativos)return alert(`Este lote tem ${ativos} animal(is) ativo(s). Mova-os para outro lote antes de apagar.`);
  if(!confirm(baixados?`Apagar este lote? Os ${baixados} animal(is) vendido(s)/morto(s) que passaram por ele continuam no histórico.`:"Apagar este lote?"))return;
  await del("lotes",id);aba="painel";marcarNav("painel");telaLotes();}
async function apagarAnimal(id){if(!confirm("Apagar este animal e seu histórico?"))return;
  const evs=(await getAll("eventos")).filter(e=>e.animalId===id);for(const e of evs)await del("eventos",e.id);
  await del("animais",id);voltar();}
