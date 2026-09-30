/* V83 — correções mobile e de texto na troca de lote. */
(()=>{
  if(!document.getElementById('troca-v82-fix-style')){
    const st=document.createElement('style');
    st.id='troca-v82-fix-style';
    st.textContent=`
      .troca-lista{
        max-height:none !important;
        height:auto !important;
        overflow:visible !important;
        -webkit-overflow-scrolling:auto !important;
        touch-action:pan-y !important;
      }
      .troca-sticky{
        position:static !important;
        bottom:auto !important;
        z-index:auto !important;
        background:transparent !important;
        backdrop-filter:none !important;
        -webkit-backdrop-filter:none !important;
        padding:14px 0 4px !important;
        margin-top:4px !important;
      }
      #tl_lista_v81{overflow:visible !important;}
      .troca-animal-v81{min-height:58px;}
    `;
    document.head.appendChild(st);
  }

  function corrigirPlural(root=document){
    const els=root.querySelectorAll ? root.querySelectorAll('option,.meta,select') : [];
    els.forEach(el=>{
      if(el.tagName==='SELECT') return;
      const t=el.textContent||'';
      if(!t.includes('animal(is)') && !t.includes('selecionado(s)')) return;
      const m=t.match(/(\d+)\s+animal\(is\)/);
      if(!m) return;
      const n=Number(m[1]);
      let novo=t.replace(/(\d+)\s+animal\(is\)/,`${n} ${n===1?'animal':'animais'}`);
      novo=novo.replace('selecionado(s)',n===1?'selecionado':'selecionados');
      el.textContent=novo;
    });
  }
  corrigirPlural();
  const obs=new MutationObserver(()=>corrigirPlural());
  obs.observe(document.body,{childList:true,subtree:true});
})();