# Medições — bloco `hardening-i18n-e-erros-api`

> DoD end-to-end da Task 11, contra a API real (`docker compose up -d`, sem `pnpm dev` — o bloco é
> só de backend). Saída colada, não parafraseada.

## Pré-requisito: autenticação via curl exige `Referer` do domínio stateful

`POST /api/login` sem `Referer`/`Origin` casando `SANCTUM_STATEFUL_DOMAINS` devolve 500
(`"Session store not set on request."`) — o `EnsureFrontendRequestsAreStateful` não reconhece a
origem, pula o middleware de sessão, e o `AuthController` chama `session()->regenerate()` mesmo
assim. **Não é regressão deste bloco**: é o comportamento normal do Sanctum SPA para requisição sem
origem reconhecida. Toda chamada abaixo usa `-H 'Referer: http://localhost:5173/'`.

```
$ curl -s -c admin.jar http://localhost:8080/sanctum/csrf-cookie -o /dev/null -w 'csrf: %{http_code}\n'
csrf: 204

$ curl -s -b admin.jar -c admin.jar -X POST http://localhost:8080/api/login -H "X-XSRF-TOKEN: $TOKEN" \
  -H 'Content-Type: application/json' -d '{"email":"admin@lotus.cl","password":"senha123"}'
{"type":"https:\/\/lotus.cl\/errors\/server","title":"Error interno","status":500,"detail":"Session store not set on request.","instance":"\/api\/login"}

$ curl -s -b admin.jar -c admin.jar -H 'Referer: http://localhost:5173/' -X POST http://localhost:8080/api/login \
  -H "X-XSRF-TOKEN: $TOKEN" -H 'Content-Type: application/json' -d '{"email":"admin@lotus.cl","password":"senha123"}'
{"id":1, ..., "roles":["superadmin"], ...}
login: 200
```

Senha do seed: `senha123` (não `password` — `DatabaseSeeder.php:38`, gate `local`/`demo`). Redator de
teste: `relator258@perf.demo.cl` / `senha123` (`PerformanceScenarioSeeder`).

## DoD 1 — a mesma recusa de domínio nos três locales

Turma 3 (concluída), `PUT /api/turmas/3` com payload válido (`modalidade`, `start_date`, `end_date`)
para alcançar `assertAcademicallyWritable()`:

```
-- es-CL
{
    "type": "https://lotus.cl/errors/validation",
    "title": "Error de validación",
    "status": 422,
    "detail": "La clase ya fue concluida: el registro académico está bloqueado (RN-15).",
    "errors": {"turma": ["La clase ya fue concluida: el registro académico está bloqueado (RN-15)."]}
}
-- pt-BR
{
    "title": "Erro de validação",
    "status": 422,
    "detail": "A turma já foi concluída: o registro acadêmico está bloqueado (RN-15).",
    "errors": {"turma": ["A turma já foi concluída: o registro acadêmico está bloqueado (RN-15)."]}
}
-- en
{
    "title": "Validation error",
    "status": 422,
    "detail": "The class has already been concluded: the academic record is locked (RN-15).",
    "errors": {"turma": ["The class has already been concluded: the academic record is locked (RN-15)."]}
}
```

**Veredito: PASS.** Três textos distintos, `title` e `detail` no mesmo idioma em cada resposta.

## DoD 2 — o 403 não fala mais inglês

Redator (`relator258@perf.demo.cl`) contra `GET /api/users` (fora do escopo dele):

```
-- es-CL: 403 Acceso denegado | No tiene permiso para realizar esta acción.
-- pt-BR: 403 Acesso negado | Você não tem permissão para esta ação.
-- en:    403 Access denied | You do not have permission for this action.
```

**Veredito: PASS.** Nenhuma linha contém `This action is unauthorized.`.

## DoD 3 — 404, 422, 429 e 500 mascarado

**404** (`GET /api/turmas/999999`):

```
-- es-CL: 404 Recurso no encontrado | El recurso solicitado no existe.
-- pt-BR: 404 Recurso não encontrado | O recurso solicitado não existe.
-- en:    404 Resource not found | The requested resource does not exist.
```

**422** — já demonstrado no DoD 1 (a recusa de domínio é veiculada como `ValidationException`, é o
mesmo mecanismo).

**429** — seis `POST /api/login` com senha errada, `Accept-Language: en`:

```
tentativa 1..5: 422 {"detail":"These credentials do not match our records.", ...}
tentativa 6:    429 {"type":"https://lotus.cl/errors/too-many-requests","title":"Too many requests","status":429,"detail":"Too many requests. Wait a few seconds and try again."}
```

**Veredito 404/422/429: PASS.**

