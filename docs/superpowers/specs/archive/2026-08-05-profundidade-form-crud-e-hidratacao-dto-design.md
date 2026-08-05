# Spec — Profundidade de module · formulário CRUD e hidratação de DTO

> Bloco `profundidade-form-crud-e-hidratacao-dto`. Item 1 do `backlog.md`, selecionado pelo João em
> 2026-08-05. Sem task Notion e sem documento no Drive: o bloco nasceu do review de arquitetura de
> 2026-08-04 sobre o próprio repositório, e por isso a rota foi direta a `ready_for_planning`, sem
> Context Packet — o registro está no `state.md`.

## §1 · O que este bloco é

Dois candidatos do review, um bloco só. Nenhum dos dois corrige defeito visível: os dois trocam a
forma de um module raso por uma funda, e por isso o critério de aceite é **comportamento idêntico
provado**, nunca suíte verde.

**A — a hidratação de DTO para de resolver serviço pelo container.** Oito `fromModel` chamam `app()`
por dentro. Sete assinam URL (`download_url` ×3, `photo_url` ×4); o oitavo (`TurmaData`) deriva
domínio. O piloto H.4.6 de 2026-08-04 já provou que **passar o serviço por parâmetro não é saída
para a família de URL**: `BudgetData::fromModel` recebe `BudgetSummaryService` por parâmetro, mas
chama `QuoteData::collect($budget->quotes->all())` na linha 66, e `collect()` do spatie não carrega
argumento extra — o aninhamento `Budget → Quote → File` corta o threading.

**B — um module de formulário CRUD no lugar de nove montagens à mão.** `useEntityForm` entra com ~5
das 48 linhas do menor consumidor; todo o resto (`useCreate`/`useUpdate`, a ramificação do `submit`,
a origem do id, o `pending` somado, a normalização RFC 7807) é copiado nove vezes.

### Medições que sustentam o corte

Feitas em `c43a2a1`, antes de qualquer decisão de desenho.

- **`Cast` é o lado errado do `spatie/laravel-data` 4.23.** `Cast::cast(..., CreationContext)` roda na
  criação; quem transforma na saída é `Transformer::transform(..., TransformationContext)`. Os 8 DTOs
  constroem por `fromModel` explícito e os `::from([...])` do repositório recebem **array** (contrato
  de entrada), nunca model — um cast jamais dispararia nesses sítios. O backlog escreveu "cast"; o
  mecanismo com essa semântica é `#[WithTransformer]`.
- **`generated.ts` sai do `AttributedClassTransformer`** (`TypeScriptTransformerServiceProvider:16`),
  que emite **nome e tipo da propriedade PHP**. Renomear a propriedade para `photo_path` quebraria o
  front; `MapOutputName` não é lido por esse transformer.
- **`TransformedDataResolver:102` devolve `null` antes de chamar o transformer.** `photo_url: null`
  continua null sem nenhuma linha extra.
- **Nada em PHP lê `->download_url`/`->photo_url` como propriedade.** As 12 ocorrências em `tests/`
  passam por `$response->json(...)`, ou seja, pelo pipeline de transformação.
- **Os dois métodos de assinatura só têm esses 7 chamadores em produção.**
  `UploadFileAction::temporaryUrl` e `UserPhotoService::urlFor` não são chamados em mais lugar nenhum;
  restam 2 chamadas diretas em `UserPhotoTest:101,111`.
- **TTL e disco medidos:** `download_url` **10** minutos (`UploadFileAction:142`), `photo_url` **60**
  (`UserPhotoService::URL_MINUTES`). Os dois assinam contra
  `Storage::disk(UploadFileAction::publicDiskFor(config('filesystems.default')))`.
- **`TurmaData::fromModel` tem 4 call sites, não 2.** `TurmaController:47`, `TurmaController:110`,
  `TurmaDataEnrichmentTest:38`, `SoftDeletedRelationProjectionTest:192`. O backlog media 2 — é a
  mesma forma da lição 13 que mordeu no H.4.6, onde a spec media 4 call sites e existiam 6.
- **`useTurmaConfigForm` não roda sobre `createCrudResource`.** Usa `useCreateTurma({quoteId,
  payload})` e `useUpdateTurma({turmaId, payload})`, porque a turma nasce em rota aninhada
  (`POST quotes/{quote}/turma`). O backlog o listava na migração do sinal 1; a medição o tira.
