# Audit — `frontend-decisoes-de-ui-pendentes` (item 21)

Evidência datada das medições de navegador exigidas pelo plano. Uma seção por task que produz
medição; cada seção cita PNG por caminho e a decisão que ele confirmou ou derrubou.

## Task 2 — os três blocos de `p-2` (spec §6, item 3)

Medido em 2026-09-01, viewport 1024x768, stack local (`docker compose up -d` + `pnpm dev` na
porta 5174), Firefox via `playwright-cli`.

**Critério de decisão (escrito antes de olhar):** o bloco é superfície se CONTÉM outros blocos e
empilha com irmãos do mesmo tipo; é controle se é uma LINHA acionável dentro de uma lista rolável.

| Sítio | PNG | O que a tela mostrou | Degrau |
|---|---|---|---|
| `ProfileDocumentSlot:76` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-profile-slot.png` | Logado como redator (`juan.morales@lotus.cl`, senha temporária de dev definida via `artisan tinker` para o teste — não é credencial de produto), `/perfil` → "Professional documents": quatro blocos com borda própria, empilhados verticalmente, cada um contendo cabeçalho + corpo (nome do arquivo ou "Not uploaded" + ação) | `rounded-surface` |
| `RedatorDocumentSlot:21` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-redator-slot.png` | Logado como admin, `/personas` → ficha de Juan Morales → "Documents": mesmo padrão — blocos com borda própria empilhados, mesmo componente compartilhado do slot do perfil | `rounded-surface` |
| `CourseStep:93` | `/tmp/claude-1000/-home-jvbat-projetos-lotus/8dfdff9c-6008-47d4-8bf3-107f84244f4c/scratchpad/audit/p2-course-step.png` | Logado como admin, `/comercial` → orçamento "Scap 1" → "Add quote" → wizard "New quote", Step 1 "Course": lista `max-h-80 overflow-y-auto` de `<label>` com radio, sem borda própria por linha | `rounded-control` |

**A medição CONFIRMOU a leitura do código** (tabela do plano, linhas 263–267) — nenhum desvio a
registrar. Os três sítios migram conforme os Steps 3 e 6 do plano.

**Nota sobre a captura de `ProfileDocumentSlot`:** o admin seed não tem `redator` associado, então
`/perfil` não renderiza a seção de documentos para ele — é preciso autenticar como um redator seed.
Nenhum redator seed tem senha utilizável (credencial nasce por convite, RF `SendRedatorAccessInvitationAction`);
a senha de `juan.morales@lotus.cl` foi definida manualmente para esta sessão de medição, é local
(dev DB), não foi commitada e não substitui o fluxo de convite real.
