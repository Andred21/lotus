# Desenho — `frontend-decisoes-de-ui-pendentes` (item 21)

> Bloco da `lane-a`, main tree, branch `refactor/frontend-decisoes-de-ui-pendentes`,
> aberta de `main@a73e83e6`. `Contexto: não` — as fontes são as próprias fichas e os audits
> locais que as originaram, todos no repositório.
>
> Aprovada por seções no brainstorming de 2026-08-31, com o João.

## §1 · Por que este bloco existe

Onze fichas estavam travadas em decisão do João sem bloco que as hospedasse. O João recortou por
frente em 2026-08-31: as sete de desenho vieram para cá (item 21), as quatro de domínio e RBAC
foram para o item 22.

**O bloco decide E aplica.** Foi decisão explícita do João contra a alternativa de só decidir:
decisão registrada sem código continua sendo trava, e a fatia 3 do item 16 (Cursos, Pessoas,
Administração) mede tela contra régua. Sem estas fichas fechadas, aquelas runs abrem ficha nova
sobre a mesma dúvida — que foi exatamente o que a `D-61` fez com a `D-67` e o que o saneamento de
2026-08-31 teve de desfazer.

## §2 · Escopo

Seis fichas: **`D-63`, `D-64`, `D-66`, `D-67`, `D-68`** e **`D-32`**. A `D-66` hospeda a **P-67**.

**A `D-65` saiu do bloco** — ver §3.1 e §8.

**Fora:** backend e `generated.ts` (o diff sai vazio); RBAC e semântica de domínio (item 22);
redesenho de tela (item 9); runs de `/lotus-ui-review` por superfície (item 16, fatia 3), que este
bloco **precede** de propósito; a reserva das colunas presas (item 23, criado por este brainstorming).

## §3 · Medições desta sessão — três fichas tinham premissa que o código não confirma

As fichas nasceram de audits de 2026-08-25 a 2026-08-30 e não foram remedidas desde então. Medidas
agora contra `a73e83e6`:

### §3.1 · A `D-65` descreve uma reserva fixa que não existe

A ficha diz `stickyActionsColumn('8rem')` **fixo** nas 12 tabelas. São **sete valores**, vários
condicionais ao ramo `archived`:

| Reserva | Sítios |
|---|---|
| `6rem` | `RolesTable`, `StudentsTable`, `BudgetsTable` (ativo) |
| `8rem` | `EmissionStudentsTable` — **o único** |
| `9rem` | `EnrollmentTable`, e os ramos ativos de `TurmasTable`, `CoursesTable`, `UsersTable`, `ClientsTable` |
| `10rem` | `ArchivedEnrollmentsList`, e os ramos `archived` de seis tabelas |
| `12rem` | `RedatoresTable` (ativo) |
| `16rem` | `HistorialTable` |

O defeito que a ficha aponta continua real — reserva em `rem` contra `tableWidths` em % sobre
`min-w-[48rem]` —, mas não se corrige numa constante: são 12 decisões, e a direção que a própria
ficha recomenda ("sinal de rolagem no wrapper + `min-width` menor onde a reserva não cabe") reabre
as 12 medições em navegador. **Decisão do João: sai deste bloco, reescrita com a medição correta e
com hospedeiro nomeado** (§8).

### §3.2 · A `D-68` é mais larga que "o input", e mais limpa que se temia

O gerador mapeia por hex (`generate-brand-theme.mjs:145`), então `'#d1d5db': '#cbd5e1'` alcança
**27 ocorrências** no tema claro. Elas se separam sem ambiguidade:

| Quantas | O que são | Onde |
|---|---|---|
| **21** | **borda de controle de formulário** | `.p-inputtext`, `.p-dropdown`, `.p-multiselect`, `.p-listbox`, `.p-treeselect`, `.p-cascadeselect`, `.p-datepicker`, `.p-inputgroup-addon` (4 lados), `.p-checkbox` (3), `.p-radiobutton` (2), `.p-selectbutton` (2), `.p-togglebutton` (3) |
| 4 | preenchimento decorativo | "hoje" do datepicker, slider do inputswitch, indicadores de carousel e galleria |
| 2 | declaração de token | `--surface-300`, `--gray-300` — a rampa |

