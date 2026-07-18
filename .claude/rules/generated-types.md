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
- **Coleção nested read-write nasce `Optional`** (`array|Optional = new Optional`). Ausente = não
  mexe; `[]` = apaga. Default `array = []` apaga a coleção de quem só omitiu o campo — em silêncio,
  com peso legal. Ref.: `CourseData::$templates`/`$modules`.
- **Campo de escrita com default não-`Optional` rebaixa dado em silêncio** no PUT parcial.
  Ref.: `ClientContactData.is_primary` (dívida conhecida — ver backlog do `progress.md`).

## Task que regenera ajusta os consumidores NO MESMO commit

Regenerar muda a forma dos tipos (`job_title` virou chave obrigatória; `modules` virou `| undefined`)
e quebra os literais TS existentes na hora. Ou a task já corrige os consumidores, ou o plano não pode
pedir "build verde" na task seguinte.