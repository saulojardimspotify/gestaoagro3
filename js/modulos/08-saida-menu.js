/* V94 — página de entrada do módulo Venda / Morte de Animal com o mesmo padrão visual de Medicamentos. */
(()=>{
  function css(){
    if(document.getElementById('saida-menu-v94-css'))return;
    const s=document.createElement('style');
    s.id='saida-menu-v94-css';
    s.textContent=`
      .saida-v94-acoes{display:flex;flex-direction:column;gap:12px;margin:4px 0 20px}
      .saida-v94-btn{width:100%;min-height:78px;border:1.7px solid var(--verde);border-radius:16px;background:#fff;color:var(--verde-esc);padding:13px 16px;display:flex;align-items:center;gap:13px;text-align:left;cursor:pointer;font:inherit;box-shadow:0 2px 7px rgba(25,80,45,.06)}
      .saida-v94-btn:active{background:var(--verde-lite);transform:scale(.995)}
      .saida-v94-ico{width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:var(--verde-lite);display:flex;align-items:center;justify-content:center;font-size:24px}
      .saida-v94-conteudo{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
      .saida-v94-conteudo strong{font-size:17px;line-height:1.2;color:var(--verde-esc)}
      .saida-v94-conteudo small{font-size:12.5px;line-height:1.3;color:var(--muted);font-weight:500}
      .saida-v94-seta{font-size:28px;line-height:1;color:var(--verde);flex:0 0 auto}
    `;
    document.head.appendChild(s);
  }

  async function iniciarFluxo(tipo){
    // formSaida() reinicia o estado interno do fluxo V92. Em seguida acionamos
    // a opção correspondente já existente, evitando duplicar a lógica da venda/morte.
    await window.formSaida();
    const seletor=tipo==='venda'?'saidaV92Venda':'saidaV92Morte';
    const botao=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes(seletor));
    if(botao)botao.click();
  }

  window.telaVendaMorteAnimal=function(){
    css();
    topoPagina();
    if(typeof marcarNav==='function')marcarNav('painel');
    $t.dataset.syncScreen='venda-morte-animal';
    $t.innerHTML=`
      <button class="voltar" onclick="telaPainel()">‹ Gestão Operacional</button>
      <div class="sechead" style="margin-top:8px"><span class="sic">↩️</span><h2>Venda / Morte de Animal</h2></div>
      <div class="meta" style="font-size:14px;margin:0 4px 18px">Escolha o tipo de saída que deseja registrar.</div>
      <div class="saida-v94-acoes">
        <button class="saida-v94-btn" onclick="abrirVendaV94()">
          <span class="saida-v94-ico">💰</span>
          <span class="saida-v94-conteudo"><strong>Venda de animal</strong><small>Venda individual, vários animais, lote inteiro ou grupo inteiro</small></span>
          <span class="saida-v94-seta">›</span>
        </button>
        <button class="saida-v94-btn" onclick="abrirMorteV94()">
          <span class="saida-v94-ico">✝️</span>
          <span class="saida-v94-conteudo"><strong>Morte de animal</strong><small>Registrar a morte e a causa para um animal</small></span>
          <span class="saida-v94-seta">›</span>
        </button>
      </div>`;
  };

  window.abrirVendaV94=()=>iniciarFluxo('venda');
  window.abrirMorteV94=()=>iniciarFluxo('morte');

  function ajustarCardModulo(){
    const cards=[...document.querySelectorAll('[data-mod-v93="saida"]')];
    cards.forEach(card=>card.setAttribute('onclick','telaVendaMorteAnimal()'));
  }
  const obs=new MutationObserver(ajustarCardModulo);
  obs.observe(document.body,{childList:true,subtree:true});
  ajustarCardModulo();
})();