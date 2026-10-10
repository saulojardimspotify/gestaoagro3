/* Gestão do Rebanho — js/app/04-interface-base.js
   Janela (modal), ícones SVG e navegação do menu inferior.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= AÇÕES ======================= */
async function registrarEvento(animalId,tipo,data,detalhes,extra){
  const a=await get("animais",animalId);
  const ev=Object.assign({id:uid(),animalId,tipo,data:data||hoje(),detalhes:detalhes||"",criadoEm:Date.now()}, extra||{});
  await put("eventos",ev);
  if(a&&(tipo==="Morte"||tipo==="Venda")){a.status=tipo==="Morte"?"Morto":"Vendido";await put("animais",a);}
}
async function excluirEvento(eventoId,animalId){
  if(!confirm("Excluir este registro do histórico?"))return;
  const ev=await get("eventos",eventoId);
  await del("eventos",eventoId);
  // se era registro de saída (morte/venda) e não sobrou outro, reativa o animal
  if(ev&&(ev.tipo==="Morte"||ev.tipo==="Venda")){
    const restantes=(await getAll("eventos")).filter(e=>e.animalId===animalId&&(e.tipo==="Morte"||e.tipo==="Venda"));
    if(!restantes.length){const a=await get("animais",animalId);if(a){a.status="Ativo";delete a.saida;await put("animais",a);}}
  }
  verAnimal(animalId);
}
async function moverAnimal(id,novoLote){
  const a=await get("animais",id),de=await get("lotes",a.loteAtualId),para=await get("lotes",novoLote);
  a.loteAtualId=novoLote;await put("animais",a);
  await registrarEvento(id,"Movimentação",hoje(),`De "${de?de.nome:"—"}" para "${para?para.nome:"—"}"`);
}

