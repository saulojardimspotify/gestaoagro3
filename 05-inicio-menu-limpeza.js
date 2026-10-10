/* V91 — simplificação da tela inicial e do menu + (Adicionar). */
(()=>{
  function limparInicio(){
    // Remove o título/subtítulo redundantes da Home e o quadro explicativo inferior.
    document.querySelectorAll('.home-title,.home-hint').forEach(el=>el.remove());
  }

  // Reaplica após cada renderização das telas do app.
  let agendado=false;
  const agendar=()=>{
    if(agendado)return;
    agendado=true;
    requestAnimationFrame(()=>{agendado=false;limparInicio();});
  };
  new MutationObserver(agendar).observe(document.body,{childList:true,subtree:true});
  limparInicio();

  // O menu + passa a concentrar somente ações gerais que fazem sentido aqui.
  window.menuAdicionar=async function(){
    if(!(await podeUsarApp('Adicionar dados')))return;
    abrir(`<h2>Adicionar</h2>
      <div class="sheet-item rt" onclick="fechar();formSaida()"><span class="si">↩️</span>Saída de animal</div>
      <div class="sheet-item rt" onclick="fechar();gerenciarMarcas()"><span class="si">🏷️</span>Marcas / donos</div>
      <div class="sheet-item rt" onclick="fechar();formNovaPropriedade()"><span class="si">🏡</span>Nova propriedade</div>
      <button class="btn btn-sec" style="margin-top:14px" onclick="fechar()">Cancelar</button>`);
  };
})();