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

## Replanejamento de 2026-10-01 e emenda de 2026-10-04

- **Decisão de 2026-10-01 (João):** a conta SES fica em sandbox. `@lotusotec.cl` recebe pela identidade de domínio; endereço de outro domínio vira identidade verificada antes do primeiro envio (runbook §13.1); o production access fica adiado, com o gatilho no ADR-23, no runbook §13.6 e no FUT-4, que entra pela PR de docs da aceitação. Spec emendada em `187679be`.
- **Achado do IAM:** em sandbox o SES confere a autorização também contra a identidade do destinatário. Com `Resource` só em `identity/lotusotec.cl`, um externo verificado voltaria `not authorized … identity/<destinatário>`, e a sonda da spec de 2026-09-28 leria isso como policy errada. A `lotus-ses` passa a `identity/*`, com a mesma `Condition` no remetente (runbook §4).
- **Espelho:** o #121 (`44e6e372`) está na `main` e não no corporativo (leitura de `deploy/aws/env.prod.example` no corporativo: `MAIL_MAILER=log`); o espelho leva o #121 e esta emenda juntos, uma vez (D13).
- **Emenda de 2026-10-04 (João):** o destinatário que vazava para o log default — pelo reset, pelo cadastro de redator e pelo reenvio do convite, este pelo handler — é corrigido neste bloco (D15, Task 13, `0ba029b6`); o Drive é emendado por nova versão do mesmo arquivo, conferida por tamanho e hash (D12, Task 19). Spec em `0eb9a18b`.
- **Harness:** o merge `95fd1d0e` trouxe o item 35 antes do plano. A revisão é o `/revisar-bloco`, e a Fase B' roda depois do merge, com o bloco em `blocked` aguardando aceitação (spec §10 e `## Verificação externa`).

## Task 13 — D15, o destinatário fora do log

- Linha de base: `composer install` no contêiner da lane (a árvore não tinha `backend/vendor`); `php artisan test` 5 skipped, 1221 passed (9284 assertions).
- `FalhaDeEnvioDeEmailTest`, vermelho antes do código: 7 de 8 reprovando, cada um pelo motivo do plano (o de exceção que não é de e-mail é guarda e já passava). Com o `aws_erro`: 2 de 8. Com o `report` do `bootstrap/app.php`: 8 de 8.
- Sondas: 1 (sem `stop()`) reprova 6; 2 (sem `aws_erro`) reprova 5; 3 (callback em `Throwable`) reprova 1 — a matriz do plano. Arquivos restaurados por `cp`, `cmp` limpo.
- Pint nos três arquivos: passed. Suíte inteira: 5 skipped, 1229 passed (9354 assertions) (linha de base mais 8).
- Prova no contêiner da lane (`tinker`, SMTP recusado em `127.0.0.1:1`, o molde da sonda negativa do runbook §13.3): uma linha `Falha ao enviar e-mail` com `excecao` `TransportException` e sem `aws_erro`; nenhuma linha com a mensagem crua ou com o endereço da sonda.

## Task 18 — gate da Fase A'

- `pnpm install --frozen-lockfile`: Already up to date. `pnpm test --project repo`: 20 arquivos, 306 testes, todos verdes. `pnpm lint`: exit 0. `pnpm build`: exit 0.
- `php artisan test`: 5 skipped, 1229 passed (9354 assertions), 0 failed. Pint `--test` nos três `.php`: `PASS`.
- `git diff --name-only origin/main...HEAD`: os onze caminhos do plano; em `backend/`, só os três da Task 13.
- O número da conta, lido de `sts get-caller-identity` para o scratchpad, não aparece em `deploy/`, `docs/` nem `backend/` (fora dos dois audits legados de `docs/superpowers/audits/`, spec §3).

## Task 19 — Drive conferido (D12)

- `arquitetura-aws-lotus.md` (ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, G-1 do packet): nova versão do mesmo arquivo, subida pelo João; `fileSize` 10600, `modifiedTime` 2026-10-04T18:49:34.864Z.
- O conector do Drive não expõe checksum, e o conteúdo só sai dele como base64 transcrito, o que não serve de prova byte a byte. A prova é o `fileSize` 10600 — idêntico ao do arquivo montado no planejamento a partir da versão de 2026-06-22 (10130 bytes, sha256 `71f5fdcdc4d8d917f52158f1bcbfe4d9eace556df0225e7df5d807d38ec5e08f`), com só as linhas 52 (§1.4, *Implementação*) e 179 (*Pendências*) trocadas, sha256 `a4dd4fe9aa9cbb8940f5fb8dda449a872a6f6e92de088a0ef09409b75753af1d` —, o `modifiedTime` acima e a afirmação do João, em 2026-10-04, de que subiu esse arquivo. A conferência por hash fica para quem baixar a versão e rodar `sha256sum`.
- É a prova do item 1 da `## Verificação externa` da spec.