- **Nove consumidores de `useEntityForm`**, de 48 a 145 linhas: `useRoleForm` 48, `useBudgetForm` 56,
  `useStudentForm` 61, `useTurmaConfigForm` 76, `useStaffUserForm` 80, `useQuoteForm` 85,
  `useRedatorForm` 93, `useClientForm` 116, `useCourseForm` 145.
- **A origem do id do update diverge hoje.** `useRoleForm` usa `form.id!`; `useStaffUserForm`,
  `useStudentForm` e `useBudgetForm` usam o id da entidade.
- **A ordem dos callbacks pós-`201` diverge hoje.** `useStaffUserForm` e `useStudentForm` fazem
  `await afterCreate(created)` **antes** de `onDone()`; `useBudgetForm` chama `onDone()` **antes** de
  `onCreated(created)`.
- **Só 6 dos 9 diálogos têm `FormErrorSummary`.** Têm: role, staff, budget, cliente, curso, e os 3
  não-CRUD (`QuoteWizard`, `EnrollStudentForm`, `TurmaConfigCard`). **Não têm:** `StudentDialog` e
  `RedatorDialog` — só `FormErrorBanner` (erro geral) e `error=` por campo.
- **`useRedatorForm:66-73` monta o create com `new FormData()`** — a catraca de um da regra
  `no-restricted-syntax` nascida no review de 2026-08-04.
- **`FormErrorSummary` mostra exatamente as chaves que NÃO estão em `mapped`** (`FormField.tsx:73-77`).
  Chave fora de `mapped` é exibida pelo resumo; chave dentro dele fica a cargo do input próprio. Logo
  a falha silenciosa é a chave **listada em `mapped` sem input correspondente na tela** — some das
  duas pontas. Dois casos corretos hoje provam a direção: `RoleDialog:56` tem `mapped={['name']}` com
  payload `{name, permissions}`, e os checkboxes de permissão não mostram erro próprio; e
  `ClientGeneralFields` não tem input de `phone`, embora o payload o envie.

## §2 · Decisões

**D1 — Os dois candidatos entram no mesmo bloco, A antes de B.** Não se tocam: zero arquivo em comum,
stacks diferentes. A ordem é decisão do João em 2026-08-05, com critério: A tem tamanho fixo e
conhecido e prova por e2e; B tem cauda variável (o piloto pode virar sinal 1, 2 ou 3) e leva o
checkpoint visual, que fica adjacente ao gate como nos três blocos anteriores. B antes de A poria a
aprovação visual no meio do bloco, com A ainda por mexer no payload de arquivo e foto — foi assim
que o bloco do redator precisou de duas aprovações.

**D2 — A assinatura de URL sai por `Transformer`, não por `Cast`.** Pelo medido em §1: cast não
dispara em `fromModel`. Decisão do João em 2026-08-05, entre transformer, accessor no model e módulo
de assinatura estático.

**D3 — A propriedade mantém nome e tipo; o que muda é o conteúdo até a serialização.**
`public string $download_url` e `public ?string $photo_url` ficam como estão e passam a carregar o
**path**; o transformer assina na saída. É o que mantém `generated.ts` sem diff e o payload da API
idêntico byte a byte. O custo está declarado na D6.

**D4 — Um transformer só, parametrizado por minutos.** As duas implementações de hoje são a mesma
operação (§1); a diferença é TTL e nullability, e a nullability o resolver já trata. Dois
transformers seriam duas cópias da mesma linha de `Storage::disk(...)`.

**D5 — `UploadFileAction::temporaryUrl` e `UserPhotoService::urlFor` morrem.** É o teste de deleção
do sub-bloco: sem chamador em produção, mantê-los deixaria duas maneiras de assinar a mesma URL, que
é o estado que o bloco existe para desfazer. `UploadFileAction::publicDiskFor` **fica** — é ela que
resolve o disco `{disco}_public`, achado real de 2026-07-31 (`AWS_ENDPOINT` que escreve não é o que o
navegador lê), e passa a ser chamada pelo transformer. Os 2 testes que hoje chamam `urlFor` direto
migram para o teste do transformer, sem perder o caso `null`.

**D6 — A leitura em PHP da propriedade vira mecanismo, não docblock.** Depois da D3, `$data->photo_url`
em PHP devolve um path, e nenhum teste vê. Docblock aqui é lição 14 esperando para acontecer, e a
lição 13 é reincidente no projeto. Entra um teste no molde do `DomainDependencyTest`: leitura de
`->download_url` ou `->photo_url` fora do `SignedUrlTransformer` reprova. Ele nasce **visto
reprovando** com sonda, e a sonda sai antes do commit. **A armadilha conhecida é a do H.4.1:** regex
sobre arquivo cruza comentário e docblock e reprova por menção, não por leitura — os próprios
docblocks destes DTOs citam `download_url` em prosa. O plano decide como o teste distingue as duas
coisas, e a prova é sonda nos dois sentidos: leitura real reprova, menção em comentário não.

