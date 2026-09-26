# Revisão de UI — Pessoas (`/personas`)

**Data:** 2026-09-20/21 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/identity/components/` (abas Redactores e Alumnos) ·
**Base:** `refactor/frontend-revisao-ui-f3` @ `88af3e4c`
**Evidência bruta:** `.artifacts/ui-review/20260920-204038-personas/` (11 capturas + `report.txt`,
coberta pelo `.gitignore`)

> Run 2 da fatia 3 do item 16 (`frontend-revisao-ui-por-modulo-f3`), Task 4 do plano
> `2026-09-04-frontend-revisao-ui-por-modulo-f3.md`. Papel **superadmin** — `admin@lotus.cl`.
>
> A §2 é o `report.txt` verbatim. A §3 é o que foi feito com ele na Task 5 e **não** faz parte do
> relatório.

## 1. Escopo e limites da run

- Papel: **superadmin** (`admin@lotus.cl`), sessão real criada pela tela de login (única mutação
  permitida pela skill).
- Chromium **empacotado** (`--browser=chromium`), mesma limitação de ambiente já documentada na run
  de Cursos (canal `chrome` indisponível nesta máquina).
- Alvo medido: SPA em `http://localhost:5175` e API em `http://localhost:8082`, portas do offset +2
  desta árvore.
- Read-only: nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo branch
  e mesmo commit (`88af3e4c`) nas duas pontas.
- **Queda de stack durante a run:** Docker (daemon) e o `pnpm dev` desta árvore caíram entre a
  abertura do diálogo de visualização de um redator e a busca na aba Alumnos — mesma classe de
  interrupção já registrada na run de Cursos. Religados os dois (`docker compose up -d`, `pnpm dev`
  em background), sessão do Playwright reaberta com novo login; o commit não mudou no intervalo.
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`.
- Idioma: **es-CL**, setado via `localStorage` (`lotus-lang`).
- Tema: claro nas três larguras; amostra adicional em `1440x900` no **escuro** (Redactores) — sem
  defeito novo, tags e cor de marca seguem o token do tema.
- Tabulação: percorrida na lista de Redactores (busca → Activos → Archivados → Nuevo redactor →
  cabeçalho sortável "Nombre completo" → cabeçalho sortável "Último acceso" → ações da 1ª linha →
  "Ver") e no diálogo (foco preso no `tabindex="-1"` raiz ao abrir via Enter; `Escape` fecha e
  devolve o foco exatamente ao botão "Ver" que abriu). Não repetida na aba Alumnos — mesmo padrão de
  controles, sem sinal de divergência na jornada por mouse.
- **Régua de aba** (`.p-tabview-nav-container .p-tabview-nav`, `[scrollWidth, clientWidth,
  transborda]`): `1440x900` → `[1119, 1119, false]`; `1024x768` → `[718, 718, false]`; `390x844` →
  `[276, 276, false]`. Nenhum transbordo nos três — `scrollable` **não** é acionado nesta run (Task 8
  decide com estes números).
- Fichas conhecidas verificadas contra esta tela: **P-16** (Figma põe `Alumnos` como primeira aba,
  implementado mantém `Redactores`) — confirmado, decisão da Lotus, não vira achado. **P-10** (coluna
  CLIENTE omitida na tabela de alunos) — **não reproduz nesta versão**: a aba Alumnos já expõe a
  coluna "Cliente actual" (`current_client_name`), preenchida em todas as linhas observadas. A ficha
  em `docs/superpowers/pendencias/abertas.md` descreve outro contexto (`EnrollmentData`, tabela de
  matrícula de uma turma), não a lista de Personas — não é a mesma superfície, e por isso também não
  vira achado aqui; divergência de contexto reportada para triagem em `pendencias/`, não corrigida
  nesta run.
- A aba **Alumnos não tem alternador Activos/Archivados** — não é lacuna de cobertura desta run, é
  ausência de funcionalidade na tela (aluno é entidade sem sessão, RN-01; arquivamento não se aplica
  aqui da mesma forma que a redator).
- Estados não testados, por exigirem mock, falha fabricada ou escrita: `loading`, erro de carga
  (`AppErrorState`), lista vazia (busca sem resultado), criação/edição de redator ou aluno (jornada é
  só view), paginação (contagem observada — 7 redactores, 3 alunos na busca "Antonia" — não expôs o
  paginador).
- Chrome DevTools MCP: não necessário — toda a evidência é do Playwright CLI.

## 2. `report.txt` — verbatim

```text
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: /personas (papel superadmin) — abas Redactores e Alumnos, busca em cada uma, alternador Activos/Archivados (só existe em Redactores), abrir um registro em modo view, fechar
Local URL: http://localhost:5175/personas (nginx: http://localhost:8082)
Branch/commit: refactor/frontend-revisao-ui-f3 @ 88af3e4c
Date/time: 2026-09-20 20:40 — 2026-09-21 00:30 (queda de Docker/Vite entre os dois trechos; religados, sessão relogada, commit sem drift)
Agent: Claude Sonnet 5 (Claude Code)
Playwright CLI: @playwright/cli 0.1.18, sessão nomeada lotus-personas, browser chromium (canal "chrome" indisponível no ambiente; fallback documentado)
Chrome DevTools: not-needed
Git working tree before/after: limpo / limpo (mesmo commit 88af3e4c nas duas pontas — nenhuma mutação de código nesta run)

