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

## Tasks 2 a 5 — docs e molde legado

- Task 2: `backend/.env.production.example` com três atribuições `MAIL_*` (`ses`), `grep -c smtp` = 0.
- Task 3: ADR-23 inserido, conferido por diff contra o texto do plano (39 linhas idênticas); `repo-docs-refs` verde.
- Task 4: `grep 'MAIL_PASSWORD\|smtp\|SMTP\|\.env\.production\.example' docs/operacao-segredos.md` vazio; P-93 paga, linha da P-53 riscada, P-81 medida. A linha da P-93 no índice `pendencias/README.md` saiu de baixo do blockquote e entrou na tabela.
- Task 5: runbook §4 (`lotus-ses`), §10 e §13. **Desvio do plano, aprovado pelo João em 2026-09-29:** o review achou cinco comandos do §13 que falhariam em produção se copiados como o plano mandava — o loop D7 sem CSRF (`statefulApi()` devolve 419 e o detector nunca conta), o `grep alerta_de_acesso_suspeito` (o log grava `acesso.suspeito`), o `php -r 'echo config(...)'` (fora do Laravel), a tabela da sonda por código de erro (o `TransportException` só mostra o texto depois de `Reason:`) e o rótulo do link de reset (`¿Olvidaste tu clave?`). Corrigidos com mais quatro menores. **A Fase B segue o runbook §13 corrigido**, não os comandos literais das Tasks 9, 11 e 12 do plano nem o `php -r` da spec §5 passo 4.

## Task 6 — gate da Fase A (2026-09-29)

- `pnpm test --project repo`: 20 arquivos, 306 testes, verde. `pnpm lint`: exit 0. `pnpm build`: exit 0 (só o aviso de chunk size de sempre).
- `git diff --stat main...HEAD -- backend/`: só `backend/.env.production.example` (6+/10-). `git diff main...HEAD -- backend/app backend/config frontend/src/shared/api/generated.ts | wc -l` = 0.

## Task 13 — D15, o destinatário fora do log

- Linha de base: `composer install` no contêiner da lane (a árvore não tinha `backend/vendor`); `php artisan test` 5 skipped, 1221 passed (9284 assertions).
- `FalhaDeEnvioDeEmailTest`, vermelho antes do código: 7 de 8 reprovando, cada um pelo motivo do plano (o de exceção que não é de e-mail é guarda e já passava). Com o `aws_erro`: 2 de 8. Com o `report` do `bootstrap/app.php`: 8 de 8.
- Sondas: 1 (sem `stop()`) reprova 6; 2 (sem `aws_erro`) reprova 5; 3 (callback em `Throwable`) reprova 1 — a matriz do plano. Arquivos restaurados por `cp`, `cmp` limpo.
- Pint nos três arquivos: passed. Suíte inteira: 5 skipped, 1229 passed (9354 assertions) (linha de base mais 8).
- Prova no contêiner da lane (`tinker`, SMTP recusado em `127.0.0.1:1`, o molde da sonda negativa do runbook §13.3): uma linha `Falha ao enviar e-mail` com `excecao` `TransportException` e sem `aws_erro`; nenhuma linha com a mensagem crua ou com o endereço da sonda.
