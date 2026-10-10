/* Gestão do Rebanho — js/modulos/07-calculadora-pecuaria.js
   Calculadora da Pecuária (Gestão Operacional → Recursos e Alertas):
   - Valor financeiro de uma negociação (V100): peso líquido, valor total e peso médio.
   - Ponto de equilíbrio da recria/engorda (V158): dias ou GMD para o boi gordo valer o que custou o bezerro. */
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
    .eq-opcs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .eq-opc{display:block;margin:0;background:#fff;border:1.5px solid var(--linha);border-radius:14px;padding:13px;cursor:pointer;color:var(--texto,#1d2b21)}
    .eq-opc input{display:none}
    .eq-opc .eo-t{font-size:15px;font-weight:800;color:var(--verde-esc)}
    .eq-opc .eo-d{font-size:12px;color:var(--muted);font-weight:500;margin-top:3px;line-height:1.35}
    .eq-opc:has(input:checked){border-color:var(--verde);background:var(--verde-lite)}
    .eq-sub{font-size:13px;font-weight:800;color:var(--verde-esc);margin:18px 0 0}
    .eq-aviso{margin-top:14px;padding:12px 14px;border-radius:13px;background:#FFF6E0;color:#7a5a00;font-size:13px;line-height:1.45}
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
    $t.innerHTML=`<button class="voltar" onclick="telaPainel()">‹ Gestão Operacional</button><div class="sechead"><span class="sic">🧮</span><h2>Calculadora da Pecuária</h2></div><div class="meta" style="font-size:14px;margin:0 4px 18px">Escolha o cálculo que deseja realizar.</div><div class="calc-func-card" onclick="telaCalculadoraNegociacao()"><div class="cfc-ico">💰</div><div class="cfc-t">Valor financeiro de uma negociação</div><div class="cfc-d">Calcule peso líquido, valor total da operação e peso médio por animal.</div><div class="cfc-seta">›</div></div><div class="calc-func-card" onclick="telaCalculadoraEquilibrio()"><div class="cfc-ico">⚖️</div><div class="cfc-t">Ponto de equilíbrio da recria/engorda</div><div class="cfc-d">Dias ou GMD necessários para o boi gordo valer o que custou o bezerro comprado com ágio.</div><div class="cfc-seta">›</div></div>`;
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

  /* ---------- Ponto de equilíbrio da recria/engorda (V158) ----------
     Bezerro comprado com ágio A sobre a @ do boi gordo; boi vendido pela @ do boi gordo.
     arrobas = PB × R × (15 − D) / 225  (mesma regra de rendimento e desconto por @ do app)
     Empate de valor: K = (1 + A) × RC × (15 − DC) / [RV × (15 − DV)]
       n = PBC × (K − 1) / GMD      ou      GMD = PBC × (K − 1) / n
     Com custos (opcional): a = Pv × RV × (15 − DV) / 225 (R$ por kg vivo vendido), c = custo/cab/dia
       n = a × PBC × (K − 1) / (a × GMD − c)      ou      GMD = [a × PBC × (K − 1) + c × n] / (a × n) */
  function ptEquilibrio(d){
    const {PBC,A,RC,RV,DC,DV}=d;
    const K=(1+A)*RC*(15-DC)/(RV*(15-DV));
    const r={K,pesoEmpate:PBC*K,ganhoKg:PBC*(K-1)};
    if(d.modo==='dias'){r.dias=r.ganhoKg/d.GMD;}
    else{r.gmd=r.ganhoKg/d.n;}
    if(d.Pv>0&&d.c>0){
      const a=d.Pv*RV*(15-DV)/225;r.a=a;
      r.valorCompra=d.Pv*(1+A)*PBC*RC*(15-DC)/225;
      if(d.modo==='dias'){const m=a*d.GMD-d.c;r.diasCusto=m>0?a*r.ganhoKg/m:Infinity;}
      else{r.gmdCusto=(a*r.ganhoKg+d.c*d.n)/(a*d.n);}
    }
    return r;
  }
  window.ptEquilibrio=ptEquilibrio;

  window.eqEscolherModo=function(){
    const modo=document.getElementById('eq_modo_gmd')?.checked?'gmd':(document.getElementById('eq_modo_dias')?.checked?'dias':'');
    const campos=document.getElementById('eq_campos');if(!campos)return;
    campos.style.display=modo?'':'none';
    document.getElementById('eq_bloco_gmd').style.display=modo==='dias'?'':'none';
    document.getElementById('eq_bloco_n').style.display=modo==='gmd'?'':'none';
    calcularEquilibrio();
  };

  window.calcularEquilibrio=function(){
    const modo=document.getElementById('eq_modo_gmd')?.checked?'gmd':(document.getElementById('eq_modo_dias')?.checked?'dias':'');
    const out=document.getElementById('eq_resultado');if(!out||!modo)return;
    const pct=id=>{const v=numeroCalc(id);return v===null?null:v/100;};
    const d={modo,PBC:numeroCalc('eq_pbc'),A:pct('eq_agio'),RC:pct('eq_rc'),RV:pct('eq_rv'),DC:numeroCalc('eq_dc')??0,DV:numeroCalc('eq_dv')??0,
      GMD:numeroCalc('eq_gmd'),n:numeroCalc('eq_n'),Pv:numeroCalc('eq_pv'),c:numeroCalc('eq_custo')};
    const falta=d.PBC==null||d.A==null||d.RC==null||d.RV==null||(modo==='dias'?d.GMD==null:d.n==null);
    if(falta){out.innerHTML='<div class="meta">Preencha os campos acima para ver o resultado.</div>';return;}
    if(d.PBC<=0||d.RC<=0||d.RV<=0||d.A<=-1)return void(out.innerHTML='<div class="eq-aviso">Peso e rendimentos precisam ser maiores que zero.</div>');
    if(d.DC<0||d.DV<0||d.DC>=15||d.DV>=15)return void(out.innerHTML='<div class="eq-aviso">O desconto por arroba precisa ficar entre 0 e 15 kg.</div>');
    if(modo==='dias'&&d.GMD<=0)return void(out.innerHTML='<div class="eq-aviso">Informe um GMD maior que zero.</div>');
    if(modo==='gmd'&&d.n<=0)return void(out.innerHTML='<div class="eq-aviso">Informe um número de dias maior que zero.</div>');
    const r=ptEquilibrio(d);
    const arrV=r.pesoEmpate*d.RV*(15-d.DV)/225;
    let principal,sub;
    if(r.K<=1){principal=modo==='dias'?'0 dias':'0 kg/dia';sub='Com esses dados o boi já vale o que custou o bezerro: não há ágio a recuperar.';}
    else if(modo==='dias'){principal=`${fmt(Math.ceil(r.dias),0)} dias`;sub=`≈ ${fmt(r.dias/30.4,1)} meses com GMD de ${fmt(d.GMD,3)} kg/dia`;}
    else{principal=`${fmt(r.gmd,3)} kg/dia`;sub=`para empatar em ${fmt(d.n,0)} dias (≈ ${fmt(d.n/30.4,1)} meses)`;}
    let custo='';
    if(r.a){
      if(modo==='dias')custo=r.diasCusto===Infinity
        ?`<div class="calc-res full"><div class="lbl">Considerando o custo diário</div><div class="val" style="color:var(--perigo)">Não empata</div><div class="sub">Cada kg ganho vale ${dinheiro(r.a)}; com GMD de ${fmt(d.GMD,3)} kg/dia o animal rende ${dinheiro(r.a*d.GMD)}/dia, menos que o custo de ${dinheiro(d.c)}/dia.</div></div>`
        :`<div class="calc-res full"><div class="lbl">Considerando o custo diário de ${dinheiro(d.c)}</div><div class="val">${fmt(Math.ceil(Math.max(r.diasCusto,0)),0)} dias</div><div class="sub">≈ ${fmt(Math.max(r.diasCusto,0)/30.4,1)} meses · valor da compra ${dinheiro(r.valorCompra)} por cabeça</div></div>`;
      else custo=`<div class="calc-res full"><div class="lbl">Considerando o custo diário de ${dinheiro(d.c)}</div><div class="val">${fmt(r.gmdCusto,3)} kg/dia</div><div class="sub">valor da compra ${dinheiro(r.valorCompra)} por cabeça · cada kg ganho vale ${dinheiro(r.a)}</div></div>`;
    }
    out.innerHTML=`<div class="calc-resultados" style="margin-top:0">
      <div class="calc-res full"><div class="lbl">${modo==='dias'?'Dias até o ponto de equilíbrio':'GMD necessário'}</div><div class="val">${principal}</div><div class="sub">${sub}</div></div>
      <div class="calc-res"><div class="lbl">Peso de venda no empate</div><div class="val">${fmt(r.pesoEmpate,1)} kg</div><div class="sub">${fmt(arrV,2)} @ · ganho de ${fmt(Math.max(r.ganhoKg,0),1)} kg</div></div>
      <div class="calc-res"><div class="lbl">Fator K</div><div class="val">${fmt(r.K,4)}</div><div class="sub">peso de venda ÷ peso de compra</div></div>
      ${custo}
    </div>`;
  };

  window.telaCalculadoraEquilibrio=function(){
    topoPagina();if(typeof marcarNav==='function')marcarNav('painel');$t.dataset.syncScreen='calculadora-equilibrio';
    const campo=(id,rot,ph,cls='')=>`<div class="${cls}"><label>${rot}</label><input id="${id}" inputmode="decimal" placeholder="${ph}" oninput="calcularEquilibrio()"></div>`;
    $t.innerHTML=`
      <button class="voltar" onclick="telaCalculadoraPecuaria()">‹ Calculadora da Pecuária</button>
      <div class="sechead"><span class="sic">⚖️</span><h2>Ponto de equilíbrio da recria/engorda</h2></div>
      <div class="meta" style="font-size:14px;margin:0 4px 14px">Bezerro comprado com ágio sobre a arroba do boi gordo: quando o boi gordo passa a valer o que o bezerro custou.</div>
      <div class="card">
        <div class="ti">O que você quer obter?</div>
        <div class="eq-opcs">
          <label class="eq-opc"><input type="radio" name="eq_modo" id="eq_modo_dias" onchange="eqEscolherModo()"><div class="eo-t">Número de dias</div><div class="eo-d">Informo o GMD e quero saber em quantos dias empata.</div></label>
          <label class="eq-opc"><input type="radio" name="eq_modo" id="eq_modo_gmd" onchange="eqEscolherModo()"><div class="eo-t">GMD necessário</div><div class="eo-d">Informo os dias e quero saber quanto o animal precisa ganhar por dia.</div></label>
        </div>
      </div>
      <div id="eq_campos" class="card" style="display:none">
        <div class="calc-campos">
          ${campo('eq_pbc','Peso bruto na compra (kg)','Ex: 200','full')}
          ${campo('eq_agio','Ágio na @ do bezerro (%)','Ex: 20','full')}
          ${campo('eq_rc','Rendimento na compra (%)','Ex: 50')}
          ${campo('eq_rv','Rendimento na venda (%)','Ex: 52')}
          ${campo('eq_dc','Desconto por @ na compra (kg)','Ex: 0')}
          ${campo('eq_dv','Desconto por @ na venda (kg)','Ex: 0')}
          <div id="eq_bloco_gmd" class="full" style="display:none"><label>GMD — ganho médio diário (kg/dia)</label><input id="eq_gmd" inputmode="decimal" placeholder="Ex: 0,600" oninput="calcularEquilibrio()"></div>
          <div id="eq_bloco_n" class="full" style="display:none"><label>Número de dias até a venda</label><input id="eq_n" inputmode="numeric" placeholder="Ex: 90" oninput="calcularEquilibrio()"></div>
        </div>
        <div class="eq-sub">Custos do período (opcional)</div>
        <div class="calc-campos">
          ${campo('eq_pv','Preço da @ do boi gordo (R$)','Ex: 320')}
          ${campo('eq_custo','Custo por cabeça por dia (R$)','Ex: 4,50')}
        </div>
        <div id="eq_resultado" style="margin-top:16px"></div>
        <div class="calc-formula"><b>Cálculo:</b> K = (1 + A) × RC × (15 − DC) / [RV × (15 − DV)] · n = PBC × (K − 1) / GMD · GMD = PBC × (K − 1) / n.
        Considera a mesma @ do boi gordo na compra (com ágio) e na venda. Com custos: a = preço/@ × RV × (15 − DV)/225 (R$ por kg ganho) e n = a × PBC × (K − 1) / (a × GMD − custo diário).</div>
      </div>`;
  };
})();