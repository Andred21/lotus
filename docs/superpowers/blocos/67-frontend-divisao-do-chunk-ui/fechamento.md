# Fechamento do bloco 67: quadro dos IDs

O bloco 67 assumiu um ID da auditoria, o D-6. A linha abaixo diz como ele ficou e qual prova sustenta isso.

A passada visual foi feita em 2026-11-27 com a stack da lane 67 (offset +2). O frontend rodou como **build de produção** (`VITE_API_URL=http://localhost:8082 pnpm exec vite build` e `vite preview --port 5175`), nunca no `pnpm dev`, que não faz tree-shaking.
- **Telas:** login, Dashboard com os gráficos, Comercial (tabela), Personas (tabela), diálogo "Nuevo instructor" com o PhoneInput e a lista de países aberta, detalhe de turma em edição com o calendário do DatePicker aberto, F5 direto em `/personas`.
- **Variações:** 1440×900, tema claro e escuro, es-CL, usuário admin.
- **Capturas:** só as que provam o veredito, em `visual/`.

| ID | Estado | Prova |
|---|---|---|
| D-6 — carga inicial | **fechado** | **Testes:** `frontend/tests/side-effects-ratchet.test.ts`, casos "package.json declara sideEffects com a lista do bloco 67", "o detector acha import nu e ignora import com nome" e "todo import nu em src é CSS, pacote ou módulo da lista sideEffects". A mutação (tirar `./src/shared/config/i18n.ts` da lista) derruba o primeiro e o terceiro, e o terceiro nomeia `src/main.tsx -> ./shared/config/i18n`. **Build:** `ls dist/assets/ui-*.js` responde `No such file or directory`. **Capturas:** `visual/D6-dashboard-graficos-light.png` (recharts desenhado), `visual/D6-phoneinput-bandeiras-light.png` (CSS do flag-icons carregado), `visual/D6-datepicker-light.png` (calendário em espanhol), `visual/D6-personas-f5-dark.png` e `visual/D6-personas-light.png` (F5 em rota lazy, nos dois temas). **Console:** não houve erro de console em nenhuma tela depois do login (Dashboard, Comercial, detalhe de turma e `/personas` relidos com o console zerado). O único registro da sessão foi o 401 de `GET /api/me` na tela de login, antes de autenticar: é a sonda de sessão do `SessionBootstrap`, esperada sem cookie. **i18n e fontes:** rótulos em es-CL, nenhuma chave crua; `document.fonts` com Inter, Archivo e IBM Plex Mono carregadas. |

## D-6: números (gzip)

| Arquivo | Antes (`main@7381665f`, spec §2) | Depois (bloco 67) |
|---|---|---|
| entrada `index-*.js` | 93,25 kB | 117,63 kB |
| chunk comum pré-carregado (`axios-*.js`: PrimeReact core, i18next, react-query, axios) | (dentro do `ui`) | 150,22 kB |
| chunk `ui` (`ui-*.js`), com `modulepreload` | 465,48 kB | **não existe** |
| `Dashboard-*.js` (recharts), lazy | (dentro do `ui`) | 115,38 kB |
| `PhoneInput-*.js`, lazy | (dentro do `ui`) | 37,20 kB |
| `AppDatePicker-*.js`, lazy | (dentro do `ui`) | 19,02 kB |
| **entrada mais pré-carga** (`gzip -c` dos `.js` do `index.html`) | cerca de 558 kB | **267,85 kB** (−52%) |

Fonte do "depois": entrada, chunk comum e total vêm do build do Step 6 da Task 1 (`total_gz_bytes=267850`). As três linhas lazy vêm do build de produção da passada visual, o mesmo código com `VITE_API_URL` da lane, que deu `total_gz_bytes=267866`. O teto da spec §6 é 300 kB.

## Gate final

- **Em `ae4594b1`:** `pnpm lint` exit 0, `pnpm test` com 269 arquivos e 2266 testes, `pnpm build` ok. O backend não mudou.
- A Task 2 só acrescenta este arquivo e as capturas.

## Nota sobre o `i18n.ts` na lista

A entrada `./src/shared/config/i18n.ts` é defensiva. A revisão da branch achou que o módulo também é importado com nome (`src/shared/api/axios.ts:2`, `src/shared/lib/datetime.ts:1`, entre outros), e por isso entraria no build mesmo fora da lista. Os rótulos em es-CL da passada provam que o i18n funciona, não que o padrão `./src/...` é honrado. Quem provou o padrão foi uma sonda da revisão: um módulo com efeito no topo, importado nu pelo `main.tsx`, some do bundle fora da lista e fica nele com `./src/sonda.ts` listado.

## Pendências registradas

- **Regex do detector exige espaço depois de `import`.** A revisão da Task 1 notou que `import"./x"` (sem espaço) escaparia da catraca (`frontend/tests/side-effects-ratchet.test.ts`, `importsNus`). É a regex que o plano manda, e nenhum import de `src/` hoje omite o espaço. O projeto não tem Prettier que o garanta. Fica registrado, sem correção: fechar é trocar `import\s+` por `import\s*` na regex.
