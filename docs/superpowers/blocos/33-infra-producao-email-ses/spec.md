# Spec — `infra-producao-email-ses` — 2026-09-28

> Item 33 do backlog, lane aberta pelo `lane.sh abrir` em 2026-09-28 (`lane_base 6be051de`),
> offset +1. `Contexto: sim` — packet em
> `docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md` (Codex pelo plugin
> `codex-companion`, read-only; o MCP `mcp__codex__codex` segue ausente). Paga a **P-93** (aberta
> por esta spec) e a linha "transporte de e-mail sem ADR" da **P-53**. Spec e plano moram na pasta
> do bloco (`blocos/33-infra-producao-email-ses/spec.md` e `plano.md`), como o bloco 35 faz e como o
> `lane.sh conferir` lê; os commands ainda dizem `specs/` e `plans/` (`state.md`, §Transição).

> **Replanejamento em curso (2026-10-01).** Com a Fase A mesclada (PR #121, `44e6e372`, ainda
> não espelhada), o João decidiu **não pedir production access**: a conta SES fica em sandbox. Os
> destinatários `@lotusotec.cl` ficam cobertos pela identidade de domínio, e cada endereço externo
> é verificado como identidade (`create-email-identity`, sem caso aberto na AWS). O Drive
> (`arquitetura-aws-lotus.md`, G-1) pede a saída do sandbox; a sessão propõe a emenda e só escreve
> com o ok do João. Achado que entra na emenda: em sandbox o SES autoriza o IAM **também contra a
> identidade do destinatário**, então a `lotus-ses` com `Resource` só em `identity/lotusotec.cl`
> recusa um externo verificado. D2, D5, D9, §5, §6, §8 e §9 abaixo valem até a emenda substituí-los.

## 1. Contexto

### 1.1 O que já existe — medido em 2026-09-28, não suposto

- **Identidade SES `lotusotec.cl` em `sa-east-1`**, criada pelo stack `lotus-contato` do
  `lotus-site` (ADR-SITE-005, bloco B2, mesclado em 2026-09-27). `aws sesv2 get-email-identity`:
  `VerifiedForSendingStatus: true`, `DkimAttributes.Status: SUCCESS`,
  `MailFromAttributes.MailFromDomainStatus: SUCCESS`, `MailFromDomain: ses.lotusotec.cl`. É a
  **única** identidade da conta (`list-email-identities` devolve uma). A ficha 33 previa "quem
  criar primeiro registra; o segundo reusa": o site criou, o Lotus reusa.
- **Zona `lotus-dns`** (Route 53, stack em `us-east-1`, repo `lotus-site`): três CNAME de Easy
  DKIM, `ses.lotusotec.cl MX 10 feedback-smtp.sa-east-1.amazonses.com`,
  `ses.lotusotec.cl TXT "v=spf1 include:amazonses.com ~all"`, `_dmarc.lotusotec.cl TXT
  "v=DMARC1; p=none; rua=mailto:contacto@lotusotec.cl"`. O apex mantém os cinco MX do Google e o
  SPF `v=spf1 include:_spf.google.com include:spf.stackmail.com -all`; `mail.` é CNAME do Google.
  **Nada de DNS falta para este bloco**: o SPF é avaliado sobre o MAIL FROM (`ses.`), e o DMARC
  alinha pelo DKIM (`d=lotusotec.cl`). A emenda do SPF `-all` do apex que a spec do item 10 v2
  previa **não é necessária** e não se faz.
- **Conta em sandbox**: `aws sesv2 get-account --region sa-east-1` →
  `ProductionAccessEnabled: false`, `SendingEnabled: true`, cota 200/24 h e 1/s. O site decidiu
  não sair (spec B2, D3): o destinatário dele é `contacto@lotusotec.cl`, do domínio verificado.
