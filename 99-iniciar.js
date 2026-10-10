/* Gestão do Rebanho — js/app/99-iniciar.js
   Inicialização do app (carregado depois dos módulos) e registro do service worker.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= INICIAR ======================= */
abrirDB().then(async()=>{
  // V60: primeiro abre a interface usando o IndexedDB local.
  // Supabase/sincronização rodam depois e nunca podem deixar a tela em branco.
  await numerarSemCodigo(); await migrarMedicamentosParaEstoque(); // V133/V142
  await renderSeguro();
  checarNotificacoes();
  iniciarSyncEmSegundoPlano();
}).catch((e)=>{
  console.error("Erro ao abrir IndexedDB:",e);
  $t.innerHTML=`<div class="vazio"><b>Erro ao abrir o banco.</b><div class="meta">Use um navegador normal (não janela privada).</div></div>`;});

/* Registra o service worker -> faz o app funcionar offline (sem sinal) */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(err=>console.log('SW falhou:',err));
  });
}
