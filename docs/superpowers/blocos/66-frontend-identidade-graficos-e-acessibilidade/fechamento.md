# Fechamento do bloco 66 — quadro por ID

Uma linha por ID da auditoria que o bloco fecha (os 27 do cabeçalho do plano), uma por pendência
herdada (spec §1), o "Quadro dos 46" e os critérios 1, 3 e 4 da §7 da spec do 64. Prova = teste
(arquivo › nome), captura (caminho em `visual/`) ou "veredito do João". Caminhos de teste relativos a
`frontend/`, exceto os de `backend/`.

**Passada visual — 2026-11-27, Task 10, na lane** (offset +1, Vite :5174, HEAD `11bfe3ed`). Rodou
com o Playwright CLI direto, sem a `lotus-ui-review` canônica, que exige uma tela por run e login
manual. É o mesmo arranjo do fechamento do 65. Login com o usuário de dev da lane; nenhuma escrita
além do `POST /api/login`; console sem erro nem aviso. Telas: login, Dashboard, Certificados
(Emisión, alunos da turma, Historial), Operación (lista e documentos da turma), Personas,
Administración › Configuración e o shell com sidebar expandida e colapsada. Viewports 1440×900,
1280×800, 1024×768 e 390×844; claro e escuro; en e es-CL. A varredura completa ficou em
`.artifacts/ui-review/20261127-bloco66/` (ignorada); aqui só as capturas que provam veredito.

## Os 27 IDs

