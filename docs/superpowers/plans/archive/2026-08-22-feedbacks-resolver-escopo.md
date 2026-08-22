# `feedbacks-resolver-escopo` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eliminar a divergência entre o requisito canônico de feedbacks (RF-FBK) e o código, sem
criar domínio, tabela ou tipo de documento: remover as duas permissões `feedback.*` órfãs de ponta a
ponta (catálogo, seeder, locales e banco), reconciliar o DER e registrar o estado real nas fontes
canônicas externas.

**Architecture:** RF-FBK-01/02/04 já estão implementados como documentação de turma — a `files`
polimórfica com `TurmaDocumentType` (`MANUAL`, `PRUEBAS`, `EVALUACION_REDATOR`) e o gate da RN-16 em
`ConcludeTurmaAction`. Nada disso muda. O bloco trabalha só sobre a aresta declarada sem código: o
catálogo de permissões, seu espelho nas locales, as linhas já gravadas em `permissions` e o texto dos
documentos que descrevem o schema e o requisito.

**Tech Stack:** Laravel 13 / PHP 8.3, spatie/laravel-permission, PHPUnit (sqlite `:memory:`),
React 19 + TS, i18next, MySQL 8. Backend roda no container `app`; Pint roda no host, de dentro de
`backend/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md`. Packet:
  `docs/superpowers/context-packets/2026-08-22-feedbacks-resolver-escopo.md`.
- Árvore: **main tree** (`/home/jvbat/projetos/lotus`), branch `feat/feedbacks-resolver-escopo`
  criada a partir de `main`. Bloco toca backend — a P-03 manda main tree.
- **`TurmaDocumentType` não muda.** Nenhum tipo novo, nenhum tipo renomeado, nenhuma alteração no
  gate da RN-16 nem em `ConcludeTurmaAction`.
- **Nada de `Domains/Feedback`, nada de tabela `feedbacks`.**
- Comandos de backend rodam no container: `docker compose exec -T app php artisan ...`.
- Pint roda no host, sempre com argumento: `cd backend && ./vendor/bin/pint <arquivos>`.
- Catálogo tem **42** permissões no HEAD (`666d9d2a`); ao fim do bloco tem **40**. (Corrigido na
  execução: o plano dizia 43→41 por contagem de papel; a medição contra o base deu 42→40. O delta
  `-2` sempre esteve certo — é ele que as provas cobram.)
- Role `redator` tem **4** permissões no HEAD; ao fim do bloco tem **2**
  (`operation.turma.view`, `operation.turma.submit_docs`).
- Um commit por task, mensagem em português, tipo convencional.

---

### Task 1: A catraca de i18n passa a cobrir os grupos

Hoje `PermissionI18nParityTest` compara só `perm.*`. O picker também lê `permGroup.<grupo>`, e
`permGroup.feedback` existe nas 3 locales sem nada que o ligue ao catálogo — apagar as permissões da
Task 2 deixaria esse grupo órfão em silêncio. A catraca vem primeiro para que a Task 2 seja **vista**
reprovando.

**Files:**
- Modify: `backend/tests/Feature/Identity/PermissionI18nParityTest.php`

**Interfaces:**
- Consumes: `PermissionCatalog::descriptions()` (array `nome => descrição`).
- Produces: um segundo método de teste no mesmo arquivo,
  `test_todas_as_locales_cobrem_os_grupos_do_catalogo`. Nenhuma API nova de produção.

- [ ] **Step 1: Escrever o teste novo**

Adicione o método abaixo dentro de `class PermissionI18nParityTest`, depois do método existente. Não
altere o método existente.