**Nenhuma borda de card, tabela ou divisor está no conjunto** — essas vêm de `#e2e8f0`
(`--surface-border` / `--surface-d`). Trocar a entrada do mapa alcançaria as 27 e mexeria na rampa;
não serve.

### §3.3 · A rule de raio briga com o tema em 2px, hoje, em todo controle

`.claude/rules/frontend-estilizacao.md:83` manda controle em `rounded-md` (6px). O tema pinta 4px:
`generate-brand-theme.mjs:217` reescreve `border-radius: 6px` para `4px` (D7 do item 18). Todo
botão, input e tag do produto desobedece a rule **por construção** — e é por isso que os 10 sítios
da P-67 escreveram `rounded` (4px) em vez de `rounded-md`: estavam certos contra o tema e errados
contra a rule.

## §4 · Decisões

### D1 · `D-66` — o raio passa a ter um knob só, no `@theme`

O `@theme` de `frontend/src/index.css` (que já carrega `--font-sans`/`--font-display`/`--font-mono`)
ganha dois tokens de raio:

```css
@theme {
  --radius-surface: 0.5rem;               /* card, diálogo, bloco com padding de card */
  --radius-control: var(--border-radius); /* = 4px, o que o tema PrimeReact pinta */
}
```

O Tailwind emite `rounded-surface` e `rounded-control`, e o segundo **resolve em tempo de execução
para o var do tema**. Mudar o raio da marca passa a ser uma linha no `generate-brand-theme.mjs`, e
as duas camadas seguem juntas.

**Recusadas:** (a) a rule ceder ao código escrevendo `rounded` literal — 4px ficaria escrito duas
vezes, em camadas que ninguém obriga a concordar, e foi assim que os banners saíram da escala em
primeiro lugar; (b) o tema subir para 6px — reverteria a D7 do item 18, que baixou para 4px de
propósito, e mudaria a cara de todo controle.

A rule passa a dizer:

| Papel | Raio |
|---|---|
| Superfície — card, diálogo, bloco de destaque com padding de card | `rounded-surface` |
| Controle, item de navegação e faixa fina de aviso (`px-3 py-2`) | `rounded-control` |
| Pill, cápsula de contagem e círculo | `rounded-full` |

Os **10 sítios da P-67** (9 arquivos) classificam-se pelo padding do bloco, que é o critério que a
rule já usa ("o degrau segue a ESCALA do bloco, não o aninhamento"):

| Sítio | Padding medido | Degrau |
|---|---|---|
| `ModuleCard.tsx:26` | `p-3` | `rounded-surface` |
| `DocumentTypeCard.tsx:50` | `p-4` | `rounded-surface` |
| `RedatorDocumentSlot.tsx:21` | `p-2` | a medição decide entre os dois degraus |
| `ProfileDocumentSlot.tsx:76` | `p-2` | idem — é o mesmo bloco do anterior, e os dois decidem juntos |
| `StudentLinkRow.tsx:14` | `p-3` | `rounded-surface` |
| `BudgetDialog.tsx:49` | `px-3 py-2` | `rounded-control` |
| `ModuleFields.tsx:67` | `px-3 py-2` | `rounded-control` |
| `CourseStep.tsx:93` | `p-2` | a medição decide |
| `TurmaDocuments.tsx:41,43` | barra de progresso, `h-2` | `rounded-full` — é cápsula, não superfície |

Os banners de erro do `FormField`, hoje em `rounded-md`, descem para `rounded-control`: a
divergência que o review de 2026-08-29 (Q-5) resolveu a favor do código continua resolvida a favor
do código, agora com o degrau nomeado.

### D2 · `D-68` — a borda de controle no claro vai para slate-500, por regra de FORMA