**D7 — `TurmaData` recebe o serviço por parâmetro, e os 4 call sites são atualizados.** Os 2 do
`TurmaController` já recebem dependência por injeção de método; os 2 de teste passam a resolver com
`app(TurmaHabilitacaoService::class)` na chamada. É a mesma leitura que fechou a **D9 do H.4.6 como
sinal 1**: produção limpa em um nível, e teste que resolve serviço é adaptação mecânica de
assinatura, não o defeito. **Reabre a D10 do bloco `hardening-guardrails-e-transportes`** ("a família
que assina URL segue com o container de propósito"): eram 6 sítios na medição do piloto, são 8, e a
técnica pagou.

**D8 — `useCrudForm` recebe o recurso de forma estrutural, não importa `createCrudResource`.** É o
precedente do `ListableResource` do `useCrudPage`, e é o que permite ao teste passar um literal sem
TanStack Query (`useCrudPage.test.ts:11`).

**D9 — `toPayload` recebe o modo.** Create e update divergem de verdade em 3 dos 9: `useStudentForm`
tira `client_id` no update (trocar de empresa é ato da matrícula), `useStaffUserForm` só manda
`password` quando preenchido, `useBudgetForm` muda o conjunto.

**D10 — O id do update vem da entidade, nunca do form.** Unifica a divergência medida em §1. Id de
registro em edição não sai de campo que o usuário digita; `useRoleForm` só funciona hoje porque o
`toFields` copia o id.

**D11 — `mapped` não é derivado do payload, e sobe para junto do `toPayload`.** O contrato do
`FormErrorSummary` é "campos que **têm input na tela**", não "chaves do payload": o payload de
`useClientForm` tem `id`, `phone`, `addresses` e `contacts`, e o `mapped` do `ClientDialog` tem seis
chaves sem `phone` — derivar suprimiria em silêncio exatamente os 422 que o componente existe para
mostrar, e o comentário do `ClientDialog` já avisa que `addresses.*` não pode entrar em
`excludePrefixes`. Decisão do João em 2026-08-04, depois de a recomendação contrária ter sido
medida e retirada. O custo de subir `mapped` para o hook está declarado: conhecimento de tela passa a
morar ao lado do payload, e é isso que torna a guarda possível.

**D12 — A guarda exige classificação explícita de toda chave de payload, em três caixas.** Regra de
lint foi **medida e descartada**: `mapped` mora no JSX do diálogo e `toPayload` no hook — arquivos
diferentes, e ESLint é por arquivo.

**A direção escrita no backlog estava errada, e reprovaria código correto.** "Reprovar chave que não
está em `mapped` nem em `excludePrefixes`" acusa exatamente as chaves que o resumo **mostra** — o
`RoleDialog` reprovaria no primeiro hook do piloto por causa de `permissions`, e o conserto induzido
(pôr a chave em `mapped`) é a supressão silenciosa que a D11 existe para impedir. Achado ao escrever
o plano, em 2026-08-05, com a evidência em §1; correção decidida pelo João na mesma sessão.

Nasce `summaryOnly` ao lado de `mapped` e `excludePrefixes`, e a invariante passa a ser: **toda chave
que o `toPayload` produz, nos dois modos, está em uma das três.** Chave nova no payload não entra em
silêncio — quem a cria é obrigado a declarar quem mostra o 422 dela. `summaryOnly` é "quem mostra é o
resumo", e isso cobre dois casos medidos: chave sem input nenhum (`phone` do cliente) e chave com
input que não exibe erro próprio (`phone` e `is_active` do staff, `permissions` da role). `summaryOnly`
**não** vai para o `FormErrorSummary`; ele existe só para a classificação ser explícita — mandá-lo
junto sumiria com os erros que o componente existe para mostrar. `id` entra nele como qualquer outra
chave, sem exceção embutida na guarda: exceção por nome envelhece calada.

Provada em dois níveis. **Nível 1:** teste do próprio module com config divergente, visto reprovando
(lição 10), e um caso simétrico provando que chave classificada **não** dispara falso positivo.
**Nível 2:** um teste por hook migrado que o renderiza, para o CI exercitar as configs reais — mora na
própria feature, porque teste em `shared/` importando `features/` quebraria a lei §5.6.

**D13 — Piloto de 2, com os sinais de saída escritos antes de executar.** `useRoleForm` (48 linhas, o
mais simples) e `useStaffUserForm` (80, payload divergente **e** `afterCreate`). **Sinal 1** — a
técnica paga, o consumidor encolhe e não sobra montagem no chamador: migra os outros 4 no mesmo
bloco. **Sinal 2** — o module só empurra a montagem para o chamador: para no piloto e registra a
razão no fechamento. **Sinal 3** — o consumidor fica maior ou menos claro: reverte a task. O
fechamento **nomeia qual ocorreu**; piloto sem critério de saída é refactor com nome bonito. Desenho
herdado da D9 do H.4.6.

**D14 — A lista do sinal 1 é de 3, não de 5.** Duas saídas, ambas por medição, pelo mesmo critério que
tirou as 2 tabelas com dropdown da `SearchableTableFrame` em 2026-08-04:

- **`useTurmaConfigForm`** não roda sobre `createCrudResource` — a turma nasce em rota aninhada (§1).
- **`useRedatorForm`** monta o create com `new FormData()` (`:66-73`), a catraca de um da regra
  `no-restricted-syntax` (D11 do bloco de transportes). `toPayload` devolvendo objeto não modela
  multipart, e `documents[tipo]`/`course_ids[]` não são chaves de payload no mesmo sentido. Alargar a
  interface para o único consumidor multipart do repositório poria o piloto em cima de caminho de
  upload — o motivo pelo qual o trio da foto já ficou fora.

Migram **`useStudentForm`, `useBudgetForm` e `useClientForm`**.

**`StudentDialog` não tem `FormErrorSummary`, e o aluno entra assim mesmo.** A lacuna é do diálogo,
não do hook: hoje ele liga `error=` para `name`, `rut`, `email` e `client_id`, e um 422 em `phone`
**não aparece em lugar nenhum**. A classificação obrigatória da D12 **expõe** essa chave sem mudar a
tela — construir o resumo que falta é mudança de comportamento e vira débito registrado no
fechamento, com a razão. `RedatorDialog` tem a mesma lacuna e sai por outro motivo, acima.

**D15 — Um momento só de pós-create, e `useBudgetForm` só migra se a inversão for inofensiva.** O
module expõe `afterCreate?: (created: T) => void | Promise<void>`, **aguardado antes** de `onDone` —
a semântica de 2 dos 3 consumidores que o usam, e a que o buffer de foto exige (o upload precisa
acontecer antes de o diálogo fechar). Para `useBudgetForm` isso inverte a ordem atual: hoje fecha e
depois navega. A inversão é **invariante a provar na tela** (§4), não a supor; se navegar antes de
fechar produzir qualquer efeito visível, `useBudgetForm` fica fora da migração e a razão vai ao
fechamento.

**D16 — Nenhuma chave i18n nova, nenhuma migration, nenhuma mudança de RBAC.** O bloco não cria tela
nem endpoint.

## §3 · Detalhe por sub-bloco

### A — hidratação de DTO

**Nasce:** `backend/app/Shared/Files/Transformers/SignedUrlTransformer.php`.

```php
final class SignedUrlTransformer implements Transformer
{
    public function __construct(private int $minutes) {}

    public function transform(DataProperty $property, mixed $value, TransformationContext $context): string
    {
        return Storage::disk(UploadFileAction::publicDiskFor(config('filesystems.default')))
            ->temporaryUrl($value, now()->addMinutes($this->minutes));
    }
}
```

Não vai em `app/Shared/Casts/` — a pasta existe vazia no disco, não é rastreada pelo Git e o nome
está errado para o lado da serialização (D2). `Shared/Files` é onde o `estrutura-monolito.md` põe o
upload polimórfico (ADR-10/11), e é de lá que `publicDiskFor` já vem.

**Os 7 sítios**, todos com a mesma forma — `#[WithTransformer(SignedUrlTransformer::class, N)]` na
propriedade e o path cru no `fromModel`:

| Arquivo | Propriedade | Minutos | Path que passa a entrar |
|---|---|---|---|
| `Shared/Files/Data/FileData.php:24` | `download_url` | 10 | `$file->path` |
| `Domains/Identity/Data/RedatorDocumentData.php:25` | `download_url` | 10 | `$file->path` |
| `Domains/Operation/Data/TurmaDocumentData.php:26` | `download_url` | 10 | `$file->path` |
| `Domains/Identity/Data/UserData.php:43` | `photo_url` | 60 | `$user->photo_path` |
| `Domains/Commercial/Data/ClientData.php:46` | `photo_url` | 60 | `$client->user->photo_path` |
| `Domains/Identity/Data/RedatorData.php:43` | `photo_url` | 60 | `$redator->user->photo_path` |
| `Domains/Identity/Data/StudentData.php:46` | `photo_url` | 60 | `$student->user->photo_path` |

O `#[Computed]` das quatro `photo_url` **fica**: ele é o que mantém a propriedade fora do contrato de
entrada, e `UserData` também é DTO de request.

**O oitavo:** `TurmaData::fromModel(Turma $turma, TurmaHabilitacaoService $habilitacao)`, com os 4
call sites de §1 atualizados. A regra de parada é a do H.4.6: se aparecer call site além dos 4
medidos, **pare e reporte** — classificá-lo é decisão do João, não da execução.

**Morrem:** `UploadFileAction::temporaryUrl()` e `UserPhotoService::urlFor()` (D5).

**Guarda de leitura (D6):** teste que varre `backend/app/` e reprova `->download_url` / `->photo_url`
fora do transformer.

### B — `useCrudForm`

**Nasce:** `frontend/src/shared/hooks/useCrudForm.ts`, exportado por `shared/hooks/index.ts`.
`useEntityForm` e `useMutationErrors` **continuam existindo** — o novo module os usa por dentro, e
`useQuoteForm`/`useCourseForm`/`useTurmaConfigForm` seguem consumindo `useEntityForm` direto.

```ts
export function useCrudForm<F extends { id?: number }, T>(
  resource: MutableResource<T>,
  opts: {
    entity: F | null
    mode: DialogMode
    empty: F
    toFields?: (entity: F) => F
    toPayload: (form: F, mode: DialogMode) => Record<string, unknown>
    mapped: string[]
    summaryOnly: string[]
    excludePrefixes?: string[]
    onDone: () => void
    afterCreate?: (created: T) => void | Promise<void>
  },
): {
  form: F
  set: <K extends keyof F>(k: K, v: F[K]) => void
  setForm: Dispatch<SetStateAction<F>>
  readOnly: boolean
  didReset: boolean
  submit: () => void
  pending: boolean
  fieldErrors: Record<string, string[]> | undefined
  generalError: string | null
  errorSummary: { mapped: string[]; excludePrefixes: string[] }
}
```

`MutableResource<T>` é estrutural (D8): só `useCreate()` e `useUpdate()`, com o formato de variáveis
que o `createCrudResource` já produz (`payload` e `{ id, payload }`).

`errorSummary` sai pronto para o diálogo espalhar em `<FormErrorSummary errors={fieldErrors}
{...errorSummary} />`, o que apaga duas props escritas à mão em cada tela. Ele carrega **só** `mapped`
e `excludePrefixes`; `summaryOnly` fica na guarda (D12) e nunca chega ao componente — mandá-lo junto
inverteria o contrato do `FormErrorSummary` e sumiria com os erros que ele existe para mostrar.

Classificação dos dois hooks do piloto, medida nos diálogos de hoje:

| Hook | `mapped` | `summaryOnly` |
|---|---|---|
| `useRoleForm` | `['name']` | `['permissions']` |
| `useStaffUserForm` | `['name','rut','email','password','role']` | `['is_active','phone']` |

`phone` (`StaffUserDialog:83`) e `is_active` (`:105`) **têm** input, mas nenhum dos dois passa `error=`
ao `FormField` — quem mostra o 422 deles é o resumo, e é por isso que estão em `summaryOnly`, não em
`mapped`. A classificação descreve quem exibe, não quem existe.

**Piloto (D13):** `useRoleForm` e `useStaffUserForm`. O `toggle` do `useRoleForm` **não** entra no
module — é vocabulário de permissão, fica no hook da feature, sobre o `set` que o module devolve.

## §4 · Invariantes de comportamento

Cada uma é uma afirmação que o bloco não pode mudar, verificável.

1. **`generated.ts` sem diff.** `typescript:transform` roda porque DTOs são tocados; nome e tipo das
   propriedades ficam idênticos, então o arquivo não muda. Diff ≠ vazio reprova o bloco.
2. **O payload da API é idêntico.** As chaves, a ordem e os tipos de `download_url`/`photo_url`
   continuam os mesmos; `photo_url` de usuário sem foto continua `null`.
3. **A URL assinada abre.** Não basta ser string com `http` — tem de responder `200` com o
   `Content-Type` do objeto. Disco errado no transformer produz string plausível e inútil.
4. **`habilitada` e `missing_document_types` continuam com os mesmos valores** nas 2 rotas de turma,
   provado pelos testes de enriquecimento que já existem.
5. **Os diálogos migrados mostram os mesmos erros 422 que mostram hoje**, inclusive os das chaves que
   nenhum campo exibe (`permissions` na role, `phone`/`is_active` no staff, `phone` e `addresses` no
   cliente). A classificação da D12 não pode mover nenhuma chave para `mapped`.
6. **`readOnly` continua desligando os campos no modo `view`**, e o reset por troca de entidade ou de
   modo continua acontecendo (`didReset`).
7. **A foto escolhida no create continua subindo depois do 201** e o diálogo continua aberto quando
   o upload falha (D10/D11 do bloco de alunos) — o `afterCreate` do module é aguardado antes do
   `onDone`.
8. **`useBudgetForm`, se migrar, continua levando o usuário à página de detalhe do orçamento novo**
   (D15). Se a inversão de ordem mudar qualquer coisa na tela, ele não migra.

## §5 · Gate

**Item 0 — critério de aceite do bloco, não higiene genérica.** O bloco troca a forma de dois modules
sem mudar comportamento, então a prova é *comportamento idêntico contra dado real* e *mecanismo visto
reprovando*:

- **e2e com sessão Sanctum** (lição 12 — `Origin` + `Accept` + `X-XSRF-TOKEN`, login
  `admin@lotus.cl`): baixar um documento e uma foto **pelas URLs que a API devolveu**, exigindo `200`
  e o `Content-Type` do objeto. Cobre os dois TTLs e os dois caminhos de path.
- **`habilitada` conferida na resposta real** de `GET /api/turmas` e `GET /api/turmas/{id}`.
- **A guarda da D6 vista reprovando** com sonda fresca (leitura da propriedade em PHP), sonda
  removida, árvore limpa.
- **A guarda da D12 vista reprovando** com chave de payload não classificada, e o caso simétrico
  provando que chave classificada não dispara falso positivo.
- **Checkpoint visual do João** nos diálogos migrados, com os 422 exercitados na tela.

**Automático:** suíte backend com placar declarado no plano (baseline medida na Task 0; o único
movimento previsto é o dos testes novos), `pnpm test`, `pnpm build`, `pnpm lint`, Pint `--test` nos
arquivos `.php` tocados **com guarda de lista vazia** (lição 9), e diff vazio em `generated.ts`,
`locales/*.json`, `backend/database/`.

**Código morto:** nenhum. Os dois métodos que morrem (D5) têm as ocorrências conferidas em zero, e o
module novo tem consumidor.

**Leis §5:** o bloco não toca DDD, auditoria, auth, RBAC, migration nem financeiro. A §5.3 é o risco
declarado da invariante 1; a §5.6 governa onde os testes da D12 moram.

## §6 · Fora de escopo

- **O trio da foto** (`useEntityPhoto` + `afterCreate` + `hasBufferedFailure` + `closeBlocked`,
  idêntico em 4 diálogos) — fica de propósito, débito registrado no `backlog.md`. Absorvê-lo poria o
  bloco em cima de upload com falha silenciosa (lição 6).
- **`useCourseForm`** (145 linhas, módulos + `createdIdRef`), **`useQuoteForm`** (passo de wizard),
  **`useTurmaConfigForm`** (rota aninhada) e **`useRedatorForm`** (create multipart) — D14.
- **Construir o `FormErrorSummary` que falta em `StudentDialog` e `RedatorDialog`.** É mudança de
  comportamento (erro que hoje não aparece passa a aparecer) e não cabe num DoD de comportamento
  idêntico. Vira débito registrado no fechamento, com a chave medida: `phone` no aluno.
- **Os 3 `mapped=` que não vêm de diálogo CRUD:** `QuoteWizard`, `EnrollStudentForm`,
  `TurmaConfigCard`.
- **Os outros 5 candidatos do review de arquitetura** — esqueleto da página CRUD, projeção de
  listagem, controllers de upload, confirmação destrutiva e wrappers pass-through de `shared/ui`.
  Nenhum foi escolhido, e o de `shared/ui` **reprovou o teste de deleção**: o seam sustenta a lei §5.6.
- **Mudar o TTL das URLs assinadas.** 10 e 60 minutos são preservados como estão; discuti-los é
  decisão de produto, não de refactor.
