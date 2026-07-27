BEGIN LOTUS CONTEXT PACKET
---
schema_version: 1
packet_id: bloco-alunos-modulo
block_id: bloco-alunos-modulo
status: partial
generated_at: 2026-07-27
generated_by: codex
base_ref: main
base_commit: 89a5d128d7e201c0894c74464745ad04ec41eac4
state_path: docs/superpowers/state.md
state_blob_sha: 9639d72957efeaae3344b46c1802d75afc62cc49
progress_path: docs/superpowers/progress.md
progress_blob_sha: ba54d235cc9fa05f5b474bb7e0db1e4c36a72702
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Pessoas · Alunos — módulo novo

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
>
> **v2.** O v1 foi rejeitado pelo caller por três violações do contrato de validação da skill,
> todas verificadas contra o código: (a) a divergência de nome de tabela foi resolvida por
> `student_client_links`, termo que não existe no repositório — o schema real é
> `student_client_logs`, e o backlog é que diverge; (b) a exclusão de cadastro/edição citava uma
> decisão do João que nunca ocorreu — ausência de menção no backlog não é decisão; (c) a permissão
> `identity.user.*` aparecia como constraint vigente, sem lastro no `PermissionCatalog`, que não
> tem permissão de aluno. As três viraram divergência honesta ou `Open question`.

## Scope

**Goal:** o escopo mínimo nomeado pelo backlog é construir o módulo de Alunos com `StudentData`,
controller e rotas de listagem/detalhe, vínculo atual e histórico, turmas/matrículas, certificados e
a tela integrada a Pessoas. O alcance de cadastro/edição permanece aberto. `[LOCAL]` `[GDRIVE-MOD]`
`[NOTION]`

**Non-goals:** refazer importação/resolução por RUT, alterar a regra ou schema de vínculos já
entregues, gerir redatores ou emitir certificados/PDF/QR. `[LOCAL]` `[NOTION]`

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| LOCAL | Git repository | `state.md`, `progress.md`, backlog item 1, migration `2026_07_20_000002`, `Student.php`, `StudentClientLinkService.php`, `PermissionCatalog.php` @ `89a5d12` | 2026-07-27 | retrieved; working tree clean | Estado, escopo textual, schema, vínculo, autenticação e catálogo RBAC |
| GDRIVE-MOD | Google Drive | `1Q5cP4DE2JwGABULxEJDq-eUsXK8TA86A` — `modulo-gestao-pessoas.md` | 2026-06-14T19:04:24Z | retrieved | Responsabilidade do módulo e contratos cross-module |
| GDRIVE-UI | Google Drive | `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V` — `tela-pessoas.md` | 2026-06-16T15:42:19Z | retrieved | Fluxos e sinais funcionais da tela |
| NOTION | Notion | `7e55d684-cdd4-4bf3-b152-e15ce70d324b` — `Tasks · Lotus Fase 2`, sob `Lotus.cl` | 2026-07-27; rows até 15:13Z | retrieved and queried | EAP, critérios e dependências de Alunos |
| NOTION-DUP | Notion | `74cbc960-3dfa-838f-8a69-01d231e6fcd6` — database homônimo fora da hierarquia `Lotus.cl` | 2026-07-27T01:55:00Z | inspected; excluded duplicate | Evitar citar a cópia errada |
| PROTO | Caller / Figma Site | `https://piece-desert-35638359.figma.site/` e prints mantidos na sessão do caller | not supplied | caller-held; not retrievable in this runtime | Composição visual; nenhum detalhe visual foi inferido |

## Key facts

1. Gestão de Pessoas é dona do cadastro mestre do aluno; Operação e outros módulos consomem o aluno
   sem duplicar sua lógica. `[GDRIVE-MOD]`
2. RUT é a chave natural de resolução; aluno é uma extensão inativa de `User` e não autentica.
   `[GDRIVE-MOD]` `[GDRIVE-UI]` `[LOCAL]`
3. A base Notion canônica contém os slices relevantes em `7.2.4`, `7.2.6`, `7.2.7` e `7.4.6–7.4.8`;
   não existe uma task de Alunos na família `H.*`. `[NOTION]`
4. O histórico real usa `student_client_logs`; `StudentClientLinkService` é a fonte única de escrita
   e mantém no máximo um vínculo aberto por aluno. `[LOCAL]`
5. O detalhe deve expor dados pessoais, cliente atual, vínculos anteriores, turmas/matrículas e
   histórico de certificados. `[LOCAL]` `[GDRIVE-MOD]` `[GDRIVE-UI]`
6. A API deve entregar projeções prontas, sem N+1 e sem exigir que o frontend derive vínculo,
   histórico ou regra acadêmica. `[NOTION]`