```php
    /**
     * O picker rotula cada GRUPO por `permGroup.<grupo>`, e o grupo é derivado
     * do nome da permissão (`explode('.', $name)[0]`, como em
     * `PermissionCatalog::toData()`). Sem esta catraca, apagar a última
     * permissão de um grupo deixa o rótulo dele órfão nas 3 locales sem que
     * nada reprove — foi exatamente o caso de `permGroup.feedback`.
     */
    public function test_todas_as_locales_cobrem_os_grupos_do_catalogo(): void
    {
        $esperados = array_values(array_unique(array_map(
            fn (string $perm) => explode('.', $perm)[0],
            array_keys(PermissionCatalog::descriptions()),
        )));
        sort($esperados);

        foreach (self::LOCALES as $locale) {
            $path = "/frontend/src/shared/config/locales/{$locale}.json";
            $this->assertFileExists($path, "Locale {$locale} não encontrado em {$path}");

            $json = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('permGroup', $json, "Locale {$locale} não tem o namespace `permGroup`");

            $chaves = array_keys($json['permGroup']);
            sort($chaves);

            $this->assertSame(
                $esperados,
                $chaves,
                "Locale {$locale}: chaves `permGroup.*` divergem dos grupos de PermissionCatalog::descriptions(). ".
                'Faltando: '.implode(', ', array_diff($esperados, $chaves)).'. '.
                'Sobrando: '.implode(', ', array_diff($chaves, $esperados)).'.',
            );

            foreach ($json['permGroup'] as $chave => $texto) {
                $this->assertIsString($texto, "Locale {$locale}: `permGroup.{$chave}` não é string");
                $this->assertNotSame('', trim($texto), "Locale {$locale}: `permGroup.{$chave}` está vazio");
            }
        }
    }
```

- [ ] **Step 2: Rodar e verificar que PASSA (controle positivo)**

```bash
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
```

Esperado: **2 testes passando**. O grupo `feedback` ainda existe no catálogo e nas locales, então a
catraca nova concorda com o HEAD. Se reprovar aqui, o defeito é anterior ao bloco — pare e reporte.

- [ ] **Step 3: Provar que a catraca morde (sonda temporária)**

Apague temporariamente a linha `"feedback": "Feedback"` de
`frontend/src/shared/config/locales/en.json` (dentro de `permGroup`, e cuide da vírgula da linha
anterior). Rode de novo:

```bash
docker compose exec -T app php artisan test --filter=test_todas_as_locales_cobrem_os_grupos_do_catalogo
```

Esperado: **FAIL**, com a mensagem contendo `Locale en: chaves permGroup.* divergem` e
`Faltando: feedback`.

- [ ] **Step 4: Desfazer a sonda**

```bash
git checkout -- frontend/src/shared/config/locales/en.json
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
```

Esperado: 2 testes passando de novo.

- [ ] **Step 5: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Identity/PermissionI18nParityTest.php && cd ..
git add backend/tests/Feature/Identity/PermissionI18nParityTest.php
git commit -m "test(identity): catraca de i18n passa a cobrir os grupos do catálogo"
```

---

### Task 2: As permissões órfãs saem do catálogo, do seeder e das locales

Uma task só porque as três metades não sobrevivem separadas: `RolePermissionSeeder` sincroniza a role
`redator` com nomes literais, e um nome que o catálogo não cria mais faz `syncPermissions` estourar.
Um reviewer não aprovaria uma metade sem a outra.

**Files:**
- Modify: `backend/app/Domains/Identity/Support/PermissionCatalog.php:86-89`
- Modify: `backend/database/seeders/RolePermissionSeeder.php:69-76`
- Modify: `frontend/src/shared/config/locales/en.json:144,187-188`
- Modify: `frontend/src/shared/config/locales/es-CL.json:144,187-188`
- Modify: `frontend/src/shared/config/locales/pt-BR.json:144,187-188`
- Test: `backend/tests/Feature/Identity/PermissionI18nParityTest.php` (da Task 1, sem alteração)

**Interfaces:**
- Consumes: a catraca de duas metades da Task 1.
- Produces: `PermissionCatalog::descriptions()` com **40** entradas e sem o grupo `feedback`;
  `RolePermissionSeeder::redatorPermissions()` devolvendo exatamente
  `['operation.turma.view', 'operation.turma.submit_docs']`.

- [ ] **Step 1: Remover as duas permissões do catálogo**

Em `backend/app/Domains/Identity/Support/PermissionCatalog.php`, apague o bloco inteiro — comentário
de seção incluído:

```php
            // ---- Feedback ----
            'feedback.feedback.view' => 'Ver feedbacks de turma',
            'feedback.feedback.manage' => 'Gerir feedbacks de turma',
