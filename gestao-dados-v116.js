/* V116 — edição de operações e reinicialização segura dos dados. */
(()=>{
  const TIPO_PC='partida_contabil';
  const f=n=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n||0));
  const n=id=>{const e=document.getElementById(id);if(!e)return null;let s=(e.value||'').trim().replace(/\s/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const v=Number(s);return Number.isFinite(v)?v:null;};
  const valorInput=v=>v==null?'':String(Number(v).toFixed(2)).replace('.',',');

  async function partidasFiltradas(){
    const ano=window._finAno||String(new Date().getFullYear());
    return (await getAll('lancamentos')).filter(x=>x.tipo===TIPO_PC&&!x.deleted_at&&(x.data||'').slice(0,4)===ano&&(!window._finProp||x.propriedadeId===window._finProp))
      .sort((a,b)=>((b.data||'').localeCompare(a.data||''))||((b.criadoEm||0)-(a.criadoEm||0)));
  }

  async function decorarHistorico(){
    const area=document.getElementById('hc-resultados')||$t;
    if(!area)return;
    // V127: o botão usa o id gravado no próprio cartão (antes casava por posição com a lista do
    // ano atual, e na tela de outro ano só o 1º cartão ganhava botão — apontando para a operação errada)
    const cards=[...area.querySelectorAll('.card[data-pc-id]')].filter(c=>!c.dataset.pcV116&&c.dataset.pcEstorno!=='1');
    cards.forEach(card=>{
      const pc={id:card.dataset.pcId};
      card.dataset.pcV116=pc.id;
      const a=document.createElement('div');
      a.style.cssText='display:flex;gap:8px;margin-top:10px;padding-top:9px;border-top:1px solid var(--linha)';
      a.innerHTML=`<button class="btn btn-sec" style="margin:0;padding:8px 10px;font-size:13px" onclick="editarOperacaoV116('${pc.id}')">✎ Editar operação</button>`;
      card.appendChild(a);
    });
    const titulo=[...$t.querySelectorAll('h2')].find(x=>/Histórico contábil/i.test(x.textContent||''));
    if(titulo&&!document.getElementById('btn-gerenciar-v116')){
      const b=document.createElement('button');b.id='btn-gerenciar-v116';b.className='btn btn-sec';b.style.cssText='margin:0 0 14px';b.innerHTML='⚙️ Gerenciar dados e reiniciar';b.onclick=gerenciarDadosV116;
      const meta=titulo.closest('.sechead')?.nextElementSibling;
      (meta||titulo.parentElement).insertAdjacentElement('afterend',b);
    }
  }

  const hist0=window.finHistoricoContabil;
  if(typeof hist0==='function')window.finHistoricoContabil=async function(){const r=await hist0.apply(this,arguments);await decorarHistorico();return r;};

  window.editarOperacaoV116=async function(pcId){
    const pc=await get('lancamentos',pcId);if(!pc)return alert('Registro contábil não encontrado.');
    if(pc.refStore==='lancamentos'){
      const l=await get('lancamentos',pc.refId);if(!l)return alert('A operação de origem não foi encontrada.');
      if(l.origem==='venda_animais'||l.origem==='venda_animal')return editarVendaV116(l.id);
      return formLancamento(l.id);
    }
    if(pc.refStore==='animais')return editarCompraAnimalV116(pc.refId);
    if(pc.refStore==='insumo_mov'){
      fechar();alert('Esta partida veio de um movimento de estoque. A correção deve ser feita no Estoque de Insumos para manter saldo, custo médio e contabilidade consistentes.');return telaEstoque();
    }
    alert('Esta operação não possui uma origem editável identificada.');
  };

  window.editarCompraAnimalV116=async function(id){
    const a=await get('animais',id);if(!a)return alert('Animal não encontrado.');
    if(a.nascidoNaPropriedade===true)return formEditarAnimal(id);
    abrir(`<h2>Editar compra do animal</h2>
      <div class="meta" style="margin-bottom:12px">${esc(rotuloCod(a))} · a alteração atualiza o custo de estoque e a partida contábil vinculada.</div>
      <label>Data da compra</label><input id="v116_ca_data" type="date" value="${a.dataCompra||hoje()}">
      <label>Peso bruto (kg vivo)</label><input id="v116_ca_pb" inputmode="decimal" value="${valorInput(a.pesoBrutoCompraKg||a.pesoCompraKg)}">
      <div class="lado"><div><label>Desconto por arroba (kg)</label><input id="v116_ca_desc" inputmode="decimal" value="${valorInput(a.descontoArrobaCompraKg||0)}"></div><div><label>Tara (kg)</label><input id="v116_ca_tara" inputmode="decimal" value="${valorInput(a.taraCompraKg||0)}"></div></div>
      <label>Preço da arroba (R$/@)</label><input id="v116_ca_preco" inputmode="decimal" value="${valorInput(a.precoArrobaCompra||0)}">
      <label>Forma de pagamento</label><select id="v116_ca_forma"><option value="vista" ${a.formaPagamentoCompra!=='prazo'?'selected':''}>À vista — Banco/Caixa</option><option value="prazo" ${a.formaPagamentoCompra==='prazo'?'selected':''}>A prazo — Fornecedores</option></select>
      <div id="v116_ca_res" class="card" style="margin-top:12px"></div>
      <div class="lado" style="margin-top:16px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarCompraAnimalV116('${id}')">Salvar correção</button></div>`);
    ['v116_ca_pb','v116_ca_desc','v116_ca_tara','v116_ca_preco'].forEach(x=>document.getElementById(x)?.addEventListener('input',calcCompraV116));calcCompraV116();
  };

  window.calcCompraV116=function(){
    const PB=n('v116_ca_pb'),W=n('v116_ca_desc'),V=n('v116_ca_tara'),P=n('v116_ca_preco');
    const c=window.calcularNegociacaoValores?calcularNegociacaoValores(PB,W,V,P,1):null,r=document.getElementById('v116_ca_res');
    if(!r)return c;if(!c){r.innerHTML='<div class="meta">Preencha os quatro campos para recalcular.</div>';return null;}
    r.innerHTML=`<div class="meta">Valor financeiro recalculado</div><div style="font-size:22px;font-weight:800;color:var(--verde)">${moeda(c.valorTotal)}</div><div class="meta" style="margin-top:6px">Peso líquido: <b>${f(c.pesoLiquidoArroba)} @</b> · ${f(c.pesoLiquidoKg)} kg</div>`;return c;
  };

  window.salvarCompraAnimalV116=async function(id){
    const c=calcCompraV116();if(!c)return alert('Preencha corretamente peso bruto, desconto, tara e preço/@.');if(!(c.valorTotal>0))return alert('O valor calculado da compra ficou zerado. Informe o preço da @ e o peso bruto.');
    const a=await get('animais',id);if(!a)return;
    a.dataCompra=document.getElementById('v116_ca_data').value||hoje();a.pesoBrutoCompraKg=n('v116_ca_pb');a.pesoCompraKg=a.pesoBrutoCompraKg;a.descontoArrobaCompraKg=n('v116_ca_desc');a.taraCompraKg=n('v116_ca_tara');a.precoArrobaCompra=n('v116_ca_preco');a.pesoLiquidoCompraKg=c.pesoLiquidoKg;a.pesoLiquidoCompraArroba=c.pesoLiquidoArroba;a.valorCompraCalculado=c.valorTotal;a.custoEstoque=c.valorTotal;a.formaPagamentoCompra=document.getElementById('v116_ca_forma').value||'vista';
    await put('animais',a);fechar();alert('Compra corrigida. O custo do animal e o histórico contábil foram atualizados.');finHistoricoContabil();
  };

  window.editarVendaV116=async function(id){
    const l=await get('lancamentos',id);if(!l)return alert('Venda não encontrada.');
    const q=(l.animalIds||[]).length||l.quantidadeAnimais||1;
    abrir(`<h2>Editar venda</h2><div class="meta" style="margin-bottom:12px">${q} animal(is) vinculados. A correção mantém os mesmos animais da venda.</div>
      <label>Data</label><input id="v116_v_data" type="date" value="${l.data||hoje()}">
      <label>Peso bruto total (kg)</label><input id="v116_v_pb" inputmode="decimal" value="${valorInput(l.pesoBruto)}">
      <div class="lado"><div><label>Desconto por arroba (kg)</label><input id="v116_v_desc" inputmode="decimal" value="${valorInput(l.descontoArrobaKg||0)}"></div><div><label>Tara por animal (kg)</label><input id="v116_v_tara" inputmode="decimal" value="${valorInput(l.taraPorAnimalKg||0)}"></div></div>
      <label>Preço da arroba (R$/@)</label><input id="v116_v_preco" inputmode="decimal" value="${valorInput(l.precoArroba)}">
      <div id="v116_v_res" class="card" style="margin-top:12px"></div>
      <label>Valor efetivamente negociado (R$)</label><input id="v116_v_valor" inputmode="decimal" value="${valorInput(l.valor)}"><div class="meta">Pode alterar manualmente. Se deixar vazio, será usado o valor calculado pela arroba.</div>
      <div class="meta" style="margin-top:12px">Recebimentos desta venda são registrados em Lançamentos (botão 💵).</div>
      <div class="lado" style="margin-top:16px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarVendaEditadaV116('${id}',${q})">Salvar correção</button></div>`);
    ['v116_v_pb','v116_v_desc','v116_v_tara','v116_v_preco'].forEach(x=>document.getElementById(x)?.addEventListener('input',()=>calcVendaV116(q)));calcVendaV116(q);
  };

  window.calcVendaV116=function(q){
    const c=window.calcularNegociacaoValores?calcularNegociacaoValores(n('v116_v_pb'),n('v116_v_desc'),n('v116_v_tara'),n('v116_v_preco'),q):null,r=document.getElementById('v116_v_res');
    if(!r)return c;if(!c){r.innerHTML='<div class="meta">Preencha os dados para recalcular.</div>';return null;}
    r.innerHTML=`<div class="meta">Valor financeiro calculado</div><div style="font-size:22px;font-weight:800;color:var(--verde)">${moeda(c.valorTotal)}</div><div class="meta" style="margin-top:6px">Peso líquido: <b>${f(c.pesoLiquidoArroba)} @</b> · ${f(c.pesoLiquidoKg)} kg · médio ${f(c.pesoMedioArroba)} @ / ${f(c.pesoMedioKg)} kg por animal</div>`;return c;
  };

  window.salvarVendaEditadaV116=async function(id,q){
    const c=calcVendaV116(q);if(!c)return alert('Preencha corretamente os dados da venda.');const l=await get('lancamentos',id);if(!l)return;
    const manual=n('v116_v_valor'),valor=manual==null?c.valorTotal:manual;
    l.data=document.getElementById('v116_v_data').value||l.data;l.pesoBruto=n('v116_v_pb');l.descontoArrobaKg=n('v116_v_desc');l.taraPorAnimalKg=n('v116_v_tara');l.precoArroba=n('v116_v_preco');l.pesoLiquidoKg=c.pesoLiquidoKg;l.pesoLiquidoArroba=c.pesoLiquidoArroba;l.pesoMedioArroba=c.pesoMedioArroba;l.pesoMedioKg=c.pesoMedioKg;l.valorCalculado=c.valorTotal;l.valor=valor;l.ganhoRealizado=0; /* V120: modelo de custo — não existe mais ganho a realizar */ /* V118: ganho realizado = custo dos bezerros nascidos na venda, não a margem */await put('lancamentos',l);
    for(const aid of (l.animalIds||[])){const a=await get('animais',aid);if(a&&a.saida){Object.assign(a.saida,{data:l.data,pesoBruto:l.pesoBruto,descontoArrobaKg:l.descontoArrobaKg,taraPorAnimalKg:l.taraPorAnimalKg,precoArroba:l.precoArroba,pesoLiquido:c.pesoLiquidoKg,pesoLiquidoKg:c.pesoLiquidoKg,pesoLiquidoArroba:c.pesoLiquidoArroba,pesoMedioArroba:c.pesoMedioArroba,pesoMedioKg:c.pesoMedioKg,valorCalculado:c.valorTotal,valor});await put('animais',a);}}
    fechar();alert('Venda corrigida. O lançamento financeiro e as partidas contábeis vinculadas foram atualizados.');finHistoricoContabil();
  };

  window.gerenciarDadosV116=function(){
    abrir(`<h2>Gerenciar dados</h2>
      <div class="card"><div class="ti">✎ Corrigir operações</div><div class="meta">No Histórico contábil, use “Editar operação” para corrigir compras, vendas e lançamentos financeiros sem criar duplicidade.</div></div>
      <div class="card" style="border:1px solid #f0d2cb"><div class="ti" style="color:var(--perigo)">⚠️ Reiniciar dados do zero</div><div class="meta" style="margin-top:5px">Apaga os dados operacionais e financeiros desta conta: propriedades, marcas, lotes, animais, eventos, medicamentos, pastos, avisos, grupos, estoque de insumos, movimentos e lançamentos. <b>A conta, login e perfil são preservados.</b></div><button class="btn btn-perigo" style="margin-top:12px" onclick="confirmarResetV116()">Reiniciar todos os dados</button></div>
      <button class="btn btn-sec" onclick="fechar()">Fechar</button>`);
  };

  window.confirmarResetV116=function(){
    abrir(`<h2>Confirmar reinicialização</h2><div class="meta">Esta ação será sincronizada e removerá os dados também dos outros aparelhos conectados à mesma conta. Antes de continuar, faça uma cópia de segurança se quiser preservar o estado atual.</div><label>Digite <b>REINICIAR</b> para confirmar</label><input id="v116_reset_txt" autocomplete="off" placeholder="REINICIAR"><div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="gerenciarDadosV116()">Cancelar</button><button class="btn btn-perigo" onclick="resetTotalV116()">Apagar e reiniciar</button></div>`);
  };

  window.resetTotalV116=async function(){
    if((document.getElementById('v116_reset_txt')?.value||'').trim().toUpperCase()!=='REINICIAR')return alert('Digite REINICIAR para confirmar.');
    if(!confirm('Última confirmação: apagar todos os dados operacionais e financeiros desta conta?'))return;
    const stores=['grupo_animais','eventos','avisos','insumo_mov','lancamentos','animais','grupos','lotes','pastos','medicamentos','insumos','marcas','propriedades'];
    const org=await activeOrgIdLocal();let total=0;window._suspenderEstornoV119=true;
    try{
      for(const s of stores){const arr=await getAllRaw(s);for(const o of arr){if(o.deleted_at)continue;if(org&&o.organization_id&&o.organization_id!==org)continue;await del(s,o.id);total++;}}
      const cfg=(await get('perfil','config'))||{id:'config'};cfg.migracaoContabilV115Em=null;cfg.resetDadosV116Em=Date.now();await put('perfil',cfg);
      try{await sincronizarAgora({silencioso:true});}catch(_){ }
      fechar();alert(`Dados reiniciados. ${total} registro(s) foram removidos. Sua conta e perfil foram preservados.`);irAba('inicio');
    }catch(e){console.error('Reset V116:',e);alert('Não foi possível concluir a reinicialização: '+(e.message||e));}finally{window._suspenderEstornoV119=false;}
  };
  /* V118 — Ganho realizado de uma venda = soma do custo de estoque dos animais NASCIDOS na
     propriedade incluídos nela (é a realização do "ganho a realizar" lançado no nascimento).
     A V116 gravava aqui a margem (valor − custo), o que somava o lucro duas vezes no resultado. */
  async function ganhoEsperadoVendaV118(l){
    const ids=(l.animalIds&&l.animalIds.length)?l.animalIds:(l.origem==='venda_animal'&&l.refId?[l.refId]:[]);
    if(!ids.length)return null;
    const todos=await getAllRaw('animais');
    const as=ids.map(id=>todos.find(a=>a.id===id));
    if(as.some(a=>!a))return null; // animal não encontrado: não arrisca alterar
    return as.reduce((s,a)=>s+(a.nascidoNaPropriedade===true?(Number(a.custoEstoque)||0):0),0);
  }
  window.ganhoEsperadoVendaV118=ganhoEsperadoVendaV118;

  /* V120 — fim do "ganho a realizar" (modelo de custo).
     Vendas antigas: o CPV incluía R$ 500 por bezerro nascido e o mesmo valor voltava como
     "ganho realizado". Agora o bezerro nascido tem custo zero, então tiramos os R$ 500 do CPV e
     zeramos o ganho. O resultado de cada venda não muda. Também corrige vendas que a V116
     gravou com a margem no lugar do ganho. Cada venda é marcada (modeloCusto:"v120") e nunca
     é processada duas vezes, em nenhum aparelho. */
  const CUSTO_BEZERRO_LEGADO=500;
  async function migrarModeloCustoV120(){
    try{
      const raw=await getAllRaw('animais');
      const ls=(await getAll('lancamentos')).filter(l=>l.tipo==='receita'&&(l.origem==='venda_animais'||l.origem==='venda_animal')&&l.modeloCusto!=='v120');
      let nv=0,na=0;
      for(const l of ls){
        const ids=(l.animalIds&&l.animalIds.length)?l.animalIds:(l.origem==='venda_animal'&&l.refId?[l.refId]:[]);
        const as=ids.map(id=>raw.find(a=>a.id===id));
        const custo=Number(l.custo)||0, ganho=Number(l.ganhoRealizado)||0;
        let parteNascidos;
        if(ids.length&&as.every(Boolean))parteNascidos=as.filter(a=>a.nascidoNaPropriedade===true).length*CUSTO_BEZERRO_LEGADO;
        else parteNascidos=(ganho>0&&ganho<=custo)?ganho:0; // sem os animais: usa o ganho gravado se for plausível
        l.custo=Math.max(0,custo-Math.min(parteNascidos,custo));
        l.ganhoRealizado=0;
        l.modeloCusto='v120';
        await put('lancamentos',l);nv++;
      }
      for(const a of raw.filter(a=>!a.deleted_at&&a.nascidoNaPropriedade===true&&(Number(a.custoEstoque)||0)>0)){
        a.custoEstoque=0;await put('animais',a);na++; // o gancho contábil estorna a partida de nascimento
      }
      if(nv||na)console.info(`V120: modelo de custo aplicado — ${nv} venda(s) e ${na} bezerro(s) ajustados.`);
    }catch(e){console.error('Migração V120:',e);}
  }
  window.migrarModeloCustoV120=migrarModeloCustoV120;
  const iniciarV120=()=>{if(typeof db!=='undefined'&&db){setTimeout(migrarModeloCustoV120,1200);return;}setTimeout(iniciarV120,400);};
  iniciarV120();
})();
