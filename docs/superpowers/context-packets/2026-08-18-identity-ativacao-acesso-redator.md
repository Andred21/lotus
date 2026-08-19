---
schema_version: 1
packet_id: identity-ativacao-acesso-redator-v1
block_id: identity-ativacao-acesso-redator
status: ready
generated_at: 2026-08-18T19:38:44-03:00
amended_at: 2026-08-18T19:52:00-03:00
base_ref: feat/identity-ativacao-acesso-redator
base_commit: 03a0b72a2c04ca0e8ea49717c99159e8b8881383
state_path: docs/superpowers/state.md
state_blob_sha: 295eeb09cddacce7a81139f66939544df14a08f8
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: a7db5a0b4b7640f5a8e88d811e0607b5c1011d73
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Identity · ativação de acesso do redator

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** estabelecer o contexto de produto necessário para planejar como um redator cadastrado pelo admin recebe sua credencial, ativa a conta, recebe a role correta e passa a autenticar.

**Non-goals:** escolher silenciosamente o mecanismo de convite, desenhar telas, configurar transporte de e-mail, implementar código, alterar o workflow ou resolver infraestrutura.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| LOCAL-STATE | Repository | `docs/superpowers/state.md` — blob `295eeb09cddacce7a81139f66939544df14a08f8` | commit `03a0b72` | retrieved | Estado, bloco ativo e lacuna declarada |
| LOCAL-BASE | Explicit instruction / repository baseline | Quatro medições verificadas sobre `main@2c7b249` | 2026-08-18 | verified input | Comportamento atual de senha, ativação, role e e-mail |
| DRIVE-RN | Google Drive | `requisitos-negocio.md` — file ID `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J` | 2026-07-16T07:22:27.224Z | retrieved | RN-01, RF-USR-08/09, RF-ROL-05 e política de senha |
| DRIVE-ID | Google Drive | `modulo-identidade-acesso.md` — file ID `1WIJpyCEkQFG_CC1ecTZxM5mjBugtJFaA` | 2026-06-14T19:02:09Z | retrieved | Fronteira de Identity e funcionalidades de autenticação |
| DRIVE-ADMIN | Google Drive | `tela-administracao-acesso.md` — file ID `1BrnI5WLOfQFqLVa-hiSJxzWzhIXatYj1` | 2026-06-16T14:56:51Z | retrieved | Alcance registrado da administração de acesso |
| NOTION-EAP | Notion | `Tasks · Lotus Fase 2` — `collection://e64b7d57-d000-4433-b652-a410e75193cc`, database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | not exposed by connector | retrieved; direct-match query returned 0 | Task correspondente e adjacências de Identity/autenticação |
| JOAO-DEC | João Victor (decisão de produto, 2026-08-18) | Resposta direta às duas perguntas bloqueantes desta ficha | 2026-08-18 | retrieved | Mecanismo de credencial e política de `is_active` |
| FIGMA | Figma | Arquivo/nó não identificado | n/a | **unavailable** — tool discovery returned no `mcp__codex_apps__figma_search` or `mcp__codex_apps__figma_list_files`; available `get_*` tools require a `fileKey`/`nodeId`, absent from the consulted sources | Tela de convite, primeiro acesso ou ativação |

## Key facts