/* ======================= ÍCONES (V136) ======================= */
/* Conjunto único de ícones de traço, desenhados aqui (não dependem de emoji do aparelho). */
const ICONES={
  casa:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  boi:'<path d="M3 5c.5 3 2.5 4.5 5.5 4.5M21 5c-.5 3-2.5 4.5-5.5 4.5"/><path d="M8.5 9.5h7l-.8 7.2a2.8 2.8 0 0 1-2.7 2.3 2.8 2.8 0 0 1-2.7-2.3z"/><path d="M8.5 11 5.5 12M15.5 11l3 1"/><circle cx="10.8" cy="16.6" r=".5" fill="currentColor"/><circle cx="13.2" cy="16.6" r=".5" fill="currentColor"/>',
  carteira:'<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 7l11-3v3"/><path d="M20 12h-4a1.5 1.5 0 0 0 0 3h4"/>',
  pessoa:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/>',
  pessoas:'<circle cx="9" cy="8" r="3.3"/><path d="M2.8 19.5c.9-3.2 3.3-4.7 6.2-4.7s5.3 1.5 6.2 4.7"/><path d="M15.5 4.9a3.3 3.3 0 0 1 0 6.3M17.6 14.9c1.8.6 3 2 3.6 4.6"/>',
  etiqueta:'<path d="M3.5 12.5V5a1.5 1.5 0 0 1 1.5-1.5h7.5l8 8-9 9-8-8z"/><circle cx="8" cy="8" r="1.4"/>',
  seringa:'<path d="m18 2 4 4M20 4l-4.5 4.5M17 7l-9.5 9.5-3-3L14 4M9.5 7.5l2 2M7 10l2 2M4.5 13.5l-2.5 2.5v2h2l2.5-2.5"/>',
  cerca:'<path d="M5 20V6l1.5-2L8 6v14M12 20V6l1.5-2L15 6v14M19 20V6"/><path d="M2 9h20M2 15h20"/>',
  pasto:'<path d="M3 20h18"/><path d="M7 20c0-4-2-7-4-8M7 20c0-5 2-9 5-10M12 20c0-6 1-10 4-12M17 20c0-4 2-6 4-7"/>',
  caixa:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  sino:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  calc:'<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  grafico:'<path d="M3 20h18M6 16v-4M11 16V8M16 16v-6M21 16V5"/>',
  lapis:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  doc:'<path d="M6 2.5h8l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V4"/><path d="M14 2.5v5h5M9 13h6M9 17h4"/>',
  engr:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  grade:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  setas:'<path d="M4 8h14M14 4l4 4-4 4"/><path d="M20 16H6M10 12l-4 4 4 4"/>',
  ferro:'<path d="M3 21l8-8"/><rect x="11" y="4" width="9" height="9" rx="1.5" transform="rotate(45 15.5 8.5)"/><path d="M13.5 8.5h4"/>',
  tesoura:'<circle cx="6" cy="6.5" r="2.8"/><circle cx="6" cy="17.5" r="2.8"/><path d="M8.3 8.2 20 18M8.3 15.8 20 6"/>',
  livro:'<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 7h7"/>',
  celular:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path d="M11 18h2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  camera:'<path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
  chave:'<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5l2.5 2.5 2-2z"/><path d="M3 21l6-6"/>',
  cadeado:'<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/>'
};
function ico(n){const d=ICONES[n];return d?`<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`:"";}
/* Títulos de seção criados por vários arquivos ainda usam emoji: troca pelo ícone equivalente. */
const ICONE_DE_EMOJI={"⌂":"casa","🏡":"casa","🐄":"boi","💾":"pessoa","ℹ️":"info","ℹ":"info","🔐":"cadeado","↩":"etiqueta","🏷️":"ferro","🏷":"ferro","▤":"cerca","🏠":"casa","▦":"grade","🌱":"pasto","🔔":"sino","💰":"carteira","📦":"caixa","👥":"pessoas","☑":"seringa","🗂":"doc","💊":"seringa","↷":"setas","↩️":"etiqueta","🧮":"calc","📒":"livro","📲":"celular","🍼":"boi"};
function aplicarIcones(raiz){
  (raiz||document).querySelectorAll("[data-ico]:not([data-ico-ok])").forEach(el=>{el.innerHTML=ico(el.dataset.ico);el.setAttribute("data-ico-ok","1");});
  (raiz||document).querySelectorAll(".sechead .sic,.sheet-item .si").forEach(el=>{const n=ICONE_DE_EMOJI[el.textContent.trim()];if(n)el.innerHTML=ico(n);});
}
["tela","md"].forEach(id=>{const el=document.getElementById(id);new MutationObserver(()=>aplicarIcones(el)).observe(el,{childList:true,subtree:true});});
aplicarIcones(document);

/* ======================= NAV ======================= */
const $t=document.getElementById("tela"); let aba="inicio"; let _perfilFoto=""; let _animalFoto=""; let _editPastos=false; let _editNasc=false; let _finAno=null; let _finProp=""; let _finFiltro="todos"; let _lembreteOculto=false;
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  aba=b.dataset.aba;
  document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("ativo",x===b));
  renderSeguro();
});
function topoPagina(){/* a rolagem pro topo agora acontece quando a nova tela aparece (ver listener abaixo) */}
// Ao inserir a nova tela, o fade dispara 'animationstart' -> rolamos pro topo já com o conteúdo novo
document.getElementById("tela").addEventListener("animationstart",e=>{
  if(e.animationName==="telaIn")window.scrollTo({top:_rolarPara||0,left:0,behavior:"auto"});
});
/* V140: o "Voltar" da ficha do animal retorna à tela de onde ela foi aberta
   (lista de Animais com o mesmo filtro/busca e posição, lote ou vendidos/baixados). */
