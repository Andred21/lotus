# Spec — Contrato de entrada: identidade e coleção nested (BD-9)

> **Work item:** `contrato-de-entrada-identidade-e-nested` · **Branch:** `feat/contrato-de-entrada-identidade-e-nested`
> **Base:** `0c2a24b` (main) · **Estado na escrita:** `planning`
> **Origem:** revisão de arquitetura de 2026-08-12, achados **4** e **5** (`backlog.md:185-231`)
> **Context Packet:** dispensado por ausência **medida** de fonte externa (§1.6)

---

## §1 — Terreno medido antes de desenhar

Tudo abaixo foi lido no código desta branch, não herdado de relatório. Onde houve sonda, ela está
declarada com o resultado e com a restauração da árvore.

### 1.1 Os caminhos de escrita de identidade são nove, e a assimetria é exatamente a do achado

`grep` de `->provision(`, `ensureRutAvailable` e `ensureEmailAvailable` em `app/` devolve nove
call-sites de escrita, em cinco creates e quatro updates:

| Caminho | RUT | E-mail |
|---|---|---|
| `CreateClientAction.php:31` (via `provision`) | ✅ | ❌ |
| `UpdateClientAction.php:35` | ✅ | ❌ |
| `CreateRedatorAction.php:51` (via `provision`) | ✅ | ❌ |
| `UpdateRedatorAction.php:57` | ✅ | ❌ |
| `CreateStaffUserAction.php:30-34` | ✅ (condicional) | ✅ |
| `UpdateStaffUserAction.php:43-47` | ✅ (condicional) | ✅ |
| `CreateStudentAction.php:49-51` | ✅ (via `provision`) | ✅ |
| `UpdateStudentAction.php:25-26` | ✅ | ✅ |
| `StudentResolver.php:63-64` | ✅ (via `provision`) | ✅ |

`provision()` (`UserProvisioner.php:30`) chama `ensureRutAvailable` por dentro e **deixa o e-mail
para o chamador** — quatro dos nove esquecem. Como `users.email` é `unique`
(`create_users_table.php:19`), a colisão sobe `QueryException`, cai no `default` do `match`
(`ProblemDetails.php:34-35`) e vira **500 genérico** onde deveria ser 422 com o campo.

A assimetria já estava escrita no próprio guardrail: `UniquenessInsideTransactionTest:49` passa
`['rut','email']` para staff; `:68` e `:89` passam só `['rut']` para cliente e redator.

### 1.2 O staff tem `rut` nullable, e isso derruba a assinatura que o backlog propôs

`users.rut` é `nullable()->unique()` (`create_users_table.php:18`). `CreateStaffUserAction:30-32` e
`UpdateStaffUserAction:43-45` decidem entre `null` e a checagem por um ternário sobre
`Optional|null`. A assinatura `ensureIdentityAvailable(string $rut, …)` escrita no backlog **não
cobre** esses dois caminhos.

### 1.3 Fazer `provision()` checar e-mail torna duas chamadas redundantes

`CreateStudentAction:49` e `StudentResolver:63` chamam `ensureEmailAvailable` imediatamente antes do
`provision`. Com a checagem por dentro, as duas viram trabalho repetido — não erro, mas ruído que a
porta única existe para eliminar.

### 1.4 O `Optional` no `ClientData` **não** é inerte no frontend — 17 erros, medidos por sonda

`ClientData.php:42,45` são `array $addresses = []` / `array $contacts = []`, e `rules()` (`:51-61`)
declara só `rut` e `contacts`. `UpdateClientAction:52-60` apaga e recria os dois, então a chave
ausente soft-deleta a coleção em silêncio.

O front **sempre** manda as duas (`useClientForm.ts:46-47`), então a mudança é inerte **em runtime**.
Em compilação não é. Sonda: `addresses`/`contacts` marcados `| undefined` no `generated.ts` e
`pnpm exec tsc -b --noEmit` →

| Arquivo | Erros |
|---|---|
| `features/commercial/hooks/useClientForm.ts` | 10 |
| `features/commercial/components/Client/ContactFields.tsx` | 3 |
| `features/commercial/components/Client/ClientsTable.tsx` | 2 |
| `features/commercial/components/Client/ContactCard.tsx` | 2 |
| **total** | **17** |

Árvore restaurada em seguida (`git checkout` + `git status --porcelain` vazio).

### 1.5 O universo da lei é cinco, não dois — e só quatro são read-write

