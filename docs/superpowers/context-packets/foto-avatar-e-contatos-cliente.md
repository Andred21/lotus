---
schema_version: 1
packet_id: foto-avatar-e-contatos-cliente
block_id: foto-avatar-e-contatos-cliente
status: partial
generated_at: 2026-07-31T17:02:08-03:00
amended_at: 2026-07-31
base_ref: main
base_commit: 31e3cd70f183097605835023f850972338ce2928
state_path: docs/superpowers/state.md
state_blob_sha: 9ef2dbf55b484d5f58a095c0d2c1550e0d95c11d
progress_path: docs/superpowers/progress.md
progress_blob_sha: dcd80185a1084e076368eb364d716e77be9431cd
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Foto, avatar e contatos do cliente

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

> **Emenda de 2026-07-31 (pós-geração).** O packet voltou do Codex com `status: blocked` por um fato
> ausente: o ciclo de vida do objeto de foto no S3. O João decidiu esse ponto e mais um `[J-02]`, e
> o packet passa a `partial` — a única fonte que segue `unavailable` é `IMG-REF` (caller-held, não
> bloqueante). Nada foi reconciliado por heurística: as duas linhas correspondentes da tabela de
> divergências citam a instrução explícita como base.

## Scope

**Goal:** Unificar o refinamento de foto/avatar de User, Client, Redator e Student com a reorganização visual e remoção de contatos no cadastro do cliente, preservando os contratos e comportamentos explicitamente definidos pelo João.

**Non-goals:** Self-service de perfil; mudança de autenticação/RBAC; substituição da semântica replace-total dos contatos; hardening das rotas nested registrado em H.3.1; redesenho do subsistema geral de documentos.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| J-01 | João Victor | `instruction:2026-07-31:foto-avatar-e-contatos-cliente` | 2026-07-31 | provided | Escopo unido, critérios visuais e evidência das imagens caller-held |
| J-02 | João Victor | `decision:2026-07-31:desbloqueio-packet` (resposta ao `status: blocked`) | 2026-07-31 | provided | Ciclo de vida do objeto de foto no S3; cardinalidade mínima dos contatos |
| G-USER | Google Drive | `1dlh7BEvFsFZCheOsaS9gl1DmM5WAMUxz` · `entidade-usuario.md`, sob V2 `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` | 2026-06-12T17:47:35Z | retrieved | Propriedade e armazenamento da foto |
| G-CONTACT | Google Drive | `1JIJDF1K1l_IaGJXexX7GfumQge1Y6Egk` · `entidade-contato-cliente.md`, sob V2 `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` | 2026-07-16T07:24:42.182Z | retrieved | Cardinalidade e regra do contato principal |
| G-PEOPLE | Google Drive | `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V` · `tela-pessoas.md`, sob V2 `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` | 2026-07-31T16:38:45.888Z | retrieved | Limites da tela de gestão de pessoas |
| G-RN | Google Drive | `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J` · `requisitos-negocio.md`, sob V2 `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` | 2026-07-16T07:22:27.224Z | retrieved | Foto, contatos, privacidade e requisitos de upload |
| N-CANON | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` · database `7e55d684-cdd4-4bf3-b152-e15ce70d324b`; páginas relevantes `39ebc960-3dfa-8167-9522-d6f0ea6230b0`, `39ebc960-3dfa-81c4-99c8-d6e50007fa86`, `39dbc960-3dfa-81f3-9e52-ec6033137656` | not exposed | retrieved | Organização das tasks e débitos relacionados |
| R-PHOTO | Repository | commit `31e3cd70f183097605835023f850972338ce2928`; migration/model User, quatro DTOs, `generated.ts`, `AppAvatar`, tabelas e dialogs envolvidos | 2026-07-31 snapshot | inspected | Estado atual dos contratos e da UI de foto |
| R-CONTACT | Repository | commit `31e3cd70f183097605835023f850972338ce2928`; `ClientData`, `ClientContactData`, `UpdateClientAction`, `PrimaryContactService`, `ContactFields`, `ClientDialog`, `useClientForm` | 2026-07-31 snapshot | inspected | Replace-total, erros nested e hook atual |
| IMG-REF | Caller-held | `alumnos-exemplo-avatar`; `client-no-component-photo`; `redator-no-component-photo`; `alumnos-component-wrong-photo` | unknown | unavailable — João declarou que os arquivos existem somente em sua máquina; nenhuma chamada de conector se aplica | Calibração visual durante o planejamento |

## Key facts

1. O escopo exige `photo_url` nos quatro contratos, `AppAvatar` na primeira coluna das quatro tabelas, componente compartilhado de foto no corpo dos dialogs, fallback de duas iniciais e remoção do avatar do header de `StudentDialog`. `[J-01]`
2. Foto pertence à raiz User compartilhada pelas entidades derivadas. O Drive a define como imagem de perfil armazenada no S3 por referência; a instrução explícita confirma que ela é opcional ao definir o fallback sem foto. `[G-USER]` `[G-RN]` `[J-01]`
3. O código já possui `users.photo_path` nullable e fillable, mas nenhum dos DTOs User/Client/Redator/Student nem os tipos TS gerados expõe `photo_url`; não há fluxo de gestão da foto no código atual. `[R-PHOTO]`
4. `AppAvatar` já produz duas iniciais quando não recebe imagem, mas não trata erro de carregamento. Hoje somente `StudentsTable` o usa na primeira coluna, e `StudentDialog` o mostra no header; as outras três tabelas usam texto e nenhum dialog possui o componente corporal solicitado. `[R-PHOTO]`
5. `ContactFields` é atualmente uma grade horizontal com placeholders, radio de principal e erros `contacts.{i}.{field}`. `useClientForm` expõe patch, seleção de principal e adição, mas não remoção. `[R-CONTACT]`
6. O update do cliente faz soft-delete e recriação integral dos contatos. A aplicação garante no máximo um principal e aceita nenhum principal; a API atual também aceita coleção vazia. O Drive, porém, define que o cliente possui um ou mais contatos. `[R-CONTACT]` `[G-CONTACT]`
7. A fonte canônica exige conformidade LGPD/legislação chilena e validação de tipo, tamanho e antivírus para uploads, mas não define retenção específica da foto substituída ou removida; a lacuna foi fechada por decisão explícita — **apagar o objeto anterior imediatamente**, sem retenção. `[G-RN]` `[J-02]`
8. O cliente deve terminar com **pelo menos um** contato, e essa regra é validada no **backend** (não só na UI) — o `removeContact` novo não pode zerar a coleção. `[J-02]` `[G-CONTACT]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Cardinalidade de contatos | Drive: um ou mais contatos; no máximo um principal; zero principais é válido | Mínimo de um contato, **validado no backend**; máximo de um principal mantido. A API deixa de aceitar coleção vazia | Drive prevalece sobre o comportamento permissivo atual, ratificado por decisão explícita `[G-CONTACT]` `[R-CONTACT]` `[J-02]` |
| Nome do campo de cargo | Notion CR.1.1 registra `role` | O contrato vigente usa `job_title`; o significado continua "cargo/área" | Repositório solicitado prevalece sobre Notion organizacional; Drive não fixa chave técnica `[N-CANON]` `[R-CONTACT]` `[G-CONTACT]` |
| Ciclo de vida do arquivo de foto | Apenas conformidade geral e referência no S3 | **Apagar imediatamente** o objeto anterior ao substituir ou remover; sem retenção e sem órfão desvinculado | Lacuna canônica fechada por instrução explícita do João, topo da hierarquia de fontes `[J-02]` `[G-USER]` `[G-RN]` |

