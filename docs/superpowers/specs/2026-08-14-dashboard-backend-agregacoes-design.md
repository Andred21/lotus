# Spec — `dashboard-backend-agregacoes` (Sprint 5 · Dashboard, bloco A)

> **Data:** 2026-08-14 · **Estado de origem:** `ready_for_planning` → `planning`
> **Context Packet:** `docs/superpowers/context-packets/2026-08-14-dashboard-backend-agregacoes.md`
> **Fonte canônica:** Drive `dashboard-escopo-funcional-analitico.md` (ID `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa`, consolidado 14/08/2026)
> **Baseline:** `main@f287df7`

## 1. O que o bloco entrega

O contrato backend read-only do Dashboard: domínio `App\Domains\Dashboard`, DTOs
`spatie/laravel-data`, classes de consulta/agregação, `GET /api/dashboard/metricas`,
RBAC/ownership por papel, filtro de período e testes. Termina com contrato estabilizado e
`generated.ts` regenerado. O frontend (bloco B, `dashboard-frontend-central-controle`) só inicia
depois.

## 2. Decisões

As D1–D6 foram escolhidas pelo João entre alternativas apresentadas; D7–D9 são derivadas e
declaradas como tais.

- **D1 — Escopo analítico: séries + rankings entram; tempos de ciclo (§4.5 do Drive) FICAM FORA.**
  O próprio Drive condiciona tempos de ciclo a "dados confiáveis" e fórmula a fechar; incluí-los
  agora seria inventar regra de negócio (proibido pelo §9 do Drive).
- **D2 — Ranking de redatores e séries históricas próprias do Redator FICAM FORA.** A visão admin
  ganha **distribuição de carga** (turmas atuais/próximas por redator, §4.4 sem o ranking
  competitivo) junto do compliance documental (§3.7). O Redator ganha **contadores simples** de
  histórico (turmas concluídas, certificados das suas turmas), sem série temporal.
- **D3 — Filtros do MVP: somente período** (`period_start`/`period_end`). Cliente, curso, redator e
  status ficam para quando a tela provar necessidade. Estado operacional (KPIs, pendências,
  alertas, pipeline, agenda, compliance) **ignora o período por definição** (§5 do Drive); só
  séries e rankings o obedecem.
- **D4 — Janelas temporais: 7 dias para turmas, 30 dias para vencimentos.** "Inicia/encerra em
  breve" = próximos 7 dias; certificado ou documento regulatório "próximo do vencimento" = 30
  dias; "atrasada" = `end_date` passada com `status = em_andamento`. Viram constantes nomeadas no
  domínio Dashboard, não números soltos em query.
- **D5 — Contrato por papel: DOIS DTOs raiz, UM endpoint.** `AdminDashboardData` e
  `RedatorDashboardData`, discriminados por campo literal `view` (`'admin' | 'redator'`); o
  controller devolve um ou outro. Seções de forma comum compartilham DTO (`PendingItemData`,
  `AlertData`, `AgendaTurmaData`). Alternativa recusada: DTO único com seções `Optional` — é o
  "DTO gigante" que o Drive §12 veta, e transforma vazamento de payload em bug de runtime em vez
  de erro de tipo (a lição do Q-1 do BD-9: mecanismo, não disciplina).
- **D6 — Certificado REVOGADO não devolve a matrícula a "Certificados a emitir".** "A emitir" =
  matrícula `aprobado` de turma `concluida` **sem nenhum certificado**. Revogação é ato deliberado
  do superadmin; reemissão é decisão humana, não pendência automática.
- **D7 (derivada) — Sem permissão nova.** O catálogo (`PermissionCatalog`) não ganha `dashboard.*`.
  Rota sob `auth:sanctum`; a view sai do `type` do usuário (`admin`/`superadmin` → admin;
  `redator` → redator — RN-01 garante que só esses autenticam). Dentro da view admin, cada seção é
  condicionada a permissão **existente**: comercial/UF ← `commercial.quote.view` +
  `commercial.budget.view`; certificação ← `certification.certificate.view`; compliance/carga de
  redatores ← `identity.user.view`; operação ← `operation.turma.view`. Seção não autorizada sai
  como `null` tipado — nunca zeros que mentem.
- **D8 (derivada) — Regra de domínio não se duplica.** Habilitação documental vem do
  `TurmaHabilitacaoService`; status/total de orçamento do `BudgetSummaryService`. O Dashboard
  agrega projeções; se uma regra precisar de forma nova, ela nasce no domínio dono, não no
  Dashboard.
- **D9 (derivada) — Sem cache e agregação por query.** `count`/`sum`/`groupBy` no banco, nunca
  coleção inteira em memória. Cache específico é fora de escopo do Drive §9 ("sem medição").

## 3. Arquitetura do domínio

```
backend/app/Domains/Dashboard/
├── Data/          # DTOs (raiz por papel + seções compartilhadas) — fonte do generated.ts
├── Enums/         # PendingItemType, DashboardAlertType, PipelineStage
├── Http/          # DashboardController (fino) + routes.php
└── Services/      # classes de consulta/agregação (uma por área, ver §5)
```

