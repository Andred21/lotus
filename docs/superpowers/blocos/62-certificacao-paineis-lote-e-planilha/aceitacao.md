# Bloco 62 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Depois do deploy, o João baixa em produção o ZIP de uma turma real e a planilha da mesma turma, anota o tempo do ZIP, e confere que o container do Gotenberg não reiniciou nem foi morto por memória (`docker inspect` com `RestartCount` e `OOMKilled`), com a saída colada e conferida. | manual |  |  |
