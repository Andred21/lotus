# Login fora do ADR-16 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** migrar a tela de login para o ADR-16 — token em vez de utility fixa, navy fixa no lugar do gradiente celeste, papéis tipográficos do produto — fechando os 2 C e os 8 B do review de 2026-08-12 e tirando os dois arquivos da catraca de cor.

**Architecture:** o painel de marca vira a mesma superfície escura fixa da sidebar, alimentada por uma var nova (`--brand-gradient`) na camada fina `brand-theme.css`; o painel do formulário passa a ler `--surface-card`/`--text-color`/`--text-color-secondary`. Dois defeitos são de **wrapper** (`AppPassword`: largura absoluta e nome acessível em inglês) e são corrigidos em `shared/ui`, alcançando 2 call sites. O bloco fecha com a `CATRACA_COR` do `eslint.config.js` indo de 7 para 5 entradas.

**Tech Stack:** React 19 + TS (Vite), Tailwind v4 (só layout), PrimeReact via `shared/ui`, i18n em 3 locales, ESLint flat config.

## Global Constraints

- **Tailwind é layout; cor vem de variável CSS do tema** (ADR-16, `.claude/rules/frontend-fsliced.md`). Grafia do projeto: `style={{ color: 'var(--text-color)' }}`, nunca `text-slate-800`.
- **Features não importam PrimeReact direto** — só via `shared/ui` (lei §5.6). Customização de componente Prime vive no wrapper, nunca com Tailwind na feature.
- **3 locales com chaves idênticas** (`pt-BR`, `es-CL`, `en`); `es-CL` é a referência de rótulo.
- **Componente de feature acima de ~150 linhas quer extração** (`max-lines` sem exceção desde 2026-08-13). `LoginPage.tsx` tem 48 linhas e `LoginForm.tsx` 70 — folga larga, mas conferir no gate.
- **`useLoginForm` fica intocado.** O bloco muda apresentação, não autenticação.
- **`AppLogo` é consumido, não alterado** — o `variant="on-dark"` já existe.
- **Um commit por task**, com o corpo dizendo o que foi medido.
- **`backlog.md` não é editado por este plano.** A baixa do item 4 e dos débitos é passo do `/fechar-sprint`.
- **Fora de escopo declarado (spec §8):** fluxo de recuperação de senha; a guarda contra cor cravada em JS e os dois sítios que ela pegaria (`FormSection.tsx:19`, `CoursesTable.tsx:43`); `ValidationPage`; refatorar `AppLogo`.

**Sobre "test first" neste plano:** o runner não cobre componente com PrimeReact no jsdom (`frontend-fsliced.md`, §Comandos), e o bloco é apresentação. Onde existe vermelho real ele está escrito como passo — a catraca da Task 8 (sonda que reprova o lint) e o nome acessível da Task 6 (lido no DOM antes e depois). Onde não existe, a verificação é comando executável com saída esperada, não "conferir se está bom". Nenhuma task fecha por leitura de código.

**Baseline medido nesta branch (2026-08-13, commit `09a53b9`):** `pnpm lint` exit 0 · `pnpm build` verde · `pnpm test` **29 arquivos / 143 testes**. Projeção deste plano: **inalterado em 29/143** — nenhuma task escreve teste, porque a superfície inteira está fora do corte do runner.

**Comandos, todos de `frontend/`:** `pnpm lint` · `pnpm build` · `pnpm test` · `pnpm dev`.

---

## Mapa de arquivos

| Arquivo | Responsabilidade depois do bloco | Tasks |
|---|---|---|
| `frontend/src/shared/styles/brand-theme.css` | ganha `--brand-gradient`, a única fonte do degradê de marca | 1 |
| `frontend/src/features/identity/components/Login/LoginPage.tsx` | layout dos dois painéis, superfícies por token, faixa mobile | 1, 2, 3, 7 |
| `frontend/src/features/identity/components/Login/LoginForm.tsx` | formulário: tipografia, cor por token, copy, `autocomplete` | 4, 5, 6 |
| `frontend/src/shared/ui/AppPassword/AppPassword.tsx` | largura fluida e nome acessível traduzido — para **toda** tela com senha | 6 |
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | copy nova + as duas chaves do olho da senha | 5, 6 |
| `frontend/eslint.config.js` | `CATRACA_COR` de 7 para 5, comentário reescrito | 8 |
| `docs/pendencias.md` | P-36: a guarda de cor não enxerga `style`/template string | 9 |

---

### Task 1: `--brand-gradient` — o degradê sai do JS e vira token

Fecha o UI-05. O `#1b7fb8` não existe em `brand-theme.css` nem nas duas folhas geradas; o `#25A5E4` entra por template string, que nenhum grep de higiene de hex alcança.

**Files:**
- Modify: `frontend/src/shared/styles/brand-theme.css:9-40` (bloco `:root`)
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:1-19`

**Interfaces:**
- Consumes: `--primary-900` (`#0c3549`) e `--brand-navy` (`#0f2b3d`), já existentes.
- Produces: `--brand-gradient`, consumida por `style={{ background: 'var(--brand-gradient)' }}` no `aside` do login. Tasks 2, 3 e 7 mexem no mesmo `aside` e não redeclaram o fundo.

- [ ] **Step 1: medir o estado de hoje, para o depois ter contra o quê comparar**

```bash
cd frontend
grep -n "1b7fb8\|BRAND_COLOR" src/features/identity/components/Login/LoginPage.tsx
```

Esperado: `2:import { BRAND_COLOR, APP_VERSION } from "@shared/config/brand";` e `17:          background: \`linear-gradient(135deg, ${BRAND_COLOR}, #1b7fb8)\`,`

- [ ] **Step 2: declarar a var na camada fina**

Em `frontend/src/shared/styles/brand-theme.css`, dentro do bloco `:root`, logo **depois** da linha `--brand-navy`:

```css
  /* Degradê do painel de marca do login (UI-05 do review de 2026-08-12). Era
   * `linear-gradient(135deg, ${BRAND_COLOR}, #1b7fb8)` montado em JS, com o
   * segundo ponto fora de qualquer fonte de verdade — nem grep de hex nem o
   * transform do tema gerado alcançam template string em `.tsx`.
   *
   * Os dois pontos são degraus que JÁ existem, e a escala `--primary-*` é
   * idêntica byte a byte nas duas folhas geradas: por isso o painel é
   * superfície escura FIXA nos dois temas, como a sidebar, sem redeclarar nada
   * por tema. Diferença de luminância entre as pontas: 1,13:1 — degradê
   * mínimo, não campo de cor. */
  --brand-gradient: linear-gradient(160deg, var(--primary-900), var(--brand-navy));
```

- [ ] **Step 3: consumir a var no `aside` e matar o import**

Em `frontend/src/features/identity/components/Login/LoginPage.tsx`, trocar a linha 2 e o bloco `style` do `aside`:

```tsx
import { useTranslation } from "react-i18next";
import { APP_VERSION } from "@shared/config/brand";
import { LoginForm } from "./LoginForm";
import { AppearanceControls, AppLogo } from "@/shared/ui";
```

```tsx
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 text-white md:w-1/2 overflow-hidden"
        style={{ background: 'var(--brand-gradient)' }}
      >
```

`APP_VERSION` continua importado — só o `BRAND_COLOR` sai.

- [ ] **Step 4: provar que o hex morreu e que a tela compila**

```bash
cd frontend
grep -rn "1b7fb8" src/ ; echo "GREP_EXIT=$?"
pnpm build 2>&1 | tail -3
```

Esperado: o grep não imprime nenhuma linha e `GREP_EXIT=1` (nada encontrado). Build verde.

- [ ] **Step 5: provar no navegador que o fundo renderizado é o novo**

```bash
cd frontend && pnpm dev
```

Com o dev server de pé, em `http://localhost:5173/login`, no console do navegador:

```js
getComputedStyle(document.querySelector('aside')).backgroundImage
```

Esperado: `linear-gradient(160deg, rgb(12, 53, 73), rgb(15, 43, 61))`. **Não** pode conter `rgb(37, 165, 228)` nem `rgb(27, 127, 184)`, que são o gradiente velho.

- [ ] **Step 6: commit**

```bash
git add frontend/src/shared/styles/brand-theme.css frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "feat(login): degrade de marca vira --brand-gradient

UI-05: o degrade era montado em JS com #1b7fb8, hex que nao existe em
brand-theme.css nem nas duas folhas geradas. Vira var na camada fina,
com os dois pontos saindo de degraus existentes (--primary-900 e
--brand-navy). A escala --primary-* e identica nas duas folhas, entao o
painel e superficie escura fixa nos dois temas sem redeclarar nada.

Medido no navegador: backgroundImage do aside vira
linear-gradient(160deg, rgb(12,53,73), rgb(15,43,61))."
```

---

### Task 2: painel de marca — asset certo, escala e papéis tipográficos

Fecha o C-1 (wordmark ilegível), o UI-06 (texto sobre o gradiente reprovando AA) e o defeito não numerado do glifo. Aplica as decisões D5 e D8.

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:13-32` (o `aside`)

**Interfaces:**
- Consumes: `AppLogo` com `variant="on-dark"` (`shared/ui/AppLogo/AppLogo.tsx:14`), `--primary-200/300/400`, `--brand-gradient` da Task 1.
- Produces: o `aside` na forma final de desktop. A Task 7 acrescenta só a altura da faixa mobile.

- [ ] **Step 1: reescrever o corpo do `aside`**

Em `frontend/src/features/identity/components/Login/LoginPage.tsx`, substituir o conteúdo do `aside` (o `AppLogo`, o `<p>` da tagline e o `<span>` da versão) por:

```tsx
        <AppLogo variant="on-dark" className="w-52" />

        <p className="text-center text-xl" style={{ color: 'var(--primary-200)' }}>
          {t("brand.tagline")}
        </p>

        <p
          className="text-center font-mono text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--primary-400)' }}
        >
          {t("brand.sector")}
        </p>

        <span
          className="absolute bottom-4 font-mono text-[13px] tabular-nums"
          style={{ color: 'var(--primary-300)' }}
        >
          {APP_VERSION}
        </span>
```

Some o `<br/>` que colava o setor na tagline: o setor mudou de papel tipográfico e não pode herdar o do parágrafo. Some também o `text-white` do `className` do `aside`, porque nenhum filho depende mais dele:

```tsx
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 md:w-1/2 overflow-hidden"
        style={{ background: 'var(--brand-gradient)' }}
      >
```

- [ ] **Step 2: build e lint**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"
```

Esperado: build verde, `LINT_EXIT=0`.

- [ ] **Step 3: provar no navegador que o asset trocou e os contrastes subiram**

Com `pnpm dev` de pé, em `http://localhost:5173/login` **no tema claro**, no console:

```js
document.querySelector('aside img').src.match(/Logo\w+/)[0]
```

Esperado: `LogoDark` — o asset claro sobre fundo escuro. Antes desta task, no tema claro, era `LogoLight` (é o C-1).

```js
[...document.querySelectorAll('aside p, aside span')].map(e => [e.textContent.slice(0,18), getComputedStyle(e).color, getComputedStyle(e).fontFamily.split(',')[0]])
```

Esperado: tagline em `rgb(194, 230, 247)` (`--primary-200`) com família `Inter`; setor em `rgb(98, 190, 236)` (`--primary-400`) com família `"IBM Plex Mono"`; versão em `rgb(150, 212, 242)` (`--primary-300`), família `"IBM Plex Mono"`.

- [ ] **Step 4: conferir que a versão alinha em coluna**

```js
getComputedStyle([...document.querySelectorAll('aside span')].at(-1)).fontVariantNumeric
```

Esperado: `tabular-nums`.

- [ ] **Step 5: commit**

```bash
git add frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "feat(login): painel de marca ganha asset certo e escala decidida

C-1: AppLogo variant=auto escolhe o asset pelo TEMA, e o painel nao
acompanha o tema — no claro entregava LogoLight (tinta escura) sobre
fundo escuro, 1,45:1 a 2,30:1. variant=on-dark e a escolha correta para
superficie escura fixa, mesma decisao ja tomada na sidebar. O glifo
celeste sobre campo celeste morre pela mesma troca de fundo.

UI-06: tagline e versao reprovavam AA (3,10:1 e 2,79:1). Passam a
--primary-200 e --primary-300 sobre a navy: 9,84:1 e 8,02:1 no pior
ponto do degrade. Setor vira mono caixa alta em --primary-400 (6,23:1)
e sai do <br/>, porque mudou de papel tipografico.

Wordmark 160px -> 208px (D5). Medido no navegador: asset LogoDark no
tema claro, as tres cores computadas e tabular-nums na versao."
```

---

### Task 3: superfícies do painel do formulário

Fecha metade do UI-03 (a tela não lê token de superfície) e resolve a divisa invisível do tema escuro, que é achado novo da análise rev. 2.

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:11,36`

**Interfaces:**
- Consumes: `--surface-ground`, `--surface-card`, `--surface-border`.
- Produces: o `main` com fundo próprio. A Task 7 mexe só no posicionamento do `AppearanceControls` dentro dele.

- [ ] **Step 1: medir o que a tela pinta hoje**

Com `pnpm dev` de pé, em `/login` **no tema escuro**, no console:

```js
[getComputedStyle(document.querySelector('main')).backgroundColor,
 getComputedStyle(document.documentElement).getPropertyValue('--surface-card').trim()]
```

Esperado hoje: `["oklch(0.208 0.042 265.755)", "#1e293b"]` — o `main` pinta slate-900 do Tailwind, não o token. É o UI-03.

- [ ] **Step 2: trocar a raiz e o `main` por token**

Em `frontend/src/features/identity/components/Login/LoginPage.tsx`:

```tsx
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: 'var(--surface-ground)' }}
    >
