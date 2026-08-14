# Spec — Célula de identidade: avatar + título + descrição como componente único

- **Work item:** `celula-de-identidade` (item 4 de "Próximos blocos", `backlog.md:33`)
- **Data:** 2026-08-14
- **Branch:** `feat/celula-de-identidade`, worktree `fix-frontend`, criada de `0a1439f`
- **Context Packet:** `docs/superpowers/context-packets/celula-de-identidade.md` (`status: partial`)
- **Escopo:** frontend + **alargamento de dois DTOs no backend** (D2/D3); `generated.ts` regenera
- **Executor previsto:** **dividido por decisão do João em 2026-08-14** — `codex` em `backend/**`,
  `claude` em `frontend/**`. O detalhe e os `paths_autorizados` vivem no `## Handoff de execução`
  do plano; a fronteira que a lei §5.3 impõe está em §7.2

---

## 1. O terreno, medido antes de desenhar

### 1.1 As "quatro grafias" são duas

O backlog registrou quatro grafias do mesmo markup. A medição em `fb443ee` achou **duas**:
`StudentsTable.tsx:36-49`, `RedatoresTable.tsx:37-50` e `UsersTable.tsx:37-50` são **byte a byte
idênticos** módulo o nome da variável e do DTO — não são três grafias, são uma repetida três vezes:

```tsx
<div className="flex items-center gap-3">
  <AppAvatar name={x.name} image={x.photo_url} size="large" />
  <div>
    <p className="font-medium">{x.name}</p>
    <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{x.email}</p>
  </div>
</div>
```

A segunda grafia é o `ClientsTable.tsx:53-67`, e ela diverge em quatro pontos: `flex  items-center`
(espaço duplo), `flex flex-col ` no wrapper, `<span>` em vez de `<p>`, `font-semibold` em vez de
`font-medium` e — o que importa — **`text-sm font-medium text-gray-400` em vez do token do tema.**

`text-gray-400` na linha 63 é a **única ocorrência da classe em todo o repositório**, e o arquivo só
sobrevive ao lint porque está na `CATRACA_COR` (`frontend/eslint.config.js:152`). §6 fecha isso.

`RedatorCard.tsx:39-50` é a mesma grafia dos três de identity mais `min-w-0` + `truncate`. Truncar
nome longo é **acerto**, não particularidade do card: vira comportamento padrão do componente (§2.2).

### 1.2 A superfície real é 14 sítios

O backlog mediu 13. Com a entrada do `RedatorCard` (D10) são **14**, e todos os 14 entram. O único
que fica de fora é o `UserMenu`, e por três razões medidas, não por omissão:

> **Unidade de contagem:** "sítio" é uma célula de identidade a construir, não um arquivo.
> `TurmasTable` vale por 2 (Cliente e Redator) e `RedatorDesignation` vale por 1 caso com 2 pontos
> de render (picker e card). Em pontos de render são **15**; em sítios, 14.

1. **não tem descrição** — é avatar + nome, e só;
2. seu `AppAvatar` é `aria-hidden` deliberado e seu texto é `<span>` porque `<button>` só aceita
   conteúdo de frase; a cor é **branco cravado** sobre a navy fixa do header (D-P13), não
   `--text-color-secondary`. O componente entregaria `<p>` e token — errado nos dois eixos;
3. vive em `app/layouts/`, o shell, e suas decisões de cor foram fechadas em outro bloco.

### 1.3 O que o packet não decidiu

O Context Packet é `status: partial` e diz explicitamente que nenhuma fonte externa (Drive, Notion,
Figma) prescreve célula de identidade, uso de foto, fallback sem imagem, fusão de colunas ou
tratamento de N redatores. As duas capturas que originaram o pedido **não estão no repositório** e
não há locator Figma. Consequência aceita: **não há aceite por equivalência visual**; o DoD se prova
por teste de componente e pela revisão visual do João (§7).

O único sinal externo vinculante é do Notion (`388bc960-3dfa-8188-b051-e0f4feb08943`): a lista de
designação continua **filtrada por habilitação**. Este bloco não toca `useRedatorPicker`, então o
filtro é preservado por construção.

---

## 2. O componente

### 2.1 Onde mora e o que expõe

