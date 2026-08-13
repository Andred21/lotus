# Spec — Login: a tela que ficou fora do ADR-16

- **Work item:** `login-fora-do-adr16` (item 4 de "Próximos blocos", `backlog.md:33`)
- **Data:** 2026-08-13
- **Branch:** `feat/login-fora-do-adr16`, main tree, criada de `d0cc270`
- **Context Packet:** `null` — ausência de fonte externa medida (§1.1)
- **Escopo:** frontend puro; a P-03 não dispara
- **Executor previsto:** `claude`

---

## 1. O terreno, medido antes de desenhar

### 1.1 A ausência de fonte externa é medida, não presumida

Grep por `drive.google`, `notion.so`, `figma.com` e `docs.google` no `backlog.md` devolve **zero
ocorrência**. A única referência externa do item é o artifact `claude.ai` da análise "Placa de
acesso" rev. 2 — saída de agente, não fonte de regra de negócio — e o que ela decidiu está
transcrito em `backlog.md:62-189`: as oito decisões, a tabela de escala, a tabela de copy, o
degradê sem hex novo e o destino um a um dos 2 C + 8 B.

A evidência do `/lotus-ui-review` de 2026-08-12 **existe no disco**:
`.artifacts/ui-review/2026-08-12T14-38-43-loginpage-wrappers/` com `report.txt` (154 linhas),
6 PNGs e 4 snapshots YAML. O diretório é gitignored, portanto volátil — o registro durável é o
texto do backlog e esta spec.

### 1.2 Uma causa só, doze defeitos

O bloco `estilizacao-adr16-shell-tipografia` tocou `LoginPage.tsx` em **2 linhas** e o resto da tela
ficou onde estava. O resultado é a única superfície do produto que não lê **nenhum** token do tema:
`--surface-ground`, `--surface-card`, `--text-color` e `--text-color-secondary` estão carregados
nela e nenhum é consumido (UI-03 do relatório, medido por `getComputedStyle`).

O relatório classificou **2 C + 8 B**; somam-se a eles um defeito não numerado (o glifo celeste
sobre campo celeste, visível na captura) e o `w-96` do `AppPassword`, que é defeito de wrapper e
alcança toda tela com senha. **Três caem por construção** quando o painel de marca vira navy fixa —
C-1, o gradiente cravado e o par de contrastes sobre ele —, mais o glifo. O resto é trabalho
explícito.

### 1.3 Três medições desta sessão que o backlog não tinha

**(a) O login é 2 das 7 entradas da catraca de cor, e o comentário dela aponta para este bloco.**
`eslint.config.js:141-151`:

```js
// Catraca da regra de cor: lista que só ENCOLHE. Login e Validação têm fundo
// escuro deliberado — mudá-las é desenho novo, não pagamento de débito (D7).
const CATRACA_COR = [
  'src/features/identity/components/Login/LoginForm.tsx',
  'src/features/identity/components/Login/LoginPage.tsx',
  ...
]
```

Este bloco **é** o desenho novo que aquele comentário previu. Sair da lista é o único mecanismo
disponível numa tela sem teste de componente (§7.3).

**(b) O degradê decidido é fixo nos dois temas, por medição.** A escala `--primary-*` é **idêntica
byte a byte** em `lara-light-lotus.css` e `lara-dark-lotus.css`: `--primary-900:#0c3549`,
`--primary-400:#62beec`, `--primary-300:#96d4f2`, `--primary-200:#c2e6f7`. O gerador não re-ancora a
escala nomeada, só a família da primária — por isso o painel pode ser superfície escura fixa sem
redeclarar nada por tema. Os três contrastes da tabela do backlog foram **recalculados** nesta
sessão; a tagline dá **9,846:1** sobre `#0c3549`, e os outros dois batem.

**(c) A guarda de cor não enxerga o defeito que este bloco mata, e o repositório já escreveu isso.**
`shared/styles/tokens.ts:11-13`: *"a catraca de cor do `eslint.config.js` só enxerga `className`,
então uma cor errada entrando por `style` passava verde. Aqui ela tem um lugar para ser
corrigida."* O `#1b7fb8` do login entra por template string; `style={{ color: BRAND_COLOR }}` entra
pela mesma porta. **Dois sítios vivos com a forma exata**, ambos pintando celeste como primeiro
plano sobre superfície clara a **2,77:1** — o número que o `--brand-ink` existe para consertar:
`shared/ui/FormSection/FormSection.tsx:19` (título de seção, texto, reprova 4,5:1) e
`features/catalog/components/Course/CoursesTable.tsx:43` (ícone, reprova 3:1). Ficam **fora** deste
bloco (§8).

