# Revisão de UI por módulo — fatia 2 (item 16) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** passar Comercial e Certificados pela rubrica de revisão de UI com relatório datado e zero
achado `C` aberto, e pagar as três dívidas que a fatia 1 deixou nomeadas — D-57 (o enum que atravessa
o contrato como `string`), os Minors 2/3/5 do review da Task 9 e as fichas que a Task 12 nunca
escreveu.

**Architecture:** o bloco tem duas metades que não se misturam. A primeira é **contrato**: o tipo de
documento de turma vira enum de verdade da origem (`TurmaHabilitacaoService`) até o `generated.ts`,
e o helper do frontend perde o fallback que só existia porque o `tsc` não alcançava o call site. A
segunda é **tela**: três correções de wrapper que a fatia 1 mediu e não aplicou, depois duas runs de
`/lotus-ui-review` em série — run, correção dos `C`, próxima run —, cada achado corrigido no wrapper
quando o wrapper é o dono.

**Tech Stack:** Laravel 13 / PHP 8.3 (`spatie/laravel-data` + `typescript-transformer`), React 19 +
TS (Vite), PrimeReact via `shared/ui`, Tailwind v4, Vitest + Testing Library, PHPUnit, Playwright CLI
(pela skill `/lotus-ui-review`).

## Global Constraints

- **Lei §5.3 — `generated.ts` não se edita à mão.** Corrige-se o DTO e regenera-se com
  `docker compose exec -T app php artisan typescript:transform`.
- **Lei §5.6 — features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature**.
- **Achado de wrapper corrige-se no wrapper**, nunca no call site: alcança todo consumidor futuro.
- **Quem classifica achado é `references/review-rubric.md`** da skill `/lotus-ui-review`.
  `frontend-design` é lente complementar; em conflito com uma rule de `.claude/rules/`, **a rule
  vence e o conflito é avisado ao João**.
- **Backend roda no container**: `docker compose exec -T app php artisan ...`. **Pint roda no host**,
  de dentro de `backend/`, **sempre com argumento**: `./vendor/bin/pint <arquivos>`.
- **Esta árvore usa offset +2** de portas (Task 1). Todo comando que fale com a API usa
  `http://localhost:8082`; o Vite serve em `http://localhost:5175`.
- **Um commit por entrega.** Correção de achado de run = um commit, com o identificador do achado no
  assunto.
- **Baseline da branch, medida antes de qualquer mudança** (Task 1, Step 6): guarde os números; o
  gate final (Task 13) compara contra eles.

---

## File Structure

**Backend (D-57):**
- `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php` — passa a projetar
  `TurmaDocumentType::cases()`.
- `backend/app/Domains/Operation/Services/HabilitacaoStatus.php` — o VO carrega `TurmaDocumentType[]`.
- `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php` — consumidor: mensagem de recusa.
- `backend/app/Domains/Operation/Data/TurmaData.php` — `missing_document_types`.
- `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php` — consumidor: `present_types`,
  `missing_types` e o `implode` da frase de pendência.
- `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php` — consumidor.
- `backend/app/Domains/Dashboard/Data/RedatorTurmaPendenciaData.php`,
  `backend/app/Domains/Dashboard/Data/TurmaComplianceData.php` — os DTOs.

**Frontend (contrato + wrappers):**
- `frontend/src/shared/types/generated.ts` — **regenerado, nunca editado**.
- `frontend/src/shared/lib/turmaDocumentType.ts` — o helper perde o fallback.
- `frontend/src/shared/ui/AppDataTable/style.ts` — `stickyActionsColumn` e o `pt` do wrapper.
- `frontend/src/shared/styles/brand-theme.css` — a contraparte CSS do hover e da sombra.
- `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx` — o slot `actions`.
- `frontend/src/features/commercial/components/CommercialPage.tsx`,
  `frontend/src/features/certification/components/CertificatesPage.tsx` — `scrollable` medido.

**Documentação:**
- `docs/superpowers/audits/2026-08-25-lotus-ui-review-comercial.md`
- `docs/superpowers/audits/2026-08-25-lotus-ui-review-certificados.md`
- `docs/superpowers/backlog.md` — fichas `D-38`, a nova de `Turma.php:200`, e a baixa da `D-57`.

---

### Task 1: Árvore em offset +2, com stack no ar e baseline medida

Sem isto nada mais roda: esta árvore não tem `.env`, disputa a porta 8080 do main tree, e a imagem
`app` dela é anterior ao `memory-cli.ini` (P-57).

**Files:**
- Create: `.env` (raiz, gitignored)
- Modify: `frontend/.env` (gitignored)

**Interfaces:**
- Produces: stack em `http://localhost:8082` (API) e `http://localhost:5175` (Vite); os números de
  baseline que a Task 13 compara.

- [ ] **Step 1: Criar o `.env` da raiz com o offset +2**

Offsets em uso: `+0` no main tree (`/home/jvbat/projetos/lotus`), `+1` em `../lotus-infra`.

```bash
cd /home/jvbat/projetos/fix-frontend
cp .env.example .env
sed -i 's/^LOTUS_DEV_HTTP_PORT=.*/LOTUS_DEV_HTTP_PORT=8082/;
        s/^LOTUS_DEV_DB_PORT=.*/LOTUS_DEV_DB_PORT=3309/;
        s/^LOTUS_DEV_MAILPIT_PORT=.*/LOTUS_DEV_MAILPIT_PORT=8027/;
        s/^LOTUS_DEV_MINIO_PORT=.*/LOTUS_DEV_MINIO_PORT=9004/;
        s/^LOTUS_DEV_MINIO_CONSOLE_PORT=.*/LOTUS_DEV_MINIO_CONSOLE_PORT=9005/;
        s/^LOTUS_DEV_VITE_PORT=.*/LOTUS_DEV_VITE_PORT=5175/' .env
grep '^LOTUS_DEV' .env
```