Valor: **`#64748b`** (slate-500), que mede **4,76:1** sobre branco. O de hoje, `#cbd5e1`, mede
**1,48:1** e reprova a 1.4.11 (3:1 no limite do controle quando ele é o único indicador — o tema
escuro tem poço de fundo e não depende do traço). O slate-400 (`#94a3b8`, 2,36:1) também reprova, e
o slate-500 já é degrau vivo da rampa, usado 117× na tinta secundária: **nenhuma cor nova entra**
(D-P3, "uma família só").

**Recusadas:** um degrau próprio fora da rampa medindo 3:1 raspando — cor nova numa paleta cuja
regra inteira é família única, sem margem para erro de medição; e dar preenchimento próprio ao
input para que a borda deixe de ser o único indicador — mexe em `background`, não em `border`, e
muda mais a cara.

**Mecanismo:** uma passada de FORMA nova no `generate-brand-theme.mjs`, ao lado do
`CELESTE_PRIMEIRO_PLANO`, que troca `#cbd5e1` por `#64748b` **somente** quando ele aparece dentro
de uma declaração `border`, `border-color` ou `border-<lado>`, e **somente no claro**. É a mecânica
que o próprio gerador argumenta em `generate-brand-theme.mjs:283`: *"a regra é de FORMA e não lista
de seletores — lista envelheceria no próximo upgrade do primereact"*. A passada não alcança os 4
`background` decorativos nem as 2 declarações de rampa (§3.2), porque nenhum deles é `border`.

### D3 · `D-63` — dois registros ficam; o `h1` de `/validar` sobe

A faixa de seção (12px caixa alta, `sectionLabelClass`) e o título de card (16px,
`text-base font-semibold`) **não são dois degraus de uma escala** — são dois REGISTROS: eyebrow
codifica profundidade por caixa e posição, título por corpo. A recomendação da ficha se sustenta, e
a alternativa monotônica apagaria o registro eyebrow em toda tela que o usa, reabrindo a grafia do
`SectionLabel` que o item 18 acabou de unificar a partir de cinco grafias diferentes.

O que **não** se sustenta é o `h1` de `/validar`: `ValidationPage.tsx:15` mede `text-lg`
(18px/600) enquanto o folio ao lado, `CertificateFolio.tsx:36` com `size="page"`, mede `text-3xl`
(30px). Numa página pública de peso legal, o identificador é o maior texto e o veredito que a
pessoa foi conferir sai um degrau abaixo dele. Isso não é registro; é o veredito perdendo do
identificador.

Duas mudanças:

1. **`cardTitleClass` nasce em `shared/ui/typography.ts`** e o `AppCard.tsx:147` passa a consumi-lo.
   O degrau passa a morar numa constante, que é a condição para mudá-lo depois sem varrer sítios.
2. **O `h1` de `/validar` sobe.** O tamanho é **medição**, não escolha desta spec: mede-se a 390,
   1024 e 1440 contra o folio de 30px, e o alvo é o `h1` ficar no mínimo no mesmo degrau do folio
   sem quebrar "Certificado válido" em 390px. O `CertificateFolio` **fica como está** — a run 5 já
   o mediu nas três viewports e o manteve.

A rule ganha a linha que declara os dois registros, para o próximo audit não reabrir a mesma dúvida.

### D4 · `D-64` — separador visível, na mesma linha

Entre a contagem (`StatValue size="page"`, 30px) e a grandeza (`technicalDataClass text-xs`, 12px)
entra um `·` com `aria-hidden`, dentro do mesmo `<p>` do `KpiRow`. Em es-CL o espaço é separador de
milhar válido, e "1250 UF" com `gap-2` lê como um número só.

**A grandeza não vira terceira linha** — a razão está escrita em `KpiRow.tsx:104` e continua
valendo: como linha própria, o único card que a tinha definia a altura da grade e os outros cinco
herdavam ~95px de vazio.

**Recusadas:** rótulo antes do valor (muda a frase em três locales e compete com o título do card,
que já diz do que se trata) e só aumentar o vão (vão maior continua sendo espaço em branco, que é
exatamente o que pode ser lido como separador de milhar).

### D5 · `D-67` — eco do código e linha de orientação, sem canal

