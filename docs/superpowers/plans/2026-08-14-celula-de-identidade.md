# Célula de identidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** substituir as duas grafias copiadas de avatar + título + descrição por um componente
único em `shared/ui`, aplicado a 14 sítios, com o backend alargado para que os sítios que hoje não
têm descrição passem a ter.

**Architecture:** `IdentityCell` é apresentacional puro em `shared/ui` — recebe `title`,
`description` (`ReactNode`), `image` e a prop `inline` que escolhe entre a forma empilhada (padrão) e
a forma em linha. Dois DTOs do backend ganham quatro campos (`TurmaData.client_rut` /
`client_photo_url`, `TurmaRedatorData.email` / `photo_url`) sem query nova, porque
`TurmaQueryBuilder::LISTING` já carrega os dois `user` necessários. `generated.ts` é regenerado, nunca
editado.

**Tech Stack:** Laravel 13 / PHP 8.3 · spatie/laravel-data + typescript-transformer · React 19 + TS ·
PrimeReact via `shared/ui` · Tailwind v4 · Vitest + Testing Library (jsdom) · PHPUnit (sqlite
`:memory:`) · MinIO/S3.

**Spec:** `docs/superpowers/specs/2026-08-14-celula-de-identidade-design.md` (D1–D13).

## Global Constraints

- **Lei §5.3 / ADR-04:** `frontend/src/shared/types/generated.ts` é **saída**. Nunca editar à mão —
  corrigir o DTO e rodar `docker compose exec -T app php artisan typescript:transform`.
- **Lei §5.6 / ADR-05:** feature não importa `primereact` direto (só via `shared/ui`) nem outra
  feature — nem para tipo. `IdentityCell` vive em `shared/ui` e por isso PODE importar de
  `../AppAvatar`.
- **Backend roda no container:** `docker compose exec -T app php artisan test`. O host WSL não tem
  mbstring.
- **Pint roda no host, de dentro de `backend/`, SEMPRE com argumentos:**
  `cd backend && ./vendor/bin/pint <arquivos>` — nunca sem argumento.
- **Frontend roda nativo, de dentro de `frontend/`:** `pnpm build` (`tsc -b && vite build`),
  `pnpm lint`, `pnpm test` (vitest run).
- **Um stack por vez.** `docker compose up -d` desta worktree serve o backend **desta** branch em
  `:8080`. Se um stack subir do main tree, os testes deste bloco mentem.
- **Grafia vencedora (D1), literal:** título `font-medium`; descrição `text-xs` com
  `style={{ color: 'var(--text-color-secondary)' }}`; `gap-3`; avatar `size="large"`.
- **Cor sempre por token do tema.** Nenhuma utility de cor fixa (`text-gray-*`, `bg-slate-*`).
- **`CATRACA_COR` só ENCOLHE** (`frontend/eslint.config.js`). Nunca acrescentar arquivo à lista.
- **Sem chave de i18n nova.** O bloco só **remove** uma (`certificate.colRut`).
- **Commits frequentes**, um por task, com o corpo explicando a decisão — não o diff.

---

## Estrutura de arquivos

**Criar:**
- `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx` — o componente, as duas formas
- `frontend/src/shared/ui/IdentityCell/index.ts` — re-export da pasta
- `frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx` — 5 casos
- `backend/database/seeders/DemoPhotosSeeder.php` — fotos de demonstração, opt-in

**Modificar (backend):**
- `backend/app/Domains/Operation/Data/TurmaData.php` — +2 campos, +2 linhas no `fromModel`
- `backend/app/Domains/Operation/Data/TurmaRedatorData.php` — +2 campos, +2 linhas no `fromModel`
- `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php` — asserts dos campos novos
- `backend/tests/Feature/Operation/TurmaShowTest.php` — assert da URL assinada no HTTP

**Modificar (frontend):**
- `frontend/src/shared/types/generated.ts` — **regenerado**, nunca editado
- `frontend/src/shared/ui/index.ts` — +1 `export *`
- `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx:78` — `<p>` vira `<div>`
- `frontend/eslint.config.js` — `CATRACA_COR` 5 → 4
- 11 arquivos de sítio (Tasks 5–10)
- `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` — remove `certificate.colRut`

---

### Task 1: `TurmaData` ganha RUT e foto do cliente

**Executor:** `codex`

**Files:**
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php:38-44` e `:66-85`
- Test: `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php:44-49`

**Interfaces:**
- Consumes: `Turma::query()->withListingData()`, que já carrega `quote.budget.client.user`
  (`TurmaQueryBuilder::LISTING`). Nenhum eager load novo.
- Produces: `TurmaData::$client_rut` (`?string`) e `TurmaData::$client_photo_url` (`?string`,
  assinado na serialização). A Task 3 os regenera em TS; as Tasks 9 e 10 os consomem.

- [ ] **Step 1: Escrever os asserts que falham**

Em `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php`, acrescentar ao final do
`test_from_model_projeta_curso_cliente_codigos_e_contagem`, logo depois da linha
`$this->assertSame("Scap {$budget->id} - Cot 1", $data->quote_code);`:

```php
        // O RUT já vinha no ContratanteData e era descartado: a projeção usava
        // só o ->name. Sem descrição, a coluna Cliente do TurmasTable não tem
        // o que pôr na segunda linha da célula (spec D3).
        $this->assertSame('55.666.777-2', $data->client_rut);
        // Sem foto no cadastro, o campo é null e o transformer nem roda
        // (TransformedDataResolver:102 curto-circuita antes).
        $this->assertNull($data->client_photo_url);
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=TurmaDataEnrichmentTest
```

Esperado: FAIL com `Undefined property: App\Domains\Operation\Data\TurmaData::$client_rut`.

- [ ] **Step 3: Acrescentar os dois campos ao construtor**

Em `backend/app/Domains/Operation/Data/TurmaData.php`, trocar a linha
`public int|null|Optional $budget_id = new Optional,` por:

```php
        public int|null|Optional $budget_id = new Optional,
        /** RUT do contratante. Mesmo `ContratanteData` de onde sai o
         * `client_name` — o valor já vinha e era descartado. */
        public string|null|Optional $client_rut = new Optional,
        /** Foto do usuário do cliente. `#[Computed]` porque nunca entra por
         * payload, e o transformer assina na saída como em ClientData. */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $client_photo_url = null,
```

E acrescentar aos `use` do topo do arquivo, em ordem alfabética junto dos existentes:

```php
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
```

- [ ] **Step 4: Preencher no `fromModel`**

No mesmo arquivo, trocar a linha `client_name: $turma->contratante()->name,` por:

```php
            client_name: $turma->contratante()->name,
```

e trocar `budget_id: $turma->quote->budget->id,` por:

```php
            budget_id: $turma->quote->budget->id,
            client_rut: $turma->contratante()->rut,
            client_photo_url: $turma->contratanteClient()->user->photo_path,
```

- [ ] **Step 5: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=TurmaDataEnrichmentTest
```

Esperado: PASS.

