/* Gestão do Rebanho — js/app/17-analise-zootecnica.js
   Aba "Análise" do menu de baixo (V165): análises zootécnicas do rebanho.
   - Análise individual: para cada animal (ativo, vendido ou morto) calcula dias, peso inicial e final,
     peso ganho, GMD e margem de contribuição (valor de venda − valor de compra).
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html.

   De onde vêm os números
   - Início: animal comprado → data da compra (dataAquisicao), peso bruto e valor da compra;
     nascido na propriedade → data de nascimento, peso ao nascer se houver, valor zero.
   - Fim: vendido → data e peso bruto da venda (em venda de vários animais, a média por animal);
     morto → data da morte e a última pesagem; ativo → a última pesagem (evento "Pesagem" com pesoKg).
   - GMD = (peso final − peso inicial) / dias entre as duas pesagens.
   - Margem de contribuição = valor de venda − valor de compra (morte: venda zero).
   - Custo do animal (V169) = só os gastos diretos dele: remédios e vacinas aplicados nele (dose × custo
     médio) e custos/consumos lançados para ele ou para animais escolhidos (dividido entre eles).
     Gastos de pasto, lote, propriedade ou rebanho e itens de manutenção não entram. */

const diasEntreDatas=(ini,fim)=>{if(!ini||!fim)return null;return Math.round((new Date(fim+"T12:00:00")-new Date(ini+"T12:00:00"))/86400000);};
// Lê número digitado no padrão brasileiro: "320,5", "1.250" ou "320.5".
function numeroBR(txt){let s=String(txt||"").trim().replace(/\s/g,"");if(!s)return null;
  if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const n=Number(s);return isFinite(n)?n:null;}
// Dias também em meses (mês médio de 30,4 dias).
const diasEMeses=d=>d==null?"—":`${d} dias (≈ ${kgFmt(d/30.4)} ${d/30.4>=1.95?"meses":"mês"})`;
const kgFmt=(n,d=1)=>n==null||!isFinite(n)?"—":Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});

function ultimaPesagem(animalId,eventos){
  return eventos.filter(e=>e.animalId===animalId&&e.tipo==="Pesagem"&&Number(e.pesoKg)>0)
    .sort((x,y)=>String(y.data).localeCompare(String(x.data))||(y.criadoEm||0)-(x.criadoEm||0))[0]||null;
}
function desempenhoAnimal(a,eventos){
  const nascido=a.nascidoNaPropriedade===true;
  const r={nascido,status:a.status||"Ativo",avisos:[]};
  // início
  r.dataIni=nascido?(a.dataNascimento||null):(dataAquisicao(a)||null);
  r.pesoIni=nascido?(Number(a.pesoNascimentoKg)||null):(Number(a.pesoBrutoCompraKg??a.pesoCompraKg)||null);
  r.valorCompra=nascido?0:(a.valorCompraCalculado??a.custoEstoque??null);
  // fim
  const s=a.saida||null;
  if(r.status==="Vendido"&&s){
    const q=Math.max(1,Number(s.quantidadeAnimais)||1);
    r.dataFim=s.data||null;
    r.pesoFim=s.pesoBruto!=null?Number(s.pesoBruto)/q:null;
    const total=s.valorOperacao??s.valorCalculado??null;
    r.valorVenda=s.valor!=null?Number(s.valor):(total!=null?Number(total)/q:null);
    if(q>1)r.avisos.push(`Venda de ${q} animais juntos: peso e valor são a média por animal.`);
  }else{
    const pes=ultimaPesagem(a.id,eventos);
    r.dataFim=pes?pes.data:null;r.pesoFim=pes?Number(pes.pesoKg):null;
    r.valorVenda=r.status==="Morto"?0:null;
    if(r.status==="Morto")r.dataSaida=s&&s.data||null;
    if(!pes)r.avisos.push(r.status==="Ativo"?"Sem pesagem: registre o peso atual para calcular o GMD.":"Sem pesagem registrada antes da morte.");
  }
  // Sem peso inicial (ex.: nascido sem peso ao nascer): usa a primeira pesagem como início, se houver outra depois.
  if(r.pesoIni==null){
    const pes=eventos.filter(e=>e.animalId===a.id&&e.tipo==="Pesagem"&&Number(e.pesoKg)>0).sort((x,y)=>String(x.data).localeCompare(String(y.data)));
    if(pes.length>=2&&pes[0].data<r.dataFim){r.dataIni=pes[0].data;r.pesoIni=Number(pes[0].pesoKg);r.inicioPorPesagem=true;}
  }
  r.dias=diasEntreDatas(r.dataIni,r.dataFim);
  r.ganhoKg=r.pesoIni!=null&&r.pesoFim!=null?r.pesoFim-r.pesoIni:null;
  r.gmd=r.ganhoKg!=null&&r.dias>0?r.ganhoKg/r.dias:null;
  r.margem=r.valorVenda!=null&&r.valorCompra!=null?r.valorVenda-r.valorCompra:null;
  if(!r.dataIni)r.avisos.push(nascido?"Sem data de nascimento.":"Sem data de compra.");
  if(r.inicioPorPesagem)r.avisos.push("Sem peso inicial: o GMD foi calculado entre a primeira e a última pesagem.");
  else if(r.pesoIni==null)r.avisos.push(nascido?"Sem peso ao nascer: registre duas pesagens para calcular o GMD.":"Sem peso de compra.");
  return r;
}

