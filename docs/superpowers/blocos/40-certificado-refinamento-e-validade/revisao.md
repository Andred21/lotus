# 40 — Revisão

## Em aberto

- **Q-1 · Crítico** — correção aprovada pelo João em 2026-10-30, ainda por aplicar: `AppButton`
  nasce `type="button"`, todo botão que envia declara `type="submit"` (varrer os usos atuais), e
  um teste com o `AppSignatureUpload` real prova que Confirmar, Cancelar e Ver não chamam o `put`.
  Aplicar reabre a revisão (rodada 2).

## Rodada 1 — `07579e04..b6ec5050` — 2026-10-30 · Lente 1: opus · Lente 2: sonnet

A lente Codex do Passo 4 (bloco de alto risco: certificado) **não rodou**. O `codex-companion`
recusou o modelo duas vezes: `The 'gpt-5.5' model is not supported when using Codex with a
ChatGPT account.` (o modelo do `~/.codex/config.toml`) e a mesma recusa para `--model gpt-5.4`.
A rodada se apoia só na lente 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Crítico | Os botões do campo da firma da gerente (Confirmar e Cancelar da prévia, Ver, Descargar e Quitar) não declaram `type` e ficam dentro do `<form>` do painel. O `Button` do PrimeReact renderiza `<button>` sem `type`, que vale como submit. Cada clique roda `submit()`: `PUT /api/certificate-settings` com nome e cargo da tela, gravado e auditado. Isso contradiz o texto da tela (`es-CL.json:388`), e o valor sai em todo certificado, inclusive os já emitidos, porque é lido na hora de imprimir (D5). O teste substitui o `AppSignatureUpload` por `<button type="button">`, então não pega. | CONFIRMED | `frontend/src/features/certification/components/Settings/CertificateSettingsPanel.tsx:47-50,76` · `frontend/src/shared/ui/AppSignatureUpload/AppSignatureUpload.tsx:94-101` · `frontend/src/shared/ui/AppFileActions/AppFileActions.tsx:46-64` · `frontend/src/shared/ui/AppDownloadButton/AppDownloadButton.tsx:37-45` · `frontend/src/shared/ui/AppButton/AppButton.tsx:17` | correção aprovada (`AppButton` com `type="button"` por padrão), por aplicar |
| Q-2 | Menor | `Redator::firma()` filtra o `ofMany` com a string literal `'FIRMA'`, e não com `RedatorDocumentType::FIRMA->value`. Hoje os valores coincidem. Se o enum for renomeado, a relação devolve `null` sem erro, e o certificado sai sem a assinatura do instrutor. | CONFIRMED | `backend/app/Domains/Identity/Models/Redator.php:102` · `backend/app/Domains/Identity/Enums/RedatorDocumentType.php:18` | corrigir junto com o Q-1 (decisão do João) |

Placar: Crítico: 1 confirmado, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

**Padrão reincidente:** nenhum confirmado. É a primeira vez que o Q-1 aparece. Ele é estrutural,
porque o `AppButton` herda o submit implícito do HTML. Com a correção aprovada, o texto proposto
para `.claude/rules/frontend-fsliced.md` é: "`AppButton` nasce `type="button"`; só o botão que
envia declara `type="submit"`. Componente de `shared/ui` com botão interno pode cair dentro de
um `<form>` do chamador."

**Registrado pela lente 1, fora dos achados** (já está nos rulings e nas evidências):

- a medição de produção dos tetos é portão de merge;
- o aviso da gerente depende de haver turma no painel;
- um rollback da migration pode trazer de volta a assinatura antiga;
- a cidade do snapshot é a reserva quando a configuração está vazia;
- a regra que tira a FIRMA da idoneidade só tem prova indireta no backend.