## Constraints

- Foto ausente ou indisponível sempre resulta em duas iniciais.
- Contatos continuam sendo enviados como coleção integral e seus erros nested permanecem visíveis junto ao campo.
- A coleção não pode terminar vazia; a regra vive no backend, não apenas na UI. `[J-02]`
- Upload de foto está sujeito aos requisitos gerais de segurança e dados pessoais.
- **Delete imediato é irreversível e o repositório tem débito conhecido nessa fronteira:** `UploadFileAction::execute` grava no disco antes de inserir em `files`, e há chamadas dentro de `DB::transaction`. Apagar a foto anterior dentro de uma transação que faz rollback perde o objeto sem volta. O plano precisa resolver a ordem (`DB::afterCommit` ou compensação explícita), não herdá-la. `[J-02]` `[R-PHOTO]`
- Tipos TS são derivados dos DTOs, nunca editados manualmente.
- Working tree limpo na geração; nenhuma alteração foi realizada.

## External acceptance signals

- Visualizar, selecionar, substituir e remover foto no corpo dos quatro dialogs; tabelas usam o mesmo avatar e fallback. `[J-01]`
- Contatos aparecem em cards responsivos com labels, indicação clara do principal e exclusão sem perder erros nested. `[J-01]`
- Marcar um contato principal desmarca os demais; não possuir principal continua válido. `[G-CONTACT]` `[G-RN]`

## Open questions

- None blocking. A única questão bloqueante do packet original (ciclo de vida do objeto de foto) foi decidida em `[J-02]`.

## Deferred

- Comparação visual com as quatro imagens caller-held durante o planejamento. `[IMG-REF]`
- Hardening de ownership das rotas nested permanece no item Notion H.3.1. `[N-CANON]`

## Staleness triggers

- Mudança semântica do `active_work_item`, do escopo explícito ou surgimento de spec/plano.
- Reabertura de `[J-02]`: mudança na decisão de apagar a foto imediatamente, ou no mínimo de um contato validado no backend.
- Alteração canônica nas regras de foto, upload, privacidade ou cardinalidade dos contatos.
- Mudança nos DTOs, schema User, `AppAvatar`, dialogs/tabelas, `ContactFields`, hook ou semântica replace-total.
- As imagens caller-held revelarem requisito funcional além de calibração visual.