## Coverage
| Journey step | Desktop (1440x900) | Tablet (1024x768) | Mobile (390x844) | Evidence |
|---|---|---|---|---|
| Lista Redactores, claro | OK | Defeito (UI-02, UI-03) | Defeito (UI-01) | screens/01, 08, 10 |
| Lista Alumnos, claro | OK | OK (scroll horizontal, ver Técnico) | OK (colunas secundárias ocultas, esperado) | screens/07, 09 |
| Busca (Redactores "Ana", Alumnos "Antonia") | OK | — | — | screens/02, 05 |
| Archivados (alternador, só Redactores) | OK | — | — | screens/03 |
| Abrir registro em modo view (Redactores e Alumnos) | OK | — | — | screens/04, 06 |
| Lista + view, escuro | OK (amostra 1440x900, Redactores) | — | — | screens/11 |
| Teclado — busca → Activos → Archivados → Nuevo redactor → 2 cabeçalhos sortáveis → ações da linha → Ver | OK | — | — | verificado via eval(document.activeElement) a cada Tab |
| Teclado — abrir/fechar diálogo (Enter/Escape), foco preso e devolvido ao gatilho | OK | — | — | verificado via eval(document.activeElement) |
| Régua de aba (1440/1024/390) | OK (sem transbordo) | OK (sem transbordo) | OK (sem transbordo) | eval no console, registrado em §1 |

## Technical signals
Console: 1 entrada pré-existente no boot da SPA (401 em /api/me antes do login, já registrada na run de Cursos). 1 entrada NOVA atribuível a esta tela — ver UI-04.
Network: sem 4xx/5xx observado nas jornadas percorridas (GETs a /api/redatores, /api/students, /api/courses, /api/me — todos 200).
Performance: não medido (fora do escopo desta run).
Untested states: estado de erro de rede (API fora do ar), lista vazia (busca sem resultado), papéis diferentes de superadmin, criação/edição de redator ou aluno (fora do escopo — jornada é view-only), paginação (contagem observada não expôs o paginador).

