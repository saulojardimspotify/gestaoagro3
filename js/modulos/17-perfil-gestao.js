/* V117 — move "Gerenciar dados e reiniciar" do Histórico contábil para Perfil > Nuvem e segurança. Hotfix: não depende de $t exposto em window. */
(()=>{
  const BTN_ID='btn-gerenciar-v117';

  function raiz(){
    return document.getElementById('tela') || document.querySelector('main') || document.body;
  }

  function tituloPerfil(){
    return [...raiz().querySelectorAll('h1,h2,h3')].find(el=>/Nuvem e (segurança|backup)/i.test((el.textContent||'').trim()));
  }

  function removerDoHistorico(){
    document.getElementById('btn-gerenciar-v116')?.remove();
    const r=raiz();
    const historico=[...r.querySelectorAll('h1,h2,h3')].some(el=>/Histórico contábil/i.test((el.textContent||'').trim()));
    if(!historico)return;
    [...r.querySelectorAll('button')].forEach(btn=>{
      if(/Gerenciar dados e reiniciar/i.test(btn.textContent||''))btn.remove();
    });
  }

  function inserirNoPerfil(){
    const titulo=tituloPerfil();
    if(!titulo||document.getElementById(BTN_ID))return;
    const cloud=document.getElementById('cloudAccountBox');
    const btn=document.createElement('button');
    btn.id=BTN_ID;
    btn.className='btn btn-sec';
    btn.style.cssText='margin-top:14px;margin-bottom:4px;width:100%';
    btn.innerHTML='⚙️ Gerenciar dados e reiniciar';
    btn.setAttribute('aria-label','Gerenciar e reiniciar dados da conta');
    btn.onclick=()=>{
      if(typeof window.gerenciarDadosV116==='function')window.gerenciarDadosV116();
      else alert('A área de gerenciamento de dados não foi carregada. Atualize o aplicativo e tente novamente.');
    };
    if(cloud)cloud.insertAdjacentElement('afterend',btn);
    else (titulo.closest('.sechead')||titulo).insertAdjacentElement('afterend',btn);
  }

  function atualizarVersao(){
    const v=document.getElementById('app-versao');
    if(v&&window.APP_VERSAO)v.textContent='Versão '+window.APP_VERSAO; // V124: não fixa mais "117"
  }

  function aplicar(){
    removerDoHistorico();
    inserirNoPerfil();
    atualizarVersao();
  }

  let agendado=false;
  function agendar(){
    if(agendado)return;
    agendado=true;
    requestAnimationFrame(()=>{agendado=false;aplicar();});
  }

  new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true});
  aplicar();
  setTimeout(aplicar,200);
  setTimeout(aplicar,700);
  setTimeout(aplicar,1600);
})();