`der-fisico.md:103-106` é lei: "toda coleção nested read-write futura nasce `Optional`". O universo
de `#[DataCollectionOf]` em `app/` são **cinco** propriedades em três DTOs:

| Propriedade | Forma | Lida na entrada? |
|---|---|---|
| `ClientData::$addresses` (`:40-42`) | `array = []` | **sim** (`Create/UpdateClientAction`) |
| `ClientData::$contacts` (`:43-45`) | `array = []` | **sim** (`Create/UpdateClientAction`) |
| `CourseData::$templates` (`:35-37`) | `array\|Optional` ✅ | sim |
| `CourseData::$modules` (`:38-40`) | `array\|Optional` ✅ | sim |
| `BudgetData::$quotes` (`:33-35`) | `array = []` | **não** |
| `BudgetData::$files` (`:37-38`) | `array\|Optional = []` | **não** |

`grep` de `data->quotes` e `data->files` em `app/` volta **vazio**: as duas de `BudgetData` são
projeção de saída — cotação se escreve pela própria rota (`POST /budgets/{budget}/quotes`). Elas
**não violam a lei**, que fala de coleção read-write. Uma guarda que só olhasse o atributo nasceria
vermelha nelas.

### 1.6 Sem fonte externa, e o arquivo de contexto não existe mais

O `architecture-review-20260812-backend.html` que originou o bloco vivia no `/tmp` de outra sessão e
não sobreviveu a ela. Não bloqueia: os achados 4 e 5 estão transcritos integralmente em
`backlog.md:185-231`, com paths, linhas e as decisões do grilling. Nenhum item cita Drive, Notion ou
Figma — `context_packet` segue `null` por ausência medida, decisão registrada em `state.md`.

### 1.7 Detalhe mecânico do gerador: quem produz o `| undefined` é o docblock

`BudgetData::$files` é declarado `array|Optional = []` com `/** @var FileData[] */` e sai
`files: FileData[]` no `generated.ts` — sem `| undefined`. `CourseData:35,38` escreve
`/** @var array<X>|Optional */` e sai com ele. O docblock manda; mudar só o tipo PHP não muda o
contrato TS.

### 1.8 Baseline

`state.md` registra **573 passed, 5 skipped (2104 assertions)** medidos nesta branch em 2026-08-13.
O `writing-plans` **remede** antes de projetar — número herdado não é baseline.

---

## §2 — Decisões

**D1–D4 vêm fechadas do grilling de 2026-08-12** e não foram reabertas. **D5–D9 são deste
brainstorming**, cada uma escolhida pelo João entre alternativas apresentadas.

| # | Decisão |
|---|---|
| **D1** | Fechar o invariante **por dentro**: `provision()` passa a checar e-mail, e nasce um método único de checagem para os caminhos de update. Corrigir call-site a call-site deixaria a interface exigindo memória. |
| **D2** | O 422 é **explícito sobre o registro arquivado**. ~10 usuários internos, não superfície pública: esconder transforma um erro acionável ("restaure o cliente") em beco sem saída. |
| **D3** | `addresses` vira `Optional`; `contacts` **migra junto**, com `min:1` valendo só quando a chave vier. |
| **D4** | A mudança é **inerte para a tela de hoje** (`useClientForm.ts:46-47` sempre manda as duas). O valor é fechar o caminho, não corrigir sintoma visível. Ver a ressalva medida da §1.4: inerte em runtime, **não** em compilação. |
| **D5** | O helper é a **porta única dos nove**, com `?string $rut` para caber no staff, e `ensureRutAvailable`/`ensureEmailAvailable` viram **privados**. Alternativa recusada: fechar só os quatro quebrados, deixando os dois métodos públicos e três formas de checar identidade convivendo. |
| **D6** | `contacts` é `sometimes` no **PUT** e obrigatório no **POST**, e a obrigatoriedade do POST mora na **Action**, não em `rules()`. Alternativa recusada: `sometimes` nos dois verbos, que revogaria a regra do Drive (`entidade-contato-cliente.md`, ratificada 2026-07-31) e deixaria a UI como única guardiã. |
| **D7** | O 422 **agrega** os dois campos: RUT e e-mail colidindo na mesma requisição sobem num único `ValidationException` com as duas chaves. Alternativa recusada: um por vez, que custa dois round-trips ao operador. |
| **D8** | O helper lê `deleted_at` **na mesma query** e cada campo ganha duas mensagens — vivo e arquivado, quatro no total. Alternativa recusada: mensagem única citando as duas hipóteses, que faria quem colidiu com cadastro vivo ler uma frase sobre arquivamento. |
| **D9** | A lei da §1.5 ganha **guarda estática**, e a exceção read-only é declarada **no sítio** por um atributo `#[ReadOnlyCollection]`, não por allowlist dentro do teste. Alternativas recusadas: migrar `BudgetData` junto (medido: 3 erros TS em 2 arquivos, e o tipo passaria a mentir sobre uma saída sempre preenchida) e allowlist literal (a mesma "interface que exige memória" que a D5 existe para matar). |

