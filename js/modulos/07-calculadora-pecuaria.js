/* V100 — módulos operacionais + Calculadora da Pecuária com peso médio principal em @ e secundário em kg. */
(()=>{
  const css=document.createElement('style');
  css.textContent=`
    .calc-func-card{background:var(--verde-lite);border-radius:18px;padding:18px;cursor:pointer;position:relative;margin-bottom:14px;min-height:128px}
    .calc-func-card:active{background:var(--verde-lite2)}
    .calc-func-card .cfc-ico{width:50px;height:50px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;box-shadow:var(--sombra);margin-bottom:12px}
    .calc-func-card .cfc-t{font-size:18px;font-weight:800;color:var(--verde-esc);padding-right:28px}
    .calc-func-card .cfc-d{font-size:13.5px;color:var(--muted);margin-top:5px;line-height:1.4;padding-right:18px}
    .calc-func-card .cfc-seta{position:absolute;right:18px;top:22px;color:var(--verde);font-size:24px}
    .calc-campos{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .calc-campos .full{grid-column:1/-1}
    .calc-resultados{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
    .calc-res{background:#fff;border:1px solid var(--linha);border-radius:14px;padding:13px}
    .calc-res.full{grid-column:1/-1}
    .calc-res .lbl{font-size:12px;color:var(--muted)}
    .calc-res .val{font-size:20px;font-weight:800;color:var(--verde-esc);margin-top:3px}
    .calc-res .sub{font-size:11.5px;color:var(--muted);margin-top:3px}
    .calc-formula{margin-top:14px;padding:12px 14px;border-radius:13px;background:var(--verde-lite);color:var(--muted);font-size:12px;line-height:1.55}
    @media(max-width:390px){.calc-campos{grid-template-columns:1fr}.calc-campos .full{grid-column:auto}.calc-resultados{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  // V105+: os módulos "Venda/Morte" e "Calculadora" agora ficam direto no
  // index.html, organizados em grupos. A injeção antiga foi desativada para
  // não duplicar os cards nem quebrar o agrupamento.
  function adicionarModulosPainel(){ /* desativado */ }

  const painelOriginal=window.telaPainel;
  if(typeof painelOriginal==='function'){
    window.telaPainel=async function(){const r=await painelOriginal.apply(this,arguments);adicionarModulosPainel();return r;};
  }

  window.telaCalculadoraPecuaria=function(){
    topoPagina();if(typeof marcarNav==='function')marcarNav('painel');$t.dataset.syncScreen='calculadora-pecuaria';
    $t.innerHTML=`<button class="voltar" onclick="telaPainel()">‹ Gestão Operacional</button><div class="sechead"><span class="sic">🧮</span><h2>Calculadora da Pecuária</h2></div><div class="meta" style="font-size:14px;margin:0 4px 18px">Escolha o cálculo que deseja realizar.</div><div class="calc-func-card" onclick="telaCalculadoraNegociacao()"><div class="cfc-ico">💰</div><div class="cfc-t">Valor financeiro de uma negociação</div><div class="cfc-d">Calcule peso líquido, valor total da operação e peso médio por animal.</div><div class="cfc-seta">›</div></div>`;
  };

  function numeroCalc(id){
    const el=document.getElementById(id);if(!el)return null;let s=(el.value||'').trim().replace(/\s/g,'');if(!s)return null;
    if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
    const n=Number(s);return Number.isFinite(n)?n:null;
  }
  const fmt=(n,d=2)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
  const dinheiro=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);

  window.calcularNegociacaoPecuaria=function(){
    const PB=numeroCalc('calc_peso_bruto');
    const W=numeroCalc('calc_desc_arroba');
    const V=numeroCalc('calc_tara');
    const P=numeroCalc('calc_preco_arroba');
    const Q=numeroCalc('calc_qtd_animais');
    const rL=document.getElementById('calc_res_liq'),rM=document.getElementById('calc_res_medio'),rT=document.getElementById('calc_res_total');
    const sL=document.getElementById('calc_res_liq_sub'),sM=document.getElementById('calc_res_medio_sub');
    if([PB,W,V,P,Q].some(v=>v===null)||PB<0||W<0||V<0||P<0||Q<=0){if(rL)rL.textContent='—';if(rM)rM.textContent='—';if(rT)rT.textContent='—';if(sL)sL.textContent='Preencha todos os campos';if(sM)sM.textContent='';return;}

    // Fórmula atualizada: primeiro considera 50% do peso bruto e desconta W kg por arroba.
    // Y = PB/2 - PB*(1/2)*(W/15), em kg.
    const Ykg=(PB/2)-(PB*(1/2)*(W/15));
    const T=(V*Q)/15;
    const L=(Ykg/15)-T;
    const pesoLiquidoKg=L*15;
    const valorTotal=L*P;
    const pesoMedioArroba=L/Q;
    const pesoMedioKg=pesoLiquidoKg/Q;
    rL.textContent=`${fmt(L,2)} @`;
    sL.textContent=`${fmt(pesoLiquidoKg,2)} kg líquidos`;
    rM.textContent=`${fmt(pesoMedioArroba,2)} @`;
    sM.textContent=`${fmt(pesoMedioKg,2)} kg por animal`;
    rT.textContent=dinheiro(valorTotal);
  };

  window.telaCalculadoraNegociacao=function(){
    topoPagina();if(typeof marcarNav==='function')marcarNav('painel');$t.dataset.syncScreen='calculadora-negociacao';
    $t.innerHTML=`
      <button class="voltar" onclick="telaCalculadoraPecuaria()">‹ Calculadora da Pecuária</button>
      <div class="sechead"><span class="sic">💰</span><h2>Valor da negociação</h2></div>
      <div class="card">
        <div class="calc-campos">
          <div class="full"><label>Peso bruto (kg)</label><input id="calc_peso_bruto" inputmode="decimal" placeholder="Ex: 12.500" oninput="calcularNegociacaoPecuaria()"></div>
          <div><label>Desconto por arroba (kg)</label><input id="calc_desc_arroba" inputmode="decimal" placeholder="Ex: 1" oninput="calcularNegociacaoPecuaria()"></div>
          <div><label>Tara por animal (kg)</label><input id="calc_tara" inputmode="decimal" placeholder="Ex: 4" oninput="calcularNegociacaoPecuaria()"></div>
          <div><label>Preço da arroba (R$)</label><input id="calc_preco_arroba" inputmode="decimal" placeholder="Ex: 320" oninput="calcularNegociacaoPecuaria()"></div>
          <div><label>Quantidade de animais</label><input id="calc_qtd_animais" type="number" min="1" inputmode="numeric" placeholder="Ex: 25" oninput="calcularNegociacaoPecuaria()"></div>
        </div>
        <div class="calc-resultados">
          <div class="calc-res"><div class="lbl">Peso líquido</div><div class="val" id="calc_res_liq">—</div><div class="sub" id="calc_res_liq_sub">Preencha todos os campos</div></div>
          <div class="calc-res"><div class="lbl">Peso médio / animal</div><div class="val" id="calc_res_medio">—</div><div class="sub" id="calc_res_medio_sub"></div></div>
          <div class="calc-res full"><div class="lbl">Valor financeiro total da operação</div><div class="val" id="calc_res_total">—</div></div>
        </div>
        <div class="calc-formula"><b>Cálculo:</b> Y = PB/2 − PB × 1/2 × W/15 em kg · T = (V × Q)/15 em @ · L = (Y/15) − T em @ · Valor = L × preço/@</div>
      </div>`;
  };
})();