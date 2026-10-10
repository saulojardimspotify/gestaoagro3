# Testes automáticos

Rodam no Chromium sem interface (Playwright), servindo o app localmente. Não fazem parte do app publicado.

Preparação (uma vez): `npm i -g playwright` (o Chromium já precisa estar instalado).

```bash
# na raiz do repositório
python3 -m http.server 8765 &                 # serve o app
python3 testes/conferir_arquivos.py           # index.html × sw.js × disco
NODE_PATH=$(npm root -g) node testes/sincronizacao_dois_aparelhos.js
```

`sincronizacao_dois_aparelhos.js` abre dois "aparelhos" com o mesmo usuário e um Supabase simulado em
memória e confere 7 situações: criação, edição offline mais antiga (não pode sobrescrever a mais nova),
edição offline mais nova (vale), criação offline, exclusão, exclusão antiga × edição nova e pendências.