/* ---------- Custo por animal (V168, só custos diretos desde a V169) ---------- */
async function dadosCustos(){
  const [lancamentos,movs,insumos]=await Promise.all(["lancamentos","insumo_mov","insumos"].map(n=>getAll(n)));
  return {lancamentos,movs,insumos};
}
// Mapa animalId → {total, itens:[{data,descricao,origem,categoria,valor}]}. Só entra o que foi gasto
// diretamente no animal: remédios e vacinas aplicados nele e custos/consumos lançados para ele
// (sozinho ou junto com outros animais escolhidos). Gastos de lote, pasto, propriedade ou rebanho
// (ex.: herbicida, cerca, mão de obra geral) não são do animal e ficam de fora.
function custosPorAnimal(animais,eventos,dc){
  const res=new Map(animais.map(a=>[a.id,{total:0,itens:[]}]));
  const add=(id,item)=>{const r=res.get(id);if(!r||!(item.valor>0))return;r.total+=item.valor;r.itens.push(item);};
  const movPorId=new Map(dc.movs.map(m=>[m.id,m])),insumoPorId=new Map(dc.insumos.map(i=>[i.id,i]));
  // 1) remédios e vacinas aplicados no animal
  for(const e of eventos){
    if(!e.aplicacaoId||!e.movId)continue;
    const mov=movPorId.get(e.movId);if(!mov)continue;
    const valor=(Number(e.doseQtd)||0)*(Number(mov.custoUnit)||0);
    const it=insumoPorId.get(e.medicamentoId||mov.insumoId);
    add(e.animalId,{data:e.data,descricao:`${it?it.nome:"Medicamento"}${e.dose?` · ${e.dose}`:""}`,origem:"Aplicado neste animal",categoria:"Sanidade",valor});
  }
  // 2) custos do Financeiro e consumos do Estoque lançados para o animal (ou para animais escolhidos)
  for(const l of dc.lancamentos){
    if(l.tipo!=="despesa"||!(l.classe==="custo"||l.natureza==="custo"))continue;
    if(l.aplicacaoId)continue; // já contado no item 1
    const valor=Number(l.valor)||0;if(!(valor>0)||!l.data)continue;
    const mov=l.origem==="consumo_insumo"?movPorId.get(l.refId):null;
    if(mov&&(insumoPorId.get(mov.insumoId)||{}).grupo==="manutencao")continue; // item de manutenção não é gasto do animal
    const tipo=l.apropriacaoTipo||(mov&&mov.apropriacaoTipo);
    if(tipo!=="animal"&&tipo!=="animais")continue;
    const ids=[...new Set([...(l.apropriacaoIds||[]),...(mov&&mov.apropriacaoIds||[]),...(l.apropriacaoId?[l.apropriacaoId]:[])])];
    const alvo=animais.filter(a=>ids.includes(a.id));if(!alvo.length)continue;
    const parte=valor/alvo.length;
    for(const a of alvo)add(a.id,{data:l.data,descricao:l.descricao||l.categoria||"Custo",categoria:l.categoria||"",
      origem:alvo.length>1?`${moeda(valor)} ÷ ${alvo.length} animais escolhidos`:"Lançado para este animal",valor:parte});
  }
  for(const r of res.values())r.itens.sort((x,y)=>String(y.data).localeCompare(String(x.data)));
  return res;
}
async function verDetalhesCusto(id){
  const animais=await getAll("animais"),eventos=await getAll("eventos"),dc=await dadosCustos();
  const c=custosPorAnimal(animais,eventos,dc).get(id)||{total:0,itens:[]};
  const a=animais.find(x=>x.id===id);
  const porCat={};c.itens.forEach(i=>{const k=i.categoria||"Outros";porCat[k]=(porCat[k]||0)+i.valor;});
  abrir(`<h2>Custo de ${esc(a?rotulo(a)+(a.brinco&&a.nome?` · ${a.nome}`:""):"animal")}</h2>
    <div class="an-custo-total"><span>Total gasto no animal</span><b>${moeda(c.total)}</b></div>
    ${Object.keys(porCat).length?`<div class="an-custo-cats">${Object.entries(porCat).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`<div><span>${esc(k)}</span><b>${moeda(v)}</b></div>`).join("")}</div>`:""}
    <div class="h3">Detalhes</div>
    ${c.itens.map(i=>`<div class="an-custo-item"><div style="flex:1;min-width:0"><b>${esc(i.descricao)}</b>
      <div class="meta">${fmt(i.data)} · ${esc(i.origem)}</div></div><b>${moeda(i.valor)}</b></div>`).join("")||`<div class="meta">Nenhum custo registrado para este animal.</div>`}
    <div class="meta" style="margin-top:12px;line-height:1.45">Entram só os gastos diretos do animal: remédios e vacinas aplicados nele e custos lançados para ele (sozinho ou junto com outros animais escolhidos, dividido entre eles). Gastos de pasto, lote, propriedade ou rebanho não entram. O valor de compra também não (está na margem).</div>
    <button class="btn" style="margin-top:16px" onclick="fechar()">Fechar</button>`);
}