```

```tsx
      <main
        className="relative flex flex-1 items-center justify-center p-8 md:w-1/2 dark:border-t md:dark:border-t-0 md:dark:border-l"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
      >
```

O `dark:bg-slate-900` sai dos dois. A divisa é **só do tema escuro**: `dark:border-t` no telefone (painéis empilhados) e `md:dark:border-l` no desktop (lado a lado). No claro nenhuma largura de borda é declarada, então o `borderColor` fica inerte.

- [ ] **Step 3: provar que a divisa existe no escuro e não existe no claro**

No console, **tema escuro**, a 1440px:

```js
const m = getComputedStyle(document.querySelector('main'));
[m.backgroundColor, m.borderLeftWidth, m.borderLeftColor]
```

Esperado: `["rgb(30, 41, 59)", "1px", <cor com alpha 0.1>]` — o `--surface-card` do escuro e o traço presente.

Trocar para o **tema claro** e repetir:

```js
const m = getComputedStyle(document.querySelector('main'));
[m.backgroundColor, m.borderLeftWidth]
```

Esperado: `["rgb(255, 255, 255)", "0px"]` — branco e **sem** traço.

- [ ] **Step 4: build e lint**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"
```

Esperado: build verde, `LINT_EXIT=0`.

- [ ] **Step 5: commit**

```bash
git add frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "feat(login): superficies do painel do formulario por token

UI-03: a raiz e o main pintavam dark:bg-slate-900 e no claro nem
pintavam — fundo branco do agente de usuario em vez do humo. Passam a
--surface-ground (raiz) e --surface-card (main).

O formulario fica em --surface-card e nao no humo por AA, nao por gosto:
--text-color-secondary mede 4,34:1 sobre #f1f5f9 (reprova o 4,5:1) e
4,76:1 sobre o branco, e subtitulo e texto de ajuda vivem nesse token.

Divisa so no escuro: navy #0f2b3d e --surface-card escuro #1e293b medem
1,0016:1 de luminancia — sem traco a divisa some. No claro a divisa
branco/navy ja mede 14,65:1 e um traco ali pareceria artefato. Medido
nos dois temas: 1px no escuro, 0px no claro."
```

---

### Task 4: tipografia e cor do formulário

Fecha o UI-04 (o `h1` fora do papel tipográfico) e a outra metade do UI-03 (texto e rótulos sem token). Aplica a D11.

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx:1-2,27-30,34-60`

**Interfaces:**
- Consumes: `dangerText` de `frontend/src/shared/styles/tokens.ts:17` — a fórmula `color-mix(in srgb, var(--red-500) 70%, var(--text-color))`, mesma que serve os 13 sítios do kit.
- Produces: `LoginForm` sem nenhuma utility de cor. A Task 8 depende disso: sem esta task a catraca não pode encolher.

- [ ] **Step 1: medir o `h1` de hoje**

Com `pnpm dev` de pé, em `/login`, no console:

```js
const h = getComputedStyle(document.querySelector('h1'));
[h.fontFamily.split(',')[0], h.fontWeight, h.letterSpacing, h.color]
```

Esperado hoje: `["Inter", "700", "normal", "oklch(0.279 0.041 260.031)"]` — Inter, peso 700, sem tracking, slate-800 do Tailwind. O `PageHeader` renderiza Archivo 600 com `tracking-tight` e `var(--text-color)`.

- [ ] **Step 2: importar o token de erro**

Em `frontend/src/features/identity/components/Login/LoginForm.tsx`, acrescentar após a linha 2:

```tsx
import { dangerText } from "@shared/styles/tokens";
```

- [ ] **Step 3: trocar título e subtítulo**

```tsx
      <div>
        <h1
          className="font-display text-2xl font-semibold tracking-tight"
          style={{ color: 'var(--text-color)' }}
        >
          {t("login.title")}
        </h1>
        <p style={{ color: 'var(--text-color-secondary)' }}>{t("login.subtitle")}</p>
      </div>