### 1.4 Superfície de escrita

`LoginPage.tsx`, `LoginForm.tsx`, `shared/ui/AppPassword/AppPassword.tsx`,
`shared/styles/brand-theme.css`, os três locales e `eslint.config.js`. `AppLogo` é **consumido**,
não alterado — o `variant="on-dark"` que o C-1 pede já existe. `useLoginForm` fica **intocado**: o
bloco muda apresentação, não autenticação.

---

## 2. Decisões

**D1–D8 vêm fechadas** da direção que o João decidiu em 2026-08-13 sobre a análise rev. 2
(`backlog.md:62-82`) e não foram reabertas. **D9–D12** são desta sessão.

| # | Decisão |
|---|---|
| D1 | Composição centralizada, como hoje — logo em cima, texto embaixo. A placa assimétrica foi recusada. |
| D2 | Sem cartão para o formulário: ele segue flutuando no painel, com `max-w-sm`. |
| D3 | Estética do botão intocada — celeste com texto navy e raio 4px, saindo do tema (D6 do ADR-16). |
| D4 | O campo de marca vira navy com degradê mínimo, não chapado. |
| D5 | Logo e tipografia do painel de marca crescem, conforme a tabela de escala (§3.2). |
| D6 | O `w-96` do `AppPassword` entra neste bloco. |
| D7 | A copy nova entra junto — subtítulo e texto de ajuda mudam de sentido, não só de estilo. |
| D8 | O qualificador de setor vira mono caixa alta e o número de versão fica na tela, em mono com `tabular-nums`. |
| **D9** | **`LoginPage.tsx` e `LoginForm.tsx` saem da `CATRACA_COR`** — a lista vai de 7 para 5, no mesmo commit que troca a última utility de cor por token. |
| **D10** | **A guarda contra cor cravada em JS NÃO entra neste bloco** — vira linha nova em `docs/pendencias.md`, com os dois sítios medidos. |
| **D11** | **Os campos mantêm label própria**, ganhando cor por token; o erro de campo passa a usar `dangerText` de `shared/styles/tokens`. O kit `FormField` **não** é adotado aqui. |
| **D12** | **A checagem visual pelo navegador é passo de gate bloqueante**, com contraste remedido no navegador. |

### 2.1 Alternativas recusadas, com o custo medido

- **D9 — deixar o login na catraca e migrar só por inspeção.** Recusado: a isenção existe porque
  "mudá-las é desenho novo", e o desenho novo é este bloco. Mantê-la deixaria a próxima utility de
  cor entrar verde numa tela recém-migrada, e a lista de 7 não encolheria apesar de o motivo da
  isenção ter deixado de existir.
- **D10 — guarda nova + conserto dos dois sítios.** Recusado por alcance: `FormSection` tem **11
  consumidores**, quatro deles os diálogos que o BD-5 reescreve em paralelo agora (§10). Consertá-lo
  muda cor de título de seção na aplicação inteira dentro de um bloco de login.
- **D10 — guarda nova com os dois sítios em `ignores`.** Recusado: criaria uma catraca **nova** logo
  depois de o projeto ter zerado duas, e ela nasceria com a exceção embutida — ficando verde.
- **D11 — adotar o `FormField` do kit.** Recusado por contradizer a tabela de escala já decidida: o
  `FormField` pinta label em 14px `var(--text-color-secondary)`, e a linha "subtítulo, rótulos,
  botão — inalterados" da D5 mantém os rótulos em 16px `font-medium`. O ganho de dono único fica
  disponível pelo `dangerText`, que é a fórmula de um dono só para a cor de erro.
- **D12 — gate sem navegador.** Recusado: o bloco é 100% aparência. Sem ver renderizado, o wrap a
  390px, os quatro casos de contraste e a divisa do tema escuro ficam sem prova — que é exatamente a
  dívida que o BD-4 declarou e pagou só pela metade.

---

## 3. Painel de marca (`aside`)

### 3.1 O degradê, sem hex novo

Nasce `--brand-gradient` na camada fina `brand-theme.css`, consumida por `var()` no `aside`:

```css
--brand-gradient: linear-gradient(160deg, var(--primary-900), var(--brand-navy));
```

`#0c3549` no alto, `#0f2b3d` embaixo — os dois já existentes no tema. Diferença de luminância entre
as pontas: **1,13:1**, mínimo medido. O `style` inline montado em JS morre, o `#1b7fb8` deixa de
existir e o `BRAND_COLOR` deixa de ser importado pelo `LoginPage`. É a recomendação literal do
achado UI-05.