/* ---------- Histórico de peso e GMD por período (V169) ---------- */
// Pontos de peso do animal em ordem de data: entrada (compra/nascimento), cada pesagem e a venda.
function pontosDePeso(a,eventos){
  const pts=[];
  const nascido=a.nascidoNaPropriedade===true;
  const ini=nascido?a.dataNascimento:dataAquisicao(a),pIni=nascido?Number(a.pesoNascimentoKg):Number(a.pesoBrutoCompraKg??a.pesoCompraKg);
  if(ini&&pIni>0)pts.push({data:ini,peso:pIni,origem:nascido?"Nascimento":"Compra"});
  eventos.filter(e=>e.animalId===a.id&&e.tipo==="Pesagem"&&Number(e.pesoKg)>0)
    .forEach(e=>pts.push({data:e.data,peso:Number(e.pesoKg),origem:"Pesagem",eventoId:e.id}));
  const s=a.saida;
  if(a.status==="Vendido"&&s&&s.data&&s.pesoBruto!=null){const q=Math.max(1,Number(s.quantidadeAnimais)||1);
    pts.push({data:s.data,peso:Number(s.pesoBruto)/q,origem:q>1?"Venda (média do lote vendido)":"Venda"});}
  pts.sort((x,y)=>String(x.data).localeCompare(String(y.data)));
  // GMD de cada período (do ponto anterior até este)
  pts.forEach((p,i)=>{if(!i)return;const ant=pts[i-1];p.dias=diasEntreDatas(ant.data,p.data);p.ganho=p.peso-ant.peso;p.gmd=p.dias>0?p.ganho/p.dias:null;});
  return pts;
}
async function verHistoricoPeso(id){
  const a=await get("animais",id);if(!a)return;
  const pts=pontosDePeso(a,await getAll("eventos"));
  const linhas=pts.slice().reverse().map(p=>`<div class="an-peso-item">
      <div class="an-peso-cab"><div><b>${fmt(p.data)}</b> <span class="meta">· ${esc(p.origem)}</span></div><b>${kgFmt(p.peso)} kg</b></div>
      ${p.dias!=null?`<div class="an-peso-per"><span>${diasEMeses(p.dias)}</span><span class="${p.ganho<0?"neg":""}">${p.ganho>=0?"+":""}${kgFmt(p.ganho)} kg</span><b class="${p.gmd<0?"neg":""}">GMD ${p.gmd!=null?kgFmt(p.gmd,3):"—"}</b></div>`:`<div class="an-peso-per"><span>Primeiro peso</span></div>`}
    </div>`).join("");
  const prim=pts[0],ult=pts[pts.length-1];
  const dTot=pts.length>1?diasEntreDatas(prim.data,ult.data):null,gTot=pts.length>1?ult.peso-prim.peso:null;
  abrir(`<h2>Histórico de peso</h2>
    <div class="meta" style="margin-bottom:8px">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}</div>
    ${pts.length>1?`<div class="an-custo-total"><span>GMD do período todo (${fmt(prim.data)} a ${fmt(ult.data)})</span>
      <b>${dTot>0?kgFmt(gTot/dTot,3):"—"} kg/dia</b><div class="meta">${kgFmt(gTot)} kg em ${diasEMeses(dTot)}</div></div>`:""}
    ${linhas||`<div class="meta">Nenhum peso registrado ainda.</div>`}
    <div class="meta" style="margin-top:12px">Cada linha mostra o peso e, abaixo, o ganho e o GMD desde o peso anterior. Para apagar uma pesagem, use o ✕ no histórico da página do animal.</div>
    <button class="btn" style="margin-top:16px" onclick="fechar()">Fechar</button>`);
}

