# Bloco 51 — `backend-contrato-de-entrada-dos-data` — spec

**Data:** 2026-11-03 · **Branch:** `fix/51-backend-contrato-de-entrada-dos-data` · **Base:** `main@1845d096`
**Fonte:** ficha 51 do `backlog.md`; `P-51` (`pendencias/abertas.md`); achados 0.1 e 0.4 e a seção
"FormRequest e Policy" de `audits/2026-11-02-arquitetura-backend.html`.
**Classificação:** bounded.

## 1. Intenção

A lei "ausente não é nulo" (BD-14, D1: **omissão preserva**) só vale onde o DTO entrega `Optional`
para chave ausente. O `DefaultValuesDataPipe` do laravel-data preenche o default declarado **antes**
de qualquer `Optional`, então propriedade com default literal (`= 'client'`, `= null`) transforma
"o cliente não mandou" em "o cliente mandou o default" — e o `PUT` parcial rebaixa ou apaga dado em
silêncio. A varredura antiga procurava o ternário `instanceof Optional ? null` e era cega a isso.

O bloco fecha a P-51, tira a última escrita de orçamento do controller, põe o `TurmaData::$redatores`
de volta sob a catraca de coleção, e cria a catraca que faltava: **default literal em propriedade de
Data reprova**, salvo saída declarada. De quebra, os Data de query string deixam de se chamar
`*Request` — o nome induzia a ler "FormRequest" onde há um Data.

## 2. O que a recon mudou na ficha (medido em `main@1845d096`)

- **Campos 5 e 6 da P-51 não existem mais.** `CourseTemplateController` e `CertificateTemplateData`
  saíram da API no bloco 39 (`09c95f61`, "template sai da API do catálogo"). Não há caminho HTTP de
  escrita para `layout_config`/`validity_months`. Fecham na P-51 como **mortos desde o bloco 39**,
  sem código.
- **Campo 3 (`CourseData::$workload_hours`) não zera nada.** A propriedade tem `#[Required]`, e o
  pipeline do laravel-data valida antes de preencher default (`BaseData.php:75-76`:
  `ValidatePropertiesDataPipe` → `DefaultValuesDataPipe`). Omitir a chave dá **422** e o valor fica
  intacto. O `= 0` é código morto. *(Leitura da ordem dos pipes; o plano prova por teste.)*
- **Defeitos reais que restam:** `ClientData::$type = 'client'` (omissão rebaixa `provider`/`other`
  para `client`) e `BudgetData::$payment_terms = null` (omissão apaga as condições de pagamento).
- **Mesmo caso do campo 3, fora da P-51:** `RoleData::$permissions = []` tem `present` no `rules()`
  — omissão dá 422; o default é morto.
- **Sufixo `*Query` já tem dono:** é o nome dos Services de leitura (`Certification/Services/EmissionPanelQuery`,
  `Dashboard/Services/*Query`, `Shared/Audit/ArchiveTrailQuery`). `EmissionPanelRequest` →
  `EmissionPanelQuery` colidiria no mesmo domínio.
- **Os quatro Data de query string são as quatro únicas classes em `*/Data/` sem sufixo `Data`.**
- `ClientContactData::$is_primary` já é `bool|Optional = new Optional`; a linha da
  `.claude/rules/generated-types.md` que o chama de "dívida conhecida" está vencida.
- **Chamadores dos dois campos:** `$data->type` de `ClientData` só é lido por `CreateClientAction:58`
  e `UpdateClientAction:48`; `$data->payment_terms` só por `CreateBudgetAction:21` e
  `BudgetController:78`. Nenhum seeder, importação ou filtro lê os dois do Data.

### 2.1 Pré-classificação dos defaults literais alcançáveis por entrada (gabarito do plano)

Varredura de `public … $x = <literal>` nos Data que recebem request (injetados em controller,
`validateAndCreate`, ou aninhados neles por propriedade não-`#[ReadOnlyCollection]`):

