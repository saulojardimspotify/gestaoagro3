# Gestão do Rebanho — arquitetura e organização dos arquivos

PWA de arquivo estático (sem build), publicado pelo GitHub Pages a partir da branch `main`.
Os dados ficam no aparelho (IndexedDB) e são sincronizados com o Supabase quando há internet.

## Pastas

```
index.html              Estrutura da página (topo, tela, menu inferior, janela) e a ordem dos scripts
manifest.json           Dados do app instalado (nome, cores, ícones)
sw.js                   Service worker: cache offline, versão do app e atualização automática
css/estilo.css          Todo o visual do app
img/                    Ícones do app e a imagem do boi
js/app/                 Núcleo do app, dividido por assunto (ver tabela abaixo)
js/modulos/             Módulos que acrescentam ou ajustam funções do núcleo (carregados depois dele)
desativados/            Código guardado e NÃO carregado (Engorda e pesagens — ver LEIA-ME)
testes/                 Testes automáticos no navegador (não fazem parte do app publicado)
ARQUITETURA.md          Este arquivo
CLAUDE.md               Regras de trabalho (versão, publicação, cuidados)
```

## Ordem de carregamento (importa!)

Todos os arquivos são **scripts clássicos**: funções e variáveis de nível superior são globais e
compartilhadas entre arquivos. Por isso a ordem do `index.html` é a ordem de execução:

1. `js/app/01…16` — núcleo (dados, utilidades, telas, histórico de navegação).
2. `js/modulos/01…17` — módulos. Muitos **substituem** uma função do núcleo guardando a original
   (ex.: `const base=window.telaEstoque; window.telaEstoque=async function(){…}`). Um módulo só pode
   ajustar o que já foi carregado antes dele.
3. `js/app/99-iniciar.js` — liga o histórico de navegação, abre o banco, desenha a primeira tela e
   registra o service worker. Fica por último para que a primeira tela já use todos os módulos.

O `sw.js` acrescenta `?v=VERSÃO` a cada `<script src="js/…">` e ao css. Isso força o download da
versão nova e é de onde vem o "Versão N" da tela inicial. Sem service worker (primeira abertura),
os arquivos carregam sem `?v` e a versão é lida direto do `sw.js`.

## Núcleo — `js/app/`

| Arquivo | Conteúdo |
|---|---|
| 01-config-conta.js | Endereço e chave do Supabase, sessão (login), `sbFetch`, permissões de uso |
| 02-banco-local.js | IndexedDB: `abrirDB`, `get`, `getAll`, `put`, `del` (com metadados de sincronização) |
| 03-utilidades-constantes.js | Datas, moeda, rótulos de animal, raças, categorias, estoque/medicamentos, migração de medicamentos |
| 04-interface-base.js | Janela (`abrir`/`fechar`), ícones SVG (`ico`), menu inferior, tela de login |
| 05-instalar-primeiros-passos.js | Tela "Instalar o app" e cadastro inicial obrigatório |
| 06-inicio.js | Página inicial: pendências, atalhos, Rebanho hoje, Financeiro, nascidos |
| 07-painel-pastos-avisos.js | Gestão Operacional (módulos), pastos, avisos e próximas doses |
| 08-lotes-animais.js | Lotes e Grupos, lote, lista e ficha do animal |
| 09-perfil-nuvem-sincronizacao.js | Perfil, conta, sincronização (envio/recebimento) e backup na nuvem |
| 10-formularios.js | Cadastros de propriedade, marca e lote |
| 11-financeiro.js | Resumo, lançamentos, relatórios e custos de produção por lote |
| 12-estoque.js | Estoque de insumos: itens, entradas, consumos, ficha e foto do item |
| 13-grupos-pastos-cadastros.js | Grupos, cadastro de pastos, saída e edição do animal |
| 14-manejo-medicamentos.js | Manejo, aplicação de medicamento integrada ao estoque, troca de lote |
| 15-backup.js | Backup manual em arquivo |
| 16-navegacao.js | Histórico de telas: o "‹ Voltar" volta à tela anterior com filtros, busca e rolagem |
| 99-iniciar.js | Inicialização e registro do service worker |

## Módulos — `js/modulos/`

