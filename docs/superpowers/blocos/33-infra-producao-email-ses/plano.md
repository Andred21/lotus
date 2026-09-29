# `infra-producao-email-ses` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a produção envia e-mail de verdade pelo SES — alerta D7 e reset de senha chegando a caixas reais —, pela identidade `lotusotec.cl` que o site já verificou, com credencial pela instance role, conta fora do sandbox, e os docs (`operacao-segredos.md`, ADR-23, runbook) dizendo o que o host faz.

**Architecture:** duas fases (spec D1). **Fase A**, nesta lane: molde do host em `ses` com catraca, molde legado alinhado, ADR-23, runbook §4/§10/§13, `operacao-segredos.md` reescrito (paga a P-93), P-53 e P-81 anotadas; PR mesclada e espelhada. **Fase B**, produção: o João pede production access (passo 1, espera externa), aplica a inline `lotus-ses`, vira o `.env` e clica o botão; a sessão lê cada passo, sonda em sandbox antes da aprovação (D9), e prova D7 e reset em caixa real. Nenhum `.php` muda.

**Tech Stack:** Laravel mailer `ses` (`Illuminate\Mail\Transport\SesTransport`, `aws/aws-sdk-php` já no lock), IMDSv2 pela instance role `lotus-ec2`, `aws iam`/`aws sesv2` de leitura, vitest (projeto `repo`) em `frontend/tests`, `gh`, `curl`, o botão `workflow_dispatch` do corporativo.

**Spec:** [`spec.md`](./spec.md). Packet: [`2026-09-28-infra-producao-email-ses.md`](../../context-packets/2026-09-28-infra-producao-email-ses.md). Audit deste bloco: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` (nasce na Task 1).

## Global Constraints

- Trabalho no worktree `../lotus-33-infra-producao-email-ses`, branch `infra/33-infra-producao-email-ses`, offset +1 (`.env` da raiz já reservado pelo `lane.sh`). Nenhuma outra lane é tocada; `docs/superpowers/backlog.md` não se toca (invariante 10).
- Remetente é exatamente `lotus@lotusotec.cl`, nome `Lotus`; mailer é exatamente `ses`; região `sa-east-1`; identidade `lotusotec.cl`; policy inline `lotus-ses` na role `lotus-ec2`. Nenhuma access key nasce em lugar nenhum.
- Testes de repositório: `cd frontend && pnpm test --project repo tests/<arquivo>.test.ts`. `pnpm build` type-checa `tests/`.
- **Sondas da lição 19:** `cp` do arquivo para o scratchpad da sessão (`$SCRATCH`), aplicar a sonda, rodar o teste, restaurar com `cp`, fechar com `git diff --exit-code <arquivo>`. **Nunca `git stash`.**
- **Escrita em produção e na AWS é do João** (pedido de production access, `put-role-policy`, `.env`, botão, `tinker`, logins, reset). A sessão lê (`aws` de leitura, `gh`, `curl` de fora) e escreve o audit. Leitura por SSH que o auto mode barrar: o João roda e cola.
- Do `.env` de produção só sai **nome de chave**, nunca valor. De e-mail só saem remetente, assunto, `Authentication-Results` e horário — nunca corpo, nunca link de reset.
- Nenhum número de conta, ARN completo ou InstanceId em arquivo versionado (`docs/` não atravessa o espelho, mas a regra vale igual). O README monta o ARN a partir de `sts get-caller-identity` em runtime.
- Pint não roda (nenhum `.php`). `typescript:transform` não roda (nenhum DTO). A suíte PHP roda uma vez no fechamento porque `backend/.env.production.example` está em `backend/`.
- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Falha em portão é PARE com a saída mostrada, nunca contorno.

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `deploy/aws/env.prod.example:115-118` | Modificar | `MAIL_MAILER=ses`, comentário do mecanismo |
| `frontend/tests/env-prod-example.test.ts` | Modificar | catraca: valores de MAIL_* e ausência de segredo de e-mail/AWS |
| `backend/.env.production.example:111-121` | Modificar | molde legado alinhado a `ses`, sem chaves SMTP |
| `docs/adrs.md:431` | Modificar (inserir antes de "Pendências abertas") | ADR-23 |
| `deploy/aws/README.md` §4 (após a `lotus-alerta`), §10 (fim), §13 (novo, após §12) | Modificar | policy `lotus-ses`, canal de e-mail, procedimento da Fase B |
| `docs/operacao-segredos.md:47-49,60-79,139,153` | Modificar | inventário e rotação sem SMTP; cita só `deploy/aws/env.prod.example` |
| `docs/superpowers/pendencias/abertas.md` (P-93, P-53:476, P-81) e `README.md:88,109` | Modificar | P-93 paga, linha da P-53 paga, P-81 medida |
| `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` | Criar (Task 1), estender (todas) | evidência de cada DoD |
| `docs/superpowers/blocos/33-infra-producao-email-ses/estado.md` | Modificar nas fronteiras | `executing` → `blocked`/`executing` → `ready_for_review` |

## Mapa de DoD

| DoD da spec (§9) | Task |
|---|---|
| 1 — catracas verdes, sondas reprovam, lint e build | 1, 2, 3, 4, 5, 6 |
| 2 — `get-role-policy lotus-ses` com ações, ARN e condição; sem chave nova | 8 |
| 3 — `ProductionAccessEnabled: true` | 7, 10 |
| 4 — identidade `SUCCESS`/`SUCCESS`/`true`; MX do apex Google | 12 |
| 5 — alerta D7 real com DKIM/SPF/DMARC `pass` e linha no canal `seguranca` | 11 |
| 6 — reset real completo pela UI | 12 |
| 7 — docs sem `MAIL_PASSWORD`/`smtp`/molde legado; P-93 paga; P-53 anotada; ADR-23 | 3, 4 |
| 8 — audit sem valor de `.env` e sem corpo de e-mail | 1 a 12 |

---

## Fase A — repositório

### Task 1: molde do host em `ses`, com catraca e audit aberto

**Files:**
- Modify: `deploy/aws/env.prod.example:115-118`
- Test: `frontend/tests/env-prod-example.test.ts`
- Create: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md`

