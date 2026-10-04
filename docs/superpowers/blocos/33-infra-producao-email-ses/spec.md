# Spec — `infra-producao-email-ses` — 2026-09-28

> Item 33 do backlog, lane aberta pelo `lane.sh abrir` em 2026-09-28 (`lane_base 6be051de`),
> offset +1. `Contexto: sim` — packet em
> `docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md` (Codex pelo plugin
> `codex-companion`, read-only; o MCP `mcp__codex__codex` segue ausente). Paga a **P-93** (aberta
> por esta spec) e a linha "transporte de e-mail sem ADR" da **P-53**. Spec e plano moram na pasta
> do bloco (`blocos/33-infra-producao-email-ses/spec.md` e `plano.md`), como o bloco 35 faz e como o
> `lane.sh conferir` lê; os commands ainda dizem `specs/` e `plans/` (`state.md`, §Transição).

> **Emendada em 2026-10-01 (replanejamento, decisão do João).** A Fase A original (§4.1 a §4.7)
> entrou na `main` pela PR #121 (`44e6e372`) e ainda não foi espelhada. Depois disso o João decidiu
> **não pedir production access**: a conta SES fica em sandbox. `@lotusotec.cl` recebe pela
> identidade de domínio; cada endereço externo é verificado como identidade antes do primeiro
> envio; o production access fica adiado, com o gatilho escrito em três lugares (D14). A emenda
> reescreve D2, D5, D6 e D9, acrescenta D12 a D14 e a §4.8, e substitui §5, §6, §8 e §9. Onde um
> texto de 2026-09-28 sobrevive e diverge da emenda, a emenda vence. A ficha 33 do `backlog.md`
> ainda pede "conta fora do sandbox" no DoD: a decisão de 2026-10-01 a substitui, e o main tree
> remove a ficha no fechamento (§10).

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

1. Destinatário entregável — em sandbox, alerta, reset e convite só chegam a `@lotusotec.cl`
   (domínio verificado) ou a endereço verificado como identidade; o resto volta `Email address is
   not verified`, e a `FalhaDeObservabilidade` (ou o `report`) engole — a falha assintomática que o
   `operacao-segredos.md` §4 já descreve. A versão de 2026-09-28 dizia "sair do sandbox".
2. `ses:SendRawEmail`/`ses:SendEmail` na `lotus-ec2`, só com o remetente — `Resource`
   `identity/*`, porque o sandbox autoriza também a identidade do destinatário (§1.3).
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

**Achados do replanejamento de 2026-10-01** (os três acima ficam como registro do que se decidiu
antes):

- **Sandbox com destinatário verificado.** O João decidiu não abrir caso na AWS. A guarda de
  domínio segue recusada; no lugar dela, o endereço externo vira identidade (`create-email-identity`,
  escrita do João), e a pessoa clica no link da AWS antes do primeiro envio — uma vez por endereço.
  O Turnstile já freia o `/api/contacto` do site, e com a conta em sandbox o teto de 200/dia
  continua existindo.
- **Em sandbox o IAM é checado também contra a identidade do destinatário** (AWS, *Identity and
  access management in Amazon SES*: as restrições do sandbox impedem algumas policies). Com
  `Resource` só em `identity/lotusotec.cl`, um destinatário `@lotusotec.cl` passa — ele cai na
  mesma identidade, que é o caso do site — e um externo verificado volta `not authorized …
  identity/<destinatário>`. A sonda D9 de 2026-09-28 leria esse erro como "policy errada".
- **A verificação personalizada exige production access** (`SendCustomVerificationEmail` lança
  `ProductionAccessNotGrantedException`): o e-mail de verificação é o padrão da AWS, em inglês, e
  o link vale 24 h.
- **A AWS aceita rajada curta acima de 1/s** (*Managing your Amazon SES sending limits*): o alerta
  D7 em série para poucos admins deve caber; a prova D7 mede.