| ID | O quê | Prova |
|---|---|---|
| B-1 | Folio contido no Historial | `src/features/certification/components/Historial/HistorialTable.folio.test.tsx` › "o peso do folio comporta LOT-AAAA-NNNNN a 1024", "não quebra: a célula do folio é nowrap"; `src/shared/ui/AppDataTable/columnWidth.test.ts` › "COL.folio pesa mais que COL.code: …"; captura `visual/B-1-historial-folio-1024-claro.png`. **Pendente de veredito do João** (achado 2 abaixo): o folio cabe a 1024, mas o aluno encolhe a uma letra e a Cotización encosta na data |
| B-11 | Barra de progresso de documentos legível | `src/features/operation/components/Document/TurmaDocuments.test.tsx` › "barra de progresso usa os tokens medidos"; captura `visual/B-10-B-11-documentos-turma-1440-escuro.png` |
| B-7 | Check como ícone e folio sem quebra | `src/features/certification/components/Emission/EmissionStudentsTable.test.tsx` › "check é ícone, não glifo, e o folio não quebra"; `src/features/certification/components/Emission/BatchIssueDialog.test.tsx` › "o folio emitido leva ícone check (não o glifo ✓) e não quebra"; captura `visual/B-2-B-7-emision-avatar-neutro-e-folio-1440-claro.png` |
| D-2 | Meses zerados no painel | `backend/tests/Feature/Dashboard/AnalyticsQueryTest.php` › `test_mes_sem_registro_no_meio_da_janela_vem_zero`, `test_meses_vazios_nas_pontas_vem_zero`, `test_janela_parcial_15_mar_a_10_jun_tem_quatro_meses`, `test_janela_que_cruza_o_ano_e_continua` (Review Focus 1), `test_janela_que_comeca_no_dia_31_nao_pula_fevereiro`, `test_uf_vazia_vem_0_0000`, `test_serie_sem_permissao_continua_null` |
| D-3 | Ranking com teto e altura própria | `src/app/pages/Dashboard/admin/RankingsPanel.test.tsx` › "ranking mostra no máximo 10 barras da métrica escolhida", "empate na décima posição desempata por nome e o top 10 não depende da ordem de entrada" (Review Focus 2); `src/shared/ui/AppBarChart/AppBarChart.test.tsx` › "a altura cresce com o número de barras, com piso de 120px" |
| D-4 | Séries distinguíveis sem cor; turmas fora do eixo das matrículas | `src/shared/ui/AppLineChart/AppLineChart.test.tsx` › "cada série tem traço próprio, no gráfico e na legenda"; `src/shared/ui/AppLineChart/legend.test.tsx` › "o marcador repete o traço da série"; `src/app/pages/Dashboard/admin/SeriesPanel.test.tsx` › "Clases e Alumnos são cards separados, com duas séries cada, mais o de UF"; captura `visual/D-4-series-1440-escuro.png` |
| D-5 | UF por idioma | `src/shared/lib/uf.test.ts` › "es-CL agrupa milhar com ponto e decimal com vírgula", "en usa vírgula e ponto", "zeros à direita somem", "valor negativo mantém o sinal" (Review Focus 3), "valor do campo: sem agrupar milhar, …"; `src/features/commercial/hooks/useQuoteForm.test.tsx` › "valor de milhar não vira decimal: campo e payload ficam \"1234\"" |
| D-7 | KPI zerado sem alarme | `src/app/pages/Dashboard/admin/kpiCards.test.ts` › "KPI em 0 não pinta severidade"; captura `visual/B-5-D-7-B-12-dashboard-1440-claro.png` ("Classes ending soon 0" com trilho neutro) |
| D-8 | Gráfico com tabela acessível, sem `role="img"` | `src/shared/ui/AppBarChart/AppBarChart.test.tsx` › "wrapper não tem role img: o nome e os dados vêm da tabela", "expõe tabela acessível com as mesmas barras, …", "o desenho aria-hidden não tem elemento focável nem role application"; `src/shared/ui/AppLineChart/AppLineChart.test.tsx` › "wrapper não tem role img", "expõe tabela acessível com os dados das séries" |
| A-3 | Foco ao reordenar módulos | `src/features/catalog/components/Course/ModuleFields.test.tsx` › "mover para baixo mantém o foco no módulo movido", "dois Enter seguidos movem duas vezes o mesmo módulo", "curso com um módulo só tem as setas desabilitadas, e remover o último devolve o foco ao botão de adicionar" (Review Focus 4), "remover o módulo do último índice, com outros sobrando, …" |
| A-4 | Estado dos toggles e menus | `src/shared/ui/AppearanceControls/AppearanceControls.test.tsx` › "toggle de tema expõe aria-pressed"; `src/app/layouts/Sidebar/Sidebar.test.tsx` › "sidebar expõe aria-expanded"; `src/shared/ui/ArchiveSwitch/ArchiveSwitch.test.tsx` › "switch de arquivados expõe aria-pressed"; `src/app/layouts/Header/UserMenu.test.tsx` e `src/shared/ui/RowActions/RowActions.test.tsx` › "gatilhos de menu expõem aria-expanded"; `src/shared/ui/LanguageMenu/LanguageMenu.test.tsx` › "nome acessível do idioma contém o rótulo visível" |
| A-5 | Busca nomeada e contagem anunciada | `src/shared/ui/SearchableTableFrame/SearchableTableFrame.test.tsx` › "busca tem nome acessível"; `src/shared/ui/AppDataTable/AppDataTable.test.tsx` › "contagem é anunciada", "o \"carregando\" também entra na região viva" |
| A-6 | Rolagem da tabela pelo teclado | `src/shared/ui/AppDataTable/AppDataTable.test.tsx` › "rolagem da tabela alcançável por teclado" |
| A-7 | Nível do título de card | `src/shared/ui/AppCard/AppCard.test.tsx` › "card header é h2 por padrão", "level={3} troca o nivel sem trocar o visual"; `src/app/pages/Dashboard/admin/RedatorLoadPanel.test.tsx` › "o título do card é h2 ou h3 conforme o nível pedido pela página". **Pendente de veredito do João** (achado 4): o `EvaluacionesCard` fica `h2` depois do `h3` "Documentos" da aba |
| A-9 | Rótulos aria do Prime traduzidos | `src/shared/config/primeLocale.test.ts` › "Prime traduz os rótulos aria em es e pt", "o locale do Prime segue o idioma da interface", "registrar de novo não empilha listener: …", "en é registrado explícito, …", "nenhuma chave de es ou pt fica vazia"; `src/shared/ui/AppToast/AppToast.test.tsx` › "o botão de fechar usa common.close traduzido, não o inglês do Prime" |
| A-12 | Item ativo do subnav além do tinte | `src/shared/ui/AppSubNav/AppSubNav.test.tsx` › "subnav ativo tem indicador além do tinte"; captura `visual/A-12-subnav-ativo-1440-escuro.png` (contraste do `--brand-ink`: 5,88:1 claro, 5,28:1 escuro) |
| A-8 | Links do painel com cara de link | `src/app/pages/Dashboard/admin/CompliancePanel.test.tsx` e `src/app/pages/Dashboard/admin/RedatorLoadPanel.test.tsx` › "link do painel tem aparência de link". O relator segue para `/personas` sem `?q=`: a spec do 64 (§6, fase 7) condiciona o `?q=` a a listagem aceitar busca na URL, e ela filtra em memória |
| B-2 | Celeste raro (D7) | `src/shared/ui/AppAvatar/AppAvatar.test.tsx` › "avatar de iniciais é neutro: fundo --surface-200, tinta --text-color, peso 600"; `src/shared/ui/IdentityCell/IdentityCell.test.tsx` › "o avatar da célula tem 40px"; `src/shared/ui/RowActions/RowActions.test.tsx` › "ação comum de linha não usa celeste: é `text plain`, sem severity", "o gatilho do menu colapsado também é `text plain`"; `src/shared/ui/ArchiveSwitch/ArchiveSwitch.test.tsx` › "switch selecionado é secondary outlined, e o outro é text plain"; captura `visual/B-2-B-7-emision-avatar-neutro-e-folio-1440-claro.png`. **Veredito do João (2026-11-27):** quer os ícones de ação de linha de volta ao celeste; adiado para bloco futuro ou revisão (achado 5) |
| B-5 | Controles do header fixos nos dois temas (D4) | `src/shared/ui/AppButton/AppButton.test.tsx` › "variante shell não tem classe dark:"; `src/shared/ui/AppearanceControls/AppearanceControls.test.tsx` › "controles do header usam shell: toggle de tema sem classe dark:"; `src/shared/ui/LanguageMenu/LanguageMenu.test.tsx` › "controles do header usam shell: …"; capturas `visual/B-5-D-7-B-12-dashboard-1440-claro.png` e `visual/B-5-header-shell-1440-escuro.png`. No login o par sai com `surface="page"` e volta à aparência da `main` (achado 1, corrigido em `b6ee8dc0`): `src/features/identity/components/Login/LoginPage.test.tsx` e `src/shared/ui/AppearanceControls/AppearanceControls.test.tsx`; medido no Chromium, `#186b94` sobre branco, 5,88:1 |
| B-3 / A-11 | Movimento reduzido | `tests/reduced-motion.test.ts` › "index.css desliga animação sob movimento reduzido"; a sidebar anima só `width` e desliga com `motion-reduce:transition-none` (`src/app/layouts/Sidebar/Sidebar.tsx:34`) |
| B-4 | Rail com rótulo curto a 12px (D3) | `src/app/layouts/Sidebar/SidebarItem.test.tsx` › "colapsado usa rótulo curto a 12px sem truncate", "rótulos curtos cabem (%s)" (Review Focus 5), "expandido mostra o rótulo integral, não o curto"; captura `visual/B-4-rail-rotulos-curtos-1440-es.png` (es-CL: os 7 itens medem 69/69 px, sem estouro; "Certificados" vira "Certific."). **Pendente de veredito do João** sobre os textos curtos (achado 6) |
| D-10 | Logo com dimensões; assets sem uso | `src/shared/ui/AppLogo/AppLogo.test.tsx` › "a variante %s declara %sx%s"; `tests/logo-dimensoes.test.ts` › LogoLight, LogoDark, LogoGlyph (cabeçalho do PNG); `tests/jsx-ratchets.test.ts` › "cada call site tem uma classe h-* no className"; `tests/unused-assets.test.ts` › "cada arquivo de src/assets é referenciado em src", "cada arquivo de public é referenciado no index.html ou em src". Medido no Chromium: logo do login 208×289 a 1440 e 150×209 a 390, razão igual à do arquivo |
| B-6 | Busca cabe a 390 | `src/shared/ui/SearchableTableFrame/SearchableTableFrame.test.tsx` › "nenhum ancestral do campo impõe min-w-64 sem o prefixo sm:"; captura `visual/B-6-busca-390-claro.png` (campo de 113 a 357 px, sem rolagem horizontal) |
| B-9 | Viewport dinâmica no shell | `h-dvh` em `AppLayout`/`AppSidebar` e `min-height: 100dvh` (com 100vh de fallback) em `src/index.css:64-65`; captura `visual/B-9-B-12-dashboard-390-claro.png`. Medido a 390×844: `scrollHeight` do documento = 844, igual à janela; a rolagem é só do `main`. O caso iOS real (barra do Safari) não foi reproduzido: o Chromium não tem a barra retrátil |
| B-10 | Botão só-ícone sem pílula | `src/shared/ui/AppFileActions/AppFileActions.test.tsx` › "visualizar, baixar e excluir saem com o raio do tema"; `src/shared/ui/AppFileUpload/AppFileUpload.test.tsx` › "sem rótulo, o disparador nasce com o ícone de enviar e a classe de texto, sem pílula"; `tests/jsx-ratchets.test.ts` › "nenhum AppButton de feature ou app passa a prop `rounded`"; captura `visual/B-10-B-11-documentos-turma-1440-escuro.png` |
| B-12 | Cabeçalho de página e rótulos de KPI | `src/shared/ui/PageHeader/PageHeader.test.tsx` › "o h1 do PageHeader tem mb-1 e a descrição não soma margem de cima"; `src/app/pages/Dashboard/KpiRow.test.tsx` › "o rótulo balanceia as linhas e hifeniza", "abaixo de sm o valor fica em linha própria: …"; capturas `visual/B-5-D-7-B-12-dashboard-1440-claro.png` e `visual/B-9-B-12-dashboard-390-claro.png` |

