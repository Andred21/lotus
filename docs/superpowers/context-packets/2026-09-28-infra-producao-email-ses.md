---
schema_version: 1
packet_id: 2026-09-28-infra-producao-email-ses
block_id: infra-producao-email-ses
status: ready
generated_at: 2026-09-28T00:42:28-03:00
base_ref: infra/33-infra-producao-email-ses
base_commit: 5f91b380519b0b95f7444cbcf9bdd575100d8a47
state_path: docs/superpowers/blocos/33-infra-producao-email-ses/estado.md
state_blob_sha: 5bb86944bcb861f5c90b89f4ccc8c9bc2ea893bb
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 4411d4af5e07f7f0470f3859c6c0528337b9389e
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — E-mail de produção por SES

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

> **Nota de 2026-10-04 (item 33).** A linha "Sandbox" de *Resolved decisions and divergences* e o
> key fact 2 ("não satisfaz o DoD") foram substituídos pela emenda de 2026-10-01 da spec: a conta
> fica em sandbox por decisão do João `[J-1]`, com destinatário verificado e o production access
> adiado com gatilho (ADR-23). O número da conta virou `<conta>`: o repositório pessoal é público.

## Scope

**Goal:** habilitar o backend Lotus para enviar por SES usando a identidade compartilhada de `lotusotec.cl`, credencial da instance role, produção fora do sandbox e provas reais do alerta D7 e do reset de senha.

**Non-goals:** alterar a Lambda/formulário do site, criar outra identidade SES, substituir o Google Workspace, mudar o MX do apex ou construir central de notificações.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| J-1 | João Victor | Instrução atual; bloco 33 e adaptação do estado por bloco | 2026-09-28 | retrieved | Escopo, referência e contrato |
| L-1 | Git local | `lotus@5f91b380519b0b95f7444cbcf9bdd575100d8a47`: ficha 33, spec item 10 §3, ADR-21/D7, env, configs, runbook IAM, P-81, packet 32 | 2026-09-28T00:23:35-03:00 | retrieved | Backend, host, IAM e aceite |
| S-1 | Git local, `Andred21/lotus-site` | snapshot solicitado `f619403bdefc49a17d62193c49b32249da28b8c4`: ADR-SITE-005, `lotus-contato`, `lotus-dns`, inventário e evidência SES | 2026-09-28T00:20:01-03:00 | retrieved at requested commit | Identidade existente, sandbox, DNS e Lambda |
| G-1 | Google Drive | ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, `arquitetura-aws-lotus.md` | 2026-06-22T20:17:27Z | retrieved | Requisito canônico de SES |
| N-1 | Notion | page `388bc960-3dfa-81c6-932b-f7640d70b45a`, EAP `10.1.4`; parent `collection://e64b7d57-d000-4433-b652-a410e75193cc` | 2026-08-14T18:42:07.573Z | retrieved | Task administrativa |
| N-2 | Notion | pages `3c2bc960-3dfa-81cd-bc79-c33fb811701c` (`7.1.4`) e `3c2bc960-3dfa-81e8-945a-d5c261d705b8` (`4.1.7`); parent `collection://2f0e72ec-ef53-4e08-a466-312de7eea7d2` | 2026-09-09T20:20:34.129Z | retrieved | Coordenação com o site |

## Key facts

