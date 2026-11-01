# 45 — Revisão

## Em aberto

- **Q-1** (Crítico, CONFIRMED) — a catraca `a última versão da tabela é a que está em version.txt`
  reprova toda PR de release a partir da primeira. Falta: aprovação do João para a correção
  (ancorar no que não muda: o SHA de origem da última linha da tabela igual ao `bootstrap-sha` do
  `release-please-config.json`).
- **Q-2** (Importante, CONFIRMED) — a versão exata de produção fica visível a anônimo no login e no
  bundle. Falta: decisão do João — tirar `APP_VERSION` do `LoginPage` (só a sidebar autenticada
  mostra), ou registrar que expor a versão ao anônimo no front é aceito.

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