Esperado: as seis linhas com 8082 / 3309 / 8027 / 9004 / 9005 / 5175.

- [ ] **Step 2: Adotar o molde do `frontend/.env` (P-58)**

O arquivo atual carrega `VITE_API_URL` legado, e `tests/compose-dev.test.ts` não o afasta — são os 3
casos que reprovaram no fechamento do item 17.

```bash
cd /home/jvbat/projetos/fix-frontend
cp frontend/.env.example frontend/.env
cat frontend/.env
```

Esperado: nenhuma linha `VITE_API_URL=` ativa (o `vite.config.ts` deriva a URL do `.env` da raiz).

- [ ] **Step 3: Reconstruir a imagem `app` desta árvore (P-57)**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose build app
docker compose up -d
docker compose ps --format '{{.Service}}\t{{.Ports}}'
```

Esperado: `nginx` publicando `8082->80`, `mysql` `3309->3306`, `minio` `9004`/`9005`. Nenhum
"port is already allocated".

- [ ] **Step 4: Provar a API e o banco de dev**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan db:seed --force
```

Esperado: `200` no `/up`; migrations e seed terminando sem erro.

- [ ] **Step 5: Subir o Vite**

```bash
pnpm install --frozen-lockfile && pnpm dev
```

Esperado: `Local: http://localhost:5175/`. Deixe rodando em background para as runs.

- [ ] **Step 6: Medir a baseline e ANOTAR os números**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm lint; pnpm build; pnpm test 2>&1 | tail -5
cd /home/jvbat/projetos/fix-frontend && docker compose exec -T app php artisan test 2>&1 | tail -5
```

Anote: lint (exit code), build (exit code), `pnpm test` (N arquivos / N testes) e a suíte do backend
(N passed / N skipped). **Estes são os números que a Task 13 compara.** Se `pnpm test` reprovar aqui,
a falha é herdada e precisa ser nomeada antes de seguir — não misture com o que este bloco causa.

- [ ] **Step 7: Commit**

`.env` e `frontend/.env` são gitignored — não há o que commitar. Registre os números da baseline na
descrição do próximo commit. Confirme que a árvore segue limpa:

```bash
cd /home/jvbat/projetos/fix-frontend && git status --short
```

Esperado: saída vazia.

---

### Task 2: D-57 no domínio — a cadeia da RN-16 passa a carregar o enum

**Files:**
- Modify: `backend/app/Domains/Operation/Services/TurmaHabilitacaoService.php:25-32`
- Modify: `backend/app/Domains/Operation/Services/HabilitacaoStatus.php:19-33`
- Modify: `backend/app/Domains/Operation/Actions/ConcludeTurmaAction.php:32`
- Test: `backend/tests/Unit/Operation/TurmaHabilitacaoServiceTest.php` (ou o arquivo existente que
  cobre o serviço — localize com o comando do Step 1)

**Interfaces:**
- Produces: `HabilitacaoStatus::missingTypes(): array<TurmaDocumentType>` — a Task 3 consome esta
  assinatura nos DTOs e nas duas queries do Dashboard.

- [ ] **Step 1: Localizar a cobertura existente**

```bash
cd /home/jvbat/projetos/fix-frontend/backend
grep -rln "TurmaHabilitacaoService\|HabilitacaoStatus" tests/
```

Use o arquivo que aparecer. Se não houver nenhum, crie
`tests/Unit/Operation/TurmaHabilitacaoServiceTest.php` com o namespace `Tests\Unit\Operation`.

- [ ] **Step 2: Escrever o teste que reprova**

Acrescente ao arquivo localizado (ajuste o `use` do namespace conforme o arquivo):

```php
public function test_missing_types_devolve_casos_do_enum_e_nao_strings(): void
{
    $turma = Turma::factory()->create(['status' => TurmaStatus::EmAndamento]);

    $missing = app(TurmaHabilitacaoService::class)->for($turma)->missingTypes();

    $this->assertCount(3, $missing);
    $this->assertContainsOnlyInstancesOf(TurmaDocumentType::class, $missing);
    $this->assertSame(
        [TurmaDocumentType::MANUAL, TurmaDocumentType::PRUEBAS, TurmaDocumentType::EVALUACION_REDATOR],
        $missing,
    );
}
```

- [ ] **Step 3: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan test --filter=missing_types_devolve_casos_do_enum
```

Esperado: FAIL — `assertContainsOnlyInstancesOf` recusa as strings `'MANUAL'`, `'PRUEBAS'`,
`'EVALUACION_REDATOR'`.

- [ ] **Step 4: Trocar a projeção no serviço**

Em `TurmaHabilitacaoService.php`, o corpo de `for()` passa a ser:

```php
    public function for(Turma $turma): HabilitacaoStatus
    {
        $present = $turma->documentacaoObrigatoria->pluck('type')->unique()->all();

        // Filtrar `cases()` e não `array_diff` sobre `values()`: a diferença é o
        // TIPO do que sai — o VO carrega o enum, e a coluna `type` da `files`
        // continua sendo string livre, que é contra o que se compara.
        $missing = array_values(array_filter(
            TurmaDocumentType::cases(),
            fn (TurmaDocumentType $case): bool => ! in_array($case->value, $present, true),
        ));

        return new HabilitacaoStatus($turma->status, $missing);
    }
```

- [ ] **Step 5: Tipar o VO**

Em `HabilitacaoStatus.php`, troque as duas anotações e acrescente o `use`:

```php
use App\Domains\Operation\Enums\TurmaDocumentType;
```

```php
    /** @param  array<TurmaDocumentType>  $missingTypes  tipos obrigatórios sem doc ativo. */
    public function __construct(
        private readonly TurmaStatus $status,
        private readonly array $missingTypes,
    ) {}
```