## Findings
### UI-01 — coluna de identidade (nome/e-mail) some atrás da coluna de ações fixa em 390x844
Classification: C
Surface/journey: /personas, aba Redactores (severo) e aba Alumnos (leve), lista, tema claro
Viewport: 390x844 (não reproduz em 1440x900 nem 1024x768)
Reproduction: abrir /personas com viewport 390x844; observar a 1ª coluna da tabela em cada aba.
Evidence: screens/10-redactores-390x844-claro.png e screens/debug-crop-redatores-390x844-identidade.png (nome reduzido a 1 letra) e screens/09-alumnos-390x844-claro.png (nome com corte só na cauda); medição via getBoundingClientRect em ambas as abas.
Observed fact: em Redactores, o texto do nome ("Juan Morales") ocupa uma caixa de 93px, mas a coluna de ações fixa (`position: sticky; right: 0`, fundo opaco branco, `z-index: 1`, 3 ícones — Reenviar invitación/Archivar/Ver) começa 8px depois do início do texto — sobram 8px visíveis antes do fundo opaco cobrir o resto, e só a 1ª letra do nome aparece. Em Alumnos, a mesma mecânica (coluna de ações com 1 ícone só, mais estreita) deixa 104px livres antes da sobreposição — o nome "Antonia Aguilera" aparece quase inteiro, só a cauda é coberta.
Inference: `tableWidths()` distribui 100% da largura da tabela entre as colunas de dado por peso (`COL.identity`, `COL.rut`, etc.), sem reservar a largura fixa que `stickyActionsColumn()` pede para a coluna de ações (12rem em Redactores — 3 ícones —, 6rem em Alumnos — 1 ícone). Em viewport estreito, a caixa de ações soterra a fatia final da coluna anterior; quantos ícones a ação tem decide se o dano é cosmético (Alumnos) ou inutiliza a leitura (Redactores).
Impact: em 390x844, a lista de Redactores fica inutilizável para identificar qualquer pessoa pelo nome — só a inicial aparece, sem reticências, sem tooltip visível sem hover (o `title` do span existe só para leitor de tela). É a MESMA classe de defeito do UI-01 da run de Cursos (coluna vizinha pintando o próprio fundo por cima), agora do lado da coluna de ações fixa, não de uma coluna de dado.
Recommendation: em `frontend/src/shared/ui/AppDataTable/columnWidth.ts` (ou onde `tableWidths()`/`stickyActionsColumn()` são compostos), reservar a largura da coluna de ações ANTES de distribuir os pesos das colunas de dado — o total dos pesos deve somar 100% do espaço QUE SOBRA, não 100% da tabela inteira.
Rule/reference: frontend/src/shared/ui/AppDataTable/columnWidth.ts (tableWidths, stickyActionsColumn); frontend/src/features/identity/components/Redator/RedatoresTable.tsx:132 (stickyActionsColumn('12rem')); frontend/src/features/identity/components/Student/StudentsTable.tsx:72 (stickyActionsColumn('6rem'))

### UI-02 — RUT sobrepõe o numeral de "Cursos habilitados" em 1024x768
Classification: C
Surface/journey: /personas, aba Redactores, lista, tema claro
Viewport: 1024x768 (não reproduz em 1440x900 nem 390x844 — a coluna "Cursos habilitados" não aparece no layout de 390)
Reproduction: abrir /personas com viewport 1024x768, aba Redactores; observar a coluna RUT da 1ª linha.
Evidence: screens/08-redactores-1024x768-claro.png e screens/debug-crop-redatores-1024x768-tabela.png ("12.345.678-5" com o "5" fundido ao "2" de Cursos habilitados); medição via getBoundingClientRect + getComputedStyle.
Observed fact: o `textContent` da célula é "12.345.678-5" (correto), mas a caixa do texto mede 100,8px de largura contra 92,5px da célula — `white-space: nowrap` e `overflow: visible` deixam o texto vazar ~8px para dentro da coluna vizinha, onde o numeral de "Cursos habilitados" (não um fundo opaco desta vez — as duas strings colidem visualmente) já está posicionado.
Inference: `COL.rut` (o peso de `redatorColumns.ts`) reserva espaço suficiente para o RUT em 1440x900, mas não em 1024x768 quando a tabela tem 5 colunas de dado competindo pelo mesmo orçamento percentual — a mesma família de causa do UI-01 da run de Cursos (peso da coluna insuficiente para o conteúdo real no viewport mais estreito).
Impact: o verificador vê um RUT ilegível/corrompido visualmente ("12.345.678-2" em vez de "12.345.678-5" com um "2" separado) — dado de identificação em tela administrativa, sem peso legal direto mas usado para localizar pessoa física.
Recommendation: em `frontend/src/features/identity/components/Redator/redatorColumns.ts`, avaliar um peso mais largo para `rut` (ou redistribuir `courses`/`suitability`) seguindo o precedente de `courseColumns.ts` (UI-01 da run de Cursos: trocar o peso da coluna, não o vocabulário `COL` em si).
Rule/reference: frontend/src/features/identity/components/Redator/redatorColumns.ts (rut: COL.rut); frontend/src/shared/ui/AppDataTable/columnWidth.ts (vocabulário COL)

