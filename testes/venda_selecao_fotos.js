// Gestão do Rebanho — teste da venda escolhendo os animais pela foto (V179): tela de venda "Selecionar animais"
// (cartões com foto, busca, contador) e venda direto da seleção da página do lote.
const {chromium}=require('playwright');
const PORT=process.env.PORT||'8765';
(async()=>{const b=await chromium.launch({args:['--no-proxy-server','--host-resolver-rules=MAP *.supabase.co 127.0.0.1:9']});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(()=>localStorage.setItem('rebanho_supabase_session',JSON.stringify({access_token:'x',user:{id:'u1',email:'s@t.com'}})));
const p=await ctx.newPage();const errs=[],dl=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dl.push(d.message().slice(0,90));d.accept()});
await p.goto(`http://localhost:${PORT}/index.html`);await p.waitForTimeout(1500);
await p.evaluate(async()=>{
 const foto=c=>{const k=document.createElement('canvas');k.width=k.height=80;const g=k.getContext('2d');g.fillStyle=c;g.fillRect(0,0,80,80);g.fillStyle='#fff';g.beginPath();g.arc(40,40,18,0,7);g.fill();return k.toDataURL('image/jpeg');};
 await put('perfil',{id:'perfil',nome:'S'});await put('propriedades',{id:'p1',nome:'Fazenda A'});await put('marcas',{id:'m1',sigla:'SJ'});
 await put('lotes',{id:'l1',nome:'Bezerras',propriedadeId:'p1'});await put('lotes',{id:'l2',nome:'Engorda',propriedadeId:'p1'});
 const cores=['#8b5a2b','#333','#c96','#a0522d','#555','#d2b48c','#704214','#999'];
 for(let k=0;k<8;k++)await put('animais',{id:'a'+k,codigo:k+1,brinco:'B'+(k+1),nome:k%3?'':'Mimosa'+k,sexo:k%2?'M':'F',status:'Ativo',loteAtualId:k<5?'l1':'l2',marcaId:'m1',nascidoNaPropriedade:false,dataCompra:'2026-01-10',pesoCompraKg:200,pesoBrutoCompraKg:200,custoEstoque:2000,valorCompraCalculado:2000,raca:'Nelore',foto:k===6?'':foto(cores[k])});
 await renderSeguro();});
await p.waitForTimeout(400);
const R={};
// Fluxo 1: tela de venda > Selecionar animais
await p.evaluate(async()=>{await telaVendaMorteAnimal();await formSaida();await saidaV92Venda();await saidaV92Escolher('multiplos');});await p.waitForTimeout(400);
R.cards=await p.evaluate(()=>[...document.querySelectorAll('#sx_lista .sx-card')].map(c=>!!c.querySelector('img')));
await p.click('#sx_lista .sx-card[data-id="a0"]');await p.click('#sx_lista .sx-card[data-id="a2"]');await p.click('#sx_lista .sx-card[data-id="a6"]');
await p.fill('#sx_busca','mimosa');await p.waitForTimeout(150);R.busca=await p.evaluate(()=>[...document.querySelectorAll('#sx_lista .sx-card')].filter(c=>c.style.display!=='none').length);
await p.fill('#sx_busca','');await p.evaluate(()=>saidaV92FiltrarLista());
R.cont=await p.textContent('#sx_cont');

await p.evaluate(()=>saidaV92ConfirmarSelecao());await p.waitForTimeout(400);
R.fotos=await p.evaluate(()=>document.querySelectorAll('.sx-fotos .sx-foto').length);R.qtdTara=await p.getAttribute('#sx_tara_qtd','max');

const preencher=async()=>{await p.fill('#sx_preco','320');await p.fill('#sx_bruto','1200');await p.fill('#sx_desc_arroba','1');await p.evaluate(()=>saidaV92Calcular());await p.evaluate(()=>saidaV92Revisar());await p.waitForTimeout(300);
  await p.evaluate(()=>{const bt=[...document.querySelectorAll('#md button')].find(x=>/Confirmar|Registrar|Salvar/i.test(x.textContent));bt.click();});await p.waitForTimeout(900);};
await preencher();
R.vendidos1=await p.evaluate(async()=>(await getAll('animais')).filter(a=>a.status==='Vendido').map(a=>a.id).sort());
// Fluxo 2: página do lote > Selecionar vários > Vender
await p.evaluate(async()=>{await verLote('l1');loteSelecaoLigar(true);});await p.waitForTimeout(300);
await p.click('#lote_lista [data-id="a1"]');await p.click('#lote_lista [data-id="a3"]');

await p.evaluate(()=>venderSelecionadosLote());await p.waitForTimeout(400);
R.resumoLote=await p.evaluate(()=>document.querySelector('#md .sx-resumo').innerText.replace(/\n/g,' | '));
await preencher();
R.vendidos2=await p.evaluate(async()=>(await getAll('animais')).filter(a=>a.status==='Vendido').map(a=>a.id).sort());
R.telaDepois=await p.evaluate(()=>(document.querySelector('#tela .card .ti')||{}).textContent);
R.lanc=await p.evaluate(async()=>(await getAll('lancamentos')).filter(l=>l.origem==='venda_animais').map(l=>[l.animalIds.length,Math.round(l.valor),l.custo]));
R.partidas=await p.evaluate(async()=>(await getAll('lancamentos')).filter(l=>l.tipo==='partida_contabil'&&/Venda/.test(l.descricao||'')&&!/Estorno/.test(l.descricao||'')).length);
// Voltar dos dados pela seleção do lote fecha a janela
await p.evaluate(async()=>{await verLote('l2');loteSelecaoLigar(true);});await p.click('#lote_lista [data-id="a5"]');await p.evaluate(()=>venderSelecionadosLote());await p.waitForTimeout(300);
await p.evaluate(()=>[...document.querySelectorAll('#md button')].find(x=>x.textContent.trim()==='Voltar').click());await p.waitForTimeout(300);
R.voltarFecha=await p.evaluate(()=>!document.getElementById('ov').classList.contains('on'));
// telas antigas da venda ainda funcionam
await p.evaluate(async()=>{await formSaida();await saidaV92Venda();await saidaV92Escolher('lote');});R.loteInteiro=await p.evaluate(()=>!!document.getElementById('sx_sel'));
await p.evaluate(async()=>{await formSaida('a7');await saidaV92Venda();});R.individual=await p.evaluate(()=>/1 animal selecionado/.test(document.getElementById('md').innerText));
console.log(JSON.stringify(R,null,1));
const f=[];const ok=(c,t)=>{if(!c)f.push(t);};
ok(R.cards.filter(Boolean).length===7&&R.cards.length===8,'fotos nos cartões');ok(R.busca===3&&R.cont==='3 selecionados','busca/contador');
ok(R.fotos===3&&R.qtdTara==='3','miniaturas e quantidade nos dados');ok(R.vendidos1.join()==='a0,a2,a6','venda pela tela de venda');
ok(R.vendidos2.length===5&&R.telaDepois==='Bezerras'&&/2 animais selecionados/.test(R.resumoLote),'venda pela página do lote');
ok(R.lanc.length===2&&R.partidas===4,'lançamentos/partidas');ok(R.voltarFecha&&R.loteInteiro&&R.individual,'voltar e outros modos');
if(errs.length)f.push('erros: '+errs.join(' | '));
console.log(f.length?'FALHOU: '+f.join(', '):'OK');await b.close();process.exit(f.length?1:0);})();
