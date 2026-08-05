# Profundidade de module · formulário CRUD e hidratação de DTO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** tirar a resolução de serviço por container de 8 `fromModel` e substituir nove montagens de
formulário CRUD à mão por um module com interface pequena, sem mudar nenhum comportamento observável.

**Architecture:** dois sub-blocos independentes, A (backend) antes de B (frontend). A troca a
assinatura de URL no `fromModel` por um `Transformer` do `spatie/laravel-data` aplicado na
propriedade — a propriedade passa a carregar o path e o transformer assina na serialização, o que
atravessa o aninhamento `Budget → Quote → File` que corta o threading de serviço. B cria
`useCrudForm` sobre o `useEntityForm` existente, com `toPayload(form, mode)` e classificação
obrigatória de toda chave de payload em três caixas.

**Tech Stack:** Laravel 13 / PHP 8.3, `spatie/laravel-data` 4.23, `spatie/laravel-typescript-transformer`
3.3, PHPUnit; React 19 + TS, TanStack Query, vitest + `@testing-library/react`.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-05-profundidade-form-crud-e-hidratacao-dto-design.md`.
  As decisões D1–D16 valem para todas as tasks; onde o plano e a spec divergirem, **pare e reporte**.
- **Branch:** `refactor/profundidade-form-e-dto`, a partir de `main`, **no main tree**
  (`/home/jvbat/projetos/lotus`). Sem worktree — o bloco toca `backend/` (P-03) e o compose aponta
  para o main tree.
- **Backend roda no container:** `docker compose exec -T app php artisan ...`. O host WSL não tem
  mbstring.
- **Pint roda no host, de dentro de `backend/`, NUNCA sem argumento** (lição 9). Toda chamada passa
  a lista de arquivos e tem guarda de lista vazia antes.
- **`generated.ts` não se edita à mão** (ADR-04). `typescript:transform` roda porque DTOs são
  tocados; o diff tem de sair **vazio**.
- **Nenhuma chave i18n nova, nenhuma migration, nenhuma mudança de RBAC** (D16).
- **Features não importam PrimeReact direto nem outra feature** (lei §5.6). Teste em `shared/` não
  importa `features/`.
- **Todo mecanismo entra visto reprovando** (lição 10), com sonda fresca, e a sonda sai antes do
  commit, com `git status` limpo.
- **Baseline esperada** (a Task 0 confere e é a única fonte): backend **377 passed (1367 assertions)**,
  frontend **21 passed**.

---

### Task 0: Branch e baseline

**Files:** nenhum arquivo alterado.

**Interfaces:**
- Consumes: nada.
- Produces: os números de baseline que as Tasks 2, 3, 5, 6, 7, 9 e 11 comparam.

- [ ] **Step 1: Confirmar árvore limpa e base correta**

```bash
cd /home/jvbat/projetos/lotus
git status --short
git rev-parse --abbrev-ref HEAD
```

Esperado: nenhuma saída no `git status`; branch `main`. Árvore suja ou branch diferente → **pare e
reporte**, não faça stash nem commit por conta própria.

- [ ] **Step 2: Criar a branch**

```bash
git checkout -b refactor/profundidade-form-e-dto
```

- [ ] **Step 3: Medir a baseline do backend**

```bash
docker compose up -d
docker compose exec -T app php artisan test
```

Esperado: `Tests:  377 passed (1367 assertions)`. Número diferente → **pare e reporte**; baseline
divergente invalida o gate das tasks seguintes.

- [ ] **Step 4: Medir a baseline do frontend**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

Esperado: `21 passed`; build e lint verdes.

- [ ] **Step 5: Registrar (sem commit)**

Anote os quatro números. A Task 0 não produz commit — não há artefato.

---

### Task 1: `SignedUrlTransformer`

**Files:**
- Create: `backend/app/Shared/Files/Transformers/SignedUrlTransformer.php`
- Test: `backend/tests/Feature/Shared/SignedUrlTransformerTest.php`

**Interfaces:**
- Consumes: `UploadFileAction::publicDiskFor(string $disk): string` (já existe,
  `app/Shared/Files/Actions/UploadFileAction.php:163`).
- Produces: `SignedUrlTransformer implements Spatie\LaravelData\Transformers\Transformer`, construtor
  `__construct(private int $minutes)`, usado pelas Tasks 2 e 3 como
  `#[WithTransformer(SignedUrlTransformer::class, 10)]` e `(..., 60)`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `backend/tests/Feature/Shared/SignedUrlTransformerTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Transformers\SignedUrlTransformer;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Tests\TestCase;

/**
 * O transformer é o único lugar do projeto que sabe assinar URL de leitura.
 * Antes dele, sete `fromModel` resolviam serviço pelo container para fazer a
 * mesma operação com dois TTLs diferentes.
 *
 * O teste exercita o transformer PELA SERIALIZAÇÃO, não chamando `transform()`
 * na mão: é assim que a produção o alcança, e fabricar um `DataProperty` só
 * para satisfazer a assinatura provaria menos. O `Storage::fake('s3')` é o
 * mesmo setup que o `UserPhotoTest` já usa para assinar URL em teste.
 */
class SignedUrlTransformerTest extends TestCase
{
    public function test_assina_o_path_na_serializacao(): void
    {
        Storage::fake('s3');

        $saida = (new SondaSignedUrlData('documentos/contrato.pdf'))->toArray();

        $this->assertIsString($saida['url']);
        $this->assertStringContainsString('documentos/contrato.pdf', $saida['url']);
    }

    public function test_valor_nulo_continua_nulo_sem_passar_pelo_transformer(): void
    {
        Storage::fake('s3');

        // `TransformedDataResolver:102` devolve null antes de chamar o
        // transformer. É isso que mantém `photo_url: null` sem linha extra —
        // se deixar de valer, as 4 entidades com foto quebram de uma vez.
        $this->assertNull((new SondaSignedUrlNullableData(null))->toArray()['url']);
    }
}

class SondaSignedUrlData extends Data
{
    public function __construct(
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $url,
    ) {}
}

class SondaSignedUrlNullableData extends Data
{
    public function __construct(
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $url,
    ) {}
}
```

- [ ] **Step 2: Rodar o teste e vê-lo falhar**

```bash
docker compose exec -T app php artisan test --filter=SignedUrlTransformerTest
```

Esperado: FAIL com `Class "App\Shared\Files\Transformers\SignedUrlTransformer" not found`.

- [ ] **Step 3: Escrever o transformer**

Crie `backend/app/Shared/Files/Transformers/SignedUrlTransformer.php`:

```php
<?php

namespace App\Shared\Files\Transformers;

use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelData\Support\DataProperty;
use Spatie\LaravelData\Support\Transformation\TransformationContext;
use Spatie\LaravelData\Transformers\Transformer;

/**
 * Assina a URL de leitura de um objeto do storage NA SERIALIZAÇÃO. A propriedade
 * do DTO carrega o path; este transformer é o único lugar que a converte em URL
 * pré-assinada (spec D2/D3/D4).
 *
 * Por que na saída e não na construção: `QuoteData::collect()` não carrega
 * argumento extra, então passar o serviço por parâmetro não atravessa o
 * aninhamento `Budget → Quote → File`. Transformer é por propriedade e atravessa.
 *
 * Valor `null` nunca chega aqui: `TransformedDataResolver:102` devolve null antes
 * de chamar o transformer — é o que mantém `photo_url: null` sem linha extra.
 *
 * Assina contra {@see UploadFileAction::publicDiskFor()}, não contra o disco
 * padrão: em dev o endpoint que grava (`minio:9000`) não é o que o navegador
 * resolve (achado de 2026-07-31).
 */