- **Backend**: `config/mail.php` já declara o mailer `ses` (`transport: ses`);
  `config/services.php:24-28` lê `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_DEFAULT_REGION`.
  `MailManager::addSesCredentials` (vendor, medido) só injeta credencial quando `key` **e**
  `secret` não estão vazios; caso contrário o `SesClient` cai na chain padrão do SDK, que chega ao
  IMDSv2 — o mesmo caminho do disco `s3`, provado em produção desde o item 10 v2 (hop limit 2,
  runbook §6). `aws/aws-sdk-php 3.386.1` já está no `composer.lock` pelo `flysystem-aws-s3-v3`.
  Nenhuma classe implementa `ShouldQueue` (ADR-21): os três envios são síncronos.
- **Quem envia**: `DetectorDeAcessoSuspeito::alertar` (alerta D7, `Notification::send` para
  **todos os `type=admin` ativos**, falha contida em `FalhaDeObservabilidade` sem derrubar a
  resposta); `User::sendPasswordResetNotification` (`PasswordResetLink`, URL sobre
  `app.frontend_url`, broker `users`, 60 min); `SendRedatorAccessInvitationAction`
  (`RedatorAccessInvitation`, broker `invites`, 7 dias). Limiares: `LOGIN_FALHO_LIMIAR = 15` em
  900 s; `throttle:login` é 5/min por `email|ip`.
- **Host**: `/opt/lotus/.env` com `MAIL_MAILER=log` (molde `deploy/aws/env.prod.example:116`),
  `MAIL_FROM_ADDRESS=lotus@lotusotec.cl`, `MAIL_FROM_NAME=Lotus`, `AWS_DEFAULT_REGION=sa-east-1`,
  sem access key. `app` e `scheduler` leem o mesmo `env_file`.
- **IAM**: role `lotus-ec2` com as inline `lotus-s3` e `lotus-alerta` e a gerenciada
  `AmazonSSMManagedInstanceCore`. **Nenhuma ação `ses:*`.** O usuário `lotus-infra` ainda tem a
  access key da **P-81** `Active` (medido; a aplicação não a usa e ela não entra neste bloco).
- **Docs divergentes**: `docs/operacao-segredos.md` §3 (linhas 47-49), §4 (60-79) e §6 (153)
  afirmam que produção envia por SMTP com `MAIL_PASSWORD` e citam
  `backend/.env.production.example:106`; esse molde legado (linhas 111-121) ainda diz
  `MAIL_MAILER=smtp`. Produção usa `log` desde o item 10 v2 (`env.prod.example`). É a P-93.
- **Site**: a Lambda `lotus-site-contato` envia pela mesma identidade com `From sitio@lotusotec.cl`,
  role limitada por `Condition ses:FromAddress`. O molde da policy deste bloco copia essa forma.

### 1.2 O que falta

1. Sair do sandbox — sem isso, alerta e reset a destinatário não verificado voltam
   `MessageRejected` e a `FalhaDeObservabilidade` engole (a falha assintomática que o
   `operacao-segredos.md` §4 já descreve).
2. `ses:SendRawEmail`/`ses:SendEmail` na `lotus-ec2`, só pela identidade e só com o remetente.
3. `MAIL_MAILER=ses` no molde e no host, e os contêineres recriados com o env novo.
4. ADR do transporte de e-mail (P-53) e `operacao-segredos.md` dizendo a verdade (P-93).
5. As duas provas da ficha, em caixa real.

### 1.3 Achados do brainstorming

- **Sandbox não é acoplamento a `@lotusotec.cl`.** Foi cogitado ficar em sandbox exigindo e-mail
  do domínio verificado para todo usuário que autentica, com guarda no backend; o João recusou —
  não quer os usuários do sistema presos ao domínio. Outros provedores (Resend, Postmark, relay do
  Workspace, Mailgun) trocam a espera da AWS por segredo de longa duração no host, DNS novo
  coordenado com o site e uma aprovação equivalente. Decisão: **SES com production access**.
