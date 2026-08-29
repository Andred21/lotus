import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import fs from 'node:fs'
import path from 'node:path'

// As features saem do DISCO, não de uma lista literal. Uma lista escrita à mão
// deixa de fora a feature que nascer depois dela — e a que ficou de fora não
// ganha guardrail nenhum, em silêncio. Era o caso do literal que ficou aqui até
// 2026-08-04 (review, Q-5); o mesmo achado valia para a matriz do
// `DomainDependencyTest`, que também enumerava os domínios à mão.
// `certification` entra por já existir como scaffold — e é quem mais ganha em
// nascer sob a regra, porque será escrito na Sprint 4.
const FEATURES = fs
  .readdirSync(path.resolve(import.meta.dirname, 'src/features'), { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)

// Uma feature alcança outra por alias (`@features/x`) ou subindo de caminho
// relativo. A subida não contém o segmento `features/`, então o padrão de alias
// e o `**/features/x/**` passam ao largo dela: `no-restricted-imports` casa a
// STRING escrita, não o caminho resolvido. Os 4 níveis cobrem toda a
// profundidade real de `src/features/<f>/…` (`components/<Entidade>/X.tsx` é a
// mais funda, com 3). Não há falso positivo possível: nenhuma feature tem
// sub-pasta com nome de outra feature.
const subidaRelativa = (outra) =>
  ['../', '../../', '../../../', '../../../../'].flatMap((prefixo) => [
    `${prefixo}${outra}`,
    `${prefixo}${outra}/*`,
    `${prefixo}${outra}/**`,
  ])

// Transporte multipart tem UM lugar (`shared/api/postMultipart.ts`). O helper
// nasceu em 2026-08-04 e o comentário da lição 6, que vivia copiado em 5
// consumidores, saiu de todos eles — então o que impedia a próxima feature de
// montar `FormData` na mão passou a ser nada. Fixar `Content-Type` num
// `api.post` manual faz cada `File` virar `{}` e o upload chegar VAZIO com
// 201/204 de sucesso, em caminho de documento com peso legal: build, lint e
// suíte não veem. Instrução não segura isso (lição 14).
const FORMDATA_FORA_DO_HELPER = {
  selector: "NewExpression[callee.name='FormData']",
  message:
    'Upload de feature não monta FormData: use postMultipart de @shared/api/postMultipart, que é o único ponto onde o Content-Type não pode ser fixado (frontend-fsliced.md, lição 6).',
}

// Os 3 seletores que proíbem query/mutation dentro de componente de feature +
// o ban de FormData solto, extraídos em array: dois blocos de `files`
// diferentes precisam do mesmo conjunto — `src/features/*/components/**` sem
// exceção de cor, e o mesmo caminho filtrado pela catraca de cor (D7), que
// ainda bane query/mutation/FormData igual, só não a cor hardcoded. Duplicar
// os 4 objetos entre blocos os deixaria dessincronizar em silêncio.
const REGRAS_COMPONENTE_FEATURE = [
  {
    // `coursesApi.useList()`, `rolesApi.useList()`, e qualquer `xxxApi.useAlgo()`.
    selector: "CallExpression[callee.object.name=/Api$/][callee.property.name=/^use[A-Z]/]",
    message:
      'Query de recurso não vive em componente de feature: mova para um hook em features/<x>/hooks/ e consuma o resultado derivado (frontend-fsliced.md).',
  },
  {
    // `useQuery`/`useMutation` diretos. O `$` é o que impede casar
    // `useMutationErrors`, que é consumo de erro e pode ficar no componente.
    selector: "CallExpression[callee.name=/^use(Query|Mutation|InfiniteQuery|SuspenseQuery)$/]",
    message:
      'TanStack Query direto não vive em componente de feature: mova para features/<x>/api/ ou hooks/ (frontend-fsliced.md).',
  },
  {
    // O escape do seletor acima: `useCrudPage(budgetsApi)` não casa
    // `xxxApi.useAlgo()`, mas a query está lá dentro do mesmo jeito — o
    // `useCrudPage` chama `resource.useList()`. Casa pelo ARGUMENTO, não
    // pelo nome do hook: banir `useCrudPage` fecharia só o caso conhecido
    // e `useOutraCoisa(clientsApi)` escaparia igual amanhã, que é como
    // este buraco nasceu (spec D5). Os `xxxApi.keys.all` dos 4 diálogos
    // são MemberExpression, não Identifier, e seguem passando.
    //
    // Casa QUALQUER posição de argumento, não só a primeira. Fixar
    // `arguments.0` reproduzia o buraco que este seletor existe para
    // fechar: `useEntityForm(mode, clientsApi)` escapava pela mesma
    // lógica que motivou a regra (review de 2026-08-04, Q-2, sonda).
    selector: 'CallExpression > Identifier.arguments[name=/Api$/]',
    message:
      'Recurso de API não entra em componente de feature nem como argumento: consuma um hook de features/<x>/hooks/ (frontend-fsliced.md).',
  },
  FORMDATA_FORA_DO_HELPER,
]

// D7 (cor pelo tema) e modo leitura (BD-3 §4): as duas regras abaixo, medidas
// com o Step 5 do próprio bloco. O texto original do brief dava cada regra em
// blocos `src/features/**/*.tsx` PRÓPRIOS, separados dos blocos de
// `no-restricted-syntax` que já existiam para `src/features/*/components/**`
// e `src/features/**` — e blocos próprios COLIDEM com os já existentes pelo
// mesmo bug de merge raso que o comentário deles já citava (Q-2, 2026-08-04):
// todo arquivo de componente casa dois blocos que declaram
// `no-restricted-syntax` [o de query/FormData que já existia, e o novo de
// cor/modo-leitura], e o que vem depois no array apaga o do que vem antes por
// inteiro. Rodar o Step 5 dos blocos próprios provou o sintoma esperado pelo
// brief [mutação de cor em RoleDialog.tsx reprovando], mas não provou a
// colisão com os blocos de cima — achado do review desta task, com
// `--print-config` mostrando os 3 bans de query e o de FormData apagados em
// ~75 arquivos de componente.
//
// Por isso `COR_HARDCODED` e `DISABLED_READONLY` NÃO ganham bloco próprio:
// entram nos arrays dos blocos que JÁ casam cada glob — `components/**` (com
// a catraca de cor particionada por `ignores`/`files: CATRACA_COR`, dois
// blocos abaixo) e o resto de `src/features/**` — e só `shared/**` ganha
// bloco novo, porque nenhum bloco existente casa aquele glob com
// `no-restricted-syntax`.
const COR_HARDCODED = {
  selector:
    'JSXAttribute[name.name="className"] Literal[value=/\\b(text|bg|border|ring|divide)-(slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|emerald|sky|indigo|violet|rose|orange|teal|cyan|lime|fuchsia|purple|pink)-[0-9]{2,3}\\b/]',
  message:
    'Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema (ADR-16). Use style={{ color: "var(--text-color-secondary)" }} e irmãs.',
}
// Propriedades cujo VALOR é cor. `borderInlineStartColor` está aqui porque é a
// que o `AppCard` usa no trilho do `stat`.
const PROPS_DE_COR = [
  'color', 'background', 'backgroundColor',
  'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderInlineStartColor', 'borderInlineEndColor', 'borderBlockStartColor', 'borderBlockEndColor',
  'outlineColor', 'fill', 'stroke', 'caretColor', 'accentColor',
  'textDecorationColor', 'columnRuleColor',
].join('|')

// Referência de tema, ou palavra-chave que não é cor. Tudo o mais é literal cru.
const VALOR_DE_TEMA = 'var\\(|color-mix\\(|transparent$|inherit$|currentColor$|none$|unset$|initial$'

const MSG_COR_EM_STYLE =
  'Cor crua em propriedade de cor: cor vem de variável do tema (ADR-16). ' +
  'Use var(--text-color-secondary), color-mix(in srgb, var(--…) 15%, var(--surface-card)) e irmãs.'

// A catraca `COR_HARDCODED` acima mede `className` e é CEGA a `style`. Esta mede
// o VALOR, que é a única régua possível aqui: cor por `style` é a grafia CERTA
// quando o valor é `var(--…)`, e foi exatamente isso que adiou a guarda desde
// 2026-08-13 (P-36). A medição que a destravou: `src/` tem ZERO literais de cor
// crua em propriedade de cor, então ela nasce sem nenhum `ignores` — que era o
// medo registrado na ficha ("nasceria verde com a exceção embutida").
//
// Descendente, não filho direto: o valor real da propriedade costuma ser
// ternário (`AppCard.tsx` — `hue && !stat ? color-mix(…) : 'var(--surface-card)'`),
// e um seletor `>` seria contornado por toda condicional. `Literal[raw=/^['"]/]`
// restringe a literal de STRING: sem isso, o `0` de um `arr[0]` dentro da
// expressão contaria como cor crua.
//
// O que ela deliberadamente NÃO alcança é Identifier — resolver binding não é
// trabalho de seletor sintático. É por isso que `BRAND_COLOR` foi APAGADA em vez
// de só regulada: sem segunda grafia da marca em JS, não há porta de fuga.
const COR_LITERAL_EM_STYLE = [
  {
    selector: `Property[key.name=/^(${PROPS_DE_COR})$/] Literal[raw=/^['"]/]:not([value=/^(${VALOR_DE_TEMA})/])`,
    message: MSG_COR_EM_STYLE,
  },
  // `{ 'background': '#fff' }` é o mesmo defeito com a chave em string. O
  // `:not(.key)` é obrigatório aqui e foi medido, não previsto: sem ele o
  // seletor descendente marca a PRÓPRIA chave — `'background'` é literal de
  // string e não começa por `var(` —, então `{ 'color': 'var(--x)' }`, que é
  // código correto, reprovaria sozinho. Guarda que reprova código certo é a
  // armadilha oposta à da P-36, e igualmente cara.
  {
    selector: `Property[key.value=/^(${PROPS_DE_COR})$/] Literal[raw=/^['"]/]:not(.key):not([value=/^(${VALOR_DE_TEMA})/])`,
    message: MSG_COR_EM_STYLE,
  },
  // Template literal entra pela mesma régua, olhando o PRIMEIRO quasi — é a
  // grafia do `AppFileRow` e do `AppCard`, e `color-mix(in srgb, ${hue} …` passa.
  {
    selector: `Property[key.name=/^(${PROPS_DE_COR})$/] TemplateLiteral:not([quasis.0.value.raw=/^(var\\(|color-mix\\()/])`,
    message: MSG_COR_EM_STYLE,
  },
  {
    selector: `Property[key.value=/^(${PROPS_DE_COR})$/] TemplateLiteral:not([quasis.0.value.raw=/^(var\\(|color-mix\\()/])`,
    message: MSG_COR_EM_STYLE,
  },
]
// O seletor mede a FORMA do defeito, não a string que o grep achou. A primeira
// versão exigia `JSXExpressionContainer > Identifier[name="readOnly"]` — casava
// só `disabled={readOnly}`, que era a grafia dos 40 sítios convertidos — e
// deixava passar `disabled={f.readOnly}` (MemberExpression, 4 sítios em
// `TurmaConfigCard`) e `disabled={readOnly || !isCreate}` (LogicalExpression,
// `BudgetDialog`), que são o MESMO campo truncado em leitura. É a segunda vez
// que uma catraca deste arquivo nasce medindo enumeração em vez de forma (a
// primeira foi a lista literal de features, Q-5 de 2026-08-04); achado do
// review do BD-3 (Q-1).
const DISABLED_READONLY = {
  selector: 'JSXAttribute[name.name="disabled"]:has(Identifier[name="readOnly"])',
  message:
    'Campo desabilitado trunca o valor e some com o contraste em leitura: passe `readOnly` e `value` ao FormField/NestedField (spec BD-3 §4).',
}
// A terceira grafia, e a que mais dói: o par ESTÁTICO
// `<AppInputText value={…} disabled readOnly />`, campo que nasce só-leitura e
// não tem expressão nenhuma para casar. Eram 12 sítios — snapshot congelado de
// certificado (código, RUT, curso, motivo de revogação) e a carga horária da
// turma —, dado de peso legal truncado dentro de um input cinza.
const DISABLED_READONLY_ESTATICO = {
  selector:
    'JSXOpeningElement:has(JSXAttribute[name.name="disabled"][value=null]):has(JSXAttribute[name.name="readOnly"][value=null])',
  message:
    'Campo que nasce só-leitura não é input desabilitado: use <FormField readOnly value={…}> — o input corta o valor e derruba o contraste (spec BD-3 §4).',
}
// `AppDropdown` sem nome acessível. O mesmo defeito foi corrigido À MÃO em
// quatro sítios, por três runs independentes (`TurmaStatusFilter`,
// `BudgetStatusFilter`, `EmissionPanel`, `HistorialTable`), e a quinta
// ocorrência nasceu verde: o filtro de tipo de documento do
// `BudgetDocumentsCard`. Quatro correções e zero catraca é a definição de
// dívida (`D-62`).
//
// Mede a FORMA, não a grafia: `AppDropdown` que não descende de um `FormField`
// — que entrega o `inputId` por contexto, e é a grafia CERTA dos 11 sítios de
// formulário — e que não declara `inputId`, `aria-label` nem `aria-labelledby`
// por conta própria. Grep pela grafia de hoje casaria só os filtros de hoje;
// foi a lição do seletor deste arquivo que nasceu casando só `arguments.0`.
//
// `NestedField` NÃO conta como pai válido, de propósito: ele não monta
// `FieldContext`, então um dropdown dentro dele fica sem nome do mesmo jeito.
// Hoje não há nenhum; quando houver, reprova.
const DROPDOWN_SEM_NOME = {
  selector:
    'JSXElement[openingElement.name.name="AppDropdown"]' +
    ':not(JSXElement[openingElement.name.name="FormField"] JSXElement[openingElement.name.name="AppDropdown"])' +
    ':not(:has(JSXOpeningElement > JSXAttribute[name.name=/^(inputId|aria-label|aria-labelledby)$/]))',
  message:
    'AppDropdown sem nome acessível: dentro de FormField o id vem por contexto; fora dele passe inputId (ligado a uma label) ou aria-label. O `id` do Dropdown cai no nó raiz e não alcança o input focável (D-62).',
}
// Item 19 (R1): `AppButton` sem papel cai no `.p-button` preenchido do Lara —
// celeste com rótulo navy —, que NÃO é papel deste produto: a ação primária é
// o contorno de marca (`variant="primary"`), a secundária é `text`, a
// destrutiva passa `severity`. Foi assim que os seis diálogos de certificação
// (CTA cru), o alvo do `AppSelectableCard` (card de redator selecionado
// idêntico ao não selecionado — o C da fase 4) e o `ArchiveSwitch` (filtro
// disputando com a CTA) escaparam da varredura do item 18. Medido com o próprio
// seletor antes de valer: 13 sítios, classificados na Task 6 do plano de
// 2026-08-29. `rounded` sozinho não é papel — sem `text` o botão segue
// preenchido.
const BOTAO_SEM_PAPEL = {
  selector:
    'JSXOpeningElement[name.name="AppButton"]' +
    ':not(:has(> JSXAttribute[name.name=/^(variant|text|outlined|link|severity)$/]))',
  message:
    'AppButton sem papel cai no preenchido cru do Lara: passe variant="primary" (ação primária), text (secundária), outlined, link ou severity (destrutiva) — .claude/rules/frontend-estilizacao.md §Botão.',
}
// Grafia tipográfica escrita LITERAL no sítio, em vez de vir de
// `shared/ui/typography.ts`. A rule de estilização já mandava não fazer isso e
// nomeava `typography.test.ts` como mecanismo — mas aquele teste congela o VALOR
// das quatro constantes e é cego a quem as recopia: ele passaria com o produto
// inteiro escrevendo a grafia à mão. Regra sem catraca é recomendação solta, e
// esta ficou solta com 4 cópias vivas (`AgendaPanel`, `KpiRow`, `Sidebar` e o
// `headerRow` do `AppDataTable`) — Q-3 do review de 2026-08-29.
//
// Mede a ASSINATURA de cada grafia, não a string inteira: foi assim que o
// rótulo da Sidebar escapava de qualquer grep pela constante — ele tinha
// derivado para `text-xs font-semibold tracking-wider` SEM o `uppercase`, que é
// a cópia pior, a que já divergiu. Duas classes adjacentes bastam para nomear a
// voz; exigir as quatro seria enumerar de novo.
//
// `tabular-nums` fica FORA da assinatura de propósito: ele é obrigatório em todo
// dado técnico (RUT, folio, contagem), e a feature que o escreve está cumprindo
// a rule, não copiando grafia de papel.
const GRAFIA_TIPOGRAFICA =
  'font-semibold\\s+tracking-wider|font-display\\s+text-(2xl|3xl)|text-xs\\s+uppercase\\s+tracking-wide'
const MSG_GRAFIA_LITERAL =
  'Grafia tipográfica literal no sítio: importe pageTitleClass, sectionLabelClass, fieldLabelClass ou <StatValue>/<SectionLabel> de @shared/ui. ' +
  'Recopiar a grafia é como o título de auth virou 5 cópias divergentes (.claude/rules/frontend-estilizacao.md).'
const GRAFIA_LITERAL = [
  {
    selector: `JSXAttribute[name.name="className"] Literal[value=/${GRAFIA_TIPOGRAFICA}/]`,
    message: MSG_GRAFIA_LITERAL,
  },
  // A interpolação não é porta de fuga: `` `min-w-0 text-xs font-semibold
  // tracking-wider uppercase` `` é a MESMA cópia com crase. O quasi carrega a
  // grafia; o `${…}` ao lado não a redime.
  {
    selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${GRAFIA_TIPOGRAFICA}/]`,
    message: MSG_GRAFIA_LITERAL,
  },
  // `className` também é CHAVE de objeto — é a grafia dos `pt` de `shared/ui`
  // (`AppDataTable/style.ts`, onde a 4ª cópia morava) e de qualquer módulo `.ts`
  // que monte classe fora do JSX.
  {
    selector: `Property[key.name="className"] Literal[value=/${GRAFIA_TIPOGRAFICA}/]`,
    message: MSG_GRAFIA_LITERAL,
  },
  {
    selector: `Property[key.name="className"] TemplateElement[value.raw=/${GRAFIA_TIPOGRAFICA}/]`,
    message: MSG_GRAFIA_LITERAL,
  },
]
// Item 19 (R2): `font-mono` escrito literal no sítio é a metade de um par — a
// fase 2 do item 18 mediu sete sítios com `font-mono` SEM `tabular-nums`, e a
// fase 1 um RUT partido no hífen por viajar como prosa. A rule mandava o par e
// não tinha mecanismo. `technicalDataClass` e `identifierClass` em
// `shared/ui/typography.ts` são a única grafia; `shared/ui` fica de fora porque
// é onde ela é DEFINIDA. Medido com o próprio seletor antes de valer: 20 sítios,
// zerados nas Tasks 8 e 9 do plano de 2026-08-29.
const MSG_MONO_LITERAL =
  'Dado técnico com font-mono literal: importe technicalDataClass (contagem, data, versão) ou identifierClass (RUT, folio, código — não quebra) de @shared/ui. ' +
  'O par font-mono + tabular-nums é inseparável (.claude/rules/frontend-estilizacao.md §Dado técnico).'
const MONO_LITERAL = [
  { selector: 'JSXAttribute[name.name="className"] Literal[value=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'Property[key.name="className"] Literal[value=/font-mono/]', message: MSG_MONO_LITERAL },
  { selector: 'Property[key.name="className"] TemplateElement[value.raw=/font-mono/]', message: MSG_MONO_LITERAL },
]
// Item 17: toda coluna declara largura, e toda coluna com ação fica presa à
// direita. As duas nascem DEPOIS de as 15 tabelas cumprirem — regra ligada antes
// deixa o lint vermelho durante catorze tasks.
//
// **`JSXOpeningElement` com `:has(> …)`, e NÃO `JSXElement` com `:has(…)`.** A
// forma descendente não funciona e foi medida: `body={() => <span style={{…}}>}`
// é um atributo do PRÓPRIO `JSXOpeningElement`, então um `style` em qualquer
// elemento aninhado no `body` satisfaz o `:has` e a coluna passa sem declarar
// largura nenhuma. É o caso de CompliancePanel (`<Link style>`), CoursesTable
// (`<i style>`) e StudentsTable (`<span style>`) — três das quinze. Sondado em
// 2026-08-24 nas duas grafias: a descendente acusava ZERO.
//
// O bloco `src/shared/**/*.tsx` fica de FORA das duas, e é decisão medida: ele
// casaria três arquivos de TESTE de shared que renderizam `AppColumn` de fixture
// sem largura (`archivedColumns.test.tsx`, `AppDataTable.test.tsx`,
// `SearchableTableFrame.test.tsx`, 6 colunas ao todo), e cobri-los exigiria
// `ignores: ['**/*.test.tsx']` naquele bloco — o que desligaria junto
// `COR_HARDCODED` e `DISABLED_READONLY` nos testes de shared. Enfraquecer duas
// catracas para ganhar uma não paga. A população real de shared são as duas
// colunas de `archivedColumns.tsx`, e elas têm prova comportamental no próprio
// `archivedColumns.test.tsx` (item 17, Task 15).
//
// **Exige LARGURA, e não a mera presença de `style`.** A primeira grafia parava
// no atributo, e `style={{ color: '…' }}` a satisfazia — catraca satisfeita sem
// cumprir o que a mensagem dela enuncia lê como cobertura que não existe (Q-4 do
// review de 2026-08-24). As duas únicas formas legítimas são um acesso ao mapa
// de `tableWidths` (`largura.<chave>`, `MemberExpression`) e a chamada de
// `stickyActionsColumn(<rem>)` (`CallExpression`); o seletor passa a pedir uma
// das duas dentro do `JSXExpressionContainer`. Objeto literal inline não passa,
// que é exatamente o ponto.
const MENSAGEM_LARGURA =
  'Toda coluna declara largura (item 17): style={largura.<chave>} de tableWidths/COL, ou style={stickyActionsColumn(<rem>)} na coluna de ações.'
const COLUNA_SEM_LARGURA = [
  // 1. Coluna sem `style` nenhum.
  {
    selector: "JSXOpeningElement[name.name='AppColumn']:not(:has(> JSXAttribute[name.name='style']))",
    message: MENSAGEM_LARGURA,
  },
  // 2. Coluna COM `style` que não é largura. A primeira grafia parava na
  // presença do atributo, e `style={{ color: '…' }}` a satisfazia — catraca
  // satisfeita sem cumprir o que a mensagem enuncia lê como cobertura que não
  // existe (Q-4 do review de 2026-08-24). As duas únicas formas legítimas são o
  // acesso ao mapa de `tableWidths` (`largura.<chave>`, `MemberExpression`) e a
  // chamada de `stickyActionsColumn(<rem>)` (`CallExpression`).
  //
  // **Dois seletores de UM nível, e não um `:has(> a > b > c)`.** A forma
  // encadeada foi medida em 2026-08-24 e reprova as duas grafias legítimas
  // junto com as inválidas: o esquery não desce a cadeia dentro do `:has`. Aqui
  // o predicado desce pelo CAMINHO do nó (`value.expression.type`), que é o que
  // esta config já usa e prova.
  {
    selector:
      "JSXOpeningElement[name.name='AppColumn']:has(> JSXAttribute[name.name='style']" +
      ":not([value.expression.type='MemberExpression']):not([value.expression.type='CallExpression']))",
    message: MENSAGEM_LARGURA,
  },
]
// As três formas de célula de ação que o inventário do item 17 achou: adaptador
// `*RowActions`, `AppButton` solto e `AppButton` dentro de `div` — o `:has` é
// descendente de propósito aqui, então o `flex gap-2` do Historial casa.
//
// O que ela NÃO pega, dito para ninguém supor cobertura que não existe: coluna
// de ação cuja célula não passe por `*RowActions` nem `AppButton`, e
// `stickyActionsColumn` chamado em qualquer lugar dentro da coluna que não seja
// o `style` (não existe hoje; a chamada só aparece em `style`).
const ACAO_SEM_ANCORA = {
  selector:
    "JSXElement[openingElement.name.name='AppColumn']" +
    ":has(JSXElement[openingElement.name.name=/RowActions$|^AppButton$/])" +
    ":not(:has(CallExpression[callee.name='stickyActionsColumn']))",
  message:
    'Coluna de ação fica presa à direita do invólucro que rola: style={stickyActionsColumn(<rem>)} (item 17).',
}
// Q-6 do review de 2026-08-27. O mini-reset da P-46 crava `list-style: none`
// em TODO `ul`/`ol` da aplicação, e o WebKit tira a semântica de lista do
// elemento quando o marcador some: o VoiceOver deixa de anunciar "lista, 5
// itens" e passa a ler os itens soltos. `role="list"` devolve a semântica sem
// devolver o marcador — é o remédio padrão para essa exata consequência do
// Preflight, e agora ela alcança a aplicação inteira, não as cinco listas que o
// bloco enxergou.
//
// A régua exige `role` e não inspeciona `className`: lista que QUER marcador
// escreve `list-disc` E `role="list"` — redundante no navegador, mas é o que
// mantém a catraca de um predicado só, e `role="list"` num `ul` com marcador
// não muda nada.
const LISTA_SEM_SEMANTICA = ['ul', 'ol'].map((tag) => ({
  selector: `JSXOpeningElement[name.name='${tag}']:not(:has(> JSXAttribute[name.name='role']))`,
  message:
    'Lista sem role="list": o mini-reset da P-46 zera o marcador e o WebKit tira a semântica de lista junto (Q-6, 2026-08-27).',
}))
// Catraca da regra de cor: lista que só ENCOLHE. O Login
// SAIU em 2026-08-13: o desenho novo que esta linha previa é o bloco
// `login-fora-do-adr16`, e a tela passou a ler token de superfície e de texto
// em vez de utility fixa. Não reintroduza arquivo aqui para calar o lint —
// quem precisa de cor pede token ao tema.
// A Validação SAIU em 2026-08-28: o `bg-slate-50 dark:bg-slate-950` virou
// `--surface-ground` (achado C2 do audit de 2026-08-26) e o arquivo não tem
// mais cor crua nenhuma.
const CATRACA_COR = [
  'src/features/commercial/components/Budget/CourseStep.tsx',
  'src/features/commercial/components/Budget/QuoteWizard.tsx',
  'src/features/operation/components/Document/ManualButton.tsx',
]

export default defineConfig([
  // generated.ts é gerado pelo typescript-transformer (ADR-04) e nunca editado
  // à mão — lintá-lo só produz erro que não se pode corrigir na fonte certa.
  globalIgnores(['dist', 'src/shared/types/generated.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // "Componente de feature = declarativo" deixa de ser instrução e vira mecanismo
  // (lição 14). A rule já mandava query/mutation morarem num hook da feature, e
  // mesmo assim o padrão custou uma sprint de refactor por feature: Q-4 do
  // `abstracao-componentes-redator` (RedatorCourseSelector) e C-1 do
  // `abstracao-componentes-operation` (TurmaConfigCard) são o MESMO achado, dois
  // blocos seguidos. Grep manual no gate só prova a pasta que acabou de ser
  // limpa; isto aqui reprova na hora, em qualquer feature.
  //
  // `COR_HARDCODED` e `DISABLED_READONLY` (D7 / BD-3 §4) entram NESTE array em
  // vez de em blocos `src/features/**` próprios — um bloco extra que casasse o
  // mesmo `files` colidiria com este por merge raso de `rules` (Q-2,
  // 2026-08-04): o `no-restricted-syntax` de quem vem depois no array apaga o
  // de quem vem antes por inteiro, não concatena. Foi o que a Task 7 tentou
  // primeiro — dois blocos `src/features/**/*.tsx` novos apagando ESTE bloco
  // em silêncio para todo componente, achado do review desta task.
  //
  // `ignores: CATRACA_COR` porque a catraca de cor (D7, dois blocos abaixo)
  // precisa das MESMAS 4 proibições de componente — só não a de cor hardcoded
  // — e um array de `no-restricted-syntax` não aceita `ignores` por seletor
  // individual dentro de si. A catraca ganha bloco próprio com o mesmo array
  // menos `COR_HARDCODED`, particionando o mesmo glob sem sobreposição.
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    ignores: CATRACA_COR,
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, ...REGRAS_COMPONENTE_FEATURE, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL],
    },
  },
  // A catraca de cor (D7): mesmo array do bloco acima, sem `COR_HARDCODED` —
  // é o único ponto onde a cor segue hardcoded de propósito. `files: CATRACA_COR`
  // aqui e `ignores: CATRACA_COR` acima particionam o mesmo glob; nenhum
  // arquivo casa os dois blocos.
  // A régua de VALOR entra aqui também, e sem exceção: o que estes 4 arquivos
  // carregam é a exceção da classe Tailwind, não a de cor em `style` — e eles
  // não têm nenhuma (medido em 2026-08-17).
  {
    files: CATRACA_COR,
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, ...REGRAS_COMPONENTE_FEATURE, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL],
    },
  },
  // O resto da feature: `api/`, `hooks/`, `pages/` — onde os 6 pontos adotantes
  // do `postMultipart` de fato vivem. `COR_HARDCODED` e `DISABLED_READONLY`
  // (D7 / BD-3 §4) entram aqui também: as duas regras valem em toda
  // `src/features/**/*.tsx`, não só em `components/`, que ganha o array
  // completo (mais os 3 bans de query) nos dois blocos acima.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: [
      // Coberto pelos dois blocos acima, com os 4 seletores de componente juntos.
      'src/features/*/components/**/*.{ts,tsx}',
      // Catraca de um: `useRedatorForm` monta array (`course_ids[]`) e chave
      // polimórfica (`documents[type]`) e entrega o FormData pronto para uma
      // mutation de CRUD alheia. Cobri-lo exigiria um serializador genérico de
      // payload — forma de domínio vazando para o transporte (spec D11 do bloco
      // `hardening-guardrails-e-transportes`). Exceção declarada, não esquecida.
      'src/features/identity/hooks/useRedatorForm.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, FORMDATA_FORA_DO_HELPER, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL],
    },
  },
  // A régua de tamanho vira mecanismo (lição 14). Ela era citada como se
  // estivesse na rule — pelas specs de `commercial` e de `catalog`, e pelo
  // state.md — mas nunca esteve escrita em lugar nenhum (lição 13): doc que
  // descreve intenção não-construída. E o padrão que ela deveria conter
  // (bloco coeso preso dentro de componente grande) custou TRÊS blocos
  // consecutivos de refactor: `abstracao-componentes-operation` (2026-08-02),
  // `zerar-catraca-e-componentes-commercial` e `abstracao-componentes-catalog`
  // (2026-08-03). Instrução repetida três vezes quer mecanismo, não parágrafo.
  //
  // 150 não é número redondo escolhido no chute: é o corte que a distribuição
  // real já desenhava — 53 dos 57 componentes de feature ficam abaixo dele.
  //
  // Bloco SEPARADO do `no-restricted-syntax` de propósito: nasceu com uma
  // catraca de `ignores` própria, que exigia não fundir com o bloco de cima —
  // juntar as duas regras exporia aquele `ignores` ao `no-restricted-syntax` e
  // reabriria em silêncio a catraca de query-em-componente (zerada em
  // 2026-08-03). Esta catraca também zerou — o `ignores` não existe mais —,
  // mas o bloco segue separado: nada ganha em fundir agora.
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
    },
  },
  // D8 do B2: `src/app/**` era a camada SEM régua, e dois dos seus 24 arquivos
  // já a excediam — os dois criados pelo B1. Mesmo formato da D11 do B1, que
  // fechou a P-34 ligando a catraca de cor nesta mesma camada descoberta.
  //
  // O glob é `.tsx` e não `{ts,tsx}` de PROPÓSITO, e é o mesmo recorte da regra
  // das features, que vale só para `components/`: hook e módulo de derivação
  // longos são legítimos, componente inchado não. Em `app/pages/Dashboard/` os
  // `.ts` são exatamente isso — `useDashboard`, `navigation`, `kpiCards`,
  // `resumoCards`, `periodPresets`.
  //
  // Teste cai na mesma isenção pelo mesmo motivo: quebrar um arquivo de teste
  // coeso é pagar preço pela regra, não pelo defeito.
  {
    files: ['src/app/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'max-lines': ['error', { max: 150, skipBlankLines: false, skipComments: false }],
    },
  },
  // Lei §5.6 do CLAUDE.md vira mecanismo (lição 14). As 3 fronteiras estão
  // limpas hoje — 0 primereact fora de shared/ui, 0 cross-feature, 0
  // shared->feature — então a regra nasce SEM catraca, diferente das duas
  // anteriores. Violação encontrada aqui é achado, não exceção a registrar.
  //
  // Fronteiras 1 (PrimeReact direto) e 2 (feature->feature) vivem no MESMO
  // bloco `no-restricted-imports`, por feature — sem bloco genérico
  // `files: src/features/**` separado para PrimeReact. ESLint flat config faz
  // merge RASO de `rules`: quando dois blocos que casam o mesmo arquivo
  // declaram a MESMA regra, o último apaga o primeiro por inteiro (não
  // concatena `patterns`). Um bloco genérico de PrimeReact e os 5 blocos por
  // feature abaixo colidiam em todo arquivo de feature — o genérico nunca
  // disparava, apagado em silêncio pelo bloco mais específico que vem depois
  // no array. Visto reprovando (a sonda da fronteira 1 não disparava com os
  // dois blocos separados) antes de consolidar num único bloco por feature.
  //
  // Uma feature não enxerga outra — nem para tipo. Um bloco por feature,
  // proibindo as demais em três formas: alias (`@features/<outra>`), caminho
  // que atravessa `features/` (o de quem está fora de `src/features/`) e subida
  // relativa (`../../../<outra>/…`, o de quem está dentro).
  //
  // O que esta regra NÃO pega, dito aqui para ninguém supor cobertura que não
  // existe: subida relativa acima de 4 níveis e `import()` dinâmico, que o
  // `no-restricted-imports` não visita. Zero ocorrências das duas formas hoje.
  // Até 2026-08-04 o comentário deste bloco afirmava que `**/features/<outra>/**`
  // cobria o caminho relativo; não cobria — a string escrita não tem `features/`
  // nenhum (review, Q-2).
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primereact', 'primereact/*'],
              message:
                'Feature não importa PrimeReact direto: use o wrapper de @shared/ui (CLAUDE.md §5.6, ADR-05).',
            },
            {
              group: FEATURES.filter((outra) => outra !== feature).flatMap((outra) => [
                `@features/${outra}`,
                `@features/${outra}/*`,
                `**/features/${outra}/**`,
                ...subidaRelativa(outra),
              ]),
              message:
                'Feature não importa de outra feature: a composição acontece em app/router, ou o dado vem da API (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  })),
  // Dependência aponta só para baixo: shared é base, não conhece domínio.
  // `app/` fica de fora desta e da regra acima de propósito — AppRouter importa
  // 5 features, e compor rotas é o trabalho dele.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*', '**/features/**'],
              message:
                'shared/ não importa de feature: a dependência aponta só para baixo (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  },
  // D-35: `src/app/**` era o único lado do seam `shared/ui` sem o ban de
  // PrimeReact. O bloco por feature (`:434`) cobre `src/features/**` e o de
  // cima cobre `src/shared/**`; a camada do shell ficava de fora, com 28
  // arquivos só em `app/pages/Dashboard/`.
  //
  // UM grupo só, de propósito: `app/` importa CINCO features pelo AppRouter, e
  // compor rota é o trabalho desta camada — o ban de feature→feature não vem
  // junto (o comentário do bloco de shared já registra a exceção).
  //
  // Sem colisão de merge raso: os dois blocos que casam `src/app/**` hoje
  // declaram `max-lines` e `no-restricted-syntax`, não `no-restricted-imports`.
  // O glob é `{ts,tsx}` e não só `.tsx` porque um `.ts` de `app/` importa
  // componente igual, e o ban de fronteira é barato.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primereact', 'primereact/*'],
              message:
                'app/ não importa PrimeReact direto: use o wrapper de @shared/ui (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  },
  // BD-3 §4 (modo leitura) também vale em `shared/ui`: `FormField`/`NestedField`
  // moram lá, e um wrapper que reintroduzisse `disabled={readOnly}` por dentro
  // escaparia dos blocos de `src/features/**` acima. Bloco isolado porque
  // nenhum outro bloco deste arquivo casa `no-restricted-syntax` em
  // `src/shared/**` — sem risco do merge raso (Q-2) aqui: só este bloco
  // declara a regra para este glob.
  //
  // `COR_HARDCODED` entra aqui também, e **nasce verde**: `src/shared` tem hoje
  // zero classe de paleta, medido. Ficar de fora era o buraco mais caro da
  // catraca (review do BD-3, Q-4) — `shared/ui` é justamente a camada onde a cor
  // DEVE vir do tema e onde um wrapper novo alcança todas as telas de uma vez.
  //
  // `src/app/**` ficou fora desta regra até 2026-08-15 por exceção aprovada pelo
  // João em 2026-07-26 ("Fora: o shell", backlog.md): o shell tinha 3 classes de
  // paleta vivas e pôr a regra sem convertê-las só produziria um `ignores` do
  // tamanho da pasta. A exceção acabou — o bloco logo abaixo liga a regra lá, e
  // os 3 sítios foram convertidos para `--shell-ink`/`--shell-ink-muted`.
  {
    files: ['src/shared/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, DISABLED_READONLY, DISABLED_READONLY_ESTATICO, COR_HARDCODED, ...COR_LITERAL_EM_STYLE],
    },
  },
  // A catraca de cor entra em `src/app/**` (D11 de
  // `dashboard-frontend-central-controle`). Era a P-34: a regra já rodava em
  // `src/features/*/components/**`, `src/features/**` e `src/shared/**`, e o
  // shell era a ÚNICA camada sem ela. O que mudou é que o Dashboard escreve 8
  // arquivos novos em `src/app/pages/Dashboard/`, que nasceriam sem guarda de
  // cor numa camada inteira sem guarda nenhuma.
  //
  // Nasce SEM `ignores`: os 3 sítios do shell (Sidebar.tsx:60/71,
  // SidebarItem.tsx:24) foram convertidos na mesma task. A população foi medida
  // com o PRÓPRIO seletor — `npx eslint 'src/app/**/*.tsx' --rule '{...}'`
  // acusava exatamente 3 e passa a acusar 0 —, não com o grep que originou o
  // débito (frontend-fsliced.md: grep acha a grafia, o seletor acha o defeito).
  //
  // Não é o array inteiro: `DISABLED_READONLY` é sobre campo de formulário e o
  // shell não tem nenhum — regra que nasce sem população não guarda nada. Os 3
  // bans de query também não entram: `app/` é justamente onde a composição
  // cruzada é legítima (o AppRouter importa 5 features).
  //
  // `DROPDOWN_SEM_NOME` e `GRAFIA_LITERAL` entram aqui porque a população delas
  // é MISTA, e a do shell é a maior: as 4 cópias de grafia tipográfica estavam
  // todas em `src/app/**` (`AgendaPanel`, `KpiRow`, `Sidebar`), e a catraca de
  // dropdown nasceu medindo só `src/features/**` — provado com sonda no review
  // de 2026-08-29 (Q-2), apagando o `aria-label` do `PeriodFilter` do Dashboard:
  // o lint ficou VERDE. Catraca que mede uma camada só nasce com a exceção
  // embutida do tamanho da outra camada.
  //
  // Bloco próprio, sem risco do merge raso (Q-2, 2026-08-04): nenhum outro bloco
  // deste arquivo casa `no-restricted-syntax` em `src/app/**`.
  {
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...LISTA_SEM_SEMANTICA, COR_HARDCODED, ...COR_LITERAL_EM_STYLE, ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, DROPDOWN_SEM_NOME, BOTAO_SEM_PAPEL, ...GRAFIA_LITERAL, ...MONO_LITERAL],
    },
  },
])
