/* V112 — classificação econômica e apropriação dos lançamentos financeiros. */
(()=>{
  const NATUREZAS={
    receita:{label:'Receita',tipo:'receita',icone:'🟢',cats:['Leite','Arrendamento','Outras receitas']},
    custo:{label:'Custo de produção',tipo:'despesa',icone:'🟠',cats:['Alimentação','Sanidade','Pastagens','Mão de obra','Manutenção','Máquinas / combustível','Água / energia','Depreciação','Outros custos']},
    despesa:{label:'Despesa',tipo:'despesa',icone:'🔴',cats:['Administrativa / geral','Despesas com vendas','Impostos / taxas','Serviços administrativos','Outras despesas']},
    investimento:{label:'Investimento',tipo:'investimento',icone:'🔵',cats:['Infraestrutura','Cercas / currais','Drenagem','Máquinas / equipamentos','Formação / ampliação de pastagens','Outros investimentos']}
  };
  const APROPRIACOES=[['propriedade','Geral da propriedade'],['pasto','Pasto específico'],['lote','Lote específico'],['grupo','Grupo de animais'],['animal','Animal específico']];
  const vendasOperacionais=/^(venda de bezerro|venda de matriz\s*\/\s*descarte|venda de animais?)$/i;

  if(!document.getElementById('fin112-css')){
    const st=document.createElement('style');st.id='fin112-css';st.textContent=`
      .fn{display:flex;flex-direction:column;gap:10px}.fb{width:100%;min-height:72px;border:1.7px solid var(--verde);border-radius:16px;background:#fff;padding:12px 14px;display:flex;align-items:center;gap:12px;text-align:left;color:var(--verde-esc);font:inherit}.fb:active{background:var(--verde-lite)}.fb .fi{font-size:24px;width:42px;text-align:center}.fb .ft{flex:1}.fb .ft strong{display:block;font-size:16px}.fb .ft small{display:block;color:var(--muted);font-size:12px;margin-top:3px;line-height:1.3}`;document.head.appendChild(st);
  }

  function natDe(l){
    if(l&&l.natureza&&NATUREZAS[l.natureza])return l.natureza;
    if(l&&l.tipo==='receita')return 'receita';
    if(l&&l.tipo==='investimento')return 'investimento';
    if(l&&l.classe==='custo')return 'custo';
    return 'despesa';
  }
  function cats(n){return (NATUREZAS[n]||NATUREZAS.despesa).cats;}
  function opt(arr,sel){return arr.map(x=>`<option value="${esc(x)}" ${x===sel?'selected':''}>${esc(x)}</option>`).join('');}
  function idVal(id){const e=document.getElementById(id);return e?e.value:'';}

  async function abrirFormClassificado(id,preset){
    if(!(await podeUsarApp('Criar ou editar lançamento financeiro')))return;
    const dados=await tudo();
    const l=id?await get('lancamentos',id):null;
    const natureza=l?natDe(l):(preset||'despesa');
    const categoria=(l&&l.categoria)||cats(natureza)[0];
    const optProp=`<option value="">Selecione a propriedade</option>`+dados.propriedades.map(p=>`<option value="${p.id}" ${l&&l.propriedadeId===p.id?'selected':''}>${esc(p.nome)}</option>`).join('');
    const aprTipo=(l&&l.apropriacaoTipo)||'propriedade';
    window._finDadosApropriacao=dados;
    abrir(`<h2>${l?'Editar lançamento':'Novo lançamento'}</h2>
      <label>Tipo do lançamento</label>
      <select id="lc_natureza" onchange="finTrocaNatureza()">
        ${Object.entries(NATUREZAS).map(([k,v])=>`<option value="${k}" ${natureza===k?'selected':''}>${v.icone} ${v.label}</option>`).join('')}
      </select>
      <div id="lc_ajuda_natureza" class="meta" style="margin:5px 2px 10px"></div>
      <label>Categoria</label><select id="lc_cat">${opt(cats(natureza),categoria)}</select>
      <label>Valor (R$) *</label><input id="lc_valor" inputmode="decimal" value="${l&&l.valor!=null?String(l.valor).replace('.',','):''}" placeholder="Ex: 2500">
      <label>Data (competência) *</label><input id="lc_data" type="date" value="${l?l.data:hoje()}">
      <label>Propriedade *</label><select id="lc_prop" onchange="finAtualizaDestino()">${optProp}</select>
      <div style="margin-top:14px;padding:12px;border-radius:14px;background:var(--verde-lite)">
        <div style="font-weight:800;color:var(--verde-esc);margin-bottom:3px">Apropriação do lançamento</div>
        <div class="meta" style="margin-bottom:9px">Indique onde este valor deve ser atribuído para permitir custos e resultados por propriedade, pasto, lote, grupo ou animal.</div>
        <label style="margin-top:0">Este lançamento pertence a</label>
        <select id="lc_apr_tipo" onchange="finAtualizaDestino()">${APROPRIACOES.map(([k,t])=>`<option value="${k}" ${aprTipo===k?'selected':''}>${t}</option>`).join('')}</select>
        <div id="lc_apr_destino_wrap" style="display:none"><label id="lc_apr_destino_label">Destino</label><select id="lc_apr_id"></select></div>
      </div>
      <label>Descrição (opcional)</label><input id="lc_desc" value="${l?esc(l.descricao||''):''}" placeholder="Ex: herbicida, conserto de cerca, nota 123…">
      ${l&&l.liquidacaoV121?`<div class="meta" style="margin-top:12px">${l.aVista?'Lançado à vista.':'Lançado a prazo.'} Pagamentos e recebimentos são registrados na lista de lançamentos (botão 💵).</div>`
        :`<label>Forma</label><select id="lc_pago"><option value="1" ${l&&l.pago?'selected':''}>À vista (pago/recebido na data)</option><option value="0" ${l&&!l.pago?'selected':''}>A prazo (fica em aberto)</option></select>`}
      <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarLancamento(${l?`'${l.id}'`:''})">Salvar</button></div>`);
    window._finAprSelecionada=l&&l.apropriacaoId||'';
    finTrocaNatureza(false);finAtualizaDestino();
  }

  window.formLancamento=async function(id){
    if(id){
      const l=await get('lancamentos',id);
      if(l&&(l.origem==='venda_animais'||l.origem==='venda_animal')&&typeof finDetalheVendaAnimais==='function')return finDetalheVendaAnimais(id);
      if(l&&l.origem==='compra_animal'&&typeof editarCompraAnimalV116==='function')return editarCompraAnimalV116(l.refId);
      if(l&&l.origem==='consumo_insumo')return alert(l.aplicacaoId?'Custo gerado por uma aplicação de medicamento (baixa no estoque). Para corrigir, exclua a aplicação no histórico de manejo e registre de novo.':'Custo gerado por um consumo do Estoque de Insumos. Para corrigir, exclua o movimento no estoque e registre de novo.');
      if(l&&l.origem==='morte_animal')return alert('Perda gerada automaticamente pelo registro de morte (custo de estoque do animal). Para corrigir, ajuste o custo do animal ou exclua o evento "Morte" no histórico dele.');
      return abrirFormClassificado(id);
    }
    if(!(await podeUsarApp('Criar lançamento financeiro')))return;
    abrir(`<h2>Novo lançamento</h2><div class="meta" style="margin-bottom:12px">Escolha a natureza do lançamento. Venda de animais continua vinculada à Gestão Operacional.</div>
      <div class="fn" style="display:flex;flex-direction:column;gap:10px">
        <button class="fb" onclick="finNovaVendaAnimais()"><span class="fi">🐂</span><span class="ft"><strong>Venda de animais</strong><small>Seleciona os animais e usa o cálculo operacional da venda.</small></span>›</button>
        <button class="fb" onclick="finNovoClassificado('receita')"><span class="fi">🟢</span><span class="ft"><strong>Receita</strong><small>Leite, arrendamento e outras entradas.</small></span>›</button>
        <button class="fb" onclick="finNovoClassificado('custo')"><span class="fi">🟠</span><span class="ft"><strong>Custo de produção</strong><small>Alimentação, sanidade, pastagens, mão de obra e manutenção produtiva.</small></span>›</button>
        <button class="fb" onclick="finNovoClassificado('despesa')"><span class="fi">🔴</span><span class="ft"><strong>Despesa</strong><small>Gastos administrativos, comerciais e gerais.</small></span>›</button>
        <button class="fb" onclick="finNovoClassificado('investimento')"><span class="fi">🔵</span><span class="ft"><strong>Investimento</strong><small>Infraestrutura e ativos com benefício por vários períodos.</small></span>›</button>
      </div><button class="btn btn-sec" style="margin-top:16px" onclick="fechar()">Cancelar</button>`);
  };
  window.finNovoClassificado=n=>abrirFormClassificado(null,n);
  window.finNovaOutraReceita=()=>abrirFormClassificado(null,'receita');
  window.finNovaDespesa=()=>abrirFormClassificado(null,'despesa');

  window.finTrocaNatureza=function(reset=true){
    const n=idVal('lc_natureza')||'despesa';
    const cat=document.getElementById('lc_cat');
    if(cat){const atual=reset?'':cat.value;cat.innerHTML=opt(cats(n),cats(n).includes(atual)?atual:cats(n)[0]);}
    const ajuda=document.getElementById('lc_ajuda_natureza');
    if(ajuda){
      ajuda.textContent=n==='custo'?'Gasto ligado à produção. Pode ser apropriado diretamente ou rateado entre áreas/lotes.':n==='investimento'?'Cria ou amplia um ativo com benefício por vários períodos; não reduz diretamente o resultado operacional do mês.':n==='despesa'?'Gasto administrativo, comercial ou geral que não integra diretamente a produção.':'Entrada de recursos da atividade.';
    }
  };

  window.finAtualizaDestino=function(){
    const d=window._finDadosApropriacao;if(!d)return;
    const tipo=idVal('lc_apr_tipo')||'propriedade',prop=idVal('lc_prop');
    const wrap=document.getElementById('lc_apr_destino_wrap'),sel=document.getElementById('lc_apr_id'),lab=document.getElementById('lc_apr_destino_label');
    if(!wrap||!sel)return;
    if(tipo==='propriedade'){wrap.style.display='none';sel.innerHTML='';return;}
    wrap.style.display='block';
    let arr=[],label='Destino';
    if(tipo==='pasto'){arr=d.pastos.filter(x=>!prop||x.propriedadeId===prop);label='Pasto';}
    if(tipo==='lote'){arr=d.lotes.filter(x=>!prop||x.propriedadeId===prop);label='Lote';}
    if(tipo==='grupo'){
      arr=d.grupos.filter(x=>!prop||!x.propriedadeId||x.propriedadeId===prop);label='Grupo';
    }
    if(tipo==='animal'){
      const lotesOk=new Set(d.lotes.filter(x=>!prop||x.propriedadeId===prop).map(x=>x.id));
      arr=d.animais.filter(x=>(!x.status||x.status==='Ativo')&&(!prop||lotesOk.has(x.loteAtualId)));label='Animal';
    }
    if(lab)lab.textContent=label;
    const nome=x=>tipo==='animal'?`${x.nome?esc(x.nome)+' · ':''}#${esc(x.brinco||x.codigo||'—')}`:esc(x.nome||x.codigo||x.sigla||'—');
    sel.innerHTML=`<option value="">Selecione</option>`+arr.map(x=>`<option value="${x.id}" ${String(window._finAprSelecionada||'')===String(x.id)?'selected':''}>${nome(x)}</option>`).join('');
    window._finAprSelecionada='';
  };

  window.salvarLancamento=async function(id){
    if(!(await podeUsarApp('Salvar lançamento financeiro')))return;
    const natureza=idVal('lc_natureza')||'despesa';
    const cfg=NATUREZAS[natureza]||NATUREZAS.despesa;
    const categoria=idVal('lc_cat'),valor=numBR('lc_valor'),data=idVal('lc_data');
    if(valor==null||valor<=0)return alert('Informe um valor válido.');
    if(!data)return alert('Informe a data de competência.');
    const propriedadeId=idVal('lc_prop')||null;
    if(!propriedadeId)return alert('Selecione a propriedade para este lançamento.');
    const apropriacaoTipo=idVal('lc_apr_tipo')||'propriedade';
    const apropriacaoId=apropriacaoTipo==='propriedade'?propriedadeId:(idVal('lc_apr_id')||null);
    if(apropriacaoTipo!=='propriedade'&&!apropriacaoId)return alert('Selecione onde este lançamento deve ser apropriado.');
    const pago=idVal('lc_pago')==='1',descricao=idVal('lc_desc');
    const classe=natureza==='custo'?'custo':natureza==='investimento'?'investimento':natureza==='despesa'?(categoria==='Despesas com vendas'?'vendas':'admin'):null;
    const obj={tipo:cfg.tipo,natureza,categoria,valor,data,propriedadeId,descricao,pago,classe,apropriacaoTipo,apropriacaoId};
    if(id){const l=await get('lancamentos',id);if(l){Object.assign(l,obj);await put('lancamentos',l);}}
    else await put('lancamentos',{id:uid(),...obj,origem:'manual',refId:null,criadoEm:Date.now()});
    fechar();finLancamentos();
  };

  function limparCategoriasVenda(){
    const cat=document.getElementById('lc_cat');if(!cat)return;
    [...cat.options].forEach(op=>{const t=(op.textContent||op.value||'').trim();if(vendasOperacionais.test(t))op.remove();});
  }

  const finLancamentosBase=window.finLancamentos;
  if(typeof finLancamentosBase==='function')window.finLancamentos=async function(){
    const r=await finLancamentosBase.apply(this,arguments);
    try{
      const ls=await getAll('lancamentos');
      const temNovo=ls.some(x=>x.natureza||x.tipo==='investimento');
      if(temNovo&&_finFiltro==='todos'){
        const tabs=[...$t.querySelectorAll('.btn-fant')].find(x=>/Todos/i.test(x.textContent||''));
        const alvo=tabs&&tabs.parentElement;
        if(alvo&&!document.getElementById('fin-legenda-natureza')){
          const div=document.createElement('div');div.id='fin-legenda-natureza';div.className='meta';div.style.cssText='margin:8px 2px 12px;line-height:1.7';
          div.innerHTML='🟢 Receita &nbsp; 🟠 Custo de produção &nbsp; 🔴 Despesa &nbsp; 🔵 Investimento';alvo.insertAdjacentElement('afterend',div);
        }
      }
    }catch(_){ }
    return r;
  };

  const finResumoBase=window.finResumo;
  if(typeof finResumoBase==='function')window.finResumo=async function(){
    const r=await finResumoBase.apply(this,arguments);
    try{
      const ano=_finAno||String(new Date().getFullYear());
      const ls=(await getAll('lancamentos')).filter(l=>l.tipo!=='partida_contabil'&&(l.data||'').slice(0,4)===ano&&(!_finProp||l.propriedadeId===_finProp));
      const custos=ls.filter(l=>natDe(l)==='custo').reduce((s,l)=>s+(l.valor||0),0);
      const investimentos=ls.filter(l=>natDe(l)==='investimento').reduce((s,l)=>s+(l.valor||0),0);
      const cards=$t.querySelector('.fin-cards');
      if(cards){
        [...cards.querySelectorAll('.cl')].forEach(el=>{if((el.textContent||'').includes('Despesas'))el.textContent='🧾 Custos + despesas';});
        const c=document.createElement('div');c.className='fin-c';c.innerHTML=`<div class="cl">🟠 Custos de produção</div><div class="cv" style="color:var(--perigo)">${moeda(custos)}</div>`;cards.appendChild(c);
        const i=document.createElement('div');i.className='fin-c';i.innerHTML=`<div class="cl">🔵 Investimentos</div><div class="cv">${moeda(investimentos)}</div>`;cards.appendChild(i);
      }
    }catch(_){ }
    return r;
  };

  const observar=()=>{
    limparCategoriasVenda();
    new MutationObserver(limparCategoriasVenda).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observar);else observar();
})();