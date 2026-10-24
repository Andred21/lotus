# Bloco 38 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | `--simular` em produção com contagens iguais às do relatório aprovado e nenhum conflito (§9, passos 2 a 4). | manual | `CURRENT_SHA` `e28fdc52` (espelho de `dfa34847`, com o merge do 38). Antes, o banco foi esvaziado de novo, por decisão do João, para tirar o smoke do bloco 13 (ledger `limpeza` 18:08:12Z, dump `…/backups/lotus-2026-10-24T18-04-44-antes-da-limpeza-38.sql.gz`). Isso aconteceu depois do `--final` do 13; a aceitação do 13 espera só a resposta da Lotus (item 6), que não toca o banco. `db:show --counts` antes da carga: `users` 2 e as tabelas de domínio em 0. `--simular` `exit=0`: "A criar" igual ao relatório aprovado (1 cliente, 59 alunos, 3 redatores, 8 documentos, 6 cursos, 32 módulos, 12 orçamentos, 12 cotações, 10 turmas, 111 matrículas e 111 certificados), "Já existe" 0 e nenhum conflito. O código de saída da primeira rodada se perdeu, e o `exit=0` é o da segunda, de tabela idêntica. | 2026-10-24 |
| 2 | Backup manual antes da carga, listado no S3 (§9, passo 5). | manual | `backup ok: s3://lotus-prod-760144413534/backups/lotus-2026-10-24T18-31-48-antes-da-carga-38.sql.gz`, listado por `aws s3 ls` com 8482 B às 18:31:50. É o rollback da carga. | 2026-10-24 |
| 3 | Carga real feita, contagens por tabela iguais às do relatório, segunda execução sem mudança (§9, passo 6). | manual | Carga real com `exit=0` e "Carga gravada" igual ao ensaio. `db:show --counts` depois: `users` 65 (2 de antes e 63 da carga), `clients` 1, `client_addresses` 1, `client_contacts` 1, `students` 59, `student_client_logs` 59, `redatores` 3, `course_redator` 8, `files` 8, `courses` 6, `course_modules` 32, `budgets` 12, `quotes` 12, `turmas` 10, `turma_redator` 10, `enrollments` 111, `certificates` 111. `certificate_sequences` 1 continua intocado, e `audits` passou de 7 para 450. Segunda execução com `exit=0`: "A criar" 0 em todas as linhas, "Já existe" com as contagens acima e sem a linha `modulos`. | 2026-10-24 |
| 4 | Um certificado importado de cada curso abre em `/validar` e gera o PDF (§9, passo 7). | manual | Conferido pelo João pela UI: `LOT-2026-001` (051#), `LOT-2026-017` (035#), `LOT-2026-021` (201#), `LOT-2026-038` (200#) e `LOT-2026-055` (202#) passaram no passo 7 e geraram o PDF. | 2026-10-24 |
| 5 | Pasta de dados removida do host (§9, passo 8). | manual | `rm -rf /opt/lotus/carga-inicial`, e o `ls /opt/lotus` seguinte não lista mais `carga-inicial`. | 2026-10-24 |
