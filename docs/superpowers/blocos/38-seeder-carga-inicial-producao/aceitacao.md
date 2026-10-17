# Bloco 38 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | `--simular` em produção com contagens iguais às do relatório aprovado e nenhum conflito (§9, passos 2 a 4). | manual |  |  |
| 2 | Backup manual antes da carga, listado no S3 (§9, passo 5). | manual |  |  |
| 3 | Carga real feita, contagens por tabela iguais às do relatório, segunda execução sem mudança (§9, passo 6). | manual |  |  |
| 4 | Um certificado importado de cada curso abre em `/validar` e gera o PDF (§9, passo 7). | manual |  |  |
| 5 | Pasta de dados removida do host (§9, passo 8). | manual |  |  |
