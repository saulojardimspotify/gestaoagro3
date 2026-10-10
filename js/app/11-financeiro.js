/* Gestão do Rebanho — js/app/11-financeiro.js
   Gestão Financeira: resumo, lançamentos, relatórios e custos por lote.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= GESTÃO FINANCEIRA ======================= */
function finHead(){return `<button class="voltar" onclick="irAba('inicio')">‹ Início</button>
  <div class="sechead"><span class="sic">💰</span><h2>Gestão Financeira</h2></div>`;}
function finTabsBar(a){const t=[["resumo",ico("grafico"),"Resumo","finResumo()"],["lancamentos",ico("lapis"),"Lançar","finLancamentos()"],["relatorios",ico("doc"),"Relatórios","finRelatorios()"],["config",ico("engr"),"Config","finConfig()"]];
  return `<div class="fintabs">${t.map(([k,ic,l,fn])=>`<button class="${a===k?'on':''}" onclick="${fn}"><span class="fi">${ic}</span>${l}</button>`).join("")}</div>`;}

async function finResumo(){
  if(!(await podeUsarApp("Acessar gestão financeira")))return;
  topoPagina();
  _finAno=_finAno||String(new Date().getFullYear());
  const {propriedades,lotes,animais}=await tudo();
  const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||"—";
  const propDoAnimal=a=>{const l=lotes.find(x=>x.id===a.loteAtualId);return l?l.propriedadeId:null;};
  const todos=(await getAll("lancamentos")).filter(l=>l.tipo!=="partida_contabil"); // V118: partidas contábeis não são lançamentos
  const anos=[...new Set(todos.map(l=>(l.data||"").slice(0,4)).filter(Boolean))];
  if(!anos.includes(_finAno))anos.push(_finAno);
  anos.sort().reverse();
  const lancs=todos.filter(l=>(l.data||"").slice(0,4)===_finAno&&(!_finProp||l.propriedadeId===_finProp));
  const rec=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.valor||0),0);
  const cpv=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.custo||0),0);
  const desp=lancs.filter(l=>l.tipo==="despesa").reduce((s,l)=>s+(l.valor||0),0);
  const ganhoReal=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.ganhoRealizado||0),0);
  const resultado=rec-cpv-desp+ganhoReal;
  // V132: resultado bruto (receita − CPV − custos de produção) e líquido (bruto − despesas)
  const custosProd=lancs.filter(l=>l.tipo==="despesa"&&(l.natureza==="custo"||l.classe==="custo")).reduce((s,l)=>s+(l.valor||0),0);
  const resultadoBruto=rec-cpv+ganhoReal-custosProd;
  // V121: saldo em aberto de todos os anos (filtrado pela propriedade), igual em Início, Resumo e Relatórios
  const abertos=todos.filter(l=>!_finProp||l.propriedadeId===_finProp);
  const aReceber=somaAReceber(abertos);
  const aPagar=somaAPagar(abertos)
    +(!_finProp?(await getAll("insumo_mov")).filter(m=>m.tipo==="entrada"&&!m.pago).reduce((s,m)=>s+(m.valorTotal||0),0):0);
  // valor do rebanho (estoque) = custo de estoque dos animais ativos
  const valorRebanho=animais.filter(a=>a.status==="Ativo"&&(!_finProp||propDoAnimal(a)===_finProp))
    .reduce((s,a)=>s+(a.custoEstoque||0),0);
  const porMes=Array.from({length:12},()=>({rec:0,cust:0}));
  for(const l of lancs){const m=parseInt((l.data||"").slice(5,7),10)-1;if(m>=0&&m<12){
    if(l.tipo==="receita"){porMes[m].rec+=(l.valor||0)+(l.ganhoRealizado||0);porMes[m].cust+=l.custo||0;}
    else if(l.tipo==="despesa")porMes[m].cust+=l.valor||0;}}
  const maxMes=Math.max(1,...porMes.map(m=>Math.max(m.rec,m.cust)));
  const chart=`<div class="fchart">${porMes.map((m,i)=>`<div class="fcol"><div class="fbars">
      <div class="fbar rec" style="height:${Math.round(m.rec/maxMes*100)}%"></div>
      <div class="fbar desp" style="height:${Math.round(m.cust/maxMes*100)}%"></div>
    </div><div class="flbl">${MESES_ABREV[i]}</div></div>`).join("")}</div>`;
  let porProp="";
  if(!_finProp){
    const map={};
    for(const l of lancs){
      // V118: mesma regra do resultado total — receita − CPV + ganho realizado − despesas. Investimentos não entram.
      let v=0;
      if(l.tipo==="receita")v=(l.valor||0)-(l.custo||0)+(l.ganhoRealizado||0);
      else if(l.tipo==="despesa")v=-(l.valor||0);
      else continue;
      const k=l.propriedadeId||"__";map[k]=(map[k]||0)+v;}
    const linhas=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="card row" style="cursor:default"><div class="ti" style="font-size:15px">🏠 ${k==="__"?"Sem propriedade":esc(nomeProp(k))}</div><div style="font-weight:800;color:${v>=0?'var(--verde)':'var(--perigo)'}">${moeda(v)}</div></div>`).join("");
    porProp=`<div class="h3">Resultado por propriedade</div>${linhas||`<div class="meta">Sem lançamentos.</div>`}`;
  }
  const optProp=`<option value="">Todas as propriedades</option>`+propriedades.map(p=>`<option value="${p.id}" ${_finProp===p.id?"selected":""}>${esc(p.nome)}</option>`).join("");
  const optAno=anos.map(a=>`<option value="${a}" ${_finAno===a?"selected":""}>${a}</option>`).join("");
  $t.innerHTML=`${finHead()}${finTabsBar("resumo")}
    <div class="lado" style="margin-bottom:14px">
      <select onchange="_finProp=this.value;finResumo()">${optProp}</select>
      <select onchange="_finAno=this.value;finResumo()" style="max-width:110px">${optAno}</select>
    </div>
    <div class="fin-hero"><div class="lbl">Resultado líquido de ${_finAno}${_finProp?" · "+esc(nomeProp(_finProp)):""} (competência)</div>
      <div class="num">${moeda(resultado)}</div>
      <div class="lbl" style="margin-top:2px">receita − CPV − custos − despesas · ${resultado>=0?"lucro":"prejuízo"} no período</div></div>
    <div class="fin-cards">
      <div class="fin-c"><div class="cl">💰 Receita de vendas</div><div class="cv" style="color:var(--verde)">${moeda(rec)}</div></div>
      <div class="fin-c"><div class="cl">🐂 CPV (custo dos vendidos)</div><div class="cv" style="color:var(--perigo)">${moeda(cpv)}</div></div>
      <div class="fin-c"><div class="cl">📊 Resultado bruto</div><div class="cv" style="color:${resultadoBruto>=0?"var(--verde)":"var(--perigo)"}">${moeda(resultadoBruto)}</div><div class="meta" style="font-size:11.5px;margin-top:2px">receita − CPV − custos de produção</div></div>
      <div class="fin-c"><div class="cl">✅ Resultado líquido</div><div class="cv" style="color:${resultado>=0?"var(--verde)":"var(--perigo)"}">${moeda(resultado)}</div><div class="meta" style="font-size:11.5px;margin-top:2px">bruto − despesas</div></div>
      <div class="fin-c"><div class="cl">🧾 Despesas</div><div class="cv" style="color:var(--perigo)">${moeda(desp)}</div></div>
      <div class="fin-c"><div class="cl">🐄 Valor do rebanho</div><div class="cv">${moeda(valorRebanho)}</div></div>
      <div class="fin-c"><div class="cl">⏳ A receber</div><div class="cv">${moeda(aReceber)}</div></div>
      <div class="fin-c"><div class="cl">📌 A pagar</div><div class="cv">${moeda(aPagar)}</div></div>
    </div>
    <div class="h3">Evolução mensal <span style="font-weight:400;font-size:12px;color:var(--muted)">· receita e custos+despesas</span></div>
    <div class="card" style="padding:10px">${chart}</div>
    ${porProp}`;
}

async function finLancamentos(){
  if(!(await podeUsarApp("Acessar lançamentos financeiros")))return;
  topoPagina();
  const {propriedades}=await tudo();
  const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||"";
  let lancs=(await getAll("lancamentos")).filter(l=>l.tipo!=="partida_contabil");
  if(_finProp)lancs=lancs.filter(l=>l.propriedadeId===_finProp);
  if(_finFiltro!=="todos")lancs=lancs.filter(l=>l.tipo===(_finFiltro==="rec"?"receita":"despesa"));
  lancs.sort((a,b)=>(b.data||"").localeCompare(a.data||"")||(b.criadoEm||0)-(a.criadoEm||0));
  const chip=(k,l)=>`<button class="btn-fant" style="padding:5px 12px;border:1.5px solid ${_finFiltro===k?'var(--verde)':'var(--linha)'};border-radius:20px;color:${_finFiltro===k?'var(--verde)':'var(--muted)'};font-weight:600" onclick="_finFiltro='${k}';finLancamentos()">${l}</button>`;
  const itens=lancs.map(l=>{
    const cor=l.tipo==="receita"?"var(--verde)":"var(--perigo)";
    const sinal=l.tipo==="receita"?"+":"−";
    return `<div class="card"><div class="row"><div class="ti" style="font-size:15px">${l.tipo==="receita"?"💰":"🧾"} ${esc(l.categoria)}</div>
        <div style="font-weight:800;color:${cor};white-space:nowrap">${sinal} ${moeda(l.valor||0)}</div></div>
      ${l.descricao?`<div class="meta">${esc(l.descricao)}</div>`:""}
      <div class="meta">📅 ${fmt(l.data)}${l.propriedadeId?` · ${esc(nomeProp(l.propriedadeId))}`:""} · <span style="color:${l.pago?'var(--verde)':'#b8860b'};font-weight:600">${l.pago?"Pago":(l.tipo==="receita"?"A receber":"A pagar")}</span></div>
      <div style="margin-top:6px">
        <button class="btn-fant" style="padding:2px 10px 2px 0;color:var(--verde);font-weight:600" onclick="toggleLancPago('${l.id}')">${l.pago?"Marcar em aberto":"Marcar pago"}</button>
        <button class="btn-fant" style="padding:2px 8px;color:var(--verde)" onclick="formLancamento('${l.id}')">✎</button>
        <button class="btn-fant" style="padding:2px 8px;color:var(--perigo)" onclick="excluirLancamento('${l.id}')">✕</button>
      </div></div>`;
  });
  $t.innerHTML=`${finHead()}${finTabsBar("lancamentos")}
    <button class="btn" onclick="formLancamento()">+ Novo lançamento</button>
    <div class="lado" style="gap:8px;margin-bottom:12px">${chip("todos","Todos")}${chip("rec","Receitas")}${chip("desp","Despesas")}</div>
    ${itens.length?verMais(itens,"lançamento(s)"):`<div class="vazio"><div class="big">🧾</div><b>Nenhum lançamento</b><div class="meta">Toque em "+ Novo lançamento".</div></div>`}`;
}

async function formLancamento(id){
  if(!(await podeUsarApp("Criar ou editar lançamento financeiro")))return;
  const {propriedades}=await tudo();
  const l=id?await get("lancamentos",id):null;
  const tipo=l?l.tipo:"receita";
  const cats=tipo==="receita"?CAT_RECEITA:CAT_DESPESA;
  const optCat=cats.map(c=>`<option value="${esc(c)}" ${l&&l.categoria===c?"selected":""}>${c}</option>`).join("");
  const optProp=`<option value="">Geral / todas</option>`+propriedades.map(p=>`<option value="${p.id}" ${l&&l.propriedadeId===p.id?"selected":""}>${esc(p.nome)}</option>`).join("");
  abrir(`<h2>${l?"Editar lançamento":"Novo lançamento"}</h2>
    <label>Tipo</label>
    <select id="lc_tipo" onchange="finTrocaTipo()">
      <option value="receita" ${tipo==="receita"?"selected":""}>Receita (entrada)</option>
      <option value="despesa" ${tipo==="despesa"?"selected":""}>Despesa (saída)</option></select>
    <label>Categoria</label><select id="lc_cat">${optCat}</select>
    <div id="lc_grp_classe" style="display:${tipo==="despesa"?"block":"none"}">
      <label>Classificação (para a DRE)</label>
      <select id="lc_classe">
        <option value="admin" ${l&&l.classe==="vendas"?"":"selected"}>Despesa administrativa / geral</option>
        <option value="vendas" ${l&&l.classe==="vendas"?"selected":""}>Despesa com vendas</option>
      </select>
    </div>
    <label>Valor (R$) *</label><input id="lc_valor" inputmode="decimal" value="${l&&l.valor!=null?String(l.valor).replace('.',','):""}" placeholder="Ex: 2500">
    <label>Data (competência) *</label><input id="lc_data" type="date" value="${l?l.data:hoje()}">
    <label>Propriedade</label><select id="lc_prop">${optProp}</select>
    <label>Descrição (opcional)</label><input id="lc_desc" value="${l?esc(l.descricao||""):""}" placeholder="Ex: 5 bois gordos, nota 123…">
    <label>Situação</label><select id="lc_pago"><option value="0" ${l&&l.pago?"":"selected"}>Em aberto</option><option value="1" ${l&&l.pago?"selected":""}>Pago / recebido</option></select>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="salvarLancamento(${l?`'${l.id}'`:""})">Salvar</button></div>`);
}
function finTrocaTipo(){
  const tipo=document.getElementById("lc_tipo").value;
  const cats=tipo==="receita"?CAT_RECEITA:CAT_DESPESA;
  document.getElementById("lc_cat").innerHTML=cats.map(c=>`<option value="${esc(c)}">${c}</option>`).join("");
  const g=document.getElementById("lc_grp_classe"); if(g)g.style.display=tipo==="despesa"?"block":"none";
}
async function salvarLancamento(id){
  if(!(await podeUsarApp("Salvar lançamento financeiro")))return;
  const tipo=val("lc_tipo"), categoria=val("lc_cat"), valor=numBR("lc_valor"), data=val("lc_data");
  if(valor==null||valor<=0)return alert("Informe um valor válido.");
  if(!data)return alert("Informe a data de competência.");
  const pago=(document.getElementById("lc_pago")||{}).value==="1";
  const prop=val("lc_prop")||null, desc=val("lc_desc");
  const classe=tipo==="despesa"?((document.getElementById("lc_classe")||{}).value||"admin"):null;
  if(id){const l=await get("lancamentos",id);if(l){Object.assign(l,{tipo,categoria,valor,data,propriedadeId:prop,descricao:desc,pago,classe});await put("lancamentos",l);}}
  else await put("lancamentos",{id:uid(),tipo,categoria,valor,data,propriedadeId:prop,descricao:desc,pago,classe,origem:"manual",refId:null,criadoEm:Date.now()});
  fechar();finLancamentos();
}
async function excluirLancamento(id){const _l=await get("lancamentos",id);if(_l&&_l.origem==="morte_animal")return alert("Esta perda foi gerada pelo registro de morte. Para desfazê-la, exclua o evento \"Morte\" no histórico do animal.");if(_l&&_l.origem==="compra_animal")return alert("Esta compra está ligada ao cadastro do animal. Para corrigir, use ✎ (editar compra); para desfazer, apague o animal.");if(!confirm("Excluir este lançamento? As partidas contábeis dele serão estornadas."))return;await del("lancamentos",id);finLancamentos();}
async function toggleLancPago(id){if(typeof formPagamentoLanc==="function")return formPagamentoLanc(id);const l=await get("lancamentos",id);if(l&&l.origem==="morte_animal")return;if(l){l.pago=!l.pago;l.dataPagamento=l.pago?hoje():null;await put("lancamentos",l);}finLancamentos();}

async function finRelatorios(){
  if(!(await podeUsarApp("Acessar relatórios financeiros")))return;
  topoPagina();
  _finAno=_finAno||String(new Date().getFullYear());
  const {propriedades,lotes,animais}=await tudo();
  const propDoAnimal=a=>{const l=lotes.find(x=>x.id===a.loteAtualId);return l?l.propriedadeId:null;};
  const todos=(await getAll("lancamentos")).filter(l=>l.tipo!=="partida_contabil"); // V118: partidas contábeis não são lançamentos
  const insumos=await getAll("insumos");
  const movsIns=await getAll("insumo_mov");
  const estoqueInsumos=insumos.reduce((s,i)=>s+(i.saldo||0)*(i.custoMedio||0),0);
  const aPagarInsumos=(!_finProp)?movsIns.filter(m=>m.tipo==="entrada"&&!m.pago).reduce((s,m)=>s+(m.valorTotal||0),0):0;
  const lancs=todos.filter(l=>(l.data||"").slice(0,4)===_finAno&&(!_finProp||l.propriedadeId===_finProp));
  const rec=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.valor||0),0);
  const cpv=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.custo||0),0);
  const desp=lancs.filter(l=>l.tipo==="despesa").reduce((s,l)=>s+(l.valor||0),0);
  const despVendas=lancs.filter(l=>l.tipo==="despesa"&&l.classe==="vendas").reduce((s,l)=>s+(l.valor||0),0);
  const despPerdas=lancs.filter(l=>l.tipo==="despesa"&&l.origem==="morte_animal").reduce((s,l)=>s+(l.valor||0),0); // V119
  // V132: resultado bruto (receita − CPV − custos de produção) e líquido (bruto − despesas)
  const custosProd=lancs.filter(l=>l.tipo==="despesa"&&(l.natureza==="custo"||l.classe==="custo")).reduce((s,l)=>s+(l.valor||0),0);
  const despAdmin=desp-despVendas-despPerdas-custosProd; // V132: custos de produção saem daqui (vão antes do bruto)
  const ganhoReal=lancs.filter(l=>l.tipo==="receita").reduce((s,l)=>s+(l.ganhoRealizado||0),0);
  const resultado=rec-cpv-desp+ganhoReal;
  const resultadoBruto=rec-cpv+ganhoReal-custosProd;
  const estoque=animais.filter(a=>a.status==="Ativo"&&(!_finProp||propDoAnimal(a)===_finProp)).reduce((s,a)=>s+(a.custoEstoque||0),0);
  // Ganho a realizar (passivo): bezerros nascidos ainda no estoque (vivos)
  const ganhoAReceber=animais.filter(a=>a.nascidoNaPropriedade===true&&a.status==="Ativo"&&(!_finProp||propDoAnimal(a)===_finProp)).reduce((s,a)=>s+(a.custoEstoque||0),0);
  const _abertos=todos.filter(l=>!_finProp||l.propriedadeId===_finProp); // V121
  const aReceber=somaAReceber(_abertos);
  const aPagar=somaAPagar(_abertos)+aPagarInsumos;
  const linhaDRE=(lbl,v,cor)=>`<div class="card row" style="cursor:default"><div class="ti" style="font-size:14px">${lbl}</div><div style="font-weight:800;color:${cor||'var(--texto)'}">${moeda(v)}</div></div>`;
  const porCat=(tipo)=>{
    const map={};
    for(const l of lancs.filter(x=>x.tipo===tipo))map[l.categoria]=(map[l.categoria]||0)+(l.valor||0);
    const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);
    if(!arr.length)return `<div class="meta" style="padding:2px 4px 8px">Sem ${tipo==="receita"?"receitas":"despesas"} no período.</div>`;
    const tot=arr.reduce((s,[,v])=>s+v,0);
    return arr.map(([c,v])=>`<div class="card row" style="cursor:default"><div class="ti" style="font-size:14px">${esc(c)}</div><div style="text-align:right"><div style="font-weight:800;color:${tipo==="receita"?'var(--verde)':'var(--perigo)'}">${moeda(v)}</div><div class="meta">${tot?Math.round(v/tot*100):0}%</div></div></div>`).join("");
  };
  // Partidas dobradas do período
  const partidasDe=l=>{const out=[];const contra=l.pago?"Banco/Caixa":(l.tipo==="receita"?"Clientes (a receber)":"Fornecedores (a pagar)");
    if(l.tipo==="receita"){out.push([contra,"Receita de vendas",l.valor||0]);
      if((l.custo||0)>0)out.push(["CPV","Estoque de semoventes",l.custo]);
      if((l.ganhoRealizado||0)>0)out.push(["Ganho a realizar – semoventes","Ganho realizado com semoventes",l.ganhoRealizado]);}
    else if(l.origem==="consumo_insumo")out.push(["Despesas","Estoque de insumos",l.valor||0]);
    else out.push(["Despesas",contra,l.valor||0]);return out;};
  const eventos=[];
  lancs.forEach(l=>eventos.push({data:l.data,desc:l.descricao||l.categoria,partidas:partidasDe(l)}));
  // Nascimentos do período: D Estoque de Semoventes / C Ganho a realizar
  animais.filter(a=>a.nascidoNaPropriedade===true&&(a.dataNascimento||"").slice(0,4)===_finAno&&(a.custoEstoque||0)>0&&(!_finProp||propDoAnimal(a)===_finProp))
    .forEach(a=>eventos.push({data:a.dataNascimento,desc:`Nascimento ${rotuloCod(a)}`,
      partidas:[["Estoque de semoventes","Ganho a realizar – semoventes",a.custoEstoque||0]]}));
  // Compras de insumo do período (entradas): D Estoque de insumos / C Banco ou Fornecedores
  if(!_finProp){
    const nomeIns=id=>(insumos.find(i=>i.id===id)||{}).nome||"insumo";
    movsIns.filter(m=>m.tipo==="entrada"&&(m.data||"").slice(0,4)===_finAno)
      .forEach(m=>eventos.push({data:m.data,desc:`Compra ${nomeIns(m.insumoId)}`,
        partidas:[["Estoque de insumos",m.pago?"Banco/Caixa":"Fornecedores (a pagar)",m.valorTotal||0]]}));
  }
  const razao=eventos.sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(ev=>`<div class="card" style="cursor:default">
    <div class="meta">${fmt(ev.data)} · ${esc(ev.desc)}</div>
    ${ev.partidas.map(([d,c,v])=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;margin-top:3px"><span>D <b>${d}</b> / C <b>${c}</b></span><span style="white-space:nowrap;font-weight:700">${moeda(v)}</span></div>`).join("")}</div>`);
  $t.innerHTML=`${finHead()}${finTabsBar("relatorios")}
    <div class="meta" style="margin:0 4px 12px">Ano ${_finAno}${_finProp?"":" · todas as propriedades"}</div>
    <div class="h3">Resultado do período (competência)</div>
    ${linhaDRE("Receita de vendas",rec,"var(--verde)")}
    ${linhaDRE("(−) CPV — custo dos vendidos",-cpv,"var(--perigo)")}
    ${ganhoReal>0?linhaDRE("(+) Ganho realizado (bezerros vendidos)",ganhoReal,"var(--verde)"):""}
    ${linhaDRE("(−) Custos de produção",-custosProd,"var(--perigo)")}
    ${linhaDRE("(=) Resultado bruto",resultadoBruto,resultadoBruto>=0?"var(--verde)":"var(--perigo)")}
    ${linhaDRE("(−) Despesas",-(desp-custosProd),"var(--perigo)")}
    <div class="card row" style="cursor:default;margin-left:14px"><div class="ti" style="font-size:13px;color:var(--muted)">• Administrativas / gerais</div><div style="font-weight:700;color:var(--perigo)">${moeda(-despAdmin)}</div></div>
    <div class="card row" style="cursor:default;margin-left:14px"><div class="ti" style="font-size:13px;color:var(--muted)">• Com vendas</div><div style="font-weight:700;color:var(--perigo)">${moeda(-despVendas)}</div></div>
    ${despPerdas>0?`<div class="card row" style="cursor:default;margin-left:14px"><div class="ti" style="font-size:13px;color:var(--muted)">• Perdas com morte de animais</div><div style="font-weight:700;color:var(--perigo)">${moeda(-despPerdas)}</div></div>`:""}
    ${linhaDRE("(=) Resultado líquido",resultado,resultado>=0?"var(--verde)":"var(--perigo)")}
    <div class="h3">Posição atual (patrimônio)</div>
    ${linhaDRE("🐄 Estoque de semoventes (valor do rebanho)",estoque)}
    ${estoqueInsumos>0?linhaDRE("📦 Estoque de insumos",estoqueInsumos):""}
    ${ganhoAReceber>0?linhaDRE("🍼 Ganho a realizar (bezerros no estoque)",ganhoAReceber,"var(--muted)"):""}
    ${linhaDRE("⏳ Clientes — a receber",aReceber)}
    ${linhaDRE("📌 Fornecedores — a pagar",aPagar)}
    <div class="h3">Receitas por categoria</div>${porCat("receita")}
    <div class="h3">Despesas por categoria</div>${porCat("despesa")}
    ${custoPorLoteHtml(lancs,lotes,animais)}
    <div class="h3">Partidas do período (débito / crédito)</div>
    ${razao.length?verMais(razao,"lançamento(s)"):`<div class="meta" style="padding:2px 4px 8px">Sem lançamentos no período.</div>`}`;
}

// V144: custos de produção ligados a lotes (aplicações, consumos e lançamentos apropriados)
function custoPorLoteHtml(lancs,lotes,animais){
  const mapa={};const soma=(k,v)=>{if(!(v>0))return;mapa[k]=(mapa[k]||0)+v;};
  for(const l of lancs){
    if(l.tipo!=="despesa"||(l.natureza!=="custo"&&l.classe!=="custo"))continue;
    if(l.rateioLotes){for(const k in l.rateioLotes)soma(k,l.rateioLotes[k]);continue;}
    if(l.apropriacaoTipo==="lote"&&l.apropriacaoId)soma(l.apropriacaoId,l.valor||0);
    else if(l.apropriacaoTipo==="animal"&&l.apropriacaoId){const a=animais.find(x=>x.id===l.apropriacaoId);soma(a&&a.loteAtualId||"__sem",l.valor||0);}
  }
  const linhas=Object.entries(mapa).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="card row" style="cursor:default"><div class="ti" style="font-size:15px">${k==="__sem"?"Sem lote":esc((lotes.find(x=>x.id===k)||{}).nome||"Lote excluído")}</div><div style="font-weight:800;color:var(--perigo)">${moeda(v)}</div></div>`).join("");
  return `<div class="h3">Custos de produção por lote</div>${linhas||`<div class="meta" style="padding:2px 4px 8px">Nenhum custo ligado a lotes no período. Aplicações de medicamentos e consumos do estoque com destino aparecem aqui.</div>`}`;
}