**Interfaces:**
- Produces: `valorDe(chave)` e `ATRIBUICOES` já existem no teste; o `describe` novo os reusa. O molde passa a ter `MAIL_MAILER=ses`, que a Task 5 (runbook §13) e a Task 9 (`.env` do host) citam.

- [ ] **Step 1: Write the failing test** — acrescente ao fim de `frontend/tests/env-prod-example.test.ts`:

```ts
/**
 * Item 33 (ADR-23): o e-mail sai pelo SES com credencial da instance role. O molde é a
 * referência de VALOR para quem instala pelo runbook §13, e a ausência de chave é parte do
 * contrato — uma access key ou uma senha SMTP aqui reabriria o `.env` a segredo de longa
 * duração, que é o que o item 10 v2 tirou.
 */
describe('deploy/aws/env.prod.example — e-mail por SES (runbook §13)', () => {
  it.each([
    ['MAIL_MAILER', 'ses'],
    ['MAIL_FROM_ADDRESS', 'lotus@lotusotec.cl'],
    ['MAIL_FROM_NAME', 'Lotus'],
  ])('%s=%s', (chave, esperado) => {
    expect(valorDe(chave)).toBe(esperado)
  })

  it.each(['MAIL_PASSWORD', 'MAIL_USERNAME', 'MAIL_HOST', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'])(
    'sem %s — a credencial é a role, não um segredo no .env',
    (chave) => {
      expect(ATRIBUICOES.some((l) => l.startsWith(`${chave}=`))).toBe(false)
    },
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && pnpm test --project repo tests/env-prod-example.test.ts`
Expected: FAIL em `MAIL_MAILER=ses` — `expected 'log' to be 'ses'`. Os cinco `sem …` passam já (o molde não tem essas chaves): é esperado, e a sonda do Step 5 é o que os prova.

- [ ] **Step 3: Edit the template** — substitua as linhas 115-118 de `deploy/aws/env.prod.example` (o bloco que começa em `# E-mail fica em log até o bloco de SES (spec §3).`) por:

```dotenv
# E-mail por SES (ADR-23, runbook §13): identidade `lotusotec.cl` do stack
# lotus-contato do site, região AWS_DEFAULT_REGION, credencial pela instance
# role — a inline `lotus-ses` (runbook §4) só deixa ESTE remetente sair. Sem
# MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD: não há segredo de e-mail no host.
# `log` só na fase anterior ao §13; com `log`, alerta D7 e reset de senha
# morrem no stderr do container e ninguém recebe nada.
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=lotus@lotusotec.cl
MAIL_FROM_NAME=Lotus
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && pnpm test --project repo tests/env-prod-example.test.ts`
Expected: PASS, 3 + 5 testes novos verdes, os anteriores intactos.

- [ ] **Step 5: Sondas (lição 19)** — duas, cada uma restaurada por `cp`:

```bash
SCRATCH=<scratchpad da sessão>; M=deploy/aws/env.prod.example
cp $M $SCRATCH/molde.bak
sed -i 's/^MAIL_MAILER=ses$/MAIL_MAILER=log/' $M
(cd frontend && pnpm test --project repo tests/env-prod-example.test.ts); echo "sonda 1 exit=$?"   # esperado: 1
cp $SCRATCH/molde.bak $M
printf 'AWS_ACCESS_KEY_ID=\n' >> $M
(cd frontend && pnpm test --project repo tests/env-prod-example.test.ts); echo "sonda 2 exit=$?"   # esperado: 1
cp $SCRATCH/molde.bak $M
git diff --exit-code $M && echo "molde restaurado"
```

Expected: `sonda 1 exit=1`, `sonda 2 exit=1`, `molde restaurado` (o diff contra o HEAD mostra só a edição do Step 3, que ainda não está commitada — confira com `git diff $M | grep '^[-+]MAIL'`).

- [ ] **Step 6: Open the audit** — crie `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md`:

```markdown
# Audit — `infra-producao-email-ses` (item 33) — 2026-09-28

> Evidência de cada DoD da [spec](./spec.md) §9. Do `.env` de produção só sai nome de chave;
> de e-mail só saem remetente, assunto, `Authentication-Results` e horário.

## Linha de base (2026-09-28, antes de qualquer escrita)

- `aws sesv2 get-account --region sa-east-1`: `ProductionAccessEnabled: false`, `SendingEnabled: true`, `Max24HourSend: 200`, `MaxSendRate: 1`.
- `aws sesv2 get-email-identity --email-identity lotusotec.cl`: `VerifiedForSendingStatus: true`, `DkimAttributes.Status: SUCCESS`, `MailFromDomainStatus: SUCCESS`, `MailFromDomain: ses.lotusotec.cl`; `list-email-identities` devolve só ela.
- `aws iam list-role-policies --role-name lotus-ec2`: `lotus-alerta`, `lotus-s3`; anexada: `AmazonSSMManagedInstanceCore`. Nenhuma ação `ses:*`.
- `aws iam list-access-keys --user-name lotus-infra`: uma chave `Active` (P-81, segue com o João).

## Task 1 — molde em `ses`, catraca vista reprovar

- `pnpm test --project repo tests/env-prod-example.test.ts`: <resultado>.
- Sonda 1 (`MAIL_MAILER=log`): exit <n>. Sonda 2 (`AWS_ACCESS_KEY_ID=` no molde): exit <n>. Molde restaurado por `cp`, `git diff --exit-code` limpo.
```

Preencha `<resultado>` e `<n>` com a saída real dos Steps 4 e 5.

- [ ] **Step 7: Commit**

