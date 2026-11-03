# 51 — Revisão

## Em aberto

## Rodada 1 — `1845d096..66363183` — 2026-11-03 · Lente 1: opus · Lente 2: sonnet

A lente Codex (bloco de alto risco, porque tocou `generated.ts`) não rodou. O `codex-companion` recusou as duas tentativas com `model_not_found`: a conta ChatGPT não aceita `gpt-5.5`, o modelo do `~/.codex/config.toml`, nem `gpt-5.6-sol`. A rodada ficou só com a lente opus.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O motivo da isenção de `CourseModuleData` na `ISENTAS` diz "não rebaixa linha existente", e isso é falso. O `UpdateCourseAction` recria o módulo pelo payload, então um item sem `theory_hours`/`practice_hours` grava 0 e um item sem `learnings`/`contents` grava null. A isenção da classe está certa (§2.1, §4); o erro é só na frase. | CONFIRMED | `backend/tests/Feature/Shared/InputDataDefaultsTest.php:84`, `backend/app/Domains/Catalog/Data/CourseModuleData.php:23-28`, `backend/app/Domains/Catalog/Actions/UpdateCourseAction.php:36-42` | registrado. Correção sugerida: o motivo passa a dizer a verdade (item completo, o SPA manda todos os campos, omitir zera) e cita o débito do ruling 8, que vai para o `backlog.md` no fechamento |
| Q-2 | Menor | A catraca segue o tipo nativo e o `#[DataCollectionOf]`, mas não segue `array` anotado só com `/** @var XData[] */`, que o laravel-data também hidrata como coleção de Data. Hoje nenhum Data de entrada tem essa forma, então o risco é de alcance futuro. | CONFIRMED | `backend/tests/Feature/Shared/InputDataDefaultsTest.php:335-354`, `backend/vendor/spatie/laravel-data/src/Support/Factories/DataTypeFactory.php:344` | registrado; ver Padrão reincidente |
| Q-3 | Menor | A rule diz "Campo de escrita nasce `X|Optional` SEM default". Isso contradiz a própria rule (linha 32), a `backend-ddd.md:68` e a catraca, que aceitam `= new Optional`. | CONFIRMED | `.claude/rules/generated-types.md:38`, `.claude/rules/backend-ddd.md:68`, `backend/tests/Feature/Shared/InputDataDefaultsTest.php:61`, `backend/app/Domains/Commercial/Data/ClientData.php:49` | registrado. Correção sugerida: trocar por "SEM default literal (`= new Optional` é equivalente e aceito)". O texto nasceu neste bloco, então não vira pendência de doc |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

### Padrão reincidente

O Q-2 se repete em dois blocos. A cegueira para coleção de Data declarada só por docblock aparece no `PersistenceLawsTest` (bloco anterior) e agora no `InputDataDefaultsTest`. Foi por esse buraco que `TurmaData::$redatores` ficou fora da catraca até a Task 4 deste bloco. Proponho este texto para `.claude/rules/generated-types.md`:

> **Coleção de Data aninhado declara `#[DataCollectionOf(X::class)]`; docblock `@var XData[]` sozinho não basta.** As catracas por reflexão (`PersistenceLawsTest`, `InputDataDefaultsTest`) seguem só o tipo nativo e o atributo. O laravel-data hidrata o docblock mesmo assim, e o Data aninhado fica fora das guardas.

A outra saída é estrutural: uma guarda que reprove parâmetro `array` de Data cujo `@var` cite um Data sem `#[DataCollectionOf]`. A escolha entre as duas é do João.

### Fora da rodada de propósito

Já estão registrados no `rulings.md` ou foram triados pela revisão final da SDD:
- o conflito com a lane 53 (ruling 5);
- `ClientFormFields.type`;
- `update([])` vazio;
- a regex do caminho (b);
- a errata do `workload_hours` (ruling 6).

A lente 1 rodou a suíte duas vezes. Na primeira, falhou 1 teste em `tests/Support/Certification/MedidorDeCertificado.php:73` (pdfinfo); na segunda, passou inteira, com 1765 passed e 7 skipped. O bloco não toca esse arquivo, então trato a falha como instabilidade do teste, não como regressão.
