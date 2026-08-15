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
      'no-restricted-syntax': ['error', ...REGRAS_COMPONENTE_FEATURE, COR_HARDCODED, DISABLED_READONLY, DISABLED_READONLY_ESTATICO],
    },
  },
  // A catraca de cor (D7): mesmo array do bloco acima, sem `COR_HARDCODED` —
  // é o único ponto onde a cor segue hardcoded de propósito. `files: CATRACA_COR`
  // aqui e `ignores: CATRACA_COR` acima particionam o mesmo glob; nenhum
  // arquivo casa os dois blocos.
  {
    files: CATRACA_COR,
    rules: {
      'no-restricted-syntax': ['error', ...REGRAS_COMPONENTE_FEATURE, DISABLED_READONLY, DISABLED_READONLY_ESTATICO],
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
      'no-restricted-syntax': ['error', FORMDATA_FORA_DO_HELPER, COR_HARDCODED, DISABLED_READONLY, DISABLED_READONLY_ESTATICO],
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
  // `src/app/**` segue sem a regra de propósito, e isso NÃO é esquecimento: o
  // shell (`Sidebar`/`AppLayout`/`AppHeader`) é exceção aprovada pelo João em
  // 2026-07-26 e registrada no `backlog.md` ("Fora: o shell"), com 3 classes de
  // paleta vivas lá. Pôr a regra sem converter o shell só produziria `ignores`
  // do tamanho da pasta inteira.
  {
    files: ['src/shared/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', DISABLED_READONLY, DISABLED_READONLY_ESTATICO, COR_HARDCODED],
    },
  },
])
