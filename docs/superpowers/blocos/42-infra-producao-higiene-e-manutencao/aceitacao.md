# Bloco 42 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Limpeza única feita: só dois SHAs por imagem do Lotus no host; volume `901f0f78…` e `/opt/lotus/prova-certificado.php` removidos; `lotus-prod-disco` em OK. | manual | Poda com o script da lane: ficaram `61dde89d` (atual) e `e28fdc52` (rollback) nos três repositórios, 34 imagens saíram; volume `901f0f78…` e `prova-certificado.php` removidos; disco de 88% para 56%; `lotus-prod-disco` em OK às 18:40 UTC. | 2026-10-27 |
| 2 | journald com teto de 200 MB e apt com limpeza periódica, aplicados no host. | manual | `lotus.conf` (`SystemMaxUse=200M`) e `52lotus-limpeza` (`AutocleanInterval "7"`) iguais ao `user-data.sh`; journal em 198,9M; cache do apt de 117M para 12K. | 2026-10-27 |
| 3 | Janela manual feita: pacotes aplicados, kernel novo rodando, seis contêineres de pé, alarmes religados. | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-27 |
| 4 | Reboot automático ligado no host, às 08:30 UTC, depois da janela. | manual | `53lotus-reboot` gravado às 18:48 UTC, depois da janela: `Automatic-Reboot "true"` às 08:30, fuso `Etc/UTC`, `WithUsers` no default (`true`); nada agendado. | 2026-10-27 |
| 5 | S3: lifecycle e política aplicados e lidos de volta; negações provadas; órfãos removidos com a lista registrada; desfazer provado num objeto de teste. | manual | As três regras do lifecycle e a política aplicadas e, lidas de volta, iguais às versionadas; o simulador deu as 18 combinações da tabela e a chamada real foi recusada com `AccessDenied` (explicit deny); 12 órfãos removidos, com a lista no `execucao-producao.md`, recálculo vazio e nenhum caminho do banco sem arquivo; desfazer provado no `probes/bloco42-teste.txt`. Saída de emergência pelo IAM (o `JoaoVBA` cria uma chave do `lotus-infra`), sem login da raiz, por decisão do João. | 2026-10-27 |
| 6 | Scripts de `deploy/bin/` reinstalados no host depois do merge. | manual |  |  |
| 7 | Promoção real depois do merge, com o host guardando só dois SHAs por imagem do Lotus. | manual |  |  |
| 8 | Backup diário do dia seguinte saiu pelo script novo, visto no `/var/log/lotus-backup.log`. | manual |  |  |
