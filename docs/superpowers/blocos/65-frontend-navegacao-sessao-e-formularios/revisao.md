# 65 — Revisão

## Em aberto

## Rodada 2 — `7381665f..2194903c` — 2026-11-27 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5) · Lente 2: sonnet

Delta das correções da rodada 1: `7c844dd4..2194903c`. Lente Codex em uma tentativa só, sem retry:
`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.`

As correções da rodada 1 conferem sem regressão: Q-1 em `6d1f789a` (resolve o clique na sidebar;
o caso residual é o Q-6 abaixo), Q-2 em `e14f39cc`, Q-4 em `bf241c9e` e Q-5 em `2194903c`. O núcleo
de alto risco (interceptor 401/419, `expire()`, `from`, limpeza do QueryClient) não foi tocado pelo
delta. O revisor rodou `eslint .`, `tsc -b` e o vitest dos arquivos do delta (20 arquivos, 148
testes) verdes; a sessão rodou `pnpm lint`, `pnpm build` e `pnpm test` (297 arquivos, 2463 testes)
verdes antes da rodada.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-6 | Menor | No render do reseed da URL, a checagem de escopo roda com o `lastScope` antigo; se um filtro derivado da URL (`status`) ou a `key` (modo arquivado) muda no mesmo passo que `page`, o `setFirst(0)` dela vence o `page` da URL e o espelho reescreve a URL sem ele. Ex.: Voltar para `/operacion?status=X&page=3` cai na página 1. Provado por sonda do revisor | CONFIRMED | `frontend/src/shared/hooks/useServerTable.ts:153-176` | registrado, não corrigido (decisão do João, 2026-11-27) |
| Q-7 | Menor | A catraca nova `shared/hooks` → `shared/ui` enumera caminhos e deixa passar `@/shared/ui` (alias de `tsconfig.app.json:10`) e `../../shared/ui/...`; o ban de feature vizinho usa `**/features/**`. Sem violação hoje | CONFIRMED | `frontend/eslint.config.js:872` | registrado, não corrigido (decisão do João, 2026-11-27) |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

## Rodada 1 — `7381665f..e8816568` — 2026-11-27 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Alto risco (sessão expirada 401/419, limpeza do QueryClient na fronteira de autorização). A lente
Codex falhou nas duas tentativas: `The 'gpt-5.5' model is not supported when using Codex with a
ChatGPT account.` e o mesmo com `gpt-5.4`. A rodada seguiu com a lente 1 única.

O núcleo de alto risco passou sem achado: interceptor 419 renova o token uma vez e o 401/419
seguinte chama `expire()`; `expire()` é idempotente; `useLogin` limpa o QueryClient antes do
`setUser` quando `expired`; `from` carrega a URL inteira. Lei 6 e `generated.ts` intactos. O
revisor rodou `pnpm lint`, `tsc -b` e `pnpm test` (296 arquivos, 2452 testes) verdes.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | `q`, `page` e `sort` lidos da URL só na montagem e espelhados de volta por efeito; `status` e `archived` derivados da URL a cada render. Clicar em "Operación" na sidebar (`/operacion`, mesma rota) reseta status e modo, e o efeito reescreve `q` na URL | CONFIRMED | `frontend/src/shared/hooks/useServerTable.ts:119-124,183-192`; `frontend/src/features/operation/components/OperationPage.tsx:28`; `frontend/src/shared/config/navigation.ts:20` | correção aprovada, por aplicar |
| Q-2 | Menor | `useTableUrlState.write` chama `setParams(fn, { replace: true })` sem `state`, descartando o `backTo`; o irmão `useUrlTab` preserva. Sem dano hoje (nenhuma lista com URL em página com `backTo`) | CONFIRMED | `frontend/src/shared/hooks/useTableUrlState.ts:42-52`; `frontend/src/shared/hooks/useUrlTab.ts:36-43` | correção aprovada, por aplicar |
| Q-3 | Menor | `IdentityCell` com `role="group"` e `aria-label` igual ao texto dos filhos; leitor de tela pode anunciar o nome duas vezes | PLAUSIBLE | `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx:105` | observação; depende do leitor de tela, conferir na passada visual A-2 |
| Q-4 | Menor | `shared/hooks` importa `useToast` de `shared/ui` por caminho fundo, contra a direção `ui` → `hooks`; segunda ocorrência (precedente `useArchiveToasts.ts:8`, `16972973`, 2026-08-19) | CONFIRMED | `frontend/src/shared/hooks/useCrudForm.ts:9`; `frontend/src/shared/hooks/useArchiveToasts.ts:8`; `.claude/rules/frontend-fsliced.md:269` | correção aprovada (mover o contexto), por aplicar |
| Q-5 | Menor | Motivo do botão de confirmar desabilitado é `<p>` solto, sem ligação ao botão; `ConfirmDialog` não aceita `aria-describedby`. `QuoteWizard` e `HistorialExportActions` ligam por `aria-describedby`: dois moldes no mesmo bloco | CONFIRMED | `frontend/src/shared/ui/ConfirmDialog/ConfirmDialog.tsx:63-71`; `frontend/src/features/certification/components/Historial/RevokeDialog.tsx:52-56`; `frontend/src/features/certification/components/Emission/ConfirmIssueDialog.tsx:71-75` | correção aprovada, por aplicar |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 4 confirmados, 1 plausível, 0 refutados

### Padrão reincidente

Q-4 se repete em dois blocos (`useArchiveToasts`, 2026-08-19; `useCrudForm`, bloco 65). Decisão
do João: mover o contexto do toast para fora de `shared/ui`, mantendo sem exceção a regra de
`.claude/rules/frontend-fsliced.md` ("a seta aponta de `ui` para `hooks`, nunca ao contrário").
Texto proposto para a rule, a entrar com a correção: "Contexto de infraestrutura consumido por
hook (o toast é o caso medido) mora fora de `shared/ui`; `shared/ui` guarda só o componente
visual que o renderiza."