- **O pedido é a única espera externa** (1 a alguns dias úteis). Vai para o **primeiro passo da
  Fase B**, em paralelo com o resto; nada do repositório depende dele.
- **Production access é da conta, não do Lotus.** Aprovado, o teto de 200/dia que o site usa como
  freio natural do `/api/contacto` (D5 da spec B2, débito `D-54`) **desaparece**. O gatilho da
  D-54 é literalmente "pedido de production access do SES". Efeito lateral declarado (§8).

## 2. Decisões do brainstorming

| # | Decisão | Alternativas recusadas |
|---|---|---|
| D1 | **Repositório antes da produção, em duas fases.** Fase A na lane, PR mesclada e espelhada. Fase B em produção: o João escreve (ticket, IAM, `.env`, botão, provas), a sessão lê e escreve o audit. | Host primeiro: o botão recusa host divergente da `main` (item 31). Um bloco só de "pedir access" antes: a espera corre igual em paralelo. |
| D2 | **Sair do sandbox por production access**, pedido no passo 1 da Fase B. | Sandbox + guarda de domínio no backend (recusada pelo João: acopla usuários a `@lotusotec.cl`). Verificar cada destinatário como identidade: cria identidade por pessoa e quebra convite/reset de quem ainda não clicou. Outro provedor: §1.3. |
| D3 | **Mailer `ses`** (API v1, `SendRawEmail`), já declarado no `mail.php`. Zero código PHP. | `ses-v2`: uma linha a mais no `mail.php` sem ganho medido; a v1 é suportada e o SDK é o mesmo. |
| D4 | **Remetente `Lotus <lotus@lotusotec.cl>`**, o que o molde já fixa desde o item 10. Sem caixa: resposta volta pelo MX do Google como inexistente. | `no-reply@`: muda molde e host por nada. Caixa real: ninguém a lê. |
| D5 | **Terceira inline `lotus-ses` na `lotus-ec2`**, aplicada pelo João com `put-role-policy` + readback, snippet no runbook §4 — o mesmo molde da `lotus-alerta`. `Action: ses:SendRawEmail, ses:SendEmail`; `Resource`: o ARN da identidade; `Condition StringEquals ses:FromAddress: lotus@lotusotec.cl`. | Script `deploy/aws/conceder-ses.sh` com catraca: mais arquivos por uma política aplicada uma vez. Ampliar a `lotus-s3`: mistura escopos. |
| D6 | **ADR-23 curto**: e-mail transacional por SES, identidade compartilhada do site (o site é dono, o Lotus reusa, nunca duas), instance role, síncrono sem fila, sandbox fora, bounce/complaint só pela suppression list do SES. Paga a linha da P-53. | Emenda no ADR-14: a decisão não é de compute, e a P-53 seguiria aberta. |
| D7 | **`backend/.env.production.example` alinhado a `ses` no mesmo commit** do molde real; `operacao-segredos.md` passa a citar só `deploy/aws/env.prod.example`. | Apagar o legado: toca a spec dos hooks de guarda e referências fora do escopo. Deixar: doc corrigido e molde mentindo. |
| D8 | **`.env` do host muda antes do botão, e a recriação é o próprio deploy** do SHA espelhado da PR desta lane. O Compose recria `app` e `scheduler` porque o `env_file` mudou. Sem chave nova no molde, a conferência de alinhamento (item 31) não trava. | `docker compose up -d` à mão por SSH: fora do botão e do ledger. Chave nova só para forçar recriação: ruído. |
| D9 | **Sonda em sandbox antes da aprovação**, por `tinker` no contêiner: `Mail::raw` para um admin. `MessageRejected` (destinatário não verificado) **prova** credencial pela role e policy — a autorização IAM acontece antes da regra do sandbox; `AccessDenied` diz que a policy está errada. Nada é entregue. | Esperar a aprovação para testar tudo: um erro de policy custaria mais um dia. |
| D10 | **Prova D7 pela família `login_falho_repetido`**: 15 senhas erradas contra uma conta real, de fora, dentro de 15 min, respeitando o `throttle:login` (5/min) — cerca de 4 min. | `sequencia_de_403`: exige usuário sem permissão logado e 20 chamadas. `sessao_de_conta_desativada`: desativar uma conta real. |
| D11 | **`efeito_externo: sim`, `executor: claude`.** Produção, conta AWS, cross-repo em efeito, julgamento fora do plano. | — |

