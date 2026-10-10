/* Gestão do Rebanho — js/app/16-navegacao.js
   Histórico de navegação (V157): o botão "‹ Voltar" de qualquer tela volta para a tela de onde
   a pessoa veio, com os mesmos filtros, busca e posição da rolagem.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html.

   Como funciona
   - Cada função que desenha uma tela inteira (lista TELAS_NAVEGACAO) é "embrulhada" por
     instalarHistoricoNavegacao(), chamada em 99-iniciar.js depois que todos os módulos já
     substituíram suas funções.
   - Quando uma tela nova aparece, a tela anterior vai para a pilha junto com o valor dos campos
     (filtros, busca, seleções) e a rolagem.
   - Botão .voltar: se há tela na pilha, volta para ela; se não há (ex.: entrou pelo menu de baixo),
     faz o que o próprio botão manda (ir para a tela "mãe") e começa uma pilha nova.
   - Menu de baixo e tela Início começam uma pilha nova.
   - Abrir de novo uma tela que já está na pilha (ex.: depois de salvar) volta até ela, sem repetir.
   Para uma tela nova: incluir o nome da função em TELAS_NAVEGACAO e o título em TITULOS_NAVEGACAO. */

const TELAS_NAVEGACAO=[
  "telaInicio","telaPainel","telaAvisos","telaGestaoPasto","verPasto","verPropriedade","telaNascimentosAntiga",
  "telaLotesGrupos","telaLotes","verLote","telaGrupos","verGrupo","telaAnimais","telaAnimaisBaixados","verAnimal",
  "telaManejo","telaMedicamentosManejo","telaTrocaLote","escolherModoTrocaV81","telaDestinoTrocaV81",
  "telaEstoque","telaCalculadoraPecuaria","telaCalculadoraNegociacao","telaCalculadoraEquilibrio","telaVendaMorteAnimal",
  "menuFinanceiro","finResumo","finLancamentos","finRelatorios","finConfig","finHistoricoContabil",
  "telaPerfil","telaInstalar","telaBloqueada","telaPrimeirosPassos"
];
// Telas que são a mesma página (abas do Financeiro): trocar de aba não cria um passo novo.
const GRUPO_NAVEGACAO={menuFinanceiro:"financeiro",finResumo:"financeiro",finLancamentos:"financeiro",finRelatorios:"financeiro",finConfig:"financeiro"};
// Telas que sempre começam uma pilha nova.
const RAIZES_NAVEGACAO=new Set(["telaInicio","telaBloqueada","telaPrimeirosPassos"]);
// Texto do botão "‹ ..." conforme a tela para onde ele vai voltar.
const TITULOS_NAVEGACAO={
  telaInicio:"Início",telaPainel:"Gestão Operacional",telaAvisos:"Avisos",telaGestaoPasto:"Gestão do Pasto",
  verPasto:"Pasto",verPropriedade:"Propriedade",telaNascimentosAntiga:"Nascimentos",
  telaLotesGrupos:"Lotes e Grupos",telaLotes:"Lotes",verLote:"Lote",telaGrupos:"Grupos",verGrupo:"Grupo",
  telaAnimais:"Animais",telaAnimaisBaixados:"Vendidos e mortos",verAnimal:"Animal",
  telaManejo:"Manejo",telaMedicamentosManejo:"Medicamentos",telaTrocaLote:"Trocar de lote",
  escolherModoTrocaV81:"Seleção",telaDestinoTrocaV81:"Destino",telaEstoque:"Estoque",
  telaCalculadoraPecuaria:"Calculadora da Pecuária",telaCalculadoraNegociacao:"Negociação",telaCalculadoraEquilibrio:"Ponto de equilíbrio",
  telaVendaMorteAnimal:"Venda / Morte",menuFinanceiro:"Financeiro",finResumo:"Financeiro",
  finLancamentos:"Lançamentos",finRelatorios:"Relatórios",finConfig:"Configurações",
  finHistoricoContabil:"Livro Diário",telaPerfil:"Perfil",telaInstalar:"Voltar"
};
const LIMITE_PILHA_NAVEGACAO=30;

let _navPilha=[],_navAtual=null,_navProfundidade=0,_navRestaurando=false,_navNovaRaiz=false;

function chaveNavegacao(nome,args){
  if(GRUPO_NAVEGACAO[nome])return GRUPO_NAVEGACAO[nome];
  let a="";try{a=JSON.stringify(args||[]);}catch(_){a=String(args);}
  return nome+"|"+a;
}

/* Guarda o que a pessoa deixou preenchido na tela (filtros, busca, marcações) e a rolagem.
   Campos que gravam dados ao mudar (salvar, foto, importar) não são repetidos na volta. */