```php
    /** @return array<TurmaDocumentType> */
    public function missingTypes(): array
    {
        return $this->missingTypes;
    }
```

`isHabilitada()` não muda: compara com `[]`, que independe do que o array carrega.

- [ ] **Step 6: Consertar o consumidor da mensagem de recusa**

`ConcludeTurmaAction.php:32` recebe o array e monta texto. Localize o uso de `$missing` logo abaixo e
projete o valor:

```bash
cd /home/jvbat/projetos/fix-frontend/backend
sed -n '25,50p' app/Domains/Operation/Actions/ConcludeTurmaAction.php
```

Onde a linha imprimir os tipos, troque `$missing` por `array_column($missing, 'value')` — mantendo
`implode` e a mensagem exatamente como estão. A mensagem visível ao usuário **não muda**; se mudar, o
teste que a cobre reprova e isso é a detecção.

- [ ] **Step 7: Rodar o teste novo e a suíte de Operation**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan test --filter=missing_types_devolve_casos_do_enum
docker compose exec -T app php artisan test --filter=Operation
```

Esperado: o teste novo PASS; a suíte de Operation sem regressão. Falha em `ConcludeTurmaAction`
significa que o Step 6 não alcançou todos os usos — leia a mensagem e corrija.

- [ ] **Step 8: Pint e commit**

```bash
cd /home/jvbat/projetos/fix-frontend/backend
./vendor/bin/pint app/Domains/Operation/Services/TurmaHabilitacaoService.php \
  app/Domains/Operation/Services/HabilitacaoStatus.php \
  app/Domains/Operation/Actions/ConcludeTurmaAction.php \
  tests/Unit/Operation/TurmaHabilitacaoServiceTest.php
cd /home/jvbat/projetos/fix-frontend
git add backend/
git commit -m "fix(operation): D-57 faz a cadeia da RN-16 carregar TurmaDocumentType

O VO da habilitacao devolvia array<string> porque o servico projetava
::values(). Filtrar ::cases() mantem o enum ate a borda e e o que permite
os DTOs tiparem o contrato na task seguinte."
```

---

### Task 3: D-57 no contrato — os quatro campos e o helper sem fallback

**Files:**
- Modify: `backend/app/Domains/Dashboard/Data/RedatorTurmaPendenciaData.php:15-17`
- Modify: `backend/app/Domains/Dashboard/Data/TurmaComplianceData.php` (os campos `missing_types` e
  `present_types`)
- Modify: `backend/app/Domains/Operation/Data/TurmaData.php:38`
- Modify: `backend/app/Domains/Dashboard/Services/OperationMetricsQuery.php:104-108,133-137`
- Modify: `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php:108,115`
- Modify: `frontend/src/shared/types/generated.ts` (**regenerado**)
- Modify: `frontend/src/shared/lib/turmaDocumentType.ts:20-45`
- Test: `frontend/src/shared/lib/turmaDocumentType.test.ts`

**Interfaces:**
- Consumes: `HabilitacaoStatus::missingTypes(): array<TurmaDocumentType>` (Task 2).
- Produces: `turmaDocumentTypeLabel(type: TurmaDocumentType, t): string` e
  `turmaDocumentTypeList(types: TurmaDocumentType[], t): string` — sem fallback de código cru.

- [ ] **Step 1: Tipar os três DTOs com o enum**

Em `RedatorTurmaPendenciaData.php`, acrescente o `use` e troque a anotação:

```php
use App\Domains\Operation\Enums\TurmaDocumentType;
```

```php
        /** @var TurmaDocumentType[] */
        public array $missing_types,
```

Faça o mesmo em `TurmaComplianceData.php` para `missing_types` **e** `present_types` (a spec decidiu
que o irmão entra junto — deixar um campo enum ao lado de um `string[]` seria a divergência com outro
nome), e em `TurmaData.php:38` para `missing_document_types`, que é `array|Optional`:

```php
        /** @var TurmaDocumentType[]|Optional */
        public array|Optional $missing_document_types,
```

- [ ] **Step 2: Consertar os produtores do Dashboard**

Em `OperationMetricsQuery.php`, `present_types` projeta `::values()` filtrado — passa a projetar
casos:

```php
                    present_types: array_values(array_filter(
                        TurmaDocumentType::cases(),
                        fn (TurmaDocumentType $case): bool => in_array($case->value, $present, true),
                    )),
```

E a frase de pendência (`:137`) projeta o valor, porque ali o dado vira TEXTO:

```php
                    'Documentación obligatoria incompleta: '
                        .implode(', ', array_column($status->missingTypes(), 'value')).'.',
```

Em `RedatorScopeQuery.php:108,115` o array só atravessa — nada a projetar. Confirme lendo:

```bash
cd /home/jvbat/projetos/fix-frontend/backend && sed -n '100,120p' app/Domains/Dashboard/Services/RedatorScopeQuery.php
```

- [ ] **Step 3: Rodar a suíte do Dashboard**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan test --filter=Dashboard
```

Esperado: PASS. A frase de pendência não pode ter mudado — se um teste a compara e reprova, o
`array_column` do Step 2 não foi aplicado.

- [ ] **Step 4: Regenerar o `generated.ts` (lei §5.3)**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
grep -n "missing_types\|missing_document_types\|present_types" frontend/src/shared/types/generated.ts
```

Esperado: os quatro campos passam a dizer `TurmaDocumentType[]`. Nenhum `string[]` sobra entre eles.

- [ ] **Step 5: Ver o `tsc` reprovar o helper**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm build
```

Esperado: **PASS** — e isso é o problema, não o alívio: `turmaDocumentTypeLabel(type: string)` aceita
`TurmaDocumentType` por subtipagem. O fallback continua morto-vivo. O Step 6 é o que o mata.

- [ ] **Step 6: Escrever o teste que exige o parâmetro estreito**

Em `frontend/src/shared/lib/turmaDocumentType.test.ts`, acrescente:

```ts
it('nao aceita codigo fora do enum — o compilador barra antes da tela', () => {
  // @ts-expect-error o contrato entrega TurmaDocumentType; string crua nao entra mais.
  turmaDocumentTypeLabel('TIPO_INVENTADO', (key: string) => key)
})
```

- [ ] **Step 7: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm build
```

Esperado: FAIL com `Unused '@ts-expect-error' directive` — o parâmetro ainda é `string`, então não há
erro para a diretiva suprimir. É exatamente a reprovação que se quer.

- [ ] **Step 8: Estreitar o helper e apagar o fallback**

Em `turmaDocumentType.ts`, as duas funções passam a ser:

```ts
/**
 * Rótulo traduzido de um tipo de documento de turma.
 *
 * Recebe `TurmaDocumentType` e não `string`: desde a D-57 (2026-08-25) o
 * contrato entrega o enum — `RedatorTurmaPendenciaData.missing_types`,
 * `TurmaComplianceData.missing_types`/`present_types` e
 * `TurmaData.missing_document_types` são `TurmaDocumentType[]` no
 * `generated.ts`. O fallback `? key : type` que existia aqui era a compensação
 * de o `tsc` não alcançar o call site; com o parâmetro estreito, tipo novo no
 * union não compila até ganhar entrada no mapa, e não há mais como um código
 * cru chegar à tela.
 *
 * Recebe `t` por parâmetro e mora em `shared/lib`, que não conhece i18next —
 * mesma disciplina do `loadMessage`.
 */
export function turmaDocumentTypeLabel(type: TurmaDocumentType, t: (key: string) => string): string {
  return t(TURMA_DOCUMENT_TYPE_KEY[type])
}

/** Os tipos que faltam, em uma linha só. Duas telas do dashboard imprimem esta
 * mesma lista — o separador é um, não dois. */
export function turmaDocumentTypeList(types: TurmaDocumentType[], t: (key: string) => string): string {
  return types.map((type) => turmaDocumentTypeLabel(type, t)).join(', ')
}
```

Ajuste também o docblock do `TURMA_DOCUMENT_TYPE_KEY`, que hoje descreve o contrato antigo.

- [ ] **Step 9: Rodar build, testes e lint**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm build && pnpm test && pnpm lint
```

Esperado: os três verdes. Se algum call site quebrar (`PendenciasList.tsx:75`,
`CompliancePanel.tsx:83`, `useConclusionSection.ts:24`), ele estava passando `string` — corrija o
tipo do dado na origem, nunca alargando o helper de volta.

- [ ] **Step 10: Pint e commit**

```bash
cd /home/jvbat/projetos/fix-frontend/backend
./vendor/bin/pint app/Domains/Dashboard/Data/RedatorTurmaPendenciaData.php \
  app/Domains/Dashboard/Data/TurmaComplianceData.php \
  app/Domains/Operation/Data/TurmaData.php \
  app/Domains/Dashboard/Services/OperationMetricsQuery.php \
  app/Domains/Dashboard/Services/RedatorScopeQuery.php
cd /home/jvbat/projetos/fix-frontend
git add backend/ frontend/src/shared/types/generated.ts frontend/src/shared/lib/turmaDocumentType.ts frontend/src/shared/lib/turmaDocumentType.test.ts
git commit -m "fix(contract): D-57 tipa os quatro campos com TurmaDocumentType

Os tres campos da ficha mais present_types, que e o mesmo defeito no
mesmo DTO. generated.ts regenerado por typescript:transform (lei 5.3).

O helper passa a receber o enum e perde o fallback: ele existia so
porque o tsc nao alcancava o call site, e agora alcanca."
```

---

### Task 4: Minor 2 — o realce de hover alcança a coluna de ações presa

A coluna presa pinta `--surface-card` opaco por `style` inline, e inline vence qualquer regra: passar
o mouse tinge a linha e a coluna de ações fica branca. Deixou de ser defeito de uma tabela — o item
17 espalhou a coluna presa para 12.

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts:149-158` (`stickyActionsColumn`)
- Modify: `frontend/src/shared/styles/brand-theme.css` (acrescenta regra no fim do bloco de tabela)
- Test: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`

**Interfaces:**
- Produces: `stickyActionsColumn(width)` com `background: 'var(--sticky-cell-bg, var(--surface-card))'`
  — a Task 5 acrescenta a sombra ao mesmo objeto.

- [ ] **Step 1: Colher as duas cores que o Lara aplica no hover**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
grep -A 2 "hoverable-rows .p-datatable-tbody > tr:not" src/shared/styles/themes/lara-light-lotus.css
grep -A 2 "hoverable-rows .p-datatable-tbody > tr:not" src/shared/styles/themes/lara-dark-lotus.css
```

Esperado: `#f1f5f9` no claro e `rgba(255, 255, 255, 0.03)` no escuro. **Use esses valores literais**
nos dois blocos do Step 4 — inventar um token equivalente faria a célula presa divergir da linha em
um dos temas.

- [ ] **Step 2: Escrever o teste que reprova**

```tsx
it('a coluna de acoes presa le a cor da linha por variavel, e nao um fundo cravado', () => {
  const style = stickyActionsColumn('8rem')

  expect(style.background).toBe('var(--sticky-cell-bg, var(--surface-card))')
})
```

Importe `stickyActionsColumn` de `./style` no topo do arquivo de teste, se ainda não estiver.

- [ ] **Step 3: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado: FAIL — recebido `var(--surface-card)`.

- [ ] **Step 4: Trocar o fundo por variável e dar a ela um valor no hover**

Em `style.ts`, dentro de `stickyActionsColumn`:

```ts
    background: 'var(--sticky-cell-bg, var(--surface-card))',
```

E acrescente ao docblock da função, logo abaixo do parágrafo que começa em "O fundo é obrigatório":