## 3. Escopo

**Dentro:** §4 e §5 inteiros. **Fora** (registrado): Lambda/formulário/WAF do site; DKIM do Google
e `include:spf.stackmail.com` (D-46 do site); central de notificações (FUT-3); worker de fila;
tratamento de bounce/complaint além do padrão do SES; observabilidade de e-mail (bloco próprio);
P-81 (a chave é do João); Notion `10.1.4` (o João marca); `CLAUDE.md` e as outras linhas da P-53.

## 4. Fase A — repositório (`lotus-infra`, esta lane)

### 4.1 Molde do host — `deploy/aws/env.prod.example`, com catraca

Linhas 115-118 viram:

```dotenv
# E-mail por SES (ADR-23): identidade `lotusotec.cl` do stack lotus-contato do
# site, região AWS_DEFAULT_REGION, credencial pela instance role (a policy
# lotus-ses só deixa este remetente sair — runbook §4). Sem MAIL_HOST/
# MAIL_PASSWORD: não há segredo de e-mail. `log` só até o runbook §13 rodar.
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=lotus@lotusotec.cl
MAIL_FROM_NAME=Lotus
```

`frontend/tests/env-prod-example.test.ts` ganha um `describe` novo: `MAIL_MAILER=ses`,
`MAIL_FROM_ADDRESS=lotus@lotusotec.cl`, `MAIL_FROM_NAME=Lotus`, e **ausência** de
`MAIL_PASSWORD`, `MAIL_USERNAME`, `MAIL_HOST`, `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`
entre as atribuições (a credencial é a role; uma chave dessas no molde reabriria o `.env` a segredo
de longa duração). Sonda: molde com `MAIL_MAILER=log` reprova; molde com `AWS_ACCESS_KEY_ID=`
reprova.

### 4.2 Molde legado — `backend/.env.production.example`

Linhas 111-121: `MAIL_MAILER=ses`, `MAIL_FROM_ADDRESS=lotus@lotusotec.cl`, `MAIL_FROM_NAME=Lotus`,
comentário apontando para `deploy/aws/env.prod.example` como molde real. Somem `MAIL_HOST`,
`MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`. Sem catraca própria (D7): o arquivo é
referência de valores para ninguém desde o item 10 v2.

### 4.3 ADR-23 — `docs/adrs.md`, antes de "Pendências abertas"

Título: **ADR-23 — E-mail transacional por SES, identidade compartilhada com o site, sem segredo
no host.** Corpo, ≤ 40 linhas: contexto (três envios síncronos, produção em `log`, P-53 dizendo
que o transporte virou padrão de fato sem ADR); decisão (SES `sa-east-1`, mailer `ses`, identidade
`lotusotec.cl` **do** `lotus-contato` — o site é dono, o Lotus consome, recriar a identidade troca
os três tokens DKIM na zona e é coordenação com o site; remetente `lotus@lotusotec.cl` travado na
policy; instance role, chain do SDK até o IMDSv2, `services.ses` sem chave; production access da
conta; DNS: nada além do que o site publicou, SPF do apex intocado); consequências (sem fila, o
envio fica no request e a falha é contida — ADR-21/D7; bounce e complaint só pela suppression
list do SES, sem SNS de feedback, declarado; o teto do sandbox deixa de frear o `/api/contacto`
do site — D-54 de lá); descartado (SMTP com senha, outro provedor, `ses-v2`, sandbox com guarda de
domínio — cada um com a linha do porquê). Sem número de conta nem ARN literal.