/* ---------- Página inicial da Análise ---------- */
function telaAnaliseZootecnica(){
  topoPagina();
  $t.innerHTML=`<div class="sechead"><span class="sic" data-ico="grafico"></span><h2>Análise zootécnica</h2></div>
    <div class="meta" style="font-size:14px;margin:0 4px 16px">Escolha a análise que deseja ver.</div>
    <div class="calc-func-card" onclick="telaAnaliseIndividual()"><div class="cfc-ico">${ico("boi")}</div>
      <div class="cfc-t">Análise individual</div>
      <div class="cfc-d">Animal por animal: dias, peso ganho, GMD e margem de contribuição (venda − compra).</div><div class="cfc-seta">›</div></div>`;
}

/* ---------- Análise individual: lista ---------- */
let _anFiltro="todos";
async function telaAnaliseIndividual(){
  topoPagina();
  const animais=await getAll("animais"),eventos=await getAll("eventos"),dc=await dadosCustos();
  const des=new Map(animais.map(a=>[a.id,desempenhoAnimal(a,eventos)]));
  const custos=custosPorAnimal(animais,eventos,dc);
  const linhas=animais.map(a=>({a,d:des.get(a.id),c:custos.get(a.id)}))
    .sort((x,y)=>String(rotulo(x.a)).localeCompare(String(rotulo(y.a)),'pt-BR',{numeric:true}));
  const grupos={todos:linhas,Ativo:linhas.filter(l=>l.d.status==="Ativo"),Vendido:linhas.filter(l=>l.d.status==="Vendido"),Morto:linhas.filter(l=>l.d.status==="Morto")};
  const sel=grupos[_anFiltro]||linhas;
  const comGmd=sel.filter(l=>l.d.gmd!=null),comMargem=sel.filter(l=>l.d.margem!=null);
  const gmdMedio=comGmd.length?comGmd.reduce((s,l)=>s+l.d.gmd,0)/comGmd.length:null;
  const margemTotal=comMargem.reduce((s,l)=>s+l.d.margem,0);
  const custoMedio=sel.length?sel.reduce((s,l)=>s+(l.c?l.c.total:0),0)/sel.length:0;
  const aba=(k,t)=>`<button class="${_anFiltro===k?"on":""}" onclick="_anFiltro='${k}';telaAnaliseIndividual()">${t}<small>(${(grupos[k]||[]).length})</small></button>`;
  const stCls={Ativo:"chip-lote",Vendido:"chip-off",Morto:"chip-off"};
  const item=({a,d,c})=>`<div class="card rt an-item" data-b="${esc(((a.brinco||"")+" "+(a.nome||"")+" "+codAnimal(a)).toLowerCase())}" onclick="analiseAnimal('${a.id}')">
      <div class="an-item-cab">${animalThumb(a,46)}<div class="ti" style="flex:1;min-width:0">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}
        <div class="meta">${d.dias!=null?diasEMeses(d.dias):(d.nascido?"Nascido na propriedade":"Comprado")}</div></div>
        <span class="chip ${stCls[d.status]||""}">${esc(d.status)}</span></div>
      <div class="an-nums">
        <div><span>GMD</span><b>${d.gmd!=null?kgFmt(d.gmd,3)+" kg/dia":"—"}</b></div>
        <div><span>Ganho</span><b>${d.ganhoKg!=null?kgFmt(d.ganhoKg)+" kg":"—"}</b></div>
        <div><span>Margem</span><b class="${d.margem<0?"neg":""}">${d.margem!=null?moeda(d.margem):"—"}</b></div>
        <div><span>Custo</span><b>${c&&c.total>0?moeda(c.total):"—"}</b></div>
      </div></div>`;
  $t.innerHTML=`<button class="voltar" onclick="telaAnaliseZootecnica()">‹ Análise</button>
    <div class="sechead"><span class="sic" data-ico="boi"></span><h2>Análise individual</h2></div>
    <div class="reb-abas an-abas">${aba("todos","Todos")}${aba("Ativo","Ativos")}${aba("Vendido","Vendidos")}${aba("Morto","Mortos")}</div>
    <div class="an-resumo">
      <div><span>GMD médio</span><b>${gmdMedio!=null?kgFmt(gmdMedio,3)+" kg/dia":"—"}</b><small>${comGmd.length} de ${sel.length} com pesos</small></div>
      <div><span>Margem somada</span><b class="${margemTotal<0?"neg":""}">${comMargem.length?moeda(margemTotal):"—"}</b><small>${comMargem.length} animal(is) com compra e venda</small></div>
      <div class="full"><span>Custo médio por animal</span><b>${moeda(custoMedio)}</b><small>gastos diretos: remédios, vacinas e custos lançados no animal</small></div>
    </div>
    <input id="an_busca" type="search" placeholder="Buscar por brinco, nome ou código" oninput="filtrarAnaliseIndividual()" style="margin:4px 0 12px">
    <div id="an_lista">${sel.map(item).join("")||`<div class="vazio"><b>Nenhum animal neste filtro.</b></div>`}</div>`;
}
function filtrarAnaliseIndividual(){
  const q=(val("an_busca")||"").toLowerCase().trim();
  document.querySelectorAll("#an_lista .an-item").forEach(c=>{c.style.display=!q||c.dataset.b.includes(q)?"":"none";});
}

