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
   - Margem de contribuição = valor de venda − valor de compra (morte: venda zero). */

const diasEntreDatas=(ini,fim)=>{if(!ini||!fim)return null;return Math.round((new Date(fim+"T12:00:00")-new Date(ini+"T12:00:00"))/86400000);};
// Lê número digitado no padrão brasileiro: "320,5", "1.250" ou "320.5".
function numeroBR(txt){let s=String(txt||"").trim().replace(/\s/g,"");if(!s)return null;
  if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const n=Number(s);return isFinite(n)?n:null;}
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
  const animais=await getAll("animais"),eventos=await getAll("eventos");
  const linhas=animais.map(a=>({a,d:desempenhoAnimal(a,eventos)}))
    .sort((x,y)=>String(rotulo(x.a)).localeCompare(String(rotulo(y.a)),'pt-BR',{numeric:true}));
  const grupos={todos:linhas,Ativo:linhas.filter(l=>l.d.status==="Ativo"),Vendido:linhas.filter(l=>l.d.status==="Vendido"),Morto:linhas.filter(l=>l.d.status==="Morto")};
  const sel=grupos[_anFiltro]||linhas;
  const comGmd=sel.filter(l=>l.d.gmd!=null),comMargem=sel.filter(l=>l.d.margem!=null);
  const gmdMedio=comGmd.length?comGmd.reduce((s,l)=>s+l.d.gmd,0)/comGmd.length:null;
  const margemTotal=comMargem.reduce((s,l)=>s+l.d.margem,0);
  const aba=(k,t)=>`<button class="${_anFiltro===k?"on":""}" onclick="_anFiltro='${k}';telaAnaliseIndividual()">${t} (${(grupos[k]||[]).length})</button>`;
  const stCls={Ativo:"chip-lote",Vendido:"chip-off",Morto:"chip-off"};
  const item=({a,d})=>`<div class="card rt an-item" data-b="${esc(((a.brinco||"")+" "+(a.nome||"")+" "+codAnimal(a)).toLowerCase())}" onclick="analiseAnimal('${a.id}')">
      <div class="an-item-cab"><div class="ti">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}</div>
        <span class="chip ${stCls[d.status]||""}">${esc(d.status)}</span></div>
      <div class="an-nums">
        <div><span>GMD</span><b>${d.gmd!=null?kgFmt(d.gmd,3)+" kg/dia":"—"}</b></div>
        <div><span>Ganho</span><b>${d.ganhoKg!=null?kgFmt(d.ganhoKg)+" kg":"—"}</b></div>
        <div><span>Margem</span><b class="${d.margem<0?"neg":""}">${d.margem!=null?moeda(d.margem):"—"}</b></div>
      </div></div>`;
  $t.innerHTML=`<button class="voltar" onclick="telaAnaliseZootecnica()">‹ Análise</button>
    <div class="sechead"><span class="sic" data-ico="boi"></span><h2>Análise individual</h2></div>
    <div class="reb-abas an-abas">${aba("todos","Todos")}${aba("Ativo","Ativos")}${aba("Vendido","Vendidos")}${aba("Morto","Mortos")}</div>
    <div class="an-resumo">
      <div><span>GMD médio</span><b>${gmdMedio!=null?kgFmt(gmdMedio,3)+" kg/dia":"—"}</b><small>${comGmd.length} de ${sel.length} com pesos</small></div>
      <div><span>Margem somada</span><b class="${margemTotal<0?"neg":""}">${comMargem.length?moeda(margemTotal):"—"}</b><small>${comMargem.length} animal(is) com compra e venda</small></div>
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
  const d=desempenhoAnimal(a,await getAll("eventos"));
  const linha=(rot,v,sub="")=>`<div class="an-linha"><span>${rot}</span><b>${v}</b>${sub?`<small>${sub}</small>`:""}</div>`;
  const inicio=d.inicioPorPesagem?"Primeira pesagem":(d.nascido?"Nascimento":"Compra");
  const fimRot=d.status==="Vendido"?"Venda":(d.status==="Morto"?"Última pesagem (antes da morte)":"Última pesagem");
  $t.innerHTML=`<button class="voltar" onclick="telaAnaliseIndividual()">‹ Análise individual</button>
    <div class="card"><div class="an-item-cab"><div class="ti" style="font-size:20px">${esc(rotulo(a))}${a.brinco&&a.nome?` · ${esc(a.nome)}`:""}</div>
      <span class="chip ${d.status==="Ativo"?"chip-lote":"chip-off"}">${esc(d.status)}</span></div>
      <div class="meta">${d.nascido?"Nascido na propriedade":"Comprado"}${d.status==="Morto"&&d.dataSaida?` · morte em ${fmt(d.dataSaida)}`:""}</div></div>
    <div class="an-destaques">
      <div><span>GMD</span><b>${d.gmd!=null?kgFmt(d.gmd,3):"—"}</b><small>kg/dia</small></div>
      <div><span>Peso ganho</span><b>${d.ganhoKg!=null?kgFmt(d.ganhoKg):"—"}</b><small>kg</small></div>
      <div><span>Margem</span><b class="${d.margem<0?"neg":""}">${d.margem!=null?moeda(d.margem):"—"}</b><small>venda − compra</small></div>
    </div>
    <div class="card">
      <div class="h3" style="margin-top:0">Desempenho</div>
      ${linha(`Data — ${inicio.toLowerCase()}`,d.dataIni?fmt(d.dataIni):"—")}
      ${linha(`Data — ${fimRot.toLowerCase()}`,d.dataFim?fmt(d.dataFim):"—")}
      ${linha("Dias no período",d.dias!=null?d.dias:"—")}
      ${linha(`Peso — ${inicio.toLowerCase()}`,d.pesoIni!=null?kgFmt(d.pesoIni)+" kg":"—")}
      ${linha(`Peso — ${fimRot.toLowerCase()}`,d.pesoFim!=null?kgFmt(d.pesoFim)+" kg":"—")}
      ${linha("Peso total ganho",d.ganhoKg!=null?kgFmt(d.ganhoKg)+" kg":"—")}
      ${linha("GMD",d.gmd!=null?kgFmt(d.gmd,3)+" kg/dia":"—")}
      <div class="h3">Margem de contribuição</div>
      ${linha(d.nascido?"Valor de entrada (nascido)":"Valor de compra",d.valorCompra!=null?moeda(d.valorCompra):"—")}
      ${linha(d.status==="Morto"?"Valor de venda (morte)":"Valor de venda",d.valorVenda!=null?moeda(d.valorVenda):(d.status==="Ativo"?"ainda não vendido":"—"))}
      ${linha("Margem (venda − compra)",d.margem!=null?`<span class="${d.margem<0?"neg":""}">${moeda(d.margem)}</span>`:"—")}
      ${d.avisos.length?`<div class="eq-aviso" style="margin-top:12px">${d.avisos.map(esc).join("<br>")}</div>`:""}
    </div>
    ${d.status==="Ativo"?`<div class="card"><div class="ti">Registrar pesagem</div>
      <div class="meta">O peso fica no histórico do animal e passa a ser usado no GMD.</div>
      <div class="lado"><div style="flex:1"><label>Peso (kg)</label><input id="an_peso" inputmode="decimal" placeholder="Ex: 320"></div>
        <div style="flex:1"><label>Data</label><input id="an_data" type="date" value="${hoje()}" max="${hoje()}"></div></div>
      <button class="btn" style="margin-top:14px" onclick="salvarPesagemAnalise('${a.id}')">Salvar pesagem</button></div>`:""}
    <button class="btn btn-sec" onclick="verAnimal('${a.id}')">Ver ficha do animal</button>`;
}
async function salvarPesagemAnalise(id){
  const kg=numeroBR(val("an_peso"));
  const data=val("an_data")||hoje();
  if(!(kg>0))return alert("Informe o peso em kg.");
  if(data>hoje())return alert("A data da pesagem não pode ser no futuro.");
  await registrarEvento(id,"Pesagem",data,`Peso: ${kgFmt(kg)} kg`,{pesoKg:kg});
  analiseAnimal(id);
}