`frontend/src/shared/ui/IdentityCell/IdentityCell.tsx` + `index.ts`, exportado pelo barrel
`shared/ui/index.ts`. Nome **sem** prefixo `App`: `App*` é reservado a wrapper de PrimeReact neste
repositório, e este é composição própria — mesma prateleira de `DetailHeader`, `PageHeader` e
`FormPhotoRow`.

```tsx
export interface IdentityCellProps {
  title: string
  /** `ReactNode` porque o subtítulo do TurmaDetailPage carrega um AppButton. */
  description?: ReactNode
  image?: string | null
  /** Avatar, título e descrição na MESMA linha (forma 2). Padrão: empilhado (forma 1). */
  inline?: boolean
  size?: AvatarProps['size']
}
```

Apresentacional puro: recebe strings e nós, **não conhece DTO nem regra de domínio**, não busca
dado, não decide fallback de negócio. `size` tem default `'large'`, que é o que os 4 sítios do
Grupo A já usam.

### 2.2 As duas formas

**Forma 1 — empilhada (padrão).** É a grafia dos três de identity, mais o `min-w-0`/`truncate` do
`RedatorCard`:

```tsx
<div className="flex items-center gap-3">
  <AppAvatar name={title} image={image} size={size} />
  <div className="min-w-0">
    <p className="truncate font-medium">{title}</p>
    {description && (
      <p className="truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
    )}
  </div>
</div>
```

**Forma 2 — inline.** Avatar, título e descrição na mesma linha, **sem `truncate`**: é ela que
carrega o `AppButton` do `TurmaDetailPage`, e truncar cortaria o botão.

```tsx
<span className="flex items-center gap-2">
  <AppAvatar name={title} image={image} size={size} />
  <span className="font-medium" style={{ color: 'var(--text-color)' }}>{title}</span>
  {description && <span style={{ color: 'var(--text-color-secondary)' }}>{description}</span>}
</span>
```

A forma 2 usa `<span>` porque seus dois consumidores a entregam dentro do `subtitle` do
`DetailHeader` — §5 trata o container. `--text-color` explícito no título porque o `subtitle` do
`DetailHeader` já pinta tudo de `--text-color-secondary`: sem isso o título inline sumiria na cor da
descrição.

### 2.3 Três consequências que a API resolve de graça

- **`description` ausente é a guarda que o `EnrollmentTable` precisa** quando `email` é `null` (D8).
  Sem rótulo de ausência, portanto **sem chave de i18n nova**, portanto sem a colisão condicional com
  o BD-6 nas três locales.
- **`font-mono` sai do padrão.** O RUT do `RedatorCard` é o único mono da superfície; o repositório
  já escreve RUT em `text-xs` sem mono no `HistorialTable`. O padrão unifica em `text-xs`; quem
  quiser mono passa `description={<span className="font-mono">{rut}</span>}`. O `ReactNode` já está
  lá pelo `TurmaDetailPage`.
- **Tag nunca entra na descrição.** Em `RedatorDesignation:76` e `RedatorCard:45` o `AppTag` está
  hoje dentro do slot de descrição. Ele sai e vira **irmão** da célula nos dois. Regra explícita:
  a descrição é linha de texto, não área de composição.

### 2.4 O que o componente NÃO faz

Não busca dado, não formata RUT, não decide "—" para ausência (quem chama decide), não altera
`AppAvatar` (o fallback duplo foto→iniciais já é dele), não recebe `className` de layout externo
nesta versão — se um sítio precisar, o plano abre a prop com justificativa medida.

---

## 3. O alargamento do backend (D2, D3)

O Grupo C tinha dois sítios genuinamente sem descrição: as colunas **Cliente** e **Redator** do
`TurmasTable`. A alternativa barata era aceitar célula sem descrição; a escolhida foi **alargar os
DTOs, completo — descrição e foto**.

**O custo medido derrubou a objeção que eu mesmo levantei.**
`TurmaQueryBuilder.php:26` já declara:

```php
public const LISTING = ['redatores.user', 'course', 'quote.budget.client.user', 'documentacaoObrigatoria'];
```

Os dois `user` necessários **já estão eager loaded**. Logo: **zero query nova, zero eager load novo,
zero N+1.** O `SignedUrlTransformer` assina localmente via `temporaryUrl()` (HMAC, sem round-trip) e
`TransformedDataResolver:102` curto-circuita `null` antes do transformer — foto ausente não custa
nada. Não há migration: os dados já existem em `users.rut` e `users.photo_path`.