## Pendências herdadas (spec §1)

| Pendência | Prova |
|---|---|
| Irmãs da tinta suave (D15) | `tests/brand-theme.test.ts` › "$comp $sev compõe o fundo do matiz a 15% e a tinta do tom ($tema)", "a tinta é o degrau do --tone-<sev>-ink do tema (%s)", "message e toast ficam fora do D15 (%s)", "lista mista (tag de severidade com outro seletor) falha alto, nomeando o seletor" |
| T8 do 64 = item 1 da P-120 (`retryFor` no Historial) | `src/features/certification/hooks/useHistorial.test.tsx` › "403 no certificado aberto e no painel de reemissão não oferece Reintentar", "500 no certificado aberto e no painel de reemissão oferece Reintentar" |
| M-2 do 64: D8 no DESIGN.md | `DESIGN.md:245-248` (tetos `sm`/`md`/`lg` e o `ConfirmDialog` a 28rem), conferidos contra `AppDialog/style.ts` e `ConfirmDialog.tsx` na revisão da Task 9 |
| Item 2 da P-120: `errorElement` nas rotas-layout (D16) | `src/app/router/AppRouter.test.tsx` › "erro de render na rota-layout cai no RouteError, sem stack (%s)" |

Com os itens 1 e 2, a **P-120 fecha inteira** (Tasks 3 e 7).

