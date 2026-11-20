// Gestão do Rebanho — teste da escolha da mãe pela foto (V181): só fêmeas ativas com 12 meses ou mais,
// busca, escolha gravada no nascimento e na edição (mãe já gravada continua aparecendo), sexo obrigatório.
const {chromium}=require('playwright');
const PORT=process.env.PORT||'8765',FOTO=process.env.FOTO;
(async()=>{const b=await chromium.launch({args:['--no-proxy-server','--host-resolver-rules=MAP *.supabase.co 127.0.0.1:9']});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(()=>localStorage.setItem('rebanho_supabase_session',JSON.stringify({access_token:'x',user:{id:'u1',email:'s@t.com'}})));
const p=await ctx.newPage();const errs=[],dl=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>{dl.push(d.message());d.accept()});
await p.goto(`http://localhost:${PORT}/index.html`);await p.waitForTimeout(1500);
await p.evaluate(async()=>{
 const foto=c=>{const k=document.createElement('canvas');k.width=k.height=80;const g=k.getContext('2d');g.fillStyle=c;g.fillRect(0,0,80,80);return k.toDataURL('image/jpeg');};
 await put('perfil',{id:'perfil',nome:'S'});await put('propriedades',{id:'p1',nome:'A'});await put('marcas',{id:'m1',sigla:'SJ'});await put('lotes',{id:'l1',nome:'Matrizes',propriedadeId:'p1'});
 const base={marcaId:'m1',loteAtualId:'l1',raca:'Nelore',nascidoNaPropriedade:false,dataCompra:'2024-01-10'};
 await put('animais',{...base,id:'v1',codigo:56,nome:'Sara Nala',sexo:'F',status:'Ativo',dataNascimento:'2021-03-01',foto:foto('#8b5a2b')});
 await put('animais',{...base,id:'v2',codigo:59,nome:'Cris',sexo:'F',status:'Ativo',foto:foto('#333')});
 await put('animais',{...base,id:'v3',codigo:62,nome:'Madalena',sexo:'F',status:'Vendido',saida:{data:'2026-06-01'}});
 await put('animais',{...base,id:'v4',codigo:50,sexo:'M',status:'Ativo'});
 await put('animais',{...base,id:'v5',codigo:70,nome:'Bezerrinha',sexo:'F',status:'Ativo',dataNascimento:'2026-05-01'});
 await put('animais',{...base,id:'v6',codigo:63,nome:'Catarina',sexo:'F',status:'Morto',saida:{data:'2026-02-01'}});
});
const R={};
await p.evaluate(()=>formNovoAnimal('l1',true));await p.waitForTimeout(300);
await p.click('#a_mae_sel');await p.waitForTimeout(200);
R.lista=await p.evaluate(()=>[...document.querySelectorAll('#a_mae_lista .sx-card b')].map(x=>x.textContent));
R.comFoto=await p.evaluate(()=>document.querySelectorAll('#a_mae_lista .sx-card img').length);
await p.fill('#a_mae_busca','cris');R.busca=await p.evaluate(()=>[...document.querySelectorAll('#a_mae_lista .sx-card')].filter(c=>c.style.display!=='none').length);
await p.fill('#a_mae_busca','');await p.evaluate(()=>filtrarMaes());
if(FOTO)await p.screenshot({path:FOTO});
await p.click('#a_mae_lista .sx-card:has-text("Sara Nala")');R.escolhida=await p.textContent('#a_mae_sel');
await p.fill('#a_brinco','BZ1');await p.selectOption('#a_marca','m1');await p.selectOption('#a_raca','Nelore').catch(()=>{});
await p.evaluate(()=>salvarAnimal(true));await p.waitForTimeout(300);R.semSexo=dl.some(m=>/sexo/i.test(m));
await p.selectOption('#a_sexo','M');await p.evaluate(()=>salvarAnimal(true));await p.waitForTimeout(400);
const bz=await p.evaluate(async()=>(await getAll('animais')).find(a=>a.brinco==='BZ1'));R.maeGravada=bz&&bz.maeId;
// edição de filho antigo cuja mãe foi vendida: continua aparecendo e pode trocar
await p.evaluate(async()=>{await put('animais',{id:'f1',codigo:80,sexo:'M',status:'Ativo',marcaId:'m1',loteAtualId:'l1',raca:'Nelore',nascidoNaPropriedade:true,dataNascimento:'2025-08-01',maeId:'v3'});await formEditarAnimal('f1');});
await p.waitForTimeout(300);R.editaMostra=await p.textContent('#e_mae_sel');
await p.click('#e_mae_sel');R.editaLista=await p.evaluate(()=>[...document.querySelectorAll('#e_mae_lista .sx-card b')].map(x=>x.textContent));
await p.click('#e_mae_lista .sx-card:has-text("Cris")');await p.evaluate(()=>salvarEdicaoAnimal('f1'));await p.waitForTimeout(300);
R.maeEditada=await p.evaluate(async()=>(await get('animais','f1')).maeId);
console.log(JSON.stringify(R,null,1));
const f=[];const ok=(c,t)=>{if(!c)f.push(t);};
ok(R.lista.length===3&&R.lista.some(x=>/Sara/.test(x))&&R.lista.some(x=>/Cris/.test(x))&&!R.lista.some(x=>/Madalena|Catarina|Bezerrinha|#050/.test(x)),'só fêmeas ativas adultas');
ok(R.comFoto===2&&R.busca===2,'fotos e busca (Cris + "Nenhuma")');ok(/Sara Nala/.test(R.escolhida)&&R.semSexo&&R.maeGravada==='v1','escolha no nascimento e sexo obrigatório');
ok(/Madalena/.test(R.editaMostra)&&R.editaLista.some(x=>/Madalena/.test(x))&&R.maeEditada==='v2','edição');
if(errs.length)f.push('erros: '+errs.join(' | '));
console.log(f.length?'FALHOU: '+f.join(', '):'OK');await b.close();process.exit(f.length?1:0);})();