**`TurmaData`** — dois campos, seguindo o padrão de `client_name` para o RUT e o de
`ClientData::$photo_url` para a foto:

```php
public string|null|Optional $client_rut = new Optional,
#[Computed]
#[WithTransformer(SignedUrlTransformer::class, 60)]
public ?string $client_photo_url = null,
```

`fromModel` lê `$turma->contratante()->rut` — o valor **já vem no objeto e hoje é descartado**,
porque `ContratanteData` carrega `name` e `rut` e a linha 80 usa só o `name` — e
`$turma->contratanteClient()->user->photo_path`.

**`TurmaRedatorData`** — a projeção deixa de ser mínima:

```php
public function __construct(
    public int $id,
    public string $name,
    public ?string $email = null,
    #[Computed]
    #[WithTransformer(SignedUrlTransformer::class, 60)]
    public ?string $photo_url = null,
) {}
```

`fromModel` já navega `$redator->user?->name`; `email` e `photo_path` saem do mesmo objeto.

**Depois:** `docker compose exec -T app php artisan typescript:transform`. `generated.ts` é
**saída**, nunca se edita à mão (lei §5.3 / ADR-04). Pint roda no host, de `backend/`, com os
arquivos explícitos.

**Uma incerteza declarada, com verificação obrigatória no plano.** `redatores` é `array|Optional`
com docblock `@var TurmaRedatorData[]`, **sem `#[DataCollectionOf]`**. Não está provado que o
`WithTransformer` de nível de propriedade dispare dentro de um array simples de `Data` aninhado. O
plano deve provar por teste que `redatores[0].photo_url` volta **URL assinada**, não `photo_path`
cru. Se não disparar, o campo passa a ser resolvido no `fromModel` e o transformer sai — decisão do
plano, não desta spec.

---

## 4. Os 14 sítios

### Grupo A — troca literal (4)

| Sítio | Título | Descrição | Foto |
|---|---|---|---|
| `ClientsTable.tsx:53-67` | `legal_name` | `email` | `photo_url` |
| `StudentsTable.tsx:36-49` | `name` | `email` | `photo_url` |
| `RedatoresTable.tsx:37-50` | `name` | `email` | `photo_url` |
| `UsersTable.tsx:37-50` | `name` | `email` | `photo_url` |

O `ClientsTable` é o único que **muda de aparência**: perde `font-semibold`, `text-sm` e o
`text-gray-400`, ganhando a grafia vencedora (D1). Mudança aceita e declarada.

### Grupo B — o dado existe, não chega (2 casos, 3 sítios de render)

**`BudgetsTable.tsx:88`** — hoje `clients.clientName(b.client_id)`, string crua, enquanto a query já
traz o `ClientData` inteiro. `useCommercialClients` ganha um lookup do cliente completo,
**aditivamente** — `clientName` e `clientOptions` permanecem, porque o diálogo depende deles.

**`RedatorDesignation`** — dois sítios do mesmo arquivo, hoje assimétricos e ambos **sem foto**
(`:38` e `:73` chamam `<AppAvatar name={r.name} />` sem `image`). Ficam **idênticos** (D9): foto +
e-mail nos dois. O picker já tem `RedatorData` completo; o card passa a ter o necessário via §3. O
`AppTag` "idóneo" da linha 76 sai da célula e vira irmão dela.

### Grupo C — depende de §3 ou de decisão de auditoria (5)

| Sítio | Decisão | Descrição | Foto |
|---|---|---|---|
| `TurmasTable.tsx:73` (Cliente) | D3 | `client_rut` | `client_photo_url` |
| `TurmasTable.tsx:83-90` (Redator) | D6 | `email` do primeiro | `photo_url` do primeiro |
| `EnrollmentTable.tsx:63-71` | D8 | `email`, **sem linha quando `null`** | iniciais (DTO não tem foto) |
| `HistorialTable.tsx:51-59` | D4 | `snapshot.aluno.rut ?? '—'` | `aluno_photo_url` (foto viva — D4 revertida em 2026-08-14, ver nota) |
| `EmissionStudentsTable.tsx:42-43` | D5 | `student_rut` | iniciais (DTO não tem foto) |