**Consequência declarada, não escolha:** `Create/UpdateStaffUserAction`, `Create/UpdateStudentAction`
e `StudentResolver` mudam de forma **sem ter defeito**. É o preço da porta única, e por isso a prova
de que o comportamento deles não mudou entra no DoD (§7.8).

---

## §3 — Desenho: identidade

### 3.1 A interface

```php
// App\Domains\Identity\Services\UserProvisioner
public function provision(string $type, string $name, string $rut, string $email, ?string $phone = null): User
public function ensureIdentityAvailable(?string $rut, string $email, ?int $exceptUserId = null): ?string

private function ensureRutAvailable(string $rut, ?int $exceptUserId = null): string    // era public
private function ensureEmailAvailable(string $email, ?int $exceptUserId = null): void  // era public
```

`provision()` chama `ensureIdentityAvailable` por dentro — hoje chama só o RUT
(`UserProvisioner.php:30`). O retorno `?string` é o RUT formatado, ou `null` quando não há RUT a
checar; a normalização por `Rut::parse()->format()` fica onde está.

`?string $rut` é o que faz o staff caber sem um segundo método: `null` significa "não há RUT a
checar" **dentro** do helper, e os ternários de `CreateStaffUserAction:30-32` e
`UpdateStaffUserAction:43-45` passam a viver num lugar só. **O e-mail nunca é pulado** — é a metade
que faltava.

### 3.2 Os nove caminhos, em duas formas e nenhuma outra

- **5 creates** — `CreateClientAction`, `CreateRedatorAction`, `CreateStudentAction` e
  `StudentResolver` pelo `provision()`; `CreateStaffUserAction` chamando `ensureIdentityAvailable`
  direto, porque staff nasce **ativo com senha real** e por isso não usa o `provision`.
- **4 updates** — `UpdateClientAction`, `UpdateRedatorAction`, `UpdateStaffUserAction` e
  `UpdateStudentAction` chamando `ensureIdentityAvailable` direto.

As duas chamadas redundantes da §1.3 (`CreateStudentAction:49`, `StudentResolver:63`) são removidas.

A checagem continua **dentro da transação que escreve**, em todos os caminhos — é a lei que o
`UniquenessInsideTransactionTest` guarda, e este bloco não a afrouxa.

### 3.3 A forma do 422 (D7 + D8)

As duas checagens rodam **sempre**; os erros vão para um mapa e sobe **um** `ValidationException`:

```json
{
  "type": "https://lotus.cl/errors/validation",
  "title": "Erro de validação",
  "status": 422,
  "errors": {
    "rut":   ["Este RUT já está cadastrado."],
    "email": ["Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro."]
  }
}
```

`->exists()` vira leitura de `deleted_at` na mesma query (`first(['id','deleted_at'])` ou
equivalente) — mesmo número de idas ao banco. Quatro mensagens no total, duas por campo, em **PT-BR**
como a vizinhança. O idioma canônico das `ValidationException` é a **Q-6**, travada em decisão do
João; este bloco não a reabre.

O envelope já existe: `ProblemDetails.php:47-49` carrega `errors` por campo, e o
`FormErrorSummary` do front renderiza qualquer chave.

### 3.4 Um ruído previsto, não descoberto depois

`UniquenessInsideTransactionTest:116` filtra por `str_starts_with($query->sql, 'select exists')` para
medir o nível de transação da checagem. Trocar `->exists()` por leitura de coluna **muda o SQL** e os
três casos reprovam com `a checagem de unicidade de rut não rodou`. O teste muda no mesmo commit, e o
que ele mede continua sendo o mesmo: nível de transação. O caso do cliente e o do redator passam a
pedir `['rut','email']` em vez de `['rut']` — é a assimetria da §1.1 desaparecendo do guardrail.

---

## §4 — Desenho: coleção nested

### 4.1 O DTO