| Destino | Propriedades |
|---|---|
| **Conserto real (D1)** | `ClientData::$type`, `BudgetData::$payment_terms` |
| **Default morto atrás de `#[Required]`/`present` — sai (D5)** | `CourseData::$workload_hours`, `RoleData::$permissions` |
| **Saída sem marca — ganha `#[Computed]` + `ComputedFields::rejected` (D5)** | `CourseData::$redator_ids` (o SPA não o manda no payload do curso: `useCourseForm.ts:51,70`; a escrita é do `CourseRedatorController` por outro Data) |
| **Coleção de saída — ganha `#[DataCollectionOf]` + `#[ReadOnlyCollection]` (D4)** | `TurmaData::$redatores` |
| **Já sai pela marca (saída 2)** | `#[Computed]`: `ClientData::$photo_url`, `TurmaData::$client_photo_url`, `EnrollmentData::$photo_url`, `UserData::$photo_url`/`$last_login`, `RedatorData::$documents`/`$photo_url`/`$last_login`, `StudentData::$current_client_id`/`$current_client_name`/`$enrollments_count`/`$photo_url`, `CertificateSettingsData::$signature`; `#[ReadOnlyCollection]`: `BudgetData::$quotes`/`$files`, `QuoteData::$files` |
| **`ISENTAS` com motivo (saída 3)** | query string: os quatro `*QueryData`, `DashboardFilterData`; upload que só cria/substitui o conjunto: `RedatorDocumentsData`, `RedatorDocumentUploadData`, `ProfileDocumentUploadData`; item de coleção recriada por inteiro: `CourseModuleData`; linha de importação (cada confirmação é entrada completa, não `PUT` parcial — o item 53 revisita): `ImportConfirmRowData` |

Data que nunca recebe request (`SessionUserData`, `CertificateData`, `EmissionPanelEnrollmentData`,
`StudentDetailData`, `TurmaRedatorData`, `RedatorProfileDocumentData`…) está fora do alcance da
catraca e não entra na `ISENTAS`. **Com esta tabela, os únicos defeitos reais são os dois da D1**;
um terceiro que a execução encontre é o "defeito real novo" da D5 — para e consulta.

## 3. Objetivos

1. Omitir `type` num `PUT /api/clients/{id}` preserva o tipo; omitir `payment_terms` num
   `PUT /api/budgets/{id}` preserva as condições.
2. Omitir `workload_hours` num `PUT /api/courses/{id}` dá 422 e o valor fica intacto (já é assim;
   passa a ser provado e o default morto sai).
3. A escrita de orçamento mora numa `UpdateBudgetAction`; o `BudgetController::update` fica fino.
4. `TurmaData::$redatores` declara `#[DataCollectionOf]` + `#[ReadOnlyCollection]` e entra no
   alcance do `PersistenceLawsTest`.
5. Catraca nova: default literal em propriedade de Data reprova, salvo as saídas da D5. Vista
   reprovar por sonda.
6. Data de query string renomeados para `*QueryData`; `PageQueryData` com `#[TypeScript]`; o front
   não tem mais tipo de paginação escrito à mão.

## 4. Não-objetivos (Fora)

- **Não** adotar FormRequest nem Policy, nem registrar essa decisão em ADR — é o item 55, e o João
  ainda está estudando.
- **Não** mexer em `ImportConfirmData::$rows` nem criar a marca "coleção só de entrada" — item 53.
- **Não** criar Data de upload — card 1, outro item.
- **Não** transformar `workload_hours` em `Optional` (D2).
- **Não** reescrever semântica de `CourseModuleData` (módulos são recriados a cada `PUT`; o default
  ali é semântica de criação).
- **Não** renomear `DashboardFilterData` — já termina em `Data` e não foi citado pelo relatório; ele
  entra na `ISENTAS` (D5).

## 5. Decisões

**D1 — Remédio dos campos opcionais = (a) do `is_active`** (precedente do João, 2026-08-23):
propriedade `X|Optional` **sem default**.
- `ClientData::$type` → `public string|Optional $type` (mantém `#[In('client','provider','other')]`).
  O `CreateClientAction` grava `'client'` explícito quando chega `Optional` — mesma forma do
  `d4a8553d` no create de staff. O `UpdateClientAction` passa `type` pelo `WritableAttributes::from()`
  (ou equivalente) para pular `Optional`. `generated.ts` muda (`type` ganha `undefined`); o
  `useClientForm` e demais consumidores estreitam no mesmo commit.