**D4 é decisão de auditoria, escrita e não default.** `SnapshotPartyData` é o retrato congelado no
momento da emissão de um documento com peso legal. Ilustrá-lo com a foto **viva** do aluno misturaria
dado congelado com dado mutável num certificado. Não se faz. A célula usa as iniciais derivadas do
nome congelado, e a descrição é o RUT do snapshot.

> **D4 revertida pelo João em 2026-08-14, durante a execução (correção de rumo).** A listagem passa
> a mostrar a foto **viva** do aluno (`CertificateData.aluno_photo_url`, `#[Computed]` fora do
> snapshot), com nome e RUT ainda vindos do snapshot. A fronteira mudou de lugar, não sumiu: o que
> é apresentado como **documento** — o PDF e a rota pública do QR (`PublicCertificateData`) —
> continua só-snapshot. A tabela do histórico é tela de trabalho interna, e ali a foto é identidade
> visual de linha, não conteúdo do certificado. O texto acima fica como registro da decisão
> original; o vigente é este parágrafo.

**D6 — coluna Redator, N redatores.** A célula fica com o **primeiro** redator; os demais viram um
contador `+N` ao lado. Isso mantém **altura de linha constante** na tabela, que é o que empilhar N
células destruiria. O `+N` é numeral puro — **sem chave de i18n nova** —, e os nomes restantes vão no
`title` do elemento (dado, não copy). O ramo vazio segue com `t('operation.table.noRedator')`.

**D5 — fusão de colunas.** Nome e RUT viram uma coluna só. Medição que corrige a premissa do
backlog: **nenhuma das duas colunas é `sortable` hoje** (`field` sem `sortable` nas linhas 42-43), e
`AppDataTable` não recebe `sortField`. Logo a fusão **não custa ordenação** — custa a chave
`certificate.colRut`, que fica órfã e é removida das três locales (linha 570 de `pt-BR.json`,
`es-CL.json` e `en.json`).

### Forma 2 — inline (2)

- **`BudgetDetailPage.tsx:62-70`** — `d.client` é `ClientData` completo: `legal_name` como título,
  `RUT {rut}` como descrição, `photo_url` como imagem. Ganha foto onde hoje há só texto.
- **`TurmaDetailPage.tsx:77-99`** — título `client_name`, descrição = o `AppButton` de link para o
  orçamento (já é `ReactNode` hoje), imagem `client_photo_url` de §3. O `<div className="flex
  flex-row items-center gap-2">` atual é substituído pela célula.

### Extra (1)

**`RedatorCard.tsx:39-50`** — entra (D10). Título `name`, descrição `rut` (mono via `ReactNode`),
imagem `photo_url`. O `AppTag` de idoneidade sai da célula e vira irmão dentro do
`AppSelectableCard` — cujo `content` já é `flex items-center gap-3`, então o filho passa a ser
`<IdentityCell>` + `<AppTag>` em vez de `<AppAvatar>` + `<div>`. Verificar na revisão visual que a
tag ao lado (e não abaixo) não quebra o card estreito; se quebrar, o wrapper do card resolve — não o
componente.

---

## 5. `DetailHeader`: `<p>` vira `<div>` (D7)

`DetailHeader.tsx:78` embrulha o `subtitle` em `<p>`. O `Avatar` do PrimeReact renderiza **sempre um
`<div>`** (`avatar.cjs.js:254`). `<div>` dentro de `<p>` é HTML inválido e o parser fecha o `<p>`
antes — o React não avisa, o DOM se reorganiza sozinho.

**Isto já é inválido hoje**, antes deste bloco: o `TurmaDetailPage` passa um `<div className="flex
flex-row...">` como subtitle. O bloco não cria o defeito, herda-o — e o corrige.

A linha 78 passa a ser `<div>` com **as mesmas classes** (`mt-1 text-sm`) e o mesmo `style`. Raio de
alcance medido: 3 consumidores de produção (`TurmaCreatePage`, `TurmaDetailPage`,
`BudgetDetailPage`), dos quais **exatamente 2** passam `subtitle`. `DetailHeader.test.tsx` existe e
cobre o componente.

---

## 6. Mecanismo de guarda permanente

O bloco não pode terminar deixando apenas "ficou bonito". A guarda durável é a **catraca de cor
encolhendo**: `src/features/commercial/components/Client/ClientsTable.tsx` sai da `CATRACA_COR`,
que vai de **5 para 4** entradas.