```

A entrada anterior (`'certification.certificate.revoke' => ...`) passa a ser a última do array; a
vírgula final dela permanece.

- [ ] **Step 2: Rodar a catraca e VER as duas metades reprovarem**

```bash
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
```

Esperado: **2 falhas**. A de `perm` traz `Sobrando: feedback_feedback_manage, feedback_feedback_view`;
a de `permGroup` traz `Sobrando: feedback`. Este passo é a prova de que a catraca segura — não pule.

- [ ] **Step 3: Corrigir o seeder**

Em `backend/database/seeders/RolePermissionSeeder.php`, o método `redatorPermissions` passa a ser:

```php
    private function redatorPermissions(array $permissions): array
    {
        return [
            'operation.turma.view',
            'operation.turma.submit_docs',
        ];
    }
```

O docblock acima do método (a NOTA DE ESCOPO sobre `turma.view`) permanece como está.

- [ ] **Step 4: Limpar as 3 locales**

Em cada um de `frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json`:

1. dentro de `"permGroup"`, apague a linha `"feedback": ...` e **retire a vírgula** da linha anterior
   (`"certification": ...`), que passa a ser a última do objeto;
2. dentro de `"perm"`, apague as duas linhas `"feedback_feedback_view": ...` e
   `"feedback_feedback_manage": ...`, e retire a vírgula da linha que passar a ser a última do objeto.

Os valores exatos a apagar, por locale:

```text
en.json      permGroup.feedback = "Feedback"
             perm.feedback_feedback_view = "View class feedback"
             perm.feedback_feedback_manage = "Manage class feedback"
es-CL.json   permGroup.feedback = "Retroalimentación"
             perm.feedback_feedback_view = "Ver retroalimentaciones del grupo"
             perm.feedback_feedback_manage = "Gestionar retroalimentaciones del grupo"
pt-BR.json   permGroup.feedback = "Feedback"
             perm.feedback_feedback_view = "Ver feedbacks de turma"
             perm.feedback_feedback_manage = "Gerir feedbacks de turma"
