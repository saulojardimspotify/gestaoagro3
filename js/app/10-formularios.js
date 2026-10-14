/* Gestão do Rebanho — js/app/10-formularios.js
   Formulários de cadastro (propriedade, marca, lote).
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= FORMULÁRIOS ======================= */
const $ov=document.getElementById("ov"),$md=document.getElementById("md");
// V135: trava a página de fundo enquanto a janela está aberta (no iPhone o dedo rolava a página de trás)
let _scrollAntesModal=null;
function travarFundo(){
  if(_scrollAntesModal!==null)return;
  _scrollAntesModal=window.scrollY||document.documentElement.scrollTop||0;
  document.body.style.top=`-${_scrollAntesModal}px`;
  document.body.classList.add("modal-aberto");
}
function soltarFundo(){
  if(_scrollAntesModal===null)return;
  const y=_scrollAntesModal;_scrollAntesModal=null;
  document.body.classList.remove("modal-aberto");document.body.style.top="";
  window.scrollTo(0,y);
}
function abrir(h){$md.innerHTML=h;$ov.classList.add("on");$md.scrollTop=0;travarFundo();}
function fechar(){$ov.classList.remove("on");soltarFundo();}
$ov.onclick=e=>{if(e.target===$ov)fechar();};

async function menuConfig(){
  const user=await authUser();
  if(!user){
    abrir(`<h2>Menu</h2>
      <div class="sheet-item rt" onclick="fechar();formLoginCloud()"><span class="si">🔐</span>Entrar / criar conta<span class="chev" style="margin-left:auto;color:var(--verde)">›</span></div>
      <div class="sheet-item rt" onclick="telaInstalar()"><span class="si">📲</span>Instalar o app</div>
      <div class="sheet-item rt" onclick="sobreApp()"><span class="si">ℹ️</span>Sobre o app</div>
      <button class="btn btn-sec" style="margin-top:14px" onclick="fechar()">Fechar</button>`);
    return;
  }
  abrir(`<h2>Menu</h2>
    <div class="sheet-item rt" onclick="fechar();irAba('inicio')"><span class="si">⌂</span>Início</div>
    <div class="sheet-item rt" onclick="fechar();abrirOperacional()"><span class="si">🐄</span>Gestão operacional</div>
    <div class="sheet-item rt" onclick="menuFinanceiro()"><span class="si">💰</span>Gestão financeira</div>
    <div class="sheet-item rt" onclick="fechar();irAba('analise')"><span class="si" data-ico="grafico"></span>Análise zootécnica</div>
    <div class="sheet-item rt" onclick="fechar();abrirPerfil()"><span class="si" data-ico="pessoa"></span>Meu perfil, propriedades e marcas</div>
    <div class="sheet-item rt" onclick="telaInstalar()"><span class="si">📲</span>Instalar o app</div>
    <div class="sheet-item rt" onclick="sobreApp()"><span class="si">ℹ️</span>Sobre o app</div>
    <button class="btn btn-sec" style="margin-top:14px" onclick="fechar()">Fechar</button>`);
}
function sobreApp(){abrir(`<h2>Gestão do Rebanho</h2>
  <div class="meta">Controle de rebanho por lote e grupos — vacinação, manejo, nascimentos, saídas e histórico por animal.</div>
  <div class="meta" style="margin-top:8px">Funciona offline. Os dados ficam guardados neste aparelho — lembre de fazer a cópia de segurança em Perfil (foto no canto de cima).</div>
  <button class="btn" style="margin-top:16px" onclick="fechar()">Fechar</button>`);}


async function menuFinanceiro(){
  if(!(await podeUsarApp("Acessar gestão financeira")))return;
  if(await exigirCadastroInicial()){fechar();return;}
  fechar();
  aba="financeiro";
  marcarNav("financeiro");
  _finAno=String(new Date().getFullYear());_finProp="";_finFiltro="todos";finResumo();
}