**500 mascarado — NÃO MEDIDO contra a API real, e o motivo fica registrado.** O container de dev
roda com `APP_DEBUG=true` (`config('app.debug')` confirmado via tinker), e o ramo mascarado de
`ProblemDetails::detailFor()` só entra em jogo com `! config('app.debug')` — com debug ligado,
qualquer exceção devolve `getMessage()` cru, e a sonda mediria outra coisa. Forçar
`APP_DEBUG=false` no container de dev para esta única medição foi avaliado e descartado: exigiria
reiniciar o `app` (afetando o resto da sessão) para produzir um 500 genuinamente não-`PublicDetail`
via HTTP real, sem que o plano desta task oferecesse uma rota conhecida para provocar um. **Achado
de cobertura, não deste bloco:** `EnvelopeLocalizadoTest::o_404_e_o_500_mascarado_saem_no_locale_pedido`
(Task 2) promete os dois pelo nome, mas o corpo do teste só afirma o 404 — o 500 mascarado nunca foi
coberto por teste automatizado nem por esta sonda. A garantia que existe é estática: leitura de
código confirma que `detailFor()` retorna `__('problem.detail.server')` sempre que
`$status === 500 && !config('app.debug') && !($e instanceof PublicDetail)`, e essa chave está na
catraca de paridade (`LocaleParityTest`) desde a Task 2. Registrar como pendência é decisão de quem
fechar o bloco, não desta medição.

## DoD 4 — a pendência do Dashboard traduzida

`GET /api/dashboard/metricas`, cinco primeiras pendências, três locales:

```
-- es-CL
quote_awaiting_approval | Cotización pendiente de aprobación.
quote_approved_without_turma | Cotización aprobada sin clase configurada.
turma_without_redator | Clase sin relator designado.
turma_docs_incomplete | Documentación obligatoria incompleta: Evaluación del relator.
turma_awaiting_conclusion | Clase habilitada pendiente de confirmación de conclusión.
-- pt-BR
quote_awaiting_approval | Cotação pendente de aprovação.
quote_approved_without_turma | Cotação aprovada sem turma configurada.
turma_without_redator | Turma sem redator designado.
turma_docs_incomplete | Documentação obrigatória incompleta: Avaliação do redator.
turma_awaiting_conclusion | Turma habilitada aguardando confirmação de conclusão.
-- en
quote_awaiting_approval | Quote pending approval.
quote_approved_without_turma | Approved quote without a configured class.
turma_without_redator | Class without an assigned instructor.
turma_docs_incomplete | Required documentation incomplete: Instructor evaluation.
turma_awaiting_conclusion | Enabled class awaiting conclusion confirmation.
```

Uma sexta linha (outra turma, dois documentos faltando) confirma a lista, não só o singular:
`turma_docs_incomplete | Documentación obligatoria incompleta: Pruebas, Evaluación del relator.`

**Veredito: PASS.** `turma_docs_incomplete` sempre traz o rótulo (`Evaluación del relator`,
`Pruebas`), nunca o código cru (`EVALUACION_REDATOR`, `PRUEBAS`).

## DoD 5 — as bordas

`GET /api/turmas/999999`, três variações de header:

```
sem header:      Recurso no encontrado
Accept-Language: es (puro):     Recurso no encontrado
Accept-Language: fr-FR:         Recurso no encontrado
```

**Veredito: PASS.** As três linhas iguais, em es-CL.

## DoD 6 e 7 — gate

```
$ docker compose exec -T app php artisan test
Tests:    5 skipped, 1138 passed (8821 assertions)
Duration: 74.18s

$ docker compose exec -T app php artisan typescript:transform
All done!
$ git diff --stat -- frontend/src/shared/types/generated.ts
(saída vazia)

$ cd frontend && pnpm lint
$ eslint .
(sem achados)

$ pnpm build
✓ built in 1.25s
(warning de chunk >500kB é pré-existente, não deste bloco)

$ git diff --name-only --diff-filter=d main...HEAD -- 'backend/**/*.php' | wc -l
87
$ cd backend && ./vendor/bin/pint --test <87 arquivos>
{"tool":"pint","result":"passed"}
```

**Veredito: PASS** nos sete itens. `--diff-filter=d` foi necessário porque o `git diff --name-only`
cru inclui `lang/es/*.php` (apagados na Task 1) e o Pint recusa caminho que não existe mais.

## Achados registrados fora desta medição (para o fechamento do bloco)

- **`P-61`** (`title` do `ProblemDetails` em português) ficou **stale** desde a Task 2 — o texto que
  ela descreve não existe mais — mas continua aberta em `abertas.md`/`README.md`; mover para
  `encerradas.md` é mecânica do `/fechar-sprint`, não desta task.
- **Pendência real, não coberta por nenhuma task deste plano** (achada na Task 2, confirmada na
  Task 6): `ImmutableSystemRoleException` e `RedatorOnlyActionException` continuam com mensagem
  literal em português — usam parâmetro default do construtor, não `ValidationException::withMessages`,
  e por isso a catraca da Task 9 não as alcança.
- **Cobertura de teste, não comportamento:** `EnvelopeLocalizadoTest::o_404_e_o_500_mascarado_saem_no_locale_pedido`
  promete o 500 mascarado no nome e não o testa no corpo (ver DoD 3 acima).