```

- [ ] **Step 5: Verificar que os três JSON continuam válidos**

```bash
for f in en es-CL pt-BR; do python3 -c "import json;json.load(open('frontend/src/shared/config/locales/$f.json'));print('$f ok')"; done
grep -rn "feedback" frontend/src/shared/config/locales/*.json
```

Esperado: `en ok`, `es-CL ok`, `pt-BR ok`, e o `grep` **sem nenhuma saída**.

- [ ] **Step 6: Rodar a catraca e a suíte de Identity**

```bash
docker compose exec -T app php artisan test --filter=PermissionI18nParityTest
docker compose exec -T app php artisan test --filter=Identity
```

Esperado: tudo verde. `PermissionCatalogTest` compara a contagem do endpoint contra
`count(PermissionCatalog::descriptions())`, então ele acompanha sozinho.

- [ ] **Step 7: Medir a contagem nova**

```bash
docker compose exec -T app php -r "require 'vendor/autoload.php'; \$a=require 'bootstrap/app.php'; \$a->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo count(App\Domains\Identity\Support\PermissionCatalog::descriptions()), PHP_EOL;"
```

Esperado: `40`.

- [ ] **Step 8: Pint e commit**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Support/PermissionCatalog.php database/seeders/RolePermissionSeeder.php && cd ..
git add backend/app/Domains/Identity/Support/PermissionCatalog.php backend/database/seeders/RolePermissionSeeder.php frontend/src/shared/config/locales/en.json frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json
git commit -m "feat(identity): remove as permissões feedback.* órfãs do catálogo, do seeder e das locales"
```

---

### Task 3: Migration de limpeza das linhas já gravadas

O seeder só corrige quem o roda. Banco já provisionado guarda as duas linhas em `permissions` e o
vínculo em `role_has_permissions`. A migration é o único mecanismo que roda no deploy.

**Files:**
- Create: `backend/database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php`
- Test: `backend/tests/Feature/Identity/RemoveOrphanFeedbackPermissionsMigrationTest.php`

**Interfaces:**
- Consumes: `config('permission.table_names.permissions')` e
  `config('permission.column_names.role_pivot_key')` do spatie/laravel-permission.
- Produces: a migration anônima com `up()` e `down()`; o teste a instancia por `require` do arquivo,
  então o caminho e o formato de classe anônima importam.

- [ ] **Step 1: Escrever o teste primeiro**

Crie `backend/tests/Feature/Identity/RemoveOrphanFeedbackPermissionsMigrationTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * A migration é o único mecanismo que alcança banco já provisionado: o seeder
 * só corrige quem o roda. A suíte nasce com o banco limpo e com o catálogo já
 * sem as duas permissões, então a migration rodaria sobre o vazio e provaria
 * nada — por isso o teste RECRIA o estado legado (as duas linhas mais o vínculo
 * com a role `redator`) e executa `up()` diretamente sobre ele.
 */
class RemoveOrphanFeedbackPermissionsMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const ORFAS = ['feedback.feedback.view', 'feedback.feedback.manage'];

    private function migration(): object
    {
        return require base_path('database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php');
    }

    private function semearEstadoLegado(): Role
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $role = Role::firstOrCreate(['name' => 'redator', 'guard_name' => 'web']);

        foreach (self::ORFAS as $nome) {
            $permissao = Permission::firstOrCreate(['name' => $nome, 'guard_name' => 'web']);
            $role->givePermissionTo($permissao);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $role;
    }

    public function test_up_apaga_as_duas_linhas_e_o_vinculo_da_role(): void
    {
        $role = $this->semearEstadoLegado();

        $this->assertSame(2, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(2, DB::table('role_has_permissions')->where('role_id', $role->id)->count());

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(0, DB::table('role_has_permissions')->where('role_id', $role->id)->count());
    }

    public function test_up_nao_toca_nenhuma_outra_permissao(): void
    {
        $this->semearEstadoLegado();
        $outra = Permission::firstOrCreate(['name' => 'operation.turma.submit_docs', 'guard_name' => 'web']);

        $antes = Permission::count();

        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame($antes - 2, Permission::count());
        $this->assertDatabaseHas('permissions', ['id' => $outra->id, 'name' => 'operation.turma.submit_docs']);
    }

    public function test_up_e_idempotente(): void
    {
        $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->up();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(0, Permission::whereIn('name', self::ORFAS)->count());
    }

    public function test_down_recria_as_duas_linhas_sem_vinculo(): void
    {
        $role = $this->semearEstadoLegado();

        $this->migration()->up();
        $this->migration()->down();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertSame(2, Permission::whereIn('name', self::ORFAS)->count());
        $this->assertSame(0, DB::table('role_has_permissions')->where('role_id', $role->id)->count());
    }
}
```

- [ ] **Step 2: Rodar e verificar que falha por arquivo inexistente**

```bash
docker compose exec -T app php artisan test --filter=RemoveOrphanFeedbackPermissionsMigrationTest
```

Esperado: FAIL nos 4 testes, com `failed to open stream: No such file or directory` apontando
`2026_08_22_000001_remove_orphan_feedback_permissions.php`.

- [ ] **Step 3: Escrever a migration**

Crie `backend/database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * `feedback.feedback.view` e `feedback.feedback.manage` foram semeadas em
 * 2026-07 para um domínio que nunca existiu: RF-FBK-01/02/04 rodam como
 * documentação de turma (`files` + `TurmaDocumentType` + RN-16), e a decisão de
 * 2026-08-22 é que não haverá `Domains/Feedback` nem tabela `feedbacks`.
 *
 * O seeder já não as cria, mas seeder só corrige quem o roda: banco já
 * provisionado guarda a linha e o vínculo com a role `redator`. Escrita
 * destrutiva LIMITADA aos dois nomes literais — nenhuma outra permissão, role
 * ou usuário é tocado. O FK de `role_has_permissions` é `onDelete('cascade')`
 * (ver `create_permission_tables`), então o vínculo cai junto.
 *
 * `down()` recria as duas linhas, sem vínculo: reverter a migration não deve
 * devolver capacidade a role nenhuma.
 */
