/* V114 — cálculo financeiro da compra no cadastro de novo animal.
   Usa exatamente a mesma regra da venda para 1 animal:
   Y = PB/2 - PB*0.5*(desc/15); tara@ = taraKg/15; líquido@ = Y/15 - tara@; valor = líquido@ * preço/@. */
(()=>{
  const form0=window.formNovoAnimal, salvar0=window.salvarAnimal;
  const n=id=>{const e=document.getElementById(id);if(!e)return null;let s=(e.value||'').trim().replace(/\s/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');const x=Number(s);return Number.isFinite(x)?x:null};
  const f=x=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(x||0));
  const calcCompra=()=>{
    const PB=n('a_pesocompra'),desc=n('ac_desc_arroba'),tara=n('ac_tara'),preco=n('ac_preco_arroba');
    if([PB,desc,tara,preco].some(x=>x==null)||PB<0||desc<0||tara<0||preco<0)return null;
    if(window.calcularNegociacaoValores)return calcularNegociacaoValores(PB,desc,tara,preco,1);
    const Y=(PB/2)-(PB*.5*(desc/15)),taraArroba=tara/15,liqArroba=(Y/15)-taraArroba,liqKg=liqArroba*15;
    return {pesoLiquidoArroba:liqArroba,pesoLiquidoKg:liqKg,valorTotal:liqArroba*preco,pesoMedioArroba:liqArroba,pesoMedioKg:liqKg};
  };
  window.calcularCompraAnimalV114=()=>{
    const c=calcCompra(),r=document.getElementById('ac_resultado'),p=document.getElementById('a_precocompra');
    if(!r)return c;
    if(!c){r.innerHTML='<div class="meta">Preencha peso bruto, desconto por arroba, tara e preço/@ para calcular.</div>';if(p)p.value='';return null;}
    if(p)p.value=c.valorTotal.toFixed(2).replace('.',',');
    r.innerHTML=`<div class="meta">Valor financeiro da compra</div><div style="font-size:22px;font-weight:800;color:var(--verde);margin:2px 0 8px">${moeda(c.valorTotal)}</div><div class="meta">Peso líquido: <b>${f(c.pesoLiquidoArroba)} @</b> · ${f(c.pesoLiquidoKg)} kg</div><div class="meta">Peso médio: <b>${f(c.pesoMedioArroba)} @</b> · ${f(c.pesoMedioKg)} kg/animal</div>`;
    return c;
  };
  window.formNovoAnimal=async function(loteFixo,nascimento){
    const r=await form0.apply(this,arguments);
    if(nascimento)return r;
    const grp=document.getElementById('grp_compra');if(!grp)return r;
    grp.innerHTML=`
      <label>Data da compra (aquisição) *</label><input id="ac_data_compra" type="date" value="${hoje()}">
      <label>Peso bruto (kg vivo) *</label><input id="a_pesocompra" inputmode="decimal" placeholder="Ex: 470">
      <div class="lado"><div><label>Desconto por arroba (kg) *</label><input id="ac_desc_arroba" inputmode="decimal" placeholder="Ex: 1"></div><div><label>Tara (kg) *</label><input id="ac_tara" inputmode="decimal" placeholder="Ex: 4"></div></div>
      <label>Preço da arroba (R$/@) *</label><input id="ac_preco_arroba" inputmode="decimal" placeholder="Ex: 300">
      <input id="a_precocompra" type="hidden">
      <div id="ac_resultado" class="card" style="margin-top:12px;padding:14px"><div class="meta">Preencha peso bruto, desconto por arroba, tara e preço/@ para calcular.</div></div>`;
    ['a_pesocompra','ac_desc_arroba','ac_tara','ac_preco_arroba'].forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener('input',calcularCompraAnimalV114)});
    return r;
  };
  window.salvarAnimal=async function(nascimento){
    const nasceu=nascimento||((document.getElementById('a_nasceu')||{}).value==='sim');
    if(nasceu)return salvar0.apply(this,arguments);
    const c=calcularCompraAnimalV114();
    if(!c)return alert('Preencha peso bruto, desconto por arroba, tara e preço da arroba para calcular o valor da compra.');
    const dataCompra=(document.getElementById('ac_data_compra')||{}).value||'';
    if(!dataCompra)return alert('Informe a data da compra.');
    if(dataCompra>hoje())return alert('A data da compra não pode ser no futuro.');
    const extra={dataCompra,pesoBrutoCompraKg:n('a_pesocompra'),descontoArrobaCompraKg:n('ac_desc_arroba'),taraCompraKg:n('ac_tara'),precoArrobaCompra:n('ac_preco_arroba'),pesoLiquidoCompraKg:c.pesoLiquidoKg,pesoLiquidoCompraArroba:c.pesoLiquidoArroba,valorCompraCalculado:c.valorTotal};
    const antes=new Set((await getAll('animais')).map(a=>a.id));
    const r=await salvar0.apply(this,arguments);
    const novo=(await getAll('animais')).filter(a=>!antes.has(a.id)).sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0))[0];
    if(novo){Object.assign(novo,extra);novo.pesoCompraKg=extra.pesoBrutoCompraKg;novo.custoEstoque=extra.valorCompraCalculado;await put('animais',novo);}
    return r;
  };
})();
