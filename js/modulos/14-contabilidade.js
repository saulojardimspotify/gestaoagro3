/* V115 — Livro Diário persistente. (V119: baixa por morte + estorno de partidas ao excluir operações)
   As partidas contábeis são gravadas como registros próprios dentro da store
   sincronizada `lancamentos` (tipo = "partida_contabil"). Isso mantém o histórico
   no IndexedDB + Supabase sem criar um novo store_name e sem reabrir o problema
   do CHECK sync_records_store_check.

   Regra: o evento operacional continua sendo a fonte da operação; a partida é
   materializada e permanece registrada mesmo que a tela de relatório seja fechada.
*/
(()=>{
  const rel0=window.finRelatorios;
  const formAnimal0=window.formNovoAnimal;
  const salvarAnimal0=window.salvarAnimal;
  const putOriginal=put;
  const delOriginal=del;
  let _pcGuard=false;
  let _pcMigrando=false;

  const TIPO_PC='partida_contabil';
  const SCHEMA_PC=1;

  const dataCriacao=o=>{
    if(o&&o.dataCompra)return o.dataCompra;
    const ts=o&&(o.criadoEm||o.created_at);
    if(typeof ts==='number'&&Number.isFinite(ts))return tsData(ts);
    if(typeof ts==='string'){
      const d=new Date(ts);if(!Number.isNaN(d.getTime()))return tsData(d.getTime());
    }
    return hoje();
  };
  const formaCompra=a=>a&&a.formaPagamentoCompra==='prazo'?'Fornecedores — a pagar':'Banco/Caixa';
  const nomeAnimal=a=>(typeof rotuloCod==='function'?rotuloCod(a):`${rotulo(a)} ${codAnimal(a)}`).trim(); // V127
  const propAnimal=(a,lotes)=>{const l=lotes.find(x=>x.id===a.loteAtualId);return l?l.propriedadeId:null;};
  const chaveSegura=s=>String(s==null?'':s).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,120);
  const idPartida=(store,refId,chave)=>`pc_${chaveSegura(store)}_${chaveSegura(refId)}_${chaveSegura(chave)}`;

  async function salvarPartida({store,refId,chave,data,descricao,debito,credito,valor,origem,propriedadeId}){
    const v=Number(valor||0);
    if(!refId||!chave)return null;
    // V119: partida já estornada nunca é reescrita; se a operação voltar a ter valor, nasce uma nova versão.
    const base=idPartida(store,refId,chave);
    let id=base,k=1,existente=await getRaw('lancamentos',id);
    while(existente&&existente.estornado){k++;id=`${base}_v${k}`;existente=await getRaw('lancamentos',id);}
    if(!(v>0)){
      // O valor desta perna deixou de existir (ex.: CPV ou ganho zerado): estorna a partida que havia.
      if(existente&&!existente.deleted_at&&!existente.estornoDe)await estornarPartida(existente);
      return null;
    }
    const agora=agoraISO();
    const registro={
      ...(existente||{}),id,tipo:TIPO_PC,schemaContabil:SCHEMA_PC,
      data:data||hoje(),descricao:descricao||origem||'Partida contábil',
      debito,credito,valor:v,origemContabil:origem||'',
      refStore:store,refId:String(refId),refChave:String(chave),
      propriedadeId:propriedadeId||null,automatico:true,
      criadoEm:existente&&existente.criadoEm?existente.criadoEm:Date.now(),
      created_at:existente&&existente.created_at?existente.created_at:agora,
      deleted_at:null
    };
    _pcGuard=true;
    try{await putOriginal('lancamentos',registro);}finally{_pcGuard=false;}
    return registro;
  }

  /* ---------- V119: estorno de partidas ----------
     Estornar = gravar a partida inversa (D↔C) na mesma data da original e marcar a original
     como estornada. O Livro Diário mantém a trilha completa e o saldo de cada conta volta a zero. */
  const ehPartidaAtiva=pc=>pc&&pc.tipo===TIPO_PC&&!pc.deleted_at&&!pc.estornado&&!pc.estornoDe;
  async function estornarPartida(pc,motivo){
    if(!ehPartidaAtiva(pc))return;
    const idEst=`${pc.id}_estorno`;
    const ja=await getRaw('lancamentos',idEst);
    _pcGuard=true;
    try{
      if(!ja||ja.deleted_at){
        await putOriginal('lancamentos',{id:idEst,tipo:TIPO_PC,schemaContabil:SCHEMA_PC,data:pc.data||hoje(),
          descricao:`Estorno · ${pc.descricao||'Partida contábil'}`,debito:pc.credito,credito:pc.debito,valor:pc.valor,
          origemContabil:`Estorno${motivo?` — ${motivo}`:''}`,refStore:pc.refStore,refId:pc.refId,refChave:`${pc.refChave||''}_estorno`,
          estornoDe:pc.id,estornadoEm:hoje(),propriedadeId:pc.propriedadeId||null,automatico:true,criadoEm:Date.now(),deleted_at:null});
      }
      pc.estornado=true;pc.estornadoEm=hoje();pc.estornoId=idEst;
      await putOriginal('lancamentos',pc);
    }finally{_pcGuard=false;}
    _cacheBaixas=null;
  }
  async function partidasAtivasDe(store,refId,filtro){
    return (await getAllRaw('lancamentos')).filter(x=>ehPartidaAtiva(x)&&x.refStore===store&&x.refId===String(refId)&&(!filtro||filtro(x)));
  }
  async function estornarRef(store,refId,motivo,filtro){
    for(const pc of await partidasAtivasDe(store,refId,filtro))await estornarPartida(pc,motivo);
  }

  /* ---------- V119: baixa por morte ----------
     • Animal comprado: gera um lançamento de despesa não-caixa "Perda com morte de animais"
       (D Perda com morte de animais / C Estoque de semoventes) — reduz o resultado.
     • Bezerro nascido na propriedade: estorna o nascimento (D Ganho a realizar / C Estoque de
       semoventes), sem afetar o resultado, como descrito em Financeiro > Config.
     A chave é o id do evento "Morte", então a baixa é a mesma em todos os aparelhos e, se o
     evento for excluído (animal volta a Ativo), a baixa é estornada. */
  const ORIGEM_MORTE='morte_animal';
  let _cacheBaixas=null,_cacheBaixasEm=0;
  async function animaisComBaixaAtiva(){
    if(_cacheBaixas&&Date.now()-_cacheBaixasEm<20000)return _cacheBaixas;
    const set=new Set();
    for(const x of await getAllRaw('lancamentos')){
      if(x.origem===ORIGEM_MORTE&&!x.deleted_at&&x.refId)set.add(String(x.refId));
      else if(ehPartidaAtiva(x)&&x.refStore==='animais'&&String(x.refChave||'').startsWith('morte_'))set.add(String(x.refId));
    }
    _cacheBaixas=set;_cacheBaixasEm=Date.now();return set;
  }
  async function eventoMorte(a,ctx){
    const evs=ctx&&ctx.mortes?(ctx.mortes.get(a.id)||[]):(await getAll('eventos')).filter(e=>e.animalId===a.id&&e.tipo==='Morte');
    return evs.slice().sort((x,y)=>(y.criadoEm||0)-(x.criadoEm||0))[0]||null;
  }
  async function registrarBaixaMorte(a,propId,ctx){
    const custo=Number(a.custoEstoque||0);
    if(!(custo>0)&&a.nascidoNaPropriedade!==true)return; // nascido com custo 0: salvarPartida estorna a baixa antiga
    const ev=await eventoMorte(a,ctx);
    const chaveEv=ev?ev.id:'sem_evento';
    const data=(ev&&ev.data)||(a.saida&&a.saida.data)||hoje();
    const causa=(a.saida&&a.saida.causa)||'';
    if(a.nascidoNaPropriedade===true){
      await salvarPartida({store:'animais',refId:a.id,chave:`morte_${chaveEv}`,data,
        descricao:`Morte ${nomeAnimal(a)} — estorno do nascimento`,debito:'Ganho a realizar — semoventes',credito:'Estoque de semoventes',
        valor:custo,origem:'Baixa por morte (bezerro nascido)',propriedadeId:propId});
    }else{
      const id=`morte_${chaveSegura(a.id)}_${chaveSegura(chaveEv)}`;
      const existente=await getRaw('lancamentos',id);
      const campos={tipo:'despesa',natureza:'despesa',classe:'perda',categoria:'Perda com morte de animais',valor:custo,data,
        descricao:`Morte ${nomeAnimal(a)}${causa?` — ${causa}`:''}`,propriedadeId:propId||null,pago:true,
        origem:ORIGEM_MORTE,refId:a.id,eventoMorteId:ev?ev.id:null};
      const igual=existente&&!existente.deleted_at&&Object.keys(campos).every(k=>existente[k]===campos[k]);
      if(!igual)await put('lancamentos',{...(existente||{}),id,criadoEm:(existente&&existente.criadoEm)||Date.now(),...campos,deleted_at:null});
    }
    if(_cacheBaixas)_cacheBaixas.add(String(a.id));
  }
  async function desfazerBaixaMorte(animalId,motivo){
    for(const l of (await getAllRaw('lancamentos')).filter(x=>x.origem===ORIGEM_MORTE&&!x.deleted_at&&x.refId===animalId))
      await del('lancamentos',l.id); // o gancho do del estorna a partida da perda
    await estornarRef('animais',animalId,motivo,x=>String(x.refChave||'').startsWith('morte_'));
    if(_cacheBaixas)_cacheBaixas.delete(String(animalId));
  }

  // V121: toda compra de animal tem um lançamento "Compra de animais" (não é despesa, não entra no resultado).
  // À vista: já nasce pago. A prazo: fica em "A pagar" até registrar os pagamentos.
  async function garantirLancCompra(a,propId,custo){
    const id=`compra_${chaveSegura(a.id)}`;
    const ex=await getRaw('lancamentos',id);
    const campos={tipo:'compra_animal',natureza:'compra_animal',categoria:'Compra de animais',valor:custo,
      data:a.dataCompra||dataCriacao(a),descricao:`Compra ${nomeAnimal(a)}`,propriedadeId:propId||null,
      origem:'compra_animal',refId:a.id,aVista:a.formaPagamentoCompra!=='prazo'};
    if(ex&&!ex.deleted_at&&Object.keys(campos).every(k=>ex[k]===campos[k]))return;
    await put('lancamentos',{pagamentos:[],liquidacaoV121:true,criadoEm:Date.now(),...(ex||{}),id,...campos,deleted_at:null});
  }

  async function contabilizarAnimal(a,lotesArg,ctx){
    if(!a||a.deleted_at)return;
    const lotes=lotesArg||await getAll('lotes');
    const propId=propAnimal(a,lotes);
    if(a.status==='Morto')await registrarBaixaMorte(a,propId,ctx);
    else if((await animaisComBaixaAtiva()).has(String(a.id)))await desfazerBaixaMorte(a.id,'morte desfeita');
    const custo=Number(a.custoEstoque||0);
    if(a.nascidoNaPropriedade===true){
      // V120: com custo zero, salvarPartida estorna a partida de nascimento antiga (fim do "ganho a realizar").
      await salvarPartida({store:'animais',refId:a.id,chave:'nascimento',data:a.dataNascimento||dataCriacao(a),
        descricao:`Nascimento ${nomeAnimal(a)}`,debito:'Estoque de semoventes',credito:'Ganho a realizar — semoventes',
        valor:custo,origem:'Nascimento',propriedadeId:propId});
    }else{
      if(!(custo>0)){
        // V121: compra zerada/removida — estorna a partida da compra e apaga o lançamento de compra (estorna os pagamentos)
        await salvarPartida({store:'animais',refId:a.id,chave:'compra',data:dataCriacao(a),descricao:`Compra ${nomeAnimal(a)}`,
          debito:'Estoque de semoventes',credito:formaCompra(a),valor:0,origem:'Compra de animal',propriedadeId:propId});
        const lc=await getRaw('lancamentos',`compra_${chaveSegura(a.id)}`);
        if(lc&&!lc.deleted_at)await del('lancamentos',lc.id);
        return;
      }
      await garantirLancCompra(a,propId,custo);
      await salvarPartida({store:'animais',refId:a.id,chave:'compra',data:dataCriacao(a),
        descricao:`Compra ${nomeAnimal(a)}`,debito:'Estoque de semoventes',credito:formaCompra(a),
        valor:custo,origem:'Compra de animal',propriedadeId:propId});
    }
  }

  /* ---------- V121: pagamentos e recebimentos como eventos próprios ----------
     A partida do fato (competência) usa Banco só se foi À VISTA (fixado na criação); a prazo usa
     Clientes/Fornecedores e NUNCA é reescrita quando o dinheiro entra/sai. Cada pagamento é um
     item em l.pagamentos com data e valor próprios e gera sua partida:
       recebimento  D Banco/Caixa · C Clientes — a receber
       pagamento    D Fornecedores — a pagar · C Banco/Caixa
     Excluir um pagamento estorna a partida dele. */
  function normalizarLiquidacao(l){
    if(!l||l.deleted_at||typeof TIPOS_LIQUIDAVEIS==='undefined'||!TIPOS_LIQUIDAVEIS.includes(l.tipo))return;
    if(!l.liquidacaoV121){
      const pagoNaData=!!l.pago&&(!l.dataPagamento||l.dataPagamento<=l.data);
      if(l.aVista==null)l.aVista=pagoNaData;
      l.pagamentos=Array.isArray(l.pagamentos)?l.pagamentos:[];
      if(!l.aVista&&l.pago&&!l.pagamentos.length)
        l.pagamentos.push({id:'mig',data:l.dataPagamento||l.data,valor:Number(l.valor)||0,forma:'',obs:'marcado como pago antes da V121'});
      l.liquidacaoV121=true;
    }
    l.pagamentos=(l.pagamentos||[]).filter(p=>p&&p.id!=='ato');
    if(l.aVista)l.pagamentos=[{id:'ato',data:l.data,valor:Number(l.valor)||0,forma:'à vista',noAto:true}];
    const saldo=saldoAberto(l);
    l.pago=saldo<=0.005;
    l.dataPagamento=l.pago?l.pagamentos.map(p=>p.data).sort().slice(-1)[0]||l.data:null;
  }
  window.normalizarLiquidacaoV121=normalizarLiquidacao;

  async function contabilizarPagamentos(l){
    const rec=l.tipo==='receita',vivos=new Set();
    for(const p of (l.pagamentos||[])){
      if(p.noAto||!(Number(p.valor)>0))continue;
      const chave=`pag_${p.id}`;vivos.add(chave);
      await salvarPartida({store:'lancamentos',refId:l.id,chave,data:p.data,
        descricao:`${rec?'Recebimento':'Pagamento'} · ${l.descricao||l.categoria||''}`,
        debito:rec?'Banco/Caixa':'Fornecedores — a pagar',credito:rec?'Clientes — a receber':'Banco/Caixa',
        valor:p.valor,origem:rec?'Recebimento':'Pagamento',propriedadeId:l.propriedadeId});
    }
    await estornarRef('lancamentos',l.id,'pagamento excluído',x=>String(x.refChave||'').startsWith('pag_')&&!vivos.has(x.refChave));
  }

  async function contabilizarLancamento(l){
    if(!l||l.deleted_at||l.tipo===TIPO_PC)return;
    const contra=(l.liquidacaoV121?l.aVista:l.pago)?'Banco/Caixa':(l.tipo==='receita'?'Clientes — a receber':'Fornecedores — a pagar');
    if(l.tipo==='compra_animal'){
      // A partida do fato (D Estoque · C Banco/Fornecedores) é feita pelo cadastro do animal; aqui só os pagamentos.
      await contabilizarPagamentos(l);return;
    }
    if(TIPOS_LIQUIDAVEIS.includes(l.tipo))await contabilizarPagamentos(l);
    if(l.tipo==='receita'){
      await salvarPartida({store:'lancamentos',refId:l.id,chave:'receita',data:l.data,descricao:l.descricao||l.categoria,
        debito:contra,credito:'Receita de vendas',valor:l.valor,origem:'Receita',propriedadeId:l.propriedadeId});
      await salvarPartida({store:'lancamentos',refId:l.id,chave:'cpv',data:l.data,descricao:`CPV · ${l.descricao||l.categoria}`,
        debito:'CPV — custo dos vendidos',credito:'Estoque de semoventes',valor:l.custo,origem:'CPV',propriedadeId:l.propriedadeId});
      await salvarPartida({store:'lancamentos',refId:l.id,chave:'ganho_realizado',data:l.data,descricao:`Realização · ${l.descricao||l.categoria}`,
        debito:'Ganho a realizar — semoventes',credito:'Ganho realizado com semoventes',valor:l.ganhoRealizado,
        origem:'Ganho realizado',propriedadeId:l.propriedadeId});
    }else if(l.tipo==='despesa'){
      const deb=l.origem===ORIGEM_MORTE?'Perda com morte de animais':l.origem==='consumo_insumo'?(l.contaV144?'Custo de produção':'Custo / despesa de insumos'):(l.natureza==='custo'?'Custo de produção':'Despesas operacionais');
      const cred=l.origem===ORIGEM_MORTE?'Estoque de semoventes':l.origem==='consumo_insumo'?'Estoque de insumos':contra;
      await salvarPartida({store:'lancamentos',refId:l.id,chave:'despesa',data:l.data,descricao:l.descricao||l.categoria,
        debito:deb,credito:cred,valor:l.valor,origem:l.categoria||'Despesa',propriedadeId:l.propriedadeId});
    }else if(l.tipo==='investimento'||l.natureza==='investimento'){
      await salvarPartida({store:'lancamentos',refId:l.id,chave:'investimento',data:l.data,descricao:l.descricao||l.categoria,
        debito:'Investimentos / imobilizado',credito:contra,valor:l.valor,origem:l.categoria||'Investimento',propriedadeId:l.propriedadeId});
    }
  }

  // V119: estorna partidas cuja operação de origem foi EXCLUÍDA (existe localmente com deleted_at).
  // Origem simplesmente ausente não é tocada: pode ser um registro ainda chegando pela sincronização.
  async function estornarOrfas(){
    const todos=await getAllRaw('lancamentos');
    const cache={};
    const origem=async(st,id)=>{const k=st+'|'+id;if(!(k in cache)){try{cache[k]=await getRaw(st,id);}catch(_){cache[k]=undefined;}}return cache[k];};
    for(const pc of todos.filter(ehPartidaAtiva)){
      if(!['lancamentos','animais','insumo_mov'].includes(pc.refStore))continue;
      const src=await origem(pc.refStore,pc.refId);
      if(src&&src.deleted_at)await estornarPartida(pc,'operação excluída');
      else if(src&&pc.refStore==='animais'&&String(pc.refChave||'').startsWith('morte_')&&src.status!=='Morto')await estornarPartida(pc,'morte desfeita');
    }
    for(const l of todos.filter(x=>x.origem==='compra_animal'&&!x.deleted_at)){
      const a=await origem('animais',l.refId);
      if(a&&a.deleted_at)await del('lancamentos',l.id);
    }
    // Perdas por morte de animais que não estão mais mortos (ou foram apagados)
    for(const l of todos.filter(x=>x.origem===ORIGEM_MORTE&&!x.deleted_at)){
      const a=await origem('animais',l.refId);
      if(a&&(a.deleted_at||a.status!=='Morto'))await del('lancamentos',l.id);
    }
  }

  async function contabilizarMovInsumo(m){
    if(!m||m.deleted_at||m.tipo!=='entrada'||!(Number(m.valorTotal||0)>0))return;
    const i=await get('insumos',m.insumoId);
    if(m.aVista==null){ // V121: fixa a forma na primeira contabilização
      m.aVista=!!m.pago&&!m.dataPagamento;
      _pcGuard=true;try{await putOriginal('insumo_mov',m);}finally{_pcGuard=false;}
    }
    const nome=(i&&i.nome)||'insumo';
    await salvarPartida({store:'insumo_mov',refId:m.id,chave:'compra_insumo',data:m.data,
      descricao:`Compra ${nome}`,debito:'Estoque de insumos',
      credito:m.aVista?'Banco/Caixa':'Fornecedores — a pagar',valor:m.valorTotal,origem:'Compra de insumo',propriedadeId:m.propriedadeId||null});
    await salvarPartida({store:'insumo_mov',refId:m.id,chave:'pagamento',data:m.dataPagamento||m.data,
      descricao:`Pagamento · Compra ${nome}`,debito:'Fornecedores — a pagar',credito:'Banco/Caixa',
      valor:(!m.aVista&&m.pago)?m.valorTotal:0,origem:'Pagamento',propriedadeId:m.propriedadeId||null});
  }

  async function migrarHistoricoExistente(){
    if(_pcMigrando)return;
    _pcMigrando=true;
    try{
      const lotes=await getAll('lotes');
      const mortes=new Map();
      for(const e of await getAll('eventos'))if(e.tipo==='Morte'){if(!mortes.has(e.animalId))mortes.set(e.animalId,[]);mortes.get(e.animalId).push(e);}
      _cacheBaixas=null;
      for(const a of await getAll('animais'))await contabilizarAnimal(a,lotes,{mortes});
      await estornarOrfas();
      const lancs=(await getAll('lancamentos')).filter(l=>l.tipo!==TIPO_PC);
      for(const l of lancs){
        if(!l.liquidacaoV121&&TIPOS_LIQUIDAVEIS.includes(l.tipo))await put('lancamentos',l); // normaliza + contabiliza
        else await contabilizarLancamento(l);
      }
      for(const m of await getAll('insumo_mov'))await contabilizarMovInsumo(m);
      const cfg=(await get('perfil','config'))||{id:'config'};
      if(!cfg.migracaoContabilV115Em){cfg.migracaoContabilV115Em=Date.now();await putOriginal('perfil',cfg);}
    }catch(e){console.error('Migração contábil V115:',e);}finally{_pcMigrando=false;}
  }

  // Materializa automaticamente as partidas quando a operação é gravada.
  // Usa a store já sincronizada `lancamentos`, evitando nova whitelist no Supabase.
  put=async function(store,obj){
    if(store==='lancamentos'&&obj&&obj.tipo!==TIPO_PC){try{normalizarLiquidacao(obj);}catch(e){console.error('Liquidação V121:',e);}}
    const r=await putOriginal(store,obj);
    if(_pcGuard)return r;
    try{
      if(store==='animais')await contabilizarAnimal(obj);
      else if(store==='lancamentos'&&obj&&obj.tipo!==TIPO_PC)await contabilizarLancamento(obj);
      else if(store==='insumo_mov')await contabilizarMovInsumo(obj);
    }catch(e){console.error('Registro contábil automático V115:',e);}
    return r;
  };

  // V119: excluir uma operação estorna as partidas que ela gerou.
  del=async function(store,id){
    const antes=await getRaw(store,id);
    const r=await delOriginal(store,id);
    if(window._suspenderEstornoV119||!antes||antes.deleted_at||antes.tipo===TIPO_PC)return r;
    try{
      if(store==='lancamentos'||store==='insumo_mov')await estornarRef(store,id,'operação excluída');
      else if(store==='animais'){
        await estornarRef('animais',id,'animal excluído');
        await desfazerBaixaMorte(id,'animal excluído');
        for(const l of (await getAllRaw('lancamentos')).filter(x=>x.origem==='compra_animal'&&!x.deleted_at&&x.refId===id))await del('lancamentos',l.id);
      }
    }catch(e){console.error('Estorno automático V119:',e);}
    return r;
  };

  window.formNovoAnimal=async function(loteFixo,nascimento){
    const r=await formAnimal0.apply(this,arguments);
    if(nascimento)return r;
    const grp=document.getElementById('grp_compra');
    if(grp&&!document.getElementById('ac_forma_pagamento')){
      const box=document.createElement('div');
      box.innerHTML=`<label>Forma de pagamento</label><select id="ac_forma_pagamento"><option value="vista">À vista — Banco/Caixa</option><option value="prazo">A prazo — Fornecedores</option></select>`;
      grp.appendChild(box);
    }
    return r;
  };

  window.salvarAnimal=async function(nascimento){
    const nasceu=nascimento||((document.getElementById('a_nasceu')||{}).value==='sim');
    const forma=(document.getElementById('ac_forma_pagamento')||{}).value||'vista';
    const antes=new Set((await getAll('animais')).map(a=>a.id));
    const r=await salvarAnimal0.apply(this,arguments);
    if(nasceu)return r;
    const novo=(await getAll('animais')).filter(a=>!antes.has(a.id)).sort((a,b)=>(b.criadoEm||0)-(a.criadoEm||0))[0];
    if(novo){
      novo.formaPagamentoCompra=forma;
      novo.dataCompra=novo.dataCompra||dataCriacao(novo);
      await put('animais',novo);
    }
    return r;
  };

  async function partidasPersistidas(){
    await migrarHistoricoExistente();
    return (await getAll('lancamentos')).filter(l=>l.tipo===TIPO_PC&&!l.deleted_at)
      .sort((a,b)=>((b.data||'').localeCompare(a.data||''))||((b.criadoEm||0)-(a.criadoEm||0)));
  }

  window.finHistoricoContabil=async function(){
    if(!(await podeUsarApp('Acessar histórico contábil')))return;
    topoPagina();
    _finAno=_finAno||String(new Date().getFullYear());
    const propriedades=await getAll('propriedades');
    const itens=await partidasPersistidas();
    const nomeProp=id=>(propriedades.find(p=>p.id===id)||{}).nome||'—';
    const anos=[...new Set(itens.map(x=>(x.data||'').slice(0,4)).filter(Boolean))];
    if(!anos.includes(_finAno))anos.push(_finAno);anos.sort().reverse();
    const filtrados=itens.filter(x=>(x.data||'').slice(0,4)===_finAno&&(!_finProp||x.propriedadeId===_finProp));
    const optAno=anos.map(a=>`<option value="${a}" ${a===_finAno?'selected':''}>${a}</option>`).join('');
    const optProp=`<option value="">Todas as propriedades</option>`+propriedades.map(p=>`<option value="${p.id}" ${p.id===_finProp?'selected':''}>${esc(p.nome)}</option>`).join('');
    const selo=x=>x.estornoDe?`<span class="chip chip-off" style="margin-left:6px">↩ Estorno</span>`:(x.estornado?`<span class="chip chip-off" style="margin-left:6px">Estornada${x.estornadoEm?` em ${fmt(x.estornadoEm)}`:''}</span>`:'');
    const cards=filtrados.map(x=>`<div class="card" data-pc-id="${esc(x.id)}" data-pc-estorno="${x.estornoDe?1:0}" style="cursor:default${x.estornado?';opacity:.6':''}">
      <div class="row"><div><div class="ti" style="font-size:15px">${esc(x.descricao||'Partida contábil')}${selo(x)}</div><div class="meta">📅 ${fmt(x.data)}${x.propriedadeId?` · ${esc(nomeProp(x.propriedadeId))}`:''}</div></div><div style="font-weight:800;white-space:nowrap">${moeda(x.valor)}</div></div>
      <div style="margin-top:9px;padding-top:9px;border-top:1px solid var(--linha);font-size:13px;line-height:1.55">
        <div><b style="color:var(--verde)">D</b> ${esc(x.debito||'—')}</div>
        <div><b style="color:var(--perigo)">C</b> ${esc(x.credito||'—')}</div>
      </div>
      ${x.origemContabil?`<div class="meta" style="margin-top:5px">${esc(x.origemContabil)}</div>`:''}
    </div>`);
    $t.innerHTML=`${finHead()}${finTabsBar('relatorios')}
      <button class="voltar" onclick="finRelatorios()">‹ Relatórios</button>
      <div class="sechead"><span class="sic">📒</span><h2>Histórico contábil</h2></div>
      <div class="meta" style="margin:-7px 4px 13px">Livro Diário persistente. Cada operação gera e grava sua partida de débito e crédito no banco sincronizado.</div>
      <div class="lado" style="margin-bottom:14px"><select onchange="_finProp=this.value;finHistoricoContabil()">${optProp}</select><select style="max-width:110px" onchange="_finAno=this.value;finHistoricoContabil()">${optAno}</select></div>
      ${cards.length?verMais(cards,'registro(s)'):`<div class="vazio"><div class="big">📒</div><b>Nenhum registro contábil</b><div class="meta">Não há partidas para os filtros selecionados.</div></div>`}`;
  };

  if(typeof rel0==='function')window.finRelatorios=async function(){
    const r=await rel0.apply(this,arguments);
    try{
      await migrarHistoricoExistente();
      const tabs=$t.querySelector('.fintabs');
      if(tabs&&!document.getElementById('btn-historico-contabil')){
        const b=document.createElement('button');
        b.id='btn-historico-contabil';b.className='btn';b.style.margin='0 0 16px';
        b.innerHTML='📒 Histórico contábil — Débitos e Créditos';
        b.onclick=()=>finHistoricoContabil();
        tabs.insertAdjacentElement('afterend',b);
      }
      const hs=[...$t.querySelectorAll('.h3')];
      const h=hs.find(e=>/Partidas do período/i.test(e.textContent||''));
      if(h){let n=h.nextElementSibling;while(n){const prox=n.nextElementSibling;n.remove();n=prox;}h.remove();}
    }catch(e){console.error('Relatórios V115:',e);}
    return r;
  };

  // Faz a migração em segundo plano assim que o banco local estiver disponível.
  const iniciarMigracao=()=>{
    if(typeof db!=='undefined'&&db){migrarHistoricoExistente();return;}
    setTimeout(iniciarMigracao,400);
  };
  setTimeout(iniciarMigracao,400);
})();