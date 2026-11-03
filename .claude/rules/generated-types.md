---
paths:
  - "frontend/src/shared/types/**"
  - "backend/app/Domains/**/Data/**"
  - "backend/app/Shared/**/Data/**"
---

# Contratos de tipo (backend → frontend) — ADR-04

**LEI INVIOLÁVEL (CLAUDE.md §5.3): `frontend/src/shared/types/generated.ts` NÃO se edita à mão.**
Se o tipo está errado, o DTO fonte está errado — corrija o DTO e regenere. Se o gerador falha,
**PARE e confirme com o João Victor**; não conserte o arquivo gerado.

DTOs vivem **no domínio dono do contrato**: `app/Domains/<Dominio>/Data/XData.php` (ex.:
`Domains/Catalog/Data/CourseData.php`). Contrato transversal fica sob `app/Shared/` — hoje só
`Shared/Files/Data/FileData.php`. **Não existe `app/Data`** (o transformer varre `app/` inteiro, sem
config publicada).

Marque a classe com `#[TypeScript]` e ela entra no módulo flat `frontend/src/shared/types/generated.ts`.
Mudou a forma de uma resposta → crie/atualize a classe `Data` (nunca array ad-hoc) e regenere:

```bash
docker compose exec -T app php artisan typescript:transform
```

`generated.ts` fica no `globalIgnores` do eslint e é **commitado**.

## Regras de forma do DTO

- **`from()` = ENTRADA** (request→DTO, valida por `rules()`); **`fromModel()` = SAÍDA** (model→DTO,
  projeção única). Proibido `XData::from([...])` para montar resposta.
- **Coleção nested read-write nasce `Optional`** (`array|Optional = new Optional`), com `|Optional`
  **no docblock `@var` também** — é ele que produz o `| undefined` no `generated.ts`. Ausente = não
  mexe; `[]` = apaga. Default `array = []` apaga a coleção de quem só omitiu o campo — em silêncio,
  com peso legal. Ref.: `CourseData::$modules`, `ClientData::$addresses`/`$contacts`.
  **Coleção que só existe na saída leva `#[ReadOnlyCollection]`** (`App\Shared\Data\Attributes`).
  Guarda: `tests/Feature/Shared/PersistenceLawsTest.php`.
- **Campo de escrita nasce `X|Optional` SEM default** (`string|Optional $type`, `string|Optional|null
  $payment_terms`). O `DefaultValuesDataPipe` do laravel-data preenche o default declarado antes do
  `Optional`, e com default no construtor nem `#[Required]` segura a omissão: o PUT/POST sem a chave
  passa e grava o default (`= 0` gravava 0). Default literal rebaixa ou apaga dado em silêncio no PUT
  parcial. Campo obrigatório fica `#[Required]` e SEM default; saída (calculada, não vem da entrada)
  leva `#[Computed]`/`#[ReadOnlyCollection]`. Ref.: `ClientData::$type`, `BudgetData::$payment_terms`.
  Guarda: `tests/Feature/Shared/InputDataDefaultsTest.php` — a classe que precisa mesmo do default
  (query string, upload que só cria) entra na `ISENTAS` com motivo escrito.

## Task que regenera ajusta os consumidores NO MESMO commit

Regenerar muda a forma dos tipos (`job_title` virou chave obrigatória; `modules` virou `| undefined`)
e quebra os literais TS existentes na hora. Ou a task já corrige os consumidores, ou o plano não pode
pedir "build verde" na task seguinte.