/* V116 — busca/filtros no Livro Diário + identificação da versão na página inicial. */
(()=>{
  // V124: a versão vem do sw.js (APP_VERSION), que injeta os scripts como arquivo.js?v=NNN.
  // Assim o número mostrado na tela inicial nunca fica desatualizado.
  // V154: sem o ?v (primeira abertura, antes do service worker), lê o número direto do sw.js.
  let APP_VERSAO=(()=>{try{const v=new URL(document.currentScript.src).searchParams.get('v');if(v)return v;}catch(_){}return '';})();
  window.APP_VERSAO=APP_VERSAO;
  if(!APP_VERSAO)fetch('sw.js',{cache:'no-store'}).then(r=>r.text()).then(t=>{const m=t.match(/APP_VERSION\s*=\s*"(\d+)"/);
    if(m){APP_VERSAO=m[1];window.APP_VERSAO=APP_VERSAO;const el=document.getElementById('app-versao');if(el)el.textContent=`Versão ${APP_VERSAO}`;}}).catch(()=>{});
  let busca='';
  let tipo='todos';

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function classificar(txt){
    const t=norm(txt);
    if(t.includes('estorno'))return 'estorno';
    if(t.startsWith('pagamento ·')||t.startsWith('recebimento ·')||t.includes('pagamento · ')||t.includes('recebimento · '))return 'liquidacao';
    if(t.includes('compra de animal'))return 'compra_animal';
    if(t.includes('nascimento'))return 'nascimento';
    if(t.includes('compra de insumo'))return 'compra_insumo';
    if(t.includes('ganho realizado'))return 'ganho';
    if(t.includes('cpv'))return 'cpv';
    if(t.includes('receita'))return 'receita';
    if(t.includes('investimento'))return 'investimento';
    if(t.includes('despesa')||t.includes('custo de producao')||t.includes('custo / despesa'))return 'despesa';
    return 'outros';
  }
  function aplicarFiltros(){
    const area=document.getElementById('hc-resultados');if(!area)return;
    const q=norm(busca);let visiveis=0;const cards=[...area.querySelectorAll('.card')];
    cards.forEach(card=>{const txt=card.textContent||'';const ok=(!q||norm(txt).includes(q))&&(tipo==='todos'||classificar(txt)===tipo);card.style.display=ok?'':'none';if(ok)visiveis++;});
    let vazio=document.getElementById('hc-sem-resultado');
    if(!vazio){vazio=document.createElement('div');vazio.id='hc-sem-resultado';vazio.className='vazio';vazio.innerHTML='<div class="big">🔎</div><b>Nenhum lançamento encontrado</b><div class="meta">Tente alterar a busca ou o tipo de lançamento.</div>';area.appendChild(vazio);}
    vazio.style.display=(cards.length&&visiveis===0)?'':'none';
    const n=document.getElementById('hc-contagem');if(n)n.textContent=`${visiveis} lançamento${visiveis===1?'':'s'} encontrado${visiveis===1?'':'s'}`;
  }
  window.hcBuscar=v=>{busca=v||'';aplicarFiltros();};
  window.hcFiltrarTipo=v=>{tipo=v||'todos';aplicarFiltros();};
  window.hcLimpar=()=>{busca='';tipo='todos';const b=document.getElementById('hc-busca'),f=document.getElementById('hc-tipo');if(b)b.value='';if(f)f.value='todos';aplicarFiltros();};

  const hist0=window.finHistoricoContabil;
  if(typeof hist0==='function')window.finHistoricoContabil=async function(){
    const r=await hist0.apply(this,arguments);
    try{
      const seletores=$t.querySelector('.lado');
      if(seletores&&!document.getElementById('hc-filtros')){
        const box=document.createElement('div');box.id='hc-filtros';
        box.innerHTML=`
          <div style="margin:0 0 10px"><div style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none">🔎</span>
            <input id="hc-busca" type="search" value="${esc(busca)}" placeholder="Buscar lançamento, conta, valor..." oninput="hcBuscar(this.value)" style="width:100%;padding:13px 42px 13px 44px;border:1.5px solid var(--linha);border-radius:14px;background:#fff;font:inherit;color:var(--texto)">
            <button type="button" onclick="hcLimpar()" aria-label="Limpar busca" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;color:var(--muted);font-size:19px;padding:7px">×</button>
          </div></div>
          <div class="lado" style="margin-bottom:7px">
            <select id="hc-tipo" onchange="hcFiltrarTipo(this.value)" style="width:100%">
              <option value="todos" ${tipo==='todos'?'selected':''}>Todos os tipos</option>
              <option value="compra_animal" ${tipo==='compra_animal'?'selected':''}>Compra de animais</option>
              <option value="nascimento" ${tipo==='nascimento'?'selected':''}>Nascimentos</option>
              <option value="receita" ${tipo==='receita'?'selected':''}>Receitas / vendas</option>
              <option value="cpv" ${tipo==='cpv'?'selected':''}>CPV</option>
              <option value="ganho" ${tipo==='ganho'?'selected':''}>Ganho realizado</option>
              <option value="despesa" ${tipo==='despesa'?'selected':''}>Custos / despesas</option>
              <option value="investimento" ${tipo==='investimento'?'selected':''}>Investimentos</option>
              <option value="compra_insumo" ${tipo==='compra_insumo'?'selected':''}>Compra de insumos</option>
              <option value="liquidacao" ${tipo==='liquidacao'?'selected':''}>Pagamentos / recebimentos</option><option value="estorno" ${tipo==='estorno'?'selected':''}>Estornos</option><option value="outros" ${tipo==='outros'?'selected':''}>Outros</option>
            </select>
            <button type="button" onclick="hcLimpar()" style="max-width:105px;background:#fff;color:var(--verde-esc);border:1.5px solid var(--linha);border-radius:12px;padding:10px 12px;font-weight:700">Limpar</button>
          </div>
          <div id="hc-contagem" class="meta" style="margin:0 4px 12px"></div>`;
        seletores.insertAdjacentElement('afterend',box);
        const area=document.createElement('div');area.id='hc-resultados';let n=box.nextElementSibling;
        while(n){const prox=n.nextElementSibling;area.appendChild(n);n=prox;}box.insertAdjacentElement('afterend',area);aplicarFiltros();
      }
    }catch(e){console.error('Busca histórico contábil V116:',e);}return r;
  };

  function inserirVersao(){
    try{
      if(!$t||!$t.querySelector('.home-greet')||document.getElementById('app-versao'))return;
      const v=document.createElement('div');v.id='app-versao';v.textContent=APP_VERSAO?`Versão ${APP_VERSAO}`:'';
      v.style.cssText='text-align:center;color:var(--muted);font-size:12px;margin:22px 0 8px;opacity:.8;';$t.appendChild(v);
    }catch(e){console.error('Versão V116:',e);}
  }
  const inicio0=window.telaInicio;
  if(typeof inicio0==='function')window.telaInicio=async function(){const r=await inicio0.apply(this,arguments);inserirVersao();return r;};
  setTimeout(inserirVersao,300);setTimeout(inserirVersao,1000);
})();