/* ---------- Análise individual: ficha do animal ---------- */
async function analiseAnimal(id){
  topoPagina();
  const a=await get("animais",id);if(!a)return telaAnaliseIndividual();
  const eventos=await getAll("eventos"),animais=await getAll("animais"),dc=await dadosCustos();
  const des=new Map(animais.map(x=>[x.id,desempenhoAnimal(x,eventos)]));
  const d=des.get(id),c=custosPorAnimal(animais,eventos,dc).get(id)||{total:0,itens:[]};
  const linha=(rot,v,sub="")=>`<div class="an-linha"><span>${rot}</span><b>${v}</b>${sub?`<small>${sub}</small>`:""}</div>`;
  const inicio=d.inicioPorPesagem?"Primeira pesagem":(d.nascido?"Nascimento":"Compra");
  const fimRot=d.status==="Vendido"?"Venda":(d.status==="Morto"?"Última pesagem (antes da morte)":"Última pesagem");
  $t.innerHTML=`<button class="voltar" onclick="telaAnaliseIndividual()">‹ Análise individual</button>
    <div class="card"><div class="an-item-cab">${animalThumb(a,56)}<div style="flex:1;min-width:0"><div class="ti" style="font-size:20px">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}</div>
        <div class="meta">${d.nascido?"Nascido na propriedade":"Comprado"}${d.status==="Morto"&&d.dataSaida?` · morte em ${fmt(d.dataSaida)}`:""}</div></div>
      <span class="chip ${d.status==="Ativo"?"chip-lote":"chip-off"}">${esc(d.status)}</span></div>
      <button class="btn btn-sec btn-ico" style="margin:12px 0 0" onclick="verAnimal('${a.id}')">${ico("boi")} Ir para a página do animal</button></div>
    <div class="an-destaques">
      <div class="rt" onclick="verHistoricoPeso('${a.id}')"><span>GMD</span><b>${d.gmd!=null?kgFmt(d.gmd,3):"—"}</b><small>kg/dia · <span class="an-link">histórico de peso ›</span></small></div>
      <div><span>Peso ganho</span><b>${d.ganhoKg!=null?kgFmt(d.ganhoKg):"—"}</b><small>kg</small></div>
      <div><span>Margem</span><b class="${d.margem<0?"neg":""}">${d.margem!=null?moeda(d.margem):"—"}</b><small>venda − compra</small></div>
      <div class="rt" onclick="verDetalhesCusto('${a.id}')"><span>Custo do animal</span><b>${moeda(c.total)}</b><small class="an-link">ver detalhes ›</small></div>
    </div>
    <div class="card">
      <div class="h3" style="margin-top:0">Desempenho</div>
      ${linha(`Data — ${inicio.toLowerCase()}`,d.dataIni?fmt(d.dataIni):"—")}
      ${linha(`Data — ${fimRot.toLowerCase()}`,d.dataFim?fmt(d.dataFim):"—")}
      ${linha("Período",diasEMeses(d.dias))}
      ${linha(`Peso — ${inicio.toLowerCase()}`,d.pesoIni!=null?kgFmt(d.pesoIni)+" kg":"—")}
      ${linha(`Peso — ${fimRot.toLowerCase()}`,d.pesoFim!=null?kgFmt(d.pesoFim)+" kg":"—")}
      ${linha("Peso total ganho",d.ganhoKg!=null?kgFmt(d.ganhoKg)+" kg":"—")}
      ${linha("GMD",d.gmd!=null?kgFmt(d.gmd,3)+" kg/dia":"—")}
      <div class="h3">Margem de contribuição</div>
      ${linha(d.nascido?"Valor de entrada (nascido)":"Valor de compra",d.valorCompra!=null?moeda(d.valorCompra):"—")}
      ${linha(d.status==="Morto"?"Valor de venda (morte)":"Valor de venda",d.valorVenda!=null?moeda(d.valorVenda):(d.status==="Ativo"?"ainda não vendido":"—"))}
      ${linha("Margem (venda − compra)",d.margem!=null?`<span class="${d.margem<0?"neg":""}">${moeda(d.margem)}</span>`:"—")}
      <div class="h3">Custo do animal</div>
      ${linha("Gastos no animal",moeda(c.total))}
      ${d.margem!=null?linha("Margem − custos",`<span class="${d.margem-c.total<0?"neg":""}">${moeda(d.margem-c.total)}</span>`):""}
      ${d.avisos.length?`<div class="eq-aviso" style="margin-top:12px">${d.avisos.map(esc).join("<br>")}</div>`:""}
    </div>
    ${d.status==="Ativo"?`<div class="card"><div class="ti">Registrar pesagem</div>
      <div class="meta">O peso fica no histórico do animal e passa a ser usado no GMD.</div>
      <div class="lado"><div style="flex:1"><label>Peso (kg)</label><input id="an_peso" inputmode="decimal" placeholder="Ex: 320"></div>
        <div style="flex:1"><label>Data</label><input id="an_data" type="date" value="${hoje()}" max="${hoje()}"></div></div>
      <button class="btn" style="margin-top:14px" onclick="salvarPesagemAnalise('${a.id}')">Salvar pesagem</button></div>`:""}
`;
}
async function salvarPesagemAnalise(id){
  const kg=numeroBR(val("an_peso"));
  const data=val("an_data")||hoje();
  if(!(kg>0))return alert("Informe o peso em kg.");
  if(data>hoje())return alert("A data da pesagem não pode ser no futuro.");
  await registrarEvento(id,"Pesagem",data,`Peso: ${kgFmt(kg)} kg`,{pesoKg:kg});
  analiseAnimal(id);
}