```bash
git add deploy/aws/env.prod.example frontend/tests/env-prod-example.test.ts docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "feat(33): molde de producao em MAIL_MAILER=ses, com catraca

O e-mail sai pelo SES com a instance role (ADR-23). A catraca guarda os
tres valores de MAIL_* e a ausencia de segredo de e-mail e de access key
no molde, vista reprovar nas duas sondas.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: molde legado `backend/.env.production.example` alinhado

**Files:**
- Modify: `backend/.env.production.example:111-121`

**Interfaces:**
- Produces: o único molde que cita SMTP some; a Task 4 (`operacao-segredos.md`) deixa de apontar para ele.

- [ ] **Step 1: Edit** — substitua as linhas 111-121 (de `MAIL_MAILER=smtp` até `MAIL_FROM_NAME=Lotus`) por:

```dotenv
# E-mail por SES com a instance role (ADR-23). O molde REAL de produção é
# deploy/aws/env.prod.example (item 10 v2); este arquivo só não diverge dele.
# Sem MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD: não há relay SMTP nem segredo de
# e-mail em produção.
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=lotus@lotusotec.cl
MAIL_FROM_NAME=Lotus
```

- [ ] **Step 2: Verify** — `grep -n 'MAIL_' backend/.env.production.example` mostra exatamente três atribuições (`MAIL_MAILER`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`) e nenhuma `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`. `grep -c 'smtp' backend/.env.production.example` devolve `0`.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.production.example
git commit -m "chore(33): molde legado do backend alinhado ao mailer ses

Ele ainda dizia MAIL_MAILER=smtp com relay e senha; e o que o
operacao-segredos.md leu como realidade (P-93).

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: ADR-23 — e-mail transacional por SES

**Files:**
- Modify: `docs/adrs.md` — inserir antes da linha `## Pendências abertas (não decidir sem o João Victor)` (hoje a 433), logo após o `---` que fecha o ADR-22
- Test: `frontend/tests/repo-docs-refs.test.ts` (já cobre `docs/adrs.md`)

**Interfaces:**
- Produces: o nome `ADR-23`, citado pelo molde (Task 1), pelo runbook (Task 5) e pelo `operacao-segredos.md` (Task 4).

- [ ] **Step 1: Insert the ADR** — texto integral, entre o `---` do ADR-22 e "Pendências abertas":

```markdown
## ADR-23 — E-mail transacional por SES, identidade compartilhada com o site, sem segredo no host

**Contexto (2026-09-28, item 33).** O backend envia três e-mails, todos síncronos (ADR-21: sem
worker de fila): o alerta de acesso suspeito da `DetectorDeAcessoSuspeito` (D7, para todos os
`admin` ativos), o link de recuperação de senha (`PasswordResetLink`, broker `users`) e o convite
de primeiro acesso do redator (`RedatorAccessInvitation`, broker `invites`). Produção subiu no
item 10 v2 com `MAIL_MAILER=log`: nada chegava a ninguém. A P-53 registrava que o transporte de
e-mail tinha virado padrão de fato sem ADR, e a P-93 que `docs/operacao-segredos.md` descrevia um
relay SMTP com senha que nunca existiu.

**Decisão.** Mailer `ses` do Laravel (`config/mail.php`, transporte `ses`, API `SendRawEmail`),
região `AWS_DEFAULT_REGION` (`sa-east-1`), pela **identidade de domínio `lotusotec.cl` que o
stack `lotus-contato` do `lotus-site` criou e possui** (ADR-SITE-005 de lá): DKIM, MAIL FROM
`ses.lotusotec.cl` e DMARC já estão na zona `lotus-dns`. **Nunca duas identidades**: recriar a
identidade troca os três tokens DKIM na zona, e isso é coordenação com o site, não decisão deste
repositório. Remetente único `Lotus <lotus@lotusotec.cl>`, travado na policy. **Credencial é a
instance role `lotus-ec2`**, inline `lotus-ses` (`ses:SendRawEmail` e `ses:SendEmail` só na
identidade, `Condition ses:FromAddress` no remetente — runbook `deploy/aws/README.md` §4);
`services.ses` fica sem `key`/`secret` e o SDK cai na chain até o IMDSv2, o mesmo caminho do disco
`s3`. **A conta sai do sandbox** (production access, runbook §13): os destinatários são pessoas com
e-mail de qualquer domínio, e o sandbox só entrega a identidade verificada. **DNS do apex não
muda**: o SPF é avaliado sobre o MAIL FROM (`ses.`) e o DMARC alinha pelo DKIM.

**Consequências.** Não há segredo de e-mail no host: revogar é `delete-role-policy`, e a prova de
qualquer troca continua sendo um e-mail que chega (`operacao-segredos.md` §4). O envio fica no
request e a falha é contida (`FalhaDeObservabilidade`), então e-mail que não sai é assintomático
por dentro — o canal `seguranca` registra o alerta antes do envio por isso. Bounce e complaint
ficam só com a suppression list do SES, sem tópico de feedback: para ~10 usuários internos, aceito
por escrito aqui. Production access é da conta: o teto de 200/dia que freava o `/api/contacto`
do site (D-54 de lá) deixa de existir — efeito declarado ao site, decisão dele.

**Descartado.** SMTP com senha no `.env` (segredo de longa duração, o que o item 10 v2 tirou);
outro provedor (Resend, Postmark, relay do Workspace: segredo no host, DNS novo coordenado com o
site e uma aprovação equivalente); `ses-v2` (uma linha de config a mais sem ganho medido);
sandbox com guarda de domínio `@lotusotec.cl` no cadastro de usuário (recusada pelo João em
2026-09-28: acopla os usuários do sistema ao domínio da empresa).

---

```

- [ ] **Step 2: Run the docs ratchet**

Run: `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts`
Expected: PASS — todo path citado no ADR (`config/mail.php`, `deploy/aws/README.md`, `docs/operacao-segredos.md`) existe. Se reprovar, o path citado está errado no ADR, não no teste.

- [ ] **Step 3: Commit**