- [ ] **Step 6: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS. Se algum teste de listagem falhar por lazy loading, o `LISTING` já cobre
`quote.budget.client.user` — investigar a rota que montou a `TurmaData` sem `withListingData()`
antes de acrescentar eager load.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/TurmaData.php tests/Feature/Operation/TurmaDataEnrichmentTest.php
cd .. && git add backend/app/Domains/Operation/Data/TurmaData.php backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php
git commit -m "feat(operation): projeta RUT e foto do cliente na TurmaData

O ContratanteData ja carregava o rut e a projecao usava so o ->name. Sem
descricao, a coluna Cliente do TurmasTable nao tem segunda linha na celula
de identidade (spec D3). Zero query nova: TurmaQueryBuilder::LISTING ja
carrega quote.budget.client.user."
```

---

### Task 2: `TurmaRedatorData` deixa de ser projeção mínima

**Executor:** `codex`

**Files:**
- Modify: `backend/app/Domains/Operation/Data/TurmaRedatorData.php` (arquivo inteiro, 22 linhas)
- Test: `backend/tests/Feature/Operation/TurmaShowTest.php`

**Interfaces:**
- Consumes: `redatores.user`, já em `TurmaQueryBuilder::LISTING`.
- Produces: `TurmaRedatorData::$email` (`?string`) e `TurmaRedatorData::$photo_url` (`?string`,
  assinado). Consumidos pelas Tasks 8 e 9.

> **A incerteza desta task é real e o teste existe para resolvê-la.** `TurmaData::$redatores` é
> `array|Optional` com docblock `@var TurmaRedatorData[]`, **sem `#[DataCollectionOf]`**. Não está
> provado que um `WithTransformer` de propriedade dispare dentro desse array aninhado. O Step 2
> mede. Se o valor voltar como path cru (`user-photos/...`) em vez de URL (`http...`), aplicar o
> Step 6 alternativo.

- [ ] **Step 1: Escrever o teste que falha**

Em `backend/tests/Feature/Operation/TurmaShowTest.php`, acrescentar um método novo depois de
`test_show_projeta_turma_enriquecida`:

```php
    /**
     * O que se prova aqui é a serialização do redator DESIGNADO, não a
     * designação: `redatores` é um array simples de Data (sem
     * `#[DataCollectionOf]`), e o `WithTransformer` de `photo_url` precisa
     * atravessar esse aninhamento. Se não atravessar, o campo volta com o
     * path cru do bucket em vez da URL assinada (spec §3).
     */
    public function test_show_projeta_email_e_foto_assinada_do_redator(): void
    {
        Storage::fake('s3');

        $clientId = $this->makeClientWithUser([], ['rut' => '11.222.333-4'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 3']);
        $courseId = $this->makeCourse()->id;
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $courseId,
            'modalidade' => 'online', 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10', 'status' => 'em_andamento',
        ]);
        $redatorUser = User::factory()->redator()->create([
            'email' => 'ana.silva@lotus.cl',
            'photo_path' => 'user-photos/9/foto.jpg',
        ]);
        $redator = Redator::create(['user_id' => $redatorUser->id]);
        $turma->redatores()->attach($redator->id);

        $res = $this->actingAs($this->actingViewer())
            ->getJson("/api/turmas/{$turma->id}");

        $res->assertOk()
            ->assertJsonPath('redatores.0.email', 'ana.silva@lotus.cl');

        // URL assinada, não o path cru: é o que o <img> do frontend consome.
        $this->assertStringStartsWith('http', $res->json('redatores.0.photo_url'));
    }
```

E acrescentar aos `use` do topo do arquivo:

```php
use App\Domains\Identity\Models\Redator;
use Illuminate\Support\Facades\Storage;
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec -T app php artisan test --filter=test_show_projeta_email_e_foto_assinada_do_redator
```

Esperado: FAIL — `redatores.0.email` não existe na resposta.

- [ ] **Step 3: Alargar o DTO**

Substituir o conteúdo de `backend/app/Domains/Operation/Data/TurmaRedatorData.php` por:

```php
<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção do redator designado, read-only na TurmaData. Deixou de ser
 * `id + nome` em 2026-08-14: o card da designação e a coluna Redator do
 * TurmasTable renderizam célula de identidade, que pede descrição e foto
 * (spec D3/D9). O `user` já é navegado aqui e já vem eager loaded por
 * `TurmaQueryBuilder::LISTING` — os dois campos custam zero query.
 */
#[TypeScript]
class TurmaRedatorData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $email = null,
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(
            id: $redator->id,
            name: $redator->user?->name ?? '',
            email: $redator->user?->email,
            photo_url: $redator->user?->photo_path,
        );
    }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec -T app php artisan test --filter=test_show_projeta_email_e_foto_assinada_do_redator
```

Esperado: PASS.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS.

- [ ] **Step 6 (SÓ se o Step 4 falhar no `assertStringStartsWith('http', ...)`)**

O transformer não atravessou o array aninhado. Trocar a propriedade para resolver na construção,
removendo os dois atributos e assinando no `fromModel`:

```php
        public ?string $photo_url = null,
```

```php
            photo_url: $redator->user?->photo_path === null
                ? null
                : Storage::disk(UploadFileAction::publicDiskFor(config('filesystems.default')))
                    ->temporaryUrl($redator->user->photo_path, now()->addMinutes(60)),
```

com `use App\Shared\Files\Actions\UploadFileAction;` e `use Illuminate\Support\Facades\Storage;`.
Rodar o Step 4 de novo e registrar no commit que o transformer não atravessa array sem
`#[DataCollectionOf]` — é achado durável, não detalhe.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Operation/Data/TurmaRedatorData.php tests/Feature/Operation/TurmaShowTest.php
cd .. && git add backend/app/Domains/Operation/Data/TurmaRedatorData.php backend/tests/Feature/Operation/TurmaShowTest.php
git commit -m "feat(operation): projeta email e foto do redator designado

TurmaRedatorData era id+nome, e o card da designacao ficava com dado
assimetrico em relacao ao picker, que ja tem o RedatorData inteiro (spec
D9). O user ja era navegado no fromModel e ja vem eager loaded por
TurmaQueryBuilder::LISTING.

O teste prova a URL assinada, nao so o campo: redatores e array simples de
Data sem #[DataCollectionOf], e nao era dado que o WithTransformer de
propriedade atravessasse esse aninhamento."
```

---

### Task 3: Regenerar `generated.ts`

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/shared/types/generated.ts` — **por comando, nunca à mão**

**Interfaces:**
- Consumes: os DTOs das Tasks 1 e 2.
- Produces: `TurmaData.client_rut`, `TurmaData.client_photo_url`, `TurmaRedatorData.email`,
  `TurmaRedatorData.photo_url` no TS. Todo o frontend a partir da Task 5 depende disto.

- [ ] **Step 1: Garantir o stack de pé**

```bash
docker compose up -d && docker compose ps
```

Esperado: `app`, `nginx`, `mysql`, `minio` em `running`. Se um stack do main tree estiver de pé,
derrubá-lo primeiro — o `:8080` e o volume são compartilhados.