```php
/** @var array<ClientAddressData>|Optional */
#[DataCollectionOf(ClientAddressData::class)]
public array|Optional $addresses = new Optional,

/** @var array<ClientContactData>|Optional */
#[DataCollectionOf(ClientContactData::class)]
public array|Optional $contacts = new Optional,
```

O docblock com `|Optional` é obrigatório, não estilo — §1.7 mede que é ele quem produz o
`| undefined` no `generated.ts`. Molde: `CourseData:35-40`.

`fromModel` (`ClientData.php:78-79`) continua preenchendo as duas sempre. Saída não muda em valor.

### 4.2 As Actions

`Create/UpdateClientAction` guardam os dois `foreach` com `instanceof Optional`, molde do
`UpdateCourseAction:37,46`. No **create**, ausente significa "não cria nada" — não existe coleção
anterior para apagar, que é a razão de o `Optional` existir. `PrimaryAddressService::ensureSingle` e
`PrimaryContactService::ensureSingle` seguem rodando incondicionalmente: são idempotentes sobre o que
já está no banco.

### 4.3 A obrigatoriedade do POST sai do `rules()` e vai para a Action (D6)

```php
// ClientData::rules()
'contacts' => ['sometimes', 'array', 'min:1'],
```

e `CreateClientAction` lança `ValidationException::withMessages(['contacts' => …])` quando a coleção
vier `Optional` ou vazia.

**Razão:** os 14 DTOs do repositório têm `rules(): array` estático — não existe um único
`ValidationContext` em `app/` —, e ler `request()` de dentro do DTO acoplaria o contrato ao HTTP. O
precedente é exato: `CreateStudentAction:33-37` já lança `client_id` obrigatório de dentro da Action,
com o comentário explicando por quê.

`addresses` não ganha mínimo em verbo nenhum: `rules()` não valida endereço hoje, e este bloco não
inventa regra que ninguém pediu.

### 4.4 A matriz de comportamento

| Requisição | Hoje | Depois |
|---|---|---|
| `POST /clients` sem `contacts` | 422 | 422 (regra do Drive viva, na Action) |
| `POST /clients` sem `addresses` | 201, sem endereço | 201, sem endereço |
| `PUT /clients/{id}` sem `contacts` | 422 | **200**, contatos preservados |
| `PUT /clients/{id}` sem `addresses` | 200, **endereços apagados em silêncio** | **200**, endereços preservados |
| qualquer verbo, `contacts: []` | 422 | 422 |
| `PUT` com `addresses: []` | apaga | apaga (explícito continua explícito) |

---

## §5 — Desenho: frontend

Os 17 erros da §1.4 são corrigidos **no mesmo commit** que regenera — regra de
`generated-types.md` ("task que regenera ajusta os consumidores no mesmo commit").

O molde já existe na casa, em `useCourseForm.ts:22,44`: um tipo local que estreita a coleção de volta
a array (`Omit<ClientData, 'addresses'|'contacts'> & { addresses: …[]; contacts: …[] }`) e a
normalização `?? []` na fronteira de entidade, com o comentário que o `useCourseForm.ts:42-43` já
escreve — a resposta da API sempre traz; o `| undefined` é do lado da **entrada**.

`ContactFields.tsx` e `ContactCard.tsx` param de tipar via `ClientData['contacts']` e passam a usar
`ClientContactData` direto do `generated` — tipagem correta de qualquer forma, e imune a esta classe
de mudança. `ClientsTable.tsx:82,87` ganha `?.` nos dois sítios de listagem.

**Sem teste automatizado novo no frontend, e a razão é a de sempre neste repositório:** o runner
cobre hooks de `shared/`, e `useClientForm` é hook de feature. A prova é `tsc`/`pnpm build` mais o
e2e contra a API. Declarado, não escondido.

---

## §6 — Desenho: a guarda da lei

Um caso novo em `tests/Feature/Shared/PersistenceLawsTest.php` — casa das leis com varredura
estática, que já carrega o trait `ScansPhpSource`.

**Enunciado:** toda propriedade com `#[DataCollectionOf]` em `app/**/Data/*.php` ou admite `Optional`
no tipo, ou está marcada `#[ReadOnlyCollection]`.

Nasce `App\Shared\Data\Attributes\ReadOnlyCollection`, e `BudgetData::$quotes` e `$files` a recebem.
A exceção fica **onde o leitor do DTO a vê**, não numa lista dentro do teste — mesmo argumento que
fez o `PivotAudit` ser porta única no bloco anterior.

