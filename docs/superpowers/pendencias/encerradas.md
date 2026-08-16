# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## P-34 — a catraca `COR_HARDCODED` não roda em `src/app/**`

**Encerrada em 2026-08-16**, no `/fechar-sprint` do `dashboard-frontend-central-controle`. Sai daqui
no fechamento seguinte, cumprida a sprint de rastro.

Era a última camada do frontend sem a guarda de cor, com 3 classes `text-slate-*` vivas no
`Sidebar/`. O gatilho escrito era "um bloco que tocar o shell por outro motivo e puder converter as
3 classes junto com a entrada da regra" — e foi exatamente o que aconteceu: a **D11** da spec do B1
ampliou o bloco de propósito, porque o Dashboard escrevia 8 arquivos novos em `src/app/`, que
nasceriam sem guarda numa camada inteira sem guarda nenhuma.

**A população foi medida com o próprio seletor, não com o grep que originou o débito** (a regra do
`frontend-fsliced.md`): `npx eslint 'src/app/**/*.tsx' --rule '{…COR_HARDCODED…}'` acusava
exatamente 3 — `Sidebar.tsx:60`, `Sidebar.tsx:71`, `SidebarItem.tsx:24` — e passou a acusar 0. A
conversão **não** pôde usar `--text-color`: a sidebar é navy fixa nos dois temas, e a tinta do tema
claro seria texto escuro sobre navy; entraram `--shell-ink` e `--shell-ink-muted` em
`brand-theme.css` com os valores literais que o Tailwind já rendia, para a entrada da catraca não
mexer um pixel.

**A regra nasceu sem bloco `ignores`**, que era o DoD do BD-11, e em bloco `files` próprio — sem o
merge raso do Q-2 (2026-08-04), porque nenhum outro bloco do `eslint.config.js` casa
`no-restricted-syntax` em `src/app/**`. Só `COR_HARDCODED` entrou: `DISABLED_READONLY` é sobre campo
de formulário e o shell não tem nenhum, e os bans de query não cabem numa camada onde a composição
cruzada é legítima.

**Provada nos dois sentidos no gate de fechamento**, não deduzida: `pnpm lint` exit 0 no HEAD; com
`text-slate-400` injetado em `PipelineFunnel.tsx`, o lint reprova nomeando arquivo e linha
(`17:23`). Sonda revertida, árvore limpa.

**Consequência no backlog:** o **BD-11** fica só com a **D-03** (menu recolhido a 390 tira o rótulo
do DOM e deixa só `title`).