return new class extends Migration
{
    private const ORFAS = ['feedback.feedback.view', 'feedback.feedback.manage'];

    public function up(): void
    {
        DB::table(config('permission.table_names.permissions'))
            ->whereIn('name', self::ORFAS)
            ->where('guard_name', 'web')
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $tabela = config('permission.table_names.permissions');
        $agora = now();

        foreach (self::ORFAS as $nome) {
            $existe = DB::table($tabela)->where('name', $nome)->where('guard_name', 'web')->exists();

            if (! $existe) {
                DB::table($tabela)->insert([
                    'name' => $nome,
                    'guard_name' => 'web',
                    'created_at' => $agora,
                    'updated_at' => $agora,
                ]);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
```

- [ ] **Step 4: Rodar o teste**

```bash
docker compose exec -T app php artisan test --filter=RemoveOrphanFeedbackPermissionsMigrationTest
```

Esperado: **4 testes passando**.

- [ ] **Step 5: Confirmar que a cascata do FK é real (e não suposição)**

```bash
grep -n "onDelete\|cascade" backend/database/migrations/2026_07_05_171200_create_permission_tables.php | head
```

Esperado: pelo menos uma linha com `->onDelete('cascade')` na definição de `role_has_permissions`.
Se **não** houver cascata, o `test_up_apaga_as_duas_linhas_e_o_vinculo_da_role` terá reprovado no
Step 4 — nesse caso, acrescente ao `up()`, ANTES do delete de `permissions`, o delete explícito do
pivô:

```php
        $ids = DB::table(config('permission.table_names.permissions'))
            ->whereIn('name', self::ORFAS)
            ->where('guard_name', 'web')
            ->pluck('id');

        DB::table(config('permission.table_names.role_has_permissions'))
            ->whereIn(config('permission.column_names.permission_pivot_key', 'permission_id'), $ids)
            ->delete();
```

- [ ] **Step 6: Suíte inteira de backend**

```bash
docker compose exec -T app php artisan test
```

Esperado: zero falha. Registre a contagem (arquivos/testes) para o gate da Task 6.

- [ ] **Step 7: Pint e commit**

```bash
cd backend && ./vendor/bin/pint database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php tests/Feature/Identity/RemoveOrphanFeedbackPermissionsMigrationTest.php && cd ..
git add backend/database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php backend/tests/Feature/Identity/RemoveOrphanFeedbackPermissionsMigrationTest.php
git commit -m "feat(identity): migration apaga as permissões feedback.* dos bancos provisionados"
```

---

### Task 4: DER reconciliado com o que existe

**Files:**
- Modify: `docs/der-fisico.md:77-78` (seção `### Feedback`), `:89` (relações), `:111` (contagem)

**Interfaces:**
- Consumes: nada de código.
- Produces: o texto que a Task 6 cita ao escrever a nota do Drive.

- [ ] **Step 1: Ler o estado atual das três regiões**

```bash
sed -n '70,92p' docs/der-fisico.md
sed -n '105,115p' docs/der-fisico.md
```

- [ ] **Step 2: Substituir a seção `### Feedback`**

Troque o bloco

```markdown
### Feedback
- **feedbacks** — `id PK`, `turma_id FK`, `origem` (enum).
```

por

```markdown
### Feedback — sem tabela própria (decisão de 2026-08-22)

Não existe tabela `feedbacks` e não haverá na v2. RF-FBK-01/02/04 são atendidos pela documentação de
turma: `files` polimórfica sobre `turmas`, com `type` restrito por
`Operation\Enums\TurmaDocumentType` — `PRUEBAS` (avaliações dos alunos) e `EVALUACION_REDATOR`
(avaliação do próprio redator), ao lado de `MANUAL`. A exigência de completude antes de finalizar a
turma (RF-FBK-04) é a RN-16, em `ConcludeTurmaAction` sobre `TurmaHabilitacaoService`.

RF-FBK-03 — avaliação do cliente, cadastrada pelo admin ao final da ordem de serviço — segue
**futuro**, junto do resto de RF-TUR-07 (fatura final, comprovante de pagamento). Quando entrar,
entra pelo encerramento da OS, não pela turma.
```

- [ ] **Step 3: Corrigir a linha de relações**

Na linha que hoje termina com

```markdown
`turmas` 1:N → `enrollments`; e (planejada) `feedbacks`.
```

remova o trecho ` e (planejada) `feedbacks`` — a frase passa a terminar em
`` `turmas` 1:N → `enrollments`. ``

- [ ] **Step 4: Corrigir a contagem de tabelas**

Na linha 111, `feedbacks` aparece na lista das que existem "no papel". Remova-a e ajuste o número
declarado na mesma frase (uma a menos). Confira que o número bate:

```bash
grep -n "no papel" docs/der-fisico.md
grep -rn "feedbacks" docs/der-fisico.md
```

Esperado ao fim: o segundo `grep` só devolve linhas da seção nova (que fala de não existir tabela), e
nenhuma que a declare como schema planejado.

- [ ] **Step 5: Commit**

```bash
git add docs/der-fisico.md
git commit -m "docs(der): feedback não vira tabela — RF-FBK mapeado para documentação de turma"
```

---

### Task 5: DoD provado contra a API real e o banco de dev

Nenhum passo desta task é opcional, e nenhum é substituível por "a suíte passou". A suíte roda em
sqlite `:memory:` com o catálogo já limpo; o que se prova aqui é o **banco de dev**, o **endpoint** e
a **tela**.

**Files:**
- Nenhum arquivo de código. Produz o registro das medições para o fechamento.

**Interfaces:**
- Consumes: tudo das Tasks 2 e 3.
- Produces: os números que a Task 6 escreve no `progress.md` e a Task 7 cita nas notas externas.

- [ ] **Step 1: Subir o stack e medir o estado ANTES da migration**

```bash
docker compose up -d
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT name FROM permissions WHERE name LIKE 'feedback%'; SELECT COUNT(*) AS total FROM permissions;"
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT p.name FROM role_has_permissions rp JOIN permissions p ON p.id=rp.permission_id JOIN roles r ON r.id=rp.role_id WHERE r.name='redator';"
```

> Se o usuário/senha do MySQL divergirem, leia-os de `backend/.env` (`DB_USERNAME`, `DB_PASSWORD`,
> `DB_DATABASE`) antes de rodar — não adivinhe.

Esperado ANTES: as duas linhas `feedback.*` presentes; a role `redator` com **4** permissões.
Registre `total`.

- [ ] **Step 2: Rodar a migration no banco de dev**

```bash
docker compose exec -T app php artisan migrate
```

Esperado: a migration `2026_08_22_000001_remove_orphan_feedback_permissions` executada.

- [ ] **Step 3: Medir o estado DEPOIS**

```bash
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT COUNT(*) AS orfas FROM permissions WHERE name LIKE 'feedback%'; SELECT COUNT(*) AS total FROM permissions;"
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT p.name FROM role_has_permissions rp JOIN permissions p ON p.id=rp.permission_id JOIN roles r ON r.id=rp.role_id WHERE r.name='redator';"
```

Esperado: `orfas = 0`; `total` = o do Step 1 menos 2; role `redator` com exatamente
`operation.turma.view` e `operation.turma.submit_docs`.

- [ ] **Step 4: Provar o `down()` no banco de dev e voltar**

```bash
docker compose exec -T app php artisan migrate:rollback --step=1
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT name FROM permissions WHERE name LIKE 'feedback%';"
docker compose exec -T app php artisan migrate
docker compose exec -T mysql mysql -ulotus -plotus lotus -e "SELECT COUNT(*) AS orfas FROM permissions WHERE name LIKE 'feedback%';"
```

Esperado: rollback devolve as 2 linhas; `migrate` as remove de novo (`orfas = 0`). O banco termina no
estado limpo.

- [ ] **Step 5: Endpoint real**

Autentique como admin em `http://localhost:8080` (cookie de sessão Sanctum — use o fluxo do
navegador ou `curl` com `/sanctum/csrf-cookie` + `/login`, jamais token) e chame:

```bash
GET http://localhost:8080/api/permissions
```

Esperado: nenhum item cujo `name` comece por `feedback.`; a contagem de itens bate com a do Step 3
(`total` do banco) e com as **40** do catálogo.

- [ ] **Step 6: A capacidade real do redator continua de pé**

Com uma sessão de **redator ativo**, faça o upload de um documento de turma (a ação guardada por
`operation.turma.submit_docs`) por uma turma em andamento que ele ministre, e confirme:

1. o payload de permissões da sessão traz **2** entradas, ambas `operation.turma.*`;
2. o `POST` de documento de turma responde 2xx e o arquivo aparece na turma.

Esta é a prova de que a remoção não tirou capacidade em uso. Se não houver redator ativo no banco de
dev, **pare e pergunte ao João** — ativar conta é decisão dele (RN-01), não do bloco. Depois da
prova, apague o documento de sonda pela própria tela e confirme que a turma volta ao estado anterior
(P-44: gate não deixa resíduo).

- [ ] **Step 7: Picker de permissões no navegador, 3 idiomas**

Em `/administracion`, abra a tela de roles/permissões e percorra `es-CL`, `en` e `pt-BR` trocando o
idioma pelo menu, sem F5:

- nenhum grupo `Feedback` / `Retroalimentación`;
- nenhum item de feedback;
- nenhuma chave crua (`perm.` ou `permGroup.` visíveis na tela).

- [ ] **Step 8: Registrar as medições**

Anote, para o fechamento: `total` de permissões antes/depois, permissões da role `redator`
antes/depois, resultado do rollback, contagem do endpoint, resultado do upload do redator e as três
telas do picker.

- [ ] **Step 9: Commit (só se algo de arquivo mudou)**

Se esta task não alterou arquivo algum — o esperado —, não há commit. Não crie commit vazio.

---

### Task 6: Gate do bloco

**Files:**
- Modify: `docs/superpowers/historico/progress.md` (linha nova da entrega)

- [ ] **Step 1: Catracas**

```bash
docker compose exec -T app php artisan test
cd frontend && pnpm lint && pnpm build && pnpm test; cd ..
```

Esperado: backend zero falha; `pnpm lint` exit 0; build verde; `pnpm test` zero falha. Registre as
contagens.

- [ ] **Step 2: Pint em tudo que o bloco tocou**

```bash
cd backend && ./vendor/bin/pint app/Domains/Identity/Support/PermissionCatalog.php database/seeders/RolePermissionSeeder.php database/migrations/2026_08_22_000001_remove_orphan_feedback_permissions.php tests/Feature/Identity/PermissionI18nParityTest.php tests/Feature/Identity/RemoveOrphanFeedbackPermissionsMigrationTest.php && cd ..
```

Esperado: `PASS`.

- [ ] **Step 3: Provar que `generated.ts` não tem drift**

```bash
docker compose exec -T app php artisan typescript:transform
git status --porcelain frontend/src/shared/types/generated.ts
```

Esperado: `git status` **sem saída** — nenhum DTO mudou, o catálogo é dado, não tipo. Se houver
diff, ele entra no commit do gate (lei §5.3: corrige-se o DTO e regenera, nunca o arquivo à mão).

- [ ] **Step 4: Medir o escopo tocado**

```bash
git diff main...HEAD --name-only
```

Esperado: exatamente os arquivos das Tasks 1 a 4, mais este commit. Nenhum arquivo de
`app/Domains/Operation/`, nenhum `TurmaDocumentType`.

- [ ] **Step 5: Escrever a linha do `progress.md`**

Acrescente uma linha à tabela, no formato das existentes (data, entrega, status, resultado com os
números medidos na Task 5, referências ao plano/spec/packet e à faixa de commits).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/historico/progress.md
git commit -m "docs(progress): registra a entrega de feedbacks-resolver-escopo"
```

---

### Task 7: Registro externo (Drive e Notion), com OK do João por documento

O DoD do item é "requisito, planejamento e código deixam de divergir". Requisito mora fora do repo.

**Files:**
- Nenhum arquivo local. Três escritas externas, cada uma precedida de aprovação explícita.

- [ ] **Step 1: Redigir os três textos e MOSTRAR ao João antes de qualquer escrita**

Redija, sem escrever ainda:

1. **Drive `requisitos-negocio.md`** (lido em `17l0yDorx7RtjtaaWRjep3_xYINLpBm1J`; recriado como
   `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`) — nota de estado sob a
   seção RF-FBK: 01/02/04 implementados como documentação de turma (`files` +
   `MANUAL`/`PRUEBAS`/`EVALUACION_REDATOR` + gate RN-16); **03 segue futuro**, junto de RF-TUR-07. O
   requisito não é apagado nem reescrito — ganha estado, datado 2026-08-22.
2. **Drive `entidade-feedback.md`** (lido em `11wSCY7J7yUEptJgjtSdRkiUuX6UttuGZ`; recriado como
   `16YxxQ52VnEeoah_SCja6TubnvtOtMDql`) — a entidade não vira
   tabela na v2; o `[A CONFIRMAR]` sobre referência ao autor individual se resolve por inexistência:
   o documento pertence à turma, e a origem é o `type` do arquivo.
3. **Notion 7.4.1** (`39dbc960-3dfa-81ef-ad6f-d908331d5059`) — status **`Done`**, com o mesmo resumo
   e ponteiro para `docs/superpowers/specs/2026-08-22-feedbacks-resolver-escopo-design.md`.

- [ ] **Step 2: Escrever no Drive `requisitos-negocio.md` — só após OK explícito**

Aprovação é por documento. Sem OK, não escreva; siga para o próximo e registre o que ficou pendente.

- [ ] **Step 3: Escrever no Drive `entidade-feedback.md` — só após OK explícito**

- [ ] **Step 4: Atualizar o Notion 7.4.1 para `Done` — só após OK explícito**

- [ ] **Step 5: Registrar os IDs e o resultado**

Anote quais dos três foram efetivamente escritos e quais ficaram pendentes de decisão. Se algum ficar
de fora, ele é limitação declarada do bloco — não se omite no fechamento.

---

## Handoff de execução

`executor: claude`

Motivo: o bloco toca RBAC (as leis §5.4 e §5.5 vivem na vizinhança), escreve migration destrutiva
sobre `permissions` e decide texto de documento canônico externo. A Task 5 depende de julgamento
fora do plano — sessão de redator ativo esbarra na RN-01, e a decisão de ativar conta é do João. A
Task 7 exige aprovação humana documento a documento. Nada disso cabe no critério de task mecânica com
paths fechados.