**Universo depois da correção:** 4 read-write com `Optional`, 2 marcadas read-only, zero violação. A
guarda nasce verde — e por isso **precisa ser vista reprovando com sonda** (§7.10). Guarda que nunca
reprovou não vale nada (lição 10).

**O que a guarda NÃO cobre, declarado em vez de insinuado:** `CourseData::$redator_ids` é
`array = []` e não tem `#[DataCollectionOf]`; está fora do alcance, é read-only, e a guarda não vai
fingir que o vê. Coleção nested que nasça sem o atributo escapa da varredura pelo mesmo motivo.

---

## §7 — DoD

Cada linha é comportamento provado, não pacote instalado. As três primeiras nascem **vermelhas**
contra o código de hoje.

1. `PUT /api/clients/{id}` **sem** a chave `addresses` → 200 com os endereços preservados.
2. `PUT` **sem** `contacts` → 200 com os contatos preservados.
3. E-mail duplicado nos **quatro** caminhos (`POST`/`PUT` de `clients` e de `redatores`) → 422
   `application/problem+json` com `errors.email`, em vez de 500 genérico.
4. `POST /api/clients` sem `contacts` → 422 nomeando `contacts`.
5. `PUT` com `addresses: []` → apaga.
6. RUT **e** e-mail colidindo na mesma requisição → **um** 422 com as duas chaves.
7. Duplicado **arquivado** → mensagem própria, distinta da do vivo, nos dois campos.
8. Staff e aluno com comportamento inalterado, inclusive `rut` nulo no staff, que segue aceito.
9. `ensureRutAvailable`/`ensureEmailAvailable` privados — nenhum caminho consegue chamar metade do
   invariante.
10. A guarda da §6 **vista reprovando** com sonda (um DTO com `#[DataCollectionOf] public array $x = []`
    sem marcador) e verde com o marcador, com a árvore restaurada em seguida.
11. `UniquenessInsideTransactionTest` segue provando nível de transação nos três casos, com o SQL
    novo, e o cliente e o redator passam a pedir `['rut','email']`.
12. `pnpm build` verde com os 17 erros resolvidos; `typescript:transform` **sem diff** depois de
    regenerar.

---

## §8 — Risco de review: ALTO

**Divergindo do MÉDIO que o backlog escreveu.** O gate da `revisar-sprint` é binário e lista
`generated.ts` entre os gatilhos de alto (`.claude/skills/revisar-sprint/SKILL.md:37`); o bloco
regenera. Duas lentes, portanto — Claude com o gabarito do projeto mais revisão independente do
Codex.

A divergência fica **declarada**, não corrigida por conta própria no backlog — precedente de
2026-08-11, quando a classificação da spec e a do gate também não bateram.

Os dois riscos próprios, além do gatilho:

- **Alcance da porta única:** cinco caminhos que não têm defeito mudam de forma (§2, consequência
  declarada). Regressão ali seria em cadastro de staff ou de aluno, longe do achado.
- **Contrato TS:** `generated.ts` muda a forma de `ClientData`, e o build é o único mecanismo que
  pega consumidor esquecido.

---

## §9 — Fora de escopo, com a razão

- **`ClientContactData.is_primary`** — default não-`Optional` rebaixa dado em silêncio no PUT
  parcial. Mesma família do achado 5, mas é dívida com entrada própria no backlog e nas rules
  (`generated-types.md`). Entra só por instrução do João.
- **Idioma das mensagens** — segue PT-BR. A **Q-6** está travada em decisão dele.
- **`CourseData::$redator_ids`** — read-only, sem `#[DataCollectionOf]`, fora do alcance da guarda
  (§6).
- **`BudgetData` migrando para `Optional`** — recusado na D9, com o custo medido (3 erros TS em 2
  arquivos) registrado para quem reabrir.

**O que este bloco NÃO vai provar, sem maquiagem:**

- **A corrida de unicidade concorrente segue aberta.** O `withTrashed` fecha o falso 500 do
  arquivado, não a janela entre duas escritas simultâneas; a defesa ali é o `unique` do MySQL, como
  `UniquenessInsideTransactionTest:26-31` já registra. A suíte roda sqlite `:memory:` e não fecha
  corrida.
- **Nenhuma tela vista renderizada** — o único frontend tocado é correção de tipo, sem mudança
  visual, e o comportamento de hoje já manda as duas coleções.
- **A prova do frontend é build + e2e**, não teste automatizado: `useClientForm` é hook de feature e
  está fora do corte do runner (§5).