- [ ] **Step 2: Regenerar**

```bash
docker compose exec -T app php artisan typescript:transform
```

Esperado: `Transformed N types`.

- [ ] **Step 3: Provar que os quatro campos entraram**

```bash
cd frontend && grep -n "client_rut\|client_photo_url" src/shared/types/generated.ts
grep -n -A6 "export type TurmaRedatorData" src/shared/types/generated.ts
```

Esperado: `client_rut: string | null`, `client_photo_url: string | null` dentro de `TurmaData`; e
`email: string | null`, `photo_url: string | null` dentro de `TurmaRedatorData`.

- [ ] **Step 4: Provar que o build ainda compila**

```bash
cd frontend && pnpm build
```

Esperado: exit 0. Campos acrescentados são aditivos — nada quebra.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/types/generated.ts
git commit -m "chore(types): regenera generated.ts com os quatro campos novos

Saida de typescript:transform (ADR-04, lei 5.3). Arquivo nao editado a
mao - o diff sai inteiro do comando."
```

---

### Task 4: O componente `IdentityCell`

**Executor:** `claude`

**Files:**
- Create: `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx`
- Create: `frontend/src/shared/ui/IdentityCell/index.ts`
- Create: `frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx`
- Modify: `frontend/src/shared/ui/index.ts` (uma linha, em ordem alfabética)

**Interfaces:**
- Consumes: `AppAvatar` e o tipo `AppAvatarProps` de `../AppAvatar`.
- Produces: `IdentityCell` e `IdentityCellProps`, com a assinatura exata:
  `{ title: string; description?: ReactNode; image?: string | null; inline?: boolean; size?: AppAvatarProps['size'] }`.
  Todas as tasks seguintes consomem daqui.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/shared/ui/IdentityCell/IdentityCell.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IdentityCell } from './IdentityCell'

/**
 * O que se prova aqui é o contrato que os 14 sítios consomem: a estrutura das
 * duas formas, e a AUSÊNCIA de descrição — que é a guarda de que o
 * EnrollmentTable depende quando o e-mail é null (spec D8). Sem ela, a célula
 * abriria uma segunda linha vazia e a altura da linha da tabela oscilaria
 * entre os alunos com e sem e-mail.
 */

afterEach(() => {
  cleanup()
})

describe('IdentityCell', () => {
  it('na forma padrão empilha título e descrição em dois parágrafos', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    const paragrafos = container.querySelectorAll('p')
    expect(paragrafos).toHaveLength(2)
    expect(paragrafos[0].textContent).toBe('Juan Soto')
    expect(paragrafos[1].textContent).toBe('juan@lotus.cl')
  })

  it('sem descrição não abre a segunda linha', () => {
    const { container } = render(<IdentityCell title="Juan Soto" />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(screen.queryByText('juan@lotus.cl')).toBeNull()
  })

  /** `description={null}` é o que o EnrollmentTable passa quando `email` é
   * null — vindo do DTO, não de uma prop omitida. */
  it('com descrição null também não abre a segunda linha', () => {
    const { container } = render(<IdentityCell title="Juan Soto" description={null} />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('na forma inline não usa parágrafo, e mantém título e descrição na mesma linha', () => {
    const { container } = render(
      <IdentityCell title="Enel Chile" description="RUT 76.123.456-7" inline />,
    )

    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(container.textContent).toContain('Enel Chile')
    expect(container.textContent).toContain('RUT 76.123.456-7')
  })

  it('sem imagem cai nas iniciais do título', () => {
    render(<IdentityCell title="Juan Soto" description="juan@lotus.cl" />)

    expect(screen.getByText('JS')).toBeTruthy()
  })

  it('com imagem renderiza o <img> com o título como alt', () => {
    render(<IdentityCell title="Juan Soto" image="https://exemplo.cl/foto.jpg" />)

    const img = screen.getByAltText('Juan Soto') as HTMLImageElement
    expect(img.tagName).toBe('IMG')
    expect(img.src).toBe('https://exemplo.cl/foto.jpg')
  })

  /** O TurmaDetailPage passa um AppButton como descrição; o RedatorCard passa
   * o RUT em mono. Se a prop fosse `string`, os dois voltariam a escrever
   * markup à mão no sítio. */
  it('aceita ReactNode na descrição', () => {
    render(
      <IdentityCell title="Enel Chile" description={<span className="font-mono">76.123.456-7</span>} />,
    )

    const rut = screen.getByText('76.123.456-7')
    expect(rut.tagName).toBe('SPAN')
    expect(rut.className).toContain('font-mono')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test -- IdentityCell
```

Esperado: FAIL com `Failed to resolve import "./IdentityCell"`.

- [ ] **Step 3: Escrever o componente**

Criar `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx`:

```tsx
import type { ReactNode } from 'react'
import { AppAvatar, type AppAvatarProps } from '../AppAvatar'

export interface IdentityCellProps {
  title: string
  /** `ReactNode` e não `string`: o subtítulo do TurmaDetailPage carrega um
   * AppButton, e o RedatorCard quer o RUT em mono. Ausente ou `null` NÃO abre
   * a segunda linha — é a guarda de que o EnrollmentTable depende. */
  description?: ReactNode
  image?: string | null
  /** Avatar, título e descrição na MESMA linha (forma 2). Padrão: empilhado
   * (forma 1). */
  inline?: boolean
  size?: AppAvatarProps['size']
}

/**
 * Avatar + título + descrição, a célula que 14 sítios copiavam a olho em duas
 * grafias diferentes. Apresentacional puro: recebe texto pronto, não conhece
 * DTO, não busca dado e não decide o que fazer com ausência — quem chama
 * decide (spec D1/D11).
 *
 * A forma empilhada trunca; a forma inline NÃO. A inline é a que carrega nó
 * arbitrário (botão, tag), e `truncate` cortaria o nó em vez do texto.
 *
 * `<span>` na forma inline porque seus dois consumidores a entregam dentro do
 * `subtitle` do DetailHeader, e a cor do título é cravada em `--text-color`:
 * o `subtitle` já pinta tudo de `--text-color-secondary`, então sem isso o
 * título sumiria na cor da descrição.
 */
export function IdentityCell({
  title, description, image, inline = false, size = 'large',
}: IdentityCellProps) {
  const avatar = <AppAvatar name={title} image={image} size={size} />

  if (inline)
    return (
      <span className="flex items-center gap-2">
        {avatar}
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{title}</span>
        {description && <span style={{ color: 'var(--text-color-secondary)' }}>{description}</span>}
      </span>
    )

  return (
    <div className="flex items-center gap-3">
      {avatar}
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        {description && (
          <p className="truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>{description}</p>
        )}
      </div>
    </div>
  )
}
```

Criar `frontend/src/shared/ui/IdentityCell/index.ts`:

```ts
export { IdentityCell } from './IdentityCell'
export type { IdentityCellProps } from './IdentityCell'
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test -- IdentityCell
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Exportar pelo barrel raiz**

Em `frontend/src/shared/ui/index.ts`, acrescentar entre `export * from './FormSection'` e
`export * from './LanguageMenu'` (a ordem do arquivo é alfabética):

```ts
export * from './IdentityCell'
```

- [ ] **Step 6: Provar que o barrel resolve**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: exit 0 nos dois.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/IdentityCell frontend/src/shared/ui/index.ts
git commit -m "feat(ui): IdentityCell, a celula de identidade em uma grafia so

Duas grafias do mesmo markup viviam copiadas a olho em 14 sitios. Uma prop
inline escolhe entre empilhada e em linha, em vez de dois componentes: os
dois sitios inline sao subtitulo de DetailHeader e a diferenca e de
layout, nao de responsabilidade (spec D11).

A guarda de descricao ausente e o que permite o EnrollmentTable nao abrir
segunda linha quando o e-mail e null, sem inventar rotulo de ausencia e
portanto sem chave de i18n nova (spec D8)."
```

---

### Task 5: Grupo A — as quatro tabelas, e a catraca encolhe

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx:53-67`
- Modify: `frontend/src/features/identity/components/Student/StudentsTable.tsx:36-49`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx:37-50`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx:37-50`
- Modify: `frontend/eslint.config.js` (`CATRACA_COR`)

**Interfaces:**
- Consumes: `IdentityCell` da Task 4, via `@shared/ui`.
- Produces: nada para tasks seguintes. É a prova de que a troca literal funciona.

- [ ] **Step 1: `ClientsTable` — o único que muda de aparência**

Em `frontend/src/features/commercial/components/Client/ClientsTable.tsx`, substituir o `body` da
coluna `legal_name`:

```tsx
        body={(c: ClientData) => (
          <div className="flex  items-center gap-3">
            <AppAvatar name={c.legal_name} image={c.photo_url} size="large" />
            <div className="flex flex-col ">
              <span className="font-semibold">{c.legal_name}</span>
              <span className="text-sm font-medium text-gray-400">{c.email}</span>
            </div>
          </div>
        )}
```

por:

```tsx
        body={(c: ClientData) => (
          <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
        )}
```

E no bloco de import de `@shared/ui`, trocar `AppAvatar` por `IdentityCell` (o arquivo usa aspas
duplas e ponto e vírgula — preservar):

```tsx
import {
  AppColumn,
  IdentityCell,
  AppTag,
  AppButton,
  AppEmptyState,
  SearchableTableFrame,
} from "@shared/ui";
```

- [ ] **Step 2: As três tabelas de identidade**

Em `StudentsTable.tsx`, substituir o `body` da coluna `name` por:

```tsx
        body={(s: StudentData) => (
          <IdentityCell title={s.name} description={s.email} image={s.photo_url} />
        )}
```

Em `RedatoresTable.tsx`:

```tsx
        body={(r: RedatorData) => (
          <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
        )}
```

Em `UsersTable.tsx`:

```tsx
        body={(u: UserData) => (
          <IdentityCell title={u.name} description={u.email} image={u.photo_url} />
        )}
```

Nos três, trocar `AppAvatar` por `IdentityCell` na linha de import de `@shared/ui`.

- [ ] **Step 3: Provar que a última cor fixa do repositório sumiu**

```bash
cd /home/jvbat/projetos/fix-frontend && grep -rn "text-gray-" frontend/src
```

Esperado: **nenhuma saída** (exit 1). Era a única ocorrência da classe no repositório inteiro.

- [ ] **Step 4: Encolher a catraca**

Em `frontend/eslint.config.js`, remover a linha
`'src/features/commercial/components/Client/ClientsTable.tsx',` de `CATRACA_COR`, deixando a lista
com 4 entradas.

- [ ] **Step 5: Provar a catraca no sentido "verde"**

```bash
cd frontend && pnpm lint
```

Esperado: exit 0. O arquivo saiu da lista e não tem mais cor fixa.

- [ ] **Step 6: Provar a catraca no sentido "reprova"** (lição 10 — teste que nunca viu o bug é
      cobertura fantasma)

Reintroduzir a cor temporariamente em `ClientsTable.tsx`, trocando **só** a linha do `body`:

```tsx
        body={(c: ClientData) => (
          <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
        )}
```

por:

```tsx
        body={(c: ClientData) => (
          <div className="text-gray-400">
            <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
          </div>
        )}
```

```bash
cd frontend && pnpm lint
```

Esperado: **FAIL**, nomeando `ClientsTable.tsx` e a linha.

Desfazer **à mão**, revertendo a mesma troca (remover o `<div className="text-gray-400">` e a tag
de fechamento). **Não usar `git checkout` no arquivo** — ele desfaria o Step 1 junto, porque nada
foi commitado ainda. Rodar `pnpm lint` de novo e confirmar exit 0.

- [ ] **Step 7: Rodar build, lint e testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0 nos três.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/commercial/components/Client/ClientsTable.tsx frontend/src/features/identity frontend/eslint.config.js
git commit -m "refactor(ui): Grupo A usa IdentityCell, e a catraca de cor encolhe 5->4

As tres tabelas de identity eram byte a byte identicas - uma grafia
repetida, nao tres. O ClientsTable era a divergente, e e o unico que muda
de aparencia: perde font-semibold, text-sm e o text-gray-400.

Esse text-gray-400 era a UNICA ocorrencia da classe no repositorio inteiro,
e so sobrevivia porque o arquivo estava na CATRACA_COR. Some com a grafia
divergente, entao o arquivo sai da lista - que so encolhe, precedente D9 do
login-fora-do-adr16 (7->5)."
```

---