### 4.4 Runbook — `deploy/aws/README.md`

- **§4** ganha, depois da `lotus-alerta`, a `lotus-ses` (D5). Snippet com `put-role-policy`,
  `get-role-policy` de readback e a leitura do ARN da identidade por
  `aws sesv2 get-email-identity … --query 'IdentityName'` mais `sts get-caller-identity` para
  montar `arn:aws:ses:sa-east-1:<conta>:identity/lotusotec.cl` — o número da conta não entra no
  arquivo.
- **§10** ganha o parágrafo "E-mail da aplicação — SES": o canal, o remetente, e que a prova de
  e-mail é "chegou na caixa", nunca "o container subiu".
- **§13 E-mail — production access, `.env` e as duas provas** (nova, depois do §12): os passos
  do §5 na ordem, com o comando de cada leitura e o critério de cada gate.

### 4.5 `docs/operacao-segredos.md`

- §3: some a linha `MAIL_PASSWORD`; a linha "Credenciais de S3" deixa de dizer "só S3"; a linha
  "Credenciais de SES" vira "**E-mail (SES) — não há segredo**: mailer `ses`, `services.php` sem
  chave, credencial pela instance role `lotus-ec2` (policy `lotus-ses`, runbook §4)"; cita
  `deploy/aws/env.prod.example`, nunca mais `backend/.env.production.example:106`.
- §4: o bloco `MAIL_PASSWORD` vira "**E-mail.** Não há credencial a rotacionar: a role da EC2 é a
  credencial, e a policy `lotus-ses` é o que se revoga (`delete-role-policy`). A prova continua
  sendo um e-mail que chega." O parágrafo das credenciais de S3 (linhas 72-79) deixa de prometer
  "se o item 10 trocar para `ses`": a troca aconteceu, e a rotação de access key não existe —
  não há access key.
- §6: "revisão anual de `DB_PASSWORD`, do `MAIL_PASSWORD` e das credenciais de S3" vira só
  `DB_PASSWORD` (S3 e e-mail não têm credencial de longa duração).
- §5.2, linha 139: a citação `backend/.env.production.example:60` (`SESSION_DRIVER`) passa a
  apontar para `deploy/aws/env.prod.example:59`.

### 4.6 Pendências

- **P-93 nasce nesta spec** (commit do planejamento): "`docs/operacao-segredos.md` afirma que
  produção envia por SMTP com `MAIL_PASSWORD` e cita `backend/.env.production.example:106`;
  produção está em `MAIL_MAILER=log` desde o item 10 v2 e passa a `ses` no item 33". Bloco 33,
  gatilho: fecha no commit de §4.5. Vai para `encerradas.md` no fechamento deste bloco.
- **P-53**: a linha "Transporte de e-mail virou padrão de fato sem ADR" da tabela ganha
  `~~…~~ paga pelo item 33 (ADR-23)`; a ficha e a linha do índice registram o pagamento parcial.
  As outras 11 linhas não se tocam.
- **P-81**: uma linha na ficha — "medida `Active` em 2026-09-28 pelo item 33; a policy
  `lotus-ses` nasce na role, nunca nesse usuário". Segue com o João.

### 4.7 PR, merge e espelho

Uma PR desta lane para a `main`, mesclada pelo João e espelhada pelo caminho do `CONTRIBUINDO.md`.
O SHA espelhado é o que o botão promove no §5.4.

## 5. Fase B — produção, na ordem

Escrita do João; leitura e audit da sessão (`blocos/33-infra-producao-email-ses/audit.md`). Do
`.env` só sai nome de chave. Nenhum e-mail é transcrito: do alerta e do reset ficam remetente,
assunto, `Authentication-Results` e o horário.

