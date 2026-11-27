# Bloco 67 — divisão do chunk `ui` — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a entrada do frontend deixa de puxar o barrel `@shared/ui` inteiro (chunk `ui`, 465 kB gz), e o D-6 fecha.

**Architecture:** `frontend/package.json` declara `sideEffects`, o que deixa o bundler (rolldown, Vite 8) descartar do grafo da entrada os wrappers que a casca não usa. Uma catraca no projeto `repo` do vitest impede as duas regressões silenciosas: a declaração sumir, ou um import nu de módulo com efeito colateral ficar fora da lista e desaparecer do build de produção.

**Tech Stack:** Vite 8.3 (rolldown), vitest 4 (projeto `repo`, ambiente `node`), pnpm.

**Spec:** `docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/spec.md`

## Global Constraints

- Lista exata: `"sideEffects": ["**/*.css", "./src/main.tsx", "./src/shared/config/i18n.ts"]` (spec §5.1).
- Entrada mais pré-carga até **300 kB gz** (spec §6, critério 2).
- O build não emite `dist/assets/ui-*.js` (spec §6, critério 1).
- Nenhum import de feature muda; o barrel continua a única porta de `shared/ui` (spec §4).
- A passada visual roda no **build de produção**, nunca no `pnpm dev`, que não faz tree-shaking (spec §5.4).
- Gate: `pnpm build`, `pnpm lint`, `pnpm test` (de `frontend/`).

## Review Focus

1. Import nu com comentário no fim, aspas duplas ou sem `;` (a forma real do `main.tsx:15`): o detector acha. Teste na Task 1, `o detector acha import nu e ignora import com nome`.
2. Import nu por alias (`import '@shared/config/x'`): o resolvedor leva ao caminho `./src/...` e a catraca cobra a lista. Caso no mesmo teste da Task 1.
3. CSS de pacote importado por módulo (`flag-icons` no PhoneInput, `@fontsource/*` e PrimeReact no `main.tsx`) continua no build: bandeiras e fontes aparecem na passada da Task 2.
4. i18next inicializado no build de produção: rótulos em es-CL, não chaves cruas, na passada da Task 2.
5. Rota aberta direto pela URL (F5 numa rota lazy como `/personas`) carrega o chunk dela sem erro de console: passo da Task 2.

---

### Task 1: declaração `sideEffects` com catraca

**Files:**
- Create: `frontend/tests/side-effects-ratchet.test.ts`
- Modify: `frontend/package.json` (campo novo `sideEffects`, no nível raiz)

**Interfaces:**
- Consumes: nada.
- Produces: o campo `sideEffects` de `frontend/package.json` com a lista exata das Global Constraints; os testes `package.json declara sideEffects com a lista do bloco 67`, `o detector acha import nu e ignora import com nome` e `todo import nu em src é CSS, pacote ou módulo da lista sideEffects`, que a Task 2 cita no `fechamento.md`.

- [ ] **Step 1: Escrever o teste, no molde de `frontend/tests/icons-ratchet.test.ts`** (mesmo `arquivos()` recursivo e `relativo()`).

Duas funções locais ao arquivo de teste:
- `importsNus(fonte: string): string[]` devolve o especificador de cada linha que começa com `import` seguido direto de aspas (`/^\s*import\s+['"]([^'"]+)['"]/gm`), ou seja, sem nome, sem chaves e sem `type`.
- `resolverEmSrc(arquivo: string, especificador: string): string | null` recebe o caminho do arquivo relativo a `frontend/` (`src/main.tsx`) e devolve o caminho `./src/...` com extensão de um especificador relativo (`./`, `../`) ou de alias (`@/` e `@app/`, `@shared/`, `@features/`, que mapeiam para `src/`, `src/app/`, `src/shared/` e `src/features/`, como no `vite.config.ts`). Tenta, nesta ordem, o caminho literal e os sufixos `.ts`, `.tsx`, `/index.ts` e `/index.tsx`. Devolve `null` para pacote (qualquer outro especificador).

```ts
describe('catraca de sideEffects (bloco 67)', () => {
  it('package.json declara sideEffects com a lista do bloco 67', () => {
    expect(pkg.sideEffects).toEqual(['**/*.css', './src/main.tsx', './src/shared/config/i18n.ts'])
  })

  it('o detector acha import nu e ignora import com nome', () => {
    const fonte = [
      'import "./shared/config/i18n"; // inicializa i18next (side-effect)',
      "import './a.css'",
      "import '@shared/config/b'",
      "import x from './y'",
      "import type { T } from './z'",
      'import {',
      '  a,',
      "} from './d'",
      "export * from './c'",
    ].join('\n')
    expect(importsNus(fonte)).toEqual(['./shared/config/i18n', './a.css', '@shared/config/b'])
    expect(resolverEmSrc('src/main.tsx', './shared/config/i18n')).toBe('./src/shared/config/i18n.ts')
    expect(resolverEmSrc('src/main.tsx', '@shared/config/i18n')).toBe('./src/shared/config/i18n.ts')
    expect(resolverEmSrc('src/main.tsx', 'primereact/resources/primereact.min.css')).toBeNull()
  })

  it('todo import nu em src é CSS, pacote ou módulo da lista sideEffects', () => {
    // Varre src/**/*.{ts,tsx} fora de *.test.*, src/test-setup.ts e src/shared/testing/
    // (nada disso entra no build). Especificador terminado em .css passa; pacote
    // (resolverEmSrc -> null) passa; o resto precisa estar em pkg.sideEffects.
    // Infrator vira a string `${arquivo} -> ${especificador}`.
    expect(infratores).toEqual([])
  })
})
```