A catraca é lista que **só encolhe** — precedente D9 do `login-fora-do-adr16`, que a levou de 7 para
5. `text-gray-400:63` é o único hardcode de cor do arquivo, e some junto com a grafia divergente.

**Prova nos dois sentidos** (lição 10 do `docs/README.md`): sem a linha na lista, `pnpm lint` fica
verde; reintroduzindo `text-gray-400` no arquivo, o lint **reprova nomeando arquivo e linha**. As
duas direções entram no DoD.

---

## 7. Testes e Definition of Done

**`IdentityCell.test.tsx` nasce com o componente.** Isto é viável e medido: `DetailHeader.test.tsx`,
`BudgetDetailPage.test.tsx` e `TurmaDetailPage.test.tsx` já renderizam PrimeReact em jsdom e passam
— ao contrário do que `frontend-fsliced.md` sugere. Casos:

1. forma 1 renderiza título e descrição empilhados;
2. forma 2 (`inline`) renderiza os três na mesma linha;
3. **`description` ausente não renderiza a segunda linha** (é a guarda de D8);
4. sem `image`, o avatar cai nas iniciais derivadas de `title`;
5. `description` como `ReactNode` renderiza o nó (não `[object Object]`).

**Backend.** Teste de listagem de turmas assere os quatro campos novos na resposta e prova que
`redatores[0].photo_url` é URL assinada (§3), não `photo_path`.

### 7.1 Fotos de demonstração — sem elas o DoD visual não prova nada

**Decisão do João em 2026-08-14, e ela é pré-requisito de prova, não enfeite.** Hoje o banco de dev
não tem nenhuma foto: todo sítio cai nas iniciais do `AppAvatar`. A revisão visual dos 14 sítios
provaria apenas o ramo do fallback — o caminho `photo_url` → `SignedUrlTransformer` → `<img>`
ficaria sem prova nenhuma, justamente o que §3 acrescenta.

**Fonte:** `randomuser.me`, cujos retratos são de **pessoas reais** e licenciados pelo serviço para
uso como placeholder. Não se raspa rosto avulso da web: neste produto o registro de aluno vira
certificado com peso legal, e foto de pessoa real identificável em cadastro fictício é problema de
privacidade, não detalhe estético. As URLs são determinísticas
(`https://randomuser.me/api/portraits/{men,women}/{0-99}.jpg`), então o seed não depende da API,
não sorteia e repete o mesmo resultado a cada execução.

**Forma:** `DemoPhotosSeeder` em `backend/database/seeders/`, **não encadeado no
`DatabaseSeeder::run()`** — roda só por `db:seed --class=DemoPhotosSeeder`. Três razões:

1. a suíte usa sqlite `:memory:` sem MinIO e sem rede; um seeder de fotos no encadeamento
   quebraria `php artisan test`;
2. escreve pelo **`UserPhotoService::store()`**, nunca em `photo_path` direto — é ele que carrega a
   ordem de gravação, a guarda do `store() === false`, a transação da auditoria e a compensação;
3. **idempotente**: usuário que já tem `photo_path` é pulado, então re-rodar não empilha objeto
   órfão no bucket.

Alcance: alguns redatores e alguns alunos — o suficiente para que a revisão visual veja, lado a
lado na mesma tabela, **a linha com foto e a linha sem foto**. Cobertura total esconderia a
regressão do fallback. Falha de rede não derruba o seed: registra e segue.

### 7.2 A fronteira que a divisão de executor não pode cruzar

Codex aplica `backend/**`; Claude aplica `frontend/**`. `generated.ts` é **saída de build**, e a
regeneração fica com Claude, depois do backend pronto:

```bash
docker compose exec -T app php artisan typescript:transform
```

`frontend/src/shared/types/generated.ts` **não entra** nos `paths_autorizados` do Codex. A lei §5.3
proíbe editá-lo à mão, e a forma mais barata de garantir isso é o executor do backend não ter o
arquivo no seu alcance de escrita.

**DoD do bloco** — cada item prova comportamento, nenhum é "pacote instalado":