let _rolarPara=0,_origemFicha=null;
function registrarOrigemFicha(){
  if(document.querySelector("#tela [data-ficha-animal]"))return; // já está numa ficha: mantém a origem
  const y=window.scrollY||document.documentElement.scrollTop||0;
  const v=id=>(document.getElementById(id)||{}).value||"";
  if(document.getElementById("f_tipo")&&document.getElementById("lista")){
    _origemFicha={tipo:"animais",y,busca:v("busca"),ftipo:v("f_tipo"),fcrit:v("f_criterio")};return;
  }
  const m=document.querySelector("#tela [data-lista]");
  if(m){const [tipo,id]=m.dataset.lista.split(":");_origemFicha={tipo,id,y};return;}
  _origemFicha={tipo:"animais",y:0};
}
async function voltarDaFicha(){
  const o=_origemFicha||{tipo:"animais",y:0};_origemFicha=null;
  _rolarPara=o.y||0;setTimeout(()=>{_rolarPara=0;},600);
  if(o.tipo==="lote"&&o.id&&await get("lotes",o.id))return verLote(o.id);
  if(o.tipo==="baixados"&&typeof telaAnimaisBaixados==="function")return telaAnimaisBaixados();
  if(await exigirCadastroInicial())return;
  aba="painel";marcarNav("painel");
  await telaAnimais();
  if(o.ftipo){const t=document.getElementById("f_tipo");if(t){t.value=o.ftipo;atualizarCriterioFiltroAnimais();
    const c=document.getElementById("f_criterio");if(c&&o.fcrit)c.value=o.fcrit;}}
  if(o.busca){const b=document.getElementById("busca");if(b)b.value=o.busca;}
  if(o.ftipo||o.busca)filtrarAnimais();
  if(_rolarPara)requestAnimationFrame(()=>window.scrollTo(0,_rolarPara));
}
function irAba(a){aba=a;document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("ativo",x.dataset.aba===a));renderSeguro();}
async function render(){
  topoPagina();
  $t.dataset.syncScreen="";
  const user=await authUser();
  if(!user){document.body.classList.add("deslogado");return telaBloqueada();}
  document.body.classList.remove("deslogado");
  if(aba==="perfil")return telaPerfil();
  // V126: conta sem cadastro básico vai para o passo a passo "Primeiros passos"
  const pend=await pendenciasIniciais();
  if(pend)return telaPrimeirosPassos(pend);
  if(aba==="financeiro")return menuFinanceiro();
  return ({inicio:telaInicio,painel:telaPainel,lotes:telaLotes,animais:telaAnimais}[aba]||telaInicio)();
}
async function renderSeguro(){
  try{
    return await render();
  }catch(e){
    console.error("Falha ao renderizar a tela:",e);
    $t.innerHTML=`<div style="padding-top:18px">
      <div class="card">
        <div class="ti" style="color:var(--verde-esc)">Não foi possível carregar esta tela</div>
        <div class="meta" style="margin-top:8px">Seus dados locais continuam preservados. Tente carregar novamente.</div>
        <button class="btn" style="margin-top:16px" onclick="renderSeguro()">Tentar novamente</button>
      </div>
    </div>`;
  }
}
async function telaBloqueada(){
  topoPagina();
  document.body.classList.add("deslogado");
  $t.innerHTML=`<div style="min-height:calc(100vh - 40px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 18px">
    <div style="width:112px;height:112px;border-radius:28px;background:#fff;border:1px solid var(--linha);box-shadow:0 2px 10px rgba(0,0,0,.06);margin-bottom:18px;overflow:hidden">
      <img src="img/icon.png" alt="" style="width:100%;height:100%;object-fit:cover;display:block">
    </div>
    <div style="font-size:26px;font-weight:800;color:var(--verde-esc)">Gestão do Rebanho</div>
    <div class="meta" style="margin:10px auto 26px;max-width:360px;line-height:1.5">
      Entre com sua conta para acessar o rebanho. Seus dados ficam vinculados ao seu login e podem ser usados em mais de um aparelho.
    </div>
    <button class="btn" style="max-width:360px;margin:0 auto" onclick="formLoginCloud()">Entrar / criar conta</button>
    <div class="cloud-note" style="margin-top:16px;max-width:360px">Depois do primeiro login, o app continua funcionando offline neste aparelho.</div>
    ${appInstalado()?"":`<button class="btn-fant" style="margin-top:14px;color:var(--verde);font-weight:700" onclick="telaInstalar()">📲 Como instalar o app no celular</button>`}
  </div>`;
}
function voltar(){renderSeguro();}