- `BudgetData::$payment_terms` → `public string|Optional|null $payment_terms` sem default.
  `generated.ts` não muda (o `Optional` já está na união). O ternário `Optional → null` do
  `CreateBudgetAction:21`, hoje inalcançável, passa a valer e **fica**: no create não há valor
  anterior a preservar, ausente = sem condições. *(Minha decisão.)*

**D2 — `workload_hours` continua `#[Required]`; sai só o `= 0`.** Campo obrigatório exige a chave no
`POST` e no `PUT`, como `name` no mesmo DTO; a D1 do BD-14 ("omissão preserva") é para campo
opcional. `Optional` obrigaria a regra condicional create/update e não há default aceitável para
carga horária contratada, que sai no certificado. O DoD deste campo é "omissão → 422, valor intacto".
*(Decisão do João, 2026-11-03.)*

**D3 — `UpdateBudgetAction`** (`Domains/Commercial/Actions/`), dentro de `DB::transaction`, como as
demais. Pula `payment_terms` quando `Optional`; grava `null` explícito quando vem `null`. `code` e
`client_id` seguem imutáveis por esta rota. O controller injeta a Action e devolve
`BudgetData::fromModel(...)` como hoje.

**D4 — `TurmaData::$redatores`** ganha `#[DataCollectionOf(<o Data do item>)]` e
`#[ReadOnlyCollection]`. É coleção de saída; a catraca existente passa a vê-la.

**D5 — Catraca de default literal.** Novo teste no `PersistenceLawsTest` (ou ao lado dele, em
`tests/Feature/Shared/`), por reflexão sobre os Data que **recebem request** — injetados em método
de controller, criados por `validateAndCreate`/`from($request)`, e os aninhados neles por
propriedade Data/`#[DataCollectionOf]` sem `#[ReadOnlyCollection]` (alcance da §2.1; Data só de
saída fica fora sem precisar de isenção — *minha decisão*): reprova parâmetro promovido do
construtor com default que **não** seja `new Optional`. A catraca não pode ter alcance menor que o
da §2.1 — um Data de entrada que ela não enxergue é o furo que a D-13 já teve. Saídas:
1. default `new Optional`;
2. propriedade com `#[Computed]` ou `#[ReadOnlyCollection]` (esta já verificada pela catraca existente);
3. classe listada numa constante `ISENTAS` com **motivo escrito por classe** — o idioma do
   `ListQueryBudgetTest`. Entra só semântica legítima: Data de query string (`*QueryData`,
   `DashboardFilterData`), Data de upload que só cria, item de coleção recriada por inteiro
   (`CourseModuleData`), e o que mais a varredura mostrar com motivo verdadeiro.
- **Default morto atrás de `#[Required]` ou `present` sai neste bloco**, não vai para a `ISENTAS`
  (`workload_hours`, `RoleData::$permissions`, e qualquer outro do mesmo tipo). Uma linha cada, sem
  mudar `generated.ts`, com teste do 422 provando que o comportamento não mudou. *(Decisão do João,
  2026-11-03.)*
- **Defeito real novo fora da P-51** (default literal em campo opcional de escrita, que rebaixa no
  `PUT`): **PARE e consulte o João** antes de consertar ou isentar — muda o escopo.
- A mensagem da reprovação nomeia `Classe::$prop` e as três saídas.
- **Sonda:** a catraca é vista reprovar com `ClientData::$type = 'client'` restaurado (e passar sem).

**D6 — Renome dos Data de query string:**

| Hoje | Vira |
|---|---|
| `App\Shared\Pagination\PageRequest` | `PageQueryData` |
| `Operation\Data\TurmaPageRequest` | `TurmaPageQueryData` |
| `Certification\Data\CertificatePageRequest` | `CertificatePageQueryData` |
| `Certification\Data\EmissionPanelRequest` | `EmissionPanelQueryData` |

Parâmetros acompanham: `Paginates::page(PageQueryData $query, …)`/`slice(...)`;
`emissionPanel(EmissionPanelQueryData $query, EmissionPanelQuery $panel)`. `PageRequestTest` vira
`PageQueryDataTest`. *(Decisão do João: "Query no nome da classe e/ou da função"; o sufixo `Data`
é escolha minha, pelo padrão de `*/Data/`.)*

