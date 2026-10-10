/* Gestão do Rebanho — js/app/03-utilidades-constantes.js
   Utilidades (datas, moeda, rótulos) e constantes do domínio (categorias, vias, raças, estoque).
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random();
const codAnimal=a=>"#"+String((a&&a.codigo)||0).padStart(3,'0');
const rotulo=a=>(a&&(a.brinco||a.nome))||codAnimal(a);
// V130: identificação padrão em listas e seleções — sempre começa pelo código, depois o nome e,
// se for diferente do código, o brinco. Ex.: "#001 · José", "#007 · Mimosa · B-77", "#003".
const rotuloCod=a=>{
  if(!a)return "";
  const cod=codAnimal(a),partes=[cod];
  if(a.nome)partes.push(a.nome);
  const b=String(a.brinco||"").trim();
  if(b&&b.replace(/^#/,"").replace(/^0+/,"")!==String(a.codigo||0))partes.push(b);
  return partes.join(" · ");
};
const normalizarBrinco=b=>(b||"").trim().toLocaleLowerCase('pt-BR');
async function brincoEmUso(brinco,ignorarAnimalId=null){
  const chave=normalizarBrinco(brinco);
  if(!chave)return false; // brinco continua opcional; vazio não é duplicidade
  const animais=await getAll("animais");
  return animais.some(a=>a.id!==ignorarAnimalId&&normalizarBrinco(a.brinco)===chave);
}
async function proximoCodigo(){const as=await getAll("animais");return as.reduce((m,a)=>Math.max(m,a.codigo||0),0)+1;}
// V133: raças — lista fixa + "Outra" com texto livre
const RACAS=["Nelore","Nelorado","Mestiço"];
function campoRaca(prefixo,atual,obrigatoria){
  const outra=!!atual&&!RACAS.includes(atual);
  const opt=(v,t)=>`<option value="${v}" ${(outra?v==="__outra":v===(atual||""))?"selected":""}>${t}</option>`;
  return `<label>Raça${obrigatoria?" *":""}</label>
    <select id="${prefixo}_raca" onchange="toggleRacaOutra('${prefixo}')">
      ${opt("",obrigatoria?"— selecione —":"— não informada —")}${RACAS.map(r=>opt(r,r)).join("")}${opt("__outra","Outra (especificar)")}</select>
    <div id="${prefixo}_raca_outra_box" style="display:${outra?"block":"none"}"><label>Qual raça? *</label>
      <input id="${prefixo}_raca_outra" value="${outra?esc(atual):""}" placeholder="Ex: Angus, Girolando, Tabapuã…"></div>`;
}
function toggleRacaOutra(prefixo){
  const box=document.getElementById(prefixo+"_raca_outra_box");
  if(box)box.style.display=val(prefixo+"_raca")==="__outra"?"block":"none";
}
// retorna a raça escolhida; {erro} se faltar informação
function lerRaca(prefixo,obrigatoria){
  const v=val(prefixo+"_raca");
  if(v==="__outra"){const t=val(prefixo+"_raca_outra").replace(/\s+/g," ");if(!t)return {erro:"Especifique qual é a raça."};return {raca:t};}
  if(!v&&obrigatoria)return {erro:"Selecione a raça do animal."};
  return {raca:v};
}
// V133: animal sem código (ex.: backup de versão antiga) recebe o próximo número livre, em ordem de cadastro.
async function numerarSemCodigo(){
  try{
    const as=await getAll("animais");
    const sem=as.filter(a=>!(Number(a.codigo)>0)).sort((x,y)=>(x.criadoEm||0)-(y.criadoEm||0)||String(x.id).localeCompare(String(y.id)));
    if(!sem.length)return 0;
    let prox=as.reduce((m,a)=>Math.max(m,Number(a.codigo)||0),0)+1;
    for(const a of sem){a.codigo=prox++;await put("animais",a);}
    console.info(`V133: ${sem.length} animal(is) numerado(s) automaticamente.`);
    return sem.length;
  }catch(e){console.error("Numeração automática V133:",e);return 0;}
}
const numBR=id=>{let v=val(id);if(!v)return null;if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');const n=parseFloat(v);return isNaN(n)?null:n;};
const moeda=n=>n==null?"—":n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
/* V121 — liquidação: cada lançamento guarda seus pagamentos/recebimentos (l.pagamentos).
   Saldo em aberto = valor − soma dos pagamentos. Registros antigos sem a lista usam l.pago. */