```
 * O fundo vem de `--sticky-cell-bg` e não da cor direta porque `style` inline
 * vence QUALQUER regra: com `--surface-card` cravado aqui, o hover da linha
 * tingia as outras células e parava na coluna presa (Minor 2 do review da
 * fatia 1). Custom property herda, então a regra de `:hover` em
 * `brand-theme.css` redefine a variável na `tr` e o valor chega ao `td` sem
 * disputar especificidade com o inline. O fallback mantém a cor do card fora
 * do hover.
```

Em `brand-theme.css`, logo depois da regra `.p-datatable .p-datatable-tbody > tr { background: transparent; }`:

```css
/* Minor 2 do review da fatia 1 do item 16: a coluna de ações presa
 * (`stickyActionsColumn`) pinta fundo próprio por `style` inline, e inline vence
 * qualquer regra — o hover tingia a linha e morria na coluna presa, que é
 * justamente onde o olho vai clicar.
 *
 * O seletor é o MESMO do Lara, repetido aqui de propósito: esta folha é
 * importada fora de layer (`index.css:28`) e o tema inteiro vive em
 * `@layer primereact`, então declaração sem layer vence a layer independente de
 * especificidade. Redefinimos a custom property, que HERDA e chega ao `td` sem
 * disputar com o inline, e repintamos a linha com a mesma cor para não depender
 * de qual regra ganhou.
 *
 * As cores são as literais do tema (`#f1f5f9` claro, `rgba(255,255,255,.03)`
 * escuro) e não um token aproximado: célula presa com cor diferente da linha
 * seria o mesmo defeito com outro tom. */
.p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):not(.p-datatable-emptymessage):hover {
  --sticky-cell-bg: #f1f5f9;
  background: var(--sticky-cell-bg);
}

:root[data-theme='dark'] .p-datatable.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):not(.p-datatable-emptymessage):hover {
  --sticky-cell-bg: rgba(255, 255, 255, 0.03);
}
```

**Confirme o seletor do tema escuro antes de escrever**: veja como o projeto alterna tema —

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
grep -rn "data-theme\|dark" src/shared/styles/brand-theme.css | head -5
```

Se o projeto alternar por outro mecanismo (troca do `<link>` do tema, por exemplo), o segundo bloco
não é necessário: cada tema traz a própria cor e basta a regra do claro apontar para uma variável que
o tema define. Siga o que a medição mostrar, e registre a escolha no comentário.

- [ ] **Step 5: Rodar o teste**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado: PASS.

- [ ] **Step 6: Provar na tela — a suíte não mede cor**

Com a stack de pé (Task 1), abra `http://localhost:5175/operacion` como admin, passe o mouse sobre
uma linha da tabela de turmas e confirme, nos dois temas, que a coluna de ações escurece junto com o
resto da linha. Faça o mesmo em `/cursos`, que é outra tabela com ação presa. **Guarde as capturas**
para a §3 do relatório da Task 8.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/AppDataTable/style.ts frontend/src/shared/styles/brand-theme.css frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx
git commit -m "fix(ui): Minor 2 — hover da linha alcanca a coluna de acoes presa

O fundo inline da celula presa vencia a regra de hover do tema. Trocado
por custom property, que herda da tr e nao disputa com o inline.

Vale para as 12 tabelas que prendem a acao desde o item 17, e nao so
para a TurmasTable onde o achado apareceu."
```

---

### Task 5: Minor 3 — a sombra de rolagem reaparece sob a coluna presa

A sombra que anuncia rolagem horizontal é pintada pelo FUNDO do invólucro (`backgroundAttachment:
scroll`), e a coluna presa flutua por cima dela em `zIndex: 1`. Resultado: do lado direito, o
anúncio de "há mais coluna escondida" some exatamente nas tabelas que mais rolam.

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts` (`stickyActionsColumn`)
- Test: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`

**Interfaces:**
- Consumes: `stickyActionsColumn(width)` na forma que a Task 4 deixou.
- Produces: o mesmo objeto acrescido de `boxShadow`.

- [ ] **Step 1: Escrever o teste que reprova**

```tsx
it('a coluna presa desenha a propria sombra, porque cobre a do involucro', () => {
  const style = stickyActionsColumn('8rem')

  expect(style.boxShadow).toBe(
    '-1rem 0 1rem -1rem color-mix(in srgb, var(--text-color) 22%, transparent)',
  )
})
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado: FAIL — recebido `undefined`.

- [ ] **Step 3: Acrescentar a sombra à coluna presa**

Em `stickyActionsColumn`, depois de `borderLeft`:

```ts
    boxShadow: '-1rem 0 1rem -1rem color-mix(in srgb, var(--text-color) 22%, transparent)',
```

E ao docblock da função:

```
 * A sombra é PRÓPRIA, e não a do invólucro: aquela é pintada pelo fundo do
 * `wrapper` com `background-attachment: scroll`, e esta célula flutua por cima
 * dela em `zIndex: 1` — do lado direito o anúncio de rolagem simplesmente
 * sumia (Minor 3 do review da fatia 1). Mesma tinta e mesma medida das duas
 * camadas de sombra do wrapper, para os dois lados continuarem lendo iguais.
 *
 * Permanente, e não só durante a rolagem: a coluna presa é permanentemente
 * flutuante — ela cobre conteúdo sempre que a tabela rola, e a única
 * alternativa seria um listener de rolagem que o `pt` do wrapper hoje não tem
 * e que a decisão do UI-10 evitou de propósito. O `-1rem` de spread mantém a
 * sombra ancorada na borda: sem rolagem ela lê como continuação da
 * `borderLeft`, não como sujeira.
```