```

**Não** converter para `PageHeader`: o molde carrega layout de página interna que não cabe aqui.

- [ ] **Step 4: trocar rótulos e mensagens de erro dos dois campos**

Rótulo do e-mail e do password — o tamanho e o peso **não mudam** (D5: "rótulos inalterados"), só a cor deixa de ser herdada do preto puro:

```tsx
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.email")}</span>
```

```tsx
        <span className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.password")}</span>
```

As duas mensagens de erro:

```tsx
        {fieldErrors?.email && (
          <small style={{ color: dangerText }}>{fieldErrors.email[0]}</small>
        )}
```

```tsx
        {fieldErrors?.password && (
          <small style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
        )}
```

- [ ] **Step 5: provar que não sobrou utility de cor no arquivo**

```bash
cd frontend
grep -nE "text-(slate|gray|red)-[0-9]{2,3}|dark:text-" src/features/identity/components/Login/LoginForm.tsx; echo "GREP_EXIT=$?"
```

Esperado: nenhuma linha impressa e `GREP_EXIT=1`.

- [ ] **Step 6: provar o `h1` no navegador**

```js
const h = getComputedStyle(document.querySelector('h1'));
[h.fontFamily.split(',')[0], h.fontWeight, h.letterSpacing, h.color]
```

Esperado: `["Archivo", "600", "-0.025em", "rgb(51, 65, 85)"]` no tema claro — a família de display, o peso e o tracking do `PageHeader`, e a cor vindo de `--text-color`.

E os rótulos, que hoje são preto puro:

```js
[...document.querySelectorAll('label > span')].map(s => getComputedStyle(s).color)
```

Esperado: `["rgb(51, 65, 85)", "rgb(51, 65, 85)"]` — não mais `rgb(0, 0, 0)`.

- [ ] **Step 7: build e lint**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"
```

Esperado: build verde, `LINT_EXIT=0`.

- [ ] **Step 8: commit**

```bash
git add frontend/src/features/identity/components/Login/LoginForm.tsx
git commit -m "feat(login): tipografia e cor do formulario por token

UI-04: o h1 do login era o unico h1 do produto sem font-display — Inter
700 sem tracking contra Archivo 600 tracking-tight do PageHeader, mesmo
papel semantico. Passa ao papel de display sem virar PageHeader, cujo
molde carrega layout de pagina interna.

UI-03 (segunda metade): rotulos eram preto puro sem classe de cor,
subtitulo era gray-500 e os erros text-red-600 dark:text-red-400. Cor
so por token; o erro passa a dangerText de shared/styles/tokens, a
formula de UM dono que ja serve os 13 sitios do kit.

Tamanho e peso dos rotulos ficam como estao (D5: rotulos inalterados),
e por isso o kit FormField NAO foi adotado — ele pinta label em 14px
secundario. Medido no navegador: h1 Archivo 600 -0.025em, rotulos em
rgb(51,65,85) no lugar de rgb(0,0,0)."
```

---

### Task 5: copy — a RN-01 na tela e o link que não era link

Fecha o UI-07. Aplica a D7.

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json:2-9`
- Modify: `frontend/src/shared/config/locales/pt-BR.json:2-9`
- Modify: `frontend/src/shared/config/locales/en.json:2-9`
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx:64-67`

**Interfaces:**
- Consumes: `login.subtitle` e `login.forgot`, chaves que já existem nos três locales.
- Produces: nenhuma chave nova. A Task 6 acrescenta duas chaves em `common`, noutro bloco do mesmo arquivo.

- [ ] **Step 1: trocar as duas frases em `es-CL`**

Em `frontend/src/shared/config/locales/es-CL.json`:

```json
    "subtitle": "Acceso para administradores y redactores",
```

```json
    "forgot": "¿Perdiste el acceso? Pídelo al administrador de la plataforma."
```

- [ ] **Step 2: trocar as mesmas duas em `pt-BR`**

```json
    "subtitle": "Acesso para administradores e redatores",
```

```json
    "forgot": "Perdeu o acesso? Peça ao administrador da plataforma."
```

- [ ] **Step 3: trocar as mesmas duas em `en`**

```json
    "subtitle": "Access for administrators and writers",
```

```json
    "forgot": "Lost your access? Ask the platform administrator."
```

- [ ] **Step 4: o stub deixa de fingir link**

Em `frontend/src/features/identity/components/Login/LoginForm.tsx`, trocar a âncora inteira (com o comentário acima dela) por:

```tsx
      {/* Texto de ajuda, não link: não existe endpoint de recuperação de senha,
          e uma <a> sem href fica fora da ordem de tabulação (UI-07). */}
      <p className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t("login.forgot")}
      </p>
```

- [ ] **Step 5: provar que as três locales seguem com chaves idênticas**

```bash
cd frontend
for f in es-CL pt-BR en; do node -e "
const o=require('./src/shared/config/locales/$f.json');
const walk=(x,p='')=>Object.entries(x).flatMap(([k,v])=>typeof v==='object'?walk(v,p+k+'.'):[p+k]);
console.log('$f', walk(o).length);
"; done
```

Esperado: os três imprimem **o mesmo número**.

- [ ] **Step 6: provar no navegador que a âncora morreu**

Com `pnpm dev` de pé, em `/login`:

```js
[document.querySelectorAll('form a').length, document.querySelector('form p:last-of-type').textContent]
```

Esperado: `0` âncoras dentro do formulário, e o texto de ajuda novo. Antes desta task era `1`.

- [ ] **Step 7: build, lint e testes**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"; pnpm test 2>&1 | tail -4
```

Esperado: build verde, `LINT_EXIT=0`, **29 arquivos / 143 testes**.

- [ ] **Step 8: commit**

```bash
git add frontend/src/shared/config/locales frontend/src/features/identity/components/Login/LoginForm.tsx
git commit -m "feat(login): copy nova e o stub que deixa de fingir link

UI-07: '¿Olvidaste tu contrasena?' media 2,60:1 e NAO entrava na ordem
de tabulacao — era <a> sem href, e as seis paradas do Tab medidas no
review nao o incluiam. Vira <p> em --text-color-secondary (4,76:1 sobre
o branco), dizendo a verdade: nao ha endpoint de recuperacao.

