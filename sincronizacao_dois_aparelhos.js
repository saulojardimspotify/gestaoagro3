// Gestão do Rebanho — teste de sincronização: dois aparelhos (A e B) com o mesmo usuário e um Supabase simulado em memória.
const {chromium}=require('playwright');
const PORT=process.env.PORT||'8765';
const nuvem=new Map(); // chave org|store|record_id -> linha
let seq=0;
function filtrar(params){
  let rows=[...nuvem.values()];
  for(const [k,v] of params){
    if(['select','order','limit','offset','on_conflict'].includes(k))continue;
    if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));
    else if(v.startsWith('in.')){const ids=v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,''));rows=rows.filter(r=>ids.includes(String(r[k])));}
  }
  rows.sort((a,b)=>String(a.record_id).localeCompare(String(b.record_id)));
  const off=+(params.get('offset')||0),lim=+(params.get('limit')||1e9);
  return rows.slice(off,off+lim);
}
async function rota(route){
  const req=route.request(),u=new URL(req.url()),p=u.pathname,m=req.method();
  const json=(b,st=200)=>route.fulfill({status:st,contentType:'application/json',body:JSON.stringify(b)});
  if(p==='/auth/v1/user')return json({id:'u1',email:'t@t.com'});
  if(p==='/rest/v1/organization_members')return json([{organization_id:'org1'}]);
  if(p==='/rest/v1/profiles')return json(m==='GET'?[]:[{}]);
  if(p==='/rest/v1/cloud_backups')return json([]);
  if(p==='/rest/v1/sync_records'){
    if(m==='GET')return json(filtrar(u.searchParams));
    if(m==='POST'){const body=JSON.parse(req.postData()||'[]');const out=[];
      for(const r of body){const k=r.organization_id+'|'+r.store_name+'|'+r.record_id;const ant=nuvem.get(k);
        const linha={...r,server_updated_at:new Date().toISOString(),id:ant?ant.id:++seq};nuvem.set(k,linha);out.push(linha);}
      return json(out,201);}
  }
  return json([]);
}
(async()=>{
  const b=await chromium.launch({args:['--no-proxy-server']});
  const novo=async nome=>{
    const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await ctx.route('https://homosmdrqtdxtmmmnbpd.supabase.co/**',rota);
    await ctx.addInitScript(()=>localStorage.setItem('rebanho_supabase_session',JSON.stringify({access_token:'x',refresh_token:'r',user:{id:'u1',email:'t@t.com'}})));
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(nome+': '+e.message));p.on('dialog',d=>d.accept());
    await p.goto(`http://localhost:${PORT}/index.html`);await p.waitForTimeout(1500);p.ctx=ctx;return p;
  };
  const sync=p=>p.evaluate(async()=>{const w=()=>new Promise(r=>setTimeout(r,80));while(_syncRunning)await w();await sincronizarAgora({silencioso:true});while(_syncRunning)await w();return _syncLastError||'ok';});
  const nomeX=p=>p.evaluate(async()=>{const a=await get('animais','x1');return a?a.nome:'(não existe)';});
  const nuvemX=()=>{const r=nuvem.get('org1|animais|x1');return r?(r.deleted_at?'(excluído)':r.payload.nome):'(não existe)';};
  const editar=(p,nome)=>p.evaluate(async n=>{const a=await get('animais','x1');a.nome=n;await put('animais',a);},nome);
  const espera=ms=>new Promise(r=>setTimeout(r,ms));
  const R={};
  const A=await novo('A'),B=await novo('B');
  // 1) A cria, B recebe
  await A.evaluate(async()=>{await put('propriedades',{id:'p1',nome:'Fazenda'});await put('lotes',{id:'l1',nome:'L1',propriedadeId:'p1'});
    await put('animais',{id:'x1',codigo:'1',nome:'Original',sexo:'F',status:'Ativo',loteAtualId:'l1'});});
  R.s1_syncA=await sync(A);R.s1_syncB=await sync(B);R.s1=[await nomeX(A),await nomeX(B),nuvemX()];
  // 2) B edita SEM internet (mais antigo); depois A edita e sincroniza; B volta
  await B.ctx.setOffline(true);await editar(B,'Editado no B (antes)');await espera(60);
  await editar(A,'Editado no A (depois)');await sync(A);
  await B.ctx.setOffline(false);await sync(B);await sync(A);
  R.s2_esperado='Editado no A (depois) nos dois e na nuvem';R.s2=[await nomeX(A),await nomeX(B),nuvemX()];
  // 3) B edita sem internet DEPOIS de A: a do B deve valer
  await editar(A,'A às 10h');await sync(A);await espera(60);
  await B.ctx.setOffline(true);await editar(B,'B às 11h (offline)');await B.ctx.setOffline(false);await sync(B);await sync(A);
  R.s3_esperado='B às 11h (offline)';R.s3=[await nomeX(A),await nomeX(B),nuvemX()];
  // 4) B cria animais sem internet; A recebe
  await B.ctx.setOffline(true);await B.evaluate(async()=>{for(let k=0;k<3;k++)await put('animais',{id:'off'+k,codigo:String(10+k),nome:'Offline '+k,sexo:'M',status:'Ativo',loteAtualId:'l1'});});
  await B.ctx.setOffline(false);await sync(B);await sync(A);
  R.s4=await A.evaluate(async()=>(await getAll('animais')).filter(a=>a.id.startsWith('off')).length);
  // 5) A exclui; B recebe a exclusão
  await A.evaluate(async()=>{await del('animais','off0');});await sync(A);await sync(B);
  R.s5=[await B.evaluate(async()=>!!(await get('animais','off0'))),nuvem.get('org1|animais|off0').deleted_at?'excluído na nuvem':'ativo na nuvem'];
  // 6) B exclui sem internet algo que A editou depois: a edição mais nova deve valer
  await B.ctx.setOffline(true);await B.evaluate(async()=>{await del('animais','off1');});await espera(60);
  await A.evaluate(async()=>{const a=await get('animais','off1');a.nome='Editado depois da exclusão';await put('animais',a);});await sync(A);
  await B.ctx.setOffline(false);await sync(B);await sync(A);
  R.s6_esperado='os dois com o animal editado';R.s6=[await A.evaluate(async()=>{const a=await get('animais','off1');return a?a.nome:'(excluído)';}),await B.evaluate(async()=>{const a=await get('animais','off1');return a?a.nome:'(excluído)';})];
  // 7) pendências: nada pendente nos dois
  R.s7_pendentes=[await A.evaluate(async()=>{let n=0;for(const s of SYNC_STORES)n+=(await getAllRaw(s)).filter(o=>o.sync_status!=='synced').length;return n;}),await B.evaluate(async()=>{let n=0;for(const s of SYNC_STORES)n+=(await getAllRaw(s)).filter(o=>o.sync_status!=='synced').length;return n;})];
  console.log(JSON.stringify({R,erros:[...A.errs,...B.errs]},null,1));
  await b.close();
})();