const TIPOS_LIQUIDAVEIS=["receita","despesa","investimento","compra_animal"];
const totalPagoLanc=l=>(l&&Array.isArray(l.pagamentos))?l.pagamentos.reduce((s,p)=>s+(Number(p.valor)||0),0):(l&&l.pago?Number(l.valor)||0:0);
const saldoAberto=l=>Math.max(0,Math.round(((Number(l&&l.valor)||0)-totalPagoLanc(l))*100)/100);
const somaAReceber=ls=>ls.filter(l=>l.tipo==="receita").reduce((s,l)=>s+saldoAberto(l),0);
const somaAPagar=ls=>ls.filter(l=>l.tipo==="despesa"||l.tipo==="investimento"||l.tipo==="compra_animal").reduce((s,l)=>s+saldoAberto(l),0);
const hoje=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,'0')+"-"+String(d.getDate()).padStart(2,'0');};
const horaAgora=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+":"+String(d.getMinutes()).padStart(2,'0');};
const fmt=d=>{if(!d)return"";const[a,m,x]=d.split("-");return`${x}/${m}/${a}`;};
const esc=s=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const val=id=>(document.getElementById(id).value||"").trim();
const TIPOS=["Vacinação","Medicamento","Marcação","Nascimento","Movimentação","Pesagem","Tratamento","Reprodução","Morte","Venda","Outro"];
const VIAS=["Injeção","Pour on","Spray","Brinco","Ingestão","Outro"];
const TIPOS_AVISO=["Comprar produto","Contratar serviço","Manejo","Outro"];
const ICONE_AVISO={"Comprar produto":"🛒","Contratar serviço":"🧰","Manejo":"🐄","Outro":"🔔","Próxima dose":"💉"};
const somarDias=(dataStr,n)=>{const d=new Date(dataParaTs(dataStr||hoje()));d.setDate(d.getDate()+Number(n||0));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
const CAT_RECEITA=["Venda de animais","Venda de bezerro","Venda de matriz/descarte","Leite","Arrendamento","Outros"];
const CAT_DESPESA=["Sanidade (vacina/remédio)","Alimentação (sal/ração)","Pasto (semente/adubo/herbicida)","Mão de obra","Combustível","Manutenção (cerca/máquina)","Veterinário","Impostos/taxas","Frete","Outros"];
// ---- Estoque de insumos ----
const CAT_INSUMO_GADO=["Medicamento","Vacina","Sal mineral","Suplemento","Vitamina","Hormônio","Vermífugo","Outro"];
const CAT_INSUMO_MANUT=["Cerca (arame/estaca)","Combustível","Óleo/lubrificante","Ferramenta/peça","Material de construção","Outro"];
const UNID_INSUMO=["un","kg","g","L","mL","m","saco","dose","frasco","pacote"];
// Categoria de despesa gerada no consumo, conforme o grupo do insumo
const DESPESA_DE_INSUMO={gado:"Sanidade (vacina/remédio)",manutencao:"Manutenção (cerca/máquina)"};
const MESES_ABREV=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TIPOS_MED=["Vacina","Antibiótico","Vermífugo","Anti-inflamatório","Carrapaticida/Mosquicida","Vitamina/Mineral","Hormônio","Outro"];
const optTipoMed=sel=>TIPOS_MED.map(t=>`<option value="${t}" ${t===sel?"selected":""}>${t}</option>`).join("");
/* V142: medicamentos e vacinas passam a ser itens do Estoque de Insumos (grupo "Insumos do gado") */
const CAT_MED_ESTOQUE=["Medicamento","Vacina","Vermífugo","Vitamina","Hormônio"];
const TIPOS_MEDICAMENTO=["Antibiótico","Anti-inflamatório","Carrapaticida/Mosquicida","Outro"];
const ehMedicamentoEstoque=i=>!!i&&(i.grupo||"gado")==="gado"&&CAT_MED_ESTOQUE.includes(i.categoria);
// Exemplos e unidade sugerida para cada categoria do estoque
const EXEMPLO_INSUMO={
  "Medicamento":["Ex: Terramicina LA, Ivermectina 1%","mL"],
  "Vacina":["Ex: Brucelose B19, Polivalente clostridioses","dose"],
  "Vermífugo":["Ex: Albendazol 10%, Doramectina","mL"],
  "Vitamina":["Ex: ADE injetável, Modificador orgânico","mL"],
  "Hormônio":["Ex: Benzoato de estradiol, Implante de progesterona","dose"],
  "Sal mineral":["Ex: Sal mineral 80, Sal proteinado","saco"],
  "Suplemento":["Ex: Proteinado das águas, Ração de cocho","saco"],
  "Cerca (arame/estaca)":["Ex: Arame farpado 500 m, Estaca de eucalipto","un"],
  "Combustível":["Ex: Diesel S10, Gasolina","L"],
  "Óleo/lubrificante":["Ex: Óleo 2 tempos, Graxa","L"],
  "Ferramenta/peça":["Ex: Lâmina de roçadeira, Correia do trator","un"],
  "Material de construção":["Ex: Cimento 50 kg, Tábua para curral","un"]
};
function exemploInsumo(g,cat){const e=EXEMPLO_INSUMO[cat];if(e)return e;return g==="manutencao"?["Ex: Lona, Mangueira, Cadeado","un"]:["Ex: Brinco de identificação, Agulhas","un"];}
async function listaMedicamentos(){
  return (await getAll("insumos")).filter(ehMedicamentoEstoque).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
}
const optMedicamentos=(meds,sel)=>meds.map(m=>`<option value="${m.id}" ${m.id===sel?"selected":""}>${esc(m.nome)}${m.marca?` · ${esc(m.marca)}`:""} — estoque ${numFmt(m.saldo||0)} ${esc(m.unidade||"un")}</option>`).join("");
function semMedicamentoHtml(titulo){
  return `<h2>${titulo}</h2>
    <div class="meta">Nenhum medicamento ou vacina no estoque ainda. Cadastre o produto no Estoque de Insumos para registrar a aplicação.</div>
    <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="formNovoInsumo('gado',null,'Medicamento')">Cadastrar no estoque</button></div>`;
}
// Migração: cada medicamento antigo vira item do estoque (mesmo id, para o histórico continuar ligado)
async function migrarMedicamentosParaEstoque(){
  try{
    const meds=await getAll("medicamentos");if(!meds.length)return;
    const insumos=await getAll("insumos");
    const catDe=t=>({"Vacina":"Vacina","Vermífugo":"Vermífugo","Vitamina/Mineral":"Vitamina","Hormônio":"Hormônio"})[t]||"Medicamento";
    const chave=x=>String(x||"").trim().toLowerCase();
    let eventos=null;
    for(const m of meds){
      if(insumos.some(i=>i.id===m.id||(i.medicamentosOrigem||[]).includes(m.id)))continue;
      const igual=insumos.find(i=>(i.grupo||"gado")==="gado"&&chave(i.nome)===chave(m.nome));
      if(igual){ // já existe no estoque com o mesmo nome: junta os dados e religa o histórico
        igual.fabricante=igual.fabricante||m.fabricante||"";igual.marca=igual.marca||m.marca||"";
        igual.obs=igual.obs||m.obs||"";if(!CAT_MED_ESTOQUE.includes(igual.categoria))igual.categoria=catDe(m.tipo);
        if(igual.categoria==="Medicamento"&&!igual.tipoMed&&TIPOS_MEDICAMENTO.includes(m.tipo))igual.tipoMed=m.tipo;
        igual.medicamentosOrigem=[...(igual.medicamentosOrigem||[]),m.id];
        await put("insumos",igual);
        eventos=eventos||await getAll("eventos");
        for(const e of eventos.filter(e=>e.medicamentoId===m.id)){e.medicamentoId=igual.id;await put("eventos",e);}
      }else{
        const cat=catDe(m.tipo);
        const novo={id:m.id,nome:m.nome||"Medicamento",grupo:"gado",categoria:cat,unidade:cat==="Vacina"||cat==="Hormônio"?"dose":"mL",
          saldo:0,custoMedio:0,fabricante:m.fabricante||"",marca:m.marca||"",obs:m.obs||"",
          tipoMed:cat==="Medicamento"&&TIPOS_MEDICAMENTO.includes(m.tipo)?m.tipo:"",criadoEm:Date.now(),migradoDeMedicamento:true};
        await put("insumos",novo);insumos.push(novo);
      }
    }
  }catch(e){console.error("Migração de medicamentos V142:",e);}
}
const svgMacho=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2f7bef" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.5" cy="14.5" r="6"/><line x1="13.8" y1="10.2" x2="20" y2="4"/><polyline points="14.5 4 20 4 20 9.5"/></svg>`;
const svgFemea=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e24fa0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8.5" y1="18.5" x2="15.5" y2="18.5"/></svg>`;
const sexoChip=s=>s==="F"?`<span class="chip chip-f">${svgFemea}</span>`:`<span class="chip chip-m">${svgMacho}</span>`;
const COW=`<svg class="cattle" viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M96 224c0-53 43-96 96-96h256c53 0 96 43 96 96v32c0 71-57 128-128 128H224c-71 0-128-57-128-128v-32zm40-140c-8-20-30-52-70-52-6 0-10 6-8 12 8 26 30 52 60 60 9 3 21-11 18-20zm368 0c-3 9 9 23 18 20 30-8 52-34 60-60 2-6-2-12-8-12-40 0-62 32-70 52zM240 300a20 20 0 100-40 20 20 0 000 40zm160 0a20 20 0 100-40 20 20 0 000 40z"/></svg>`;

/* Carrega tudo de uma vez e monta em memória */
async function tudo(){
  const [propriedades,marcas,lotes,animais,eventos,insumosTodos,pastos,grupos,grupo_animais]=await Promise.all(
    ["propriedades","marcas","lotes","animais","eventos","insumos","pastos","grupos","grupo_animais"].map(getAll));
  // V142: medicamentos e vacinas = itens do estoque (Insumos do gado)
  const medicamentos=insumosTodos.filter(ehMedicamentoEstoque).sort((a,b)=>String(a.nome).localeCompare(String(b.nome)));
  _animaisPorId=new Map(animais.map(a=>[a.id,a])); // V125
  return {propriedades,marcas,lotes,animais,eventos,medicamentos,pastos,grupos,grupo_animais};
}
// V125: identificação da mãe — nome; se não tiver, brinco; se não tiver, o código (#001)
let _animaisPorId=new Map();
const nomeMae=m=>m?(m.nome||m.brinco||codAnimal(m)):"";
function maeTexto(a){
  if(!a||a.nascidoNaPropriedade!==true)return "";
  const m=a.maeId?_animaisPorId.get(a.maeId):null;
  return m?nomeMae(m):"não informada";
}
const propDoAnimal=(a,lotes)=>{const l=lotes.find(x=>x.id===a.loteAtualId);return l?l.propriedadeId:null;};