O ramo `notFound` de `ValidationPage.tsx:114-118` passa a mostrar, além do `StatusHeading`:

- **o eco do código consultado**, com rótulo, na grafia de identificador (`identifierClass` /
  `fieldLabelClass`);
- **uma linha de passo seguinte**: `Verifica el código impreso en el documento o contacta a Lotus.`,
  nos três locales do SPA.

**Sem link e sem dado nenhum do certificado.** O eco é o que distingue código digitado errado de
certificado inexistente — quem escaneia o QR está com o papel na mão para conferir contra ele.

**O canal de contato fica de fora e vira ficha nova.** "Contacta a Lotus" sem canal é beco sem
saída, mas publicar endereço ou telefone numa página aberta é decisão da Lotus, não do João
sozinho; travar o bloco nisso seria trocar uma trava por outra.

**O eco é entrada de fora.** O valor vem de param de rota e é renderizado como texto por React (sem
`dangerouslySetInnerHTML`), então não há vetor de injeção; ainda assim recebe **teto de
comprimento**, para que um param longo não deforme a página pública.

### D6 · `D-32` — o `order-*` muda de breakpoint

Hoje o DOM de `ProfilePage.tsx:98-102` nasce `identidade → self-service` e a pintura abaixo de `xl`
é o inverso, o que produz o salto medido: `scrollTop` 0 → 1862 → 2230 → 0 em 390px e `y`
1875 → 2383 → 323 em 1024px (WCAG 1.3.2 e 2.4.3).

**O DOM passa a nascer na ordem de baixo de `xl`** — self-service primeiro, identidade depois — e o
`order-*` passa a existir **só em `xl`**, invertendo. Abaixo de `xl`, onde a violação foi medida em
3,7 dobras, DOM e pintura passam a concordar e ela some. Em `xl` sobra uma divergência menor,
porque as duas colunas dividem a mesma dobra.

Isto **não reverte a D1 nem a D-27**: a identidade continua à esquerda no desktop e o self-service
continua vindo primeiro abaixo de `xl`. Só muda qual breakpoint paga a diferença entre pintura e
árvore.

**Recusadas:** virar as colunas em `xl` (é a correção que existiu e que o João reverteu em
2026-08-18, porque tirava a identidade da esquerda no desktop); encolher o cartão até dispensar a
inversão (reabre o desenho do cartão e a `DS-05`, e "encolheu o bastante" não tem medição);
`tabIndex` positivo (trocaria um defeito de ordem por outro); e a propriedade CSS `reading-flow`,
que resolveria o caso na origem mas só existe no Chrome — apoiar acessibilidade num recurso de um
motor só é regressão silenciosa nos outros.

**O que se mede antes de fechar:** o salto em `xl`, a 1440x900. A decisão foi tomada com a premissa
de que ele é pequeno; se a medição mostrar o contrário, a ficha volta ao João em vez de fechar por
inércia.

### D7 · Ordem de execução

`D-66` primeiro: é a única que toca `index.css`, a rule, 10 sítios de `features/` e uma catraca ao
mesmo tempo, e o resto do bloco não depende dela. `D-68` em seguida, isolada no gerador. As quatro
restantes são independentes entre si e entram em qualquer ordem.

## §5 · Catracas

| Catraca | O que segura | Nasce |
|---|---|---|
| `RAIO_LITERAL` em `frontend/eslint.config.js`, nas duas camadas de `no-restricted-syntax` | `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` literais em `features/` e `app/` | **verde**, depois do décimo sítio da P-67 — é a razão declarada de a P-67 ter ficado aberta |
| asserção nova em `frontend/tests/brand-theme.test.ts` | a borda de controle do claro em `#64748b`, e os 4 `background` e as 2 declarações de rampa **intactos** | com a D2 |

`shared/ui` fica fora do `RAIO_LITERAL`, pelo mesmo critério do `MONO_LITERAL`: é onde a grafia se
define. Os sítios de `shared/ui` migram para os tokens à mão, na mesma task.

## §6 · O que se mede antes de fechar