final class SignedUrlTransformer implements Transformer
{
    public function __construct(private int $minutes) {}

    public function transform(DataProperty $property, mixed $value, TransformationContext $context): string
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk(UploadFileAction::publicDiskFor(config('filesystems.default')));

        return $storage->temporaryUrl($value, now()->addMinutes($this->minutes));
    }
}
```

- [ ] **Step 4: Rodar o teste e vê-lo passar**

```bash
docker compose exec -T app php artisan test --filter=SignedUrlTransformerTest
```

Esperado: `2 passed (3 assertions)`. Se o `Storage::fake('s3')` não conseguir assinar URL temporária,
**pare e reporte** — não troque o disco: `UserPhotoTest` já assina em teste com esse mesmo setup, e
uma divergência aqui significa que a configuração de disco mudou, o que é achado, não obstáculo.

- [ ] **Step 5: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
FILES="app/Shared/Files/Transformers/SignedUrlTransformer.php tests/Feature/Shared/SignedUrlTransformerTest.php"
if [ -n "$FILES" ]; then ./vendor/bin/pint $FILES; else echo 'sem arquivo php tocado'; fi
cd /home/jvbat/projetos/lotus
git add backend/app/Shared/Files/Transformers/SignedUrlTransformer.php backend/tests/Feature/Shared/SignedUrlTransformerTest.php
git commit -m "feat(files): transformer assina URL de leitura na serializacao"
```

---

### Task 2: A família `download_url` (3 DTOs) e a morte do `temporaryUrl`

**Files:**
- Modify: `backend/app/Shared/Files/Data/FileData.php:24,36`
- Modify: `backend/app/Domains/Identity/Data/RedatorDocumentData.php:25,38`
- Modify: `backend/app/Domains/Operation/Data/TurmaDocumentData.php:26,38`
- Modify: `backend/app/Shared/Files/Actions/UploadFileAction.php:137-150` (remove `temporaryUrl`)

**Interfaces:**
- Consumes: `SignedUrlTransformer` da Task 1.
- Produces: nenhuma assinatura nova; os três DTOs mantêm nome, tipo e ordem das propriedades.

- [ ] **Step 1: Trocar `FileData`**

Em `backend/app/Shared/Files/Data/FileData.php`, o import `use App\Shared\Files\Actions\UploadFileAction;`
sai e entram dois:

```php
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
```

A propriedade e o `fromModel` ficam assim:

```php
        public int $size,
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $download_url,
        public ?string $created_at,
    ) {}

    public static function fromModel(File $file): self
    {
        return new self(
            id: $file->id,
            type: $file->type,
            original_name: $file->original_name,
            mime: $file->mime,
            size: $file->size,
            download_url: $file->path,
            created_at: $file->created_at?->toIso8601String(),
        );
    }
```

- [ ] **Step 2: Trocar `RedatorDocumentData` e `TurmaDocumentData`**

Mesma troca nos dois: os mesmos dois imports entram, `use App\Shared\Files\Actions\UploadFileAction;`
sai, a propriedade `download_url` recebe `#[WithTransformer(SignedUrlTransformer::class, 10)]` e a
linha do `fromModel` vira `download_url: $file->path,`.

`RedatorDocumentData` (a propriedade é a última do construtor):

```php
        public ?string $created_at,
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $download_url,
    ) {}
```

`TurmaDocumentData` (idem):

```php
        public string $created_at,
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $download_url,
    ) {}
```

- [ ] **Step 3: Rodar os testes que já provam `download_url`**

```bash
docker compose exec -T app php artisan test --filter="CommercialFilesTest|TurmaDocumentApiTest|RedatorDocumentTest"
```

Esperado: todos passam. Eles afirmam `assertStringContainsString('http', ...download_url)` e
`assertNotEmpty(...)` — se o transformer não estivesse ligado, o campo devolveria o path cru e os três
reprovariam. É essa a prova de que o mecanismo está de pé.

- [ ] **Step 4: Matar o `temporaryUrl` (D5)**

Confirme que sobrou zero chamador:

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn -e '->temporaryUrl(' app/ tests/ | grep -v 'storage->temporaryUrl'
```

Esperado: **nenhuma saída**. Qualquer linha aqui → **pare e reporte**, não apague o método.

Remova de `app/Shared/Files/Actions/UploadFileAction.php` o método `temporaryUrl()` inteiro e o
docblock imediatamente acima dele. **`publicDiskFor()` fica** — é ela que o transformer chama, e o
docblock dela é que guarda o achado do `AWS_ENDPOINT`.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: **379 passed (1370 assertions)** — a baseline 377/1367 mais os 2 testes e 3 asserções da Task 1. Qualquer
outro número → **pare e reporte**.

- [ ] **Step 6: Provar que `generated.ts` não mudou**

```bash
docker compose exec -T app php artisan typescript:transform
cd /home/jvbat/projetos/lotus && git diff --stat -- frontend/src/shared/types/generated.ts
```

Esperado: **nenhuma saída**. Diff aqui significa que nome ou tipo de propriedade mudou, contra a
invariante 1 da spec → **pare e reporte**.

- [ ] **Step 7: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint \
  app/Shared/Files/Data/FileData.php \
  app/Shared/Files/Actions/UploadFileAction.php \
  app/Domains/Identity/Data/RedatorDocumentData.php \
  app/Domains/Operation/Data/TurmaDocumentData.php
cd /home/jvbat/projetos/lotus
git add backend/app
git commit -m "refactor(files): download_url sai do container e vira transformer"
```

---

### Task 3: A família `photo_url` (4 DTOs) e a morte do `urlFor`

**Files:**
- Modify: `backend/app/Domains/Identity/Data/UserData.php:43,72`
- Modify: `backend/app/Domains/Commercial/Data/ClientData.php:46,78`
- Modify: `backend/app/Domains/Identity/Data/RedatorData.php:43,87`
- Modify: `backend/app/Domains/Identity/Data/StudentData.php:46,75`
- Modify: `backend/app/Domains/Identity/Services/UserPhotoService.php` (remove `urlFor` e `disk`)
- Modify: `backend/tests/Feature/Identity/UserPhotoTest.php:101,111`

**Interfaces:**
- Consumes: `SignedUrlTransformer` da Task 1.
- Produces: nenhuma assinatura nova.

- [ ] **Step 1: Trocar os 4 DTOs**

Em cada um, o import do serviço sai (`use App\Domains\Identity\Services\UserPhotoService;`) e entram:

```php
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
```

A propriedade mantém o `#[Computed]` e ganha o transformer — o `#[Computed]` é o que a mantém fora do
contrato de entrada, e `UserData` também é DTO de request:

```php
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
```

E o `fromModel` passa o path:

| Arquivo | Linha do `fromModel` |
|---|---|
| `UserData.php` | `photo_url: $user->photo_path,` |
| `ClientData.php` | `photo_url: $client->user->photo_path,` |
| `RedatorData.php` | `photo_url: $redator->user->photo_path,` |
| `StudentData.php` | `photo_url: $student->user->photo_path,` |

- [ ] **Step 2: Rodar o teste que prova os dois lados do null**

```bash
docker compose exec -T app php artisan test --filter=UserPhotoTest
```

Esperado: todos passam. `test_photo_url_e_null_sem_foto_e_string_com_foto` e
`test_photo_url_aparece_nas_outras_tres_entidades` cobrem as 4 entidades e o caso `null`, que agora
depende de `TransformedDataResolver:102` curto-circuitar antes do transformer.

- [ ] **Step 3: Apagar os 2 testes que exercitavam `urlFor` direto**

Em `backend/tests/Feature/Identity/UserPhotoTest.php`, apague os **dois métodos inteiros**, com os
docblocks que os precedem:

- `test_url_for_devolve_null_sem_caminho()` (linhas 97-102) — 1 asserção.
- `test_url_for_devolve_url_temporaria()` (linhas 104-115) — 2 asserções.

Não os reescreva contra o transformer. O que eles afirmam já é afirmado **pelo caminho que a produção
usa**, no mesmo arquivo: `test_photo_url_e_null_sem_foto_e_string_com_foto` (linha 312) exige
`photo_url` `null` sem foto e string com foto, lendo o JSON da API. Um teste novo chamando
`transform(null)` afirmaria um caminho que a produção não tem — `TransformedDataResolver:102`
curto-circuita antes.

O import `use App\Domains\Identity\Services\UserPhotoService;` **fica** se outro teste do arquivo o
usa (`store()` é usado em vários); confira com `grep -n 'UserPhotoService' tests/Feature/Identity/UserPhotoTest.php`
antes de removê-lo.

- [ ] **Step 4: Matar o `urlFor` (D5)**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn -e '->urlFor(' app/ tests/
```

Esperado: **nenhuma saída**. Qualquer linha → **pare e reporte**.

Remova de `app/Domains/Identity/Services/UserPhotoService.php` o método `urlFor()`, o docblock acima
dele, a constante `URL_MINUTES` e o método privado `disk()` **se e somente se** `disk()` não tiver
outro chamador no arquivo:

```bash
grep -n 'disk()' app/Domains/Identity/Services/UserPhotoService.php
```

Se `disk()` for usado por `store()`/`delete()`, ele **fica**.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
docker compose exec -T app php artisan test
```

Esperado: **377 passed (1367 assertions)** — 379/1370 do Step 5 da Task 2, menos os 2 testes e as 3
asserções apagadas no Step 3. Qualquer outro número → **pare e reporte**. O placar cai de propósito
aqui, e é a única task do bloco em que isso acontece.

- [ ] **Step 6: `generated.ts` sem diff**

```bash
docker compose exec -T app php artisan typescript:transform
cd /home/jvbat/projetos/lotus && git diff --stat -- frontend/src/shared/types/generated.ts
```

Esperado: nenhuma saída.

- [ ] **Step 7: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint \
  app/Domains/Identity/Data/UserData.php \
  app/Domains/Identity/Data/RedatorData.php \
  app/Domains/Identity/Data/StudentData.php \
  app/Domains/Identity/Services/UserPhotoService.php \
  app/Domains/Commercial/Data/ClientData.php \
  tests/Feature/Identity/UserPhotoTest.php
cd /home/jvbat/projetos/lotus
git add backend/app backend/tests
git commit -m "refactor(identity): photo_url sai do container e vira transformer"
```

---

### Task 4: A guarda de leitura da propriedade (D6)

**Files:**
- Create: `backend/tests/Feature/Shared/SignedUrlPropertyReadTest.php`

**Interfaces:**
- Consumes: o estado deixado pelas Tasks 2 e 3 (propriedades carregando path).
- Produces: guardrail permanente; nenhuma assinatura consumida por outra task.

- [ ] **Step 1: Escrever a guarda**

Crie `backend/tests/Feature/Shared/SignedUrlPropertyReadTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * Depois da spec D3, `download_url` e `photo_url` CARREGAM o path até a
 * serialização — quem assina é o `SignedUrlTransformer`. Ler a propriedade em
 * PHP devolve um path com nome de URL, em silêncio, e nenhum teste de JSON vê.
 *
 * Isto é mecanismo, não docblock (lição 14): a lição 13 é reincidente no
 * projeto, e "texto afirmando o que o repositório não faz" já custou quatro
 * achados de review.
 *
 * A varredura é sobre o CÓDIGO, não sobre o texto: `token_get_all()` remove
 * comentários antes da regex. Os docblocks destes DTOs citam `download_url` em
 * prosa, e contar a menção reprovaria por um vínculo que não existe — foi
 * exatamente o Q-4 do review de 2026-08-04.
 */
class SignedUrlPropertyReadTest extends TestCase
{
    public function test_nenhum_codigo_de_producao_le_a_propriedade_que_carrega_path(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            if (preg_match('/->\s*(download_url|photo_url)\b/', $this->codigoSemComentarios($arquivo))) {
                $encontrados[] = str_replace(base_path().'/', '', $arquivo);
            }
        }

        $this->assertSame([], $encontrados, "Estas propriedades carregam o PATH até a serialização (spec D3). "
            ."Para a URL assinada, serialize o DTO ou use o SignedUrlTransformer:\n".implode("\n", $encontrados));
    }

    /** @return list<string> */
    private function arquivosPhp(string $raiz): array
    {
        $arquivos = [];
        $iterador = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($raiz));

        foreach ($iterador as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $arquivos[] = $arquivo->getPathname();
            }
        }

        return $arquivos;
    }

    private function codigoSemComentarios(string $arquivo): string
    {
        $codigo = '';

        foreach (token_get_all((string) file_get_contents($arquivo)) as $token) {
            if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }

            $codigo .= is_array($token) ? $token[1] : $token;
        }

        return $codigo;
    }
}
```

Não há allowlist de propósito: o próprio transformer recebe o valor por parâmetro e **não** lê a
propriedade, então nenhuma exceção é necessária. Guardrail com exceção embutida envelhece calado.

- [ ] **Step 2: Vê-lo passar no estado limpo**

```bash
docker compose exec -T app php artisan test --filter=SignedUrlPropertyReadTest
```

Esperado: `1 passed`.

- [ ] **Step 3: Sonda 1 — leitura real reprova**

Adicione temporariamente ao fim de `backend/app/Shared/Files/Actions/UploadFileAction.php`, dentro da
classe:

```php
    public function sondaFech(\App\Shared\Files\Data\FileData $data): string
    {
        return $data->download_url;
    }
```

```bash
docker compose exec -T app php artisan test --filter=SignedUrlPropertyReadTest
```

Esperado: **FAIL**, citando `app/Shared/Files/Actions/UploadFileAction.php`.

- [ ] **Step 4: Sonda 2 — menção em comentário NÃO reprova**

Remova o método da sonda 1 e ponha no lugar, no mesmo arquivo:

```php
    // sondaFech: menção a $data->download_url em comentário não é leitura.
