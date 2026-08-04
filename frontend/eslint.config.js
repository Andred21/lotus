import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// As features do frontend. `certification` entra na lista mesmo sendo scaffold:
// ele será escrito na Sprint 4 e é quem mais ganha em nascer sob a regra.
const FEATURES = ['catalog', 'certification', 'commercial', 'identity', 'operation']

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
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // `coursesApi.useList()`, `rolesApi.useList()`, e qualquer `xxxApi.useAlgo()`.
          selector: "CallExpression[callee.object.name=/Api$/][callee.property.name=/^use[A-Z]/]",
          message:
            'Query de recurso não vive em componente de feature: mova para um hook em features/<x>/hooks/ e consuma o resultado derivado (frontend-fsliced.md).',
        },
        {
          // `useQuery`/`useMutation` diretos. O `$` é o que impede casar
          // `useMutationErrors`, que é consumo de erro e pode ficar no componente.
          selector:
            "CallExpression[callee.name=/^use(Query|Mutation|InfiniteQuery|SuspenseQuery)$/]",
          message:
            'TanStack Query direto não vive em componente de feature: mova para features/<x>/api/ ou hooks/ (frontend-fsliced.md).',
        },
      ],
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
  // Bloco SEPARADO do `no-restricted-syntax` de propósito: os `ignores` da
  // catraca abaixo valem só para esta regra. Compartilhar o bloco reabriria em
  // silêncio a catraca de query-em-componente, que foi zerada em 2026-08-03.
  {
    files: ['src/features/*/components/**/*.{ts,tsx}'],
    // Catraca: os 4 legados de hoje. Lista que só encolhe — componente novo
    // nasce abaixo da régua, e quem passar dela extrai o bloco coeso em vez de
    // entrar aqui. Não acrescente arquivo para calar o lint.
    ignores: [
      'src/features/identity/components/Student/StudentDialog.tsx',
      'src/features/identity/components/Redator/RedatorDialog.tsx',
      'src/features/identity/components/Redator/RedatorDocumentSlot.tsx',
      'src/features/commercial/components/Budget/BudgetDetailPage.tsx',
    ],
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
  // proibindo as outras 4. O padrão `**/features/<outra>/**` cobre o caminho
  // relativo, que hoje não existe (nenhum import em features/ sobe 2+ níveis)
  // mas passaria despercebido pelo padrão de alias sozinho.
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
])