- **O convite só vai para redator.** O admin não recebe convite; provar o convite exigiria um
  redator de teste em produção, que é dado auditado. O transporte é o mesmo do reset.

## 2. Decisões do brainstorming

| # | Decisão | Alternativas recusadas |
|---|---|---|
| D1 | **Repositório antes da produção, em duas fases.** Fase A na lane, PR mesclada e espelhada. Fase B em produção: o João escreve (IAM, identidades, `.env`, botão, provas — o ticket da AWS saiu na emenda de 2026-10-01), a sessão lê e escreve o audit. | Host primeiro: o botão recusa host divergente da `main` (item 31). Um bloco só de "pedir access" antes: a espera corre igual em paralelo. |
| D2 | **Conta em sandbox, destinatário verificado** (emenda de 2026-10-01; a versão de 2026-09-28 pedia production access). `@lotusotec.cl` recebe pela identidade de domínio; o endereço externo vira identidade (`create-email-identity`, escrita do João) e a pessoa clica no link da AWS antes do primeiro envio — uma vez por endereço. Sem guarda e sem código PHP: esquecer a verificação faz a falha passar calada (runbook §13.1). Production access adiado, com gatilho (D14). | Production access agora: o João não quer abrir caso na AWS, e o caminho fica pronto no runbook §13.6. Sandbox + guarda de domínio no backend: recusada em 2026-09-28, acopla os usuários a `@lotusotec.cl`. Outro provedor: §1.3. |
| D3 | **Mailer `ses`** (API v1, `SendRawEmail`), já declarado no `mail.php`. Zero código PHP. | `ses-v2`: uma linha a mais no `mail.php` sem ganho medido; a v1 é suportada e o SDK é o mesmo. |
| D4 | **Remetente `Lotus <lotus@lotusotec.cl>`**, o que o molde já fixa desde o item 10. Sem caixa: resposta volta pelo MX do Google como inexistente. | `no-reply@`: muda molde e host por nada. Caixa real: ninguém a lê. |
| D5 | **Terceira inline `lotus-ses` na `lotus-ec2`**, aplicada pelo João com `put-role-policy` + readback, snippet no runbook §4 — o mesmo molde da `lotus-alerta`. `Action: ses:SendRawEmail, ses:SendEmail`; `Resource: arn:aws:ses:sa-east-1:<conta>:identity/*` (emenda de 2026-10-01: o sandbox autoriza também a identidade do destinatário); `Condition StringEquals ses:FromAddress: lotus@lotusotec.cl` — o remetente segue travado. Vale igual fora do sandbox. | `Resource` só na identidade de domínio: externo verificado volta "not authorized" em sandbox. `Resource` com o ARN de cada externo: reaplicar a policy a cada usuário novo, com e-mail pessoal dentro do IAM. Script `deploy/aws/conceder-ses.sh` com catraca: mais arquivos por uma política aplicada uma vez. Ampliar a `lotus-s3`: mistura escopos. |
| D6 | **ADR-23 curto**: e-mail transacional por SES, identidade compartilhada do site (o site é dono, o Lotus reusa, nunca duas), instance role, síncrono sem fila, bounce/complaint só pela suppression list do SES. Paga a linha da P-53. **Emenda de 2026-10-01:** conta em sandbox por decisão, `identity/*` na policy, production access adiado com gatilho (D14). | Emenda no ADR-14: a decisão não é de compute, e a P-53 seguiria aberta. |
| D7 | **`backend/.env.production.example` alinhado a `ses` no mesmo commit** do molde real; `operacao-segredos.md` passa a citar só `deploy/aws/env.prod.example`. | Apagar o legado: toca a spec dos hooks de guarda e referências fora do escopo. Deixar: doc corrigido e molde mentindo. |
| D8 | **`.env` do host muda antes do botão, e a recriação é o próprio deploy** do SHA espelhado da PR desta lane. O Compose recria `app` e `scheduler` porque o `env_file` mudou. Sem chave nova no molde, a conferência de alinhamento (item 31) não trava. | `docker compose up -d` à mão por SSH: fora do botão e do ledger. Chave nova só para forçar recriação: ruído. |
| D9 | **Duas sondas por `tinker` no contêiner** (emenda de 2026-10-01). Positiva: `Mail::raw` para um externo verificado (o Gmail do João) — chega, e prova role, policy e a checagem do destinatário de uma vez. Negativa: para um endereço não verificado — `Reason: Email address is not verified`, a prova de que o sandbox segue de pé. `not authorized … ses:SendRawEmail` diz que a policy está errada. | Só a negativa (a de 2026-09-28): não prova o caminho do externo, e com `Resource` no domínio devolveria o erro de policy no lugar do de sandbox. |
| D10 | **Prova D7 pela família `login_falho_repetido`**: 15 senhas erradas contra uma conta real, de fora, dentro de 15 min, respeitando o `throttle:login` (5/min) — cerca de 4 min. | `sequencia_de_403`: exige usuário sem permissão logado e 20 chamadas. `sessao_de_conta_desativada`: desativar uma conta real. |
| D11 | **`efeito_externo: sim`, `executor: claude`.** Produção, conta AWS, cross-repo em efeito, julgamento fora do plano. | — |
| D12 | **Drive emendado pela sessão, com o ok do João no texto** (`arquitetura-aws-lotus.md`, G-1): o §1.4 *Implementação* e a linha de *Pendências* deixam de pedir a saída do sandbox antes de produção e passam a dizer "sandbox por decisão, com gatilho". Escrita depois da aprovação desta spec e registrada no audit. | Deixar divergente: o Drive vence, e a próxima sessão leria "sair do sandbox" como requisito. |
| D13 | **Espelho único.** A PR da emenda (§4.8) sai desta mesma branch, depois de trazer a `origin/main`; o João mescla e espelha uma vez, levando o #121 e a emenda juntos. O botão promove esse SHA. | Espelhar o #121 antes: o corporativo receberia ADR-23 e runbook pedindo production access. |
| D14 | **O gatilho do production access em três lugares.** (a) O ADR-23: quando uma feature enviar e-mail a quem não é admin ou redator interno (cliente, aluno, outra empresa), quando verificar externo virar rotina, ou quando o volume somado ao do site se aproximar de 200/24 h. (b) O runbook §13.6, com o texto e o comando do pedido prontos. (c) O **FUT-4** do `backlog.md`, que o main tree escreve no fechamento (§10). | Só o ADR: o planejamento de uma feature lê o backlog antes dos ADRs. Pendência: o índice é de divergência de doc, não de feature futura. |