### UI-03 — "Último acceso" cortado pela coluna de ações fixa em 1024x768
Classification: C
Surface/journey: /personas, aba Redactores, lista, tema claro
Viewport: 1024x768 (não observado nos outros dois — a tabela ainda não rola nem transborda o suficiente para o mesmo efeito)
Reproduction: abrir /personas com viewport 1024x768, aba Redactores; observar a última coluna de dado ("Último acceso") da 1ª linha.
Evidence: screens/08-redactores-1024x768-claro.png (data "19-08-2026 03:15 p. m." aparece cortada em "19-08-1" / "03:15 p."); medição via getBoundingClientRect (header "Último acceso" termina em x=857, header da coluna de ações começa em x=807 — 50px de sobreposição).
Observed fact: a coluna de ações (`position: sticky`, fundo branco opaco, `z-index: 1`) começa 50px antes do fim da coluna "Último acceso" e pinta por cima da cauda do carimbo de data/hora.
Inference: mesma causa-raiz do UI-01 — `tableWidths()` não reserva a largura fixa da coluna de ações antes de distribuir os pesos das colunas de dado; aqui a tabela do wrapper já tem `overflow-x: auto` (scrollWidth 768 > clientWidth 718), mas a coluna sticky se posiciona relativa ao viewport VISÍVEL do scroll, não ao conteúdo total, então a sobreposição ocorre mesmo com o scroll disponível.
Impact: o verificador não consegue ler a hora completa do último acesso sem rolar a tabela horizontalmente — e nada indica visualmente que há mais conteúdo ali (o corte parece truncamento comum, não uma pista de "role para o lado").
Recommendation: mesma correção estrutural do UI-01 (reservar a largura da coluna de ações no cálculo de `tableWidths()`); resolveria as três ocorrências (UI-01, UI-02 indiretamente por sobra de espaço, UI-03) de uma vez.
Rule/reference: frontend/src/shared/ui/AppDataTable/columnWidth.ts; frontend/src/features/identity/components/Redator/RedatoresTable.tsx:132

