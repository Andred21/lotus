# 45 — Revisão

## Em aberto

## Rodada 2 — `5fba081d..9e4cac3b` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

A lente Codex foi tentada de novo e não rodou, pelo mesmo motivo da rodada 1 (`gpt-5.5`
recusado pela conta ChatGPT, `model_not_found`).

Os achados da rodada 1 aprovados pelo João foram corrigidos e conferidos pelo `revisor-bloco`:

- Q-1 (Crítico) corrigido em `65cc5d20`. Num clone com a PR de release `1.10.0` simulada
  (`version.txt`, manifest, `package.json`, `config/app.php` e seção nova no `CHANGELOG.md`), os
  testes do projeto `repo` deram 59/59 verdes.
- Q-5 (Menor) corrigido em `65cc5d20`. Numa árvore montada com o filtro do
  `espelhar-corporativo.sh`, os 5 testes que atravessam para o espelho deram 77/77 verdes.
- Q-2 (Importante) corrigido em `9e4cac3b`: o login deixou de exibir a versão; o que sobrou é o
  Q-6 abaixo.
- Q-3 e Q-4 (PLAUSIBLE) seguem como observação, sem fato novo.

Suíte do frontend 203 arquivos / 1490 testes verdes; `tsc -b` e eslint limpos nos tocados. O
backend não foi reexecutado nesta rodada (container parado; o diff da rodada não toca o backend).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-6 | Menor | A versão de produção continua no bundle que o `/login` baixa: `AppLayout` → `Sidebar` → `APP_VERSION` entra por import estático, sem code-splitting, e o `define` grava a versão literal no chunk. A correção do Q-2 fechou a exposição visível, não a leitura do JS | CONFIRMED | `frontend/src/app/router/AppRouter.tsx:6` · `frontend/src/app/layouts/Sidebar/Sidebar.tsx:5`, `:71` · `frontend/vite.config.ts:55` | registrado, não bloqueia — fechar de vez pede a sidebar ler `GET /api/versao` e emenda à spec §4.1 |
| Q-7 | Menor | A catraca de existência de `INERTES_POR_CONVENCAO` dispensa também na origem as 6 entradas que o `.espelho-exclusoes` lista; uma delas sair do índice na origem passa verde | CONFIRMED | `frontend/tests/release-please.test.ts:164-168` · `.espelho-exclusoes:18-23` | registrado, não bloqueia — dispensar só quando a árvore for o espelho |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

## Rodada 1 — `5fba081d..3823d35c` — 2026-11-01 · Lente 1: opus · Lente 2: sonnet

Classificação: alto risco (`generated.ts`, rota nova em Identity, `LICENSE`, workflows com
permissão de escrita). A lente Codex somente-leitura foi tentada e não rodou: a conta ChatGPT do
Codex recusou `gpt-5.5` e `gpt-5.4` (`model_not_found`). A rodada fica só com o `revisor-bloco`.

O `revisor-bloco` conferiu, além do diff: `backfill-releases.sh --simular` reproduz o
`CHANGELOG.md` commitado byte a byte; 111/111 testes dos 7 arquivos do bloco verdes; `tsc -b` e
eslint limpos nos tocados; md5 do `generated.ts` bate com o manifest (lei 3).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Crítico | A catraca prende a última versão da tabela fixa (`1.9.1`) ao `version.txt`, que a PR de release reescreve; o CI roda `pnpm test` na PR (aberta com PAT) e o teste está fora só do espelho, então toda PR de release nasce vermelha | CONFIRMED | `frontend/tests/backfill-releases.test.ts:207-210` · `scripts/backfill-releases.tsv:17` · `release-please-config.json:3` · `.espelho-exclusoes:32` | aguarda aprovação do João |
| Q-2 | Importante | `APP_VERSION` passou de literal morto a versão real e é renderizado no `LoginPage` (rota pública) e no bundle; a spec pôs a versão do backend atrás de sessão e não decidiu o consumo no login | CONFIRMED | `frontend/src/shared/config/brand.ts:9` · `frontend/src/features/identity/components/Login/LoginPage.tsx:51` · `spec.md:62-64`, `:175`, `:244` | aguarda decisão do João |
| Q-3 | Menor | O `timeout-minutes: 2` do passo de release não entra na soma do orçamento da catraca (840+90+120 = 1050 s, 87,5% de 1200 s) | PLAUSIBLE | `frontend/tests/workflow-deploy.test.ts:156-157` · `.github/workflows/deploy.yml:36`, `:246` | observação — estourar exige mais de 150 s de overhead que o repositório não mostra |
| Q-4 | Menor | "Rollback nunca cria release" não vale para SHA espelhado e nunca promovido: o 404 da tag leva o script a criar tag e Release | PLAUSIBLE | `.github/scripts/publicar-release.sh:93-111` · `CONTRIBUINDO.md:274-276` | observação — depende de as tags do release-please não chegarem ao repositório de produção |
| Q-5 | Menor | Andaime da execução paralela ficou na catraca: o comentário e a injeção forçada de `INERTES_POR_CONVENCAO` escondem entrada morta da lista | CONFIRMED | `frontend/tests/release-please.test.ts:36`, `:82-83` | registrado, não bloqueia |

Placar: Crítico: 1 confirmado, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 2 plausíveis, 0 refutados