## 3. Escopo

**Dentro:** §4 e §5 inteiros. **Fora** (registrado): Lambda/formulário/WAF do site; DKIM do Google
e `include:spf.stackmail.com` (D-46 do site); central de notificações (FUT-3); worker de fila;
tratamento de bounce/complaint além do padrão do SES; observabilidade de e-mail (bloco próprio);
P-81 (a chave é do João); Notion `10.1.4` (o João marca); `CLAUDE.md` e as outras linhas da P-53.
Fora também, pela emenda de 2026-10-01: o production access (adiado com gatilho, D14 — o pedido
fica pronto no runbook §13.6); o e-mail de verificação personalizado (exige production access); a
prova do convite do redator (exigiria um redator de teste em produção, e o transporte é o mesmo do
reset); o número da conta nos dois audits legados de `docs/superpowers/audits/` (itens 10 v2 e 12),
que são de outros blocos.

## 4. Fase A — repositório (`lotus-infra`, esta lane)

As §4.1 a §4.7 foram entregues pela PR #121 (mesclada em 2026-10-01, `44e6e372`) e ficam como
registro. A §4.8 é a emenda de 2026-10-01 e vence onde divergir delas: a §4.3 ainda diz
"production access da conta", e a §4.4 ainda nomeia o §13 como "production access".

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

