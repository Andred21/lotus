# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## P-45 — o `TestCase` lê `FRONTEND_URL` cru, e o ambiente já é lista de origens

**Bloco:** — · **Gatilho:** o commit que ligar multi-origin de verdade (o `config/cors.php` com
`explode` já está no working tree do João), ou o próximo `/fechar-sprint` que encontrar a suíte
vermelha por este motivo. Revisar em **2026-10-31**.

`backend/tests/TestCase.php:18` faz `$this->withHeader('Referer', env('FRONTEND_URL',
'http://localhost:5173'))`. A variável passou a ser **lista separada por vírgula**
(`backend/.env:38`: `http://localhost:5173,http://localhost:5174`), então o `Referer` sai com a
string inteira, o host não bate com `sanctum.stateful` (`.env:37`) e o
`EnsureFrontendRequestsAreStateful` não injeta o `StartSession`. `$request->session()` explode em
`AuthController.php:47` e a rota devolve **500**.

**Medido no `/fechar-sprint` de 2026-08-16, nos dois sentidos:** com o `.env` como está,
`php artisan test` dá **12 failed / 672 passed / 5 skipped** — os 12 são `AuthTest` (6), troca de
senha (3) e `StaffUserCrudTest` (3), todos com `RuntimeException: Session store not set on request.`
Com `FRONTEND_URL=http://localhost:5173 php artisan test`, **684 passed / 5 skipped, zero falha**. A
diferença é a variável, não o código.

**Não é regressão do bloco que a encontrou:** o `dashboard-frontend-central-controle` é frontend
puro (`git diff main...HEAD -- backend/` = 0 linhas). O `.env` é gitignored, então a mudança não
aparece em `git status`; o que aparece é a outra metade do mesmo WIP, o `config/cors.php` trocando
`[env('FRONTEND_URL', …)]` por `explode(',', env('FRONTEND_URL', …))`. **`TestCase.php` é o terceiro
sítio que lê a variável e o único que ainda a trata como valor único.**

**Medido de novo no `/fechar-sprint` de 2026-08-17 (B2), com os mesmos números:** `12 failed / 672
passed / 5 skipped` com o `.env` como está, `684 passed / 5 skipped / zero falha` com
`FRONTEND_URL=http://localhost:5173`. **O gatilho venceu** — este é o segundo fechamento que
encontra a suíte vermelha por este motivo, e o segundo bloco de frontend puro a encontrá-la
(`git diff main...HEAD -- backend/` = 0 linhas nos dois).

**Não se conserta aqui:** o fechamento de um bloco de frontend não abre arquivo de backend. O fix
provável é um `explode` + `[0]` (ou o `Referer` vindo de `sanctum.stateful`), e ele pertence ao
commit que fecha o multi-origin — decisão do João.

**Encerrada em 2026-08-18, no `arquivados-e-restauracao`, pelo gatilho literal — os dois ramos.** O
gatilho previa "o commit que ligar multi-origin, ou o próximo `/fechar-sprint` que encontrar a suíte
vermelha por este motivo": o segundo venceu de novo, no `/revisar-sprint` deste bloco, com os mesmos
**12 failed** e a mesma exceção `RuntimeException: Session store not set on request.` Desta vez o
bloco é de backend e a ficha não tinha por que segurar o arquivo.

**Medido nos dois sentidos antes de tocar em código, e a montante da suspeita errada.** A primeira
hipótese era `SANCTUM_STATEFUL_DOMAINS` sem o `localhost` pelado — testada e **refutada**, com o
`.env` restaurado do backup nas duas vezes. `git stash push -u` provou que o HEAD limpo falha
igual, então não era regressão das correções do review; e `FRONTEND_URL=http://localhost:5173 php
artisan test` devolveu os **12 passed** que a ficha previa.

**O conserto é o `explode` + `[0]` que a ficha desenhou**, em `backend/tests/TestCase.php`:

```php
$origens = explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'));

$this->withHeader('Referer', trim($origens[0]));
```

O terceiro sítio que lê a variável passa a tratá-la como lista, igual ao `config/cors.php`. A suíte
fecha em **717 passed / 5 skipped** com o `.env` multi-origin do João intacto.
