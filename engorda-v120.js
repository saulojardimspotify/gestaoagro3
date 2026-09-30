/* V120 — Engorda e pesagens (painel GERENCIAL, fora da contabilidade).

   Ideia: sem balança na propriedade, o peso de cada animal é conhecido em alguns momentos
   (compra, pesagem por fita/balança emprestada, venda). Entre esses pontos o peso é
   interpolado; depois do último ponto é estimado por GMD (ganho médio diário) de águas/seca.
   O GMD de referência é CALIBRADO automaticamente pelos ganhos reais observados nos seus
   próprios animais (compra → pesagem → venda).

   Convenções: pesos em kg de peso vivo; arroba = peso vivo ÷ 30 (≈ 50% de rendimento,
   a mesma regra usada no cálculo de compra/venda do app).
*/
(()=>{
  const DIA=86400000;
  const PADRAO={gmdAguas:0.55,gmdSeca:0.20,gmdPre:0.70,mesAguas:10,mesSeca:4,pesoNascer:32,capF:450,capM:540,
    idadeMatrizMeses:30,calibrar:true,precoEngorda:null,precoBezerro:null,precoMatriz:null,
    idadeBezerroMeses:12,pesoBezerroKg:240};
  // V128: preço da @ por categoria de mercado
  const CATS_PRECO=[
    ['bezerroNelore','Bezerro Nelore'],['bezerraNelore','Bezerra Nelore'],
    ['bezerroMestico','Bezerro Mestiço'],['bezerraMestica','Bezerra Mestiça'],
    ['machoInteiro','Macho adulto inteiro'],['machoCastrado','Macho adulto castrado'],['femeaAdulta','Fêmea adulta']];
  const NOME_CAT=Object.fromEntries(CATS_PRECO);
  const METODOS={balanca:'Balança',fita:'Fita de pesagem',visual:'Estimativa visual'};
  const f2=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const f1=n=>Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const f0=n=>Math.round(Number(n||0)).toLocaleString('pt-BR');
  const kgArr=kg=>kg/30;
  const ts=d=>dataParaTs(d);
  const dias=(d0,d1)=>Math.round((ts(d1)-ts(d0))/DIA);
  const somaDias=(d,n)=>tsData(ts(d)+n*DIA);
  const numCampo=id=>{const e=document.getElementById(id);if(!e)return null;let s=(e.value||'').trim().replace(/\s/g,'');if(!s)return null;
    if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');const v=Number(s);return Number.isFinite(v)?v:null;};

  /* ---------------- parâmetros (guardados neste aparelho) ---------------- */
  async function cfgEngorda(){
    const c=await getConfig();const cfg=Object.assign({},PADRAO,c.engorda||{});
    cfg.precos=Object.assign({},cfg.precos||{});
    if(!Object.keys(cfg.precos).length&&(cfg.precoEngorda||cfg.precoBezerro||cfg.precoMatriz)){ // V128: veio da V120–V127
      const e=Number(cfg.precoEngorda)||null,bz=Number(cfg.precoBezerro)||e,mt=Number(cfg.precoMatriz)||e;
      Object.assign(cfg.precos,{bezerroNelore:bz,bezerraNelore:bz,bezerroMestico:bz,bezerraMestica:bz,machoInteiro:e,machoCastrado:e,femeaAdulta:mt});
    }
    return cfg;
  }
  async function salvarCfgEngorda(novo){const c=await getConfig();c.id='config';c.engorda=Object.assign({},PADRAO,c.engorda||{},novo);await put('perfil',c);}

  /* ---------------- dados de base ---------------- */
  const pesoDoTexto=t=>{const m=String(t||'').match(/(\d{2,4}(?:[.,]\d+)?)\s*kg/i)||String(t||'').match(/^\s*(\d{2,4}(?:[.,]\d+)?)\b/);
    if(!m)return null;const v=Number(m[1].replace(',','.'));return v>=10&&v<=1500?v:null;};
  async function carregar(){
    const animais=(await getAll('animais'));
    const eventos=await getAll('eventos');
    const pes=new Map(),filhos=new Map();
    for(const e of eventos){
      if(e.tipo!=='Pesagem')continue;
      const kg=Number.isFinite(Number(e.pesoKg))&&Number(e.pesoKg)>0?Number(e.pesoKg):pesoDoTexto(e.detalhes);
      if(kg==null||!e.data)continue;
      if(!pes.has(e.animalId))pes.set(e.animalId,[]);
      pes.get(e.animalId).push({d:e.data,kg,tipo:'pesagem',metodo:e.metodoPesagem||'',evId:e.id});
    }
    for(const a of animais)if(a.maeId){if(!filhos.has(a.maeId))filhos.set(a.maeId,[]);filhos.get(a.maeId).push(a);}
    return {animais,pes,filhos};
  }
  function pontosDe(a,base,cfg){
    const out=[];
    const dCriado=a.criadoEm?tsData(a.criadoEm):hoje();
    if(a.nascidoNaPropriedade===true)out.push({d:a.dataNascimento||dCriado,kg:cfg.pesoNascer,tipo:'nasc',ordem:0});
    else{const kg=Number(a.pesoBrutoCompraKg||a.pesoCompraKg)||null;out.push({d:a.dataCompra||dCriado,kg,tipo:'compra',ordem:0});}
    for(const p of (base.pes.get(a.id)||[]))out.push({...p,ordem:1});
    if(a.status!=='Ativo'&&a.saida&&a.saida.data){
      if(a.saida.tipo==='Venda'){const n=Number(a.saida.quantidadeAnimais)||1;const pb=Number(a.saida.pesoBruto);
        out.push({d:a.saida.data,kg:pb>0?pb/n:null,tipo:'venda',ordem:2});}
      else out.push({d:a.saida.data,kg:null,tipo:'morte',ordem:2});
    }
    return out.sort((x,y)=>x.d.localeCompare(y.d)||x.ordem-y.ordem);
  }
  const idadeDias=(a,d)=>a.dataNascimento?dias(a.dataNascimento,d):null;
  function ehMatriz(a,base,cfg,d){
    if(a.sexo!=='F')return false;
    const id=idadeDias(a,d||hoje());
    if(id!=null)return id>=cfg.idadeMatrizMeses*30.4;
    return (base.filhos.get(a.id)||[]).length>0;
  }
  function preDesmama(a,d){
    if(a.nascidoNaPropriedade!==true||!a.dataNascimento)return false;
    if(a.desmamado&&a.dataDesmama)return d<a.dataDesmama;
    if(a.desmamado)return false;
    return (idadeDias(a,d)||0)<300;
  }
  function categoria(a,base,cfg,d){
    if(preDesmama(a,d||hoje()))return 'bezerro';
    if(ehMatriz(a,base,cfg,d))return 'matriz';
    return 'engorda';
  }
  const ehAguas=(m,cfg)=>cfg.mesAguas<cfg.mesSeca?(m>=cfg.mesAguas&&m<cfg.mesSeca):(m>=cfg.mesAguas||m<cfg.mesSeca);
  // ganho previsto pelo modelo entre d0 e d1 (dia a dia, respeitando águas/seca, desmama e matriz)
  function ganhoModelo(a,base,cfg,fator,d0,d1){
    let g=0,t=ts(d0);const fim=ts(d1);
    while(t<fim){
      const dt=new Date(t),ds=tsData(t);
      if(preDesmama(a,ds))g+=cfg.gmdPre;
      else if(!ehMatriz(a,base,cfg,ds))g+=(ehAguas(dt.getMonth()+1,cfg)?cfg.gmdAguas:cfg.gmdSeca)*fator;
      t+=DIA;
    }
    return g;
  }
  const teto=(a,cfg)=>a.sexo==='F'?cfg.capF:cfg.capM;

  // Peso do animal numa data: interpolação entre pesos conhecidos; fora deles, modelo de GMD.
  function pesoEm(a,base,cfg,fator,d,pts){
    pts=pts||pontosDe(a,base,cfg);
    const ent=pts[0];if(!ent||d<ent.d)return null;
    const sai=pts.find(p=>p.tipo==='venda'||p.tipo==='morte');
    if(sai&&d>sai.d)return null;
    const conh=pts.filter(p=>p.kg!=null);
    let p=null,q=null;
    for(const x of conh){if(x.d<=d)p=x;else if(!q)q=x;}
    if(p&&p.d===d)return {kg:p.kg,base:p,diasDesde:0,tipo:p.tipo==='nasc'?'estimado':'medido'};
    if(p&&q){const tot=dias(p.d,q.d)||1,k=dias(p.d,d)/tot;return {kg:p.kg+(q.kg-p.kg)*k,base:p,diasDesde:dias(p.d,d),tipo:'interpolado'};}
    const cap=teto(a,cfg);
    if(p){const g=ganhoModelo(a,base,cfg,fator,p.d,d);const kg=p.kg>=cap?p.kg:Math.min(cap,p.kg+g);return {kg,base:p,diasDesde:dias(p.d,d),tipo:'estimado'};}
    if(q){const g=ganhoModelo(a,base,cfg,fator,d,q.d);return {kg:Math.max(cfg.pesoNascer,q.kg-g),base:q,diasDesde:-dias(d,q.d),tipo:'estimado'};}
    return null;
  }

  /* ---------------- calibração pelo ganho real ---------------- */
  function calibrar(base,cfg){
    let sObs=0,sPrev=0,sDias=0,n=0;const pares=[];
    for(const a of base.animais){
      const pts=pontosDe(a,base,cfg).filter(p=>p.kg!=null&&p.tipo!=='nasc');
      for(let i=1;i<pts.length;i++){
        const p=pts[i-1],q=pts[i],dd=dias(p.d,q.d);
        if(dd<30)continue;
        if(preDesmama(a,p.d)||ehMatriz(a,base,cfg,p.d))continue;
        const obs=q.kg-p.kg,gmd=obs/dd;
        if(gmd<-0.5||gmd>2)continue; // provável erro de digitação
        const prev=ganhoModelo(a,base,cfg,1,p.d,q.d);
        if(!(prev>0))continue;
        sObs+=obs;sPrev+=prev;sDias+=dd;n++;pares.push({a,p,q,gmd});
      }
    }
    const fObs=n?sObs/sPrev:null;
    let fator=1;
    if(cfg.calibrar&&n)fator=Math.min(2.5,Math.max(0.2,(n*fObs+3)/(n+3))); // poucos dados → fica perto da referência
    return {fator,fObs,n,gmdObs:sDias?sObs/sDias:null,pares};
  }

  /* ---------------- cálculos do painel ---------------- */
  // V128: categoria de mercado — bezerro(a) até N meses (sem data de nascimento: abaixo de X kg); depois, adulto
  function categoriaPreco(a,cfg,d,kg){
    const id=idadeDias(a,d||hoje());
    const jovem=id!=null?id<cfg.idadeBezerroMeses*30.4:(kg!=null&&kg<cfg.pesoBezerroKg);
    if(jovem){
      const mest=a.raca==='Mestiço';
      return {key:a.sexo==='F'?(mest?'bezerraMestica':'bezerraNelore'):(mest?'bezerroMestico':'bezerroNelore'),semRaca:!a.raca};
    }
    if(a.sexo==='F')return {key:'femeaAdulta',semRaca:false};
    return {key:a.castrado?'machoCastrado':'machoInteiro',semRaca:false};
  }
  const precoDaCat=(key,cfg)=>Number((cfg.precos||{})[key])||null;
  function precoCat(cat,cfg){
    const e=Number(cfg.precoEngorda)||null;
    if(cat==='bezerro')return {v:Number(cfg.precoBezerro)||e,fallback:!cfg.precoBezerro&&!!e};
    if(cat==='matriz')return {v:Number(cfg.precoMatriz)||e,fallback:!cfg.precoMatriz&&!!e};
    return {v:e,fallback:false};
  }
  async function precoSugerido(){
    const vs=(await getAll('lancamentos')).filter(l=>l.tipo==='receita'&&(l.origem==='venda_animais'||l.origem==='venda_animal')&&Number(l.precoArroba)>0)
      .sort((x,y)=>(y.data||'').localeCompare(x.data||''));
    return vs.length?Number(vs[0].precoArroba):null;
  }
  function rebanhoHoje(base,cfg,fator){
    const d=hoje(),d30=somaDias(d,-30);
    const linhas=[];let semPeso=[];
    for(const a of base.animais.filter(a=>a.status==='Ativo')){
      const pts=pontosDe(a,base,cfg);
      const w=pesoEm(a,base,cfg,fator,d,pts);
      if(!w){semPeso.push(a);continue;}
      const w30=pesoEm(a,base,cfg,fator,d30,pts);
      const cat=categoria(a,base,cfg,d),cp=categoriaPreco(a,cfg,d,w.kg),preco=precoDaCat(cp.key,cfg);
      linhas.push({a,kg:w.kg,w,cat,pcat:cp.key,semRaca:cp.semRaca,preco,valor:preco?kgArr(w.kg)*preco:null,ganho30:w30?w.kg-w30.kg:null});
    }
    return {linhas,semPeso};
  }
  function producaoAno(base,cfg,fator,ano){
    const ini=`${ano}-01-01`,fimAno=`${ano}-12-31`,fim=hoje()<fimAno?hoje():fimAno;
    const r={ini,fim,Wi:0,Wf:0,compras:0,vendas:0,perdas:0,nasc:0,semDados:0,nIni:0,nFim:0};
    if(ini>hoje())return r;
    for(const a of base.animais){
      const pts=pontosDe(a,base,cfg),ent=pts[0];if(!ent)continue;
      const sai=pts.find(p=>p.tipo==='venda'||p.tipo==='morte');
      const presIni=ent.d<ini&&(!sai||sai.d>=ini), presFim=ent.d<=fim&&(!sai||sai.d>fim);
      let falta=false;
      if(presIni){const w=pesoEm(a,base,cfg,fator,ini,pts);if(w){r.Wi+=w.kg;r.nIni++;}else falta=true;}
      if(presFim){const w=pesoEm(a,base,cfg,fator,fim,pts);if(w){r.Wf+=w.kg;r.nFim++;}else falta=true;}
      if(ent.d>=ini&&ent.d<=fim){
        if(ent.tipo==='nasc')r.nasc++;
        else{const w=ent.kg!=null?{kg:ent.kg}:pesoEm(a,base,cfg,fator,ent.d,pts);if(w)r.compras+=w.kg;else falta=true;}
      }
      if(sai&&sai.d>=ini&&sai.d<=fim){
        const w=pesoEm(a,base,cfg,fator,sai.d,pts);
        if(sai.tipo==='venda'){if(w)r.vendas+=w.kg;else falta=true;}
        else if(w)r.perdas+=w.kg;
      }
      if(falta)r.semDados++;
    }
    r.producaoKg=r.Wf+r.vendas-r.Wi-r.compras; // mortes ficam de fora das saídas → reduzem a produção
    return r;
  }

  /* ---------------- telas ---------------- */
  let _engAno=null;
  const cardNum=(rot,val,sub,cor)=>`<div class="fin-c"><div class="cl">${rot}</div><div class="cv"${cor?` style="color:${cor}"`:''}>${val}</div>${sub?`<div class="meta" style="font-size:11.5px;margin-top:2px">${sub}</div>`:''}</div>`;

  window.telaEngorda=async function(){
    if(!(await podeUsarApp('Engorda e pesagens')))return;
    topoPagina();if(typeof marcarNav==='function')marcarNav('painel');
    $t.dataset.syncScreen='engorda';
    const cfg=await cfgEngorda(),base=await carregar(),cal=calibrar(base,cfg),fator=cal.fator;
    _engAno=_engAno||String(new Date().getFullYear());
    const {linhas,semPeso}=rebanhoHoje(base,cfg,fator);
    const kgTot=linhas.reduce((s,l)=>s+l.kg,0);
    const temPreco=CATS_PRECO.some(([k])=>precoDaCat(k,cfg));
    const valorTot=linhas.reduce((s,l)=>s+(l.valor||0),0);
    const custoContabil=base.animais.filter(a=>a.status==='Ativo').reduce((s,a)=>s+(Number(a.custoEstoque)||0),0);
    const g30=linhas.reduce((s,l)=>s+(l.ganho30||0),0);
    const hojeM=new Date().getMonth()+1,estacao=ehAguas(hojeM,cfg)?'águas':'seca';
    const gmdAtual=(ehAguas(hojeM,cfg)?cfg.gmdAguas:cfg.gmdSeca)*fator;

    // produção do ano
    const lancs=(await getAll('lancamentos')).filter(l=>l.tipo!=='partida_contabil');
    const anos=[...new Set([...lancs.map(l=>(l.data||'').slice(0,4)),String(new Date().getFullYear())].filter(Boolean))].sort().reverse();
    const pr=producaoAno(base,cfg,fator,_engAno);
    const arrProd=kgArr(pr.producaoKg||0);
    const custosAno=lancs.filter(l=>l.tipo==='despesa'&&(l.data||'').slice(0,4)===_engAno&&l.origem!=='morte_animal').reduce((s,l)=>s+(l.valor||0),0);
    const custoArroba=arrProd>0?custosAno/arrProd:null;
    const vendasAno=lancs.filter(l=>l.tipo==='receita'&&(l.origem==='venda_animais'||l.origem==='venda_animal')&&(l.data||'').slice(0,4)===_engAno);
    let sArr=0,sVal=0;
    for(const v of vendasAno){const arr=Number(v.pesoLiquidoArroba)||(Number(v.pesoBruto)?Number(v.pesoBruto)/30:0);if(arr>0){sArr+=arr;sVal+=Number(v.precoArroba)>0?Number(v.precoArroba)*arr:(v.valor||0);}}
    const precoMedio=sArr>0?sVal/sArr:null;

    // por lote
    const lotes=await getAll('lotes');const porLote=new Map();
    for(const l of linhas){const k=l.a.loteAtualId||'__';if(!porLote.has(k))porLote.set(k,[]);porLote.get(k).push(l);}
    const htmlLotes=[...porLote.entries()].map(([k,arr])=>{
      const nome=(lotes.find(x=>x.id===k)||{}).nome||'Sem lote',kg=arr.reduce((s,l)=>s+l.kg,0),val=arr.reduce((s,l)=>s+(l.valor||0),0);
      return `<div class="card row" style="cursor:pointer" onclick="telaPesagemLote('${k}')"><div><div class="ti" style="font-size:15px">▦ ${esc(nome)}</div>
        <div class="meta">${arr.length} cab. · média ${f0(kg/arr.length)} kg (${f1(kgArr(kg/arr.length))} @)</div></div>
        <div style="text-align:right"><div style="font-weight:800">${f1(kgArr(kg))} @</div>${temPreco?`<div class="meta">${moeda(val)}</div>`:''}</div></div>`;}).join('');

    // V128: por categoria de mercado
    const semRacaN=linhas.filter(l=>l.semRaca).length;
    const htmlCats=CATS_PRECO.map(([k,nome])=>{
      const arr=linhas.filter(l=>l.pcat===k);if(!arr.length)return '';
      const kg=arr.reduce((s,l)=>s+l.kg,0),pr=precoDaCat(k,cfg);
      return `<div class="card row" style="cursor:default"><div><div class="ti" style="font-size:15px">${nome}</div>
        <div class="meta">${arr.length} cab. · ${f1(kgArr(kg))} @ · ${pr?`${moeda(pr)}/@`:'<span style="color:#b8860b;font-weight:600">sem preço</span>'}</div></div>
        <div style="font-weight:800">${pr?moeda(kgArr(kg)*pr):'—'}</div></div>`;}).join('')
      +(semRacaN?`<div class="meta" style="margin:0 4px 8px;color:#b8860b">${semRacaN} bezerro(s) sem raça informada — contados como Nelore. Corrija em Editar dados.</div>`:'');
    // vendas: margem por animal e GMD realizado
    const htmlVendas=vendasAno.sort((x,y)=>(y.data||'').localeCompare(x.data||'')).map(v=>{
      const ids=(v.animalIds&&v.animalIds.length)?v.animalIds:(v.refId?[v.refId]:[]);
      const as=ids.map(id=>base.animais.find(a=>a.id===id)).filter(Boolean);
      const n=as.length||Number(v.quantidadeAnimais)||1,marg=(v.valor||0)-(Number(v.custo)||0);
      const gmds=[],perm=[];
      for(const a of as){const pts=pontosDe(a,base,cfg),ent=pts[0],sai=pts.find(p=>p.tipo==='venda');
        if(ent&&sai){const dd=dias(ent.d,sai.d);if(dd>0){perm.push(dd);if(ent.kg!=null&&sai.kg!=null&&ent.tipo!=='nasc')gmds.push((sai.kg-ent.kg)/dd);}}}
      const med=arr=>arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:null;
      const gm=med(gmds),pm=med(perm);
      return `<div class="card"><div class="row"><div class="ti" style="font-size:14px">💰 ${fmt(v.data)} · ${n} cab.</div><div style="font-weight:800;color:${marg>=0?'var(--verde)':'var(--perigo)'}">${moeda(marg/n)}/cab.</div></div>
        <div class="meta">Venda ${moeda(v.valor||0)} − custo ${moeda(Number(v.custo)||0)} = margem ${moeda(marg)}</div>
        <div class="meta">${pm!=null?`Permanência média ${f0(pm)} dias`:''}${gm!=null?` · GMD realizado ${f2(gm)} kg/dia`:''}${v.precoArroba?` · @ ${moeda(Number(v.precoArroba))}`:''}</div></div>`;}).join('');

    const aviso=!temPreco?`<div class="card" style="border-left:4px solid #e0a800;background:#fffdf5"><b>Informe o preço da @</b><div class="meta" style="margin:4px 0 8px">Sem o preço, o painel mostra só pesos e arrobas.</div><button class="btn btn-sec" style="margin:0" onclick="formParametrosEngorda()">⚙️ Definir preços e parâmetros</button></div>`:'';
    const calTxt=cal.n?`Calibrado com <b>${cal.n}</b> comparação(ões) de peso real (compra → pesagem → venda). GMD observado: <b>${f2(cal.gmdObs)} kg/dia</b>. Fator aplicado à referência: <b>${f2(fator)}</b>${cfg.calibrar?'':' (calibração desligada)'}.`
      :'Ainda sem comparações de peso real (precisa de 2 pesos do mesmo animal com 30+ dias de intervalo, como compra e venda). Usando o GMD de referência.';

    $t.innerHTML=`<button class="voltar" onclick="telaPainel()">‹ Gestão Operacional</button>
      <div class="sechead"><span class="sic">⚖️</span><h2>Engorda e pesagens</h2></div>
      <div class="meta" style="margin:-6px 4px 12px">Painel gerencial: estimativas para acompanhar a engorda. Não altera a contabilidade nem o resultado.</div>
      <div class="lado"><button class="btn" onclick="escolherLotePesagem()">⚖️ Pesagem do lote</button><button class="btn btn-sec" onclick="formParametrosEngorda()">⚙️ Parâmetros</button></div>
      ${aviso}
      <div class="h3">Rebanho hoje</div>
      <div class="fin-cards">
        ${cardNum('⚖️ Peso estimado',`${f1(kgArr(kgTot))} @`,`${f0(kgTot)} kg vivos · ${linhas.length} cab.`)}
        ${cardNum('📏 Peso médio',linhas.length?`${f1(kgArr(kgTot/linhas.length))} @`:'—',linhas.length?`${f0(kgTot/linhas.length)} kg/cab.`:'')}
        ${cardNum('📈 Ganho em 30 dias',`${f1(kgArr(g30))} @`,`${f0(g30)} kg (estimado)`,'var(--verde)')}
        ${cardNum('🌦 GMD atual',`${f2(gmdAtual)} kg/dia`,`referência de ${estacao}${fator!==1?' × calibração':''}`)}
        ${temPreco?cardNum('💰 Valor estimado a mercado',moeda(valorTot),'peso ÷ 30 × preço da @'):''}
        ${cardNum('🧾 Custo contábil do rebanho',moeda(custoContabil),'o que foi pago pelos animais')}
        ${temPreco?cardNum('🌱 Valorização não realizada',moeda(valorTot-custoContabil),'engorda + mercado, ainda não vendida',valorTot-custoContabil>=0?'var(--verde)':'var(--perigo)'):''}
      </div>
      <div class="card" style="cursor:default"><div class="meta" style="line-height:1.5">${calTxt}</div></div>
      ${semPeso.length?`<div class="card" style="border-left:4px solid #e0a800;cursor:default"><b>${semPeso.length} animal(is) sem nenhum peso</b><div class="meta" style="margin-top:4px">Comprados sem peso registrado e sem pesagem. Ficam fora das somas até uma pesagem (a fita serve): ${semPeso.slice(0,8).map(a=>esc(rotulo(a))).join(', ')}${semPeso.length>8?'…':''}</div></div>`:''}

      <div class="h3" style="display:flex;justify-content:space-between;align-items:center">Produção do ano
        <select style="max-width:110px;margin:0" onchange="window._engAnoSel(this.value)">${anos.map(a=>`<option ${a===_engAno?'selected':''}>${a}</option>`).join('')}</select></div>
      <div class="fin-cards">
        ${cardNum('🐂 @ produzidas',`${f1(arrProd)} @`,`${f0(pr.producaoKg||0)} kg de ganho líquido`,'var(--verde)')}
        ${cardNum('🧾 Custos + despesas do ano',moeda(custosAno),'sem investimentos e sem perdas por morte')}
        ${cardNum('⚙️ Custo da @ produzida',custoArroba!=null?moeda(custoArroba):'—',arrProd>0?'custos ÷ @ produzidas':'sem produção no período')}
        ${cardNum('🏷 Preço médio da @ vendida',precoMedio!=null?moeda(precoMedio):'—',precoMedio!=null?`${f1(sArr)} @ vendidas`:'sem vendas no ano')}
        ${custoArroba!=null&&precoMedio!=null?cardNum('📊 Margem por @',moeda(precoMedio-custoArroba),'preço médio − custo da @',precoMedio-custoArroba>=0?'var(--verde)':'var(--perigo)'):''}
      </div>
      <div class="card" style="cursor:default"><div class="meta" style="line-height:1.6">
        <b>Como foi calculado (${fmt(pr.ini)} a ${fmt(pr.fim)})</b><br>
        Rebanho no fim: ${f0(pr.Wf)} kg (${pr.nFim} cab.) + vendido: ${f0(pr.vendas)} kg<br>
        − rebanho no início: ${f0(pr.Wi)} kg (${pr.nIni} cab.) − comprado: ${f0(pr.compras)} kg<br>
        = <b>${f0(pr.producaoKg||0)} kg</b> produzidos${pr.nasc?` (inclui ${pr.nasc} nascimento(s))`:''}.${pr.perdas?` Mortes levaram ${f0(pr.perdas)} kg, que ficam fora.`:''}${pr.semDados?` ${pr.semDados} animal(is) sem peso ficaram de fora.`:''}</div></div>
      ${htmlCats?`<div class="h3">Por categoria</div>${htmlCats}`:''}
      ${htmlLotes?`<div class="h3">Por lote</div>${htmlLotes}`:''}
      ${htmlVendas?`<div class="h3">Vendas de ${_engAno} · margem por animal</div>${htmlVendas}`:''}`;
  };
  window._engAnoSel=a=>{_engAno=a;telaEngorda();};

  window.formParametrosEngorda=async function(){
    const c=await cfgEngorda(),sug=await precoSugerido();
    const v=x=>x==null||x===''?'':String(x).replace('.',',');
    const mes=(id,sel)=>`<select id="${id}">${MESES_ABREV.map((m,i)=>`<option value="${i+1}" ${i+1===Number(sel)?'selected':''}>${m}</option>`).join('')}</select>`;
    abrir(`<h2>⚙️ Parâmetros da engorda</h2>
      <div class="meta">Ficam salvos neste aparelho. Ajuste para a realidade da sua região.</div>
      <div class="h3" style="margin-left:0">Preço da arroba (R$/@)</div>
      <div class="meta" style="margin:-4px 0 4px">${sug?`Referência: sua última venda foi a ${moeda(sug)}/@.`:'Deixe em branco a categoria que você não tem.'}</div>
      <div class="lado"><div><label>Bezerro Nelore</label><input id="pe_bezerroNelore" inputmode="decimal" value="${v(c.precos.bezerroNelore)}" placeholder="R$/@"></div>
        <div><label>Bezerra Nelore</label><input id="pe_bezerraNelore" inputmode="decimal" value="${v(c.precos.bezerraNelore)}" placeholder="R$/@"></div></div>
      <div class="lado"><div><label>Bezerro Mestiço</label><input id="pe_bezerroMestico" inputmode="decimal" value="${v(c.precos.bezerroMestico)}" placeholder="R$/@"></div>
        <div><label>Bezerra Mestiça</label><input id="pe_bezerraMestica" inputmode="decimal" value="${v(c.precos.bezerraMestica)}" placeholder="R$/@"></div></div>
      <div class="lado"><div><label>Macho adulto inteiro</label><input id="pe_machoInteiro" inputmode="decimal" value="${v(c.precos.machoInteiro)}" placeholder="R$/@"></div>
        <div><label>Macho adulto castrado</label><input id="pe_machoCastrado" inputmode="decimal" value="${v(c.precos.machoCastrado)}" placeholder="R$/@"></div></div>
      <label>Fêmea adulta</label><input id="pe_femeaAdulta" inputmode="decimal" value="${v(c.precos.femeaAdulta)}" placeholder="R$/@">
      <div class="lado"><div><label>Bezerro(a) até (meses)</label><input id="pe_ib" inputmode="decimal" value="${v(c.idadeBezerroMeses)}"></div>
        <div><label>Sem data de nasc.: até (kg)</label><input id="pe_pbk" inputmode="decimal" value="${v(c.pesoBezerroKg)}"></div></div>
      <div class="meta" style="margin-top:6px">Acima dessa idade (ou peso, se o animal não tem data de nascimento) conta como adulto. A raça vem do cadastro do animal.</div>
      <div class="h3" style="margin-left:0">GMD de referência (kg/dia)</div>
      <div class="lado"><div><label>Águas</label><input id="pe_ga" inputmode="decimal" value="${v(c.gmdAguas)}"></div><div><label>Seca</label><input id="pe_gs" inputmode="decimal" value="${v(c.gmdSeca)}"></div></div>
      <div class="lado"><div><label>Águas começam em</label>${mes('pe_ma',c.mesAguas)}</div><div><label>Seca começa em</label>${mes('pe_ms',c.mesSeca)}</div></div>
      <label>Bezerro antes da desmama (kg/dia)</label><input id="pe_gp" inputmode="decimal" value="${v(c.gmdPre)}">
      <label>Calibrar pelo ganho real dos seus animais</label><select id="pe_cal"><option value="1" ${c.calibrar?'selected':''}>Sim (recomendado)</option><option value="0" ${!c.calibrar?'selected':''}>Não — usar só a referência</option></select>
      <div class="h3" style="margin-left:0">Limites</div>
      <div class="lado"><div><label>Peso ao nascer (kg)</label><input id="pe_pn" inputmode="decimal" value="${v(c.pesoNascer)}"></div><div><label>Vira matriz com (meses)</label><input id="pe_im" inputmode="decimal" value="${v(c.idadeMatrizMeses)}"></div></div>
      <div class="lado"><div><label>Peso máximo fêmea (kg)</label><input id="pe_cf" inputmode="decimal" value="${v(c.capF)}"></div><div><label>Peso máximo macho (kg)</label><input id="pe_cm" inputmode="decimal" value="${v(c.capM)}"></div></div>
      <div class="meta" style="margin-top:8px">Matrizes (fêmeas adultas ou com cria) mantêm o peso: não entram no cálculo de engorda.</div>
      <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarParametrosEngorda()">Salvar</button></div>`);
  };
  window.salvarParametrosEngorda=async function(){
    const n=(id,min,max)=>{const x=numCampo(id);return x==null?null:(x<min||x>max?NaN:x);};
    const precos={};for(const [k] of CATS_PRECO){const x=n('pe_'+k,1,5000);if(Number.isNaN(x))return alert('Preço fora da faixa esperada. Confira os campos.');precos[k]=x;}
    const novo={precos,idadeBezerroMeses:n('pe_ib',1,36),pesoBezerroKg:n('pe_pbk',50,500),
      gmdAguas:n('pe_ga',0,2),gmdSeca:n('pe_gs',-0.5,2),gmdPre:n('pe_gp',0,2),pesoNascer:n('pe_pn',10,80),
      idadeMatrizMeses:n('pe_im',12,60),capF:n('pe_cf',150,900),capM:n('pe_cm',150,1200),
      mesAguas:Number(val('pe_ma')),mesSeca:Number(val('pe_ms')),calibrar:val('pe_cal')==='1'};
    if(Object.values(novo).some(x=>Number.isNaN(x)))return alert('Algum valor está fora da faixa esperada. Confira os campos.');
    for(const k of ['gmdAguas','gmdSeca','gmdPre','pesoNascer','idadeMatrizMeses','capF','capM','idadeBezerroMeses','pesoBezerroKg'])if(novo[k]==null)delete novo[k];
    if(novo.mesAguas===novo.mesSeca)return alert('O início das águas e da seca precisam ser meses diferentes.');
    await salvarCfgEngorda(novo);fechar();telaEngorda();
  };

  /* ---------------- pesagens ---------------- */
  const optMetodo=sel=>Object.entries(METODOS).map(([k,t])=>`<option value="${k}" ${k===sel?'selected':''}>${t}</option>`).join('');
  async function gravarPesagem(animalId,data,kg,metodo,obs){
    const det=`${f1(kg)} kg · ${METODOS[metodo]||metodo}${obs?` · ${obs}`:''}`;
    await registrarEvento(animalId,'Pesagem',data,det,{pesoKg:kg,metodoPesagem:metodo});
  }
  window.formPesagemAnimal=async function(id){
    const a=await get('animais',id);if(!a)return;
    const cfg=await cfgEngorda(),base=await carregar(),fator=calibrar(base,cfg).fator,w=pesoEm(a,base,cfg,fator,hoje());
    abrir(`<h2>⚖️ Pesagem — ${esc(rotulo(a))}</h2>
      ${w?`<div class="meta" style="margin-bottom:8px">Estimativa atual: <b>${f0(w.kg)} kg</b> (${f1(kgArr(w.kg))} @)</div>`:''}
      <label>Peso (kg vivo) *</label><input id="pz_kg" inputmode="decimal" placeholder="Ex: 420">
      <label>Como foi medido</label><select id="pz_met">${optMetodo('fita')}</select>
      <label>Data</label><input id="pz_data" type="date" value="${hoje()}">
      <label>Observação (opcional)</label><input id="pz_obs" placeholder="Ex: fita no perímetro torácico, após jejum…">
      <div class="meta" style="margin-top:6px">Na fita de pesagem, leia o valor direto na escala em kg.</div>
      <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="salvarPesagemAnimal('${id}')">Salvar</button></div>`);
  };
  window.salvarPesagemAnimal=async function(id){
    const kg=numCampo('pz_kg');if(kg==null||kg<10||kg>1500)return alert('Informe um peso entre 10 e 1500 kg.');
    const data=val('pz_data')||hoje();if(data>hoje())return alert('A data da pesagem não pode ser no futuro.');
    await gravarPesagem(id,data,kg,val('pz_met')||'fita',val('pz_obs'));fechar();verAnimal(id);
  };
  window.escolherLotePesagem=async function(){
    const lotes=await getAll('lotes'),ativos=(await getAll('animais')).filter(a=>a.status==='Ativo');
    const opts=lotes.map(l=>{const n=ativos.filter(a=>a.loteAtualId===l.id).length;return n?`<option value="${l.id}">${esc(l.nome)} — ${n} cab.</option>`:'';}).join('');
    if(!opts)return alert('Nenhum lote com animais ativos.');
    abrir(`<h2>⚖️ Pesagem do lote</h2><label>Lote</label><select id="pl_lote">${opts}</select>
      <div class="meta" style="margin-top:8px">Não precisa pesar todos: pesar 4 ou 5 animais por lote de vez em quando já corrige as estimativas.</div>
      <div class="lado" style="margin-top:18px"><button class="btn btn-sec" onclick="fechar()">Cancelar</button><button class="btn" onclick="fechar();telaPesagemLote(val('pl_lote'))">Continuar</button></div>`);
  };
  window.telaPesagemLote=async function(loteId){
    if(!loteId||loteId==='__')return escolherLotePesagem();
    topoPagina();
    const l=await get('lotes',loteId),cfg=await cfgEngorda(),base=await carregar(),fator=calibrar(base,cfg).fator;
    const as=base.animais.filter(a=>a.status==='Ativo'&&a.loteAtualId===loteId).sort((x,y)=>(x.codigo||0)-(y.codigo||0));
    const itens=as.map(a=>{const w=pesoEm(a,base,cfg,fator,hoje());
      return `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--linha);gap:10px"><div style="min-width:0"><b>${esc(rotuloCod(a))}</b>
        <div class="meta">${w?`estimado ${f0(w.kg)} kg`:'sem peso'}</div></div>
        <input class="pl_kg" data-id="${a.id}" inputmode="decimal" placeholder="kg" style="max-width:96px;margin:0" oninput="window._plMedia()"></div>`;}).join('');
    $t.innerHTML=`<button class="voltar" onclick="telaEngorda()">‹ Engorda e pesagens</button>
      <div class="sechead"><span class="sic">⚖️</span><h2>Pesagem — ${esc(l?l.nome:'Lote')}</h2></div>
      <div class="card"><div class="lado"><div><label>Data</label><input id="pl_data" type="date" value="${hoje()}"></div><div><label>Método</label><select id="pl_met">${optMetodo('fita')}</select></div></div>
        <div class="meta" style="margin-top:8px">Preencha só os animais pesados. Os outros continuam estimados.</div></div>
      <div class="card">${itens||'<div class="meta">Nenhum animal ativo neste lote.</div>'}<div id="pl_media" class="meta" style="margin-top:10px"></div></div>
      <button class="btn" onclick="salvarPesagemLote('${loteId}')">Salvar pesagens</button>`;
  };
  window._plMedia=()=>{const vs=[...document.querySelectorAll('.pl_kg')].map(e=>{const s=(e.value||'').replace(',','.');return Number(s);}).filter(v=>v>0);
    const el=document.getElementById('pl_media');if(el)el.textContent=vs.length?`${vs.length} pesado(s) · média ${f0(vs.reduce((s,v)=>s+v,0)/vs.length)} kg`:'';};
  window.salvarPesagemLote=async function(loteId){
    const data=val('pl_data')||hoje(),met=val('pl_met')||'fita';
    if(data>hoje())return alert('A data da pesagem não pode ser no futuro.');
    const itens=[...document.querySelectorAll('.pl_kg')].map(e=>{let s=(e.value||'').trim();if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return {id:e.dataset.id,kg:s?Number(s):null};}).filter(x=>x.kg!=null);
    if(!itens.length)return alert('Informe o peso de pelo menos um animal.');
    if(itens.some(x=>!(x.kg>=10&&x.kg<=1500)))return alert('Há peso fora da faixa de 10 a 1500 kg. Confira.');
    for(const x of itens)await gravarPesagem(x.id,data,x.kg,met,'');
    alert(`${itens.length} pesagem(ns) registrada(s).`);telaEngorda();
  };

  /* ---------------- ficha do animal: peso estimado ---------------- */
  const verAnimal0=window.verAnimal;
  window.verAnimal=async function(id){
    const r=await verAnimal0.apply(this,arguments);
    try{
      const a=await get('animais',id);if(!a)return r;
      const cfg=await cfgEngorda(),base=await carregar(),fator=calibrar(base,cfg).fator;
      const d=a.status==='Ativo'?hoje():(a.saida&&a.saida.data)||hoje();
      const w=pesoEm(a,base,cfg,fator,d);
      const cp=categoriaPreco(a,cfg,d,w?w.kg:null),pr={v:precoDaCat(cp.key,cfg)};
      const nomes={};const cat='x';nomes[cat]=NOME_CAT[cp.key]+(cp.semRaca?' (raça não informada)':'');
      const baseTxt=w?(w.tipo==='medido'?`medido em ${fmt(w.base.d)}`:w.tipo==='interpolado'?`entre pesos de ${fmt(w.base.d)} e o seguinte`
        :`${w.base.tipo==='compra'?'peso de compra':w.base.tipo==='nasc'?'peso ao nascer (padrão)':w.base.tipo==='venda'?'peso de venda':`${METODOS[w.base.metodo]||'pesagem'}`} em ${fmt(w.base.d)}${w.diasDesde>0?` + ${w.diasDesde} dias de GMD`:''}`):'';
      const box=document.createElement('div');
      box.className='card';box.style.cssText='cursor:default;border-left:4px solid var(--verde)';
      box.innerHTML=w?`<div class="row"><div><div class="meta">${a.status==='Ativo'?'Peso estimado hoje':'Peso na saída'} · ${nomes[cat]}</div>
          <div class="ti" style="font-size:20px">${f0(w.kg)} kg <span class="meta" style="font-size:14px">(${f1(kgArr(w.kg))} @)</span></div>
          <div class="meta">Base: ${esc(baseTxt)}</div></div>
          ${pr.v&&a.status==='Ativo'?`<div style="text-align:right"><div class="meta">Valor estimado</div><b>${moeda(kgArr(w.kg)*pr.v)}</b></div>`:''}</div>`
        :`<b>Sem peso registrado</b><div class="meta">Registre uma pesagem (a fita serve) para estimar o peso deste animal.</div>`;
      const primeiro=$t.querySelector('.card');if(primeiro)primeiro.insertAdjacentElement('afterend',box);
      const acoes=$t.querySelector('.animal-actions');
      if(acoes&&a.status==='Ativo'){const b=document.createElement('button');b.className='btn btn-sec';b.textContent='⚖️ Registrar pesagem';b.onclick=()=>formPesagemAnimal(id);acoes.insertAdjacentElement('afterbegin',b);}
    }catch(e){console.error('Peso do animal V120:',e);}
    return r;
  };

  /* ---------------- atalho em Relatórios ---------------- */
  const rel0=window.finRelatorios;
  if(typeof rel0==='function')window.finRelatorios=async function(){
    const r=await rel0.apply(this,arguments);
    try{
      if(!document.getElementById('btn-engorda-v120')){
        const b=document.createElement('button');b.id='btn-engorda-v120';b.className='btn btn-sec';b.style.margin='0 0 16px';
        b.innerHTML='⚖️ Engorda: @ produzidas, custo da @ e valor estimado';
        b.onclick=()=>{aba='painel';telaEngorda();};
        const ref=document.getElementById('btn-historico-contabil')||$t.querySelector('.fintabs');
        if(ref)ref.insertAdjacentElement('afterend',b);
      }
    }catch(e){}
    return r;
  };

  window._engordaV120={cfgEngorda,carregar,calibrar,pesoEm,producaoAno,rebanhoHoje,pontosDe}; // para diagnóstico
})();
