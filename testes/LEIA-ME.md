# Testes automáticos

Rodam no Chromium sem interface (Playwright), servindo o app localmente. Não fazem parte do app publicado.

Preparação (uma vez): `npm i -g playwright` (o Chromium já precisa estar instalado).

```bash
# na raiz do repositório
python3 -m http.server 8765 &                 # serve o app
python3 testes/conferir_arquivos.py           # index.html × sw.js × disco + css bem formado
NODE_PATH=$(npm root -g) node testes/sincronizacao_dois_aparelhos.js
NODE_PATH=$(npm root -g) node testes/navegacao_voltar.js
NODE_PATH=$(npm root -g) node testes/animais_servico.js
NODE_PATH=$(npm root -g) node testes/venda_selecao_fotos.js
```

`sincronizacao_dois_aparelhos.js` abre dois "aparelhos" com o mesmo usuário e um Supabase simulado em
memória e confere 7 situações: criação, edição offline mais antiga (não pode sobrescrever a mais nova),
edição offline mais nova (vale), criação offline, exclusão, exclusão antiga × edição nova e pendências.

`navegacao_voltar.js` confere o "‹ Voltar": grupo → animal → volta ao grupo; lista de animais com filtro,
busca e rolagem preservados; lote → animal; Início → Estoque → Início; e sem ciclo quando não há histórico.

`animais_servico.js` (V178) confere o cavalo fora do rebanho (listas, lotação, análise), remédio do estoque
pelo formulário de aplicação, consumo de ração, gasto manual a prazo, edição pelo Financeiro, exclusão com
volta ao estoque e estorno, relatório por categoria e as telas sem NaN/undefined.

`venda_selecao_fotos.js` (V179) confere a venda escolhendo os animais pela foto: cartões com foto, busca e
contador em Venda › Selecionar animais, miniaturas nos dados da venda, venda direto da seleção da página do
lote (volta para o lote), lançamentos/partidas e os outros modos de venda.