- [ ] **Step 4: Rodar o teste**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/AppDataTable/AppDataTable.test.tsx
```

Esperado: PASS.

- [ ] **Step 5: Provar na tela em 1024x768 e 390x844**

Abra `/operacion` nos dois viewports (as tabelas rolam nos dois) e confirme que a faixa escura
aparece à esquerda da coluna de ações enquanto houver coluna escondida. Em 1440x900, onde a tabela
cabe, confirme que a sombra não vira uma barra visível ao lado da borda. **Se virar**, reduza o
spread para `-1.25rem` e repita a medição — a escolha é da tela, e o número que passar entra no
comentário.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/AppDataTable/style.ts frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx
git commit -m "fix(ui): Minor 3 — a coluna presa desenha a sombra que ela cobria

A sombra de rolagem vinha do fundo do involucro e a celula sticky
flutuava por cima. Ela passa a pintar a propria, com a mesma tinta e
medida das camadas do wrapper."
```

---

### Task 6: Minor 5 — o slot `actions` do `DetailHeader` sai da linha de base

`sm:items-baseline` foi escolhido para as TAGS pousarem sobre a linha do título (UI-08 da fatia 1),
mas o mesmo alinhamento pega o bloco que carrega os botões: com um botão de altura maior que a tag, o
slot inteiro sobe.

**Files:**
- Modify: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx:89`
- Test: `frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx`

- [ ] **Step 1: Escrever o teste que reprova**

```tsx
it('o bloco com acoes sai da linha de base; so tags continuam nela', () => {
  const { rerender, container } = render(<DetailHeader title="Turma" tags={<span>tag</span>} />)
  expect(container.querySelector('.sm\\:self-center')).toBeNull()

  rerender(<DetailHeader title="Turma" tags={<span>tag</span>} actions={<button>Editar</button>} />)
  expect(container.querySelector('.sm\\:self-center')).not.toBeNull()
})
```

Ajuste os props obrigatórios de `DetailHeader` conforme a assinatura atual — leia-a antes:

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && sed -n '1,40p' src/shared/ui/DetailHeader/DetailHeader.tsx
```

- [ ] **Step 2: Rodar e ver reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/DetailHeader/DetailHeader.test.tsx
```

Esperado: FAIL na segunda asserção — a classe não existe.

- [ ] **Step 3: Condicionar o alinhamento à presença de `actions`**

A linha 89 vira:

```tsx
            <div className={`flex flex-wrap items-center gap-2 sm:shrink-0${actions ? ' sm:self-center' : ''}`}>
```

E acrescente ao comentário de `items-baseline`, logo acima:

```
            * O `sm:self-center` do bloco da direita é a contraparte: a linha de
            * base foi escolhida para a TAG pousar sobre a linha do título, e o
            * mesmo alinhamento levava junto o slot `actions` — botão mais alto
            * que a tag empurrava o bloco inteiro para cima (Minor 5 do review da
            * fatia 1). Sem `actions`, nada muda e o UI-08 fica como estava.
```

- [ ] **Step 4: Rodar o teste**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm test src/shared/ui/DetailHeader/DetailHeader.test.tsx
```

Esperado: PASS.

- [ ] **Step 5: Provar na tela**

Abra `http://localhost:5175/operacion/turmas/1` (detalhe com tags **e** ações) e confirme que os
botões ficam centrados em relação ao bloco de tags, e que a tag continua na linha do título. Compare
com `/comercial/presupuestos/1`, que a run 1 vai visitar.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/shared/ui/DetailHeader/DetailHeader.tsx frontend/src/shared/ui/DetailHeader/DetailHeader.test.tsx
git commit -m "fix(ui): Minor 5 — o slot actions do DetailHeader sai da linha de base

items-baseline existe para a tag pousar na linha do titulo, e levava o
bloco de botoes junto. Com actions, o bloco da direita centra; sem
actions, o UI-08 fica intacto."
```

---

### Task 7: Run 1 — Comercial

**Files:**
- Create: `docs/superpowers/audits/2026-08-25-lotus-ui-review-comercial.md`
- Evidência bruta: `.artifacts/ui-review/` (gitignored)

- [ ] **Step 1: Confirmar a stack e o papel**

A stack da Task 1 precisa estar no ar (`http://localhost:5175`), e a sessão é de **admin** — nenhum
provisionamento de redator nesta fatia.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
```

Esperado: `200`.

- [ ] **Step 2: Rodar a skill**

```
/lotus-ui-review /comercial → /comercial/presupuestos/:id (papel admin, jornada: abas do módulo, lista, busca e filtro, abrir orçamento, cotações)
```

A skill é read-only: nenhuma mutação além do login. Ela produz `report.txt` na pasta da run.

- [ ] **Step 3: Escrever o relatório no molde vigente**

`docs/superpowers/audits/2026-08-25-lotus-ui-review-comercial.md`, três seções, como
`2026-08-23-lotus-ui-review-operacion.md`:

- **§1 — escopo e limites da run:** rotas percorridas, viewports, temas, idiomas, **estados não
  testados** e **falsos positivos com o motivo do descarte** (para não voltarem na passada seguinte);
- **§2 — `report.txt` VERBATIM**, sem edição;
- **§3 — o que foi feito com ele:** tabela achado → classe → destino, preenchida na Task 8.

- [ ] **Step 4: Commit do relatório**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-08-25-lotus-ui-review-comercial.md
git commit -m "docs(audit): run de UI review em Comercial

Relatorio datado com escopo, report.txt verbatim e a triagem dos
achados. As correcoes vao na task seguinte, um commit cada."
```

---

### Task 8: Correções dos achados `C` de Comercial

**Files:** determinados pela triagem — mas o destino de cada classe é fixo.

- [ ] **Step 1: Triar cada achado pela rubrica**

Para cada item do `report.txt`:

- **`C`** → corrige aqui, um commit por achado, **medido na tela antes e depois**;
- **`B`** → corrige se couber no escopo desta fatia; senão vira ficha `D-*` no `backlog.md`
  (a Task 12 escreve);
