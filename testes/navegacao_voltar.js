// Gestão do Rebanho — teste do botão "‹ Voltar" (V157): volta para a tela anterior com filtros e rolagem.
const {chromium}=require('playwright');
const PORT=process.env.PORT||'8765';
(async()=>{
  const b=await chromium.launch({args:['--no-proxy-server','--host-resolver-rules=MAP *.supabase.co 127.0.0.1:9']});
  const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>localStorage.setItem('rebanho_supabase_session',JSON.stringify({access_token:'x',user:{id:'u1',email:'t@t.com'}})));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(`http://localhost:${PORT}/index.html`);await p.waitForTimeout(1500);
  await p.evaluate(async()=>{
    await put('propriedades',{id:'p1',nome:'Fazenda'});await put('marcas',{id:'m1',nome:'S',sigla:'SJ'});
    await put('lotes',{id:'l1',nome:'Lote Um',propriedadeId:'p1'});await put('lotes',{id:'l2',nome:'Bezerras',propriedadeId:'p1'});
    for(let k=1;k<40;k++)await put('animais',{id:'a'+k,nome:'Bicho'+k,brinco:'B'+k,sexo:k%2?'M':'F',status:'Ativo',loteAtualId:k%2?'l1':'l2',marcaId:'m1',raca:'Nelore'});
    await put('grupos',{id:'g1',nome:'Matrizes'});
    for(let k=2;k<20;k+=2)await put('grupo_animais',{id:'ga'+k,grupoId:'g1',animalId:'a'+k});
    await renderSeguro();
  });
  await p.waitForTimeout(500);
  const tela=()=>p.evaluate(()=>({voltar:document.querySelector('#tela .voltar')?.textContent||'',
    titulo:(document.querySelector('#tela .card .ti')||{}).textContent||'',y:Math.round(scrollY),
    ftipo:document.getElementById('f_tipo')?.value,fcrit:document.getElementById('f_criterio')?.value,busca:document.getElementById('busca')?.value}));
  const voltar=async()=>{await p.click('#tela .voltar');await p.waitForTimeout(700);return tela();};
  const R={};

  // 1) Lotes e Grupos -> Grupos -> grupo -> animal -> Voltar (deve voltar ao grupo, depois a Grupos, Lotes e Grupos)
  await p.evaluate(()=>{document.querySelector('nav button[data-aba="painel"]').click();});await p.waitForTimeout(600);
  await p.evaluate(()=>telaLotesGrupos());await p.waitForTimeout(500);
  await p.evaluate(()=>telaGrupos());await p.waitForTimeout(500);
  await p.evaluate(()=>verGrupo('g1'));await p.waitForTimeout(500);
  await p.evaluate(()=>verAnimal('a4'));await p.waitForTimeout(500);
  R.fichaBotao=(await tela()).voltar;
  R.grupo=(await voltar()).titulo;
  R.grupos=(await voltar()).voltar;
  R.hub=(await voltar()).voltar;

  // 2) Animais com filtro sexo=M, busca e rolagem -> ficha -> Voltar (mantém filtro, busca e posição)
  await p.evaluate(()=>abrirAnimaisOperacional());await p.waitForTimeout(600);
  await p.evaluate(()=>{const t=document.getElementById('f_tipo');t.value='sexo';t.dispatchEvent(new Event('change',{bubbles:true}));});
  await p.waitForTimeout(200);
  await p.evaluate(()=>{const c=document.getElementById('f_criterio');c.value='M';c.dispatchEvent(new Event('change',{bubbles:true}));});
  await p.waitForTimeout(300);await p.evaluate(()=>window.scrollTo(0,600));await p.waitForTimeout(200);
  const y0=await p.evaluate(()=>Math.round(scrollY));
  await p.evaluate(()=>verAnimal('a7'));await p.waitForTimeout(500);
  const lista=await voltar();
  R.listaFiltro=lista.ftipo==='sexo'&&lista.fcrit==='M';R.listaRolagem=Math.abs(lista.y-y0)<5;
  R.listaVisiveis=await p.evaluate(()=>[...document.querySelectorAll('#lista .card')].filter(c=>c.offsetParent).length);

  // 3) Lote -> animal -> Voltar volta ao lote; Início -> Estoque -> Voltar volta ao Início
  await p.evaluate(()=>verLote('l2'));await p.waitForTimeout(500);
  await p.evaluate(()=>verAnimal('a6'));await p.waitForTimeout(500);
  R.lote=(await voltar()).titulo;
  await p.evaluate(()=>{document.querySelector('nav button[data-aba="inicio"]').click();});await p.waitForTimeout(600);
  await p.evaluate(()=>telaEstoque());await p.waitForTimeout(600);
  R.estoqueBotao=(await tela()).voltar;
  await voltar();R.inicio=await p.evaluate(()=>!!document.querySelector('.atalho'));

  // 4) Sem histórico (entrou pelo menu de baixo): o botão faz o que manda e não entra em ciclo
  await p.evaluate(()=>{document.querySelector('nav button[data-aba="painel"]').click();});await p.waitForTimeout(600);
  await p.evaluate(()=>telaAvisos());await p.waitForTimeout(500);
  await voltar();R.semCiclo=(await tela()).voltar;

  console.log(JSON.stringify(R,null,1));
  const falhas=[];
  if(R.fichaBotao!=='‹ Grupo')falhas.push('botão da ficha');
  if(!/Matrizes/.test(R.grupo))falhas.push('volta ao grupo');
  if(R.grupos!=='‹ Lotes e Grupos')falhas.push('grupos -> hub');
  if(!R.listaFiltro||!R.listaRolagem)falhas.push('filtro/rolagem da lista');
  if(!/Bezerras/.test(R.lote))falhas.push('volta ao lote');
  if(R.estoqueBotao!=='‹ Início'||!R.inicio)falhas.push('estoque -> início');
  if(errs.length)falhas.push('erros: '+errs.join(' | '));
  console.log(falhas.length?'FALHOU: '+falhas.join(', '):'OK');
  await b.close();process.exit(falhas.length?1:0);
})();