## Fase B' — aceitação (2026-10-04)

> Escrita do João, leitura da sessão. As saídas dos comandos de `aws`, `curl` e do host vieram coladas
> pelo João na conversa (o main tree nega `aws`, `curl` e `dig` à sessão); a sessão leu por conta
> própria só o que o `gh` alcança. Horários dos e-mails em -03, como o Gmail os mostra. Nenhum
> endereço de destinatário, valor de `.env` ou corpo de e-mail entra aqui.

### B1 — espelho (passo 1; D13)

- `gh api repos/Gatika-CL/lotus/commits/main`: `26087133`, `release: espelho de 0726bfec -- Merge pull request #125`. O `0726bfec` é o merge da PR #125, a do bloco.
- `deploy/aws/env.prod.example` no corporativo: `MAIL_MAILER=ses`.

### B2 — policy (passo 2; item 2)

- `list-role-policies` de `lotus-ec2`: `lotus-alerta`, `lotus-s3`, `lotus-ses`.
- `get-role-policy lotus-ses`: `Effect` `Allow`; ações `ses:SendRawEmail` e `ses:SendEmail`; `Resource` `arn:aws:ses:sa-east-1:<conta>:identity/*`; `Condition.StringEquals.ses:FromAddress` `lotus@lotusotec.cl`.
- `list-access-keys` de `lotus-infra`: 1 (nenhuma chave nova; a P-81 segue aberta).

### B3 — destinatários (passo 3; item 3)

- Contagem na base de produção, pelo `tinker`: **2** usuários ativos, de tipo admin ou redator, fora de `@lotusotec.cl` (1 admin e 1 redator). Zero ativos em `@lotusotec.cl`.
- O admin era a conta `id 4`, criada em 2026-09-04 com role `superadmin` e o e-mail do seed de desenvolvimento (`admin@lotus.cl`). `Hash::check` contra a senha do seed (`senha123`): **`false`** — a conta não usa a credencial pública do `DatabaseSeeder`, foi criada à mão.
- Como era o único admin ativo e nenhuma caixa dele era legível pelo SES, o João trocou o e-mail da conta duas vezes pelo `tinker` (`update` do Eloquent): primeiro para uma caixa `@lotusotec.cl` sem leitor — que recebeu um primeiro alerta D7 que ninguém leu —, depois para o Gmail dele, já verificado. O model é `Auditable` e `email` está em `$auditInclude`; a linha de `audits` não foi lida nesta aceitação.
- `list-email-identities` na região `sa-east-1`: `1 DOMAIN` e `1 EMAIL_ADDRESS` (o Gmail do João, verificado pelo clique no link; a sonda positiva entregue a ele em sandbox é a prova).
- **Exceção, decisão do João em 2026-10-04:** o redator externo ativo **não** foi verificado. Enquanto não for, reset e convite para ele falham calados, com `aws_erro` `MessageRejected` e sem o endereço (spec §8); avisar a pessoa é do João. A pendência ficou na **P-98**.

### B4 — `.env` e botão (passos 1 e 4; item 4)

- `.env` do host: `grep -c '^MAIL_MAILER='` = **1**; `config:show mail.default` = `ses`.
- `gh run list` do `deploy.yml` no corporativo: run `37233116290`, `success`, `headSha` `2608713392d6…` (o `26087133` do B1), criado às 20:42Z.
- `releases.jsonl`, últimas duas linhas: `inicio` às 20:44:13Z e `fim` às 20:44:52Z, ambos no `2608713392d6…`, `resultado` `ok`, `etapa` `ok`; `sha_anterior` `550758d7…`; sem migration.
- `GET https://app.lotusotec.cl/up` de fora: **200** (leitura do João; o `aceitacao.sh conferir` mediu de novo: `producao GET /up -> 200`).

### B5 — sondas (passo 5; item 5; D9, D15)