O subtitulo passa a levar a RN-01 para a tela ('acesso para
administradores e redatores'), para cliente e aluno pararem de tentar.

Tres locales com contagem de chaves identica, conferida por script."
```

---

### Task 6: o par credencial — largura, nome acessível e `autocomplete`

Fecha o C-2, o UI-08 e o UI-09. Aplica a D6. **É a única task que alcança tela fora do login.**

**Files:**
- Modify: `frontend/src/shared/ui/AppPassword/AppPassword.tsx:1-53`
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` (bloco `common`)
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx:36-56`

**Interfaces:**
- Consumes: `useTranslation` de `react-i18next` — já usado por outro wrapper de `shared/ui` (`AppearanceControls`), então não é fronteira nova.
- Produces: `AppPassword` com nome acessível traduzido em **todos** os call sites. Chaves novas: `common.showPassword`, `common.hidePassword`.
- **Alcance medido: 2 call sites** — `LoginForm` e `StaffIdentifyFields` (este consumido só por `StaffUserDialog`).

- [ ] **Step 1: medir o defeito nos dois eixos, antes de tocar**

Com `pnpm dev` de pé, em `/login` a **390x844**, no console:

```js
[innerWidth, document.documentElement.scrollWidth,
 document.querySelector('input[type="password"]').getBoundingClientRect().width]
```

Esperado hoje: `[390, 416, 384]` — 26px de vazamento, o input com os 384px absolutos do `w-96`.

Trocar o idioma para ES e ler o nome acessível:

```js
[document.documentElement.lang, document.querySelector('[role="switch"]').getAttribute('aria-label')]
```

Esperado hoje: `["es-CL", "Show Password"]` — interface em espanhol, rótulo em inglês.

E os `autocomplete`:

```js
[...document.querySelectorAll('form input')].map(i => [i.type, i.autocomplete])
```

Esperado hoje: `[["email", ""], ["password", ""]]`.

- [ ] **Step 2: acrescentar as duas chaves nos três locales**

No bloco `common` de `frontend/src/shared/config/locales/es-CL.json`, junto de `toggleTheme`:

```json
    "showPassword": "Mostrar contraseña",
    "hidePassword": "Ocultar contraseña",
```

`pt-BR.json`:

```json
    "showPassword": "Mostrar senha",
    "hidePassword": "Ocultar senha",
```

`en.json`:

```json
    "showPassword": "Show password",
    "hidePassword": "Hide password",
```

- [ ] **Step 3: reescrever o wrapper**

Substituir o corpo de `frontend/src/shared/ui/AppPassword/AppPassword.tsx` (a partir da linha 26) por:

```tsx
export const AppPassword = forwardRef<HTMLInputElement, AppPasswordProps>(
  ({ leftIcon, pt, ...props }, ref) => {
    const { t } = useTranslation()
    // Nome acessível do olho. O default do Prime é "Show/Hide Password" em
    // inglês (password.cjs.js:605,614) e chega a TODA tela com senha — o
    // wrapper é a única porta (UI-08). Não vai pela locale global do Prime:
    // `locale('es')` nunca é chamado no projeto (primeLocale.ts só faz
    // `addLocale`), então um rótulo pendurado lá ficaria congelado na troca de
    // idioma. Pinado DEPOIS do `pt` do chamador: nome acessível não é opcional.
    const ariaPt = {
      showIcon: { 'aria-label': t('common.showPassword') },
      hideIcon: { 'aria-label': t('common.hidePassword') },
    }
    if (!leftIcon) {
      return (
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          inputClassName={darkInput}
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      )
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={`${leftIcon} z-10 dark:text-[var(--text-color-secondary)]`} />
        <Password
          inputRef={ref}
          toggleMask
          feedback={false}
          className="w-full dark:text-[var(--text-color-secondary)]"
          inputClassName={`w-full pl-10 ${darkInput}`}
          {...props}
          pt={{ ...pt, ...ariaPt }}
        />
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
```

E o import novo no topo do arquivo, depois do `import { forwardRef } from 'react'`:

```tsx
import { useTranslation } from 'react-i18next'
```

O docblock do componente ganha uma linha final:

```
 * A largura do input é `w-full`, como o irmão AppInputText: `w-96` são 384px
 * absolutos que não encolhem e vazavam a viewport de 390px (C-2 do review de
 * 2026-08-12), levando o olho da senha para fora da tela.
```

- [ ] **Step 4: `autocomplete` no call site do login**

Em `frontend/src/features/identity/components/Login/LoginForm.tsx`, acrescentar um atributo em cada campo — `autoComplete` é repassado ao input pelo Prime (`password.cjs.js:713`):

```tsx
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          invalid={!!fieldErrors?.email}
        />
```

```tsx
        <AppPassword
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
        />
```

- [ ] **Step 5: provar os três defeitos fechados no navegador**

A 390x844, em `/login`:

```js
[innerWidth, document.documentElement.scrollWidth,
 document.querySelector('input[type="password"]').getBoundingClientRect().width]
```

Esperado: `scrollWidth === innerWidth === 390`, e a largura do input **menor que 390**, não mais 384 fixos.

Com o idioma em ES:

```js
[document.documentElement.lang, document.querySelector('[role="switch"]').getAttribute('aria-label')]
```

Esperado: `["es-CL", "Mostrar contraseña"]`. Clicar no olho e reler: `"Ocultar contraseña"`.

```js
[...document.querySelectorAll('form input')].map(i => [i.type, i.autocomplete])
```

Esperado: `[["email", "username"], ["password", "current-password"]]`.

- [ ] **Step 6: provar a não-regressão no call site fora do login**

Ainda com `pnpm dev`, autenticar e abrir `/personas` → aba de staff → diálogo de usuário (o `StaffUserDialog`, que monta `StaffIdentifyFields`), a **1440x900**. No console:

```js
const p = document.querySelector('.p-dialog input[type="password"]');
[p.getBoundingClientRect().width, p.closest('.p-icon-field').getBoundingClientRect().width]
```

Esperado: as duas larguras **iguais** — o input ocupa a linha inteira do campo, como ocupava com `w-96` num diálogo mais largo que 384px. Se a primeira for menor que a segunda, a troca regrediu e a task não fecha.

- [ ] **Step 7: build, lint e testes**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"; pnpm test 2>&1 | tail -4
```

Esperado: build verde, `LINT_EXIT=0`, **29 arquivos / 143 testes**.

- [ ] **Step 8: commit**

```bash
git add frontend/src/shared/ui/AppPassword frontend/src/shared/config/locales frontend/src/features/identity/components/Login/LoginForm.tsx
git commit -m "fix(shared/ui): AppPassword ganha largura fluida e nome acessivel

C-2: inputClassName fixava w-96 — 384px absolutos que nao encolhem —
enquanto o irmao AppInputText usa w-full. A 390px o scrollWidth media
416 e o olho da senha ficava fora da tela. Defeito do wrapper: toda
tela com AppPassword + leftIcon herdava.

UI-08: o aria-label do olho vinha do default do Prime ('Show Password')
com a interface em es-CL. Vai pelo pt do wrapper e nao pela locale
global, porque locale('es') nunca e chamado no projeto — um rotulo
pendurado la ficaria congelado na troca de idioma. Pinado depois do pt
do chamador.

UI-09: os dois campos do login declaram autocomplete username e
current-password; o proprio Chrome registrava o aviso no console.

Alcance medido: 2 call sites. A nao-regressao de largura no
StaffUserDialog foi conferida no navegador, nao presumida."
```

---

### Task 7: layout mobile — a faixa compacta e os controles fora da faixa do título

Fecha o UI-10.

**Files:**
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx` (o `aside`, o `AppLogo` e o `AppearanceControls`)

**Interfaces:**
- Consumes: o `aside` na forma da Task 2 e o `main` na forma da Task 3.
- Produces: a forma final do `LoginPage`. Nenhuma task posterior o modifica.

- [ ] **Step 1: medir a disputa de faixa que existe hoje**

Com `pnpm dev` de pé, em `/login` a **390x844**:

```js
const a = document.querySelector('aside').getBoundingClientRect();
const c = document.querySelector('main > div').getBoundingClientRect();
const h = document.querySelector('h1').getBoundingClientRect();
[a.height, c.top, c.bottom, h.top]
```

Esperado hoje: a altura do `aside` perto de **391**, e a caixa do `AppearanceControls` cobrindo a linha do `h1` (o `top` do `h1` cai entre o `top` e o `bottom` dos controles).

- [ ] **Step 2: dar altura à faixa e encolher o wordmark no telefone**

```tsx
      <aside
        className="relative flex h-[250px] flex-col items-center justify-center gap-4 p-10 md:h-auto md:w-1/2 overflow-hidden"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <AppLogo variant="on-dark" className="w-[150px] md:w-52" />
```

- [ ] **Step 3: tirar os controles do fluxo absoluto no telefone**

```tsx
      <main
        className="relative flex flex-1 flex-col items-center justify-center gap-6 p-8 md:w-1/2 dark:border-t md:dark:border-t-0 md:dark:border-l"
        style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
      >
        <AppearanceControls className="self-end md:absolute md:top-4 md:right-4 select-none" />

        <LoginForm />
      </main>
```

No telefone o `main` vira coluna e os controles ocupam faixa própria, alinhados à direita pelo `self-end`; a partir de `md` voltam a ser âncora absoluta no canto, como no desktop.

- [ ] **Step 4: provar que a disputa acabou a 390px**

```js
const a = document.querySelector('aside').getBoundingClientRect();
const c = document.querySelector('main > div').getBoundingClientRect();
const h = document.querySelector('h1').getBoundingClientRect();
[a.height, c.bottom <= h.top, document.documentElement.scrollWidth === innerWidth]
```

Esperado: altura do `aside` **250**, `c.bottom <= h.top` **true** (os controles terminam acima do título, sem dividir a faixa) e **sem** overflow horizontal.

- [ ] **Step 5: provar que o desktop não regrediu**

A **1440x900**:

```js
const c = document.querySelector('main > div').getBoundingClientRect();
[getComputedStyle(document.querySelector('main > div')).position, Math.round(c.top)]
```

Esperado: `["absolute", 16]` — os controles voltaram ao canto superior, como o review mediu a 1024 (`y 16`).

- [ ] **Step 6: build e lint**

```bash
cd frontend && pnpm build 2>&1 | tail -3 && pnpm lint; echo "LINT_EXIT=$?"
```

Esperado: build verde, `LINT_EXIT=0`.

- [ ] **Step 7: commit**

```bash
git add frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "feat(login): faixa de marca compacta e controles fora da faixa do titulo

UI-10: a 390px o par idioma/tema descia com o painel do formulario e
passava a dividir a faixa vertical do h1, porque o posicionamento e
absolute top-4 right-4 relativo ao main — e no layout de coluna o main
comeca logo abaixo do painel de marca.

A faixa de marca cai de 391px para 250px, o wordmark encolhe para 150px
no telefone e os controles ganham fluxo proprio; absolute so a partir de
md. Assim o par nao precisa de variante nova para viver sobre navy.

Medido nos dois extremos: a 390 os controles terminam acima do titulo e
scrollWidth == innerWidth; a 1440 o par volta ao canto (position
absolute, top 16)."
```

---

### Task 8: a catraca de cor encolhe — 7 para 5

Aplica a D9. **Esta task só pode rodar depois das Tasks 3, 4 e 5**, que são as que tiram a última utility de cor dos dois arquivos.

**Files:**
- Modify: `frontend/eslint.config.js:141-151`

**Interfaces:**
- Consumes: `LoginPage.tsx` e `LoginForm.tsx` sem utility de cor (Tasks 3, 4, 5).
- Produces: a regra `COR_HARDCODED` valendo sem exceção nos dois arquivos.

- [ ] **Step 1: provar que a lista de hoje tem 7 e que o login está nela**

```bash
cd frontend
grep -c "^  'src/" eslint.config.js
grep -n "Login/Login" eslint.config.js
```

Esperado: `7` e as duas linhas do login (`LoginForm.tsx` e `LoginPage.tsx`).

- [ ] **Step 2: tirar as duas linhas e reescrever o comentário**

Em `frontend/eslint.config.js`, o bloco inteiro do comentário mais o array passa a ser:

```js
// Catraca da regra de cor: lista que só ENCOLHE. A Validação tem fundo escuro
// deliberado e mudá-la é desenho novo, não pagamento de débito (D7). O Login
// SAIU em 2026-08-13: o desenho novo que esta linha previa é o bloco
// `login-fora-do-adr16`, e a tela passou a ler token de superfície e de texto
// em vez de utility fixa. Não reintroduza arquivo aqui para calar o lint —
// quem precisa de cor pede token ao tema.
const CATRACA_COR = [
  'src/features/certification/components/Validation/ValidationPage.tsx',
  'src/features/commercial/components/Budget/CourseStep.tsx',
  'src/features/commercial/components/Budget/QuoteWizard.tsx',
  'src/features/operation/components/Document/ManualButton.tsx',
  'src/features/commercial/components/Client/ClientsTable.tsx',
]
```

- [ ] **Step 3: provar que o lint fica verde com a régua valendo**

```bash
cd frontend && pnpm lint; echo "LINT_EXIT=$?"
grep -c "^  'src/" eslint.config.js
```

Esperado: `LINT_EXIT=0` e `5`.

- [ ] **Step 4: SONDA — provar que a régua vale de verdade, nos dois sentidos**

Verde sozinho não distingue "a régua vale" de "a regra parou de casar o glob". Reintroduzir uma utility de cor no `LoginForm`:

```bash
cd frontend
sed -i 's|<p style={{ color: .var(--text-color-secondary). }}>{t("login.subtitle")}</p>|<p className="text-slate-800">{t("login.subtitle")}</p>|' src/features/identity/components/Login/LoginForm.tsx
grep -n "text-slate-800" src/features/identity/components/Login/LoginForm.tsx
pnpm lint 2>&1 | grep -A 2 "LoginForm"; echo "LINT_EXIT=${PIPESTATUS[0]}"
```

Esperado: o lint **reprova** nomeando `src/features/identity/components/Login/LoginForm.tsx` com a mensagem `Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema (ADR-16).`

- [ ] **Step 5: desfazer a sonda e confirmar a árvore limpa**

```bash
cd /home/jvbat/projetos/lotus
git checkout -- frontend/src/features/identity/components/Login/LoginForm.tsx
git status --short
cd frontend && pnpm lint; echo "LINT_EXIT=$?"
```

Esperado: `git status --short` mostra **só** `frontend/eslint.config.js` modificado, e `LINT_EXIT=0`.

- [ ] **Step 6: commit**

```bash
git add frontend/eslint.config.js
git commit -m "chore(lint): login sai da catraca de cor, 7 vira 5

O comentario da propria lista previa este bloco: 'Login e Validacao tem
fundo escuro deliberado — muda-las e desenho novo, nao pagamento de
debito'. O desenho novo aconteceu, entao a isencao deixou de ter motivo.

Numa tela sem teste de componente (PrimeReact no jsdom esta fora do
corte do runner) esta e a unica guarda possivel: a partir daqui,
qualquer cor por utility no login reprova o build.

Provado nos dois sentidos, nao por lint verde: com as duas linhas fora
o lint sai em 0; com um text-slate-800 reintroduzido no LoginForm ele
reprova nomeando o arquivo. Arvore restaurada e conferida depois."
```

---

### Task 9: P-36 — a lacuna que este bloco mediu e não fechou

Aplica a D10. Registro durável do que ficou aberto, para não virar promessa perdida.

**Files:**
- Modify: `docs/pendencias.md` (tabela de pendências abertas)

**Interfaces:**
- Consumes: as medições da spec §1.3(c).
- Produces: a linha P-36. **P-35 é o maior ID em uso** — conferido em 2026-08-13.

- [ ] **Step 1: confirmar que P-36 está livre**

```bash
cd /home/jvbat/projetos/lotus
grep -oE "\| P-[0-9]+" docs/pendencias.md | sort -t- -k2 -n | tail -2
```

Esperado: a última linha é `| P-35`. Se aparecer `P-36`, **pare** — outra branch publicou o ID e o número desta linha muda.

- [ ] **Step 2: acrescentar a linha na tabela de abertas**

Depois da linha `P-35` em `docs/pendencias.md`:

```markdown
| P-36 | A catraca `COR_HARDCODED` só enxerga `className`: cor entrando por `style={{ … }}` ou por template string em `.tsx` passa verde | O próprio `frontend/src/shared/styles/tokens.ts:11-13` já registrava a lacuna ("uma cor errada entrando por `style` passava verde"); o bloco `login-fora-do-adr16` (2026-08-13) a mediu com dois sítios vivos, ambos pintando o celeste como PRIMEIRO PLANO sobre superfície clara a **2,77:1** — que é exatamente o número que o `--brand-ink` existe para consertar: `frontend/src/shared/ui/FormSection/FormSection.tsx:19` (`style={{ color: BRAND_COLOR }}` num `<h3>`, texto, reprova o 4,5:1) e `frontend/src/features/catalog/components/Course/CoursesTable.tsx:43` (mesmo `style` num ícone, reprova o 3:1). O `#1b7fb8` do login era a terceira grafia da mesma família e morreu no próprio bloco. **Ficaram de fora por decisão do João (D10 da spec), não por esquecimento:** `FormSection` tem **11 consumidores**, quatro deles os diálogos que o BD-5 reescrevia em paralelo naquele dia, então consertá-lo mudaria cor de título de seção na aplicação inteira dentro de um bloco de login. Guarda com `ignores` foi recusada no mesmo passo: criaria catraca nova logo depois de o projeto ter zerado duas, e nasceria verde com a exceção embutida | Fecha quando um bloco tocar `FormSection` ou `CoursesTable` por outro motivo e puder absorver os dois sítios junto com a guarda — ou quando a família reincidir uma terceira vez em código vivo, que é o dado que falta para desenhar o seletor sem falso-positivo (cor por `style` também é a grafia CERTA quando o valor é `var(--…)`). Revisar em **2026-10-31** se nada acontecer antes |
```

- [ ] **Step 3: provar que os dois paths citados existem**

A guarda da lição 13 confere path citado em doc normativo. Rodar o teste que a implementa:

```bash
cd frontend && pnpm test repo-docs-refs 2>&1 | tail -4
```

Esperado: passa. Se reprovar, um dos paths da linha nova está errado — corrija o path, não o teste.

- [ ] **Step 4: commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/pendencias.md
git commit -m "docs(pendencias): P-36, a catraca de cor nao enxerga style nem template string

O bloco do login matou o #1b7fb8 no sitio dele, mas a guarda que
deveria impedir o proximo so casa Literal em className. Dois sitios
vivos medidos com a forma exata, ambos a 2,77:1: FormSection.tsx:19 e
CoursesTable.tsx:43.

Ficam fora por decisao registrada (D10), nao por esquecimento:
FormSection tem 11 consumidores, 4 deles os dialogos que o BD-5
reescreve em paralelo."
```

---

### Task 10: gate — a prova, não o relatório

Sem commit de código. Aplica a D12: a checagem visual é **bloqueante**.

**Files:** nenhum.

- [ ] **Step 1: ferramentas, reproduzidas e não herdadas das tasks**

```bash
cd frontend
pnpm lint; echo "LINT_EXIT=$?"
pnpm build 2>&1 | tail -3
pnpm test 2>&1 | tail -4
```

Esperado: `LINT_EXIT=0`, build verde, **29 arquivos / 143 testes** — igual ao baseline, porque nenhuma task escreveu teste.

- [ ] **Step 2: escopo medido, para declarar o que é N/A por medição**

```bash
cd /home/jvbat/projetos/lotus
git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts; echo "DIFF_EXIT=$?"
git diff main...HEAD --stat | tail -1
```

Esperado: **zero arquivo** na primeira saída. Só com ela vazia é que backend, Pint e `typescript:transform` são N/A por escopo medido, e não por suposição.

- [ ] **Step 3: a catraca, provada de novo no gate**

Repetir a sonda da Task 8 (reintroduzir `text-slate-800` no `LoginForm`, ver o lint reprovar nomeando o arquivo, restaurar com `git checkout --` e conferir `git status --short` vazio). O gate não herda a prova da execução.

- [ ] **Step 4: órfãos e higiene**

```bash
cd frontend
grep -rn "1b7fb8" src/; echo "HEX_EXIT=$?"
grep -rn "w-96" src/shared/ui/AppPassword/; echo "W96_EXIT=$?"
grep -rn "BRAND_COLOR" src/features/identity/components/Login/; echo "BRAND_EXIT=$?"
grep -rnE "console\.log|SONDA|debugger" src/features/identity/components/Login/ src/shared/ui/AppPassword/; echo "SONDA_EXIT=$?"
```

Esperado: os quatro `_EXIT=1` (nada encontrado).

- [ ] **Step 5: checagem visual — `/lotus-ui-review` sobre `/login`, BLOQUEANTE**

Com a stack de pé (`docker compose up -d` na raiz e `pnpm dev` em `frontend/`), rodar a skill `lotus-ui-review` sobre `http://localhost:5173/login`, cobrindo **1440x900, 1024x768 e 390x844** nos **dois temas**, e afirmando por medição:

1. `document.documentElement.scrollWidth === innerWidth` nas três viewports;
2. os contrastes de tagline, setor, versão, subtítulo e texto de ajuda **lidos no navegador** contra o degradê renderizado — não copiados da tabela da spec;
3. o wordmark legível no claro **e** no escuro (asset `LogoDark` nos dois);
4. `borderLeftWidth` de `1px` no escuro e `0px` no claro a 1440, e `borderTopWidth` equivalente a 390;
5. a 390, `AppearanceControls.bottom <= h1.top`;
6. com `lang=es-CL`, o `aria-label` do olho em `Mostrar contraseña` / `Ocultar contraseña`;
7. os dois `autocomplete` (`username`, `current-password`) presentes no DOM;
8. as seis paradas do Tab com anel de foco visível — o review de 2026-08-12 registrou isso funcionando e o bloco **não pode regredir**.

**Se a stack não subir, o gate não fecha por leitura de código.** Escale ao João em vez de declarar o passo cumprido — foi essa a dívida do BD-4.

- [ ] **Step 6: o que o bloco NÃO provou, escrito sem maquiagem**

Registrar no relatório de gate: nenhum teste automatizado cobre a aparência do login (PrimeReact no jsdom está fora do corte do runner), então a única guarda permanente é a catraca da Task 8; a não-regressão do `AppPassword` no `StaffUserDialog` foi vista, não mecanizada; e o fluxo de recuperação de senha segue inexistente por escopo declarado.

- [ ] **Step 7: sem commit**

O gate é verificação. Se algum passo reprovar, a correção vira commit próprio antes de o bloco ir a review.

---

## Handoff de execução

**`executor: claude`**, sem `paths_autorizados`.

Critério: o bloco decide apresentação em vários sítios com julgamento de contraste, atravessa a lei §5.6 (feature × `shared/ui` × PrimeReact), mexe em `eslint.config.js` — onde bloco no lugar errado apaga seletor existente em silêncio (Q-2 de 2026-08-04, reincidente no BD-3) — e a Task 8 remove uma exceção de lint de forma permanente. As Tasks 1 a 7 fecham por medição no navegador, que é julgamento sobre o que se vê, não transformação mecânica de arquivo.
