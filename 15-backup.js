/* Gestão do Rebanho — js/app/15-backup.js
   Backup manual (arquivo) e controle de backup.
   Script clássico: as funções e variáveis de nível superior são globais e compartilhadas
   com os demais arquivos. A ordem de carregamento está no index.html. */

/* ======================= BACKUP ======================= */
async function dadosBackup(){
  const d={versao:6,exportadoEm:new Date().toISOString(),syncSchemaVersion:SYNC_SCHEMA_VERSION};
  // Preserva também tombstones e metadados necessários à futura sincronização.
  for(const s of DATA_STORES)d[s]=await getAllRaw(s);
  return d;
}
async function exportar(){
  const d=await dadosBackup();
  const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");
  a.href=u;a.download=`rebanho-backup-${hoje()}.json`;a.click();URL.revokeObjectURL(u);
  await marcarBackup();
}
/* --- Config / controle de backup --- */
async function getConfig(){return (await get("perfil","config"))||{id:"config"};}
async function marcarBackup(){const c=await getConfig();c.id="config";c.ultimoBackup=Date.now();await put("perfil",c);}
const diasDesde=ts=>ts?Math.floor((Date.now()-ts)/86400000):null;
async function salvarFreq(v){const c=await getConfig();c.id="config";c.lembreteDias=parseInt(v,10)||7;await put("perfil",c);}
/* --- Salvar na nuvem: abre o compartilhamento do iPhone (Salvar em Arquivos → iCloud) --- */
async function salvarNuvem(){
  const d=await dadosBackup();
  const blob=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
  const file=new File([blob],`rebanho-backup-${hoje()}.json`,{type:"application/json"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file],title:"Backup do Rebanho"});
      await marcarBackup(); _lembreteOculto=true;
      if(aba==="perfil")telaPerfil(); else if(aba==="painel")telaPainel();
    }catch(e){/* usuário cancelou o compartilhamento */}
  }else{
    await exportar(); _lembreteOculto=true;
    alert("Seu navegador não abre o compartilhamento de arquivos. O backup foi baixado — mova para o iCloud Drive pelo app Arquivos.");
  }
}
async function restaurarDadosBackup(d,pedirConfirmacao=true){
  if(!d||typeof d!=="object")throw new Error("Backup inválido.");
  if(pedirConfirmacao&&!confirm("Importar substitui TODOS os dados atuais. Continuar?"))return false;
  for(const s of DATA_STORES){
    for(const it of await getAllRaw(s))await hardDel(s,it.id);
    for(const original of(d[s]||[])){
      const it={...original}, agora=agoraISO();
      if(!it.created_at)it.created_at=agora;
      if(!it.updated_at)it.updated_at=it.created_at;
      if(it.deleted_at===undefined)it.deleted_at=null;
      if(SYNC_STORES.includes(s)){
        const org=await activeOrgIdLocal();
        if(org)it.organization_id=org;
        it.sync_status="pending_create";
      }else if(!it.sync_status)it.sync_status="pending_create";
      if(!Number.isFinite(it.sync_version))it.sync_version=1;
      await putRaw(s,it);
    }
  }
  await numerarSemCodigo(); await migrarMedicamentosParaEstoque(); // V133/V142
  return true;
}
function importar(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();
  r.onload=async()=>{try{
    const d=JSON.parse(r.result);
    const ok=await restaurarDadosBackup(d,true); if(!ok)return;
    alert("Backup importado.");renderSeguro();
  }catch(e){alert("Arquivo inválido.");}};r.readAsText(f);}