- **Desvio:** a primeira tentativa, no formato `tinker --execute` do runbook §13.3 dentro de `sudo -i sh -c '…'`, deu `PARSE ERROR  PHP Parse error: Syntax error, unexpected T_NS_SEPARATOR` nas duas sondas — o `sudo -i` escapa o `$` de `\$m` de um jeito que o PHP recebe `fn (\)`. Nenhum e-mail saiu. As sondas rodaram pelo `tinker` interativo, e o runbook §13.3 foi emendado na mesma PR.
- **Positiva** (para o Gmail do João): retorno `Illuminate\Mail\SentMessage`, sem exceção. No *Show original*: `From` `lotus@lotusotec.cl`, `Subject` `sonda`, SPF `pass`, DKIM `pass` com o domínio `lotusotec.cl`, DMARC `pass`; criado às 17h59. O João confirmou o domínio do SPF: `ses.lotusotec.cl`.
- **Negativa** (para `sonda@example.com`), às 21:00:03Z: a mensagem impressa diz `Request to AWS SES API failed. Reason: Email address is not verified` (o resto é a lista de identidades, que traz o endereço da sonda e por isso não é transcrita). A saída de erro: `production.ERROR: Falha ao enviar e-mail {"excecao":"Symfony\\Component\\Mailer\\Exception\\TransportException","codigo":0,"origem":"/var/www/vendor/laravel/framework/src/Illuminate/Mail/Transport/SesTransport.php:85","aws_erro":"MessageRejected"}` — **sem `@`**, sem mensagem e sem `Throwable` no contexto (DoD 10).

### B6 — prova D7 (passo 6; item 6)

- Loop do runbook §13.4, de fora, com o e-mail da conta admin: **15 × `422`**, nenhum `419` nem `429`. Rodou duas vezes (primeira com a caixa `@lotusotec.cl` sem leitor, depois com o Gmail), cada uma numa chave `email|ip` nova.
- Host, `docker compose logs --since 10m app`: `grep -cF 'acesso.suspeito'` = **1**; `grep -c 'Falha ao enviar alerta'` = **0**. A primeira rodada deu os mesmos dois números com `--since 30m`.
- Caixa do admin (o Gmail): `From` `lotus@lotusotec.cl`; `Subject` `Lotus — alerta de acceso sospechoso` (a tela do navegador o mostrou traduzido); SPF `pass`, DKIM `pass` com `lotusotec.cl`, DMARC `pass`; criado às 18h10.

### B7 — reset (passo 7; item 7)

- Pela UI, em `https://app.lotusotec.cl`, com o e-mail do admin (o Gmail): a mensagem chegou — `From` `lotus@lotusotec.cl`, `Subject` `Recuperación de clave — Lotus` (a tela do navegador o mostrou traduzido), SPF, DKIM e DMARC `pass`, criada às 18h15. O link **não** foi lido nem transcrito.
- Palavra do João: o link abriu a tela de nova senha; a senha nova logou; a senha antiga foi recusada.

### B8 — leitura final (passo 8; item 7)

- `get-account`: `ProductionAccessEnabled` **`false`** (decisão do ADR-23), `SendingEnabled` `true`, `SentLast24Hours` **5** — a cota é da conta, dividida com o site.
- `get-email-identity lotusotec.cl`: `VerifiedForSendingStatus` `true`, `DkimAttributes.Status` `SUCCESS`, `MailFromDomainStatus` `SUCCESS`.
- MX do apex, pelo DNS público do Google (o `dig` não existe na máquina do João): `1 aspmx.l.google.com`, `5 alt1.aspmx.l.google.com`, `5 alt2.aspmx.l.google.com`, `10 alt3.aspmx.l.google.com`, `10 alt4.aspmx.l.google.com` — só o Google, TTL 3600.

### Desvios e registros da aceitação

1. **A conta admin única de produção usa hoje o Gmail pessoal do João**, porque não existe caixa `@lotusotec.cl` com leitor. O alerta D7 e o reset só chegam a ele. **P-98.**
2. **O redator externo ficou sem identidade SES** (exceção do João, B3). **P-98.**
3. **Runbook §13.3 emendado:** as duas sondas passam a rodar pelo `tinker` interativo, com a causa medida (B5).
4. Spec §10 cumprida no `backlog.md` desta PR: entram o `FUT-4` (D14) e a ficha da `QueryException` (`D-74`), e a ficha 33 sai. O ADR-23 em `docs/adrs.md` cita o `FUT-4`, que passa a existir.