### 4.8 Emenda de 2026-10-01 — Fase A', uma PR nova desta branch

A branch traz a `origin/main` antes (o #121 já está lá, e os #122 a #124 vieram depois); a PR nova
leva só a emenda. O espelho é um só (D13).

- **Runbook §4.** A `lotus-ses` passa a `Resource` `arn:aws:ses:sa-east-1:$CONTA:identity/*`, com
  a mesma `Condition`. Uma frase diz por quê (o sandbox checa a identidade do destinatário) e que a
  policy vale igual fora do sandbox. O readback confere as duas ações, `identity/*` e o remetente.
- **Runbook §13** passa a "E-mail — sandbox, destinatários, `.env` e as duas provas":
  - **13.1 Destinatários em sandbox.** A regra (domínio verificado ou endereço verificado). A ordem
    para externo: `create-email-identity`; a pessoa clica no link da AWS em até 24 h (em inglês —
    avise antes); só então convite ou reset. A leitura `get-email-identity … --query
    VerifiedForSendingStatus`. A tabela do que acontece com a ordem invertida: no cadastro, o
    convite se perde calado e o admin reenvia depois do clique; no reenvio, a tela avisa; no reset,
    a resposta é a genérica e nada chega; no alerta, a falha é engolida, e um admin não verificado
    no meio da série corta os seguintes. No desligamento do usuário, `delete-email-identity`.
  - **13.2** `.env` e promoção, igual.
  - **13.3 Sondas** positiva e negativa (D9), com a tabela de `Reason`.
  - **13.4 As duas provas**, sem a condição de production access. Pré-condição: todo admin ativo é
    `@lotusotec.cl` ou verificado.
  - **13.5 Recuo**, sem o caso "pedido negado".
  - **13.6 Sair do sandbox — só quando o gatilho do ADR-23 disparar.** O texto e o comando do
    §13.1 de 2026-09-29 (console ou `put-account-details`), o `get-account` de readback, o efeito no
    teto do site e a limpeza opcional das identidades pessoais depois da aprovação. A policy não
    muda.
- **ADR-23.** A *Decisão* troca "só na identidade" por `identity/*` e "a conta sai do sandbox" por
  "a conta fica em sandbox por decisão, destinatário verificado". As *Consequências* trocam "o teto
  de 200/dia deixa de existir" por "o teto segue, dividido com o site". O production access não
  entra no *Descartado*: vira um parágrafo **Emenda de 2026-10-01** com o porquê e o gatilho (D14).
  Sem número de conta.
- **`docs/operacao-segredos.md` §4.** Uma frase: em sandbox, o destinatário externo não verificado
  também falha calado — runbook §13.1.
- **Packet** (`docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md`): o número
  da conta vira `<conta>` (o repositório pessoal é público), e uma nota datada no topo diz que a
  linha "Sandbox" das decisões resolvidas foi substituída pela emenda de 2026-10-01 (J-1).
- **Audit.** A seção "Replanejamento de 2026-10-01" registra a decisão, o achado do IAM, o estado do
  espelho e a escrita do Drive (D12).

As catracas são as mesmas da §7; o runbook segue sem catraca, declarado.

## 5. Fase B — produção, na ordem (emenda de 2026-10-01)

Escrita do João; leitura e audit da sessão (`blocos/33-infra-producao-email-ses/audit.md`). Do
`.env` só sai nome de chave. Nenhum e-mail é transcrito: do alerta, do reset e da sonda ficam
remetente, assunto, `Authentication-Results` e o horário. **Nenhum endereço de destinatário entra
em arquivo versionado**: o audit diz "o Gmail do João" e conta os externos, sem listá-los. Os
comandos são os do runbook §13 emendado (§4.8); onde este texto e o runbook divergirem, o runbook
vence (desvio aprovado em 2026-09-29, review da Task 5).

1. **Merge e espelho** da PR da §4.8 (D13). O SHA espelhado leva o #121 e a emenda.
2. **Policy.** O João aplica a `lotus-ses` do runbook §4. A sessão lê `get-role-policy` e confere
   as três partes — ações, `Resource` `identity/*`, `Condition` no remetente — e o
   `list-access-keys` de `lotus-infra`, sem chave nova.
3. **Destinatários.** O João levanta, na base de produção, os admins e redatores ativos fora de
   `@lotusotec.cl` e roda `create-email-identity` para cada um e para o próprio Gmail; cada pessoa
   clica no link em até 24 h. A sessão lê `list-email-identities` (o domínio mais N externos) e o
   `VerifiedForSendingStatus: true` de cada um; o audit registra só N. A prova D7 só roda com este
   passo completo para **todos os admins ativos**: um admin não verificado corta a série.
4. **`.env` e botão.** O João edita `/opt/lotus/.env` (`MAIL_MAILER=ses`) e depois clica o botão
   no SHA espelhado. A sessão lê o run (`fim` com `resultado ok`), o `/up` 200 de fora,
   `grep -c '^MAIL_MAILER=' /opt/lotus/.env` = 1 (nome, não valor) e
   `php artisan config:show mail.default` com `ses` (runbook §13.2) — se o auto mode barrar, o João
   roda e cola.
5. **Sondas (D9).** Positiva para o Gmail do João: sem exceção, e a mensagem chega com DKIM, SPF e
   DMARC `pass`. Negativa para um endereço não verificado: `Reason: Email address is not
   verified`. `not authorized … ses:SendRawEmail` → PARE, volta ao passo 2.
6. **Prova D7.** De fora, 15 `POST /api/login` com senha errada para a conta de um admin, pelo loop
   com CSRF do runbook §13.4, 5 por minuto. Na 15ª, o alerta sai para todos os admins ativos.
   Prova: a mensagem na caixa de um admin real, com `dkim=pass header.d=lotusotec.cl`, `spf=pass`
   em `ses.lotusotec.cl` e `dmarc=pass`; a linha `acesso.suspeito` no canal `seguranca`; e nenhuma
   linha `Falha ao enviar alerta`.
7. **Prova do reset.** Pela UI em `https://app.lotusotec.cl`, no link "¿Olvidaste tu clave?", com o
   e-mail de um usuário `@lotusotec.cl` ou verificado → o e-mail chega → o link abre a tela de nova
   senha → senha nova → login com ela. A senha antiga cai (sessões purgadas); o `throttle:password`
   (6/min) não é tocado.
8. **Leitura final.** `get-account`: `ProductionAccessEnabled: false` (decisão, ADR-23),
   `SendingEnabled: true` e `SentLast24Hours` maior que zero, lido no dia das provas.
   `get-email-identity lotusotec.cl` segue `true`/`SUCCESS`/`SUCCESS`; `dig MX lotusotec.cl` (ou
   `nslookup -type=MX`) devolve só Google.

Os passos 2 e 3 andam a qualquer hora; o 1 vem antes do 4, e o 4 antes do 5, do 6 e do 7. Não há
espera da AWS nem `blocked` previsto.

## 6. Falhas e recuo

- Passo 4 sem `/up` 200: rollback pelo botão não é o caminho — o SHA é o mesmo; o João volta
  `MAIL_MAILER=log` no `.env` e roda `deploy.sh <mesmo sha>` por SSH (runbook §8.1). Nenhum
  dado muda.
- Passo 5 com `not authorized … ses:SendRawEmail`: `get-role-policy`, corrigir, reaplicar
  (idempotente). Sonda positiva com `Email address is not verified`: o Gmail não terminou a
  verificação — volta ao passo 3.
- Passo 6 com `Falha ao enviar alerta`: PARE. O log não traz o `Reason` (a
  `FalhaDeObservabilidade` grava só classe, código e origem, de propósito). Se algum admin ativo
  não é `@lotusotec.cl` nem verificado, volta ao passo 3 e espera os 15 min da janela do D7 antes
  de repetir. Se todos estão, é a rajada acima do que o sandbox aceita: o conserto pede código
  (espaçar os envios, ou um envio só para todos os admins) e é bloco próprio — decisão do João.
- Reverter tudo: `delete-role-policy --policy-name lotus-ses` e `MAIL_MAILER=log`. As identidades
  externas podem ficar (sozinhas não enviam nada) ou sair com `delete-email-identity`. O ADR e os
  docs ficam, com emenda datada dizendo o que foi revertido.

## 7. Catracas (lição 19)

| Entregável | Catraca | Sonda que tem de reprovar |
|---|---|---|
| `deploy/aws/env.prod.example` | `frontend/tests/env-prod-example.test.ts` (par nominal já existente) | `MAIL_MAILER=log`; `AWS_ACCESS_KEY_ID=` presente |
| `docs/adrs.md`, `docs/operacao-segredos.md`, `docs/README.md` | `frontend/tests/repo-docs-refs.test.ts` (paths citados existem) | citar um path inexistente reprova (já provado pelo teste) |
| `deploy/aws/README.md` §4/§13 | nenhuma (o runbook nunca teve; declarado, como o `ci.yml`) | — |
| Backend | nenhum `.php` muda; `git diff main...HEAD -- backend/app backend/config` vazio | — |

A emenda (§4.8) passa pelas mesmas catracas; o packet não tem catraca.

## 8. Limites e riscos declarados

- **Falha calada com externo não verificado** (emenda de 2026-10-01). O reset responde a mensagem
  genérica e não entrega; o convite do cadastro se perde no `report` (o reenvio, esse, avisa na
  tela); o alerta é engolido pela `FalhaDeObservabilidade`. A mitigação é a ordem do runbook §13.1,
  e os admins da Lotus precisam saber que cadastro com e-mail de fora passa antes pelo João. Quem
  avisa é o João; o sistema não avisa.
- **O destinatário vai para o log default no reset e no convite.** `PasswordResetController::forgot`
  e `CreateRedatorAction` contêm a falha com `report($e)`, que grava a mensagem da exceção; a do
  SES em sandbox é `… Email address is not verified. The following identities failed the check in
  region SA-EAST-1: <destinatário>`. O alerta D7 não tem o problema (`FalhaDeObservabilidade` não
  grava a mensagem, catraca 4 do bloco de observabilidade). Código existente, alcançável agora que
  há transporte real; o conserto é PHP e fica fora deste bloco (§10).
- **Alerta D7 a N admins em série.** `Notification::send` faz uma chamada por admin; uma exceção no
  meio — admin não verificado, ou rajada acima do 1/s do sandbox — deixa os seguintes sem e-mail.
  A AWS aceita rajada curta acima do limite; a prova D7 mede. Não se corrige aqui (ADR-21: sem
  fila); vai para a ficha de observabilidade se o gate medir.
- **Cota de 200/24 h dividida com o site.** O `/api/contacto` e o Lotus gastam a mesma cota. O
  Turnstile do site segura abuso, e o Lotus manda dezenas por mês. Encostar no teto é um dos
  gatilhos do production access (D14).
- **Identidades pessoais na conta do site.** Cada externo verificado é uma identidade de e-mail na
  conta AWS onde o `lotus-site` também vive. Sozinha ela não envia nada (a policy do Lotus trava o
  remetente em `lotus@`, e a do site em `sitio@`), mas é dado pessoal fora da base: sai com
  `delete-email-identity` no desligamento do usuário (runbook §13.1).
- **O e-mail de verificação é da AWS, em inglês.** A versão personalizada exige production access.
  Quem vai receber precisa ser avisado antes, ou o link expira em 24 h sem clique.
- **Bounce/complaint.** Sem tópico SNS de feedback: o SES põe o endereço na suppression list e o
  próximo envio falha contido. Para ~10 usuários internos, aceito por escrito no ADR-23.
- **Suíte PHP.** O #121 mudou `backend/.env.production.example`; a suíte roda no fechamento
  (offset +1). Pint e `typescript:transform` não se aplicam (nenhum `.php`, nenhum DTO).
- **Custo.** SES a 0,10 USD por mil; o Budget `lotus-prod-teto` não filtra serviço, então cobre.

## 9. Definition of Done — comportamento provado

1. Catracas do §7 verdes, sondas vistas reprovar, `pnpm lint` e `pnpm build` verdes.
2. `aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-ses` devolve as duas ações,
   o `Resource` `arn:aws:ses:sa-east-1:<conta>:identity/*` e a condição no remetente;
   `list-access-keys` de `lotus-infra` não ganhou chave nova.
3. `aws sesv2 get-account --region sa-east-1` → `ProductionAccessEnabled: false`, registrado como
   decisão no ADR-23 (emenda de 2026-10-01); `list-email-identities` → o domínio mais os N externos
   do passo 3, cada um com `VerifiedForSendingStatus: true`.
4. `aws sesv2 get-email-identity --email-identity lotusotec.cl` → `DkimAttributes.Status: SUCCESS`,
   `MailFromDomainStatus: SUCCESS`, `VerifiedForSendingStatus: true`; o MX do apex segue Google.
5. A sonda positiva chega ao Gmail do João (externo verificado) com DKIM, SPF e DMARC `pass`, e a
   negativa devolve `Email address is not verified`.
6. Um alerta D7 disparado em produção chega à caixa de um admin real, com DKIM, SPF e DMARC `pass`;
   o canal `seguranca` tem a linha correspondente, e `Falha ao enviar alerta` não tem nenhuma.
7. Um reset de senha real completa o ciclo pela UI de produção e a senha nova loga.
8. `docs/operacao-segredos.md` não contém `MAIL_PASSWORD`, `smtp` nem
   `backend/.env.production.example`; P-93 encerrada; a linha da P-53 marcada; ADR-23 publicado
   com a emenda de 2026-10-01 e o gatilho; runbook §13.6 com o pedido pronto; Drive emendado (D12);
   packet sem número de conta.
9. Audit em `blocos/33-infra-producao-email-ses/audit.md` com cada leitura, sem valor de `.env`, sem
   corpo de e-mail e sem endereço de destinatário.

## 10. Handoff

`executor: claude`. Fase A é da sessão; Fase B é escrita do João e leitura da sessão. Sem
delegação ao Codex na execução; a lente independente entra no `/revisar-sprint` (risco alto:
credencial IAM e caminho de reset de senha).

**No fechamento, pelo main tree** (a lane não escreve o `backlog.md`):

- *Futuros* ganha o **FUT-4** (D14):

  > - **FUT-4 · Destinatário de e-mail fora dos usuários internos** — cliente, aluno ou usuário de
  >   outra empresa recebendo e-mail do sistema. A conta SES está em sandbox por decisão (ADR-23,
  >   emenda de 2026-10-01): sem production access, cada destinatário fora de `@lotusotec.cl` precisa
  >   clicar antes num link da AWS. Pré-requisito do bloco que trouxer a feature: pedir o production
  >   access logo no início (runbook `deploy/aws/README.md` §13.6, cerca de 1 dia útil de espera). Se
  >   a feature der login a cliente ou aluno, ela também reabre a RN-01 (lei 5 do `CLAUDE.md`).

- *Débitos técnicos* ganha o débito do destinatário no log default (§8): `report($e)` em
  `PasswordResetController::forgot` e `CreateRedatorAction` grava a mensagem da exceção de
  transporte, que traz o endereço; o conserto é trocar por `FalhaDeObservabilidade::registrar`, com
  teste de que a mensagem não chega ao log. Gatilho: o próximo bloco que tocar `Identity` ou a
  observabilidade.
- A ficha 33 sai com o DoD de 2026-09-28 ("conta fora do sandbox") substituído pela decisão de
  2026-10-01 (cabeçalho desta spec).