### UI-04 — tabela "Historial de turmas" do diálogo de Alumno usa `dataKey` inexistente na linha
Classification: C
Surface/journey: /personas, aba Alumnos, abrir aluno em modo view (seção "Historial de turmas")
Viewport: reproduzido em 1440x900; a causa não depende de viewport (é de dado, não de layout)
Reproduction: abrir /personas, aba Alumnos, clicar "Ver" em qualquer aluno com pelo menos 1 turma; observar o console do browser.
Evidence: console log da sessão (`.playwright-cli/console-2026-09-21T00-07-38-913Z.log`), entrada em ~41s: "Each child in a list should have a unique \"key\" prop.[...] Check the render method of `TableBody`."
Observed fact: `StudentDetailSections.tsx` monta `<AppDataTable value={estado.data.turmas} ...>` sem `dataKey`; o wrapper (`AppDataTable.tsx:108`) cai no default `dataKey="id"`, mas `StudentTurmaData` (o DTO da linha) não tem campo `id` — só `turma_id`. Toda linha resolve a chave para `undefined`, e o React acusa em `console.error`, reproduzido de forma determinística mesmo com 1 turma só.
Inference: é a MESMA classe de defeito já corrigida uma vez neste projeto para `EmissionStudentsTable` (`dataKey="enrollment_id"`, ficha "f3 UI-06", `AppDataTable.test.tsx`) — o padrão certo existe e está provado em tela irmã, só não foi aplicado aqui.
Impact: com 1 turma, o efeito visual é nulo (por isso não apareceu nos eixos 1-4 da régua) — mas com 2+ turmas (caso comum, não extremo), `key=undefined` repetido faz o React reconciliar linhas por posição em vez de identidade, arriscando estado trocado entre linhas em atualizações (ex.: célula de certificado, que tem `useMutation` própria) — e "Historial de turmas" é dado com peso legal (comentário do próprio arquivo, linha 47).
Recommendation: em `frontend/src/features/identity/components/Student/StudentDetailSections.tsx`, passar `dataKey="turma_id"` ao `AppDataTable`, seguindo o padrão de `EmissionStudentsTable.tsx:43`.
Rule/reference: frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:108 (default dataKey="id", comentário cita exatamente este padrão de override); frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx:43 (dataKey="enrollment_id", precedente já provado); frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx:111 (describe "AppDataTable — dataKey (f3 UI-06)")

## Summary
A: 0
B: 0
C: 4 (UI-01, UI-02, UI-03, UI-04)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

| Achado | Classe | Destino | Commit |
|---|---|---|---|
| UI-01 — coluna de identidade some atrás da coluna de ações fixa em 390x844 | `C` | corrige aqui — pelo review (Q-1), depois de deferida sem aprovação; ver nota | `b5d3e5be` |
| UI-02 — RUT sobrepõe "Cursos habilitados" em 1024x768 | `C` | corrige aqui | `a8b1564d` |
| UI-03 — "Último acceso" cortado pela coluna de ações fixa em 1024x768 | `C` | corrige aqui | `d07aa877` |
| UI-04 — `dataKey` inexistente na tabela de turmas do Alumno | `C` | corrige aqui | `39f0bc8f` |

**UI-02** — `redatorColumns.ts` trocou o peso de `rut` de `COL.rut` (9) para `COL.short` (13): em
1024x768, com as 5 colunas de dado da tabela, o peso original reservava 92,5px contra um RUT de
100,8px. RED visto (`14.46%` vs `19.5%` esperado), GREEN depois. Medido no navegador pós-fix: célula
124,8px, texto 100,8px, ~8px de folga, sem sobreposição.

**UI-04** — `StudentDetailSections.tsx` ganhou `dataKey="turma_id"`, mesmo padrão já provado em
`EmissionStudentsTable` (ficha f3 UI-06). RED visto (aviso de "key" ausente em console), GREEN
depois. Teste precisou ser o PRIMEIRO do arquivo — React deduplica o aviso por nome do componente
pai (`TableBody`), não por dado, e um teste mais abaixo que já monta a mesma tabela mascara o novo.

**UI-03** — investigação encontrou uma causa-raiz diferente da que o relatório do Task 4 inferiu.
A hipótese original (`tableWidths()` não reserva a largura da coluna de ações antes de repartir os
pesos) foi testada e descartada: medido direto no navegador, a sobreposição é
`larguraDaTabela − larguraDaMoldura` por inteiro, **independente** de como os pesos das colunas de
dado são repartidos entre si (confirmado reescrevendo os pesos ao vivo via DevTools — a
sobreposição não mudou). A causa real é o piso `min-w-[48rem]` (768px) do `AppDataTable`, maior que
os 718px de moldura em 1024x768: o piso vence, força rolagem, e a coluna presa (`right: 0`) passa a
cobrir o que estaria visível sem ela. Uma tentativa intermediária de reserva exata via `calc()`
misturando `%` e `rem` no `width` da coluna também foi testada e descartada — confirmado em tabela
sintética que o Chromium ignora esse `calc()` sob `table-layout: fixed` e reparte o espaço restante
IGUALMENTE entre as colunas afetadas, artefato visível como larguras idênticas (~115px) nas 5
colunas de dado. Fix aplicado: `SearchableTableFrame` passa a repassar `pt` ao `AppDataTable`
por baixo (mecanismo novo, reaproveitável pelas outras 11 tabelas do débito `D-65`), e
`RedatoresTable` reduz seu piso para `min-w-[42rem]` (672px), que cabe nos 718px sem rolar. GREEN
visto tanto no teste (`RedatoresTable.test.tsx`, assinatura da classe no `<table>`) quanto no
navegador (`tableWidth === wrapperClientWidth === 718`, sem `scrollWidth` excedente). Sem regressão
em 1440x900 (tabela continua preenchendo o card).

