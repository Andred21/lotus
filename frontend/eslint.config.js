import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
])
