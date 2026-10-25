# Bloco 42 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Limpeza única feita: só dois SHAs por imagem do Lotus no host; volume `901f0f78…` e `/opt/lotus/prova-certificado.php` removidos; `lotus-prod-disco` em OK. | manual |  |  |
| 2 | journald com teto de 200 MB e apt com limpeza periódica, aplicados no host. | manual |  |  |
| 3 | Janela manual feita: pacotes aplicados, kernel novo rodando, seis contêineres de pé, alarmes religados. | `producao GET /up -> 200` |  |  |
| 4 | Reboot automático ligado no host, às 08:30 UTC, depois da janela. | manual |  |  |
| 5 | S3: lifecycle e política aplicados e lidos de volta; negações provadas; órfãos removidos com a lista registrada; desfazer provado num objeto de teste. | manual |  |  |
| 6 | Scripts de `deploy/bin/` reinstalados no host depois do merge. | manual |  |  |
| 7 | Promoção real depois do merge, com o host guardando só dois SHAs por imagem do Lotus. | manual |  |  |
| 8 | Backup diário do dia seguinte saiu pelo script novo, visto no `/var/log/lotus-backup.log`. | manual |  |  |
