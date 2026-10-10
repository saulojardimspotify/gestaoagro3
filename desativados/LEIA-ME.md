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

**Como reativar** (estrutura de pastas da V154)
1. Mover `desativados/engorda-v120.js` para `js/modulos/18-engorda.js`.
2. No `index.html`, acrescentar `<script src="js/modulos/18-engorda.js"></script>` logo depois de
   `17-perfil-gestao.js` (antes de `js/app/99-iniciar.js`).
3. No `sw.js`, incluir `"./js/modulos/18-engorda.js"` na lista `ARQUIVOS`, na mesma posição.
4. Em `js/app/07-painel-pastos-avisos.js`, no grupo "Rebanho e Manejo", voltar o cartão:
   `${mod(ico("boi"),"Engorda e pesagens","Pesagens, peso estimado, @ produzidas e custo da @.","telaEngorda()")}`
5. Rodar `python3 testes/conferir_arquivos.py`.
6. Subir a versão (regra do CLAUDE.md) e publicar.