**Por que a var mora na camada de marca e não no tema gerado:** o tema gerado é saída de script
(`generate-brand-theme.mjs`); regra nova de marca é justamente o que a camada fina existe para
carregar, como já fazem `--brand-navy`, `--focus-stroke` e `--brand-ink`.

### 3.2 Escala e contraste

| Elemento | Hoje | Bloco | Contraste no pior ponto (`#0c3549`) |
|---|---|---|---|
| wordmark | `AppLogo` 160px, `variant="auto"` | `variant="on-dark"`, `w-52` (208px); 150px no telefone | asset claro sobre navy |
| tagline | 16px Inter, branco a 0,9 | 20px Inter, `--primary-200` | **9,84:1** (era 3,10:1) |
| setor | 16px Inter, depois de um `<br/>` | 12px mono, caixa alta, `0.14em`, `--primary-400` | **6,23:1** |
| versão | 12px Inter, opacidade 0,7 | 13px mono, `tabular-nums`, `--primary-300` | **8,02:1** (era 2,79:1) |

Na outra ponta do degradê (`#0f2b3d`) os três sobem para 11,13 / 9,07 / 7,04. O celeste deixa de ser
campo e vira o único acento sobre a navy.

O `<br/>` que hoje quebra a tagline **sai**: o setor vira nó próprio, porque muda de papel
tipográfico e não pode herdar o do parágrafo.

### 3.3 O C-1 e o glifo caem por construção

`AppLogo variant="auto"` escolhe o asset pelo **tema**; o painel de hoje é celeste nos dois, então
no claro entrega `LogoLight.png` — wordmark de tinta escura sobre celeste, 1,45:1 a 2,30:1. Com a
navy fixa, `variant="on-dark"` é a escolha **correta** (superfície escura que não acompanha o tema),
não um remendo de contraste; é a mesma decisão já tomada para a sidebar. O glifo celeste sobre campo
celeste morre junto, pela mesma troca de fundo.

### 3.4 Telefone

A faixa de marca cai de **391px** para **~250px** de altura. Os controles de aparência saem do fluxo
absoluto e ganham faixa própria abaixo dela; `absolute top-4 right-4` passa a valer só a partir de
`md`. Assim o par idioma/tema não divide a faixa vertical do `h1` (UI-10) e não precisa de variante
nova para viver sobre navy.

---

## 4. Painel do formulário (`main`)

### 4.1 Superfície

O painel do formulário fica em **`--surface-card`**, não em `--surface-ground`. A razão é AA, não
gosto: `--text-color-secondary` (`#64748b`) mede **4,34:1** sobre o humo `#f1f5f9` — reprova o 4,5:1
de texto normal — e **4,76:1** sobre o branco. Subtítulo e texto de ajuda vivem nesse token, então
pôr o formulário no humo sem cartão criaria um achado B novo em duas linhas de texto. Os dois
números foram recalculados nesta sessão.

A raiz da página passa a `--surface-ground`; morrem o `dark:bg-slate-900` do wrapper e o do `main`.

### 4.2 A divisa entre os painéis, só no escuro

No tema escuro a navy `#0f2b3d` e o `--surface-card` escuro `#1e293b` medem **1,0016:1** de
luminância — recalculado. Sem cartão e sem borda, a divisa entre os dois painéis **desaparece**; só
a diferença de matiz sobra. Saída: traço de 1px em `--surface-border` **só no tema escuro**. No claro
a divisa branco/navy já mede 14,65:1 e um traço claro ali pareceria artefato.

### 4.3 Tipografia e cor

- `h1` → `font-display text-2xl font-semibold tracking-tight`, cor `var(--text-color)`. **Não cresce
  de propósito:** já está no tamanho do `h1` do `PageHeader` e é o mesmo papel semântico; o que muda
  é a família. Hoje o login é o único `h1` do produto sem `font-display` — um grep pela classe em
  `src/` devolve duas linhas, a definição do token e o `PageHeader`.
- **Sem converter para `PageHeader`:** o molde carrega layout de página interna que não cabe aqui.
- subtítulo e texto de ajuda → `var(--text-color-secondary)`.
- rótulos de campo → `var(--text-color)`. Hoje são **preto puro** `rgb(0,0,0)`, sem classe de cor
  nenhuma, e mantêm tamanho e peso (16px, `font-medium`) por decisão da D5.
- erro de campo → `dangerText` de `shared/styles/tokens` no lugar de `text-red-600
  dark:text-red-400`. É a fórmula de um dono só que já serve os 13 sítios do kit.

### 4.4 Formulário

