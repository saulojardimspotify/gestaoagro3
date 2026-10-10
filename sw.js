/* Service Worker do "Gestão do Rebanho"
   - Guarda os arquivos do app para funcionar sem internet.
   - A cada versão nova (APP_VERSION), troca o cache e atualiza os aparelhos sozinho.
   - Acrescenta ?v=APP_VERSION aos <script src="js/..."> e ao css do index.html: força o
     navegador a baixar a versão nova e é de onde vem o "Versão N" da tela inicial.
   Regras de versão e de arquivos novos: ver CLAUDE.md e ARQUITETURA.md. */

const CACHE = "rebanho-v160-preco-femea";
const APP_VERSION = "160";

// Todos os arquivos do app (mesma ordem do index.html). Arquivo .js novo: incluir aqui E no index.html.
const ARQUIVOS = [
  "./index.html", "./manifest.json", "./css/estilo.css",
  "./img/icon.png", "./img/icon-192.png", "./img/icon-512.png", "./img/icon-maskable-512.png", "./img/boi.png",
  "./js/app/01-config-conta.js", "./js/app/02-banco-local.js", "./js/app/03-utilidades-constantes.js",
  "./js/app/04-interface-base.js", "./js/app/05-instalar-primeiros-passos.js", "./js/app/06-inicio.js",
  "./js/app/07-painel-pastos-avisos.js", "./js/app/08-lotes-animais.js", "./js/app/09-perfil-nuvem-sincronizacao.js",
  "./js/app/10-formularios.js", "./js/app/11-financeiro.js", "./js/app/12-estoque.js",
  "./js/app/13-grupos-pastos-cadastros.js", "./js/app/14-manejo-medicamentos.js", "./js/app/15-backup.js", "./js/app/16-navegacao.js",
  "./js/modulos/01-troca-lote-ajustes.js", "./js/modulos/02-troca-lote.js", "./js/modulos/03-perfil-backup.js",
  "./js/modulos/04-perfil-limpeza.js", "./js/modulos/05-inicio-menu-limpeza.js", "./js/modulos/06-saida-animais.js",
  "./js/modulos/07-calculadora-pecuaria.js", "./js/modulos/08-saida-menu.js", "./js/modulos/09-venda-financeiro.js",
  "./js/modulos/10-financeiro-classificacao.js", "./js/modulos/11-animais-baixados.js", "./js/modulos/12-lancamentos-estoque-ui.js",
  "./js/modulos/13-compra-animal.js", "./js/modulos/14-contabilidade.js", "./js/modulos/15-busca-versao.js",
  "./js/modulos/16-gestao-dados.js", "./js/modulos/17-perfil-gestao.js",
  "./js/app/99-iniciar.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Recarrega as telas abertas para que usem a versão nova.
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) {
      try { const u = new URL(c.url); if (u.origin === self.location.origin) { u.searchParams.set("appv", APP_VERSION); await c.navigate(u.href); } } catch (_) {}
    }
  })());
});

// Pequeno script colocado no index.html: procura atualização ao abrir/voltar ao app e recarrega quando chega versão nova.
function atualizadorInline() {
  return `<script>(function(){if(!('serviceWorker' in navigator))return;var recarregando=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(recarregando)return;recarregando=true;var u=new URL(location.href);u.searchParams.set('appv','${APP_VERSION}');location.replace(u.href);});function checar(){navigator.serviceWorker.getRegistration().then(function(r){if(r)r.update();}).catch(function(){});}window.addEventListener('load',checar);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checar();});window.addEventListener('online',checar);setInterval(function(){if(document.visibilityState==='visible')checar();},30000);})();<\/script>`;
}

// Baixa o index.html, carimba ?v=VERSÃO nos arquivos do app e guarda a cópia para uso offline.
async function paginaAtual(request) {
  const res = await fetch(request, { cache: "no-store" });
  if (!res.ok) return res;
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
  let html = await res.text();
  html = html.replace(/(<script\s+src=["'])(js\/[^"'?]+\.js)(?:\?[^"']*)?(["'])/gi, `$1$2?v=${APP_VERSION}$3`);
  html = html.replace(/(<link\s+rel=["']stylesheet["']\s+href=["'])(css\/[^"'?]+\.css)(?:\?[^"']*)?(["'])/gi, `$1$2?v=${APP_VERSION}$3`);
  html = html.replace(/<\/body>/i, `${atualizadorInline()}</body>`);
  const headers = new Headers(res.headers);
  headers.delete("content-length"); headers.delete("content-encoding"); headers.set("cache-control", "no-store");
  const out = new Response(html, { status: res.status, statusText: res.statusText, headers });
  const c = await caches.open(CACHE); await c.put("./index.html", out.clone());
  return out;
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // Supabase e outros domínios: direto na rede
  // Página: sempre tenta a versão mais nova; sem internet, usa a última guardada.
  if (e.request.mode === "navigate") {
    e.respondWith(paginaAtual(e.request).catch(async () => await caches.match("./index.html") || Response.error()));
    return;
  }
  // Arquivo com ?v=: rede primeiro; sem internet, a cópia guardada (com ou sem o ?v).
  if (url.searchParams.has("v")) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
      return res;
    }).catch(async () => await caches.match(e.request) || await caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  // Demais arquivos: cache primeiro.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  })));
});

self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING" || e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "CHECK_UPDATE" || e.data?.type === "CHECK_UPDATE") self.registration.update();
});
