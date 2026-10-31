// Gestão do Rebanho — teste dos animais de serviço (V178): cavalo fora do rebanho, remédio do estoque,
// gastos, edição pelo Financeiro, exclusão com volta ao estoque e telas sem NaN/undefined.
const {chromium}=require('playwright');
const PORT=process.env.PORT||'8765';
(async()=>{const b=await chromium.launch({args:['--no-proxy-server','--host-resolver-rules=MAP *.supabase.co 127.0.0.1:9']});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
await ctx.addInitScript(()=>localStorage.setItem('rebanho_supabase_session',JSON.stringify({access_token:'x',user:{id:'u1',email:'s@t.com'}})));
const p=await ctx.newPage();const errs=[],dl=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|ERR_|supabase|fetch/i.test(m.text()))errs.push('console: '+m.text())});p.on('dialog',d=>{dl.push(d.message().slice(0,100));d.accept()});
await p.goto(`http://localhost:${PORT}/index.html`);await p.waitForTimeout(1500);
const R=await p.evaluate(async()=>{const R={};const w=ms=>new Promise(r=>setTimeout(r,ms));const tx=()=>document.getElementById('tela').innerText;const nan=t=>/NaN|undefined|\[object/.test(t);R.nan=[];
 const scan=async(nome,fn)=>{await fn();await w(250);if(nan(tx()))R.nan.push(nome);};
 await put('perfil',{id:'perfil',nome:'S'});await put('propriedades',{id:'p1',nome:'Fazenda A'});await put('marcas',{id:'m1',sigla:'SJ'});
 await put('lotes',{id:'l1',nome:'L1',propriedadeId:'p1'});
 await put('pastos',{id:'pa1',nome:'Pasto 1',propriedadeId:'p1',areaHa:48.4,status:'Ocupado',loteId:'l1',statusDesde:dataParaTs('2026-01-01')});
 for(const id of ['a1','a2'])await put('animais',{id,brinco:id,sexo:'F',status:'Ativo',loteAtualId:'l1',marcaId:'m1',nascidoNaPropriedade:false,dataCompra:'2026-01-10',pesoCompraKg:200,pesoBrutoCompraKg:200,raca:'Nelore'});
 await put('insumos',{id:'i1',nome:'Ivermectina',grupo:'gado',categoria:'Vermífugo',unidade:'mL',saldo:0,custoMedio:0});
 await formEntradaInsumo('i1');document.getElementById('en_qtd').value='100';document.getElementById('en_valor').value='100';await salvarEntradaInsumo('i1');
 await put('insumos',{id:'i2',nome:'Ração',grupo:'gado',categoria:'Suplemento',unidade:'kg',saldo:0,custoMedio:0});
 await formEntradaInsumo('i2');document.getElementById('en_qtd').value='50';document.getElementById('en_valor').value='100';await salvarEntradaInsumo('i2');
 // cadastro do cavalo
 await telaAnimaisServico();await formAnimalServico();
 document.getElementById('sv_nome').value='Trovão';document.getElementById('sv_entrada').value='2025-05-01';await salvarAnimalServico();await w(200);
 const cav=(await getAll('animais',{servico:true}))[0];R.cavalo=cav&&[cav.nome,cav.especie,cav.servico,cav.propriedadeId];
 R.rebanho=(await getAll('animais')).length;R.tudo=(await tudo()).animais.length;
 // remédio do estoque pela ficha (formAplicacao)
 await verAnimalServico(cav.id);
 [...document.querySelectorAll('#tela button')].find(x=>/Remédio do estoque/.test(x.textContent)).click();await w(500);
 R.alvo=document.getElementById('ap_alvo').value;R.proxOculto=document.getElementById('ap_g_temprox').style.display;
 document.getElementById('ap_med').value='i1';document.getElementById('ap_dose').value='10';await resumoAplicacao();R.resumo=document.getElementById('ap_resumo').innerText.replace(/\n/g,' | ');
 await salvarAplicacao();await w(400);
 R.saldo1=(await get('insumos','i1')).saldo;
 let ls=(await getAll('lancamentos')).filter(l=>l.animalServicoId===cav.id);R.lanc1=ls.map(l=>[l.categoria,l.tipoGasto,l.valor,l.natureza,l.apropriacaoTipo]);
 R.eventosCavalo=(await getAll('eventos')).filter(e=>e.animalId===cav.id).length;
 // gasto manual a prazo
 await formGastoServico(cav.id);document.getElementById('sg_tipo').value='Ferrageamento';document.getElementById('sg_valor').value='150';document.getElementById('sg_pago').value='0';await salvarGastoServico(cav.id);await w(300);
 // consumo de ração pelo estoque
 await formConsumoInsumo('i2');document.getElementById('co_apr_tipo').value='servico';trocarDestinoConsumo();await w(150);
 document.querySelector('.co_apr_ck').checked=true;await resumoDestinoConsumo();R.coResumo=document.getElementById('co_apr_resumo').innerText;
 document.getElementById('co_qtd').value='5';await salvarConsumoInsumo('i2');await w(300);
 R.saldoRacao=(await get('insumos','i2')).saldo;
 await verAnimalServico(cav.id);R.ficha=tx().match(/Gasto em[\s\S]*?Histórico de gastos[\s\S]*?Os gastos/)[0].replace(/\n/g,' | ');
 const pts=(await getAll('lancamentos')).filter(l=>l.tipo==='partida_contabil'&&/Trovão/.test(l.descricao||'')).map(l=>[l.descricao,l.debito,l.credito,l.valor].join(' / '));R.partidas=pts;
 // editar o gasto manual pelo Financeiro
 const manual=(await getAll('lancamentos')).find(l=>l.animalServicoId===cav.id&&l.origem==='manual');
 await formLancamento(manual.id);await w(300);R.editForm=[document.getElementById('lc_cat').value,document.getElementById('lc_apr_tipo').value,document.getElementById('lc_apr_id').value===cav.id];
 document.getElementById('lc_valor').value='160';await salvarLancamento(manual.id);await w(300);
 const m2=await get('lancamentos',manual.id);R.aposEdicao=[m2.valor,m2.animalServicoId===cav.id,m2.tipoGasto,m2.categoria];
 // excluir remédio do estoque
 const itRem=gastosDoServico(cav.id,await getAll('lancamentos'),await getAll('insumo_mov'),await getAll('insumos')).find(i=>/Iverm/.test(i.descricao));
 await excluirGastoServico(cav.id,itRem.lancId,itRem.movId);await w(400);
 R.saldoVolta=(await get('insumos','i1')).saldo;R.lancAposExcluir=(await getAll('lancamentos')).filter(l=>l.animalServicoId===cav.id).length;
 R.estorno=(await getAll('lancamentos')).filter(l=>l.tipo==='partida_contabil'&&/Estorno/.test(l.descricao||'')&&/Ivermectina/.test(l.descricao||'')).length;
 // análise e telas
 const dados={animais:await getAll('animais'),eventos:await getAll('eventos'),lotes:await getAll('lotes'),pastos:await getAll('pastos'),propriedades:await getAll('propriedades')};
 R.analiseAtivos=indicadoresPropriedades(dados,{ini:'2026-01-01',fim:hoje()})[0].ativos;
 await scan('painel',()=>telaPainel());R.painelCard=/Animais de serviço/.test(tx());
 await scan('inicio',()=>telaInicio());
 await scan('lista',()=>telaAnimaisServico());R.lista=tx().split('\n').filter(x=>/Trovão|R\$/.test(x)).join(' | ');
 await scan('ficha',()=>verAnimalServico(cav.id));
 await scan('resumo',()=>finResumo());await w(600);
 await scan('lancamentos',()=>finLancamentos());await scan('relatorios',()=>finRelatorios());await w(500);R.relCat=(tx().match(/Animais de serviço[^|\n]*\n[^\n]*/)||[''])[0].replace(/\n/g,' | ');
 await scan('estoque',()=>telaEstoque());
 await scan('animais',()=>telaAnimais());R.listaRebanhoSemCavalo=!/Trovão/.test(tx());
 await scan('analiseInd',()=>telaAnaliseIndividual());R.analiseSemCavalo=!/Trovão/.test(tx());
 await scan('analiseProp',()=>telaAnalisePropriedade());
 await scan('manejo',()=>telaMedicamentosManejo());
 await scan('trocaLote',()=>telaTrocaLote());
 await formAplicacao({});R.alvoPadrao=document.getElementById('ap_alvo').value;fechar();
 // editar: inativar e apagar bloqueado
 await formAnimalServico(cav.id);document.getElementById('sv_status').value='Inativo';await salvarAnimalServico(cav.id);await w(200);
 await telaAnimaisServico();R.inativo=/Não estão mais na propriedade \(1\)/.test(tx());
 return R;});
console.log(JSON.stringify(R,null,1));
  const f=[];const ok=(c,t)=>{if(!c)f.push(t);};
  ok(R.rebanho===2&&R.tudo===2,'cavalo entrou no rebanho');ok(R.alvo==='servico'&&R.proxOculto==='none','formulário de aplicação');
  ok(R.saldo1===90&&R.lanc1.length===1&&R.lanc1[0][2]===10&&R.eventosCavalo===0,'remédio do estoque');
  ok(R.saldoRacao===45,'consumo de ração');ok(R.partidas.length===3,'partidas contábeis');
  ok(R.editForm[1]==='servico'&&R.editForm[2]&&R.aposEdicao[0]===160&&R.aposEdicao[1],'edição pelo Financeiro');
  ok(R.saldoVolta===100&&R.lancAposExcluir===2&&R.estorno===1,'exclusão volta ao estoque');
  ok(R.analiseAtivos===2&&R.listaRebanhoSemCavalo&&R.analiseSemCavalo,'cavalo na análise/lista');
  ok(R.painelCard&&R.relCat.includes('170'),'painel/relatório');ok(R.inativo,'inativar');ok(!R.nan.length,'NaN em '+R.nan);
  if(errs.length)f.push('erros: '+errs.join(' | '));
  console.log(f.length?'FALHOU: '+f.join(', '):'OK');await b.close();process.exit(f.length?1:0);})();