```

```bash
docker compose exec -T app php artisan test --filter=SignedUrlPropertyReadTest
```

Esperado: **PASS**. É a prova nos dois sentidos; sem ela, o teste sabe só dizer "sim".

- [ ] **Step 5: Remover as sondas e conferir a árvore**

```bash
cd /home/jvbat/projetos/lotus
git status --short
```

Esperado: só o arquivo novo de teste (untracked). Qualquer modificação em `app/` → a sonda ficou.

- [ ] **Step 6: Pint e commit**

```bash
cd /home/jvbat/projetos/lotus/backend
./vendor/bin/pint tests/Feature/Shared/SignedUrlPropertyReadTest.php
cd /home/jvbat/projetos/lotus
git add backend/tests/Feature/Shared/SignedUrlPropertyReadTest.php
git commit -m "test(files): guarda de leitura das propriedades que carregam path"
```

---

### Task 5: `TurmaData` recebe o serviço por parâmetro (D7)

**Files:**
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php:55-58`
- Modify: `backend/app/Domains/Operation/Http/Controllers/TurmaController.php:47,110`
- Modify: `backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php:38`
- Modify: `backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php:192`

**Interfaces:**
- Consumes: `TurmaHabilitacaoService` (já existe).
- Produces: `TurmaData::fromModel(Turma $turma, TurmaHabilitacaoService $habilitacao): self`.

