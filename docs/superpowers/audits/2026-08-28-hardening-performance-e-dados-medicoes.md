# Medições — bloco `hardening-performance-e-dados`

> Arquivo nasce na Task 5; a Task 12 o completa com as demais seções do bloco.

## DoD 7 — Students

Prova no navegador (Chromium, es-CL, `admin@lotus.cl`), stack local
(`docker compose up -d` + `pnpm dev`), rota `/personas` → aba **Alumnos**.
URLs capturadas via `playwright-cli requests` (aba DevTools → Network):

| Ação                                          | GET disparado                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| Montar a aba Alumnos                           | `GET /api/students?page=1&per_page=10`                           |
| Digitar "an" na busca (após a pausa de debounce) | `GET /api/students?page=1&per_page=10&q=an` — **um único** GET |
| Clicar no cabeçalho "Nombre" (1º clique, asc)  | `GET /api/students?page=1&per_page=10&sort=name`                 |
| Clicar de novo (2º clique, desc)               | `GET /api/students?page=1&per_page=10&sort=-name`                |
| Clicar em "Page 2"                             | `GET /api/students?page=2&per_page=10&sort=-name`                |

Confirmado: busca dispara UM GET por pausa (sem request por tecla), sort manda
`sort=name`/`sort=-name` alternando por clique, paginação manda `page=N`
preservando o sort ativo. O dialog "Ver" abriu com o `StudentData` já presente
na página (sem GET extra) para um aluno visível na lista — o fallback
`useOne` (deep link / linha fora da página) não foi exercitado nesta sessão.

**Observação fora de escopo desta task:** ao abrir o dialog de visualização,
o console acusa um warning React (`key` ausente em lista) originado em
`StudentDetailSections`/`AppDataTable` das seções de vínculos/turmas do
detalhe — arquivo não tocado pela Task 5. Registrado aqui para triagem futura,
não corrigido neste bloco.