- Sem Model, migration, tabela, Policy, Action, Exception própria. Read-only puro.
- Nenhum domínio importa Dashboard. Dashboard importa só a superfície pública dos demais
  (`Models`, `Enums`, `Services`), com **cada aresta declarada** no `DomainDependencyTest` e
  justificada no commit. Arestas previstas (lista exata fecha no plano, medida import a import):
  Operation (`Turma`, `Enrollment`, `TurmaStatus`, `EnrollmentApprovalStatus`,
  `TurmaHabilitacaoService`), Catalog (`Course`), Commercial (`Quote`, `Budget`, `Client`,
  `BudgetSummaryService`), Certification (`Certificate`, `CertificateStatus`), Identity
  (`Redator`, `User`).
- `App\Shared` **não** recebe consulta cross-domain (Drive §2); segue infraestrutura transversal.

## 4. Contrato

### 4.1 Endpoint

`GET /api/dashboard/metricas` — `auth:sanctum`, sem middleware de permissão (D7).
Query params: `period_start`, `period_end` (datas ISO; default = últimos 12 meses). Validação no
DTO de request; inválido (formato, `start > end`) sobe ao handler global RFC 7807 como 422.
O período aplica-se **somente** a séries e rankings (D3).

### 4.2 DTOs raiz

**`AdminDashboardData`** (`view: 'admin'`):

| Seção | Conteúdo | Gate |
|---|---|---|
| `kpis` | os 4 KPIs do §3.1 | operação sempre; cotações/UF sob gate comercial |
| `pendencias` | lista unificada (§3.2), itens `PendingItemData` | por permissão do módulo de origem |
| `alertas` | lista (§3.3), itens `AlertData` | idem |
| `pipeline` | etapas do funil com contagem (§3.4) | etapas comerciais sob gate comercial |
| `agenda` | turmas que iniciam/encerram ≤7d, em andamento, atrasadas | `operation.turma.view` |
| `compliance_turmas` | por turma relevante: docs presentes/ausentes, progresso, habilitação, redatores, datas (§3.5) | `operation.turma.view` |
| `redatores` | carga (turmas atuais/próximas por redator) + docs vencidos/vencendo (§3.7 + D2) | `identity.user.view` |
| `series` | séries temporais do período (§4.1): turmas iniciadas, concluídas, certificados emitidos, matrículas, UF aprovada | UF sob gate comercial |
| `rankings` | cursos e clientes (§4.2/4.3) por turmas, matrículas, certificados, UF | UF sob gate comercial |

Seção sem permissão = `null` (tipo TS `X | null`), distinguível de vazio real (D7).

**`RedatorDashboardData`** (`view: 'redator'`) — tudo escopado por ownership via `turma_redator`:

| Seção | Conteúdo |
|---|---|
| `resumo` | turmas em andamento, próximas, pendências abertas, docs próprios vencendo — contadores |
| `agenda` | suas turmas: iniciam ≤7d, encerram ≤7d, em andamento, atrasadas |
| `pendencias_documentais` | por turma sua: documentos obrigatórios faltantes |
| `alertas_documentos` | seus documentos regulatórios vencidos / vencendo ≤30d (`files.valid_until`) |
| `historico` | contadores simples: turmas concluídas, certificados emitidos das suas turmas (D2) |

O payload do Redator **não contém** cotação, UF, cliente, outros redatores nem turma alheia — por
construção do tipo, não por omissão em runtime (D5, Drive §7.4).

### 4.3 Semântica dos KPIs e classificações

- **Turmas em andamento:** `status = em_andamento`; sub-contagens: encerram ≤7d; atrasadas
  (`end_date < hoje`).
- **Cotações pendentes:** `quotes.status = pending`; soma `value_uf` só sob gate comercial.
- **Conclusões por confirmar:** `em_andamento` com habilitação derivada satisfeita
  (`TurmaHabilitacaoService`, D8).
- **Certificados a emitir:** matrícula `aprobado` de turma `concluida` sem nenhum certificado (D6).
- **Pipeline (classificação exclusiva, backend):** seis baldes — cotação `pending`; aprovada sem
  turma viva (via `active_quote_id`); turma `em_andamento` não habilitada; habilitada aguardando
  conclusão; `concluida` com emissões pendentes; `concluida` com tudo emitido. O Drive §3.4 escreve
  sete rótulos, mas "turma concluída" e "certificados a emitir" se sobrepõem — a exigência de
  classificação não ambígua obriga o split por estado de emissão (turma concluída sem matrícula
  aprovada pendente cai em "tudo emitido": não há o que emitir). Cada cotação/turma cai em
  exatamente uma etapa.
- **Pendências (§3.2):** cotação aguardando aprovação; aprovada sem turma; turma sem redator
  designado; turma com documentação obrigatória incompleta; habilitada aguardando confirmação;
  concluída com matrícula aprovada sem certificado. Cada `PendingItemData` carrega: módulo,
  tipo (enum), severidade, id da entidade, descrição, data/prazo relevante, ids para navegação.
