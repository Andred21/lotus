---
schema_version: 1
packet_id: lotus-ctx-bloco6-frontend-exec1-turmas
block_id: bloco6-frontend-exec1-turmas
status: ready
generated_at: 2026-07-22
base_ref: main
base_commit: 5ceadcb28a1fddb2e55e877963a73884aa5cac43
progress_path: docs/superpowers/progress.md
progress_blob_sha: 98e2217ea70ef209164b41e34403b3243104a0fe
plan_path: docs/superpowers/plans/2026-07-21-bloco6-frontend-exec1-turmas.md
plan_blob_sha: 1f3c983ecb7e3fc7d821e14172b77106fcc27c31
spec_path: docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md
spec_blob_sha: 0815e8e5418835b23e9d8e7b8803fe084ce1f551
word_budget: 1200
---

# Context Packet — Bloco 6-frontend · Execução 1 · Turmas

> Snapshot derivado do contexto externo necessário à Execução 1. Não substitui o plano, a spec,
> as rules nem o código. As decisões explícitas do João registradas na spec prevalecem sobre
> snapshots anteriores do Drive quando a divergência estiver documentada abaixo.

## Scope

**Goal:** entregar o primeiro recorte da interface de Operação: hub com turmas e cotações aprovadas
sem turma, detalhe não-modal, configuração e designação de redator.

**Non-goals:** matrícula/importação, documentos, conclusão, manual, interface própria do redator,
feedback, certificação, seed operacional e qualquer mecanismo genérico de navegação cross-módulo.
Esses itens pertencem às Execuções 2/3 ou a blocos futuros.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRV-REQ | Google Drive | `requisitos-negocio.md` · `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J` | 2026-07-16T07:22:27.224Z | consulted | RF-TUR, RF-RED e RN-09/15/16 |
| DRV-MOD | Google Drive | `modulo-operacao.md` · `10cZLkhVSswTbJYIiE7kVM8CVi-cE9gEA` | 2026-06-14T19:14:31Z | consulted | fronteira do módulo e dependências |
| DRV-TELA | Google Drive | `tela-turmas.md` · `1151kuUKZOv-8dUMAJJS62lGG3n0ZqG3w` | 2026-06-16T15:54:22Z | consulted | fluxo e composição da tela admin |
| FIGMA | Figma/prints | protótipo Operação anexado em 2026-07-21 | — | indirect via spec | composição visual já consolidada na spec |
| NOTION | Notion | task do Bloco 6-frontend | — | unavailable | organização da task; estado substituído pelo `progress.md` |

## Key facts

1. Operação transforma uma cotação aprovada em turma e conduz configuração, alunos, redator,
   documentação e conclusão; esta execução entrega somente a primeira fatia desse fluxo. `[DRV-MOD]`
2. A configuração nasce de uma cotação aprovada e contém modalidade, local condicional e datas de
   início e término. `[DRV-REQ]` `[DRV-TELA]`
3. O hub administrativo precisa distinguir turmas existentes de cotações aprovadas ainda sem turma.
   `[DRV-MOD]` `[DRV-TELA]`
4. SuperADMIN e Administrativo operam a visão completa; Cliente e Aluno não acessam. A interface
   restrita do redator é outra superfície e permanece fora desta execução. `[DRV-TELA]`
5. A designação deve respeitar simultaneamente habilitação ao curso e o gate de documentos
   regulatórios válidos do redator; o backend continua sendo a fronteira autoritativa. `[DRV-REQ]`
6. O detalhe da turma é uma página própria porque o fluxo tem múltiplas etapas e não cabe em modal.
   `[DRV-TELA]`
7. A turma se relaciona com Comercial pela cotação/orçamento e alimentará Certificação somente após
   a conclusão; Execução 1 não implementa certificação. `[DRV-TELA]` `[DRV-MOD]`
8. Após encerramento, escrita acadêmica fica bloqueada; documentação completa apenas habilita a
   confirmação final pelo admin. Esses gates permanecem contexto de domínio, não escopo de UI desta
   execução. `[DRV-REQ]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Criar turma | `POST /api/turmas` com referência da cotação. | Reusar a página de Configuración e criar por `POST quotes/{quote}/turma`. | Spec D3 registra decisão explícita do João em 2026-07-21; prioridade superior ao snapshot do Drive. |
| Endpoint de pendências | `GET /api/turmas/pendencias`. | `GET /api/turmas/pendientes-configuracion`. | Contrato fechado na spec e no plano ativo; divergência preservada, sem reabrir nomenclatura nesta execução. |
| Filtro de redator | Drive propõe endpoint backend retornando apenas habilitados/idôneos. | UI filtra `redatoresApi` por curso + REUF; API de designação reaplica RN-09 e pode responder 422. | Spec D4 registra decisão explícita do João; segurança não depende do filtro client-side. |
| Estado `habilitada` | Drive descreve máquina persistida com 3 estados. | Enum persistido tem 2 estados; `habilitada` é derivada e usada apenas como estado de exibição/gate. | Backend entregue no Bloco 6d e spec atual; decisão explícita posterior ao snapshot. |
| Quantidade de redatores | Textos usam singular; material de entidade admite ocasionalmente mais de um. | Backend N:N; UI otimiza o caso comum de um, mas suporta lista e add/remove. | Decisão já implementada no Bloco 6b e refletida na spec. |
| Escopo do redator | Drive descreve upload pelo redator dentro do fluxo operacional. | Interface própria do redator e documentação ficam fora da Execução 1. | Spec §1 separa explicitamente as entregas e marca essa superfície como futura. |

## Constraints

- Não consultar Drive, Notion ou Figma novamente durante a Execução 1 enquanto este packet estiver
  `ready` e seus fingerprints continuarem válidos.
- Implementação e testes seguem exclusivamente o plano ativo; este packet não adiciona tarefas.
- RN-09 deve continuar validada no backend mesmo com filtro client-side.
- Não persistir `habilitada` nem criar código próprio de turma.
- Não antecipar Execuções 2/3 nem alterar taxonomia de documentos.
- Ausência do Notion não bloqueia: ele organiza tasks, enquanto o estado ativo e os ponteiros estão
  versionados no `progress.md`.

## External acceptance signals

- O hub mostra turmas e uma fila separada de cotações aprovadas sem turma.
- Configurar uma pendência cria a turma e leva ao detalhe próprio, não a um modal isolado.
- A página permite visualizar/editar modalidade, local e datas.
- A designação apresenta somente candidatos idôneos, enquanto a API mantém o gate RN-09.
- A identificação da turma deixa visível sua origem em orçamento/cotação.

Os critérios executáveis, endpoints finais, arquivos e comandos de prova permanecem no plano ativo.

## Open questions

- None blocking.

## Deferred

- Consulta/sincronização da task no Notion quando o MCP estiver disponível.
- Interface do redator, matrícula/importação, documentação, conclusão e seed operacional.
- FUT-1 de templates gerados via código e FUT-2 de ancoragem cross-módulo.

## Staleness triggers

- alteração do bloco ativo ou do campo Contexto em `docs/superpowers/progress.md`;
- mudança nos blobs do plano ou da spec registrados no frontmatter;
- nova decisão explícita do João sobre Operação/Execução 1;
- modificação posterior a este packet em `requisitos-negocio.md`, `modulo-operacao.md` ou
  `tela-turmas.md` no Drive;
- início da Execução 2 ou mudança material nos contratos backend consumidos pela Execução 1.