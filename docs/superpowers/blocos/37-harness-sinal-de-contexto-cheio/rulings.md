# Bloco 37 — decisões tomadas na execução

Uma decisão por linha, com o que custa se estiver errada.

- **Passo 5.1 (pipeline de profundidade 1) não usado.** O plano não tem grupos paralelos, então
  cada revisor rodou em sequência, na árvore da lane, sem worktree efêmera. Custo se errado: nenhum
  na correção, só tempo de relógio.
- **Revisão final da branch despachada antes da Task 4.** A Task 4 é só evidência, com o João numa
  sessão à parte, sem código. Custo se errado: o `revisor-branch` não viu o `prova-disparo.md`;
  o `/revisar-bloco` vê.
- **Onda única de correção da revisão final.** Entraram juntos o I1 (`unset LOTUS_CONTEXTO_LIMIAR`
  na suíte), o M1 (casos `abc` e `0` medindo 160000, que prendem um mutante vivo provado) e o M2
  (comentário do hook com a causa da spec). Saíram do texto copiado do plano, no commit `dbd34892`.
  Custo se errado: um commit a mais no hook e no teste, reversível.
- **M3 parado.** O caso 14 não prende a ausência de `statusMessage` nem o `timeout: 15`. Custo se
  errado: um `statusMessage` acrescentado depois piscaria a cada ferramenta sem a suíte reprovar.
- **M4 parado.** A spec fala em uma leitura e um `jq`, mas são até 5 `jq` por chamada. Medido:
  28 ms num transcript de 45 MB. Custo se errado: latência por ferramenta.
- **M5 parado.** A checagem e a criação da marca não são atômicas. Não se reproduziu em 5 rodadas
  de 4 hooks concorrentes. Custo se errado: um aviso duplicado raro (~60 tokens).
- **Minors adiados 2 a 5 ficam.** São eles: soma fracionária descartada, linhas da árvore com mais
  de 100 colunas no `estrutura-monolito.md`, saída da bancada quebrada sem aviso no
  `prova-catraca.md` e vermelho/verde só com o placar. Custo se errado: cosmético.
- **Task 4 só depois da correção.** Assim o `prova-disparo.md` registra o SHA final. Custo se
  errado: só atraso.
- **Disparo aceito como prova sem saber qual chamada o emitiu.** A interface juntou as duas
  chamadas de Bash numa linha e mostrou o aviso uma vez. O plano pede "depois de qual chamada", e
  o registro diz que não dá para distinguir. Custo se errado: a prova de que a segunda chamada
  não repete fica indireta (o aviso aparece uma vez só, mas sem a ordem).
