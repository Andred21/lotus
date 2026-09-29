# Audit — `infra-producao-email-ses` (item 33) — 2026-09-29

> Evidência de cada DoD da [spec](./spec.md) §9. Do `.env` de produção só sai nome de chave;
> de e-mail só saem remetente, assunto, `Authentication-Results` e horário.

## Linha de base (2026-09-29, antes de qualquer escrita)

- `aws sesv2 get-account --region sa-east-1`: `ProductionAccessEnabled: false`, `SendingEnabled: true`, `Max24HourSend: 200`, `MaxSendRate: 1`.
- `aws sesv2 get-email-identity --email-identity lotusotec.cl`: `VerifiedForSendingStatus: true`, `DkimAttributes.Status: SUCCESS`, `MailFromDomainStatus: SUCCESS`, `MailFromDomain: ses.lotusotec.cl`; `list-email-identities` devolve só ela.
- `aws iam list-role-policies --role-name lotus-ec2`: `lotus-alerta`, `lotus-s3`; anexada: `AmazonSSMManagedInstanceCore`. Nenhuma ação `ses:*`.
- `aws iam list-access-keys --user-name lotus-infra`: uma chave `Active` (P-81, segue com o João).
- A CLI local só autentica com `AWS_PROFILE=lotus` (usuário `lotus-infra`); o perfil `default` devolve `InvalidClientTokenId`. Toda leitura da Fase B usa esse perfil.

## Task 1 — molde em `ses`, catraca vista reprovar

- `pnpm test --project repo tests/env-prod-example.test.ts`: Test Files 1 passed (1), Tests 16 passed (16).
- Sonda 1 (`MAIL_MAILER=log`): exit 1. Sonda 2 (`AWS_ACCESS_KEY_ID=` no molde): exit 1. Molde restaurado por `cp`, `git diff --exit-code` limpo.
