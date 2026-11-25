# Bloco 63 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | Trocar `CERTIFICATE_VALIDATION_URL` para `https://lotusotec.cl` no `.env` de produção em `/opt/lotus`, **antes** do deploy. A checagem de alinhamento só compara nomes de chave, e o container `app` só lê o valor novo quando o deploy o recria. | manual |  |  |
| 2 | Copiar por `scp` o `deploy/nginx/tls.conf` do SHA a promover para `/opt/lotus/nginx/`, **antes** do botão. Sem isso a checagem de alinhamento recusa o deploy pelo sha256 do `tls.conf`. O nginx em execução só carrega o arquivo novo no deploy. | manual |  |  |
| 3 | Deploy do bloco em produção (merge na `main`, espelho para o corporativo, botão de deploy). O QR antigo passa a responder `301`. Antes do deploy, o mesmo caminho responde `200` pelo fallback do SPA. | `producao GET /validar/00000000-0000-0000-0000-000000000000 -> 301` |  |  |
| 4 | Decodificar com `pdftoppm` + `zbarimg` o QR do primeiro certificado real emitido depois do deploy: ele leva a `https://lotusotec.cl/validar/<uuid>`, e a página do site abre com o estado certo. Fecha a P-89. | manual |  |  |