```bash
git add docs/adrs.md
git commit -m "docs(33): ADR-23, e-mail transacional por SES pela identidade do site

Mailer ses, instance role, remetente travado na policy, conta fora do
sandbox, apex intocado. Paga a linha da P-53 que dizia que o transporte
de e-mail nao tinha ADR.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: `operacao-segredos.md` sem SMTP; P-93 paga, P-53 e P-81 anotadas

**Files:**
- Modify: `docs/operacao-segredos.md:47-49` (três linhas da tabela), `:60-79` (dois parágrafos do §4), `:139` (citação do molde), `:153` (cadência)
- Modify: `docs/superpowers/pendencias/abertas.md` (ficha P-93 no fim; linha 476 da tabela da P-53; ficha P-81 antes do `---` que a fecha)
- Modify: `docs/superpowers/pendencias/README.md:88` (P-93) e `:109` (P-53)

- [ ] **Step 1: Tabela do §3** — substitua as três linhas 47-49 (`Credenciais de S3…`, `MAIL_PASSWORD…`, `Credenciais de SES…`) por estas duas:

```markdown
| Credenciais de S3 (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`) | `backend/config/filesystems.php:52-53` (disco `s3`, ADR-11) | **Vazias em produção de propósito**: o SDK cai na chain até o IMDSv2 e a credencial é a instance role `lotus-ec2` (runbook `deploy/aws/README.md` §4 e §6). Não é segredo do host — é permissão da role; o que se revoga é a inline `lotus-s3`. |
| E-mail (SES) | `backend/config/services.php:24-28` (bloco `ses`, sem `key`/`secret` em produção), mailer `ses` de `backend/config/mail.php:52-54`, selecionado por `MAIL_MAILER=ses` em `deploy/aws/env.prod.example` | **Não há segredo de e-mail.** A mesma role cobre o envio pela identidade `lotusotec.cl`, com o remetente travado na inline `lotus-ses` (ADR-23). É a superfície cuja falha é assintomática por dentro — ver §4. |
```

- [ ] **Step 2: §4** — substitua o parágrafo `**\`MAIL_PASSWORD\` (senha do relay SMTP).** …` (linhas 60-70, até `percebe-se pelo alerta que não chegou.`) por:

```markdown
**E-mail (SES, ADR-23).** Não há credencial a rotacionar: a instance role `lotus-ec2` é a
credencial, e a inline `lotus-ses` (runbook §4) é o que se revoga — `aws iam delete-role-policy
--role-name lotus-ec2 --policy-name lotus-ses` derruba todo o e-mail de saída na hora, sem
reiniciar nada. O que continua valendo é a **prova**: um e-mail que chega, nunca "o container
subiu". E-mail é a única superfície deste inventário cuja falha é assintomática do lado de
dentro — o alerta da D7 quebra em silêncio, a `FalhaDeObservabilidade` registra a falha no canal
default (sem endereço, sem mensagem crua) e a linha `acesso.suspeito` continua saindo no canal
`seguranca` como se nada tivesse acontecido. Ninguém percebe pela aplicação; percebe-se pelo
alerta que não chegou. Depois de qualquer mudança em `lotus-ses`, no `.env` (`MAIL_*`) ou na
identidade SES, o gate é o do runbook §13: alerta ou reset em caixa real.
```

E substitua o parágrafo `**Credenciais de S3 (…)** Hoje a rotação afeta só …` (linhas 72-79, até `a prova precisa incluir o e-mail de teste.`) por:

```markdown
**Credenciais de S3.** Não existem como par de chaves: o acesso ao bucket é a inline `lotus-s3` da
role (runbook §4), sem `AWS_ACCESS_KEY_ID` no `.env`. "Rotacionar" aqui é revisar a policy, não
trocar segredo — e o teste continua sendo um upload e um download reais depois de qualquer
mudança nela. A única access key da conta que interessa a este documento é a do usuário de
provisionamento `lotus-infra`, que a aplicação **não usa** e que a P-81 manda apagar.
```

- [ ] **Step 3: §5.2 e §6** — na linha 139, troque `` (`backend/.env.production.example:60`) `` por `` (`deploy/aws/env.prod.example:59`) ``. Na linha 153, troque `revisão anual de \`DB_PASSWORD\`, do \`MAIL_PASSWORD\` e das credenciais de S3` por `revisão anual de \`DB_PASSWORD\` (S3 e e-mail vão pela role, sem credencial de longa duração)`.

- [ ] **Step 4: Verify the doc** — `grep -n 'MAIL_PASSWORD\|smtp\|SMTP\|\.env\.production\.example' docs/operacao-segredos.md` devolve **nada**. `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts` PASS (o doc não está na lista, mas o ADR-23 cita `docs/operacao-segredos.md`, que tem de existir — existe).

- [ ] **Step 5: P-93 paga** — no fim da ficha `## P-93` em `abertas.md`, acrescente:

```markdown
**Paga em 2026-09-28 pelo item 33** (commit da Task 4 do plano): `docs/operacao-segredos.md` §3,
§4, §5.2 e §6 reescritos, `backend/.env.production.example` alinhado a `ses`. Vai para
`encerradas.md` no `/fechar-sprint` do bloco.
```

Na linha 88 do `README.md` (linha da P-93), troque a coluna de gatilho por `**paga em 2026-09-28 (item 33, Task 4)**; sai no fechamento`.

- [ ] **Step 6: P-53 anotada** — na linha 476 de `abertas.md`, envolva as duas últimas colunas em `~~…~~` e acrescente ao fim da célula de evidência: ` — **paga pelo item 33 em 2026-09-28: ADR-23**`. Na linha 109 do `README.md`, acrescente ao fim da coluna de gatilho: `; a linha "transporte de e-mail sem ADR" foi paga pelo item 33 (ADR-23)`.

- [ ] **Step 7: P-81 medida** — na ficha `## P-81`, antes do `---` que a fecha, acrescente:

```markdown
**Medida de novo em 2026-09-28, pelo item 33:** `list-access-keys` ainda devolve a chave `Active`.
A permissão de e-mail nasceu na role `lotus-ec2` (inline `lotus-ses`), nunca neste usuário — a
chave segue sem uso pela aplicação e a ficha segue com o João.
```

- [ ] **Step 8: Commit**

```bash
git add docs/operacao-segredos.md docs/superpowers/pendencias/abertas.md docs/superpowers/pendencias/README.md
git commit -m "docs(33): operacao-segredos sem relay SMTP; P-93 paga, P-53 e P-81 anotadas

O documento passa a descrever o que o host faz: S3 e e-mail pela instance
role, sem credencial de longa duracao; revogar e apagar a inline. O molde
legado deixa de ser citado.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: runbook — `lotus-ses` no §4, canal de e-mail no §10, §13 novo

**Files:**
- Modify: `deploy/aws/README.md` §4 (após o bloco da `lotus-alerta`, antes de `**Pela CLI, a role não basta.**`), §10 (após `um ARN no \`.env\` e a \`Resource\` da \`lotus-alerta\`.`), fim do arquivo (após o §12)