1. **Production access.** Console SES `sa-east-1` → *Account dashboard* → *Request production
   access*: tipo `Transactional`; URL `https://app.lotusotec.cl`; uso: alertas de segurança e
   recuperação de senha da intranet de gestão de capacitação da Lotus, ~10 usuários internos,
   dezenas de mensagens por mês, sem lista de marketing; bounces e complaints tratados pela
   suppression list. Ou por CLI, `aws sesv2 put-account-details --production-access-enabled
   --mail-type TRANSACTIONAL --website-url https://app.lotusotec.cl --use-case-description "…"
   --contact-language EN`. O João guarda o número do caso; a sessão registra a data.
2. **Policy.** João aplica a `lotus-ses` (§4.4). Sessão lê `get-role-policy` e confere as três
   partes: ações, `Resource` na identidade, `Condition` no remetente.
3. **Merge e espelho** da PR (§4.7).
4. **`.env` e botão.** João edita `/opt/lotus/.env` (`MAIL_MAILER=ses`), depois clica o botão no
   SHA espelhado. Sessão lê o run (`fim` com `resultado ok`), `/up` 200 de fora,
   `grep -c '^MAIL_MAILER=' /opt/lotus/.env` = 1 (nome, não valor) e
   `docker compose … exec -T app php -r 'echo config("mail.default");'` = `ses` — se o auto mode
   barrar, o João roda e cola.
5. **Sonda em sandbox (D9).** `tinker`: `Mail::raw('sonda item 33', fn ($m) => $m->to('<e-mail do
   admin>')->subject('sonda'))`. Esperado antes da aprovação: `MessageRejected … not verified`.
   `AccessDenied` → PARE, policy errada, volta ao passo 2. Sem exceção → a conta já saiu do
   sandbox (passo 6 já vale).
6. **Aprovação.** `aws sesv2 get-account --region sa-east-1` com `ProductionAccessEnabled: true`.
   Até chegar, o bloco espera aqui: `blocked`, `resume_state: executing`, `blocker` com o número
   do caso. Negado: `blocked` com o motivo, decisão do João.
7. **Prova D7.** De fora, 15 `POST /api/login` com senha errada para a conta do João, com
   `Origin` e `Accept` (lição 12), 5 por minuto. Na 15ª, o alerta sai para todos os admins ativos.
   Prova: o e-mail na caixa do João, com `Authentication-Results` mostrando `dkim=pass
   header.d=lotusotec.cl`, `spf=pass … ses.lotusotec.cl` e `dmarc=pass`; a linha
   `alerta_de_acesso_suspeito` no canal `seguranca`; e `FalhaDeObservabilidade` sem linha nova.
8. **Prova do reset.** Pela UI em `https://app.lotusotec.cl`: "olvidé mi contraseña" com o e-mail
   do João → e-mail chega → link abre a tela de nova senha → senha nova → login com ela → o
   `throttle:password` (6/min) não é tocado. A senha antiga cai (sessões purgadas).
9. **Leitura final.** `get-email-identity` segue `true`/`SUCCESS`/`SUCCESS`; `dig MX lotusotec.cl`
   (ou `nslookup -type=MX`) devolve só Google; `get-account` com `SentLast24Hours` ≥ 2.

## 6. Falhas e recuo

- Passo 4 sem `/up` 200: rollback pelo botão não é o caminho — o SHA é o mesmo; o João volta
  `MAIL_MAILER=log` no `.env` e roda `deploy.sh <mesmo sha>` por SSH (runbook §8.1). Nenhum
  dado muda.
- Passo 5 com `AccessDenied`: `get-role-policy`, corrigir, reaplicar (idempotente).
- Alerta sem chegar no passo 7 com `MessageRejected` no log: a conta não saiu do sandbox —
  reler o passo 6. Com `Throttling`: cota de 1/s ainda em vigor, idem.
