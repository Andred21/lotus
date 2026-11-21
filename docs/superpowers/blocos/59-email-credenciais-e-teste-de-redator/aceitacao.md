# Bloco 59 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Production access do SES aprovado em `sa-east-1`. | manual | Readback `get-account`: `ProductionAccessEnabled` true, `GRANTED`, caso 179408306900526, 50 000/24 h e 14/s (`audit.md`, Fase D) | 2026-11-20 |
| 2 | Sonda entregue a um endereço `@prismusai.com` e a um Gmail não verificado, com SPF, DKIM e DMARC `pass`. | manual | SPF, DKIM (`lotusotec.cl` e `amazonses.com`) e DMARC `pass` em `prismusai.com` (Hostinger) e no Gmail não verificado (`audit.md`, Fase D) | 2026-11-20 |
| 3 | Checklist do redator percorrido em produção com as contas 252 e 253. | manual | Percorrido 16:01–16:25 com trava D14 no navegador; sem defeito novo nem gravação (`audit.md`, Fase C) | 2026-11-13 |
| 4 | Senhas de teste limpas nas contas 252 e 253, conferidas por leitura (impressão digital e sessões). | manual | H2=H3, hash ≠ H0 e H1, sessoes=0, convites/resets inalterados (`audit.md`, Fase C) | 2026-11-13 |
| 5 | Aviso ao `lotus-site` sobre o fim do teto do sandbox entregue. | manual | Entregue por mensagem entre sessões à sessão `lotus-site-6d`, 2026-11-21 01:00; incluiu que `sitio@` e `lotus@` não existem no Workspace | 2026-11-21 |
