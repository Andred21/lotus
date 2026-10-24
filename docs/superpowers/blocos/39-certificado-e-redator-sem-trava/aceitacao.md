# Bloco 39 — aceitação externa

Gerado por `.claude/scripts/aceitacao.sh` a partir da seção `## Verificação externa` da spec do
bloco. Pendente é o item manual com `Resultado` vazio ou com `Data` fora de `AAAA-MM-DD`, e o
automático cuja última medição não deu OK. O `conferir` mede de novo toda prova automática e
sobrescreve o que estiver escrito nela. O item manual é do João: feita a ação, escreva em
`Resultado` o que aconteceu e em `Data` o dia, em `AAAA-MM-DD` — o script nunca julga o texto. Um
`|` dentro de célula se escreve `\|`.

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | O Drive (requisitos, `Viagem Chile/Projetos/Lotus.cl/V2`) descreve a RN-09 como aviso que não trava a designação, conforme `ruling-rn09.md`. Ação do João. | manual | Feito pelo João: `requisitos-negocio.md` (V2) com a RN-09 reescrita. Habilitação ao curso e REUF válido viram motivos de aviso ("não habilitado ao curso", "REUF ausente ou vencido"). A designação pede confirmação e grava o motivo na auditoria. Seguem travando turma concluída (RN-15) e redator arquivado. Conforme `ruling-rn09.md`. | 2026-10-24 |
| 2 | O merge do 39 chega a produção pelo espelho corporativo e pela promoção pelo botão (ações do João). Em produção, um curso sem template emite certificado, e o QR desse certificado valida. É o mesmo smoke do runbook `deploy/aws/README.md` §15, passo 3, que a aceitação do 13 refaz (o `uuid` só existe depois da emissão). | manual | Espelho corporativo `e28fdc52` (Source-Commit `dfa34847`, que contém o merge do 39), CI corporativo verde, promovido pelo botão no run `40110133589`; `CURRENT_SHA` = `e28fdc52` e `/up` 200. Smoke `SMOKE-GOLIVE` do runbook §15, passo 3, num curso recém-criado e sem template: emitiu `LOT-2026-1000`, uuid `717b82d8-cf03-4b32-bfee-68ac720944a0`. O QR aberto fora da sessão mostrou "Certificado válido", e `GET /api/publico/certificados/<uuid>` respondeu 200. | 2026-10-24 |