Sem cartão, `max-w-sm`, composição centralizada — como hoje (D1, D2). O botão de submit não muda
(D3): celeste com texto navy e raio 4px, saindo do tema, exatamente o que o relatório confirmou
funcionando.

---

## 5. Wrappers: o alcance fora do login

### 5.1 `AppPassword` — largura (C-2)

O `w-96` do `inputClassName` (ramo com `leftIcon`) vira `w-full`, alinhando ao irmão `AppInputText`,
que já resolve o mesmo problema com `w-full`. São 384px absolutos que não encolhem; com o `p-8` do painel não
cabem em 390px, e o resultado medido é `scrollWidth` 416 contra `innerWidth` 390, com o olho da
senha fora da tela.

**Alcance: 2 call sites** — `LoginForm` e `StaffIdentifyFields` (consumido só por
`StaffUserDialog`). Nenhum diálogo com senha pode regredir de largura, e conferir isso é passo de
gate (§7.2).

### 5.2 `AppPassword` — nome acessível (UI-08)

Com a interface em `es-CL`, o `aria-label` do alternador de visibilidade continua `"Show Password"`,
default interno do PrimeReact. O nome acessível passa a sair dos locales, **no wrapper** — não no
call site, porque o wrapper é a única porta para o componente e o defeito chega a toda tela com
senha.

**São duas chaves, e isso foi medido na API instalada, não estimado.** `password.cjs.js:605,614`
escreve `'aria-label': PrimeReact.ariaLabel('passwordHide') || 'Hide Password'` e o par
`passwordShow` — dois estados, dois rótulos. As duas chaves ficam `common.showPassword` e
`common.hidePassword`, nos três locales.

**A via é o `pt` do wrapper, não a locale global do Prime**, e a razão também é medida: a locale
global nunca é ativada — `shared/config/primeLocale.ts` chama `addLocale('es', …)` e ninguém chama
`locale('es')`; o `AppDatePicker` resolve o caso dele passando `locale="es"` por componente. Um
rótulo pendurado na locale global ficaria congelado e não acompanharia a troca de idioma. Já
`ptm('showIcon')`/`ptm('hideIcon')` são mesclados **depois** dos defaults (`password.cjs.js:607,616`),
então `pt={{ showIcon: …, hideIcon: … }}` vence, e o `useTranslation` do wrapper re-renderiza na
troca de idioma.

**O `pt` do wrapper tem de sobreviver ao `pt` de um chamador.** Hoje o `{...props}` vem por último e
apagaria o nome acessível em silêncio; nome acessível não é opcional, então ele é pinado depois do
spread ou mesclado — mesma disciplina do `customUpload` do `AppPhotoField` e do `mergePt` do
`AppDataTable`. A forma exata é escolha do plano.

### 5.3 Call site do login (UI-09)

`autocomplete="username"` no campo de e-mail e `autocomplete="current-password"` no de senha. Os dois
wrappers repassam props ao componente Prime, então é mudança no call site, não no wrapper. O próprio
Chrome registra o aviso no console hoje.

---

## 6. Copy

| Chave | Hoje | Bloco |
|---|---|---|
| `login.title` | Iniciar sesión | igual — é a ação, e o botão repete o mesmo verbo |
| `login.subtitle` | Ingresa con tus credenciales | **Acceso para administradores y redactores** — a RN-01 na tela, para cliente e aluno pararem de tentar |
| `login.forgot` | ¿Olvidaste tu contraseña? | **¿Perdiste el acceso? Pídelo al administrador de la plataforma.** |
| `brand.sector` | Sector eléctrico de alta tensión | mesmo texto, papel mono; o `<br/>` que hoje o cola na tagline sai |

O `login.forgot` deixa de ser `<a>` sem `href` e vira `<p>`: hoje ele mede 2,60:1, promete um fluxo
que não tem endpoint e **não entra na ordem de tabulação** — as seis paradas do Tab medidas no
relatório não o incluem. Como `<p>` a 4,76:1 sobre o branco, ele diz a verdade sem fingir link.

Três locales com chaves idênticas, `es-CL` como referência de rótulo.

---

## 7. Mecanismo, prova e DoD

### 7.1 A catraca de cor encolhe (D9)

`LoginPage.tsx` e `LoginForm.tsx` saem de `CATRACA_COR`: **7 → 5**. A regra `COR_HARDCODED` passa a
valer sem exceção nos dois arquivos.

**Provado nos dois sentidos (lição 10), não por lint verde:** com as duas linhas fora do array,
`pnpm lint` sai em exit 0; reintroduzindo um `text-slate-800` no `LoginForm`, o lint **reprova
nomeando o arquivo**, e a árvore volta limpa em seguida. Verde sozinho não distinguiria "a régua
vale" de "a regra parou de casar o glob".

