# Recursos desativados

Código guardado para uso futuro. Os arquivos desta pasta **não são carregados pelo app**.

## Engorda e pesagens (desativado na V129)

Arquivo: `engorda-v120.js`. A última versão com o módulo ligado está guardada no ramo
`guardado-engorda-v128` (V128).

**O que o módulo fazia**
- Pesagem individual e do lote (balança, fita ou visual), gravada como evento "Pesagem".
- Peso estimado de cada animal: interpolação entre pesos conhecidos (compra, pesagens, venda) e,
  depois do último, GMD de águas/seca calibrado pelos ganhos reais dos próprios animais.
- Painel gerencial: peso e valor estimado do rebanho, ganho em 30 dias, @ produzidas no ano,
  custo da @ produzida, margem por @, por categoria, por lote e margem por venda.
- Preço da @ por categoria (bezerro/bezerra Nelore e Mestiço, macho inteiro, macho castrado, fêmea adulta).
- Parâmetros ficam em `perfil` → `config.engorda` (só no aparelho, não sincroniza).

**O que continua no app mesmo desativado**
- O campo Raça do animal e o filtro por raça.
- Eventos "Pesagem" já registrados continuam no histórico dos animais (como texto).
- A contabilidade não depende deste módulo (modelo de custo, sem "ganho a realizar").

**Como reativar**
1. Mover `desativados/engorda-v120.js` de volta para a raiz do repositório.
2. No `sw.js`, incluir `engorda-v120.js` nas duas listas (`CORE` e `scripts`) e acrescentar
   `<script src="engorda-v120.js?v=${APP_VERSION}"></script>` no fim da linha de scripts injetados.
3. No `index.html`, no grupo "Rebanho" da Gestão Operacional, voltar o cartão:
   `${mod("⚖️","Engorda e pesagens","Pesagens, peso estimado, @ produzidas e custo da @.","telaEngorda()")}`
4. Subir a versão (regra do CLAUDE.md) e publicar.