- **falso positivo** → entra na §1 do relatório com o motivo, e não vira commit.

Se o achado for de wrapper (`shared/ui`), **corrija no wrapper** — foi o que fez 6 dos 8 achados de
2026-08-22 valerem para toda tela.

- [ ] **Step 2: Corrigir, um commit por achado**

Cada commit nomeia o achado no assunto:

```bash
cd /home/jvbat/projetos/fix-frontend
git add <arquivos do achado>
git commit -m "fix(ui): UI-NN — <o que a tela passa a fazer>

<a medida antes e depois, na tela, no viewport onde foi vista>"
```

- [ ] **Step 3: Rodar a suíte a cada correção**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
```

Esperado: verde. Correção de UI que quebra teste ou é regressão ou é catraca desatualizada — decida
qual antes de mexer no teste.

- [ ] **Step 4: Preencher a §3 do relatório e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-08-25-lotus-ui-review-comercial.md
git commit -m "docs(audit): fecha a triagem da run de Comercial

Cada achado com classe e destino; nenhum C aberto."
```

---

### Task 9: Run 2 — Certificados

Só depois da Task 8: corrigir o achado de wrapper antes impede que o mesmo defeito ocupe dois
relatórios.

**Files:**
- Create: `docs/superpowers/audits/2026-08-25-lotus-ui-review-certificados.md`

- [ ] **Step 1: Rodar a skill**

```
/lotus-ui-review /certificados (papel admin, jornada: abas do módulo, lista, busca e filtro, emissão e validação em leitura)
```

Certificados não tem rota de detalhe própria: a jornada fecha no índice mais os diálogos que ele
abre.

- [ ] **Step 2: Escrever o relatório**

`docs/superpowers/audits/2026-08-25-lotus-ui-review-certificados.md`, mesmo molde de três seções da
Task 7, Step 3.

- [ ] **Step 3: Commit do relatório**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-08-25-lotus-ui-review-certificados.md
git commit -m "docs(audit): run de UI review em Certificados

Relatorio datado com escopo, report.txt verbatim e a triagem dos
achados."
```

---

### Task 10: Correções dos achados `C` de Certificados

- [ ] **Step 1: Triar pela rubrica**

Mesmos três destinos da Task 8, Step 1. **Achado que repete um já corrigido na run 1 não vira commit
novo** — vira linha na §3 dizendo que a correção da run anterior o alcançou, que é a prova de que
corrigir no wrapper funcionou.

- [ ] **Step 2: Corrigir, um commit por achado**

```bash
cd /home/jvbat/projetos/fix-frontend
git add <arquivos do achado>
git commit -m "fix(ui): UI-NN — <o que a tela passa a fazer>

<a medida antes e depois, na tela, no viewport onde foi vista>"
```

- [ ] **Step 3: Rodar a suíte**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
```

Esperado: verde.

- [ ] **Step 4: Preencher a §3 e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-08-25-lotus-ui-review-certificados.md
git commit -m "docs(audit): fecha a triagem da run de Certificados

Cada achado com classe e destino; nenhum C aberto."
```

---

### Task 11: `scrollable` das duas réguas de abas, se a medição pedir

O review da fatia 1 desfez o `scrollable` ligado por padrão no wrapper: `p-tabview-scrollable` troca
a nav por um contêiner com `overflow: hidden`, e o efeito em tela não medida é suposição. Quem mede,
liga.

**Files:**
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx:35`
- Modify: `frontend/src/features/certification/components/CertificatesPage.tsx:16`

- [ ] **Step 1: Medir as duas réguas**

Com a stack no ar, em `/comercial` e `/certificados`, nos viewports **1440x900** e **390x844**,
compare a largura de rolagem da nav de abas com a visível:

```js
const nav = document.querySelector('.p-tabview-nav-container .p-tabview-nav') ?? document.querySelector('.p-tabview-nav')
;[nav.scrollWidth, nav.clientWidth, nav.scrollWidth > nav.clientWidth]
```

Anote os três números por tela e por viewport. **Transborda** = terceiro valor `true`.

- [ ] **Step 2: Ligar `scrollable` só onde transbordou**

Para a página que transbordou:

```tsx
        <ModuleTabs scrollable activeIndex={tab} onTabChange={(e) => setTab(e.index)}>
```

Se **nenhuma** transbordar, este é o resultado: nada muda no código, e a medição vai para a §1 do
relatório da tela correspondente, com os números. Não ligue "por garantia".

- [ ] **Step 3: Provar que a régua rola e nada sumiu**

Na tela onde a prop foi ligada, confirme nos dois viewports que todas as abas continuam alcançáveis e
que os botões de avanço da régua anunciam rótulo traduzido — o Important 1 da fatia 1 foi exatamente
`aria-label="Next Page"` em inglês, introduzido por uma correção assim.

- [ ] **Step 4: Rodar a suíte e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/features/commercial/components/CommercialPage.tsx frontend/src/features/certification/components/CertificatesPage.tsx docs/superpowers/audits/
git commit -m "fix(ui): liga scrollable nas reguas de aba que transbordaram

Numeros por tela e viewport na secao 1 do relatorio de cada run. Regua
que coube nao recebeu a prop: o review da fatia 1 desfez justamente o
ligar por padrao."
```

Se nada transbordou, commite só o relatório, com assunto
`docs(audit): mede as reguas de aba de Comercial e Certificados`.

---

### Task 12: As fichas que a fatia 1 não escreveu

**Files:**
- Modify: `docs/superpowers/backlog.md` (seção `# Débitos técnicos — registro canônico`)

- [ ] **Step 1: Gravar a decisão da D-38**

A ficha atual termina em "Decisão pendente". A fatia 1 já decidiu (D1 da spec dela) e ninguém
escreveu. Substitua a última frase da ficha `D-38` por:

```
  **Decidido em 2026-08-22 (D1 da spec da fatia 1), registrado em 2026-08-25:** o backend manda as
  PARTES e o cliente compõe. Traduzir a frase no backend exige `Accept-Language`, que é exatamente o
  que o item 7 (`hardening-i18n-e-erros-api`) instala junto de **D-18** e **D-36** — fazer agora
  seria construir metade do item 7 fora dele. A execução é do item 7; nenhuma linha de código muda
  por causa desta ficha até lá. O sítio vivo é `PendingList.tsx:30`, que imprime `item.description`
  cru vindo de `OperationMetricsQuery.php:137`.
```

- [ ] **Step 2: Abrir a ficha da recusa em espanhol fixo**

Acrescente à mesma seção, em ordem numérica:

```
- **D-58 · `Turma::concluir()` recusa em espanhol fixo, fora do mecanismo de locale** →
  `hardening-i18n-e-erros-api`. `backend/app/Domains/Operation/Models/Turma.php:200` monta a
  mensagem de recusa em espanhol literal, como as demais da família **D-07**. É a metade da UI-01 da
  run de Operação que ficou fora do fence da fatia 1 do item 16 (frontend puro), e a ficha não foi
  escrita porque a Task 12 daquele plano foi cortada. Mesmo remédio da D-07/D-36: `__()` com chave
  nas 4 `lang/`. **DoD:** a mesma recusa em es-CL, pt-BR e en devolve a mensagem no locale pedido.
```

**Confirme o número antes de escrever** — se `D-58` já existir, use o próximo livre:

```bash
cd /home/jvbat/projetos/fix-frontend && grep -o "D-[0-9]\+" docs/superpowers/backlog.md | sort -u -V | tail -3
```

- [ ] **Step 3: Baixar a D-57**

A ficha `D-57` foi paga nas Tasks 2 e 3. Marque-a como paga no molde da `D-39`, que ficou como
registro:

```
  **PAGA em 2026-08-25**, na fatia 2 do `frontend-revisao-ui-por-modulo`: a cadeia da RN-16 carrega
  `TurmaDocumentType` de `TurmaHabilitacaoService` até os DTOs, os quatro campos (`missing_types`
  ×2, `missing_document_types` e `present_types`, que era o mesmo defeito no mesmo DTO) tipam o enum
  no `generated.ts`, e `turmaDocumentTypeLabel` perdeu o fallback de código cru. Fica aqui como
  registro; sai da lista no próximo saneamento dos débitos.
```

- [ ] **Step 4: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/backlog.md
git commit -m "docs(backlog): grava D-38, abre a ficha da recusa em espanhol e baixa D-57

A decisao da D-38 e de 2026-08-22 e nunca foi escrita: a task que a
escreveria foi cortada com a fatia 1."
```

---

### Task 13: Gate completo

O bloco tocou `backend/`, então o gate é o completo — não o de frontend puro.

- [ ] **Step 1: Frontend**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
pnpm lint; echo "lint exit: $?"
pnpm build; echo "build exit: $?"
pnpm test 2>&1 | tail -5
```

Esperado: lint e build exit `0`; `pnpm test` **igual ou acima** da baseline da Task 1, Step 6, com
zero falha.

- [ ] **Step 2: Backend**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan test 2>&1 | tail -5
```

Esperado: sem regressão contra a baseline da Task 1, Step 6. O comando precisa **terminar** — se
fatalar por memória, a imagem não foi reconstruída (Task 1, Step 3), e isso é a P-57, não este bloco.

- [ ] **Step 3: Pint nos PHP tocados**

```bash
cd /home/jvbat/projetos/fix-frontend/backend
./vendor/bin/pint --test $(cd /home/jvbat/projetos/fix-frontend && git diff --name-only origin/main...HEAD -- 'backend/**/*.php' | sed 's|^backend/||')
```

Esperado: `PASS`. **Nunca rode `pint` sem argumento** — reformata o repo inteiro.

- [ ] **Step 4: `generated.ts` sem drift**

```bash
cd /home/jvbat/projetos/fix-frontend
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: diff **vazio** — o arquivo regenerado na Task 3 já é o commitado.

- [ ] **Step 5: Conferir o DoD, item por item**

1. Comercial e Certificados têm relatório datado em `audits/` e **nenhum `C` aberto** — releia a §3
   dos dois.
2. `grep -n "missing_types\|missing_document_types\|present_types" frontend/src/shared/types/generated.ts`
   devolve `TurmaDocumentType[]` nos quatro campos, e `turmaDocumentTypeLabel` não tem fallback.
3. Hover alcança a coluna presa e a sombra de rolagem aparece — **na tela**, nos dois temas, com as
   capturas guardadas.
4. `backlog.md` tem a decisão da D-38, a ficha nova da recusa em espanhol e a D-57 baixada.

- [ ] **Step 6: Commit final do gate**

```bash
cd /home/jvbat/projetos/fix-frontend
git add -A
git commit -m "chore(gate): fecha a fatia 2 do item 16 com o gate completo

Frontend lint 0, build verde e N arquivos / N testes; backend N passed /
N skipped; pint PASS nos PHP tocados; generated.ts sem drift."
```

Substitua os `N` pelos números medidos. Depois disto o bloco vai a `ready_for_review`
(`/revisar-sprint`), não a merge.

---

## Handoff de execução

**executor: claude**

Três razões, e basta uma: o bloco toca a **lei §5.3** (`generated.ts` regenerado pelo DTO), a
triagem de achado da rubrica é **julgamento fora do plano** (classe `C`/`B`/falso positivo decide o
que vira commit, o que vira ficha e o que é descartado), e as Tasks 4, 5, 6 e 11 terminam em
**medição na tela** cujo resultado escolhe o número que entra no código — não há verificação
executável que substitua o olho.

`paths_autorizados` não se aplica: sem delegação a Codex, não há fence a declarar.