1. A fonte canônica decide o **canal**: credenciais de admins e redatores são enviadas por e-mail pelo sistema; não há auto-registro e o cadastro é feito pelo admin. `[DRIVE-RN]`
2. O Drive não define o conteúdo desse e-mail: senha gerada, senha escolhida pelo admin, convite, link assinado ou link de redefinição permanecem sem decisão registrada. Também não define expiração, reenvio ou revogação. `[DRIVE-RN][DRIVE-ID]`
3. Identity prevê recuperação/redefinição de senha e verificação de e-mail, mas não descreve o fluxo de credencial inicial nem autoriza tratar recuperação como convite. `[DRIVE-ID]`
4. A EAP canônica não contém task de ativação, convite, primeiro acesso ou verificação de e-mail. As adjacentes cobrem login (`2.2.2`), administração de staff (`2.6.2`), CRUD/formulário de redator (`4.1.4`/`4.2.2`), troca autenticada da própria senha (`8.5.7`) e rate limit (`9.1.1`). `[NOTION-EAP]`
5. Não foi possível verificar uma tela de ativação no Figma porque nenhuma fonte forneceu `fileKey`/`nodeId` e o runtime não possui ferramenta de descoberta de arquivos Figma. `[FIGMA]`
6. O Drive exige associação automática da role correspondente ao tipo no cadastro; o comportamento local medido deixa o redator sem role. `[DRIVE-RN][LOCAL-BASE]`
7. Localmente, o redator nasce inativo, com senha aleatória não entregue, sem escrita alcançável de `is_active=true`, sem transporte de e-mail e recusado pelo login. `[LOCAL-BASE][LOCAL-STATE]`
8. **Inferência bloqueante:** o e-mail é requisito decidido, mas implementar seu conteúdo ou a transição de ativação exigiria inventar uma regra de produto que nenhuma fonte disponível fornece. `[DRIVE-RN][NOTION-EAP][LOCAL-BASE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Canal de entrega | Credenciais de admins e redatores são enviadas por e-mail | E-mail é obrigatório | RF-USR-09 no Drive canônico |
| Mecanismo entregue | Não especificado | **Link por e-mail**, um mecanismo servindo dois fluxos: primeiro acesso (disparado no cadastro) e recuperação de senha (self-service) | Decisão do João, 2026-08-18 `[JOAO-DEC]`; compatível com RF-USR-09 e com a recuperação já prevista em `[DRIVE-ID]` |
| Role do redator | Role correspondente é associada automaticamente no cadastro | Produto exige role `redator`; código atual diverge | RF-ROL-05, com prioridade do Drive |
| Ativação | Nenhuma regra para `is_active` ou momento da ativação | O redator nasce `is_active=true` **no cadastro**; o admin pode **revogar** o acesso depois. Cliente e aluno continuam `false` por padrão | Decisão do João, 2026-08-18 `[JOAO-DEC]`; a RN-01 permanece intacta para cliente e aluno |
| Tela administrativa | Gestão registrada cobre admins e roles/permissões | Não prova que essa tela deva ativar redatores | Limite explícito de `[DRIVE-ADMIN]` |

## Constraints

- Somente SuperADMIN, Administrativo e Redator podem autenticar; cliente e aluno continuam sem acesso. `[DRIVE-RN]`
- O redator é cadastrado internamente pelo admin e deve receber a role automaticamente. `[DRIVE-RN]`
- Senhas devem permanecer protegidas por hash robusto; nenhum segredo em texto claro pode ser derivado como solução. `[DRIVE-RN]`
- O estado local não possui transporte de e-mail nem fluxo de reset/ativação consumível; convite por e-mail implica capacidade ainda inexistente. `[LOCAL-BASE]`
- A operação permanece read-only: nenhuma alteração local, externa ou de estado foi autorizada.

## External acceptance signals

- Um redator cadastrado pelo admin recebe pelo sistema um e-mail que efetivamente lhe permite obter acesso. `[DRIVE-RN]`
- Concluído o fluxo decidido, o redator autentica com a role `redator` e permanece segregado dos módulos administrativos/financeiros. `[DRIVE-RN]`
- Cliente e aluno continuam incapazes de autenticar. `[DRIVE-RN]`
- Um redator cadastrado hoje autentica: recebe o link, define a senha e entra com a role `redator`.
- Um redator com acesso revogado pelo admin deixa de autenticar, sem ser apagado.
- Um redator que esqueceu a senha se recupera sozinho, sem intervenção do admin.

## Open questions

**As duas bloqueantes foram respondidas pelo João em 2026-08-18 `[JOAO-DEC]` e migraram para a
tabela de decisões acima.** O que sobra é escopo e detalhe, resolvido no brainstorming, não fonte
externa faltando:

- Expiração, reenvio e tratamento de e-mail não recebido do link de primeiro acesso — a política
  padrão do broker do Laravel (60 min) foi desenhada para recuperação, não para primeiro acesso.
- Se a revogação de acesso do redator entra neste bloco ou vira item próprio, e por qual superfície
  (tela de redator × tela de usuários administrativos).
- Se o bloco entrega backend e frontend juntos, dado que "esqueci minha senha" e "definir senha" são
  telas públicas que hoje não existem.
- Transporte de e-mail em desenvolvimento: `MAIL_MAILER=log` prova o disparo sem entregar nada, e a
  decisão de canal agora torna a prova ponta a ponta parte do DoD. `[LOCAL-BASE]`

## Deferred

- Provedor e configuração de e-mail para desenvolvimento e produção, até o mecanismo ser decidido.
- Design e revisão visual das telas de primeiro acesso, caso o mecanismo escolhido exija UI.
- Hardening de rate limit da EAP `9.1.1`, sem usá-lo como substituto da decisão de produto.

## Staleness triggers

- `active_work_item`, `active_spec` ou `active_plan` passar a apontar para outro escopo.
- A Lotus registrar no Drive mecanismo de credencial ou política de ativação que contradiga a
  decisão do João de 2026-08-18 `[JOAO-DEC]` — que hoje é a fonte destas duas respostas, e não está
  escrita no Drive.
- O Drive canônico ou a EAP ganhar ou alterar requisito/task de convite, primeiro acesso ou ativação.
- Um arquivo/nó Figma relevante ser identificado ou contradizer este packet.
- O código de cadastro, provisionamento, autenticação, RBAC ou e-mail mudar de forma que altere as lacunas locais registradas.