## Quadro dos 46

Os 45 itens da auditoria contam 46 IDs (B-3 e A-11 dividem a linha). Cada ID aponta para o
`fechamento.md` do bloco que o fechou.

| Bloco | IDs | Onde |
|---|---|---|
| 64 | C-12, C-10 | `docs/superpowers/blocos/64-frontend-revisao-ui-ux-e-icones/fechamento.md` |
| 65 | C-1, D-1, D-9, C-2, A-10, C-7, C-8, C-9, C-5, C-4, C-6, A-2, C-3, C-11, A-1, B-8 | `docs/superpowers/blocos/65-frontend-navegacao-sessao-e-formularios/fechamento.md` |
| 66 | B-1, B-11, B-7, D-2, D-3, D-4, D-5, D-7, D-8, A-3, A-4, A-5, A-6, A-7, A-9, A-12, A-8, B-2, B-5, B-3, A-11, B-4, D-10, B-6, B-9, B-10, B-12 | este arquivo |
| 67 | D-6 | `docs/superpowers/blocos/67-frontend-divisao-do-chunk-ui/fechamento.md` (o 64 o deixou aberto e o 65 o passou ao 67, D13) |

2 + 16 + 27 + 1 = 46.

## Critério de aceite (itens 1, 3 e 4 da §7 da spec do 64)

