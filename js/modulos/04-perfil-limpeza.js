/* V90 — Perfil: remove a seção Cadastros, mantendo os cadastros acessíveis pelas áreas operacionais. */
(()=>{
  function aplicar(){
    // Remove apenas os três atalhos que pertencem ao bloco Cadastros do Perfil.
    document.querySelectorAll('button[onclick="gerenciarMarcas()"],button[onclick="gerenciarMedicamentos()"],button[onclick="formNovaPropriedade()"]').forEach(btn=>{
      const tela=btn.closest('#tela') || document.getElementById('tela');
      // Só remove quando estivermos no Perfil: o Resumo e a área de nuvem aparecem juntos nessa tela.
      if(tela && [...tela.querySelectorAll('h2,.ti')].some(el=>(el.textContent||'').trim()==='Resumo') &&
         [...tela.querySelectorAll('h2')].some(el=>/^(Nuvem e backup|Nuvem e segurança)$/.test((el.textContent||'').trim()))){
        btn.remove();
      }
    });

    // Remove o título "Cadastros" somente da tela de Perfil.
    document.querySelectorAll('.sechead h2').forEach(h=>{
      if((h.textContent||'').trim()!=='Cadastros') return;
      const tela=h.closest('#tela') || document.getElementById('tela');
      if(!tela) return;
      const temResumo=[...tela.querySelectorAll('.ti')].some(el=>(el.textContent||'').trim()==='Resumo');
      const temNuvem=[...tela.querySelectorAll('h2')].some(el=>/^(Nuvem e backup|Nuvem e segurança)$/.test((el.textContent||'').trim()));
      if(temResumo && temNuvem) h.closest('.sechead')?.remove();
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