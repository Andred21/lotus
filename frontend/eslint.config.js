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
        // Componente também não monta multipart. Mora AQUI, e não num bloco
        // `src/features/**` próprio, porque flat config faz merge raso de
        // `rules`: dois blocos que casam o mesmo arquivo e declaram
        // `no-restricted-syntax` não concatenam os seletores — o último apaga o
        // primeiro inteiro. Um bloco genérico apagaria os dois seletores acima
        // em todo componente, em silêncio, que é o bug do review de 2026-08-04
        // (Q-2, fronteiras 1 e 2 do `no-restricted-imports`). O bloco abaixo
        // cobre o resto da feature e exclui `components/` por `ignores`, então
        // os dois nunca se sobrepõem.
        FORMDATA_FORA_DO_HELPER,
      ],
    },
  },
  // O resto da feature: `api/`, `hooks/`, `pages/` — onde os 6 pontos adotantes
  // do `postMultipart` de fato vivem.
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: [
      // Coberto pelo bloco acima, com os 3 seletores juntos.
      'src/features/*/components/**/*.{ts,tsx}',
      // Catraca de um: `useRedatorForm` monta array (`course_ids[]`) e chave
      // polimórfica (`documents[type]`) e entrega o FormData pronto para uma
      // mutation de CRUD alheia. Cobri-lo exigiria um serializador genérico de
      // payload — forma de domínio vazando para o transporte (spec D11 do bloco
      // `hardening-guardrails-e-transportes`). Exceção declarada, não esquecida.
      'src/features/identity/hooks/useRedatorForm.ts',
    ],
    rules: {
      'no-restricted-syntax': ['error', FORMDATA_FORA_DO_HELPER],
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
])