**D7 — `PageQueryData` ganha `#[TypeScript]`**; o `PageQuery` à mão de `shared/api/page.ts` morre e o
tipo da query passa a derivar do gerado (os filtros nomeados seguem entrando por extensão do tipo,
como hoje). O gerado sai `q: string | null`/`sort: string | null`, e o front usa `q?: string` — a
ponte (`Partial<...>`, ajuste dos chamadores em `useServerTable.ts`/`useTurmasPage.ts`) é do builder,
desde que não haja tipo de paginação escrito à mão sobrando.

**D8 — Docs vivas acompanham o renome e a catraca:** `.claude/rules/backend-ddd.md` (§ paginação e
§ coleção nested), `.claude/rules/generated-types.md` (troca a linha vencida do `is_primary` pela
referência à catraca nova), `docs/estrutura-monolito.md:75`. O ADR-22 recebe uma linha de emenda
datada com o renome (o corpo histórico não se reescreve).

## 6. Restrições

- Lei §5.3: `generated.ts` só por `php artisan typescript:transform`; task que regenera ajusta os
  consumidores no mesmo commit (`generated-types.md`).
- Lei §5.4: erro sobe ao handler RFC 7807; nada de `abort(422)`.
- Teste de regressão só vale visto vermelho contra o código antigo — **sem `git stash`** (memória:
  stash compartilhado entre lanes); use cópia no scratchpad ou commit WIP.
- Backend no container; Pint no host com arquivos explícitos.
- `lane.sh conferir` precisa passar: o plano não cruza arquivo com outra lane viva.

## 7. Deixado ao builder

- O nome do Data do item de `TurmaData::$redatores` (provável `TurmaRedatorData`) — ler o `fromModel`.
- Arquivo da catraca nova (dentro do `PersistenceLawsTest` ou irmão) e a forma exata da varredura.
- A lista final da `ISENTAS`, com motivo verdadeiro por classe, a partir da varredura (~50 defaults
  hoje; a maioria cai nas saídas 2 e 3).
- Como o `UpdateClientAction` pula `type` (`WritableAttributes::from()` já tira `Optional`).
- A ponte de tipo no front da D7.

## 8. Critérios de aceite (DoD)

1. `PUT /api/clients/{id}` sem `type`, sobre cliente `provider`: 200 e `type` segue `provider` — teste
   de feature, visto vermelho contra `main`.
2. `PUT /api/budgets/{id}` sem `payment_terms`, sobre orçamento com condições: 200 e o valor
   preservado — teste visto vermelho contra `main`; com `payment_terms: null` explícito, apaga.
3. `PUT /api/courses/{id}` sem `workload_hours`: 422 e o valor no banco intacto (idem `PUT` de
   role sem `permissions`; e `permissions: []` explícito segue aceito e esvazia): passa antes e
   depois da remoção do default. `PUT` de curso com o payload atual do SPA segue 200 depois do
   `#[Computed]` em `redator_ids`.
4. `POST /api/clients` sem `type` cria `client`.
5. `BudgetController` sem escrita Eloquent direta; `UpdateBudgetAction` existe e é a única porta do
   `update`.
6. `PersistenceLawsTest` alcança `TurmaData::$redatores` (vista: tirar o `#[ReadOnlyCollection]`
   reprova).
7. Catraca de default literal verde, vista reprovar por sonda com `ClientData::$type = 'client'`.
8. `grep -rn 'PageRequest\|EmissionPanelRequest' backend/app backend/tests frontend/src` vazio
   (fora do rastro histórico em docs); `generated.ts` regenerado com `PageQueryData`; nenhum tipo de
   paginação escrito à mão em `frontend/src`.
9. Suíte backend verde; `pnpm build`, `pnpm lint` e `pnpm test` verdes.
10. P-51 fechada no registro de fechamento (campos 2 e 4 pagos, 3 provado fail-closed, 5 e 6 mortos
    desde o bloco 39).

## Verificação externa

Nenhuma. O bloco cobre contrato de DTO, Action, catraca de teste e renome, tudo provado na suíte e
no stack local. `efeito_externo: nao`.