- **1 — uma linha por ID:** o quadro acima e os dos blocos 64, 65 e 67. Quatro linhas deste bloco
  esperam veredito do João (B-1, A-7, B-4 e o adiamento do B-2), listadas abaixo.
- **3 — gate verde:** ver a seção "Gate final".
- **4 — DESIGN.md com D1–D5, D7, D8 e ícones:** D1 `DESIGN.md:169` (`cinza-traco`, borda de controle
  3:1 nos dois temas); D2 `:324` (asterisco do obrigatório); D3 `:338-342` (rail com rótulo curto
  de 12px); D4 `:187-190` (Fixed Dial Rule com a variante `shell`); D5 `:305` (tag 12px/600); D7
  `:297-299` (ação de linha e filtro, celeste raro) e `:361` (avatar neutro de 40px); D8 `:245-248`
  (tetos de diálogo); ícones `:349` (seção "Ícones").

## Gate final

Contra o HEAD `11bfe3ed` mais este `fechamento.md` e as capturas, 2026-11-27, na lane:
`pnpm lint` exit 0; `pnpm test` exit 0 (316 arquivos, 2585 testes); `pnpm build` exit 0 (só o aviso
de chunk acima de 500 kB, anterior ao bloco); `docker compose exec -T app php artisan test` exit 0
(2110 passados, 7 pulados).

Depois da leva da revisão final da branch (`b6ee8dc0`, só frontend e docs): `pnpm lint` exit 0;
`pnpm test` exit 0 (316 arquivos, 2589 testes); `pnpm build` exit 0. O backend não mudou desde a
rodada acima.

Depois das correções da revisão do bloco (`697723ce` e `df8e6cad`), no HEAD `25d847c1`, refeito contra
a `origin/main` sem novidade, 2026-11-27: `pnpm lint` exit 0; `pnpm test` exit 0 (316 arquivos, 2611
testes); `pnpm build` exit 0; `php artisan test` exit 0 (2112 passados, 7 pulados, 14789
asserções); Pint passou nos sete arquivos PHP do bloco; `typescript:transform` sem diff; `.claude/tests/run-all.sh`
com 18 arquivos sem falha.

## Carga (Task 9)

`gzip -c` dos `.js` que o `dist/index.html` carrega (entrada mais `modulepreload`), no método do
fechamento do 67: `total_gz_bytes=268698`, ou seja, **268,70 kB** contra 267,85 kB do 67 (+0,85 kB) e
abaixo do teto de 300 kB.

## Achados da passada e da execução, para o João (uma rodada)

1. **Login no tema claro: idioma e tema quase invisíveis — corrigido.** O par usava a variante
   `shell` (tinta `--shell-ink` para o navy do header) sobre o `--surface-card` branco do login,
   ~1,5:1. Captura do defeito: `visual/achado-login-controles-1440-claro.png`. Origem: Task 1 (B-5).
   A revisão final o classificou como regressão da branch, e a leva `b6ee8dc0` devolveu ao login a
   aparência da `main` (`surface="page"`: `iconToggle` no tema, `compact` no idioma). Não é o visual
   novo adiado pelo João (achado 5). Ruling no `rulings.md`.