- Reverter tudo: `delete-role-policy --policy-name lotus-ses` e `MAIL_MAILER=log`. O ADR e os docs
  ficam, com emenda datada dizendo o que foi revertido.

## 7. Catracas (lição 19)

| Entregável | Catraca | Sonda que tem de reprovar |
|---|---|---|
| `deploy/aws/env.prod.example` | `frontend/tests/env-prod-example.test.ts` (par nominal já existente) | `MAIL_MAILER=log`; `AWS_ACCESS_KEY_ID=` presente |
| `docs/adrs.md`, `docs/operacao-segredos.md`, `docs/README.md` | `frontend/tests/repo-docs-refs.test.ts` (paths citados existem) | citar um path inexistente reprova (já provado pelo teste) |
| `deploy/aws/README.md` §4/§13 | nenhuma (o runbook nunca teve; declarado, como o `ci.yml`) | — |
| Backend | nenhum `.php` muda; `git diff main...HEAD -- backend/app backend/config` vazio | — |

## 8. Limites e riscos declarados

- **A aprovação é da AWS.** Prazo típico de um dia útil; pode pedir detalhe. O bloco espera em
  `blocked` com o número do caso; nada se simula.
- **Alerta D7 a N admins em série.** `Notification::send` faz uma chamada por admin; uma exceção
  no meio deixa os seguintes sem e-mail. Com production access a cota deixa de ser 1/s. Não se
  corrige aqui (ADR-21: sem fila); vai para a ficha de observabilidade se o gate medir.
- **Efeito no site.** Production access tira o teto de 200/dia do `/api/contacto` (D-54 do
  `lotus-site`). Registro no audit e aviso ao João; a decisão (WAF, Turnstile basta, outro freio) é
  da sessão do site, não deste bloco.
- **Bounce/complaint.** Sem tópico SNS de feedback: o SES põe o endereço na suppression list e o
  próximo envio falha contido. Para ~10 usuários internos, aceito por escrito no ADR-23.
- **Suíte PHP.** `backend/.env.production.example` muda, logo `backend/` tem diff: a suíte roda no
  fechamento (offset +1); Pint e `typescript:transform` não se aplicam (nenhum `.php`, nenhum DTO).
- **Custo.** SES a 0,10 USD por mil; o Budget `lotus-prod-teto` não filtra serviço, então cobre.

## 9. Definition of Done — comportamento provado

1. Catracas do §7 verdes, sondas vistas reprovar, `pnpm lint` e `pnpm build` verdes.
2. `aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-ses` devolve as duas ações,
   o ARN da identidade e a condição no remetente; `list-access-keys` de `lotus-infra` não ganhou
   chave nova.
3. `aws sesv2 get-account --region sa-east-1` → `ProductionAccessEnabled: true`.
4. `aws sesv2 get-email-identity --email-identity lotusotec.cl` → `DkimAttributes.Status: SUCCESS`,
   `MailFromDomainStatus: SUCCESS`, `VerifiedForSendingStatus: true`; o MX do apex segue Google.
5. Um alerta D7 disparado em produção chega à caixa de um admin real, com DKIM, SPF e DMARC `pass`,
   e o canal `seguranca` tem a linha correspondente.
6. Um reset de senha real completa o ciclo pela UI de produção e a senha nova loga.
7. `docs/operacao-segredos.md` não contém `MAIL_PASSWORD`, `smtp` nem
   `backend/.env.production.example`; P-93 encerrada; a linha da P-53 marcada; ADR-23 publicado.
8. Audit em `blocos/33-infra-producao-email-ses/audit.md` com cada leitura, sem valor de `.env`
   e sem corpo de e-mail.

## 10. Handoff

`executor: claude`. Fase A é da sessão; Fase B é escrita do João e leitura da sessão. Sem
delegação ao Codex na execução; a lente independente entra no `/revisar-sprint` (risco alto:
credencial IAM e caminho de reset de senha).
