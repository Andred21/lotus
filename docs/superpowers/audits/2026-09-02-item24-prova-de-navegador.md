# Audit — `frontend-campo-de-formulario-liga-no-form` (item 24)

Evidência da Task 11 do plano: a prova de navegador que o jsdom não dá. Medido em 2026-09-02,
worktree `fix-frontend` (offset +2: API `:8082`, Vite `:5175`), Chromium via `playwright-cli`
1.62.1, autenticado como `admin@lotus.cl` (credencial do `DatabaseSeeder` de dev).

Relatório completo da passada, no contrato do `lotus-ui-review`: `.artifacts/ui-review/20260902-0328-clientdialog-item24/report.txt`.
PNGs por viewport na mesma pasta (`view-1440x900`, `edit-1440x900`, `edit-1024x768`,
`edit-390x844`). A pasta é ignorada pelo Git — é evidência de auditoria, não artefato versionado.

## As quatro medições que o plano exige

| # | O que o plano pede | O que a tela mostrou | Veredito |
|---|---|---|---|
| 1 | digitar 3 caracteres no RUT **sem perder o foco** | o nó focado foi marcado com `data-sonda` antes da primeira tecla; depois de `7`, `6` e `.` o `document.activeElement` continua sendo o MESMO nó (mesmo `id` `_r_1_`, mesma marca), com o valor acumulando `7` → `76` → `76.` | ✅ identidade estável (spec §4.2) |
| 2 | em `view`, o campo Tipo mostra o rótulo traduzido | campo "Type" com o texto **"Client"**, não `client`; sem controle montado e sem `htmlFor` na label | ✅ escape `value` preservado |
| 3 | um 422 real pinta o erro no campo certo | POST com RUT já cadastrado (`76.123.456-0`) devolveu 422; a mensagem "Este RUT já está cadastrado." apareceu sob a label RUT, com `aria-invalid="true"` no input | ✅ erro chega pelo `name` |
| 4 | console sem aviso de controlled/uncontrolled nem de `value` nulo | 5 mensagens no total, **0 warnings**; os únicos erros são de rede e esperados (401 em `/api/me` antes do login, e os 422 da própria sonda) | ✅ merge explícito não quebrou controle |

**Modo `edit` medido junto:** o diálogo abre com RUT e Tipo carregados do backend (`76.123.456-0`,
"Client" no dropdown) e a digitação no meio de "Business activity" escreve no form sem trocar o nó
focado — o bind lê e escreve pelo `FieldContext` nos dois modos.

## Mutação: declarada, não escondida

A passada tentou **dois** POST em `/api/clients`, e os dois foram **rejeitados com 422** — nenhum
registro criado (4 clientes antes, 4 depois, contados no banco). A tentativa é deliberada: o DoD da
Task 11 pede um 422 **real**, e o `lotus-ui-review` proíbe fabricar o estado com mock ou
interceptação de rota. Nenhuma edição foi salva no modo `edit`. Fora isso, a run é read-only, e o
working tree ficou igual antes e depois.

## Contagem final (Task 11, passo 3)

| Medida | Antes do bloco | Depois |
|---|---|---|
| `fieldErrors?.` em `src/features/**/*.tsx` | 48 | **22**, todas nos 11 arquivos que a spec §2 declarou fora de escopo (campo aninhado, diálogos sem bundle de form, telas de login/senha) mais o banner de `course_id` do `QuoteWizard`, que não é campo |
| `<Field ` em `src/features` | 0 | **35** |
| `<FormField ` restantes em `src/features` | — | 31, nos sítios fora de escopo e nos desvios medidos (campo só-leitura sem controle, campo aninhado) |