`pkg` é o `JSON.parse` de `frontend/package.json`, e o terceiro teste lê `pkg.sideEffects ?? []`, para que a falta do campo também o deixe vermelho.

- [ ] **Step 2: Rodar e ver vermelho**

Run (de `frontend/`): `pnpm exec vitest run --project repo tests/side-effects-ratchet.test.ts`
Expected: 2 falham, 1 passa. O primeiro falha com `sideEffects` `undefined`. O terceiro falha com o infrator `src/main.tsx -> ./shared/config/i18n`. O do detector passa.

- [ ] **Step 3: Declarar a lista em `frontend/package.json`**, exatamente a das Global Constraints.

- [ ] **Step 4: Rodar e ver verde**

Run: `pnpm exec vitest run --project repo tests/side-effects-ratchet.test.ts`
Expected: 3 passam.

- [ ] **Step 5: Mutação.** Tire `"./src/shared/config/i18n.ts"` da lista e rode de novo. Esperado: o primeiro e o terceiro falham, e o terceiro nomeia `src/main.tsx -> ./shared/config/i18n`. Devolva a linha com Edit e rode de novo até ver 3 passando. Sem `git stash`: a pilha é compartilhada entre as lanes.

- [ ] **Step 6: Conferir o build**

Run (de `frontend/`): `pnpm build && ls dist/assets/ui-*.js`
Expected: o build passa e o `ls` falha com `No such file or directory`.

Run: `t=0; for f in $(grep -oE 'assets/[^"]+\.js' dist/index.html | sort -u); do s=$(gzip -c dist/$f | wc -c); echo "$f $s"; t=$((t+s)); done; echo "total_gz_bytes=$t"`
Expected: `total_gz_bytes` até 300000. O planejamento mediu 267850.

- [ ] **Step 7: Gate**

Run (de `frontend/`): `pnpm lint && pnpm test`
Expected: exit 0 nos dois.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/tests/side-effects-ratchet.test.ts
git commit -m "fix(67): sideEffects no package.json do frontend divide o chunk ui"
```

---

### Task 2: prova no build de produção e fechamento

**Files:**
- Create: `docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/fechamento.md`
- Create: `docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/visual/*.png` (só as capturas que provam veredito)

**Interfaces:**
- Consumes: o `sideEffects` e os três testes da Task 1 (pelos nomes).
- Produces: o `fechamento.md` que o `/finalizar-bloco` lê.

- [ ] **Step 1: Subir a stack da lane** (offset +2: HTTP 8082, Vite 5175), pelo comando que o `lane.sh abrir` imprimiu, com `migrate` e `db:seed` se o banco da lane estiver vazio.

- [ ] **Step 2: Servir o build de produção na porta do Vite da lane**, que é a que o `SANCTUM_STATEFUL_DOMAINS` da lane aceita:

Run (de `frontend/`): `VITE_API_URL=http://localhost:8082 pnpm exec vite build && pnpm exec vite preview --port 5175 --strictPort`
Expected: `Local: http://localhost:5175/`. Sem `pnpm dev` rodando junto.

- [ ] **Step 3: Passada visual** a 1440×900, usuário admin, es-CL, com o console aberto, pelo roteiro da spec §5.4:
  - login;
  - Dashboard, com os gráficos desenhados;
  - uma tabela (Personas ou Comercial);
  - um diálogo com PhoneInput (as bandeiras aparecem) e DatePicker (o calendário abre);
  - tema escuro e tema claro;
  - F5 direto em `/personas`.

Expected:
- os rótulos aparecem em espanhol, não como chaves cruas;
- as fontes carregam;
- o console não mostra nenhum erro em nenhuma tela.

Uma regressão aqui para o bloco: volte à Task 1 e acrescente à lista o módulo que sumiu, com teste.

- [ ] **Step 4: Escrever o `fechamento.md`**, no molde do `blocos/64-frontend-revisao-ui-ux-e-icones/fechamento.md`:
  - **Quadro de IDs**, com o D-6 **fechado** e a prova:
    - os três testes da Task 1, pelo nome;
    - a ausência de `ui-*.js` no build;
    - as capturas;
    - a linha "não houve erro de console".
  - **"D-6: números (gzip)"**, com antes e depois:
    - antes: a §2 da spec, `main@7381665f`;
    - depois: o build do Step 2 da Task 1;
    - linhas: entrada, chunk comum pré-carregado, `Dashboard`, `PhoneInput`, `AppDatePicker`, e o total da pré-carga pelo `gzip -c`.
  - **"Gate final"**, com o commit e os números de `pnpm lint`, `pnpm test` e `pnpm build`.

- [ ] **Step 5: Derrubar o preview e commitar**

```bash
git add docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/fechamento.md docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/visual
git commit -m "docs(67): fechamento com o D-6 fechado e a passada no build de produção"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| — | — | — | a Task 2 consome a Task 1 |

Nenhum grupo. Task fora de grupo executa e revisa uma a uma.

## Handoff de execução

- `executor: claude`. A Task 2 exige a stack, o navegador e um julgamento visual, e a Task 1 mexe na forma como o build de produção trata efeito colateral, que é um julgamento fora de código pronto.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`):
  - `implementador-mecanico` para a Task 1, com código e asserções no plano e 2 arquivos;
  - `revisor-task` depois da Task 1;
  - `revisor-branch` no fim.
- A Task 2 fica com a própria sessão, porque precisa da stack e do navegador.
- `paths_autorizados`: não se aplica (executor `claude`).