- [ ] **Step 1: Confirmar que são exatamente 4 call sites**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn 'TurmaData::fromModel' app/ tests/
```

Esperado: exatamente as 4 linhas listadas acima. **Call site a mais → pare e reporte**; classificá-lo
é decisão do João, não da execução (mesma regra de parada do H.4.6, onde a spec media 4 e existiam 6).

- [ ] **Step 2: Mudar a assinatura**

Em `TurmaData.php`, o `use App\Domains\Operation\Services\TurmaHabilitacaoService;` fica, e o método
vira:

```php
    public static function fromModel(Turma $turma, TurmaHabilitacaoService $habilitacao): self
    {
        return new self(
```

A linha `$habilitacao = app(TurmaHabilitacaoService::class);` **sai**; as duas linhas que usam
`$habilitacao->isHabilitada($turma)` e `$habilitacao->missingTypes($turma)` ficam como estão.

- [ ] **Step 3: Atualizar os 2 call sites de produção**

`TurmaController.php:47` — o método já recebe dependência por injeção de método; adicione
`TurmaHabilitacaoService $habilitacao` à assinatura do método se ele ainda não a tiver, e passe:

```php
            ->map(fn (Turma $t) => TurmaData::fromModel($t, $habilitacao))
```

`TurmaController.php:110`:

```php
        return TurmaData::fromModel(Turma::query()->withListingData()->findOrFail($turma->id), $habilitacao);
```

Se o método daquela linha não receber o serviço, adicione-o à assinatura do método — **não** use
`app()` dentro do controller.

- [ ] **Step 4: Atualizar os 2 call sites de teste**

`TurmaDataEnrichmentTest.php:38`:

```php
        $data = TurmaData::fromModel(
            Turma::query()->withListingData()->findOrFail($turma->id),
            app(TurmaHabilitacaoService::class),
        );
```

`SoftDeletedRelationProjectionTest.php:192` — mesma adição do segundo argumento
`app(TurmaHabilitacaoService::class)`, preservando o primeiro argumento como está.

- [ ] **Step 5: Rodar os testes de turma e a suíte**

```bash
docker compose exec -T app php artisan test --filter="TurmaDataEnrichmentTest|SoftDeletedRelationProjectionTest|TurmaApi"
docker compose exec -T app php artisan test
```

Esperado: os filtrados passam; a suíte fecha em **378 passed (1368 assertions)** — 377/1367 da Task 3
mais o caso da Task 4. Este é o placar final do bloco no backend. **`habilitada` e
`missing_document_types` com os mesmos valores** é a invariante 4 da spec, e é o
`TurmaDataEnrichmentTest` que a prova.

- [ ] **Step 6: `generated.ts`, Pint e commit**

```bash
docker compose exec -T app php artisan typescript:transform
cd /home/jvbat/projetos/lotus && git diff --stat -- frontend/src/shared/types/generated.ts
cd backend
./vendor/bin/pint \
  app/Domains/Operation/Data/TurmaData.php \
  app/Domains/Operation/Http/Controllers/TurmaController.php \
  tests/Feature/Operation/TurmaDataEnrichmentTest.php \
  tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
cd /home/jvbat/projetos/lotus
git add backend/app backend/tests
git commit -m "refactor(operation): TurmaData recebe TurmaHabilitacaoService por parametro"
```

Esperado no `git diff` do `generated.ts`: nenhuma saída — `fromModel` é construção, nenhuma
propriedade mudou.

---

### Task 6: `useCrudForm` e a guarda de classificação (D8–D12)

**Files:**
- Create: `frontend/src/shared/hooks/useCrudForm.ts`
- Create: `frontend/src/shared/hooks/useCrudForm.test.ts`
- Modify: `frontend/src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: `useEntityForm`, `useMutationErrors` (`shared/hooks/useEntityForm.ts`), `DialogMode`
  (`shared/lib`), `ProblemDetails` (`shared/api/axios`).
- Produces: `useCrudForm`, `MutableResource<T>`, `unclassifiedPayloadKeys` — consumidos pelas
  Tasks 7 e 9.

- [ ] **Step 1: Escrever os testes que falham**

Crie `frontend/src/shared/hooks/useCrudForm.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCrudForm, unclassifiedPayloadKeys } from './useCrudForm'

type Fields = { id?: number; name: string; secret: string }

const EMPTY: Fields = { id: undefined, name: '', secret: '' }

/** `MutableResource` é estrutural: este literal basta, sem TanStack — mesmo
 * padrão do `fakeResource` do `useCrudPage.test.ts`. */
function fakeResource(spy: { create?: unknown[]; update?: unknown[] } = {}) {
  return {
    useCreate: () => ({
      mutate: (payload: unknown, opts?: { onSuccess?: (created: unknown) => void }) => {
        spy.create?.push(payload)
        opts?.onSuccess?.({ id: 99 })
      },
      isPending: false,
      error: null,
    }),
    useUpdate: () => ({
      mutate: (vars: unknown, opts?: { onSuccess?: (updated: unknown) => void }) => {
        spy.update?.push(vars)
        opts?.onSuccess?.({ id: 1 })
      },
      isPending: false,
      error: null,
    }),
  }
}

const base = {
  empty: EMPTY,
  toPayload: (f: Fields) => ({ name: f.name, secret: f.secret }),
  mapped: ['name'],
  summaryOnly: ['secret'],
  onDone: () => undefined,
}

describe('unclassifiedPayloadKeys', () => {
  it('aceita chave em qualquer uma das três caixas', () => {
    expect(unclassifiedPayloadKeys(['a', 'b', 'c.0.x'], ['a'], ['b'], ['c.'])).toEqual([])
  })

  it('acusa a chave que ninguém classificou', () => {
    expect(unclassifiedPayloadKeys(['a', 'novo'], ['a'], [], [])).toEqual(['novo'])
  })

  it('prefixo casa só com o ponto: `contacts` não é `contacts.`', () => {
    // O payload do cliente manda a chave `contacts` (a lista inteira) além de
    // `contacts.0.name`; um 422 na lista é mostrado pelo resumo, então ela
    // precisa de classificação própria.
    expect(unclassifiedPayloadKeys(['contacts'], [], [], ['contacts.'])).toEqual(['contacts'])
  })
})

describe('useCrudForm', () => {
  it('reprova config em que uma chave de payload não foi classificada', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create', summaryOnly: [] }),
      ),
    ).toThrow(/secret/)
  })

  it('não reprova quando toda chave está classificada', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), { ...base, entity: null, mode: 'create' }),
    )
    expect(result.current.readOnly).toBe(false)
  })

  it('o create manda o payload do modo create e aguarda o afterCreate antes do onDone', async () => {
    const ordem: string[] = []
    const enviados: unknown[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource({ create: enviados }), {
        ...base,
        entity: null,
        mode: 'create',
        afterCreate: async () => {
          ordem.push('afterCreate')
        },
        onDone: () => ordem.push('onDone'),
      }),
    )

    await act(async () => {
      result.current.set('name', 'Lotus')
    })
    await act(async () => {
      result.current.submit()
    })

    expect(enviados).toEqual([{ name: 'Lotus', secret: '' }])
    expect(ordem).toEqual(['afterCreate', 'onDone'])
  })

  it('o update usa o id da ENTIDADE, nunca o do form', async () => {
    const enviados: unknown[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource({ update: enviados }), {
        ...base,
        entity: { id: 7, name: 'a', secret: '' },
        mode: 'edit',
      }),
    )

    // O form carrega o id copiado; sujá-lo não pode mudar o alvo do PUT.
    await act(async () => {
      result.current.set('id', 999)
    })
    await act(async () => {
      result.current.submit()
    })

    expect(enviados).toEqual([{ id: 7, payload: { name: 'a', secret: '' } }])
  })

  it('toPayload recebe o modo', () => {
    const visto: string[] = []
    renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create',
        toPayload: (f: Fields, mode: string) => {
          visto.push(mode)
          return { name: f.name, secret: f.secret }
        },
      }),
    )
    expect(visto).toContain('create')
    expect(visto).toContain('edit')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: FAIL com `Failed to resolve import "./useCrudForm"`.

- [ ] **Step 3: Escrever o module**

Crie `frontend/src/shared/hooks/useCrudForm.ts`:

```ts
import type { Dispatch, SetStateAction } from 'react'
import { useEntityForm, useMutationErrors } from './useEntityForm'
import type { DialogMode } from '@shared/lib'
import type { ProblemDetails } from '@shared/api/axios'

/** Recurso mutável, estrutural — mesmo padrão do `ListableResource` do
 * `useCrudPage`: o teste passa um literal e não precisa de TanStack. */
export type MutableResource<T> = {
  useCreate: () => {
    mutate: (payload: unknown, opts?: { onSuccess?: (created: T) => void }) => void
    isPending: boolean
    error: ProblemDetails | null
  }
  useUpdate: () => {
    mutate: (
      vars: { id: number | string; payload: unknown },
      opts?: { onSuccess?: (updated: T) => void },
    ) => void
    isPending: boolean
    error: ProblemDetails | null
  }
}

/** Chaves do payload que ninguém classificou. Ver `useCrudForm` para o porquê. */
export function unclassifiedPayloadKeys(
  keys: string[],
  mapped: string[],
  summaryOnly: string[],
  excludePrefixes: string[],
): string[] {
  return keys.filter(
    (k) =>
      !mapped.includes(k) &&
      !summaryOnly.includes(k) &&
      !excludePrefixes.some((p) => k.startsWith(p)),
  )
}

export type CrudFormOptions<F extends { id?: number }, T> = {
  entity: F | null
  mode: DialogMode
  empty: F
  toFields?: (entity: F) => F
  toPayload: (form: F, mode: DialogMode) => Record<string, unknown>
  /** Campos que mostram o próprio erro no `FormField` — o resumo os omite. */
  mapped: string[]
  /** Campos cujo 422 é mostrado pelo RESUMO, seja por não terem input, seja
   * por o input não passar `error=`. Não vai para o `FormErrorSummary`. */
  summaryOnly: string[]
  /** Prefixos de campo aninhado que mostram o próprio erro (`contacts.`). */
  excludePrefixes?: string[]
  onDone: () => void
  afterCreate?: (created: T) => void | Promise<void>
}

/**
 * Formulário CRUD completo: estado, submit com a ramificação create/update,
 * `pending` somado e normalização RFC 7807. `useEntityForm` cuidava só do
 * estado, e as outras ~50 linhas estavam copiadas em nove hooks.
 *
 * A classificação de TODA chave de payload é obrigatória (spec D12). O
 * `FormErrorSummary` mostra exatamente as chaves que não estão em `mapped`:
 * chave nova que entre em `mapped` por reflexo some das duas pontas, e chave
 * nova sem classificação nenhuma passa despercebida. Exigir a decisão é o que
 * impede as duas.
 */
export function useCrudForm<F extends { id?: number }, T>(
  resource: MutableResource<T>,
  opts: CrudFormOptions<F, T>,
) {
  const { entity, mode, empty, toFields, toPayload, mapped, summaryOnly, onDone, afterCreate } = opts
  const excludePrefixes = opts.excludePrefixes ?? []

  const { form, setForm, set, readOnly, didReset } = useEntityForm<F>(entity, mode, empty, toFields)

  const create = resource.useCreate()
  const update = resource.useUpdate()

  if (import.meta.env.DEV) {
    const keys = [
      ...new Set([
        ...Object.keys(toPayload(form, 'create')),
        ...Object.keys(toPayload(form, 'edit')),
      ]),
    ]
    const leaked = unclassifiedPayloadKeys(keys, mapped, summaryOnly, excludePrefixes)

    if (leaked.length > 0) {
      throw new Error(
        `useCrudForm: chave de payload sem classificação: ${leaked.join(', ')}. ` +
          'Declare em `mapped` (o campo mostra o próprio erro), em `summaryOnly` ' +
          '(quem mostra é o FormErrorSummary) ou cubra com `excludePrefixes`.',
      )
    }
  }

  function submit() {
    if (mode === 'create') {
      create.mutate(toPayload(form, 'create'), {
        onSuccess: async (created: T) => {
          await afterCreate?.(created)
          onDone()
        },
      })
      return
    }

    // O id do PUT vem da ENTIDADE, nunca do form: o form é editável e o alvo
    // do update não pode depender do que o usuário digitou (spec D10).
    if (entity?.id == null) return
    update.mutate({ id: entity.id, payload: toPayload(form, 'edit') }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form,
    set,
    setForm: setForm as Dispatch<SetStateAction<F>>,
    readOnly,
    didReset,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
    errorSummary: { mapped, excludePrefixes },
  }
}
```

- [ ] **Step 4: Exportar em `shared/hooks/index.ts`**

Acrescente ao arquivo, no mesmo estilo das linhas vizinhas:

```ts
export { useCrudForm, unclassifiedPayloadKeys } from './useCrudForm'
export type { MutableResource, CrudFormOptions } from './useCrudForm'
```

- [ ] **Step 5: Rodar e ver passar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: 8 passed. O caso `reprova config em que uma chave de payload não foi classificada` é o
mecanismo visto reprovando (lição 10) — se ele passar sem o `throw`, o teste está errado, não o
module.

- [ ] **Step 6: Suíte, build, lint e commit**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/hooks
git commit -m "feat(shared): useCrudForm com classificacao obrigatoria de payload"
```

Esperado: `29 passed` (21 da baseline + 8 novos), build e lint verdes.

---

### Task 7: O piloto — `useRoleForm` e `useStaffUserForm` (D13)

**Files:**
- Modify: `frontend/src/features/identity/hooks/useRoleForm.ts`
- Modify: `frontend/src/features/identity/hooks/useStaffUserForm.ts`
- Modify: `frontend/src/features/identity/components/Admin/RoleDialog.tsx:56`
- Modify: `frontend/src/features/identity/components/Admin/StaffUserDialog.tsx:52`
- Create: `frontend/src/features/identity/hooks/useRoleForm.test.tsx`
- Create: `frontend/src/features/identity/hooks/useStaffUserForm.test.tsx`

**Interfaces:**
- Consumes: `useCrudForm`, `unclassifiedPayloadKeys` da Task 6.
- Produces: os dois hooks mantêm a assinatura pública que os diálogos já usam —
  `useRoleForm(role, mode, onDone)` e `useStaffUserForm(user, mode, onDone, afterCreate?)` — e o
  retorno ganha `errorSummary`.

- [ ] **Step 1: Reescrever `useRoleForm`**

```ts
import { useCrudForm } from '@shared/hooks'
import type { RoleData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { rolesApi } from '@shared/api/rolesApi'

export type RoleFormFields = {
  id?: number
  name: string
  permissions: string[]
}

const EMPTY: RoleFormFields = { id: undefined, name: '', permissions: [] }

export function useRoleForm(role: RoleData | null, mode: DialogMode, onDone: () => void) {
  const entity: RoleFormFields | null = role
    ? { id: role.id, name: role.name, permissions: role.permissions }
    : null

  const crud = useCrudForm<RoleFormFields, RoleData>(rolesApi, {
    entity,
    mode,
    empty: EMPTY,
    toPayload: (f) => ({ name: f.name, permissions: f.permissions }),
    mapped: ['name'],
    // Os checkboxes de permissão não passam `error=` ao FormField: quem mostra
    // um 422 em `permissions` é o resumo.
    summaryOnly: ['permissions'],
    onDone,
  })

  function toggle(name: string) {
    crud.set(
      'permissions',
      crud.form.permissions.includes(name)
        ? crud.form.permissions.filter((p) => p !== name)
        : [...crud.form.permissions, name],
    )
  }

  return { ...crud, toggle }
}
```

- [ ] **Step 2: Reescrever `useStaffUserForm`**

O bloco de normalização de `entity` e o `toFields` **não mudam** — copie-os do arquivo atual. O corpo
vira:

```ts
  const crud = useCrudForm<StaffUserFormFields, UserData>(usersApi, {
    entity,
    mode,
    empty: EMPTY,
    toFields,
    toPayload: (f, m) => {
      const base = {
        name: f.name,
        email: f.email,
        rut: f.rut || null,
        phone: f.phone || null,
        role: f.role,
        is_active: f.is_active,
      }
      // No create a senha é obrigatória; no update, vazia significa "mantém a
      // atual" e a chave não pode ir no corpo.
      if (m === 'create') return { ...base, password: f.password }
      return f.password ? { ...base, password: f.password } : base
    },
    mapped: ['name', 'rut', 'email', 'password', 'role'],
    // `phone` (StaffUserDialog:83) e `is_active` (:105) TÊM input, mas nenhum
    // passa `error=` ao FormField — quem mostra o 422 deles é o resumo.
    summaryOnly: ['phone', 'is_active'],
    onDone,
    afterCreate,
  })

  return crud
```

A assinatura da função e o tipo `StaffUserFormFields` ficam idênticos.

- [ ] **Step 3: Ligar os dois diálogos ao `errorSummary`**

`RoleDialog.tsx:20` passa a desestruturar `errorSummary` junto do resto, e a linha 56 vira:

```tsx
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
```

`StaffUserDialog.tsx:29-30` idem, e a linha 52 vira a mesma coisa.

- [ ] **Step 4: Escrever o teste de CI de cada hook**

Crie `frontend/src/features/identity/hooks/useRoleForm.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRoleForm } from './useRoleForm'

/** A guarda de classificação do `useCrudForm` roda no render. Este teste existe
 * para o CI exercitar a config REAL do hook — sem ele, a guarda só dispararia
 * quando alguém abrisse o diálogo em dev. Mora na feature porque teste em
 * `shared/` importando `features/` quebraria a lei §5.6. */
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useRoleForm', () => {
  it('classifica toda chave do payload nos dois modos', () => {
    expect(() =>
      renderHook(() => useRoleForm(null, 'create', () => undefined), { wrapper }),
    ).not.toThrow()

    expect(() =>
      renderHook(
        () => useRoleForm({ id: 1, name: 'admin', permissions: [] } as never, 'edit', () => undefined),
        { wrapper },
      ),
    ).not.toThrow()
  })
})
```

Crie `useStaffUserForm.test.tsx` no mesmo molde, trocando o hook e a entidade
(`{ id: 1, name: 'a', email: 'a@b.cl', role: 'admin', is_active: true, rut: null, phone: null }`).

- [ ] **Step 5: Ver a guarda reprovando com a config real**

Tire temporariamente `'permissions'` do `summaryOnly` do `useRoleForm` e rode:

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm vitest run src/features/identity/hooks/useRoleForm.test.tsx
```

Esperado: **FAIL** com `chave de payload sem classificação: permissions`. Devolva a linha e rode de
novo: PASS. Sem este passo o teste só sabe dizer "sim".

- [ ] **Step 6: Suíte, build, lint e commit**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity frontend/src/shared
git commit -m "refactor(identity): piloto do useCrudForm em role e usuario staff"
```

Esperado: `31 passed` (29 + 2), build e lint verdes.

---

### Task 8: Ler o sinal do piloto (D13)

**Files:** nenhum arquivo alterado. Esta task produz um julgamento escrito.

**Interfaces:**
- Consumes: o estado deixado pela Task 7.
- Produces: a decisão que autoriza ou cancela a Task 9.

- [ ] **Step 1: Medir o encolhimento**

```bash
cd /home/jvbat/projetos/lotus
git show main:frontend/src/features/identity/hooks/useRoleForm.ts | wc -l
git show main:frontend/src/features/identity/hooks/useStaffUserForm.ts | wc -l
wc -l frontend/src/features/identity/hooks/useRoleForm.ts frontend/src/features/identity/hooks/useStaffUserForm.ts
```

Baseline: 48 e 80.

- [ ] **Step 2: Classificar o sinal**

- **Sinal 1 (a técnica paga):** os dois hooks encolheram, nenhuma montagem migrou para o diálogo e a
  única coisa nova no chamador é o spread do `errorSummary`. → **Task 9 acontece.**
- **Sinal 2 (só empurra a montagem para o chamador):** o que saiu do hook reapareceu no diálogo. →
  **Task 9 não acontece**, o piloto fica, e a razão vai ao fechamento.
- **Sinal 3 (ficou maior ou menos claro):** → **reverta a Task 7** (`git revert`) e reporte. Task 9
  não acontece.

- [ ] **Step 3: Reportar ao João**

Escreva o sinal, com os números, e **espere confirmação** antes de seguir. Piloto sem leitura
explícita é refactor com nome bonito.

---

### Task 9: Migrar os 3 restantes (D14) — só com sinal 1

**Files:**
- Modify: `frontend/src/features/identity/hooks/useStudentForm.ts`
- Modify: `frontend/src/features/commercial/hooks/useBudgetForm.ts`
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx:37`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx:78-88`
- Create: `frontend/src/features/identity/hooks/useStudentForm.test.tsx`
- Create: `frontend/src/features/commercial/hooks/useBudgetForm.test.tsx`
- Create: `frontend/src/features/commercial/hooks/useClientForm.test.tsx`

**Interfaces:**
- Consumes: `useCrudForm` da Task 6; o molde de teste da Task 7.
- Produces: nenhuma assinatura pública nova — os três hooks mantêm parâmetros e retorno, mais
  `errorSummary`.

- [ ] **Step 1: `useStudentForm`**

O bloco `entity` não muda. O corpo vira:

```ts
  const crud = useCrudForm<StudentFormFields, StudentData>(studentsApi, {
    entity,
    mode,
    empty: EMPTY,
    toPayload: (f, m) =>
      m === 'create'
        ? { name: f.name, rut: f.rut, email: f.email, phone: f.phone, client_id: f.client_id }
        // client_id não vai no update: trocar de empresa é ato da matrícula (D3).
        : { name: f.name, rut: f.rut, email: f.email, phone: f.phone },
    mapped: ['name', 'rut', 'email', 'client_id'],
    // `StudentDialog` não tem FormErrorSummary: um 422 em `phone` não aparece
    // em lugar nenhum hoje. Classificar expõe a lacuna sem mudar a tela —
    // construir o resumo que falta é débito registrado (spec D14).
    summaryOnly: ['phone'],
    onDone,
    afterCreate,
  })

  return crud
```

- [ ] **Step 2: `useBudgetForm`**

```ts
  const crud = useCrudForm<BudgetFormFields, BudgetData>(budgetsApi, {
    entity: budget,
    mode,
    empty: EMPTY,
    toFields,
    // Em edit o backend só aceita payment_terms; client_id vai junto porque o
    // DTO o exige na validação, e o controller o ignora (imutável por construção).
    toPayload: (f) => ({ client_id: f.client_id, payment_terms: f.payment_terms }),
    mapped: ['client_id', 'payment_terms'],
    summaryOnly: [],
    onDone,
    afterCreate: onCreated,
  })

  return crud
```

**Atenção à D15:** isso inverte a ordem atual (hoje `onDone()` e depois `onCreated()`; passa a ser
`onCreated()` e depois `onDone()`). É a invariante 8 da spec, provada no checkpoint visual da
Task 10. Se a navegação para a página de detalhe mudar de comportamento, **reverta só este arquivo**
e reporte — `useBudgetForm` fica fora, e a razão vai ao fechamento.

- [ ] **Step 3: `useClientForm`**

Os cinco helpers de contato/endereço (`setAddr`, `patchContact`, `setPrimaryContact`, `addContact`,
`removeContact`) **não mudam** — continuam usando o `setForm` que o module devolve. O `submit` inteiro
e as duas chamadas de mutation somem, e no lugar entra:

```ts
  const crud = useCrudForm<ClientData, ClientData>(clientsApi, {
    entity: client,
    mode,
    empty: EMPTY,
    // Campos LISTADOS, não `...form`: `photo_url` é `#[Computed]` e não tem o
    // que fazer num payload de escrita. Empresa não tem nome separado da razón
    // social: `name` é sempre igual a `legal_name`.
    toPayload: (f) => ({
      id: f.id,
      name: f.legal_name,
      legal_name: f.legal_name,
      rut: f.rut,
      email: f.email,
      phone: f.phone,
      type: f.type,
      business_activity: f.business_activity,
      addresses: f.addresses,
      contacts: f.contacts,
    }),
    mapped: ['legal_name', 'name', 'rut', 'email', 'type', 'business_activity'],
    // `contacts.*` sai do resumo pelo prefixo (cada contato mostra o próprio
    // erro no NestedField), mas a chave `contacts` — a lista inteira — não é
    // coberta por ele. `addresses` NÃO entra em `mapped`: hoje o backend não
    // valida endereço, e quando validar o 422 não pode sumir da tela.
    summaryOnly: ['id', 'phone', 'addresses', 'contacts'],
    excludePrefixes: ['contacts.'],
    onDone,
    afterCreate,
  })

  return {
    ...crud,
    addr: crud.form.addresses[0] ?? EMPTY_ADDRESS,
    setAddr,
    patchContact,
    setPrimaryContact,
    addContact,
    removeContact,
  }
```

**A ordem do arquivo muda:** hoje os cinco helpers vêm antes do `submit`. Agora o bloco do
`useCrudForm` sobe para o topo do corpo da função e, logo abaixo dele, entra
`const { setForm } = crud` — é de lá que os helpers passam a ler. Sem a subida, eles referenciariam
`crud` antes da declaração.

- [ ] **Step 4: Ligar os 2 diálogos que têm resumo**

`BudgetDialog.tsx:37` e o bloco `ClientDialog.tsx:78-88` viram
`<FormErrorSummary errors={fieldErrors} {...errorSummary} />`. **O comentário do `ClientDialog` sobre
`addresses.*` não some** — mova-o para junto do `summaryOnly` no hook, que é onde a decisão agora
mora. `StudentDialog` não muda: ele não tem resumo.

- [ ] **Step 5: Três testes de CI, no molde da Task 7**

Um por hook, no mesmo formato do `useRoleForm.test.tsx`: renderiza em `create` e em `edit` e afirma
`not.toThrow()`. Entidades mínimas: aluno
`{ id: 1, name: 'a', rut: '1-9', email: 'a@b.cl', phone: null, current_client_id: 2 }`; orçamento
`{ id: 1, client_id: 2, payment_terms: null }`; cliente `{ ...EMPTY, id: 1 }`.

- [ ] **Step 6: Provar a guarda com config real, uma vez**

Tire `'phone'` do `summaryOnly` do `useStudentForm` e rode
`pnpm vitest run src/features/identity/hooks/useStudentForm.test.tsx`. Esperado: FAIL citando `phone`.
Devolva a linha.

- [ ] **Step 7: Suíte, build, lint e commit**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus
git add frontend/src/features
git commit -m "refactor(forms): aluno, orcamento e cliente adotam o useCrudForm"
```

Esperado: `34 passed` (31 + 3).

---

### Task 10: Checkpoint visual — do João

**Files:** nenhum.

- [ ] **Step 1: Subir o ambiente**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d && cd frontend && pnpm dev
```

- [ ] **Step 2: Pedir a prova ao João, com o roteiro**

Nos diálogos migrados (role, usuário staff, e — se a Task 9 aconteceu — aluno, orçamento, cliente),
nos três modos:

1. **`view`** desliga os campos.
2. **`create`** grava e fecha; no usuário staff e no aluno, a **foto escolhida antes de salvar sobe
   depois do 201** e o diálogo **continua aberto** se o upload falhar (invariante 7).
3. **`edit`** grava e fecha, e o registro alterado é o que estava aberto (invariante 6 e D10).
4. **Um 422 de verdade** em cada diálogo — RUT inválido, e-mail duplicado — aparece **no mesmo lugar
   de antes** (invariante 5).
5. **Orçamento:** criar leva à página de detalhe do orçamento novo (invariante 8 / D15). É este passo
   que decide se `useBudgetForm` fica migrado.

- [ ] **Step 3: Registrar a aprovação**

Sem aprovação explícita, o gate não fecha.

---

### Task 11: Gate

**Files:** nenhum arquivo de produção.

- [ ] **Step 1: Item 0 — e2e com sessão Sanctum (o critério de aceite do bloco)**

Login `admin@lotus.cl` / `senha123`, com `Origin`, `Accept` e `X-XSRF-TOKEN` (lição 12). Pegue da API
uma `download_url` de documento e uma `photo_url`, e **baixe as duas**:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "<download_url devolvida pela API>"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "<photo_url devolvida pela API>"
```

Esperado: `200` nos dois, com o `Content-Type` do objeto. **String com `http` não basta** — disco
errado no transformer produz URL plausível e inútil, e nenhum teste unitário vê.

- [ ] **Step 2: Item 0 — `habilitada` na resposta real**

```bash
curl -s "<...>/api/turmas" | head -c 400
```

Esperado: `habilitada` e `missing_document_types` presentes, com os mesmos valores de antes do bloco
(invariante 4).

- [ ] **Step 3: Item 0 — os dois mecanismos vistos reprovando com sonda fresca**

Repita, com sonda **diferente** da usada na execução: a guarda da Task 4 (leitura da propriedade em
um arquivo de `app/` que não seja o `UploadFileAction`) e a guarda da Task 6 (tire uma chave de um
`summaryOnly` real). As duas reprovam; devolva tudo e confirme `git status` limpo.

- [ ] **Step 4: Automático**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm test && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus
git diff main...HEAD --stat -- frontend/src/shared/types/generated.ts frontend/src/shared/config/locales backend/database
```

Esperado: backend **378 passed (1368 assertions)** — a baseline era 377/1367, e o caminho é `+2/+3`
(Task 1), `−2/−3` (Task 3, os testes que exercitavam o `urlFor` morto) e `+1/+1` (Task 4). O líquido
é `+1` teste e `+1` asserção, e **o caminho tem de ser declarado no fechamento**: um placar que sobe
1 esconde que 2 testes foram apagados de propósito.
Frontend `34 passed` se a Task 9 aconteceu, `31` se parou no piloto. Build e lint verdes; **os três
diffs vazios**.

- [ ] **Step 5: Pint com guarda de lista vazia (lição 9)**

```bash
cd /home/jvbat/projetos/lotus
FILES=$(git diff main...HEAD --name-only -- 'backend/**/*.php' | sed 's|^backend/||' | tr '\n' ' ')
cd backend
if [ -n "$FILES" ]; then ./vendor/bin/pint --test $FILES; else echo 'sem arquivo php tocado'; fi
```

A guarda de lista vazia não é cerimônia: `./vendor/bin/pint` sem argumento reformata o repositório
inteiro (lição 9). O `&&`/`||` numa linha só também mascara falha do Pint — por isso `if/then/else`.

- [ ] **Step 6: Código morto**

```bash
cd /home/jvbat/projetos/lotus/backend
grep -rn -e '->temporaryUrl(' -e '->urlFor(' app/ tests/ | grep -v 'storage->temporaryUrl'
grep -rn 'URL_MINUTES' app/
cd ../frontend && grep -rn 'useCrudForm' src/ | wc -l
```

Esperado: as duas primeiras sem saída (os métodos morreram e não deixaram órfão); a terceira ≥ 6.

- [ ] **Step 7: Leis §5**

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -rn "from 'primereact" src/features/ || echo 'ok §5.6 primereact'
grep -rn "@features/" src/shared/ || echo 'ok §5.6 shared→feature'
```

O bloco não toca DDD, auditoria, auth, RBAC, migration nem financeiro.

---

## Handoff de execução

**`executor: misto`.**

**Ao Codex vão as Tasks 2, 3 e 5.** São substituição literal com alvos que saem de `grep`, não de
julgamento; a verificação decide sozinha (a suíte, mais o diff vazio de `generated.ts`); e os paths
são fechados.

`paths_autorizados` para essas três tasks:

```
backend/app/Shared/Files/Data/FileData.php
backend/app/Shared/Files/Actions/UploadFileAction.php
backend/app/Domains/Identity/Data/RedatorDocumentData.php
backend/app/Domains/Identity/Data/UserData.php
backend/app/Domains/Identity/Data/RedatorData.php
backend/app/Domains/Identity/Data/StudentData.php
backend/app/Domains/Identity/Services/UserPhotoService.php
backend/app/Domains/Commercial/Data/ClientData.php
backend/app/Domains/Operation/Data/TurmaDocumentData.php
backend/app/Domains/Operation/Data/TurmaData.php
backend/app/Domains/Operation/Http/Controllers/TurmaController.php
backend/tests/Feature/Identity/UserPhotoTest.php
backend/tests/Feature/Operation/TurmaDataEnrichmentTest.php
backend/tests/Feature/Shared/SoftDeletedRelationProjectionTest.php
```

**Regras de parada da delegação:**

- Diff em qualquer arquivo fora da lista → **para**.
- `generated.ts` com diff → **para**. Significa que nome ou tipo de propriedade mudou.
- Placar da suíte diferente do previsto **para**, e o arquivo é revertido — não se ajusta o número
  esperado.
- `TurmaData::fromModel` com call site além dos 4 medidos → **para**; classificá-lo é decisão do João.
- Chamador remanescente de `temporaryUrl`/`urlFor` no momento de apagar o método → **para**, não
  apague.
- Nenhum commit é feito pelo Codex. Report + diff são revisados por Claude, que roda a verificação do
  plano do zero antes de aceitar e commitar.

**Ficam com Claude as Tasks 0, 1, 4, 6, 7, 8, 9 e 11.** A 1 desenha o module e o teste que o prova; a
4 e a 6 constroem mecanismo que precisa ser visto reprovando nos dois sentidos; a 7 e a 9 mudam
telas de produção e dependem da classificação medida diálogo a diálogo; a 8 é julgamento explícito,
com a hipótese de reverter; a 0 julga árvore suja e baseline divergente; a 11 julga o placar e a
prova e2e.

**A Task 10 é do João.**

## Pendências de fechamento (fora das tasks)

1. **Editar o item 1 do `backlog.md`:** com A e B entregues ele sai da fila. Se a Task 9 parar no
   piloto (sinal 2), o item é **editado, não removido**, e passa a carregar o sinal medido.
2. **Registrar dois débitos novos**, com a razão: `StudentDialog` e `RedatorDialog` sem
   `FormErrorSummary` (a chave medida é `phone` no aluno); e `useRedatorForm`/`useTurmaConfigForm`/
   `useCourseForm`/`useQuoteForm` fora do `useCrudForm`, com o critério de cada um.
3. **Registrar o fechamento da D10** do bloco `hardening-guardrails-e-transportes`: a família que
   assinava URL pelo container deixou de existir.