- [ ] **Step 1: §4** — insira, depois do bloco `aws iam put-role-policy … lotus-alerta … get-role-policy …` e antes de `**Pela CLI, a role não basta.**`:

````markdown
O e-mail é a **terceira** inline, `lotus-ses` (item 33, ADR-23). Só a identidade `lotusotec.cl`
— criada e possuída pelo stack `lotus-contato` do `lotus-site`, nunca recriada daqui — e só com
o remetente do molde: qualquer outro `From` é `AccessDenied`. O ARN se monta em runtime; o número
da conta não entra neste arquivo.

```bash
CONTA=$(aws sts get-caller-identity --query Account --output text)
aws iam put-role-policy --role-name lotus-ec2 --policy-name lotus-ses --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"ses:SendRawEmail\",\"ses:SendEmail\"],\"Resource\":\"arn:aws:ses:sa-east-1:$CONTA:identity/lotusotec.cl\",\"Condition\":{\"StringEquals\":{\"ses:FromAddress\":\"lotus@lotusotec.cl\"}}}]}"
aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-ses --query PolicyDocument
```

O readback tem de mostrar as duas ações, o `Resource` na identidade e a `Condition` no remetente.
A policy vale na hora para a role assumida pela instância — não há reinício. Revogar é
`aws iam delete-role-policy --role-name lotus-ec2 --policy-name lotus-ses`.

````

- [ ] **Step 2: §10** — acrescente ao fim da seção, depois de `um ARN no \`.env\` e a \`Resource\` da \`lotus-alerta\`.`:

```markdown

**E-mail da aplicação — SES, não SNS.** O alerta de acesso suspeito (D7), a recuperação de senha
e o convite do redator saem pelo SES, remetente `Lotus <lotus@lotusotec.cl>`, pela identidade
`lotusotec.cl` do site e pela inline `lotus-ses` da §4 — procedimento e provas na §13. É um canal
diferente do tópico `lotus-alertas` de cima: aquele é do `verificar-backup.sh`, este é da
aplicação. Nos dois vale a mesma regra: **a prova é a mensagem na caixa**, nunca "o container
subiu".
```

- [ ] **Step 3: §13** — acrescente ao fim do arquivo:

````markdown

## 13. E-mail — production access, `.env` e as duas provas

Pré-condições: a inline `lotus-ses` aplicada (§4) e a `main` do corporativo com
`MAIL_MAILER=ses` no molde (item 33). A identidade `lotusotec.cl` é do `lotus-site`: se
`aws sesv2 get-email-identity --region sa-east-1 --email-identity lotusotec.cl` não devolver
`VerifiedForSendingStatus: true`, `DkimAttributes.Status: SUCCESS` e
`MailFromAttributes.MailFromDomainStatus: SUCCESS`, o problema é da zona ou do stack de lá — PARE.

### 13.1 Production access — primeiro, porque é a única espera externa

A conta nasce em sandbox: 200 mensagens/24 h, 1/s e **só destinatário verificado**. O site vive
com isso (o destinatário dele é do domínio); a aplicação não — admins e redatores têm e-mail de
qualquer domínio. Console SES em `sa-east-1` → *Account dashboard* → *Request production access*:
tipo **Transactional**, URL `https://app.lotusotec.cl`, uso "alertas de segurança e recuperação
de senha da intranet de gestão de capacitação, ~10 usuários internos, dezenas de mensagens por
mês, sem lista de marketing; bounce e complaint tratados pela suppression list". Ou por CLI:

```bash
aws sesv2 put-account-details --region sa-east-1 --production-access-enabled \
  --mail-type TRANSACTIONAL --website-url https://app.lotusotec.cl \
  --use-case-description "Alertas de seguranca e recuperacao de senha da intranet Lotus; ~10 usuarios internos; dezenas de mensagens por mes; sem marketing" \
  --contact-language EN
aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Max24h:SendQuota.Max24HourSend}'
```

Guarde o número do caso. A resposta leva de um a alguns dias úteis; até lá os passos seguintes
andam, e a prova final espera.

### 13.2 `.env` e promoção

`sudo -e /opt/lotus/.env`: `MAIL_MAILER=ses`. As outras duas chaves (`MAIL_FROM_ADDRESS`,
`MAIL_FROM_NAME`) já estão no valor do molde. Nenhuma chave nova: a conferência de alinhamento do
botão (§7) não trava. **Depois** de salvar, promova pelo botão o SHA espelhado que trouxe o
molde — o Compose recria `app` e `scheduler` porque o `env_file` mudou. Gate:

```bash
sudo grep -c '^MAIL_MAILER=' /opt/lotus/.env          # 1 (nome, não valor)
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA \
  LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env \
  docker compose -p lotus -f docker-compose.prod.yml exec -T app php -r "echo config(\"mail.default\"), PHP_EOL;"'   # ses
```

### 13.3 Sonda em sandbox — antes da aprovação, de propósito