**UI-01 — deferido nesta run, corrigido pelo review.** A mesma investigação mostrou que a correção
de UI-03 NÃO fecha UI-01: em 390x844 (276px de moldura), a coluna de ações de `RedatoresTable` (3
ícones, 12rem) precisaria reservar ~70% da largura da tabela para não sobrepor nada — nenhum
`min-width` razoável resolve isso (ou a tabela cabe nesse piso e vira ilegível, ou sobra
sobreposição proporcional ao que faltar). É a coluna de ações carregando ícones demais para o
espaço físico de um telefone, e o remédio é de UX: colapsar os ícones num controle só abaixo de um
breakpoint. O passe desta run reclassificou o achado de "corrige aqui" para **deferido**, com nota
na ficha `D-65`, e fechou dizendo "zero `C` aberto sem destino" — mas a spec (D4) e o DoD 2 do bloco
dizem "`C` corrige aqui, sempre" e "zero `C` aberto", e quem aceita adiar um `C` é o João, não o
executor. O review do bloco (2026-09-26, Q-1) reabriu o achado e o João decidiu consertar aqui.

**Correção (`b5d3e5be`).** Abaixo de `sm` a linha carrega UM controle: `RowActions` (`shared/ui`)
colapsa duas ou mais ações num menu (`AppMenu`), e `useCollapsibleActionsColumn(width)` encolhe a
coluna presa para 4.5rem no mesmo render. `ArchiveRowActions` compõe `RowActions` e ganha
`collapsed` e `leading` — o "Reenviar invitación" entra no mesmo menu que arquivar e ver; restaurar
perde o rótulo visível. Ligado nas duas abas desta tela (Redactores, Alumnos) e nas duas de
Administración (Usuarios, Roles), que tinham a mesma coluna presa em 390x844. RED visto: os casos
de 390px das quatro tabelas e o arquivo novo de `RowActions`. GREEN depois: 814/814, lint 0, build
ok. Medido no navegador em 390x844, es-CL, nome coberto pela coluna presa (antes → depois):

| Tabela | Coluna presa | Nome coberto | Controle na linha |
|---|---|---|---|
| Redactores | 192 → 72px | 44px (8px à vista, só a inicial) → 0 | 3 ícones → "Más acciones" |
| Alumnos | 96 → 77px | 9-14px (cauda do nome) → 0 | "Ver" |

O menu abre dentro da janela, um item por linha, alinhado à borda direita do gatilho; pelo
teclado, Enter abre com o foco no menu, setas e Enter executam, Escape devolve o foco ao gatilho.
Na visão de arquivados (um redator arquivado e restaurado de volta pelo próprio menu, só no banco
local), restaurar fica ícone dentro dos 72px e o nome não é coberto — mas a coluna de identidade
fica com 132px, espremida pelo par de 24% das colunas de arquivados, e o nome sai com reticência
depois de 2 ou 3 letras. Resíduo de piso por modo, registrado na `D-65` para o item 23. 1024x768 e
1440x900 sem mudança: ícones soltos, 12rem e 6rem.

Zero `C` aberto ao fim do bloco: os 4 corrigidos, o UI-01 pelo passe do review.