Três pontos desta spec são premissa, não fato, e cada um tem uma medição que pode devolver a ficha
ao João em vez de fechá-la:

1. **o degrau do `h1` de `/validar`** (D3) — a 390, 1024 e 1440, contra o folio de 30px;
2. **o salto de foco em `xl` no `/perfil`** (D6) — a 1440x900;
3. **o degrau dos três sítios de `p-2`** da P-67 (D1) — `RedatorDocumentSlot`,
   `ProfileDocumentSlot` e `CourseStep`. O `TurmaDocuments` não é ambíguo: é barra de progresso, e
   cápsula não escolhe degrau.

## §6.1 · Achado do self-review — uma violação de cor na linha que o bloco já edita

`CourseStep.tsx:93`, a MESMA linha que a D1 reescreve para o token de raio, carrega
`hover:bg-slate-50 dark:hover:bg-slate-800` — utilities de paleta Tailwind. A rule é explícita:
*"Cor vem de variável do tema, escrita por `style`. Utility de paleta Tailwind (`bg-slate-50`,
`text-red-600`) é o defeito, nos dois temas."*

Varri o resto para dimensionar. São **5 sítios em 3 arquivos**, todos em `features/`:

| Sítio | Utility |
|---|---|
| `CourseStep.tsx:93` | `hover:bg-slate-50 dark:hover:bg-slate-800` |
| `CourseStep.tsx:102` | `text-slate-500` |
| `QuoteWizard.tsx:47` | `text-slate-500` |
| `QuoteWizard.tsx:64` | `text-red-600` |
| `ManualButton.tsx:28` | `text-red-600` |

**Só o primeiro entra no escopo**, e só porque o bloco já está com a mão naquela linha. Os outros
quatro viram ficha **`D-69`**, com esta medição — dois deles são tinta de erro, que é decisão de
qual variável de perigo o tema expõe, e isso é desenho, não conserto de passagem. Corrigir os cinco
aqui seria varredura de paleta num bloco que decide raio, tipografia e contraste: escopo diferente,
DoD diferente.

## §7 · Definition of done

- As **seis fichas** têm veredito escrito **e**, onde o veredito pede código, o código aplicado com
  prova de comportamento. Nenhuma sai como "decidida mas não aplicada".
- A **P-67** fecha: os 10 sítios classificados e a catraca `RAIO_LITERAL` **vista reprovar por
  sonda** antes de entrar.
- A borda de controle do claro mede **≥ 3:1**, medida nos dois temas; os 4 `background` e as 2
  declarações de rampa saem do `pnpm brand-theme` **sem diff**.
- O `h1` de `/validar` não é mais o texto menor que o folio, medido nas três viewports.
- O foco de `/perfil` abaixo de `xl` percorre a página sem o salto medido em 2026-08-18.
- `pnpm lint` **0**, `pnpm build` verde, suíte do frontend verde.
- `generated.ts` sai com **diff vazio** — o bloco não toca contrato.
- A rule `frontend-estilizacao.md` reflete a escala escolhida e os dois registros; nenhuma linha
  dela descreve um estado que o código não tem.
- A **`D-69`** existe no `backlog.md` com os quatro sítios de utility de paleta que este bloco **não**
  corrigiu (§6.1) — achado medido não sai da sessão sem ficha.

## §8 · O que sai do bloco

**A `D-65` sai reescrita, para um hospedeiro que nasce com ela:** o **item 23**,
`frontend-tabelas-reserva-e-rolagem`, no fim da fila. A ficha da `D-65` é corrigida com a medição
da §3.1 — sete valores de reserva, não um `8rem` fixo — e o item 23 recebe as duas direções que ela
enumera, para serem medidas nas 12 tabelas a 1024px.

Criar o hospedeiro em vez de apontar para um bloco que não existe é decisão explícita do João:
apontar para bloco inexistente é o estado em que a `D-34` está desde 2026-08-23, e ele não expira
sozinho.

**A `D-34` continua sem hospedeiro** e fora deste bloco — é backend e contrato, e escolher o
hospedeiro dela segue sendo do João.