A autorização IAM acontece **antes** da regra do sandbox. Então, ainda em sandbox, um envio a um
destinatário não verificado prova a role e a policy sem entregar nada:

```bash
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml exec -T app php artisan tinker --execute "Mail::raw(\"sonda\", fn (\$m) => \$m->to(\"<e-mail de um admin>\")->subject(\"sonda\"));"'
```

| Saída | Significa | Próximo passo |
|---|---|---|
| `MessageRejected … Email address is not verified` | credencial e policy OK; conta em sandbox | esperar 13.1 |
| `AccessDenied … ses:SendRawEmail` | `lotus-ses` ausente ou errada | §4, reaplicar |
| `Throttling` | 1/s do sandbox | idem: esperar 13.1 |
| nenhuma exceção | a conta já saiu do sandbox | 13.4 |

### 13.4 As duas provas — depois de `ProductionAccessEnabled: true`

**Alerta D7 (`login_falho_repetido`).** 15 senhas erradas para uma conta real em até 15 min, de
fora, respeitando o `throttle:login` (5/min por `email|ip`):

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://app.lotusotec.cl/api/login \
    -H 'Origin: https://app.lotusotec.cl' -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -d '{"email":"<e-mail do admin>","password":"errada-'$i'"}'
  [ $((i % 5)) -eq 0 ] && sleep 61
done
```

Esperado: `422` × 15 (nunca `429`: o `sleep` respeita o throttle). Na 15ª, o alerta sai para
**todos** os admins ativos. Prova: a mensagem na caixa de um admin, assunto do `seguranca.alerta`,
e no *Show original* do Gmail `dkim=pass header.d=lotusotec.cl`, `spf=pass` em
`ses.lotusotec.cl` e `dmarc=pass`; no host, o `logs app` do compose (mesmo prefixo do 13.2) com `grep alerta_de_acesso_suspeito`
tem a linha do canal `seguranca`, e `grep 'Falha ao enviar alerta'` **não** tem linha nova.

**Reset de senha.** Pela UI, "¿Olvidaste tu contraseña?" com o e-mail do admin → a mensagem chega
→ o link abre a tela de nova senha → senha nova → login com ela. A antiga deixa de logar e as
sessões anteriores caem (`PurgeOtherSessionsAction`). Máximo 6 pedidos/min por IP
(`throttle:password`).

### 13.5 Recuo

`MAIL_MAILER=log` de volta no `.env` e `deploy.sh <mesmo SHA>` por SSH (§8.1) — nenhum dado muda;
`delete-role-policy lotus-ses` derruba o envio sem reiniciar. Pedido de production access negado:
o bloco para em `blocked` com o motivo; nada do repositório precisa voltar.
````

- [ ] **Step 4: Verify** — `grep -n '^## 13\|^### 13\.' deploy/aws/README.md` lista `13`, `13.1` a `13.5`; `grep -c 'lotus-ses' deploy/aws/README.md` ≥ 6; `grep -n '[0-9]\{12\}' deploy/aws/README.md` devolve **nada** (nenhum número de conta). `cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add deploy/aws/README.md
git commit -m "docs(33): runbook — inline lotus-ses no par. 4, canal de e-mail no par. 10 e o par. 13

Production access primeiro (unica espera externa), .env e promocao pelo
botao, sonda em sandbox que prova a policy antes da aprovacao, e as duas
provas em caixa real.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: gate da Fase A, PR, merge e espelho

**Files:**
- Modify: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md`
- Modify: `docs/superpowers/blocos/33-infra-producao-email-ses/estado.md` (só se a Task parar em `blocked`)

**Interfaces:**
- Produces: `SHA_ESPELHADO`, o commit do corporativo que a Task 9 promove.

- [ ] **Step 1: Gate local**

```bash
cd frontend && pnpm test --project repo && pnpm lint && pnpm build
cd .. && git diff --stat main...HEAD -- backend/ && git diff main...HEAD -- backend/app backend/config generated.ts | wc -l   # só .env.production.example; 0
```

Expected: `repo` verde (todos os arquivos de `frontend/tests`), lint 0, build verde, o diff de `backend/` é só `.env.production.example`, e `0` na última linha. Registre no audit (`## Task 6 — gate da Fase A`).

- [ ] **Step 2: PR**

```bash
git push -u origin infra/33-infra-producao-email-ses
gh pr create --base main --title "infra(33): e-mail de produção por SES — molde, ADR-23, runbook e operacao-segredos" --body "$(cat <<'EOF'
## Resumo
- `deploy/aws/env.prod.example` em `MAIL_MAILER=ses`, com catraca (valores de `MAIL_*`, sem segredo de e-mail nem access key no molde)
- `backend/.env.production.example` alinhado; `docs/operacao-segredos.md` deixa de descrever um relay SMTP (P-93 paga)
- ADR-23: SES pela identidade `lotusotec.cl` do site, instance role, sandbox fora, apex intocado (paga a linha da P-53)
- Runbook §4 (`lotus-ses`), §10 e §13 (production access, `.env`, sonda, provas)

Nenhum `.php` muda. A Fase B (produção) roda depois do merge, pelo runbook §13.

Spec: `docs/superpowers/blocos/33-infra-producao-email-ses/spec.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: PARE — merge e espelho são do João** (caminho do `CONTRIBUINDO.md`). Quando ele confirmar, confira:

```bash
git fetch origin && git fetch upstream 2>/dev/null; git log --oneline -1 origin/main
gh api repos/Gatika-CL/lotus/commits/main --jq '.sha[0:8] + " " + .commit.message' 2>/dev/null || echo "sem acesso ao corporativo por gh: o João cola o SHA"
```

Expected: a `origin/main` contém o merge desta PR; o SHA da `main` do corporativo (`SHA_ESPELHADO`) tem o mesmo conteúdo (`git diff <SHA_ESPELHADO> origin/main -- deploy docs` vazio, se o espelho estiver como remote; senão o João confirma pela Actions). Registre `SHA_ESPELHADO` no audit.

