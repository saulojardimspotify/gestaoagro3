/* V86 — correções definitivas da troca de lote no iPhone. */
(()=>{
  function aplicarFix(){
    let st=document.getElementById('troca-v86-mobile');
    if(!st){
      st=document.createElement('style');
      st.id='troca-v86-mobile';
      st.textContent=`
        html,body{overflow-y:auto !important;-webkit-overflow-scrolling:touch !important;touch-action:pan-y !important;}
        main,#tela,#tl_lista_v81,.troca-lista{
          max-height:none !important;height:auto !important;
          overflow-y:visible !important;overflow-x:visible !important;
          touch-action:pan-y !important;overscroll-behavior:auto !important;
        }
        .troca-lista{margin-top:10px !important;border-top:1px solid var(--linha) !important;}
        .troca-sticky{
          position:static !important;inset:auto !important;bottom:auto !important;
          z-index:1 !important;background:transparent !important;
          backdrop-filter:none !important;-webkit-backdrop-filter:none !important;
          padding:18px 0 8px !important;margin:0 !important;
        }
        .troca-animal-v81{min-height:62px !important;touch-action:pan-y !important;}
        #tl_lista_v81{padding-bottom:8px !important;}
      `;
      document.head.appendChild(st);
    }else{
      // move a folha de correção para o fim do head: ela sempre vence o CSS do core.
      document.head.appendChild(st);
    }
    const root=document.getElementById('tl_lista_v81');
    if(root){
      root.style.cssText+=';max-height:none!important;height:auto!important;overflow:visible!important;touch-action:pan-y!important;';
      const lista=root.querySelector('.troca-lista');
      if(lista)lista.style.cssText+=';max-height:none!important;height:auto!important;overflow:visible!important;touch-action:pan-y!important;';
      const sticky=root.querySelector('.troca-sticky');
      if(sticky)sticky.style.cssText+=';position:static!important;bottom:auto!important;';
    }
  }

  function corrigirTextos(root=document){
    root.querySelectorAll?.('option,.meta,button,b,small,span').forEach(el=>{
      if(el.children.length) return;
      let t=el.textContent||'';
      let novo=t;
      novo=novo.replace(/(\d+)\s+animal\(is\)/g,(_,n)=>`${n} ${Number(n)===1?'animal':'animais'}`);
      novo=novo.replace(/(\d+)\s+selecionado\(s\)/g,(_,n)=>`${n} ${Number(n)===1?'selecionado':'selecionados'}`);
      novo=novo.replace(/(\d+)\s+animalis\b/gi,(_,n)=>`${n} ${Number(n)===1?'animal':'animais'}`);
      if(novo!==t)el.textContent=novo;
    });
  }

  const obs=new MutationObserver(()=>{aplicarFix();corrigirTextos();});
  obs.observe(document.body,{childList:true,subtree:true,characterData:true});

  const core=document.createElement('script');
  core.src='troca-v81-core.js?v=86';
  core.onload=()=>{
    aplicarFix();corrigirTextos();
    // O core é carregado depois; reaplica no próximo frame para garantir a ordem do CSS no Safari/iOS.
    requestAnimationFrame(()=>{aplicarFix();corrigirTextos();});
    setTimeout(()=>{aplicarFix();corrigirTextos();},100);
  };
  document.head.appendChild(core);
})();