| Arquivo | O que faz | Funções que substitui/cria |
|---|---|---|
| 01-troca-lote-ajustes.js | Correções visuais da troca de lote no iPhone | (CSS e textos) |
| 02-troca-lote.js | Fluxo guiado de troca de lote | `telaTrocaLote` e auxiliares |
| 03-perfil-backup.js | Textos e visual da área de backup do Perfil | (CSS) |
| 04-perfil-limpeza.js | Remove a seção Cadastros do Perfil | (DOM) |
| 05-inicio-menu-limpeza.js | Simplifica o menu + | `menuAdicionar` |
| 06-saida-animais.js | Venda/morte individual, múltipla, por lote ou grupo | `formSaida`, `blocoSaida` |
| 07-calculadora-pecuaria.js | Calculadora da Pecuária: valor da negociação, ponto de equilíbrio da recria/engorda e macho ou fêmea | `telaPainel`, `telaCalculadora*`, `ptEquilibrio`, `compararMachoFemea` |
| 08-saida-menu.js | Página Venda / Morte de Animal | `telaVendaMorteAnimal` |
| 09-venda-financeiro.js | Cálculo único da venda e integração com o Financeiro | `formLancamento`, `salvarVendaV92` |
| 10-financeiro-classificacao.js | Natureza (receita/custo/despesa/investimento) e apropriação | `formLancamento`, `finResumo`, `finLancamentos` |
| 11-animais-baixados.js | Vendidos/mortos fora da lista ativa | `telaAnimais`, `telaAnimaisBaixados` |
| 12-lancamentos-estoque-ui.js | Filtros do financeiro, pagamentos, lista do estoque, consumo com destino | `telaEstoque`, `salvarConsumoInsumo`, `finLancamentos` |
| 13-compra-animal.js | Cálculo da compra no cadastro do animal | `formNovoAnimal`, `salvarAnimal` |
| 14-contabilidade.js | Livro Diário: partidas automáticas, estornos, baixa por morte | `put`, `del`, `finRelatorios`, `formNovoAnimal` |
| 15-busca-versao.js | Busca no Livro Diário e "Versão N" na tela inicial | `telaInicio`, `finHistoricoContabil` |
| 16-gestao-dados.js | Edição de operações e reinício dos dados | `editarOperacaoV116`, `resetTotalV116` |
| 17-perfil-gestao.js | Botão "Gerenciar dados" no Perfil | `gerenciarDadosV116` |

## Navegação e botão "‹ Voltar" (V157)

- Toda função que desenha uma tela inteira está em `TELAS_NAVEGACAO` (`16-navegacao.js`). Ao abrir uma
  tela, a anterior vai para uma pilha com o valor dos campos (filtros, busca, marcações) e a rolagem.
- Qualquer botão `class="voltar"` da tela usa essa pilha. O `onclick` escrito no botão só vale quando não há
  histórico (ex.: entrou pelo menu de baixo) e indica a tela "mãe".
- Menu de baixo e tela Início começam pilha nova; as abas do Financeiro contam como uma tela só.
- Tela nova: incluir o nome em `TELAS_NAVEGACAO` e o título em `TITULOS_NAVEGACAO`.

## Dados e sincronização

- Stores do IndexedDB que sincronizam: `SYNC_STORES` em `02-banco-local.js`. **Não criar store nova**
  (o Supabase tem CHECK de `store_name`); campos novos vão dentro dos registros (payload).
- Cada registro tem `updated_at`, `deleted_at` (exclusão lógica), `sync_status` e `sync_version`.
- Sincronização (`09-perfil-nuvem-sincronizacao.js`): envia pendências → recebe novidades.
  Regra de conflito: **vale a versão mais nova do registro inteiro** (pelo `updated_at`). Antes de
  enviar, o app confere a nuvem (V154): se lá já existe versão mais nova, ela é baixada e a local
  antiga não é enviada. Edições em campos diferentes do mesmo registro, feitas ao mesmo tempo em dois
  aparelhos, não são mescladas: fica a mais recente.
- Contabilidade: partidas ficam em `lancamentos` com `tipo:"partida_contabil"` — toda soma/lista de
  lançamentos deve filtrá-las.

## Como incluir um arquivo .js novo

1. Criar em `js/app/` (núcleo) ou `js/modulos/` (ajuste de função existente), com cabeçalho explicando.
2. Incluir a tag `<script src="…">` no `index.html` na posição certa.
3. Incluir o caminho na lista `ARQUIVOS` do `sw.js`, na mesma ordem.
4. Rodar `python3 testes/conferir_arquivos.py` (confere index × sw.js × disco).