- **Alertas (§3.3):** turma atrasada; certificado expirando ≤30d / expirado (`valido_ate`);
  documento regulatório de redator vencido / vencendo ≤30d, com turmas futuras afetadas quando a
  designação já existir (sem inferência além do `turma_redator`).
- **Datas de negócio (§4.1):** série de UF aprovada usa `quotes.approved_at`; turmas usam
  `start_date`/`end_date`; conclusões usam `concluded_at`; emissão de certificado usa
  `certificates.created_at` — que aqui **não é proxy**: o registro nasce no ato da emissão
  (medido: não existe coluna própria de data de emissão, e o modelo é append-only até a
  revogação).

## 5. Implementação (visão de peças)

- `DashboardController` fino: resolve o papel, delega a um agregador por view
  (`AdminDashboardAssembler` / `RedatorDashboardAssembler` em `Services/`), devolve o DTO.
- Serviços de consulta por área (ex.: `OperationMetricsQuery`, `CommercialMetricsQuery`,
  `CertificationMetricsQuery`, `RedatorScopeQuery`) — nomes finais no plano. Cada um recebe o que
  precisa (período, redator dono) e devolve dados prontos para o DTO.
- Habilitação (`conclusões por confirmar`, pipeline, pendências) roda o `TurmaHabilitacaoService`
  **apenas** sobre as turmas `em_andamento`, com eager load do que o serviço consome — nunca sobre
  o histórico inteiro.
- Constantes de janela (D4) num único lugar (`DashboardWindows` ou equivalente).

## 6. Testes

Feature tests (sqlite `:memory:`, padrão da suíte) — cada um com o vermelho visto antes do verde
(lição 10):

1. **Admin completo:** payload com todas as seções, valores agregados conferidos contra fixtures
   determinísticas (contagens, somas UF em bcmath-string, etapas do pipeline).
2. **Admin sem permissão comercial:** seções comerciais `null`, demais intactas — e **nenhum**
   valor UF em lugar nenhum do JSON.
3. **Redator:** com turma alheia e cotações no banco, o payload contém só as turmas dele; asserção
   negativa de chaves (sem `series`, sem UF, sem cliente) e de conteúdo (ids alheios ausentes).
4. **Banco vazio:** zeros e listas vazias, não erro nem `null` indevido.
5. **Filtro de período:** série restringida; KPIs/pendências/pipeline idênticos com e sem filtro.
6. **Período inválido:** 422 `application/problem+json` pelo handler global.
7. **D6:** certificado revogado não devolve a matrícula ao KPI nem à pendência de emissão.
8. **N+1:** cenário representativo (turmas com docs, matrículas, redatores) sob
   `preventLazyLoading` — a suíte já estoura se algum assembler esquecer eager load.
9. **`DomainDependencyTest`:** arestas novas declaradas; nenhuma além das usadas.

## 7. Definition of Done

- Endpoint provado contra a **API real** (sessão Sanctum cookie+CSRF) com três atores: admin
  completo, role sem permissão comercial, redator — payloads conferidos por corpo, não por status.
- Suíte backend verde; Pint nos arquivos do bloco; `typescript:transform` rodado e `generated.ts`
  commitado **no mesmo commit** dos DTOs (lição 11) — sem consumidor TS a ajustar (o placeholder
  atual não consome o endpoint).
- Zero mutação: o bloco não escreve em tabela nenhuma; banco de dev intocado além de fixtures de
  prova declaradas.

## 8. Fora de escopo (guarda contra deriva)

Tempos de ciclo (D1); ranking de redatores e séries do Redator (D2); filtros além de período (D3);
cache; Notifications (qualquer forma); mutations; Model/migration/tabela/materialized view;
`features/dashboard` ou qualquer frontend; redesign de módulos de destino; permissão nova (D7);
reconstrução histórica as-of.

## 9. Risco de review

**ALTO pelo gate binário:** o bloco regenera `generated.ts` e o eixo central é RBAC/ownership
(vazamento de payload entre papéis). Duas lentes (Claude + Codex read-only) no `/revisar-sprint`.
Risco próprio: a matriz de arestas cross-domain cresce de uma vez (5 domínios); o
`DomainDependencyTest` é a contenção — cada aresta entra medida, nenhuma "por precaução".

## 10. Limitações declaradas

- A divergência EAP 8.4.0×8.4.7 do Notion (corpos trocados) está reconciliada no packet pelo Drive;
  os critérios de aceite deste bloco vêm do Drive §11, não das páginas trocadas.
- `docs/der-fisico.md` lista `certificates` como "planejada"; a tabela existe implementada desde a
  Sprint 4 — divergência documental preexistente, não deste bloco (candidata a pendência no
  fechamento se ainda não registrada).
- Nenhuma tela será vista neste bloco (backend puro); a validação visual é do bloco B.