### Task 6: `DetailHeader` aceita bloco, e os dois sítios inline

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx:77-79`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx:65-70`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx:80-98`
- Test: `frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx`

**Interfaces:**
- Consumes: `IdentityCell` (Task 4); `TurmaData.client_photo_url` (Tasks 1 e 3).
- Produces: nada para tasks seguintes.

> `<div>` dentro de `<p>` é HTML inválido e o parser fecha o `<p>` antes. O defeito **já existe**:
> o `TurmaDetailPage` passa um `<div className="flex flex-row...">` como `subtitle` hoje. O bloco
> não o cria — corrige.

- [ ] **Step 1: Escrever o teste que falha**

Em `frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx`, acrescentar um `describe` novo ao
final do arquivo:

```tsx
describe('DetailHeader aceita bloco no subtítulo', () => {
  /**
   * O Avatar do PrimeReact renderiza sempre um <div> (avatar.cjs.js:254), e a
   * célula de identidade inline vai dentro do subtítulo. <div> dentro de <p> é
   * inválido: o parser fecha o <p> antes e o DOM se reorganiza em silêncio.
   * O TurmaDetailPage já passava um <div> aqui antes deste bloco.
   */
  it('não embrulha o subtítulo em <p>', () => {
    const { container } = render(
      <DetailHeader title="Turma 7" subtitle={<div data-testid="bloco">Enel</div>} />,
    )

    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('[data-testid="bloco"]')?.parentElement?.tagName).toBe('DIV')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test -- DetailHeader
```

Esperado: FAIL — existe um `<p>`.

- [ ] **Step 3: Trocar o elemento**

Em `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx`, trocar:

```tsx
            {subtitle && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{subtitle}</p>
            )}
```

por:

```tsx
            {/* <div> e não <p>: o subtítulo recebe célula de identidade, cujo
              * avatar é sempre um <div> (avatar.cjs.js:254). <div> dentro de
              * <p> é inválido — o parser fecha o <p> antes e o DOM se
              * reorganiza sozinho. Mesmas classes, mesmo token. */}
            {subtitle && (
              <div className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{subtitle}</div>
            )}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test -- DetailHeader
```

Esperado: PASS.

- [ ] **Step 5: `BudgetDetailPage` — ganha a foto do cliente**

Trocar o `subtitle` do `DetailHeader`:

```tsx
        subtitle={
          <>
            {d.client?.legal_name ?? '—'}
            {d.client?.rut && ` · RUT ${d.client.rut}`}
          </>
        }
```

por:

```tsx
        subtitle={
          <IdentityCell
            inline
            title={d.client?.legal_name ?? '—'}
            description={d.client?.rut ? `RUT ${d.client.rut}` : undefined}
            image={d.client?.photo_url}
            size="normal"
          />
        }
```

e acrescentar `IdentityCell` ao import de `@shared/ui` do arquivo.

- [ ] **Step 6: `TurmaDetailPage` — o subtítulo com botão**

Trocar o `subtitle` inteiro:

```tsx
        subtitle={
          <div className="flex flex-row items-center gap-2">
            {turma.client_name ?? "—"}
            {turma.budget_id != null && (
              <>
                {" · "}
                <AppButton
                  text
                  className="underline hover:no-underline"
                  onClick={() => d.goToBudget(turma.budget_id!)}
                >
                  {t("operation.detail.relatedTo", {
                    budget: turma.budget_code ?? "—",
                    quote: turma.quote_code ?? "—",
                  })}
                </AppButton>
              </>
            )}
          </div>
        }
```

por:

```tsx
        subtitle={
          <IdentityCell
            inline
            title={turma.client_name ?? "—"}
            image={turma.client_photo_url}
            size="normal"
            description={
              turma.budget_id != null && (
                <AppButton
                  text
                  className="underline hover:no-underline"
                  onClick={() => d.goToBudget(turma.budget_id!)}
                >
                  {t("operation.detail.relatedTo", {
                    budget: turma.budget_code ?? "—",
                    quote: turma.quote_code ?? "—",
                  })}
                </AppButton>
              )
            }
          />
        }
```

e acrescentar `IdentityCell` ao import de `@shared/ui`.

- [ ] **Step 7: Build, lint, testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0. Os testes das duas páginas de detalhe cobrem só os ramos sem entidade, então não
mudam.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui/DetailHeader frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx
git commit -m "fix(ui): subtitulo do DetailHeader vira <div>, e recebe a celula inline

O Avatar do PrimeReact renderiza sempre um <div>, e <div> dentro de <p> e
HTML invalido - o parser fecha o <p> antes, em silencio. O defeito ja
existia: o TurmaDetailPage passava um <div> como subtitle. O bloco nao o
cria, corrige. Mesmas classes, mesmo token.

Os dois subtitulos viram forma inline. O BudgetDetailPage ganha a foto do
cliente, que ja vinha no ClientData e nao era usada."
```

---

### Task 7: Grupo B comercial — o hook para de estreitar o cliente

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useCommercialClients.ts:19-21`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:88`

**Interfaces:**
- Consumes: `IdentityCell` (Task 4).
- Produces: `useCommercialClients().client(id): ClientData | null`. Nada mais consome.

> **Ponto de sobreposição declarado com o BD-6** (`feat/falha-vs-lista-vazia`), que reescreveu este
> hook. A mudança é **aditiva dos dois lados**: o BD-6 acrescenta `isError`/`errorDetail`/
> `showEmptyHint`/`unusable` e **não remove** `clientName`; esta task acrescenta `client`. Se o
> arquivo já estiver na forma do BD-6 no momento da execução, acrescentar `client` ao objeto de
> retorno que existir, sem remover nada.

- [ ] **Step 1: Expor o cliente inteiro no hook**

Em `frontend/src/features/commercial/hooks/useCommercialClients.ts`, acrescentar logo depois de
`clientName`:

```ts
    clientName: (id: number) => clients.data?.find((c) => c.id === id)?.legal_name ?? '—',
    /** O ClientData inteiro: a query já o traz, e estreitar para o nome
     * obrigava a tabela a renderizar texto cru onde cabe célula de identidade.
     * `clientName` continua porque o diálogo depende dele. */
    client: (id: number) => clients.data?.find((c) => c.id === id) ?? null,
```

- [ ] **Step 2: `BudgetsTable` renderiza a célula**

Trocar a linha 88:

```tsx
      <AppColumn header={t('budget.client')} body={(b: BudgetData) => clients.clientName(b.client_id)} />
```

por:

```tsx
      <AppColumn
        header={t('budget.client')}
        body={(b: BudgetData) => {
          const c = clients.client(b.client_id)

          return c ? (
            <IdentityCell title={c.legal_name} description={c.email} image={c.photo_url} />
          ) : (
            clients.clientName(b.client_id)
          )
        }}
      />
```

e acrescentar `IdentityCell` ao import de `@shared/ui` do arquivo.

- [ ] **Step 3: Build, lint, testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/hooks/useCommercialClients.ts frontend/src/features/commercial/components/Budget/BudgetsTable.tsx
git commit -m "refactor(commercial): o hook para de estreitar o cliente para o nome

A query ja trazia o ClientData inteiro e o hook expunha so o legal_name, o
que obrigava a coluna Cliente a renderizar texto cru. clientName fica: o
dialogo depende dele, e o fallback da tabela tambem, quando o id nao
resolve."
```

---

### Task 8: Os três sítios de redator ficam simétricos

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx:37-40` e `:72-78`
- Modify: `frontend/src/features/catalog/components/Course/RedatorCard.tsx:39-50`

**Interfaces:**
- Consumes: `IdentityCell` (Task 4); `TurmaRedatorData.email` e `.photo_url` (Tasks 2 e 3).
- Produces: nada para tasks seguintes.

- [ ] **Step 1: O picker ganha foto e e-mail**

Em `RedatorDesignation.tsx`, dentro de `PickerBody`, trocar:

```tsx
          <div className="flex items-center gap-3">
            <AppAvatar name={r.name} />
            <span className="font-medium">{r.name}</span>
          </div>
```

por:

```tsx
          <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
```

- [ ] **Step 2: O card fica idêntico ao picker, e a tag sai da célula**

No mesmo arquivo, trocar:

```tsx
            <div className="flex items-center gap-3">
              <AppAvatar name={r.name} />
              <div>
                <p className="font-medium">{r.name}</p>
                <AppTag value={t('operation.redator.idoneo')} severity="success" />
              </div>
            </div>
```

por:

```tsx
            {/* A tag fica IRMÃ da célula, não dentro da descrição: descrição é
              * linha de texto, e o slot dela agora carrega o e-mail. */}
            <div className="flex items-center gap-3">
              <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
              <AppTag value={t('operation.redator.idoneo')} severity="success" />
            </div>
```

- [ ] **Step 3: Trocar o import**

No mesmo arquivo, trocar `AppAvatar` por `IdentityCell` na linha 3:

```tsx
import { IdentityCell, AppButton, AppTag, AppDialog, AppErrorState } from '@shared/ui'
```

- [ ] **Step 4: `RedatorCard`**

Em `frontend/src/features/catalog/components/Course/RedatorCard.tsx`, trocar:

```tsx
      <AppAvatar name={redator.name} image={redator.photo_url} size="large" />
      <div className="min-w-0">
        <p className="truncate font-medium">{redator.name}</p>
        <p className="truncate font-mono text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {redator.rut}
        </p>
        <AppTag
          className="mt-1"
          value={t(`suitability.${status}`)}
          severity={IDONEIDADE_SEVERITY[status]}
        />
      </div>
```

por:

```tsx
      <IdentityCell
        title={redator.name}
        description={<span className="font-mono">{redator.rut}</span>}
        image={redator.photo_url}
      />
      <AppTag value={t(`suitability.${status}`)} severity={IDONEIDADE_SEVERITY[status]} />
```

e na linha 2:

```tsx
import { IdentityCell, AppButton, AppSelectableCard, AppTag } from '@shared/ui'
```

> O `min-w-0`/`truncate` que estava aqui virou comportamento padrão do componente. O `mt-1` da tag
> sai porque ela deixa de ser a terceira linha empilhada: o `content` do `AppSelectableCard` já é
> `flex items-center gap-3`, então a tag fica ao lado.

- [ ] **Step 5: Build, lint, testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/operation/components/Turma/RedatorDesignation.tsx frontend/src/features/catalog/components/Course/RedatorCard.tsx
git commit -m "refactor(redator): picker e card ficam simetricos, e a tag sai da celula

Os dois sitios da designacao renderizavam AppAvatar SEM image - nenhum dos
dois mostrava foto, mesmo com o picker tendo o RedatorData inteiro. Agora
os dois mostram foto e e-mail, o card porque a TurmaRedatorData foi
alargada.

A tag de idoneidade vira irma da celula nos dois lugares em que estava
dentro do slot de descricao. Descricao e linha de texto, nao area de
composicao - e o slot agora carrega o e-mail."
```

---

### Task 9: `TurmasTable` — as duas colunas que não tinham descrição

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx:73` e `:83-90`

**Interfaces:**
- Consumes: `IdentityCell` (Task 4); `TurmaData.client_rut`, `client_photo_url` e
  `TurmaRedatorData.email`, `photo_url` (Tasks 1–3).
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Coluna Cliente**

Trocar:

```tsx
      <AppColumn header={t('operation.table.client')} body={(turma: TurmaData) => turma.client_name ?? '—'} />
```

por:

```tsx
      <AppColumn
        header={t('operation.table.client')}
        body={(turma: TurmaData) => (
          <IdentityCell
            title={turma.client_name ?? '—'}
            description={turma.client_rut}
            image={turma.client_photo_url}
          />
        )}
      />
```

- [ ] **Step 2: Coluna Redator — o primeiro, mais um contador**

Trocar:

```tsx
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) =>
          turma.redatores.length > 0 ? turma.redatores.map((r) => r.name).join(', ') : (
            <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>
          )
        }
      />
```

por:

```tsx
      <AppColumn
        header={t('operation.table.redator')}
        body={(turma: TurmaData) => {
          const [primeiro, ...resto] = turma.redatores

          if (primeiro === undefined)
            return <span style={{ color: 'var(--text-color-secondary)' }}>{t('operation.table.noRedator')}</span>

          /* Primeiro + contador, não N células empilhadas: a altura da linha
           * tem de ser constante na tabela inteira. O `+N` é numeral puro,
           * então não abre chave de i18n; os nomes restantes vão no `title`,
           * que é dado e não copy. */
          return (
            <div className="flex items-center gap-2">
              <IdentityCell title={primeiro.name} description={primeiro.email} image={primeiro.photo_url} />
              {resto.length > 0 && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-color-secondary)' }}
                  title={resto.map((r) => r.name).join(', ')}
                >
                  +{resto.length}
                </span>
              )}
            </div>
          )
        }}
      />
```

- [ ] **Step 3: Trocar o import**

Acrescentar `IdentityCell` ao bloco de import de `@shared/ui` no topo do arquivo.

- [ ] **Step 4: Build, lint, testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/operation/components/Turma/TurmasTable.tsx
git commit -m "refactor(operation): as duas colunas do TurmasTable viram celula

Eram os dois unicos sitios sem descricao NEM chave para busca-la, o que
motivou o alargamento dos DTOs. Cliente ganha RUT e foto; Redator mostra o
primeiro com foto e e-mail mais um contador +N.

Contador e nao empilhamento porque a altura da linha tem de ser constante
na tabela inteira. O +N e numeral puro, entao nao abre chave de i18n."
```

---

### Task 10: Os três sítios sem foto no DTO

**Executor:** `claude`

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:63-71`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:51-59`
- Modify: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx:42-43`
- Modify: `frontend/src/shared/config/locales/es-CL.json:570`
- Modify: `frontend/src/shared/config/locales/pt-BR.json:570`
- Modify: `frontend/src/shared/config/locales/en.json:570`

**Interfaces:**
- Consumes: `IdentityCell` (Task 4). Nenhum campo novo de backend — os três DTOs não têm foto e
  não são alargados.
- Produces: nada.

- [ ] **Step 1: `EnrollmentTable` — descrição só quando o e-mail existe**

Trocar o `body` da coluna de nome:

```tsx
          body={(e: EnrollmentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={e.name}  size='large' />
              <span className="font-medium">{e.name}</span>
            </div>
          )}
```

por:

```tsx
          body={(e: EnrollmentData) => (
            /* `email` é nullable no DTO. Sem rótulo de ausência: a célula
             * simplesmente não abre a segunda linha, o que evita chave de
             * i18n nova e mantém a altura da linha estável. */
            <IdentityCell title={e.name} description={e.email} />
          )}
```

e trocar `AppAvatar` por `IdentityCell` na linha 3 do arquivo.

- [ ] **Step 2: `HistorialTable` — iniciais sobre snapshot, nunca foto viva**

Trocar o `body` da coluna `colAlumno`:

```tsx
          body={(c: CertificateData) => (
            <div>
              <p className="font-medium">{c.snapshot.aluno.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>{c.snapshot.aluno.rut ?? '—'}</p>
            </div>
          )}
```

por:

```tsx
          body={(c: CertificateData) => (
            /* SEM `image`, e isto é decisão de auditoria: o snapshot é o
             * retrato congelado no momento da emissão de um documento com
             * peso legal. Ilustrá-lo com a foto VIVA do aluno misturaria dado
             * congelado com dado mutável no certificado (spec D4). */
            <IdentityCell title={c.snapshot.aluno.name} description={c.snapshot.aluno.rut ?? '—'} />
          )}
```

e acrescentar `IdentityCell` ao import de `@shared/ui` na linha 2.

- [ ] **Step 3: `EmissionStudentsTable` — nome e RUT numa coluna só**

Trocar as duas colunas:

```tsx
      <AppColumn header={t('certificate.colName')} field="student_name" />
      <AppColumn header={t('certificate.colRut')} field="student_rut" />
```

por:

```tsx
      <AppColumn
        header={t('certificate.colName')}
        field="student_name"
        body={(e: EmissionPanelEnrollmentData) => (
          <IdentityCell title={e.student_name} description={e.student_rut} />
        )}
      />
```

e acrescentar `IdentityCell` ao import de `@shared/ui` na linha 2.

> Nenhuma das duas colunas era `sortable` e o `AppDataTable` não recebe `sortField`, então a fusão
> **não custa ordenação**. O `field` fica porque é o que alimenta a busca do `useTableFilter`.

- [ ] **Step 4: Provar que `colRut` ficou órfã**

```bash
cd /home/jvbat/projetos/fix-frontend && grep -rn "colRut" frontend/src --include=*.tsx --include=*.ts
```

Esperado: **nenhuma saída**.

- [ ] **Step 5: Remover a chave das três locales**

Remover a linha `    "colRut": "RUT",` de `frontend/src/shared/config/locales/es-CL.json`,
`pt-BR.json` e `en.json` (linha 570 nos três, dentro do bloco `certificate`).

```bash
cd frontend && grep -rn "colRut" src/shared/config/locales/
```

Esperado: **nenhuma saída**.

- [ ] **Step 6: Build, lint, testes**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx frontend/src/features/certification frontend/src/shared/config/locales
git commit -m "refactor(ui): os tres sitios sem foto no DTO viram celula

EnrollmentTable usa email como descricao e nao abre segunda linha quando
ele e null - sem rotulo de ausencia, portanto sem chave de i18n nova.

HistorialTable fica SEM foto por decisao de auditoria: o snapshot e o
retrato congelado na emissao de um documento com peso legal, e ilustra-lo
com a foto viva misturaria dado congelado com dado mutavel.

EmissionStudentsTable funde nome e RUT numa coluna. Nenhuma das duas era
sortable e o AppDataTable nao recebe sortField, entao a fusao nao custa
ordenacao - custa a chave certificate.colRut, que fica orfa e sai das tres
locales."
```

---

### Task 11: `DemoPhotosSeeder` — sem foto no banco, a revisão visual não prova nada

**Executor:** `codex`

**Files:**
- Create: `backend/database/seeders/DemoPhotosSeeder.php`

**Interfaces:**
- Consumes: `App\Domains\Identity\Services\UserPhotoService::store(User $user, UploadedFile $photo)`.
- Produces: nada em código. Produz **estado de dev**: parte dos redatores e alunos com
  `users.photo_path` preenchido.

> **Não é encadeado no `DatabaseSeeder::run()`.** A suíte roda em sqlite `:memory:` sem MinIO e sem
> rede; um seeder de fotos no encadeamento quebraria `php artisan test`. Roda só por
> `db:seed --class=DemoPhotosSeeder`. Por isso também **não tem teste** — é ferramenta de dev, e o
> DoD dela é a observação do Step 3.

- [ ] **Step 1: Escrever o seeder**

Criar `backend/database/seeders/DemoPhotosSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Fotos de demonstração para a revisão visual da célula de identidade.
 *
 * NÃO é encadeado no DatabaseSeeder: a suíte roda em sqlite :memory: sem MinIO
 * e sem rede. Roda só por `db:seed --class=DemoPhotosSeeder`.
 *
 * Fonte: randomuser.me, cujos retratos são de pessoas reais e licenciados pelo
 * serviço para uso como placeholder. Não se raspa rosto avulso da web — aqui o
 * cadastro de aluno vira certificado com peso legal, e foto de pessoa real
 * identificável em cadastro fictício é problema de privacidade. As URLs são
 * determinísticas, então o seed não depende da API e não sorteia.
 *
 * Semeia UM SIM, UM NÃO: a revisão precisa ver, na mesma tabela, a linha com
 * foto e a linha com iniciais. Cobertura total esconderia a regressão do
 * fallback do AppAvatar.
 */
class DemoPhotosSeeder extends Seeder
{
    private const PORTRAITS = [
        'https://randomuser.me/api/portraits/men/32.jpg',
        'https://randomuser.me/api/portraits/women/44.jpg',
        'https://randomuser.me/api/portraits/men/75.jpg',
        'https://randomuser.me/api/portraits/women/68.jpg',
        'https://randomuser.me/api/portraits/men/11.jpg',
        'https://randomuser.me/api/portraits/women/23.jpg',
        'https://randomuser.me/api/portraits/men/54.jpg',
        'https://randomuser.me/api/portraits/women/9.jpg',
    ];

    public function run(UserPhotoService $photos): void
    {
        $users = Redator::with('user')->get()->pluck('user')
            ->concat(Student::with('user')->get()->pluck('user'))
            ->filter()
            ->values();

        $usadas = 0;

        foreach ($users as $i => $user) {
            if ($i % 2 !== 0) {
                continue;
            }

            if ($user->photo_path !== null) {
                $this->command->line("· {$user->name} já tem foto, pulado");

                continue;
            }

            $url = self::PORTRAITS[$usadas % count(self::PORTRAITS)];

            if ($this->seedOne($photos, $user, $url)) {
                $usadas++;
            }
        }

        $this->command->info("Fotos de demonstração: {$usadas} semeadas, ".($users->count() - $usadas).' sem foto (proposital).');
    }

    /** Falha de rede registra e segue: seed de demonstração não derruba o dev. */
    private function seedOne(UserPhotoService $photos, User $user, string $url): bool
    {
        $tmp = null;

        try {
            $res = Http::timeout(10)->get($url);

            if ($res->failed()) {
                $this->command->warn("· {$url} devolveu {$res->status()}, {$user->name} fica sem foto");

                return false;
            }

            $tmp = tempnam(sys_get_temp_dir(), 'lotus-demo-photo');
            file_put_contents($tmp, $res->body());

            // `$test: true` pula a checagem de is_uploaded_file, que só vale
            // para arquivo vindo de requisição HTTP real.
            $photos->store($user, new UploadedFile($tmp, "demo-{$user->id}.jpg", 'image/jpeg', null, true));
            $this->command->line("✓ {$user->name}");

            return true;
        } catch (Throwable $e) {
            $this->command->warn("· falha ao semear {$user->name}: {$e->getMessage()}");

            return false;
        } finally {
            if ($tmp !== null && file_exists($tmp)) {
                @unlink($tmp);
            }
        }
    }
}
```

- [ ] **Step 2: Provar que a suíte segue verde** (o seeder não pode ter entrado no encadeamento)

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS, mesma contagem de antes.

- [ ] **Step 3: Rodar e observar**

```bash
docker compose exec -T app php artisan db:seed --class=DemoPhotosSeeder
```

Esperado: linhas `✓ <nome>` alternadas, e a contagem final dizendo quantos ficaram sem foto.

- [ ] **Step 4: Provar a idempotência**

```bash
docker compose exec -T app php artisan db:seed --class=DemoPhotosSeeder
```

Esperado: todos os já semeados aparecem como `já tem foto, pulado`, e `0 semeadas`. Nenhum objeto
novo no bucket.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint database/seeders/DemoPhotosSeeder.php
cd .. && git add backend/database/seeders/DemoPhotosSeeder.php
git commit -m "chore(seed): fotos de demonstracao para provar o ramo com foto

Sem foto no banco de dev, a revisao visual dos 14 sitios exercitaria so o
fallback de iniciais e deixaria o caminho photo_url -> SignedUrlTransformer
-> <img> sem prova nenhuma - justamente o que o alargamento dos DTOs
acrescentou.

Opt-in, fora do DatabaseSeeder: a suite roda em sqlite :memory: sem MinIO e
sem rede. Escreve por UserPhotoService::store() em vez de photo_path direto,
entao herda a ordem de gravacao, a guarda do store() === false, a transacao
da auditoria e a compensacao.

Semeia um sim, um nao: a revisao precisa ver a linha com foto e a linha com
iniciais na mesma tabela.

Fonte randomuser.me - retratos de pessoas reais licenciados para uso como
placeholder, com URL deterministica."
```

---

### Task 12: Gate do bloco

**Executor:** `claude`

**Files:** nenhum. É verificação.

- [ ] **Step 1: Suíte do backend**

```bash
docker compose exec -T app php artisan test
```

Esperado: PASS.

- [ ] **Step 2: Frontend inteiro**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: exit 0 nos três.

- [ ] **Step 3: Provar que nenhuma cor fixa voltou**

```bash
cd /home/jvbat/projetos/fix-frontend && grep -rn "text-gray-" frontend/src
```

Esperado: nenhuma saída.

- [ ] **Step 4: Provar que a catraca encolheu e não cresceu**

`src/features` aparece em dezenas de globs e comentários do arquivo, então contar a string inteira
mente. Extrair só o bloco da lista:

```bash
cd /home/jvbat/projetos/fix-frontend && awk '/^const CATRACA_COR = \[/,/^\]/' frontend/eslint.config.js
```

Esperado: exatamente **4** linhas de path, e **nenhuma** delas `ClientsTable.tsx`.

- [ ] **Step 5: Provar que nenhum sítio de identidade ficou com `AppAvatar` cru**

```bash
cd /home/jvbat/projetos/fix-frontend && grep -rn "AppAvatar" frontend/src --include=*.tsx | grep -v "shared/ui"
```

Esperado: **só** `app/layouts/Header/UserMenu.tsx` — o único sítio deliberadamente fora do bloco.

- [ ] **Step 6: Provar que `generated.ts` não foi editado à mão**

```bash
cd /home/jvbat/projetos/fix-frontend && docker compose exec -T app php artisan typescript:transform && git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: **nenhum diff**. Se houver, o arquivo foi tocado à mão — reverter e regenerar.

- [ ] **Step 7: Semear e subir para a revisão visual**

```bash
docker compose up -d
docker compose exec -T app php artisan db:seed --class=DemoPhotosSeeder
cd frontend && pnpm dev
```

- [ ] **Step 8: Entregar ao João a lista de telas**

`/lotus-ui-review` tem `disable-model-invocation: true` — a revisão é passo **dele** na sessão
interativa. As telas, na ordem em que o bloco as tocou:

| # | Tela | O que provar |
|---|---|---|
| 1 | `/comercial/clientes` | célula, e a linha com foto ao lado da linha com iniciais |
| 2 | `/personas/alumnos` | idem |
| 3 | `/personas/redactores` | idem |
| 4 | `/administracion/usuarios` | idem |
| 5 | `/comercial/presupuestos` | coluna Cliente com foto |
| 6 | `/comercial/presupuestos/:id` | forma inline no subtítulo, com foto |
| 7 | `/operacion/turmas` | Cliente com RUT e foto; Redator com `+N` e altura de linha constante |
| 8 | `/operacion/turmas/:id` | subtítulo inline com o botão do orçamento dentro da descrição |
| 9 | `/operacion/turmas/:id` (designação) | picker e card **idênticos**, tag ao lado |
| 10 | `/operacion/turmas/:id` (alunos) | aluno com e-mail e aluno sem e-mail, sem oscilar a altura |
| 11 | `/certificacion` (emisión) | nome e RUT na mesma coluna |
| 12 | `/certificacion` (historial) | iniciais, **nunca** foto, descrição = RUT do snapshot |
| 13 | catálogo → curso → redatores | `RedatorCard` com RUT mono e tag ao lado |

---

## Handoff de execução

**executor: `codex` e `claude`, dividido por decisão do João em 2026-08-14 (D12).**

| Task | Executor | Entregável |
|---|---|---|
| 1 | `codex` | `TurmaData` + RUT e foto do cliente |
| 2 | `codex` | `TurmaRedatorData` + e-mail e foto |
| 3 | `claude` | `generated.ts` regenerado |
| 4 | `claude` | `IdentityCell` + teste + barrel |
| 5 | `claude` | Grupo A + catraca 5→4 |
| 6 | `claude` | `DetailHeader` + os 2 sítios inline |
| 7 | `claude` | Grupo B comercial |
| 8 | `claude` | Os 3 sítios de redator |
| 9 | `claude` | `TurmasTable` |
| 10 | `claude` | Os 3 sítios sem foto no DTO |
| 11 | `codex` | `DemoPhotosSeeder` |
| 12 | `claude` | Gate |

**`paths_autorizados` do Codex (Tasks 1, 2, 11):**

```
backend/app/Domains/Operation/Data/TurmaData.php
backend/app/Domains/Operation/Data/TurmaRedatorData.php
backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php
backend/tests/Feature/Operation/TurmaShowTest.php
backend/database/seeders/DemoPhotosSeeder.php
```

**`frontend/src/shared/types/generated.ts` NÃO entra nos paths autorizados do Codex.** A lei §5.3
proíbe editá-lo à mão, e a forma mais barata de garantir isso é o executor do backend não ter o
arquivo no seu alcance de escrita. A regeneração é a Task 3, do Claude.

**Ordem obrigatória:** 1 e 2 antes de 3; 3 antes de 5–10 (o TS precisa dos campos); 4 antes de 5–10
(o componente precisa existir); 11 depois de 1–10 (é o "depois de teste" do pedido); 12 por último.
As Tasks 5, 6, 7, 8, 9 e 10 são independentes entre si.