### 7.2 Não-regressão do `AppPassword`

O campo de senha do `StaffUserDialog` (via `StaffIdentifyFields`) continua ocupando a linha inteira
depois da troca de `w-96` por `w-full` — conferido visualmente, porque é o único call site fora do
login e a largura é a única coisa que muda nele.

### 7.3 Checagem visual bloqueante (D12)

`/lotus-ui-review` sobre `/login` em **1440x900, 1024x768 e 390x844**, nos **dois temas**, com:

1. `scrollWidth == innerWidth` nas três viewports — o C-2 fechado onde ele foi medido;
2. os contrastes de tagline, setor, versão, subtítulo e texto de ajuda **lidos no navegador** contra
   o degradê renderizado, não herdados da tabela desta spec;
3. o wordmark legível no claro **e** no escuro (o C-1);
4. a divisa visível no escuro e ausente no claro (§4.2);
5. o par idioma/tema fora da faixa do `h1` a 390px (UI-10);
6. o `aria-label` do alternador de senha em espanhol com `lang=es-CL` (UI-08).

**Isto é gate, não cortesia.** O bloco é 100% aparência: sem ver renderizado, o DoD é prosa.

### 7.4 Ferramentas

**Baseline medido nesta branch, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test`
**29 arquivos / 143 testes** — bate com o placar do merge pós-BD-4 registrado no `state.md`, o que
confirma que a branch nasce da `main` sem deriva.

O gate repete os três sem regressão de contagem. Backend, Pint e
`typescript:transform` são **N/A por escopo medido**: `git diff main...HEAD -- backend/` e
`-- frontend/src/shared/types/generated.ts` devem devolver zero arquivo.

### 7.5 O que o bloco NÃO vai provar, dito antes

**Nenhum teste de componente.** PrimeReact no jsdom está fora do corte do runner
(`frontend-fsliced.md`, §Comandos), e o login é componente, não hook. A prova da aparência é a §7.3;
a prova da regra é a §7.1. Afirmar cobertura de teste aqui seria cobertura fantasma (lição 10).

---

## 8. Fora de escopo, com razão escrita

- **Fluxo de recuperação de senha** — não tem endpoint. A decisão deste bloco é só o que a tela
  mostra enquanto ele não existe.
- **A guarda contra cor cravada em JS e os dois sítios que ela pegaria** (D10) — `FormSection.tsx:19`
  e `CoursesTable.tsx:43`, ambos a 2,77:1. Vira **linha nova em `docs/pendencias.md`**, com os dois
  paths, o número medido e o motivo do adiamento.
- **`ValidationPage`** — a outra entrada de "fundo escuro deliberado" da `CATRACA_COR` fica onde
  está; o desenho novo deste bloco é o do login.
- **Refatorar `AppLogo`** — o `variant="on-dark"` já existe e é consumido, não alterado.

---

## 9. Risco de review

**BAIXO pelo gate binário da `revisar-sprint`:** zero schema, zero `generated.ts`, zero Sanctum,
auditoria, RBAC, dinheiro escrito ou documento legal gerado; `executor: claude`. A tela é a porta do
Sanctum, mas o bloco **não toca autenticação** — `useLoginForm` fica intocado e nenhuma requisição
muda.

**Risco próprio, declarado sem conflito com o gate:** (a) `AppPassword` alcança um call site fora do
login, e regressão de largura ali seria invisível para quem só olha o login; (b) a saída da catraca é
irreversível por lint — depois dela, qualquer cor por utility no login reprova o build de quem vier
depois, que é o efeito desejado, mas é efeito de alcance permanente; (c) `brand-theme.css` é camada
compartilhada, e a var nova nasce para um consumidor só.

---

## 10. Paralelismo com o BD-5

Os dois blocos correm em paralelo por decisão do João (exceção declarada em `state.md`). A
sobreposição **não é zero**, ao contrário do precedente BD-4 × BD-9, e está medida:

1. `FormErrorBanner` — o BD-5 o reescreve em `shared/ui/FormField/FormField.tsx:119`, e
   `LoginForm.tsx:32` é call site (`variant="inline"`), num arquivo que este bloco reescreve.
2. A largura do `AppPassword` dentro do `StaffUserDialog`, que é um dos quatro diálogos do trio da
   foto do BD-5.
3. `shared/config/locales/{es-CL,pt-BR,en}.json` — os dois blocos escrevem nos três.

`FormSection` ficou fora deste bloco **de propósito** (D10), para não virar a quarta.