7. A tela nasce no padrão atual de `shared/ui`; sua composição exata deve ser conferida nos prints
   `PROTO`, pois nenhum print ou `fileKey` estava acessível neste runtime. `[LOCAL]` `[PROTO]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Nome do vínculo | Drive usa `Log_Aluno_Cliente`; backlog usa `student_client_links`; Notion usa `student_client_logs` | A tabela real é `student_client_logs`; `StudentClientLinkService` é o nome do serviço | Migration, model e serviço no commit-base comprovam o schema; o backlog está divergente. `[LOCAL]` |
| CRUD versus leitura | Drive e Notion incluem cadastro/edição e endpoints CRUD; backlog enumera listagem/detalhe sem declarar exclusão de escrita | Unresolved; o planejamento deve decidir se este bloco inclui cadastro/edição | Ausência no backlog não é decisão de exclusão e não sobrepõe silenciosamente as fontes externas mais amplas. `[LOCAL]` `[GDRIVE-MOD]` `[GDRIVE-UI]` `[NOTION]` |
| Permissão do módulo | Notion pede `identity.user.*` para endpoints de alunos | Unresolved; nenhuma permissão de aluno está definida | `PermissionCatalog` possui apenas `identity.user.*` descrita para usuários/redatores e `identity.access.manage`; RN-01 separa aluno de usuário autenticável. `[LOCAL]` `[NOTION]` |
| EAP do bloco | Busca global retorna duplicatas `H.1.3`; `H.2.1` é template de hardening/UI, não Alunos | Citar somente `7.2.4`, `7.2.6–7.2.7` e `7.4.6–7.4.8` da base sob `Lotus.cl` | Ancestor path verificado e query exata por módulo na data source canônica. `[NOTION]` `[NOTION-DUP]` |
| Autoridade visual | Drive contém molde datado; Figma Site não fornece `fileKey` | Não inventar composição; caller confronta o planejamento com `PROTO` | Status real de recuperação e precedência do material fornecido pelo caller. `[PROTO]` `[GDRIVE-UI]` |

## Constraints

- A tabela vigente é `student_client_logs`; o vínculo atual também é refletido por
  `students.current_client_id`, ambos escritos somente por `StudentClientLinkService`. `[LOCAL]`
- Aluno não autentica; os endpoints de gestão permanecem sob autenticação de staff, mas a permissão
  específica ainda não foi decidida. `[LOCAL]`
- Erros da API seguem RFC 7807; controllers não montam erros manualmente. `[LOCAL]`
- `StudentData` é a origem dos tipos TypeScript; tipos gerados não são editados manualmente.
  `[NOTION]` `[LOCAL]`
- O frontend não recalcula vínculos/agregações e não importa PrimeReact fora de `shared/ui`.
  `[NOTION]` `[LOCAL]`
- Certificados e históricos têm peso legal; consultas não podem ocultar ou reinterpretar dados
  silenciosamente. `[LOCAL]`

## External acceptance signals

- Listagem e detalhe retornam contratos tipados e projeções sem N+1. `[NOTION]`
- Listagem oferece dados reais, busca, paginação e estados de loading, erro e vazio. `[NOTION]`
- Detalhe apresenta vínculo atual, histórico de clientes, turmas/matrículas e certificados sem
  cálculo de domínio no frontend. `[LOCAL]` `[NOTION]`
- Notion espera endpoints autenticados com `identity.user.*` e erros RFC 7807; a parte de permissão
  conflita com o catálogo real e não está adotada como decisão. `[NOTION]`
- A composição e os indicadores visuais são validados pelo caller contra `PROTO` durante o
  planejamento e a prova visual. `[PROTO]`

## Open questions

- O bloco inclui cadastro/edição individual e respectivas Actions, rotas e mutações de UI, ou
  somente listagem/detalhe? `[LOCAL]` `[GDRIVE-MOD]` `[GDRIVE-UI]` `[NOTION]`
- Qual permissão protege leitura e eventuais escritas de Alunos: ampliar semanticamente
  `identity.user.*`, criar permissão específica ou adotar outro gate existente? A decisão aplica-se
  ao staff autenticado, nunca ao aluno. `[LOCAL]` `[NOTION]`

## Deferred

- Importação/resolução por RUT e o invariante estrutural do vínculo, já entregues. `[LOCAL]`
  `[NOTION]`
- Emissão/PDF/QR de certificados e mudanças no módulo Redatores. `[LOCAL]` `[GDRIVE-MOD]`

## Staleness triggers

- `active_work_item`, `active_feature` ou um futuro spec alterarem o escopo de Alunos.
- Uma decisão explícita resolver ou alterar o alcance CRUD.
- Uma decisão explícita definir a permissão do módulo.
- As tasks de Alunos na base Notion canônica mudarem escopo ou critérios.
- Os prints `PROTO` revelarem comportamento funcional incompatível com este packet.
- Contratos de aluno, `student_client_logs`, matrícula ou certificado mudarem semanticamente.
END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: ready_for_planning