function capturarEstadoTela(){
  const campos=[];
  $t.querySelectorAll("input[id],select[id],textarea[id]").forEach(el=>{
    if(["file","password","hidden","button","submit"].includes(el.type))return;
    const acao=(el.getAttribute("onchange")||"")+(el.getAttribute("oninput")||"");
    if(/salvar|importar|foto/i.test(acao))return;
    const marca=el.type==="checkbox"||el.type==="radio";
    campos.push({id:el.id,marca,valor:marca?el.checked:el.value});
  });
  return {y:window.scrollY||document.documentElement.scrollTop||0,campos};
}
async function restaurarEstadoTela(estado){
  if(!estado)return;
  for(const c of estado.campos||[]){
    const el=document.getElementById(c.id);
    if(!el||!$t.contains(el))continue;
    if(c.marca?el.checked===c.valor:el.value===c.valor)continue;
    if(c.marca)el.checked=c.valor;else el.value=c.valor;
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
    await new Promise(r=>setTimeout(r,0)); // deixa o filtro refazer a lista antes do próximo campo
  }
  const y=estado.y||0;
  if(y)requestAnimationFrame(()=>window.scrollTo(0,y));
}

// Ajusta o texto do botão "‹ ..." para a tela para onde ele realmente vai voltar.
function atualizarBotaoVoltar(){
  const ant=_navPilha[_navPilha.length-1];
  if(!ant)return;
  const b=$t.querySelector(".voltar");
  if(b)b.textContent="‹ "+(TITULOS_NAVEGACAO[ant.nome]||"Voltar");
}

function registrarTela(nome,args,estadoDaAnterior){
  const nova={nome,args,aba,chave:chaveNavegacao(nome,args)};
  if(_navRestaurando){_navAtual=nova;return;}
  if(_navNovaRaiz||RAIZES_NAVEGACAO.has(nome)||!_navAtual){
    _navNovaRaiz=false;_navPilha=[];_navAtual=nova;return;
  }
  if(_navAtual.chave!==nova.chave){
    const i=_navPilha.findIndex(e=>e.chave===nova.chave);
    if(i>=0)_navPilha=_navPilha.slice(0,i); // tela que já estava na pilha: volta até ela
    else{
      _navAtual.estado=estadoDaAnterior;_navPilha.push(_navAtual);
      if(_navPilha.length>LIMITE_PILHA_NAVEGACAO)_navPilha.shift();
      // Modo de edição de uma tela não continua ligado depois que a pessoa sai dela.
      _editPastos=false;_editNasc=false;
    }
  }
  _navAtual=nova;
  atualizarBotaoVoltar();
}

async function chamarTela(nome,original,contexto,args){
  if(_navProfundidade>0)return original.apply(contexto,args); // uma tela chamando outra por dentro
  const antes=$t.firstElementChild;
  const estado=capturarEstadoTela();
  _navProfundidade++;
  let r;
  try{r=await original.apply(contexto,args);}finally{_navProfundidade--;}
  if($t.firstElementChild!==antes)registrarTela(nome,args,estado);
  return r;
}

async function navVoltar(){
  const destino=_navPilha.pop();
  if(!destino)return false;
  aba=destino.aba||aba;
  if(typeof marcarNav==="function")marcarNav(aba);
  _rolarPara=(destino.estado&&destino.estado.y)||0;setTimeout(()=>{_rolarPara=0;},600);
  _navRestaurando=true;
  const antes=$t.firstElementChild;
  try{await window[destino.nome](...(destino.args||[]));}
  catch(e){console.error("Voltar: não foi possível reabrir a tela",destino.nome,e);}
  finally{_navRestaurando=false;}
  if($t.firstElementChild===antes){_navPilha=[];_navAtual=null;return renderSeguro();} // tela não existe mais
  _navAtual={...destino,estado:null};
  await restaurarEstadoTela(destino.estado);
  atualizarBotaoVoltar();
  return true;
}

function instalarHistoricoNavegacao(){
  TELAS_NAVEGACAO.forEach(nome=>{
    const original=window[nome];
    if(typeof original!=="function"||original._comHistorico)return;
    const embrulhada=function(...args){return chamarTela(nome,original,this,args);};
    embrulhada._comHistorico=true;
    window[nome]=embrulhada;
  });
  // Botão "‹ Voltar" da tela: usa o histórico antes do comando escrito no próprio botão.
  document.addEventListener("click",e=>{
    const b=e.target.closest("#tela .voltar");
    if(!b)return;
    if(_navPilha.length){e.preventDefault();e.stopImmediatePropagation();navVoltar();}
    else _navNovaRaiz=true; // sem histórico: o botão leva à tela "mãe", que vira o começo da pilha
  },true);
  // Menu de baixo: cada aba começa uma pilha nova.
  document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>{_navNovaRaiz=true;},true));
}