2. **Historial a 1024 com a sidebar aberta.** O folio cabe (B-1), mas a moldura tem 718px para 8
   colunas em `table-fixed`: o aluno cai a 89px e mostra uma letra, e "Scap 5 - R1" (51px) encosta
   na data. Cotización e datas têm a mesma largura da `main`; o aluno estreitou nesta lane para o
   folio caber. Captura `visual/B-1-historial-folio-1024-claro.png`.
3. **Operación a 1280: colunas sobrepostas** (Código×Curso, Estudiantes×Estado). Anterior ao bloco:
   nem `COL.code` nem as colunas de turma mudaram nesta lane. Captura
   `visual/achado-operacion-colunas-1280-claro.png`. Os achados 2 e 3 são a mesma classe: tabela
   `table-fixed` sem largura mínima não rola na horizontal quando a moldura aperta.
4. **Hierarquia da aba Documentos da turma:** o `EvaluacionesCard` ficou `h2` (regra do plano: `h3`
   só sob `h2`), depois do `h3` "Documentos" e dos `h4` dos cards de tipo, que já pulavam do `h1`.
5. **Cor dos ícones de linha e controles do header** (pedido do João em 2026-11-27): ícones de volta
   ao celeste, controles de layout sem borda, seta no idioma, glifo de sidebar estilo Claude/Linear.
   Adiado pelo João para bloco futuro ou revisão; o patch está fora da árvore.
6. **Textos curtos do rail** (`nav.short.*`, deixados ao executor): em es-CL, Dashboard, Comercial,
   Operación, Cursos, Certific., Personas, Admin.
7. **`locale()` global do PrimeReact** (ruling da Task 7): passou a seguir o `i18n.language`,
   revertendo a recusa registrada no `AppDataTable`. Sem ele, os rótulos `aria` do Prime ficariam
   em inglês.
8. **Reintentar em 403 nas listas do Historial:** `reload`/`reloadQuotes` (`useHistorial.ts:126,131`)
   seguem sem `retryFor`. Mesma classe do T8, fora do escopo do brief.
9. **Digitar "1.500" no campo de UF grava 1,5 UF** (revisão final, M-11) — **corrigido em `df8e6cad`**
   (decisão do João, revisão do bloco, Q-2). O `parseUfInput` lê o último separador como decimal, e a
   tela passou a exibir "1.500 UF" em es-CL (em `en`, "1,500 UF"), então quem copiava a grafia exibida
   gravava mil vezes menos. O campo agora recusa a entrada ambígua (`quote.ufAmbiguous`), em vez de
   gravar. Resta o Q-3 da rodada 2 (digitar `1.500.000` tecla a tecla grava `1500.000`) e o Q-4 (a
   mensagem não mostra a saída de três casas), os dois na **P-121**.
10. **Janela do painel sem teto** (revisão final, M-6) — **corrigido em `697723ce`** (decisão do João,
    revisão do bloco, Q-1). Depois do D-2, `period_end=9999-12-31` não terminava (o cursor de mês
    comparava texto) e a janela não tinha teto. O laço compara datas, e acima de 120 meses a resposta
    é 422 em `period_end`. Provado contra a API real no fechamento: 200 em 12 meses, 422 para
    `9999-12-31`, para 21 anos e para janela invertida.
11. **Contador do ranking mostra o número depois do corte** (revisão final, M-9): diz "10" quando há
    30 linhas. Decidir se o badge conta o total ou o exibido.
12. **Menores de acessibilidade em toda tabela** (revisão final, M-7 e M-8): a moldura rolável é
    focável mesmo sem rolagem horizontal, a região viva anuncia "Cargando…" a cada busca, e a barra
    de documentos escolhe degrau de verde por `dark:` em vez de `--tone-success-ink`. Ficha.