1. A identidade SES compartilhada **já existe** na conta `<conta>`, região `sa-east-1`, criada e possuída pelo stack `lotus-contato` do `lotus-site`. Em 2026-09-26, `get-email-identity lotusotec.cl` mediu `VerifiedForSendingStatus: true`, DKIM `SUCCESS` e MAIL FROM `SUCCESS`. Este bloco reusa essa identidade; não cria outra. `[S-1]`
2. A conta **não saiu do sandbox**: a medição de 2026-09-26 registrou `ProductionAccessEnabled: false`, cota de 200/24h e 1/s, embora `SendingEnabled: true`. Isso bastou ao formulário porque seu destinatário pertence ao domínio verificado, mas não satisfaz o DoD explícito deste bloco nem o Drive. `[S-1][G-1][L-1]`
3. A zona `lotus-dns` já publica os três CNAME Easy DKIM, `ses.lotusotec.cl MX 10 feedback-smtp.sa-east-1.amazonses.com` e `TXT "v=spf1 include:amazonses.com ~all"`. O apex conserva cinco MX do Google e SPF `"v=spf1 include:_spf.google.com include:spf.stackmail.com -all"`; `mail.` continua CNAME do Google. SES não exige alterar o SPF do apex porque o MAIL FROM próprio vive em `ses.`. `[S-1]`
4. O backend já oferece o mailer `ses`; `services.php` usa `AWS_DEFAULT_REGION`, hoje `sa-east-1`. O molde do host ainda fixa `MAIL_MAILER=log` e `MAIL_FROM_ADDRESS=lotus@lotusotec.cl`; nenhuma fonte sustenta `no-reply`. `[L-1]`
5. A credencial definida para produção é a instance role `lotus-ec2`, sem access key no `.env`. Sua política versionada cobre S3, SNS e SSM, mas ainda não concede SES. A P-81 continua aberta no ledger para a access key de provisionamento; ela não é usada pela aplicação e não deve virar credencial de e-mail. `[L-1]`
6. O alerta D7 é síncrono e enviado a **todos os usuários `admin` ativos**, não a um endereço fixo; falha de transporte é contida e não altera a resposta HTTP. O reset de senha é enviado ao usuário solicitante. `[L-1]`
7. O site já envia pelo mesmo SES: CloudFront encaminha `/api/contacto` à Lambda `lotus-site-contato`, cuja role só pode `ses:SendEmail` pela identidade e pelo remetente `sitio@lotusotec.cl`; uma mensagem real chegou a `contacto@lotusotec.cl`. `[S-1]`
8. A task administrativa `10.1.4` segue `A fazer`; as tasks do site `7.1.4` e `4.1.7` ainda aparecem `Backlog`, embora o repositório posterior registre sua entrega. Notion não reflete o estado operacional atual. `[N-1][N-2][S-1]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Domínio | Drive ainda usa `lotus.cl` | `lotusotec.cl` | Instrução atual e infraestrutura posterior `[J-1][S-1]` |
| Sandbox | Site decidiu que sandbox bastava ao formulário | Bloco 33 deve obter production access | DoD explícito e Drive canônico `[L-1][G-1]` |
| Identidade | Notion `10.1.4` ainda sugere configurá-la | Reusar `lotus-contato` em `sa-east-1` | Evidência AWS posterior `[S-1][N-1]` |
| SPF | Spec antiga previa emendar o SPF `-all` do Google | Manter apex intacto; SES autentica por `ses.` | ADR-SITE-005 e DNS implantado `[S-1][L-1]` |
| Credencial | `operacao-segredos.md` descreve SMTP/access key | SES pela instance role | Molde, runbook e ficha 33 posteriores `[L-1]` |

## Constraints

- A identidade e seus registros DNS continuam sob `lotus-contato`/`lotus-dns`; coordenar qualquer mudança com o site. `[S-1]`
- Conceder à `lotus-ec2` somente o envio necessário pela identidade de `lotusotec.cl`; não reutilizar a P-81. `[L-1]`
- Preservar MX e SPF do apex; não remover `include:spf.stackmail.com` neste bloco sem decisão separada. `[S-1]`
- O remetente versionado é `Lotus <lotus@lotusotec.cl>`; o alerta D7 deve alcançar os admins ativos reais. `[L-1]`

## External acceptance signals

- `get-email-identity` mantém `Verified=true`, DKIM e MAIL FROM `SUCCESS`; `get-account` passa a mostrar production access habilitado.
- O container identifica `assumed-role/lotus-ec2`, sem access keys no host, e envia pelo mailer `ses`.
- Um alerta D7 chega a pelo menos um admin ativo real; um reset real completa o ciclo.
- MX do apex permanece Google e os registros DKIM/MAIL FROM existentes continuam convergentes.

## Open questions

- Confirmar ao vivo se `aws iam list-access-keys --user-name lotus-infra` ainda devolve a chave da P-81. O ledger a mantém aberta; isso não bloqueia o bloco porque a aplicação não a usa. `[L-1]`

## Deferred

- Lambda/formulário do site, WAF, DKIM do Google, decisão sobre `include:spf.stackmail.com` e central de notificações.

## Staleness triggers

- Mudança no status da identidade, região ou sandbox da conta SES.
- Recriação/remoção do stack `lotus-contato` ou alteração dos registros SES em `lotus-dns`.
- Mudança semântica no mailer, env de produção, política `lotus-ec2`, D7 ou ficha 33.
- Drive ou páginas Notion consultadas passarem a contradizer a decisão registrada.
