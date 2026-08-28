# Audit — Padronização de estilização dos componentes

**Data:** 2026-08-26 · **Árvore:** `../fix-frontend` (`refactor/frontend-hardening-final`) ·
**Método:** leitura estática de `shared/ui/**`, `app/layouts/**`, `app/pages/Dashboard/**` e
varredura por padrão (`grep`) nas features. **Sem execução no navegador** — onde a recomendação
depender de pixel, o bloco de execução valida com `/lotus-ui-review`.

**Escopo:** só estilização e consistência visual. Nada aqui é bug funcional; nada aqui foi
corrigido. Este audit é insumo para um item de backlog futuro ("estilização — padronização de
componentes"), a promover pelo João via `backlog.md`, **depois** do `frontend-hardening-final`
— o bloco ativo toca `SidebarItem`, `index.css` (mini-reset P-46) e `AppPassword`, e vários
achados abaixo interagem com o reset (ver §7).

---

## 1. O que já está forte (não mexer)

O sistema de tokens é maduro e medido — este audit **não** propõe redesenho dele:

- `brand-theme.css` + `tokens.ts`: tinta por papel (`--tone-*-ink`, `--brand-ink`,
  `--chart-*`), degrau por tema, contraste medido e travado por teste
  (`tone-ink.test.ts`, `chart-tokens.test.ts`). Qualquer padronização nova **consome** esses
  tokens, nunca cria hex paralelo.
- Direção estética fechada (ADR-16 + consolidação de 2026-08-11): precisão instrumental
  técnico-regulatória; paleta nomeada (celeste-lotus, azul-poste, humo, grafite, noche);
  3 papéis tipográficos (Archivo display · Inter corpo · IBM Plex Mono dado técnico);
  assinatura = o folio tratado como artefato. O audit mede o código **contra essa direção**.
- Shell navy fixa, `--shell-ink*`, `--focus-stroke` redeclarado por superfície: consistente.
- `AppCard` (tone × variant), `AppTag` (AA por wrapper), `AppDataTable` (sombra de rolagem,
  coluna presa): decisões medidas em review — ficam.

O problema não é o alicerce; é que **a última milha diverge**: o mesmo papel visual tem 3–5
grafias diferentes espalhadas por features, e a assinatura da direção ainda não foi executada.

---

## 2. Tipografia e hierarquia

### A1 — Os dois `h1` do produto não são o mesmo título
- `PageHeader.tsx:30` → `font-display text-2xl font-semibold tracking-tight`
- `DetailHeader.tsx:96` → `text-2xl font-bold` (sem display, sem tracking, peso diferente)

Módulo e detalhe abrem com vozes tipográficas distintas. **Recomendação:** um único
tratamento de `h1` (o do `PageHeader`, que já paga a direção "display para títulos"),
extraído para classe/constante compartilhada consumida pelos dois.

### A2 — O rótulo de seção ("eyebrow") existe em cinco grafias
| Onde | Grafia |
|---|---|
| `FormSection.tsx:299` | `text-sm font-bold tracking-wide uppercase` · tinta corpo |
| `SectionLabel.tsx` (Dashboard) | `text-xs font-semibold tracking-wider uppercase` + hairline |
| `RedatorDesignation.tsx:74` | `text-sm font-medium uppercase tracking-wide` · secundária |
| `TurmaConfigCard.tsx:55` / `TurmaDocuments.tsx:31` / `ConcludePanel.tsx:17` | `h3 font-medium` — sem caixa, sem escala |
| `ValidationPage.tsx` (`<dt>`) e `IssuedDialog.tsx` | `text-xs uppercase tracking-wide`, peso variando |

O mesmo papel (encabeçar um grupo dentro de card/diálogo) sai com 4 tamanhos×pesos.
**Recomendação:** um componente/token único de rótulo de seção — sugestão: a grafia do
`SectionLabel` (`text-xs font-semibold tracking-wider uppercase`), com a hairline opcional —
e `FormSection` passa a consumi-lo. Os três `h3 font-medium` de operation são os mais
distantes do padrão e mudam primeiro.

### A3 — Número de estatística: três tratamentos
- `KpiRow.tsx:93` → `font-display text-3xl font-semibold tabular-nums` ✓ (o alvo)
- `BudgetStatCard.tsx:10` → `text-2xl font-semibold`, **sem** display e **sem** `tabular-nums`
  num valor monetário (UF)
- `ProfileSummaryCard.tsx:35` → `text-2xl font-semibold`, idem

A direção diz "display próprio para títulos/números". **Recomendação:** um `StatValue`
compartilhado (ou classes padrão documentadas): `font-display` + `tabular-nums` sempre;
escala em dois degraus (`text-3xl` KPI de página, `text-2xl` stat de card).

### A4 — Dado técnico sem mono onde ele mais importa
Mono já cobre: `StudentsTable.tsx:50` (RUT), `HistorialTable.tsx:70` e
`StudentCertificateCell.tsx:51` (folio), `IssuedDialog` (folio), meta do `AppFileRow`. Fora:
- **`ValidationPage.tsx` — o folio na página pública do QR sai `text-sm font-medium`**, a
  mesma grafia dos campos vizinhos. É exatamente a tela onde a assinatura ("folio como
  artefato") deveria existir — ver D4.
- `HistorialTable.tsx:90` — RUT do aluno via `description` do `IdentityCell`, tinta
  secundária sem mono, enquanto a tabela de alunos o mostra mono.

**Recomendação:** regra explícita "folio/RUT/data técnica = `font-mono tabular-nums`" na rule
de frontend, e os dois sítios acima corrigidos (no Historial, passar
`<span className="font-mono">` como description — o `IdentityCell` já aceita nó).

### A5 — Título de auth copiado 5×
`font-display text-2xl font-semibold tracking-tight` literal em `LoginForm.tsx:45`,
`ForgotForm.tsx:38` e `SetPasswordPage.tsx:25,36,51`. **Recomendação:** vira o mesmo
tratamento de `h1` da A1 (constante única).

---

## 3. Botões — a hierarquia de ação drifted

### B1 — `brandIcon` virou a CTA primária do produto inteiro, contra o próprio contrato
`AppButton/style.ts` documenta `brandIcon` como "marca, **só-ícone**" (sem padding próprio) e
`brandLabel` como "marca com rótulo" (`px-3 py-2.5 text-sm`). Medido no código:
- `brandIcon` **com `label`** em ~14 call sites: `CommercialPage.tsx:50,67`,
  `BudgetDetailPage.tsx:86`, `EmissionPanel.tsx:83`, `TurmaConfigCard.tsx:134`,
  `CatalogPage.tsx:39`, `AdministracionPage.tsx:45,58`, `StudentsTab.tsx:28`,
  `RedatorDesignation.tsx:42`, `PendingQuotesPanel.tsx:55`, `EnrollmentSection.tsx:36`,
  `QuoteWizard.tsx:26,33`, `CrudDialog.tsx` (Salvar/Editar).
- `brandLabel` sobrou em 2 sítios (`LanguageMenu`, `QuoteRow`).

Consequência: a geometria da CTA depende do padding default do Lara, não do variant; e o
vocabulário do `style.ts` mente sobre o uso real. **Recomendação:** renomear por **papel**,
não por forma — `primary` (CTA de marca, com a geometria hoje em `brandLabel`),
`iconToggle` (os toggles do shell), `noSurface` fica. Sweep mecânico nos call sites; o visual
resultante deve ser byte-idêntico onde já está certo (o gate mede com screenshot).

### B2 — "Voltar" com força de CTA primária
`DetailHeader.tsx:337-345`: o link de volta usa `variant="brandIcon"` — borda 2px de marca,
mesmo peso visual da ação primária da página que ele antecede. Navegação de retorno é ação
terciária. Também há sujeira de formatação (`className="flex w-fit "`, indentação torta).
**Recomendação:** `text` + ícone (`pi-arrow-left`) em tinta secundária→corpo no hover; um
degrau visual abaixo de qualquer CTA.

### B3 — Duas grafias de "confirmar" em diálogo
`CrudDialog` confirma com `variant="brandIcon"` (marca); `ConfirmDialog` confirma com
`severity` cru do Lara — e quando `severity` está ausente e `confirmLabel` defaulta para
"Salvar", sai um botão preenchido Lara sem marca, visualmente diferente do Salvar do
`CrudDialog`. **Recomendação:** `ConfirmDialog` sem `severity="danger"` usa o mesmo variant
primário do `CrudDialog`; `danger` continua o preenchido de severidade (correto — ação
destrutiva não veste marca).

---

## 4. Superfície e forma

### C1 — Escala de raio implícita e furada
Hoje: `rounded-lg` (AppCard, AppFileRow ícone, AppSelectableCard, IssuedDialog),
`rounded-md` (SidebarItem, skip-link), `rounded` (banners do FormField, badge), `rounded-full`
(count badge), e o raio do Lara nos controles. Não há regra escrita.
**Recomendação:** documentar a escala na rule de frontend — superfície/card = `lg`,
controle/item de nav = `md`, pill = `full` — e alinhar os `rounded` soltos dos banners
(`FormField.tsx:138,175`) para `rounded-md`.

### C2 — `ValidationPage` fora do sistema de tokens
`ValidationPage.tsx` pinta o fundo com `bg-slate-50 dark:bg-slate-950` — única página do
produto em paleta Tailwind crua em vez de `--surface-ground`. Slate-50 ≠ humo (`#f1f5f9` =
slate-100): a página pública tem um fundo que nenhuma outra tela tem, por acidente.
**Recomendação:** `var(--surface-ground)` como todo o resto.

### C3 — Merge de `pt` do `AppTabView` descarta o default
`AppTabView.tsx`: `...(pt ?? appTabViewPt)` — caller que passa qualquer `pt` apaga o
`panelContainer: p-0` default, e o espaçamento das abas passa a variar por tela. O projeto já
tem `mergePt` para exatamente isso (AppDialog, AppDatePicker). **Recomendação:** `mergePt`.

### C4 — Card ad hoc no `IssuedDialog`
`IssuedDialog.tsx:72`: `rounded-lg border p-6 text-center` montado à mão. Funciona, mas é um
`AppCard` sem ser — se a A2/A3 virarem componentes, este painel os consome. Menor.

---

## 5. Shell e a assinatura que falta

### D1 — Logo com números mágicos
`Sidebar.tsx:47`: `<AppLogo variant="on-dark" className="ml-15 h-30 w-auto" />` — 120px de
altura compensada por margem manual de 60px. Já apontado na análise de 2026-08-11 e ainda
presente. **Recomendação:** asset com bounding box correta (ou `viewBox` ajustado no SVG);
alinhamento pelo flex do contêiner, zero margem de compensação.

### D2 — Rail colapsado sem rótulo
Coberto pelo bloco ativo (`frontend-hardening-final`, D-03/D1): ícone + rótulo empilhados.
Este audit **não** duplica — apenas registra que a padronização de tipografia do rótulo do
rail (tipo pequeno truncado) deve consumir o token de rótulo da A2 quando os dois existirem.

### D3 — Login: tinta fora de papel
`LoginPage.tsx`: tagline em `--primary-200` e setor em `--primary-400` sobre o degradê navy —
tinta de marca usada como texto de apoio, enquanto o shell inteiro usa `--shell-ink*` para
esse papel. Contraste provavelmente passa (não medido aqui), mas o papel está trocado.
**Recomendação:** `--shell-ink` / `--shell-ink-muted` no par tagline/setor; `--primary-*`
fica para o que é marca de fato (wordmark, versão em mono pode ficar).

### D4 — A assinatura (folio como artefato) ainda não existe — e a tela dela é a pública
A direção fechada elege **uma** assinatura: o folio `LOT-2026-XXXX` tratado como artefato do
domínio (mono/tabular, QR e sello como motivo). Hoje o folio é só `font-mono text-sm` em
células de tabela — e na `ValidationPage`, a única tela que um terceiro (fiscalizador,
empregador) vê, ele é texto comum (A4). **Recomendação (o único investimento "estético" novo
deste audit):** na `ValidationPage` e no `IssuedDialog`, o folio vira o elemento dominante —
`font-display`/mono grande, `tracking` largo, tabular — com o bloco de dados mínimos abaixo;
um componente `CertificateFolio` compartilhado entre os dois. Nada de decoração além disso:
a contenção é a estética da direção.

---

## 6. Espaçamento

### E1 — Padding interno com três dialetos
Dominante: `px-4 py-3` (faixas de card) e `p-4` (55 usos). Desviantes: `p-5`
(`ValidationPage`), `p-6` (`IssuedDialog`, login). Não é defeito por si — mas sem regra
escrita cada tela nova escolhe de novo. **Recomendação:** documentar na rule: faixa de card
`px-4 py-3`; corpo de card `p-4`; página `p-4 sm:p-6`; hero/painel público pode `p-6`.
Alinhar `ValidationPage` (`p-5` → `p-4` ou `p-6`, um dos dois).

### E2 — `my-[0.83em]` dos títulos (interação com o bloco ativo)
`PageHeader.tsx:30` e `DetailHeader.tsx:96` cravam a margem do UA. A spec do
`frontend-hardening-final` (D6) decide que **ficam** — declaram intenção e sobrevivem ao
mini-reset por ordem de camada. Este audit respeita a D6 e apenas registra: quando o bloco de
estilização unificar o `h1` (A1), é o momento de trocar a grafia herdada por margem de escala
(`mb-*` explícito), numa decisão só, com screenshot antes/depois.

---

## 7. Ordem, dependências e o que NÃO entra

**Depois do `frontend-hardening-final`, nunca junto:** o bloco ativo toca `SidebarItem`
(D-03), `index.css` (P-46) e `eslint.config.js` — os achados A2/D2/E2 dependem do estado
pós-reset para não medir duas vezes.

Prioridade sugerida para o bloco de execução:

| Fase | Achados | Natureza |
|---|---|---|
| 1. Vocabulário | B1, B2, B3 | rename de variant + sweep de call sites; alto raio, baixo risco visual |
| 2. Tipografia | A1, A2, A3, A5 | extrair 3 tratamentos compartilhados (h1, rótulo de seção, stat) |
| 3. Dado técnico | A4, D4 | regra mono + `CertificateFolio` (a assinatura) |
| 4. Higiene | C1, C2, C3, C4, D1, D3, E1 | correções pontuais + escrever a escala na rule |

**Fora, por escrito:**
- Redesenho de paleta, tema ou contraste — medido e travado por teste; não há achado ali.
- Dashboard (placeholder declarado), telas do item 16 ainda sem run de UI-review.
- Qualquer mudança de layout de navegação (drawer, etc.) — a spec do bloco ativo já recusou.
- Animação/motion novo: a direção é instrumental; transições existentes (`transition-colors`)
  bastam. Acrescentar motion seria decoração sem tese.

**DoD sugerido para o bloco futuro:** screenshot antes/depois por fase via `/lotus-ui-review`
nos dois temas; grep de guarda (zero `variant="brandIcon"` com `label`, zero `text-2xl` de
stat sem `tabular-nums`, zero folio/RUT sem mono nas telas tocadas); lint + build + suíte
verdes; regras novas escritas em `.claude/rules/frontend-fsliced.md` (ou rule própria de
estilização) no mesmo PR.
