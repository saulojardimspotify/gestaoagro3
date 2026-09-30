/* V89 — textos e hierarquia visual da área de segurança/backup do Perfil. */
(()=>{
  const STYLE_ID='perfil-backup-v87-style';
  if(!document.getElementById(STYLE_ID)){
    const st=document.createElement('style');
    st.id=STYLE_ID;
    st.textContent=`
      .backup-recuperar-v87{border-color:#B7791F !important;color:#8A5A00 !important;background:#FFFBF2 !important;}
      .backup-nota-v88{
        width:100% !important;
        max-width:none !important;
        box-sizing:border-box !important;
        grid-column:1 / -1 !important;
        flex:0 0 100% !important;
        align-self:stretch !important;
        margin:10px 0 0 !important;
        padding:10px 12px !important;
        border:1px solid #F0D89B !important;
        border-radius:12px !important;
        background:#FFF8E8 !important;
        color:#8A5A00 !important;
        font-size:12.5px !important;
        line-height:1.35 !important;
        text-align:left !important;
      }
    `;
    document.head.appendChild(st);
  }

  function aplicar(){
    document.querySelectorAll('.backup-aviso-v87').forEach(el=>el.remove());

    document.querySelectorAll('h1,h2,h3,.ti,.meta,.cloud-note,div,span').forEach(el=>{
      if(el.children.length) return;
      const t=(el.textContent||'').trim();
      if(t==='Nuvem e backup') el.textContent='Nuvem e segurança';
      else if(t==='Backup manual') el.textContent='Cópia externa';
      else if(t.startsWith('Último backup na nuvem:')) el.textContent=t.replace('Último backup na nuvem:','Última cópia de segurança:');
      else if(t==='Nenhum backup salvo ainda.') el.textContent='Nenhuma cópia externa salva ainda.';
      else if(t.includes('Use o arquivo .json como cópia extra de segurança ou para transferência manual.')) el.textContent='Use o arquivo .json como uma cópia extra de segurança ou para transferência manual.';
    });

    document.querySelectorAll('button').forEach(btn=>{
      const t=(btn.textContent||'').replace(/\s+/g,' ').trim();
      if(t.includes('Backup na nuvem')){
        btn.innerHTML='☁️ Criar cópia de segurança';
        btn.setAttribute('aria-label','Criar cópia de segurança na nuvem');
      }
      if(t.includes('Restaurar backup')){
        btn.innerHTML='↥ Recuperar cópia anterior';
        btn.setAttribute('aria-label','Recuperar cópia de segurança anterior');
        btn.classList.add('backup-recuperar-v87');
      }
      if(t.includes('Baixar backup (.json)')){
        btn.innerHTML='⬇️ Baixar cópia (.json)';
        btn.setAttribute('aria-label','Baixar cópia de segurança em arquivo JSON');
      }
    });

    const recuperar=[...document.querySelectorAll('button')].find(btn=>(btn.textContent||'').includes('Recuperar cópia anterior'));
    if(recuperar){
      const linha=recuperar.parentElement;
      if(linha){
        let nota=linha.querySelector('.backup-nota-v88');
        if(!nota){
          nota=document.createElement('div');
          nota.className='backup-nota-v88';
          nota.innerHTML='⚠️ <strong>A recuperação substitui os dados locais deste aparelho.</strong>';
          linha.appendChild(nota);
        }
        // Garante largura total mesmo se o contêiner usar grid ou flex.
        nota.style.gridColumn='1 / -1';
        nota.style.width='100%';
        nota.style.flexBasis='100%';
      }
    }

    document.querySelectorAll('.cloud-note,p,div').forEach(el=>{
      if(el.children.length) return;
      const t=(el.textContent||'').trim();
      if(t.startsWith('A V80 mantém a sincronização automática')){
        el.textContent='A sincronização mantém seus dados atualizados entre aparelhos. A cópia de segurança serve como uma proteção adicional para recuperação.';
      }
    });
  }

  let agendado=false;
  function agendar(){
    if(agendado)return;
    agendado=true;
    requestAnimationFrame(()=>{agendado=false;aplicar();});
  }
  new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true});
  aplicar();
})();