---

## Fase B — produção (escrita do João, leitura da sessão)

### Task 7: pedido de production access

- [ ] **Step 1: PARE — o João pede** (runbook §13.1, console ou `put-account-details`). Ele informa o número do caso e a data/hora.

- [ ] **Step 2: Leitura**

```bash
aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Envio:SendingEnabled,Max24h:SendQuota.Max24HourSend,PorSegundo:SendQuota.MaxSendRate}'
```

Expected: ainda `Producao: false` (o pedido não muda nada até a aprovação). Registre no audit (`## Task 7`) o número do caso e o horário do pedido. **Não espere aqui**: siga para a Task 8.

### Task 8: inline `lotus-ses` na `lotus-ec2`

- [ ] **Step 1: PARE — o João aplica** o bloco do runbook §4 (`put-role-policy` + `get-role-policy`).

- [ ] **Step 2: Leitura**

```bash
aws iam list-role-policies --role-name lotus-ec2
aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-ses --query PolicyDocument --output json | sed -E 's/[0-9]{12}/<conta>/g'
aws iam list-access-keys --user-name lotus-infra --query 'length(AccessKeyMetadata)'
```

Expected: `lotus-alerta`, `lotus-s3`, `lotus-ses`; o documento com `ses:SendRawEmail` **e** `ses:SendEmail`, `Resource` terminando em `:identity/lotusotec.cl`, `Condition.StringEquals.ses:FromAddress = lotus@lotusotec.cl`; `1` (nenhuma chave nova — DoD 2). Registre no audit com o número da conta mascarado.

### Task 9: `.env` do host, promoção pelo botão e sonda em sandbox

> **Desvio aprovado em 2026-09-29 (review da Task 5):** os comandos de produção desta task valem como estão no runbook `deploy/aws/README.md` §13 corrigido — CSRF no loop D7, `config:show mail.default`, `grep -cF 'acesso.suspeito'`, sonda lida pelo texto do `Reason:`, link `¿Olvidaste tu clave?`. Onde o texto abaixo diverge, o runbook vence. Registro no `audit.md`, Task 5.

- [ ] **Step 1: PARE — o João edita** `/opt/lotus/.env` (`MAIL_MAILER=ses`) e **depois** clica o botão no `SHA_ESPELHADO` da Task 6 (runbook §13.2).

- [ ] **Step 2: Leitura do deploy**

```bash
gh run list --repo Gatika-CL/lotus --workflow deploy.yml --limit 1 --json databaseId,conclusion,headSha 2>/dev/null || echo "o João cola o run id e a conclusão"
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up
```

E, por SSH (o João roda se o auto mode barrar): os dois comandos do runbook §13.2 — `grep -c '^MAIL_MAILER='` = `1` e `config("mail.default")` = `ses`; `sudo tail -2 /opt/lotus/releases.jsonl` com `fim` `resultado ok` para o `SHA_ESPELHADO`.

Expected: run `success`, `/up` `200`, `1`, `ses`, ledger coerente. Registre.

- [ ] **Step 3: PARE — o João roda a sonda** do runbook §13.3 (`tinker`, `Mail::raw` para o próprio e-mail).

- [ ] **Step 4: Leitura da sonda** — o João cola só a **classe** da exceção e a primeira linha da mensagem, sem o endereço. Decida pela tabela do §13.3:
  - `MessageRejected` → credencial e policy provadas em sandbox (D9). Registre e siga para a Task 10.
  - `AccessDenied` → PARE: volte à Task 8, Step 1, com o readback mostrando o que difere.
  - nenhuma exceção → a conta já saiu do sandbox; a Task 10 fecha só pela leitura.

### Task 10: aprovação — `blocked` enquanto espera

- [ ] **Step 1: Leitura**

```bash
aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Max24h:SendQuota.Max24HourSend,PorSegundo:SendQuota.MaxSendRate}'
```

- [ ] **Step 2: Se `Producao: false`** — grave a fronteira em `estado.md` (`workflow_state: blocked`, `resume_state: executing`, `next_owner: joao`, `next_action: "resolve_blocker aguardando production access do SES, caso <número>"`, `blocker: production access do SES pendente na AWS (caso <número>, pedido em <data>)`, `updated_at`, `updated_by`, `commit`) e commite junto com o audit:

```bash
git add docs/superpowers/blocos/33-infra-producao-email-ses/estado.md docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "chore(estado): bloco 33 espera o production access do SES

Fase B ate a sonda em sandbox provada; o resto depende da AWS.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

A sessão termina aqui. Quando o João avisar que a AWS respondeu, repita o Step 1.

- [ ] **Step 3: Se `Producao: true`** — saia de `blocked` (copie `resume_state` para `workflow_state`, zere `blocker` e `resume_state`, `next_owner: claude`, `next_action: continue_active_plan Task 11`), registre no audit `Max24h` e `PorSegundo` novos (DoD 3), commite `estado.md` + `audit.md` e siga. Pedido **negado**: `blocked` com o motivo da AWS no `blocker` e decisão do João — o plano não tem passo para isso, e não inventa um.

### Task 11: prova do alerta D7 em caixa real

> **Desvio aprovado em 2026-09-29 (review da Task 5):** os comandos de produção desta task valem como estão no runbook `deploy/aws/README.md` §13 corrigido — CSRF no loop D7, `config:show mail.default`, `grep -cF 'acesso.suspeito'`, sonda lida pelo texto do `Reason:`, link `¿Olvidaste tu clave?`. Onde o texto abaixo diverge, o runbook vence. Registro no `audit.md`, Task 5.

- [ ] **Step 1: PARE — o João dispara** o loop do runbook §13.4 com o e-mail do **próprio** admin (ou a sessão roda, de fora, se ele preferir — são só `POST`s de login com senha errada, nada é escrito). Ele confirma que a mensagem chegou.

- [ ] **Step 2: Leitura**
  - Do loop: 15 linhas `422`, nenhuma `429`.
  - Da caixa (o João cola do *Show original*, só as linhas): `Authentication-Results` com `dkim=pass header.d=lotusotec.cl`, `spf=pass` com `ses.lotusotec.cl`, `dmarc=pass`; `From: Lotus <lotus@lotusotec.cl>`; o `Subject`; a data.
  - Do host (por SSH): `sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml logs --since 30m app' | grep -c alerta_de_acesso_suspeito` = `1` e o mesmo `logs` com `grep -c 'Falha ao enviar alerta'` = `0`.
  - `aws sesv2 get-account --region sa-east-1 --query 'SendQuota.SentLast24Hours'` ≥ 1 mais o que o site tiver enviado.

