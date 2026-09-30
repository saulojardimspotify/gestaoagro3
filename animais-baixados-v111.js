/* V111 — animais baixados ficam fora da lista ativa e em página própria. */
(()=>{
const telaAnimaisBase=window.telaAnimais||telaAnimais;

function ativo(a){return !a.status||a.status==='Ativo'}
function dataSaida(a){return (a.saida&&(a.saida.data||a.saida.dataHora||a.saida.criadoEm))||a.saidaEm||a.atualizadoEm||a.criadoEm||''}

window.telaAnimais=async function(){
  await telaAnimaisBase.apply(this,arguments);
  if(typeof _dadosAnimais==='undefined'||!_dadosAnimais)return;

  const todos=_dadosAnimais.animais||[];
  const ativos=todos.filter(ativo);
  const baixados=todos.filter(a=>!ativo(a));
  _dadosAnimais.animais=ativos;

  const novo=[...document.querySelectorAll('button.btn')].find(b=>/novo animal/i.test(b.textContent||''));
  if(novo&&!document.getElementById('btn_animais_baixados')){
    const b=document.createElement('button');
    b.id='btn_animais_baixados';
    b.className='btn btn-sec';
    b.style.marginTop='10px';
    b.innerHTML=`🐂 Animais vendidos / baixados <span style="opacity:.75">(${baixados.length})</span>`;
    b.onclick=()=>telaAnimaisBaixados();
    novo.insertAdjacentElement('afterend',b);
  }

  const ft=document.getElementById('f_tipo');
  if(ft){
    const op=[...ft.options].find(o=>o.value==='status');
    if(op)op.remove();
  }
  if(typeof filtrarAnimais==='function')filtrarAnimais();
};

window.telaAnimaisBaixados=async function(){
  topoPagina();
  const {animais,lotes,marcas}=await tudo();
  const baixados=animais.filter(a=>!ativo(a)).sort((a,b)=>String(dataSaida(b)).localeCompare(String(dataSaida(a)))||((a.codigo||0)-(b.codigo||0)));
  const nomeLote=id=>(lotes.find(l=>l.id===id)||{}).nome||'—';
  const marcaSigla=id=>{const m=marcas.find(x=>x.id===id);return m?(m.sigla||m.nome||''):''};
  for(const a of baixados)a._marcaSigla=marcaSigla(a.marcaId);

  const vendidos=baixados.filter(a=>String(a.status||'').toLowerCase()==='vendido');
  const mortos=baixados.filter(a=>String(a.status||'').toLowerCase()==='morto');
  const outros=baixados.filter(a=>!vendidos.includes(a)&&!mortos.includes(a));
  const cards=arr=>arr.map(a=>linhaAnimal(a,nomeLote(a.loteAtualId),true)).join('');
  const sec=(titulo,arr)=>arr.length?`<div class="h3">${titulo} <span class="meta">(${arr.length})</span></div>${cards(arr)}`:'';

  $t.innerHTML=`
    <button class="voltar" onclick="telaAnimais()">‹ Animais ativos</button>
    <div class="sechead"><span class="sic">↩️</span><h2>Animais vendidos / baixados</h2></div>
    <div class="card" style="background:var(--verde-lite);box-shadow:none">
      <div class="ti">${baixados.length} animal(is) fora do rebanho ativo</div>
      <div class="meta" style="margin-top:4px">Animais vendidos ou mortos permanecem aqui para consulta do histórico, sem aparecer na lista do rebanho atual.</div>
    </div>
    ${baixados.length?`${sec('💰 Vendidos',vendidos)}${sec('☠️ Mortos',mortos)}${sec('📁 Outros baixados',outros)}`:`<div class="vazio"><div class="big">🐂</div><b>Nenhum animal baixado</b><div class="meta">Quando uma venda ou morte for registrada, o animal aparecerá aqui.</div></div>`}`;
};
})();