- [ ] `docker compose exec -T app php artisan test` verde, incluindo os asserts novos;
- [ ] `typescript:transform` executado; `generated.ts` regenerado, **não editado**;
- [ ] `pnpm build`, `pnpm lint`, `pnpm test` verdes;
- [ ] catraca provada nos dois sentidos (§6);
- [ ] `grep -rn "text-gray-" frontend/src` devolve **zero**;
- [ ] nenhum `AppAvatar` remanescente em sítio de identidade fora de `shared/ui` — grep prova;
- [ ] **`db:seed --class=DemoPhotosSeeder` rodado** (§7.1) e provado: alguns redatores e alguns
      alunos com foto, outros sem, na mesma tabela; re-rodar não duplica objeto no bucket;
- [ ] **revisão visual do João** nos 14 sítios, **com o banco já semeado** — é ela que prova o ramo
      com foto e o ramo sem foto lado a lado. `/lotus-ui-review` tem `disable-model-invocation:
      true`: é passo dele na sessão interativa, planejado agora e não descoberto no gate.

---

## 8. Riscos e sobreposição, declarados antes

| Risco | Estado |
|---|---|
| **Review ALTO** — o bloco regenera `generated.ts`; o gatilho do projeto é binário (precedente BD-9) | aceito |
| BD-6 (`feat/falha-vs-lista-vazia`) toca `useCommercialClients.ts` | **aditivo dos dois lados**: BD-6 acrescenta `isError`/`errorDetail`/`showEmptyHint`/`unusable` e não remove `clientName`; este bloco acrescenta o lookup do cliente |
| BD-6 toca `shared/ui/index.ts` | aditivo dos dois lados (duas linhas de `export *` novas) |
| BD-6 pode tocar as 3 locales | este bloco **remove** `certificate.colRut`; deleção vs. inserção, mergeável |
| Sem aceite visual por equivalência (§1.3) | mitigado por teste de componente + revisão do João |
| `WithTransformer` em array aninhado sem `#[DataCollectionOf]` | **não presumido** — o plano prova por teste (§3) |
| Stack `:8080` servido por esta worktree | portas fixas, um stack por vez; BD-6 é frontend e consome o mesmo backend. P-03 **não dispara**: seu gatilho exige mais de um `active_work_item` de backend, e o diff do BD-6 tem zero arquivo em `backend/` |

---

## 9. Fora de escopo

Redesenho de tabelas; mudança de colunas além da fusão de D5; alteração não aditiva de `AppAvatar`;
`UserMenu` (§1.2); busca de `RedatorData` por id no card da designação (§3 resolve pelo DTO, sem
lookup); qualquer regra de domínio dentro do componente.

---

## 10. Decisões registradas

| # | Decisão |
|---|---|
| D1 | Grafia vencedora: a dos três de identity — `font-medium` no título, `text-xs` + `--text-color-secondary` na descrição, `gap-3`, avatar `size="large"` |
| D2 | Grupo C resolve-se **alargando os DTOs no backend**, não aceitando descrição ausente |
| D3 | Alargamento **completo**: descrição **e** foto — `TurmaData.client_rut` + `client_photo_url`, `TurmaRedatorData.email` + `photo_url` |
| D4 | `HistorialTable`: descrição = RUT do snapshot; **foto viva** do aluno (revertida em 2026-08-14 — só PDF e rota pública do QR seguem só-snapshot) |
| D5 | `EmissionStudentsTable`: nome e RUT fundem numa coluna; nenhuma ordenação é perdida (nenhuma existia); `certificate.colRut` sai das 3 locales |
| D6 | `TurmasTable`/Redator: primeiro redator + contador `+N`, altura de linha constante |
| D7 | `DetailHeader`: `<p>` do subtítulo vira `<div>`, mesmas classes |
| D8 | `EnrollmentTable`: descrição = `email`, **sem segunda linha** quando `null`; sem rótulo de ausência, sem chave nova |
| D9 | `RedatorDesignation`: picker e card **idênticos** (foto + e-mail); `AppTag` fora da célula |
| D10 | `RedatorCard` **entra**; `UserMenu` **fica fora**, por três razões medidas |
| D11 | Um componente com prop `inline`, não dois componentes nem variante por string |
| D12 | Execução **dividida**: `codex` em `backend/**`, `claude` em `frontend/**`; `generated.ts` fica fora dos `paths_autorizados` do Codex (§7.2) |
| D13 | `DemoPhotosSeeder` opt-in semeia fotos de `randomuser.me` via `UserPhotoService::store()`, em **parte** dos redatores e alunos, para que a revisão visual prove os dois ramos (§7.1) |