Expected: tudo como acima. Registre no audit (`## Task 11 — DoD 5`). Se a mensagem não chegou e o log tem `Falha ao enviar alerta`, o João cola a classe da exceção: `MessageRejected` → a conta não saiu do sandbox (Task 10); `Throttling` → cota antiga ainda em vigor, esperar e repetir.

### Task 12: prova do reset, leitura final, handoff para review

> **Desvio aprovado em 2026-09-29 (review da Task 5):** os comandos de produção desta task valem como estão no runbook `deploy/aws/README.md` §13 corrigido — CSRF no loop D7, `config:show mail.default`, `grep -cF 'acesso.suspeito'`, sonda lida pelo texto do `Reason:`, link `¿Olvidaste tu clave?`. Onde o texto abaixo diverge, o runbook vence. Registro no `audit.md`, Task 5.

- [ ] **Step 1: PARE — o João faz o reset** pela UI (runbook §13.4, segundo bloco) com a própria conta: pede, recebe, abre o link, define a senha nova, loga com ela e confirma que a antiga não loga.

- [ ] **Step 2: Leitura**
  - Da caixa: `From`, `Subject`, `Authentication-Results` (mesmos três `pass`), data. **Nunca o link.**
  - `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://app.lotusotec.cl/api/login -H 'Origin: https://app.lotusotec.cl' -H 'Accept: application/json' -H 'Content-Type: application/json' -d '{"email":"<e-mail>","password":"<senha antiga>"}'` → `422` (a antiga caiu). O João roda, porque a senha é dele.
  - Registre no audit (`## Task 12 — DoD 6`).

- [ ] **Step 3: Leitura final (DoD 4)**

```bash
aws sesv2 get-email-identity --region sa-east-1 --email-identity lotusotec.cl --query '{Verificada:VerifiedForSendingStatus,Dkim:DkimAttributes.Status,MailFrom:MailFromAttributes.MailFromDomainStatus}'
aws sesv2 list-email-identities --region sa-east-1 --query 'length(EmailIdentities)'
nslookup -type=MX lotusotec.cl 1.1.1.1 | grep -ic google.com
aws sesv2 get-account --region sa-east-1 --query 'SendQuota.SentLast24Hours'
```

Expected: `true`/`SUCCESS`/`SUCCESS`; `1` (nenhuma identidade nova); `5`; ≥ 2. Registre.

- [ ] **Step 4: Aviso ao site** — no audit, seção `## Efeito lateral — lotus-site D-54`: "production access aprovado em <data>; o teto de 200/dia do sandbox deixou de frear `/api/contacto`; gatilho da D-54 disparado; decisão da sessão do site". Diga isso ao João em uma frase na conversa.

- [ ] **Step 5: Suíte PHP** (o diff de `backend/` não é vazio):

```bash
docker compose up -d && docker compose exec -T app php artisan test 2>&1 | tail -3
```

Expected: `passed` com o mesmo placar da `main` (1221 passed / 5 skipped em 2026-09-27) — nenhum `.php` mudou. Registre.

- [ ] **Step 6: Handoff** — `estado.md`: `workflow_state: ready_for_review`, `next_owner: claude`, `next_action: request_code_review`, `updated_at`, `updated_by`, `commit`. Commit:

```bash
git add docs/superpowers/blocos/33-infra-producao-email-ses/estado.md docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "docs(33): handoff para review — Fase B provada, DoD 1 a 8 no audit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Handoff de execução

**executor: claude**

Roda na sessão Claude, no worktree `../lotus-33-infra-producao-email-ses`. A Fase A é toda da sessão (Tasks 1 a 6, cada uma com catraca ou verificação executável e commit próprio). A Fase B (Tasks 7 a 12) é escrita do João — pedido de production access, `put-role-policy`, `.env`, botão, `tinker`, logins, reset — e leitura da sessão, que decide pela tabela do runbook §13.3 e registra o audit. É produção, conta AWS e efeito em outro repositório: nada disso é task mecânica com path fechado, então **sem delegação ao Codex** na execução. A lente independente do Codex entra no `/revisar-sprint` (risco alto: credencial IAM e caminho de reset de senha).

**Gates por task:** Fase A termina cada task com o teste do arquivo tocado verde, as sondas da lição 19 vistas reprovar (Task 1), a catraca de docs verde (Tasks 3, 4, 5) e um commit. Fase B para e espera o João em cada `PARE`; **falha em portão é PARE**, com a saída no audit, nunca contorno.

**Sequência obrigatória:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
- 1 a 5 são independentes em conteúdo, mas 4 e 5 citam o ADR-23 (3) e o molde (1): não se escrevem antes.
- **6 antes de 9:** o botão promove o SHA espelhado que traz o molde; sem ele o `.env` do host viraria antes do doc que o descreve.
- **7 antes de 8, 9:** o pedido é a espera longa; começa primeiro e não bloqueia nada.
- **8 antes de 9:** a sonda do Step 3 da Task 9 só prova algo com a policy aplicada.
- **10 antes de 11:** sem `ProductionAccessEnabled: true` o alerta a destinatário não verificado não sai.
- 12 depois de 11: a leitura final soma os envios das duas provas.

`efeito_externo: sim` (já gravado no planejamento); `executor: claude` vai para o `estado.md` na transição para `ready_for_execution`.
