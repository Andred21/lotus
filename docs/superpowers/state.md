---
schema_version: 1
active_feature: hardening
active_work_item: guardas-que-faltam
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
resume_state: null
active_spec: docs/superpowers/specs/2026-08-10-guardas-que-faltam-design.md
active_plan: docs/superpowers/plans/2026-08-10-guardas-que-faltam.md
context_packet: null
blocker: null
review_findings_approved: null
last_completed_work_item: documentos-oficiais-template-e-docx
state_basis_commit: d885738
updated_at: 2026-08-11T10:06:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Item ativo — `guardas-que-faltam`

### Seleção — 2026-08-10

**BD-1 do `backlog.md`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-1 · Guardas que faltam (mecanismo, zero mudança de comportamento)`; o gate
do comando **reprovou** — o estado era `idle`, `active_work_item` era `null` e o argumento era o
título de uma seção escrita no mesmo dia, não um slug promovido. A promoção veio da resposta dele ao
gate, com duas escolhas registradas: **commitar a proposta antes de promover** (feito em `ec3ad2a`,
que é o `state_basis_commit`) e **manter os 8 itens do BD-1 na íntegra**, incluindo a P-25, que eu
havia enfileirado por conta própria.

**BD-1 não é o item 1 de `## Próximos blocos`** — ali segue `Arquivados e restauração de
soft-delete`. A fila **não** foi renumerada: os BDs vivem na seção de dívida do `backlog.md`, que é
paralela a `Próximos blocos`, e o João pulou a ordem escrita conscientemente.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `turma-habilitacao-listagem`, `profundidade-backend-b4-b7` e
`documentos-oficiais-template-e-docx`): nenhum dos 8 itens cita Drive, Notion ou Figma. A fonte é o
repositório — testes, ESLint e `.claude/rules/`. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** Os itens 1 e 2 mexem em `backend/tests/`
(guarda de §5.1/§5.2 e `NestedRouteOwnershipTest`). Nenhum outro `active_work_item` de backend está
aberto, então o gatilho de fechamento da P-03 continua não vencido. Branch
`hardening/guardas-que-faltam`, criada de `7e76db4`, no padrão de
`hardening/guardrails-e-transportes`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **A superfície das duas leis já está limpa** — zero classe `Repository` em `backend/app/` (o
   único hit de `grep` é `TurmaQueryBuilder`, que não é uma) e zero `CREATE TRIGGER`/`DB::unprepared`
   em `backend/database/`. A guarda da **P-04** nasce verde: é custo de escrita, não de correção. É
   também o gatilho mais próximo do bloco — a P-04 reavalia em **2026-08-15**.
2. **`NestedRouteOwnershipTest` filtra por assinatura, não por URI** (`Q-2`): ele lê
   `$route->signatureParameters(['subClass' => Model::class])` e faz `continue` quando encontra menos
   de dois models tipados. Rota com dois segmentos `{}` e binding não tipado sai do universo do teste
   em silêncio — o mecanismo entregue em 2026-08-04 tem essa porta aberta desde o primeiro dia.
3. **`postMultipart.test.ts` mocka o próprio transporte** (`Q-4`): o arquivo abre com
   `vi.mock('./axios', () => ({ api: { post: vi.fn(...) } }))`, então nenhum caso exercita o axios
   real. A afirmação que interessa — que o `Content-Type` **não** é fixado à mão — não é testada por
   nada hoje.
4. **O barrel de `shared/hooks` exporta três símbolos de uso interno** (`Q-2` de 2026-08-05):
   `unclassifiedPayloadKeys`, `MutableResource` e `CrudFormOptions`. Conferido em 2026-08-10: o único
   consumidor é `useCrudForm.test.ts`, **por caminho relativo** — a remoção do barrel não quebra
   ninguém.
5. **`useEntityPhoto` tem 161 linhas e nenhum teste**, sendo o module de maior fan-out de
   `shared/hooks`. É o item de maior custo do bloco e o único que não é guarda de guarda.
6. **A P-25 é uma linha ausente numa rule**, não código: `.claude/rules/frontend-fsliced.md` segue
   sem a cláusula "hook genérico não importa tipo de `shared/ui`", conferido em 2026-08-10, com os
   dois casos já medidos (`useFilePreview`, `SearchableTableFrame`). Entra no bloco porque o item 4
   já abre as rules pelo mecanismo da lição 13.

**Uma frase desta seção nasceu errada e é corrigida aqui, não apagada:** ela dizia que os itens 1 e
4 eram "as duas peças sem precedente no repositório". O item 1 **tem** precedente —
`tests/Feature/Shared/DomainDependencyTest.php` já é guarda de arquitetura por varredura de código,
com comentário descartado por `token_get_all()` e forma não coberta banida em vez de fingidamente
coberta. Só o item 4 era peça nova, e o brainstorming mudou o que ele confere.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `aprovado`. O estado entra em `planning` no mesmo
commit da spec; `active_plan` segue `null` até a leitura humana do documento e a escrita posterior do
plano.

**Quatro decisões dele, respondidas antes de a spec existir** (D1, D2, D5 e D6 da §2): a guarda da
lição 13 confere **referência de código citada em doc**, não comando; ela mora no **vitest**, em
`frontend/tests/`; o `useEntityPhoto` ganha **seis** casos; e a frase vencida da rule é corrigida
neste bloco.

**Três medições que mudaram o desenho, feitas antes de escrever:**

1. **O item 4, como o backlog o registrou, não fecha honesto.** Ele dizia "todo comando citado nos
   `§Comandos` das rules existe como script em `package.json`/`composer.json`, e vice-versa". Medido:
   só 2 das 4 rules têm `## Comandos`; o que citam é `docker compose exec -T app php artisan …` e
   `pnpm …`; **nenhum** é script de `composer.json`; e o "vice-versa" reprovaria no dia 1 contra
   `setup` e `post-autoload-dump`, que doc nenhuma cita. As três reincidências reais da lição 13
   foram **classe ou pasta citada que nunca existiu** (`app/Data`, `LibreOfficeConverter`).
2. **O container não enxerga a raiz do repositório.** `docker-compose.yml` monta `./backend` e
   `./frontend`; `CLAUDE.md`, `.claude/rules/` e `docs/` não estão montados — conferido de dentro do
   container. PHPUnit não tem como ler o doc que a guarda confere, e criar volume para isso seria
   mudar infra por guarda de doc, o mesmo que o bloco anterior recusou na D-P1. O vitest é o único
   runner do projeto com acesso à raiz.
3. **A guarda 4 nasce verde, e por pouco:** 87 referências conferíveis em 10 docs normativos, **3**
   não resolvem — e as três são negação deliberada (`generated-types.md:16` escreve "Não existe
   `app/Data`"; `README.md:88` é a própria lição 13; `estrutura-monolito.md:192` lista `src/Domains/`
   como alternativa em aberto). Viram lista de exceção declarada, não heurística de vizinhança.

**Um achado que o brainstorming produziu e o BD-1 não previa:** `.claude/rules/frontend-fsliced.md:161-167`
afirma que o runner "cobre os hooks de `shared/hooks/`", e existem **8 testes de hook de feature** no
repositório. É lição 13 dentro do arquivo que o item 8 já ia abrir; a correção entra no mesmo commit
(D6). O registro do bloco anterior, que herdou a mesma premissa ao justificar a Q-6 sem teste, **não**
foi reescrito — é histórico, pelo precedente da P-27.

**Risco de review declarado MÉDIO** (§7 da spec): nenhum gatilho de ALTO se aplica (sem schema, auth,
RBAC, dinheiro, documento legal, `generated.ts`, sem execução delegada). O risco próprio é guarda que
promete cobrir e não cobre — cinco das oito são varredura, e varredura tem escape por construção.

### Aprovação da spec e plano — 2026-08-11

O João aprovou a spec com a instrução literal `pode prosseguir`. O plano ativo
(`docs/superpowers/plans/2026-08-10-guardas-que-faltam.md`) decompõe o bloco em **10 tasks (0–9)**:
baseline; as duas leis como teste; ownership de rota; a instância do axios; a recíproca da
classificação; o barrel; os seis casos da foto; a guarda de referência de doc; a rule; gate. O
handoff fixa **`executor: claude`** — as Tasks 1, 6 e 7 fecham por laço de ajuste contra medição, e o
risco declarado da §7 (guarda que promete cobrir e não cobre) não é detectável por execução linear.

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano). Os que
mudam decisão da spec:

1. **A guarda 2 conta segmentos e exige declaração, não binding tipado** (D-P1). A spec pedia
   reprovar "≥2 segmentos com <2 models tipados, com a instrução de tipar o binding". O docblock do
   próprio teste já carregava a objeção certa contra ler a URI — `{file}` não diz que é model —, e a
   saída é a válvula que o teste já usa: `withoutScopedBindings()` com o motivo ao lado. Medido: **8**
   rotas com ≥2 segmentos, todas já declarando, **0** reprovando.
2. **A guarda 3 é arquivo novo** (D-P2). `postMultipart.test.ts` abre com `vi.mock('./axios')`, que é
   hoisted e vale para o arquivo inteiro: "caso sem mock" ali dentro não existe. Vai para
   `axios.test.ts`, e o DoD do frontend passa de **15 para 16** arquivos.
3. **`codigoSemComentarios` vira trait compartilhado** (D-P5). A guarda §5.2 precisa da mesma
   varredura sem comentário que o `DomainDependencyTest` tinha em método privado; duplicar
   reintroduziria o defeito da Q-4 de 2026-08-04 em dois lugares.
4. **A guarda §5.1 exclui `QueryBuilders/`, e a exclusão é provada com sonda** (D-P6), não afirmada
   em comentário: `TurmaQueryBuilder` é o padrão aprovado pelo ADR-02 e uma varredura por sufixo o
   reprovaria.
5. **A guarda 4 ganha duas guardas de si mesma** (D-P8): piso de volume de referências e conferência
   de que cada citação deliberada ainda está no doc que a declara. Extrator que pare de casar
   deixaria o teste verde com zero referências conferidas.

A auto-revisão do plano contra a spec ainda achou três erros de contagem no próprio rascunho e os
corrigiu antes de gravar: o total de casos da Task 3 (9, não 8), a projeção de arquivos do frontend
(16, não 15) e uma contagem absoluta na Task 4 que ignorava os testes da Task 3.

**Risco de review continua MÉDIO.** O foco é um só: para cada guarda, existe uma forma de violar a
lei que ela não pega? O review não roda automaticamente ao fim da Task 9.

### Execução — 2026-08-11: as oito entregues, oito commits

O João autorizou com `/executar-bloco guardas-que-faltam`. Thread principal, main tree, sem worktree
(P-03), do base `4ff7621`. **Task 0 reconferida, não herdada:** backend **522 passed, 1 skipped
(1961 assertions)**, frontend **13 arquivos / 47 testes**, lint e build verdes, árvore limpa — bate
com o plano.

Commits, na ordem do plano: `d5e53b0` (leis §5.1/§5.2 + trait), `e868076` (ownership de rota),
`60fc520` (instância do axios), `c45226a` (recíproca da classificação), `1a630a4` (barrel),
`a4d2d2d` (seis casos da foto), `e42ae30` (referência de doc), `d885738` (a rule). Evidência task a
task e os cinco desvios (D-E1..D-E5) em `.superpowers/sdd/progress.md`.

**Duas medições mudaram a guarda, não só a implementação.** **D-E1** — o regex da §5.2 nascia com
`->\s*unprepared\s*\(` e **não** pegava `DB::unprepared(`, que é a forma idiomática e a que a lei
nomeia; a sonda do próprio plano o denunciou ao produzir uma linha em vez de duas (reprovava pelo
texto `CREATE TRIGGER`, não pela chamada). É o risco da §7 aparecendo dentro do bloco que existe
para eliminá-lo. **D-E2** — a guarda do axios afirma o **valor** fixado, não a presença da chave: o
próprio axios escreve `Content-Type: undefined` em `defaults.headers.common`, e a medição do plano,
feita com `JSON.stringify`, não o via. Assertar ausência de chave reprovaria o estado correto.

**O escape da guarda 2 foi provado, não afirmado:** com a sonda no lugar, o teste **antigo** (por
`git stash` do arquivo) **passa** e o novo reprova. Mesma disciplina na §5.1, onde a exceção de
`QueryBuilders/` foi provada com sonda dentro e fora da pasta.

**A guarda 4 confere 87 referências em 10 docs — o número exato que o plano mediu** — e as 3 que não
resolvem são as 3 exceções declaradas. A guarda-da-guarda foi vista vermelha comentando o `push` do
extrator (`expected 0 to be greater than 60`), com o caso principal passando **em silêncio** com
zero referências conferidas.

**Gate da Task 9:** backend **524 passed, 1 skipped (1963 assertions)** — os 524 projetados; Pint
`passed`; frontend **16 arquivos / 79 testes**, os 16 do plano (D-P2). `git diff main...HEAD` de
`backend/database/` **vazio**; `typescript:transform` sem diff em `generated.ts`; e
`git diff main...HEAD --stat -- backend/app/ frontend/src/features/` **vazio** — nenhuma sonda ficou
para trás e o bloco não toca domínio nem feature.

**Uma etapa de processo foi pulada e fica registrada:** o estado não passou por `executing` no
commit da primeira task durável, como o `/executar-bloco` manda. Ele foi de `ready_for_execution`
direto para `ready_for_review` neste commit. Nenhum trabalho se perdeu — os oito commits são a prova
da execução —, mas se a sessão tivesse caído no meio, o `state.md` estaria mentindo sobre a fase.

**O que o gate NÃO provou, sem maquiagem:** as cinco guardas de varredura têm escape por construção,
e os três medidos estão nomeados no ledger — a guarda 4 só vê token entre crases que **pareça path**,
então classe citada sem `/` (o caso `LibreOfficeConverter`, uma das três reincidências que a
motivaram) segue fora do universo; a guarda 1 casa por **sufixo de nome de arquivo**; e a guarda 2
exige **declaração**, não correção, então `withoutScopedBindings()` escrito por engano a satisfaz.
São o foco do review pela §7 da spec.

**Estado:** `ready_for_review`. Review, fechamento, push e PR não rodam automaticamente.

## Último item fechado — 2026-08-10 (`documentos-oficiais-template-e-docx`)

### Seleção — 2026-08-10

**Item 1 do `backlog.md`, escrito e selecionado explicitamente pelo João na mesma instrução.** Ele
descreveu o escopo em detalhe (fundo do certificado, realocação do QR, fidelidade tipográfica ao
template, manual conforme `manual.pdf` preenchido automaticamente, saída DOCX e botão na UI),
mandou abstrair no backlog e percorrer o workflow. O backlog foi escrito a partir dessa descrição;
ele não promoveu nada sozinho.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `turma-habilitacao-listagem` e `profundidade-backend-b4-b7`): o item não cita Drive,
Notion nem Figma. As fontes são o repositório e os três templates **já versionados no repo** —
`docs/templates/certificado.pdf`, `docs/templates/manual.pdf` e `docs/templates/fundo-certificado.png`,
este último entregue pelo João junto da instrução. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** O bloco mexe em
`backend/resources/views/certification/certificate.blade.php`,
`backend/resources/views/operation/manual-turma.blade.php`, `ManualPdfService`, `TurmaController` e
no frontend (`features/operation/components/Document/`). Nenhum outro `active_work_item` de backend
está aberto, então o gatilho de fechamento da P-03 continua não vencido.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **Os dois documentos já existem e já são Blade** — o bloco é refatoração, não construção:
   `certificate.blade.php` (2 páginas: certificado + temário) e `manual-turma.blade.php` (A4 retrato,
   3 tabelas), ambos via Gotenberg (`Shared/Pdf/GotenbergHtmlToPdf`). O manual já tem rota
   (`GET turmas/{turma}/manual`, `Operation/routes.php:25`), serviço (`ManualPdfService`) e botão
   (`features/operation/components/Document/ManualButton.tsx`, consumido por `TurmaDocuments.tsx:41`).
   O que não existe é **DOCX** — nenhuma ocorrência no repo.
2. **O manual do template não é o manual de hoje, nem em forma nem em conteúdo.** `manual.pdf` tem
   **5 páginas em ofício paisagem (1009×612 pt)** — Dados de la clase, Antecedentes Participantes,
   Control de Asistencia de Participantes (grade de 31 dias), Temas de La Capacitación, Evaluaciones.
   A Blade atual tem **3 tabelas em A4 retrato**, e o `@page { size: A4 portrait }` dela é decisão
   registrada (D4 do bloco 6d, com `preferCssPageSize` ligado no serviço). Mudar a orientação
   contradiz uma decisão escrita — o brainstorming tem de reabri-la explicitamente com o João, não
   sobrescrevê-la em silêncio.
3. **O fundo é pesado e o peso é o critério do próprio João.** `fundo-certificado.png` é
   **1414×2000, RGBA 8-bit, 1,2 MB** — proporção exatamente A4. Em base64 são ~1,66 MB **por página**
   que o embutir; o certificado tem 2 páginas e o manual, 5. O PDF são de hoje mede **40.119 bytes**
   (medido no gate de `certificacao-lote-e-snapshot`), e é essa a linha de base contra a qual o
   "visualizador travado" tem de ser medido.
4. **O QR e o par código/emissão trocam de lugar, não de existência.** Hoje `.meta` (`N°` + `Emisión`)
   abre a página 1 no canto superior **esquerdo** (`certificate.blade.php:244-247`) e o QR vive no
   rodapé dentro de `.footer-main` a 32mm (`:214-216`, `:313-316`). O template e a foto que o João
   anexou põem os três juntos no canto superior **direito**, QR menor com o par embaixo.
5. **O layout do certificado carrega guardas pagas com defeito medido em 2026-08-08** e documentadas
   no próprio arquivo: `min-height` em vez de `height` (com `height`, QR, assinatura e aviso legal
   saíram **sobrepostos** ao temário — documento corrompido sem aviso), o clamp
   `-webkit-line-clamp` da descrição e o limiar 80×7 que troca o tier de 11px pelo de 9px. Quem
   mexer no layout responde por elas; o `.accent-bottom` já tem falha de enquadramento **em aberto**
   declarada no arquivo (`:130-138`).
6. **DOCX via Blade é a pergunta aberta do bloco, e é decisão de arquitetura.** Não há biblioteca de
   escritório no `composer.json`; Gotenberg converte DOCX→PDF, nunca o contrário. O caminho a
   investigar no brainstorming é Blade renderizando WordprocessingML empacotado como OOXML; recorrer
   a biblioteca de terceiros é ADR, não escolha de implementação.

**Pendências tocadas pelo escopo, nenhuma vencida:** a **P-08** (RF-CUR-04 promete manual por curso;
implementado é Blade única) **não** dispara — o bloco continua com Blade única padronizada. A
**P-03** não fecha: um bloco de backend só.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `Aprovado — gravar e commitar a spec.` O estado
entra em `planning` no mesmo commit da spec; `active_plan` permanece `null` até a aprovação humana
deste documento e a escrita posterior do plano.

**Quatro decisões de abertura, respondidas por ele ANTES de a spec existir** (D1–D4 da §2):
manual com fonte de verdade única em Blade WordprocessingML, com o PDF saindo do mesmo `.docx` pela
rota LibreOffice; ofício paisagem igual ao template; fundo em JPEG de ~100 KB só no certificado; e
tipografia do certificado por fonte versionada com `@font-face`.

**A D2 reabre explicitamente a D4/D6 do bloco 6d** — o A4 retrato do manual, justificado na própria
Blade com "o cliente arquiva em A4, como todo documento oficial da Lotus". Não foi sobrescrita em
silêncio: as três saídas foram apresentadas e o João escolheu fidelidade literal ao arquivo aprovado
pela Lotus. O manual passa a ser o único documento oficial fora do A4.

**Três medições que mudaram o desenho, feitas antes de escrever:**

1. **O fundo entregue é limpo, e o peso tem referência própria.** `fundo-certificado.png`
   (1414×2000 RGBA, **1.245.172 bytes**) não tem logo, assinatura nem carimbos — é textura mais as
   barras azul/preta. O **mesmo fundo dentro do `certificado.pdf` aprovado** é um JPEG de
   **98.258 bytes** nas mesmas dimensões: 12,7× mais leve. O teto do bloco deixou de ser palpite.
2. **As fontes do template foram identificadas apesar da ofuscação do Word.** `pdffonts` só devolve
   `___WRD_EMBED_SUB_1235`; descomprimindo os oito programas de fonte e lendo o `name` table
   (`nameID 6`) saem **Lexend** (Regular/Bold/ExtraBold — três dos oito subsets), **Montserrat
   ExtraBold**, Comfortaa, Roboto e ArialMT. Lexend/Montserrat/Comfortaa são OFL e Roboto é
   Apache 2.0: nenhuma trava para versionar.
3. **A rota LibreOffice foi provada antes de virar decisão, não depois.** Pacote OOXML mínimo montado
   à mão (**1.207 bytes**) → `/forms/libreoffice/convert` → **`http=200`**, PDF de **18.671 bytes**,
   **`Page size: 1008 × 612 pts`** contra os 1009×612 do template, `LiberationSans-Bold` embutida e
   a célula com `w:shd w:fill="29A3E0"` no azul da Lotus. A D1 e a D2 repousam sobre medição.

**A contradição aparente entre D1 e D4 foi resolvida por medição, não por prosa** (§2.1 da spec):
`@font-face` é CSS e o manual deixa de passar por CSS, mas o texto do `manual.pdf` **é Liberation
Sans**, que o Gotenberg já tem — o probe a embutiu sem nenhuma instalação. D4 vale só para o
certificado.

**Um achado que a leitura do template produziu e o item do backlog não previa:** os títulos de página
do manual (`Libro de Control de Clases`, `Antecedentes Participantes`…) **não são texto** —
`pdftotext` da página 1 devolve só o conteúdo das células. Eles vivem dentro da faixa de cabeçalho
rasterizada (4205×378). Com a D3 deixando o manual sem fundo raster, os títulos passam a ser texto em
Liberation Sans Bold.

**Risco de review declarado ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only.

**A sessão parou no gate de leitura da spec, por escolha do João.** Ele optou por ler o documento
antes do `writing-plans`, então `next_owner` voltou para ele e a ação foi `approve_active_spec`.
Nenhuma linha de implementação foi escrita nessa etapa.

### Aprovação da spec e plano — 2026-08-10

O João aprovou a spec com a instrução literal `Spec aprovada, escreva o plano`. O plano ativo
(`docs/superpowers/plans/2026-08-10-documentos-oficiais-template-e-docx.md`) decompõe o bloco em
**11 tasks (0–10)**: baseline; fundo JPEG e fontes WOFF2 versionados; três tasks de certificado
(fundo, tipografia com remedição do limiar, QR); `App\Shared\Office\`; manual em Blade OOXML com o
PDF saindo do pacote; rota do DOCX; frontend; gate. O handoff fixa **`executor: claude`** — metade
das tasks fecha por comparação visual página a página com os templates, num laço de
render → olhar → ajustar. Nenhuma implementação foi iniciada durante o planejamento; o estado
transiciona para `ready_for_execution` no mesmo commit do plano.

**Baseline reconferido em `a703a26`, não herdado:** backend **503 passed, 1 skipped (1868
assertions)** — o mesmo placar do fechamento do `hardening-revisao-ui-assistida`, como esperado de
três commits só de documentação. O plano projeta **520 passed** ao fim do bloco (+17).

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano), em vez
de silenciá-los. Os que mudam decisão da spec:

1. **`docs/templates/manual.docx` existe no repo** — a spec só tinha lido o PDF. Dele saíram o papel
   exato (`w:pgSz w:w="20183" w:h="12246"`, contra os 20160×12240 do probe), o `w:pgMar`, as larguras
   de coluna das cinco tabelas, a cor institucional **`25A5E4`** (e não `29A3E0`) e a descoberta de
   que o template declara **Arial** — Liberation Sans é a substituição métrica do LibreOffice, não a
   fonte pedida. Declarar Arial acerta o conversor **e** o Word do cliente (D-P3, D-P4).
2. **A conversão PNG→JPEG saiu sem mudança de infra.** A alternativa era `libjpeg-turbo-dev` no
   `docker/php/Dockerfile`; foi recusada por trocar imagem de produção para converter um asset uma
   vez. A rota `/forms/chromium/screenshot/html` do Gotenberg foi provada: JPEG **1414×2000 de 74.604
   bytes** com `quality=92`, contra os 98.258 do mesmo fundo dentro do certificado aprovado (D-P1).
3. **São duas faces WOFF2, não quatro** (a spec §3.3 dizia quatro): Lexend e Montserrat são fontes
   **variáveis**, e o Google Fonts serve a mesma URL para 400/700/800 do Lexend. 39.680 + 19.012
   bytes cobrem os quatro pesos (D-P2).
4. **`short_open_tag` está `On` no container**, então uma Blade que abra com o `<?xml …?>` literal
   morre em `Parse error: syntax error, unexpected identifier "version"` — confirmado executando os
   dois casos lado a lado. As quatro Blades do pacote abrem por uma diretiva `@xmlDecl`; `{!! … !!}`
   foi recusado por reintroduzir a interpolação crua que a guarda de escape proíbe (D-P9).
5. **`printBackground` não é necessário** — medido antes de aplicar o fundo: os PDFs com e sem o
   campo saem byte a byte do mesmo tamanho. `PageOptions` e `GotenbergHtmlToPdf`, que são
   compartilhados com o certificado, **não mudam** (D-P7).
6. **As grades do manual são formulário impresso com linha fixa** (22/20/20), e o plano fixa
   `max(N, fixas)`: turma pequena mantém as linhas em branco, turma grande estende a grade. Truncar
   esconderia aluno (D-P5).

A auto-revisão do plano contra a spec ainda achou seis erros no próprio rascunho e os corrigiu antes
de gravar: `makeStudentWithUser` não existe no `CreatesDomainRecords` (o idioma real é
`Student::create` sobre `User::factory()`); o `CertificatePdfTest` já tem `fakeGotenberg()`/
`assertHtml()` e não precisava de um helper novo; a guarda "sem `{{`" reprovaria o próprio comentário
Blade; duas asserções de contagem eram ambíguas (`<w:tr ` com espaço nunca casa; `6` e `10` também
são número de linha); a rota pública é `publico/certificados`, não `public/certificates`; e a troca
do controller precisava entrar na Task 7, senão um commit ficaria com a rota do manual quebrada.

**Risco de review continua ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only. O
review não roda automaticamente ao fim da Task 10.

**Uma pergunta fica aberta para o João, no Step 7 da Task 10:** `App\Shared\Office\` e a rota
LibreOffice são decisão de arquitetura de transporte. A recomendação do plano é **nota no ADR-12**,
não ADR novo — a rota LibreOffice é uma segunda porta do **mesmo** serviço do compose, com o mesmo
racional de "o transporte mora num lugar só".

### Execução iniciada — 2026-08-10

O João autorizou com `/executar-bloco documentos-oficiais-template-e-docx`. Execução no **thread
principal** conforme o `## Handoff de execução` do plano (`executor: claude`): metade das tasks
(3, 4, 5, 7 e 10) fecha por comparação visual página a página contra os templates, num laço
render → olhar → ajustar que exige leitura de imagem a cada iteração. Main tree, sem worktree (P-03).

**Task 0 provada em `8ee1d9e`:** backend **503 passed, 1 skipped (1868 assertions)** — bate com o
baseline do plano; `typescript:transform` sem diff em `generated.ts`; `pnpm lint` e `pnpm build`
verdes; `git status --porcelain` vazio.

### Tasks 1–9 entregues — 2026-08-10

Commits, do base `8ee1d9e`: `7d4a85f` (fundo JPEG), `90a353a` (fontes WOFF2), `11f75d5` (fundo
aplicado, morte do `.accent`), `042c2f2` (tipografia e remedição do limiar), `5037f24` (QR e bloco
de identificação no topo), `fc6c996` (`App\Shared\Office\`), `af046f6` (manual em Blade OOXML),
`2d815cb` (rota do DOCX), `86d81dc` (frontend com os dois formatos). Evidência task a task, e os
doze desvios declarados (D-E1..D-E12), em `.superpowers/sdd/progress.md`.

**Três desvios mudam o que o plano dizia, não só como foi feito.** **D-E6** — `Xml::lines()` nasceu
emitindo `<w:br/>` **dentro** do `<w:t>`, que é bem-formado e **inválido** contra o schema
(`CT_Text` é tipo simples); o separador passou a fechar e reabrir o `<w:t>`. **D-E7** — as fontes,
bordas e margens de cada tabela saíram **medidas do `docs/templates/manual.docx`**, tabela a tabela,
em vez do `sz 13/17` uniforme que o plano supunha. **D-E11** — `@else@xml(...)` **não compila**: o
regex de diretiva do Blade exige `\B@`, e o `e` de `@else` colado no `@` é fronteira de palavra; a
diretiva saía literal dentro do documento. O flag `$lineas` morreu e toda célula usa `@xmlLines`.

### Task 10 — o gate do bloco (2026-08-10)

**Ferramentas.** Backend **519 passed, 1 skipped (1950 assertions)** — contra os 520 projetados pelo
plano; a diferença é a Task 5, que substituiu asserções em vez de somar teste. `typescript:transform`
**sem diff** em `generated.ts` (nenhum DTO mudou de forma). `git diff` de `backend/database/`
**vazio** — zero schema, como o plano exige. Pint `passed` nos arquivos do bloco. Frontend: `pnpm
lint` limpo, `pnpm build` verde, **13 arquivos / 47 testes**.

**E2e contra a API real**, sessão Sanctum por cookie + CSRF. `GET /api/turmas/1/manual` → **200**
`application/pdf` + `inline; filename="manual-turma-1.pdf"`; `GET /api/turmas/1/manual/docx` → **200**
`…wordprocessingml.document` + `attachment; filename="manual-turma-1.docx"`. `pdfinfo` do manual:
**`Pages: 5`**, **`Page size: 1008 x 612 pts`**. Pesos: certificado **199.820 B** (linha de base
40.119, teto do plano 251.450), manual `.docx` **19.259 B**, manual `.pdf` **52.966 B**, template de
referência 444.830 B.

**Contrato do certificado intacto:** `snapshot_ok` **False** só no `LOT-2026-1001`, que segue
corrompido de propósito no banco de dev como evidência viva do checkpoint visual pendente do João.
`migrate:fresh --seed` **não** foi rodado, pelo mesmo motivo do bloco anterior. 51 consumidores das
classes de `App\Shared\Office\`; zero `Repository`; a única ocorrência da varredura de sobra é
`CertificatePdfTest.php:737`, que é a guarda `assertStringNotContainsString('class="qr"', $html)` —
asserção de **ausência**, não referência sobrevivente.

**O que o gate NÃO provou, sem maquiagem:** fidelidade **pixel a pixel** contra os templates — a
comparação foi de grade, cor e posição, página a página, com os PNGs de 144 dpi lado a lado;
comportamento de turma sem alunos ou sem módulos além do que os testes cobrem; e o manual aberto no
**Word do cliente** — a conversão foi validada pelo LibreOffice do Gotenberg, que é o mesmo motor
que gera o PDF, não um segundo leitor independente.

**Três decisões do João no checkpoint visual, todas registradas:**

1. **QR do certificado muda de lado.** A `§3.4` da spec pedia topo **direito**, e a Task 5 entregou
   assim; o gate mostrou que o `docs/templates/certificado.pdf` abre a folha com o retângulo do QR à
   **esquerda**. Ele decidiu pelo template. Corrigido em `ee285df` (`align-self: flex-start`), com o
   lado **assertado no teste** — a divergência veio de uma releitura da spec, e sem guarda a próxima
   releitura reverteria em silêncio uma decisão tomada contra ela.
2. **Fundo do certificado: aceitar agora, tratar depois** → **P-28**. Faltam as cunhas diagonais das
   quinas da página 1 (são **vetor** no PDF aprovado; o raster versionado não as contém) e a faixa
   azul/preta se repete na página 2, onde o aprovado é cinza limpo. Nenhuma das duas estava nas
   exclusões aceitas da §7 da spec, por isso viraram pendência em vez de silêncio.
3. **ADR: nota no ADR-12, não ADR novo.** `App\Shared\Office\` e a rota LibreOffice são a segunda
   porta do **mesmo** Gotenberg do certificado, com o mesmo racional de transporte. A nota está
   escrita. Isso **venceu o gatilho da P-20** (o bloco tocou `docs/adrs.md`) e resolveu metade da
   **P-21** — as duas foram **atualizadas, não fechadas**: o hospedeiro do `openspout` segue sendo
   escolha dele, e o `simple-qrcode` pertence a um bloco de Certification, não a este.

**Pendências revisadas:** a **P-08** não disparou (o manual continua Blade única padronizada, agora
em OOXML) e a **P-03** não fechou (um bloco de backend só). Nasceu a **P-28**. P-04 reavalia
**2026-08-15**; P-15, P-23, P-25, P-26 e a nova P-28 revisam **2026-09-30**.

**Risco de review continua ALTO** (§8 da spec): documento com peso legal mais dependência de infra
nova em caminho de produção → duas frentes, lente Claude e segunda frente do Codex read-only. O
bloco **para** em `ready_for_review`; review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-10: duas lentes, 7 achados, todos aprovados e corrigidos

**ALTO RISCO** pela §8 da spec (documento com peso legal + dependência de infra nova em caminho de
produção). Lente Claude com o gabarito do projeto + `mcp__codex__codex` read-only sobre
`8ee1d9e..HEAD` (11 commits, 38 arquivos). **Órfãos: zero** — `ManualPdfService` morreu sem
referência sobrevivente, as cinco classes de `App\Shared\Office\` têm consumidor e a chave de locale
`documents.manual` não sobrou em nenhuma das três locales. **Leis §5 limpas:** zero `abort(` em
`Domains/Operation/`, zero Repository, `generated.ts` sem diff, `git diff` de `backend/database/`
vazio, controller fino, `ManualButton` só via `shared/ui`, permissão nas duas rotas com teste de 403.

**Uma divergência entre as lentes, mostrada em vez de resolvida em silêncio.** O achado nº 1 do
Codex — `w:tcPr` emitindo `vAlign`/`tcMar`/`shd`/`tcBorders` fora da sequência ECMA-376 — foi
**REJEITADO por medição**: descompactado, o `docs/templates/manual.docx` escrito pelo Word usa
exatamente a mesma ordem (`tcW, vAlign, tcMar, …, shd, tcBorders` ×706; `trHeight, cantSplit` ×81).
Sobrou dele só a parte confirmada em separado, que virou a Q-1. Também **não** foi reportada a
ausência de validação do corpo do PDF no `GotenbergDocxToPdf` (Codex nº 4): é o comportamento
idêntico do `GotenbergHtmlToPdf` já em produção pelo ADR-12, e apertar só um lado criaria assimetria
entre as duas portas do mesmo serviço.

**O João aprovou Q-1..Q-7 na íntegra** (`Todos de Q-1 a Q-7`); todos entraram em `96d7256`.

**Documento (Q-1, Q-2), com o template como árbitro.** O cabeçalho é um partial incluído cinco
vezes e escrevia `wp:docPr id="1"` nas cinco — o Word identifica figura pelo id e pede reparo do
arquivo quando ele repete, e o gate havia declarado, sem maquiagem, que o manual **nunca foi aberto
no Word do cliente**. O template aprovado numera os seus dez desenhos **1..10** e escreve
`pic:cNvPr id="0"` nos dez; as duas convenções foram medidas e seguidas (contador no `@include`,
`cNvPr` fixo em 0). A Q-2 trocou o `load('enrollments…')` por `orderByStudentName()`: as três grades
numeram linha a linha e são **assinadas** por linha, e PDF e DOCX são dois requests — sem ORDER BY a
mesma turma podia sair com duas numerações. O `EnrollmentQueryBuilder` já documentava o defeito para
a tela; aqui ele tinha peso de documento.

**Mecanismo (Q-3), com uma correção ao próprio achado.** O `OoxmlPackager` passou a conferir
`tempnam`, `open`, `addFromString`, `close` e a leitura, a apagar o temporário num `finally` e a
recusar pacote sem nenhum byte com `OfficeRenderException`. **O achado dizia "HTTP 200 com zero
byte" e isso não se reproduz:** sob o handler de erro do Laravel, o `file_get_contents` de um arquivo
ausente vira `ErrorException`. O que foi medido no vermelho do teste é pior de outro jeito — 500 sem
tipo de domínio, com o caminho `/tmp/ooxmlXXXXXX` dentro do `detail` e o `unlink` pulado. A porta
que devolveria bytes vazios em silêncio é o `open()` falhando, que deixa para trás o arquivo de zero
byte do `tempnam`; é ela que a checagem de `open` fecha.

**Teste (Q-4):** o `500_rfc7807` afirmava só o status — um 500 em HTML puro passaria. Passou a
afirmar `content-type`, `type`, `title`, `status` e o `detail` que nomeia o conversor. É guarda,
não conserto: o comportamento já estava certo, faltava a asserção.

**Doc (Q-5):** a nota do ADR-12 citava `LibreOfficeConverter`, classe que nunca existiu (lição 13);
agora nomeia `DocxToPdf` e `GotenbergDocxToPdf`, com o paralelo explícito ao `GotenbergHtmlToPdf`.

**Frontend (Q-6, Q-7):** o download do DOCX revogava o objectURL no mesmo stack do `click()` de uma
âncora **nunca anexada ao DOM** — duas causas conhecidas de download que não começa, e assimetria
com o caminho do PDF ao lado, que fazia certo. A âncora passou a ser anexada e o objectURL a viver
no `urlRef` até a próxima geração ou o unmount, com os dois formatos usando o mesmo `keepUrl`. A Q-7
separou o estado: `useMutationErrors` devolve o **primeiro** erro truthy e só a mutação disparada
reseta o próprio erro, então o erro do PDF sobrevivia a um DOCX baixado com sucesso; e o `pending`
fundido girava os dois botões juntos, anunciando o Word quando o pedido tinha sido o PDF.

**Verificação depois das correções, refeita e não herdada:** backend **522 passed, 1 skipped (1961
assertions)** — +3 testes / +10 asserções sobre o 519/1951 do gate, e os três testes novos foram
**vistos vermelhos** antes da correção (ids `1,1,1,1,1`; ordem `Zoe, Ana, Bruno`; `ErrorException` no
lugar da `OfficeRenderException`). Pint `passed`; `typescript:transform` sem diff em `generated.ts`;
`git diff` de `backend/database/` vazio; frontend `pnpm lint` limpo, `pnpm build` verde, **13
arquivos / 47 testes**. E2e contra o documento real da turma do seed: `.docx` de **19.269 B** com
`docPr=1,2,3,4,5`, `cNvPr=0,0,0,0,0` e as doze matrículas em ordem alfabética; PDF convertido de
**52.954 B**, **`Pages: 5`**, **`Page size: 1008 x 612 pts`**, página 2 conferida na imagem.

**O que continua não provado, sem maquiagem:** o manual **aberto no Word do cliente**. A Q-1 remove
a causa conhecida de "pedir reparo", medida contra o template, mas o segundo leitor independente
continua sendo o do João. A Q-6 tem correção sem teste: o corte do runner do frontend cobre os hooks
de `shared/`, e hook de feature com DOM segue fora dele — dizer o contrário seria cobertura fantasma
(lição 10).

**Uma divergência numérica registrada, sem consequência:** o gate do bloco anotou **1950**
asserções; a suíte na mesma árvore mede **1951**. O número do gate está errado por um.

**Estado:** `ready_for_closure`. Nada pendente de decisão. O fechamento não roda automaticamente.

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito, não herdado.** As correções Q-1..Q-7 entraram depois do e2e da Task 10 e
mexeram no documento (ids do `wp:docPr`, ordem das matrículas), no `OoxmlPackager` e no frontend —
então o critério de aceite do bloco foi provado de novo contra a API real, e não pelo relatório do
gate anterior.

**Ferramentas.** Backend **522 passed, 1 skipped (1961 assertions)** — o mesmo placar da verificação
pós-review, contra os 520 que o plano projetava. Pint `--test` **`passed`** nos **22** `.php` vivos
do bloco. `typescript:transform` executado: **sem diff** em `generated.ts`, `git status --porcelain`
vazio depois de rodar. `git diff main...HEAD -- backend/database/` **vazio** (zero schema). Frontend:
`pnpm lint` limpo, `pnpm build` verde, **13 arquivos / 47 testes**. As três locales com **538 chaves
cada e zero diff** entre si.

**E2E com sessão Sanctum por cookie + CSRF, só GETs — nenhuma mutação no banco de dev.**
`GET /api/turmas/1/manual` → **200** `application/pdf` + `inline; filename="manual-turma-1.pdf"`,
`pdfinfo` dizendo **`Pages: 5`** e **`Page size: 1008 x 612 pts`**; `GET /api/turmas/1/manual/docx` →
**200** `…wordprocessingml.document` + `attachment; filename="manual-turma-1.docx"`.

**O pacote foi aberto, não suposto.** As cinco parts (`[Content_Types].xml`, `_rels/.rels`,
`word/document.xml`, `word/_rels/document.xml.rels`, `word/media/lotus-logo.png`),
`w:pgSz w:w="20183" w:h="12246" w:orient="landscape"` **idêntico ao `docs/templates/manual.docx`**,
`wp:docPr` numerado **1,2,3,4,5** e `pic:cNvPr id="0"` cinco vezes — as duas convenções da Q-1
vivas no documento entregue, e não só no teste.

**Preenchimento por contagem (DoD 4):** turma de **12 matrículas**, cada nome aparecendo **3 vezes**
(uma por grade), grades em 23/21/21 linhas (cabeçalho mais as 22/20/20 fixas) — com N=12 o
`max(N, fixas)` da D-P5 mantém as linhas em branco, como o formulário impresso. Rodapé de horas
fechando com a soma dos módulos: 8+6+4 = **18 T**, 4+10+8 = **22 P**.

**Pesos (DoD 1):** manual `.docx` **19.269 B**, manual `.pdf` **52.954 B** (template de referência
444.830 B), certificado **199.830 B** contra a linha de base **40.119 B** e o teto **251.450 B** do
documento aprovado pela Lotus.

**Fonte de verdade única (DoD 9), conferida no código:** `ManualDocumentService::pdf()` é
`converter->render($this->docx($turma))`. Não há segundo caminho de montagem.

**Contrato do certificado (DoD 7):** `GET /api/certificates` **200** com os treze campos de sempre e
`snapshot_ok` **false só** no `LOT-2026-1001`; `show` do são **200**; rota pública **sem cookie**
**200**; o corrompido devolve **500 `application/problem+json`** no `show` e no `pdf`, nomeando
`LOT-2026-1001` **e** o campo `aluno.name`.

**Visto renderizado (DoD 8):** 14 PNGs comparados página a página. As **cinco** páginas do manual
batem com o template em grade, colunas, cores e contagem de linhas; no certificado as únicas
divergências são as já declaradas — assinatura da gerente e carimbos SENCE/NCH pela §7 da spec,
cunhas das quinas e faixa na página 2 pela **P-28** —, confirmadas na imagem em vez de assumidas.

**Órfãos e leis §5:** 54 consumidores das classes de `App\Shared\Office\`; zero sobra de
`ManualPdfService`, `manual-turma.blade`, `class="accent"` ou `class="meta"` (os únicos hits são um
comentário que explica a renomeação e a asserção de **ausência** de `class="qr"`); zero `abort(` em
`Domains/Operation/`; zero Repository; nenhum import de PrimeReact direto nem cross-feature nos três
arquivos de frontend do bloco.

**Pendências:** nenhuma nasceu neste gate e nenhuma fechou. A **P-28** já entrou no gate técnico; a
**P-20** e a **P-21** foram atualizadas, não fechadas (o hospedeiro do `openspout` e a nota do
`simple-qrcode` seguem com o João). A **P-08** não disparou (manual continua Blade única
padronizada, agora em OOXML) e a **P-03** não fechou (um bloco de backend só). P-04 reavalia
**2026-08-15**; P-15, P-23, P-25, P-26 e P-28 revisam **2026-09-30**.

**Uma imprecisão do plano, registrada em vez de corrigida retroativamente:** o Step 2 da Task 10
escreve `"password":"password"` como credencial do seed, e a senha real é `senha123` — todos os
outros planos do repositório escrevem certo. O plano aprovado **não** foi reescrito (precedente da
P-27) e o e2e deste gate rodou com a credencial correta.

**Divergência de outro bloco, achada e não corrigida pelo segundo gate seguido:** a linha do
`turma-habilitacao-listagem` no `progress.md` tem um `|` não escapado em
`Spatie\LaravelData\Optional|int`, que parte a tabela naquela linha. O fechamento do
`hardening-revisao-ui-assistida` já a registrou sem tocar; reverter aquela decisão sem o João seria
a mesma deriva silenciosa que o gate existe para impedir.

**Arquivamento:** plano → `plans/archive/2026-08-10-documentos-oficiais-template-e-docx.md`; spec →
`specs/archive/2026-08-10-documentos-oficiais-template-e-docx-design.md` (não é compartilhada com
nenhum item futuro registrado). A referência interna do plano à spec foi reapontada para o path
arquivado. Entrega registrada no `progress.md`, com a de 2026-08-04
(`hardening-estrutural-pre-sprint-4`) descendo para o `progress-archive.md` para manter dez. Item 1
removido do `backlog.md`, com renumeração dos seguintes.

**Estado do ambiente:** `migrate:fresh --seed` **não** foi rodado — o banco de dev segue carregando
o `LOT-2026-1001` corrompido de propósito para o checkpoint visual do João, que é justamente a
evidência viva que o DoD 7 usa. O e2e deste gate foi read-only.

**O que o fechamento NÃO provou, sem maquiagem:** o manual **aberto no Word do cliente** (a Q-1
remove a causa conhecida de "pedir reparo", medida contra o template, mas o segundo leitor
independente continua sendo o do João); fidelidade **pixel a pixel** — a comparação foi de grade,
cor e posição; e a Q-6 segue **sem teste**, porque o runner do frontend cobre os hooks de `shared/`
e hook de feature com DOM está fora dele (lição 10).

**Estado:** `idle`. Nenhum item promovido — a seleção do próximo é do João.

## Penúltimo item fechado — 2026-08-10 (`hardening-revisao-ui-assistida`)

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito, não herdado do gate técnico.** As correções Q-4 e Q-6 mexeram no
`preflight.sh` *depois* dele, então os nove modos foram exercitados de novo, com o Lotus local de
pé: `bash -n` limpo; `BLOCKED: non-local` para URL de produção; `BLOCKED: unreachable` para porta
morta em loopback; `BLOCKED: non-local` **mesmo com o `curl` fora do `PATH`** — a prova de que a
validação roda antes de qualquer requisição, que é o ponto da Q-4; `BLOCKED: unhealthy ...
status=503` contra servidor sintético; `BLOCKED: missing command: playwright-cli`; e `PREFLIGHT_OK`
com `frontend=200 backend=200`. `4xx` continua passando de propósito.

**O gate reprovou um item do DoD e a reprovação não foi maquiada.** O teste literal do plano
(Task 4, Step 4) acusou o adaptador com **18 linhas** contra o teto de 15 do DoD item 3 — estouro
vindo das próprias Q-2 e Q-10, aprovadas. Resolvido por decisão do João: comprimido para 15 linhas
sem perder cláusula, e o gate refeito passou. Detalhe em §"DoD item 3 reprovou no gate".

**Demais itens:** suíte backend **503 passed, 1 skipped (1868 assertions)** — rodada no tree
central, cujo `backend/` é byte a byte idêntico ao desta branch, com checksum de `app/` + `tests/`
igual antes e depois; frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes na
árvore já mesclada; Pint e `typescript:transform` **N/A** (zero `.php`, zero DTO, `generated.ts`
sem diff); código morto zero; leis §5 sem superfície de contato — o bloco não toca schema, auth,
auditoria, RBAC nem código de aplicação.

**Pendências:** a **P-27 fechou** — o enum final é `used|complementary_unavailable|not-needed`, com
a nota no `progress.md` da entrega; o plano aprovado não foi reescrito retroativamente e os
relatórios em `.artifacts/` ficam como registro de auditoria. Nenhuma outra venceu gatilho (P-04
reavalia 2026-08-15; P-15 e P-26 em 2026-09-30) e nenhuma nasceu. A P-03 **não** disparou: o
gatilho é dois blocos de **backend** em paralelo, e este não é backend.

**Divergência achada e não corrigida, por ser de outro bloco:** a linha do
`turma-habilitacao-listagem` no `progress.md` tem um `|` não escapado em
`Spatie\LaravelData\Optional|int`, o que parte a tabela naquela linha. Veio da main no merge; fica
registrada aqui em vez de corrigida em silêncio.

**Arquivamento:** plano → `plans/archive/2026-08-10-hardening-revisao-ui-assistida.md`; spec →
`specs/archive/2026-08-10-hardening-revisao-ui-assistida-design.md` (não é compartilhada com nenhum
item futuro registrado). A referência interna do plano à spec foi reapontada para o path arquivado,
e a P-27 encerrada aponta para o plano arquivado. Entrega registrada no `progress.md`, com a de
2026-08-03 (`abstracao-componentes-catalog`) descendo para o `progress-archive.md` para manter dez.
Item 1 removido do `backlog.md`, com renumeração dos seguintes; os três débitos do piloto ficam.

**Estado do ambiente:** nenhuma mutação. O bloco nunca escreveu em banco — o piloto e a aceitação
são read-only por contrato, com `git status --short` antes e depois em cada run. O Vite dedicado
subiu só para o `PREFLIGHT_OK` do gate e foi encerrado; o Compose central seguiu ativo e intocado.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João no Gate 4 e confirmado após a
reconciliação da fila.** O bloco cria a infraestrutura local e a skill compartilhada de revisão
UI/UX assistida por navegador. Playwright CLI é o mecanismo obrigatório; Chrome DevTools MCP é
complementar e degradável. Não inclui E2E versionado nem correção dos achados do piloto.

**Divergência temporal resolvida antes da seleção:** o plano-mestre de 2026-08-08 posicionava o
hardening antes de “Certificação · frontend”, mas esse bloco já estava entregue e fechado quando a
implementação formal começou. Por decisão explícita do João em 2026-08-09, o hardening foi
promovido agora, antes de “Arquivados e restauração de soft-delete”; a spec deve descrever a ordem
real e não repetir a premissa obsoleta. Não há regra de negócio externa a recuperar, portanto a
rota segue sem Context Packet (`context_packet: null`).

**Isolamento:** worktree `/home/jvbat/projetos/fix-frontend`, branch
`chore/hardening-ui-review`, criada a partir de `032332b` e sincronizada com `origin/main` na
seleção.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `APROVADO O DESENHO — gravar e commitar a spec.`
A spec ativa materializa as decisões fechadas, a ordem temporal reconciliada, o protocolo
read-only, a degradação do Chrome DevTools e o DoD do bloco. O estado entra em `planning` no mesmo
commit da spec; `active_plan` permanece `null` até a aprovação humana deste documento e a escrita
posterior do plano.

### Aprovação da spec e plano — 2026-08-10

O João aprovou a spec com a instrução literal `Aprovada a SPEC. Siga com o writing-plans`. O plano
ativo decompõe a fundação, a skill canônica, os adaptadores, a matriz, os Gates 5/6, o piloto nos
dois agentes e o gate técnico final. O handoff fixa `executor: codex` e limita a execução aos paths
aprovados; nenhuma implementação foi iniciada durante o planejamento. O estado transiciona para
`ready_for_execution` no mesmo commit do plano.

### Execução delegada ao Codex — 2026-08-10

O João autorizou literalmente `APROVADO — executar o plano ativo até o Gate 5.` O Codex inicia as
Tasks 0–5 do plano aprovado e deve parar antes do piloto. A transição para `executing` entra no
mesmo commit do primeiro artefato durável, mantendo `next_owner: claude` e
`next_action: continue_active_plan`.

### Pilotos, gate final e handoff — 2026-08-10

O João retomou a execução com a instrução literal `vamos continuar entao com plano até chegar na
parte de review, depois complementamos a skill conforme a ideia inicial.` A instrução atual
autorizou concluir os Gates 5/6 e a Task 7; a complementação da skill ficou explicitamente adiada
para depois do review e não foi misturada neste diff.

O piloto de Clientes foi executado em runs separadas no Codex e no Claude Code, com o mesmo escopo
read-only, `1440x900`, `1024x768` e `390x844`, snapshots, screenshots, console, rede e Git
antes/depois. Os agentes concordaram nos cinco fatos reproduzíveis centrais; divergências de
severidade e achados complementares ficaram registradas nas evidências ignoradas. Três grupos B/C
reproduzidos por ambos foram adicionados ao backlog, sem correção de frontend.

Gate final fresco: skill e shell válidos; preflight `200/200` com `PREFLIGHT_OK`; frontend `13`
arquivos e `47` testes, lint e build verdes; backend `501 passed`, `1 skipped`, `1859 assertions`.
A primeira passagem do backend viu um estado intermediário do WIP da main central — o teste foi
salvo às `15:09:35` e o método correspondente às `15:10:01` — e falhou uma vez; o teste isolado
passou `5/5`, e a suíte completa passou no rerun com checksums idênticos antes/depois. A aceitação
final refez Clientes nas três viewports, com console `0` erros/`0` warnings, somente GETs `200`,
nenhuma mutação e Chrome DevTools registrado como `complementary_unavailable`. O Vite dedicado foi
encerrado e o Compose central permaneceu ativo. O bloco para em `ready_for_review`; não inicia
review, fechamento, push ou PR automaticamente.

### Review de sprint — 2026-08-10: duas lentes, 10 achados, todos aprovados e corrigidos

**ALTO RISCO por `executor: codex`** (o bloco não toca schema, `generated.ts`, auth, auditoria,
RBAC, dinheiro nem documento legal; o gatilho é a execução delegada). Lente Claude com o gabarito
do projeto + `mcp__codex__codex` read-only sobre `032332b..HEAD`. Escopo: só os 11 arquivos do
intervalo. Órfãos: zero — os quatro artefatos canônicos têm consumidor declarado e provado
(preflight chamado pelos dois pilotos e pela aceitação; rubrica e template citados nos cinco
relatórios; adaptador e comando resolvidos em sessão nova na Task 5).

**Higiene do diff reconferida, não aceita por relatório:** `git diff --check` limpo;
`frontend/`, `backend/`, `.mcp.json` e `.codex/config.toml` sem uma linha de diff; `git status`
limpo; `preflight.sh` versionado com modo `100755`; `state_basis_commit: f62885b` é de fato o
commit durável anterior a `62bf9c9`.

**O achado 🔴 é de lei, não de estilo.** A matriz da Task 5 declara PASS em quatro linhas cuja
evidência é a citação do texto que o próprio bloco acabou de escrever. Duas delas sustentam
cláusulas do DoD §10 da spec: "solicitação de backend não invoca a skill" (evidência: o frontmatter
diz `not for backend review`) e "Figma não recuperado não produz comparação inventada" (evidência:
`SKILL.md:71-72` e rubrica `:257` mandam não inventar). É §5.8 e lição 10 na mesma frase. As linhas
de maior risco **têm** prova comportamental real e não estão em questão: escopo amplo e pedido de
correção automática (`scope-response.txt`), URL de produção com fallback de browser
(`production-response.txt`), preflight contra porta morta e contra `PATH` sem `playwright-cli`, e a
sonda WIP com checksum idêntico antes/depois.

**Divergências entre as lentes, mostradas em vez de resolvidas em silêncio:** o Codex classificou o
GREEN inteiro da Task 3 como não discriminante por ter rodado em sandbox read-only; verifiquei os
três arquivos de resposta e isso vale só para `local-response.txt` (a jornada feliz), não para
escopo e produção, que recusaram por decisão da skill e foram reprovados de novo pelos pilotos
reais. O Codex também reportou a ausência de mecanismo que force read-only após o login e o
`none` fixo no rodapé do template; rejeitei os dois — o primeiro é a decisão §11.4 da spec
(execução manual na v0.1) e o segundo é contrariado por `SKILL.md:91-92`, que prevê o run
não conforme.

**Correções — o João aprovou Q-1..Q-10 na íntegra; todas entraram no mesmo dia.**

O 🔴 (Q-1) foi corrigido pela raiz: as duas cláusulas do DoD §10 item 6 foram refeitas como sonda
comportamental em contexto novo, **com frontend e backend em 200** para que nenhuma recusa pudesse
ser atribuída ao ambiente. O agente respondeu `BLOCKED` ao pedido de revisão do backend de
certificação, declarando não ter inspecionado os arquivos; e, ao pedido de comparação com "o Figma
do projeto" sem `fileKey`/`node ID`, recusou explicitamente produzir ou alegar a comparação, sem
listar divergência alguma. Evidência em `.artifacts/ui-review/2026-08-10-task5-probes/`. A linha do
Chrome DevTools na matriz deixou de citar a skill e passou a apontar os três relatórios reais que
registraram a degradação.

Mecanismo (Q-4, Q-6): `preflight.sh` ganhou validação de loopback antes de qualquer `curl` — host
fora de `localhost`/`127.0.0.0/8`/`::1`/`0.0.0.0` retorna `BLOCKED: non-local <label> url`, inclusive
quando `curl` não existe — e passou a reprovar `5xx` como `BLOCKED: unhealthy`. `4xx` continua
passando de propósito: a raiz do backend pode responder `404` num serviço saudável, e bloquear aí
criaria falso positivo. Provado nos quatro modos: ambiente real, URL de produção, loopback saudável
e servidor `503` sintético.

Contrato (Q-3, Q-7, Q-8): enum único `used|complementary_unavailable|not-needed`; separadora GFM na
tabela `## Coverage`; o passo 14 passou a mandar gravar `<run-dir>/report.txt` a partir de uma cópia
do template, nunca editando o arquivo versionado. Q-9: login manual saiu de pré-requisito de
entrada e virou credencial disponível para o passo 7, que é quem o solicita. Q-2: a allowlist do
adaptador e do comando passou a cobrir o workflow que ela roteia (`git branch`, `git rev-parse`,
`mkdir`, `Write`), sem autorizar escrita em código ou dado. Q-10: a lente `frontend-design` e a
precedência "rule vence skill, e o conflito é avisado" voltaram — no adaptador Claude, não na fonte
canônica, porque `frontend-design` é plugin do Claude Code e o Codex não a tem. Q-5: `CLAUDE.md` §4
lista `/lotus-ui-review` como skill, com `/revisar-ui` marcado como entrada legada.

Relatórios antigos em `.artifacts/` **não foram reescritos**: são registro de auditoria, incluindo o
`not-needed` incorreto de `2026-08-10T12-40-35-codex-final/report.txt:9`, que é justamente a prova de
que o enum duplo confundia.

**Estado:** `ready_for_closure`. Nada pendente de decisão. O fechamento não roda automaticamente.

### Sincronização com a main — 2026-08-10

O gate de fechamento parou antes de qualquer arquivamento ao encontrar **dois `active_work_item` em
`ready_for_closure` no mesmo repositório**: este bloco, na worktree `fix-frontend`, e
`turma-habilitacao-listagem`, na worktree central, com uma sessão paralela fechando o segundo em
tempo real. A invariante "existe no máximo um `active_work_item`" estava quebrada e a divergência
não foi resolvida por heurística.

**Decisão do João:** o outro bloco fecha primeiro. Ele fechou e entrou na main pelo PR #34
(`f1d72c5`); esta branch então absorveu a main por merge, preservando o arquivo da main e
reinserindo apenas o que é deste bloco.

Resolução do conflito de `state.md`, campo a campo: a janela rolante de itens fechados é a da main
(`turma-habilitacao-listagem` / `certificacao-lote-e-snapshot` / `certificacao-frontend`), e as
cópias que esta branch carregava de `profundidade-backend-b4-b7` e `certificacao-sprint-4` saíram
por terem rolado para fora da janela — a seção `certificacao-frontend` das duas versões era
idêntica, então nada de histórico se perdeu. `last_completed_work_item` passa a
`turma-habilitacao-listagem`, o fato mais recente. A seção do item ativo, o
`review_findings_approved` e os ponteiros de spec/plano são deste bloco.
`state_basis_commit` passa a `e01f198`, o commit das correções Q-1..Q-10 — `f62885b` deixou de ser
o último artefato durável quando elas foram commitadas. `pendencias.md` e `backlog.md` mesclaram
sem conflito.

### DoD item 3 reprovou no gate e foi corrigido — 2026-08-10

O gate de fechamento rodou o teste literal do plano (Task 4, Step 4) e ele **reprovou**: o adaptador
`.claude/skills/lotus-ui-review/SKILL.md` tinha **18 linhas** contra o teto de 15. Nenhuma correção
do review foi indevida — o estouro veio de Q-2 (justificativa da allowlist) e Q-10 (lente
`frontend-design` e precedência rule-vence-skill), ambas aprovadas pelo João. O que sobrou foi
prosa, não substância.

**Decisão do João: resolver, não registrar desvio.** O adaptador foi comprimido para **15 linhas**
sem perder nenhuma das duas cláusulas — a allowlist continua mapeada passo a passo ao workflow que
roteia, e a precedência da rule sobre `frontend-design` continua explícita. O teto era proxy de
"adaptador fino"; a compressão restaura o número **e** a intenção. Gate refeito depois da correção:
`-le 15` PASS, roteamento PASS, `Condição A|B|C|UI-01` ausente, e a fonte canônica segue
`Skill is valid!`.

Nota para quem for validar o adaptador: `quick_validate.py` **reprova** `.claude/skills/lotus-ui-review/`
por `argument-hint` e `disable-model-invocation`, que não pertencem ao formato canônico. Isso é o
adaptador cumprindo seu papel, não regressão — o DoD item 2 valida a fonte em `.agents/skills/`.

## Antepenúltimo item fechado — 2026-08-10 (`turma-habilitacao-listagem`)

**Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). Backend puro, aprofundamento do Operation nascido da **revisão de arquitetura de
2026-08-09**, com 5 decisões já tomadas por ele. Toca `backend/` → **main tree, sem worktree (P-03)**.

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa** (mesmo caso
de `profundidade-backend-b4-b7` e `profundidade-form-crud`): o item não cita Drive, Notion nem
Figma, e as fontes são o repositório mais as 5 decisões escritas. Dispensa confirmada pelo João na
abertura.

### Quatro medições contra o texto do item, feitas antes de desenhar

1. **O 2N+1 é real e o N foi medido na API:** `GET /api/turmas` no banco de dev custa **15 queries
   para 4 turmas** — 8 de carga (o `withListingData` faz o trabalho dele) e **7 em `files`**. Não é
   2N exato: `isHabilitada()` curto-circuita em `status !== EmAndamento`, então turma **em
   andamento** custa 2 queries (a mesma pergunta feita duas vezes, uma por `habilitada` e outra por
   `missing_document_types`) e turma **concluída** custa 1.
2. **A decisão 1, ao pé da letra, muda comportamento.** Hoje `isHabilitada()` é
   `status === EmAndamento && missingTypes() === []`; o item escreve "literalmente
   `missingTypes() === []`". Sem o gate de status, **toda turma concluída passaria a responder
   `habilitada: true`** (concluir exige documentação completa, então são todas), contra o teste vivo
   `TurmaHabilitacaoServiceTest::test_turma_concluida_nao_e_habilitada`.
3. **O front sobreviveria à mudança, mas o payload não:** `turmaDisplayStatus` checa `concluida`
   primeiro e `ConcludePanel`/`TurmaDocuments` guardam por `!concluida` antes de ler `habilitada` —
   nenhuma tela muda. O contrato HTTP mudaria de valor, e o item promete que nada muda.
4. **`preventLazyLoading` não enxerga este N+1** (a decisão 5 está certa): `$turma->files()->…` é
   query **na relação**, não lazy-load de relação, e é por isso que o `ContratanteEagerLoadTest`
   passa hoje com o 2N+1 vivo.

**Decisão do João na abertura (D-B1): `habilitada` de turma concluída continua `false`.** O VO
carrega o status junto e a pergunta segue sendo `status === EmAndamento && missing === []` — "uma
pergunta, uma resposta" passa a significar que a **resposta é o VO**, não que o gate de status
desaparece. Zero mudança de payload; o teste vivo continua sendo guarda de regressão.

### Brainstorming de 2026-08-10 — spec aprovada, duas decisões novas

As 5 decisões do item entraram sem reabertura. Três pontos estavam abertos e o João fechou os três:
**D-B1** (acima); **D-B2** — a guarda da decisão 5 é **contagem de queries** (`DB::listen` sobre
`from "files"` no `GET /api/turmas`, molde do `CertificateListingTest:368`), não
`preventLazyLoading`, porque contagem pega duas classes de regressão em vez de uma — perder o
eager-load **e** reintroduzir query por linha por outro caminho; **D-B3** — o
`?? $turma->enrollments()->count()` do `enrolled_count` **entra no corte** e morre, com
`loadListingData()` garantindo o `loadCount`. É a mesma classe de defeito do 2N+1 principal (query
por linha escondida atrás de um fallback), no mesmo `fromModel`.

**Uma medição a mais, achada ao ler o código e não prevista pelo item:** o `whereIn` dos três tipos
obrigatórios está soletrado em **dois** lugares — `TurmaHabilitacaoService::missingTypes()` e
`TurmaDocumentController::index()`. A relação nomeada da decisão 2 não serve só ao eager-load; ela
dá dono único à pergunta, e o `index` do controller de documentos passa a consumi-la.

Spec: `docs/superpowers/specs/archive/2026-08-10-turma-habilitacao-listagem-design.md`. Review declarado
**BAIXO RISCO** (zero `generated.ts`, locales, auth/RBAC, schema, dinheiro e rota pública;
`executor: claude`) → só lente Claude, sem segunda frente do Codex. Backend puro → **main tree, sem
worktree (P-03)**; zero schema, ADR/DER não abrem.

### Plano escrito em 2026-08-10 — 6 tasks (0–5), `executor: claude`

`docs/superpowers/plans/archive/2026-08-10-turma-habilitacao-listagem.md`. Branch
`refactor/turma-habilitacao-listagem`, já criada a partir de `4ae4c91`, com os commits de seleção
(`31576c7`) e da spec (`cb4c626`) dentro dela.

**Baseline reconferida no próprio `4ae4c91`, não herdada do state anterior:** backend **500 passed,
1 skipped (1858 assertions)** — o mesmo placar de `d01c279`, como esperado de um merge sem código.

Ordem das tasks: 0 baseline → 1 `Turma::documentacaoObrigatoria()` + `TurmaDocumentController::index`
consumindo a relação (morre a 2ª cópia do `whereIn`) → 2 `HabilitacaoStatus` + `for()`, com os dois
chamadores migrados e a API pública antiga morta → 3 seam de listagem (`LISTING`,
`loadListingData()`, `present()` sem `findOrFail`, `UpdateTurmaAction` sem carga parcial,
`enrolled_count` sem `??`) → 4 guarda de contagem com dois mutantes → 5 gate contra a API real.

A escrita do plano fixou **dois pontos que a spec deixava em aberto, declarados no §Desvios** em vez
de silenciados (lição 13):

- **D-P1 — o mutante do "chamar `for()` duas vezes" NÃO reproduz, e o plano diz isso.** Com a
  relação eager-loaded a segunda leitura é de memória e não custa query: a classe de defeito deixou
  de existir em vez de passar a ser vigiada. A guarda de contagem protege o **eager-load**, que é o
  que pode regredir. O segundo mutante do plano é outro: tirar o `loadCount` do `loadListingData()`
  faz o `TurmaShowTest` **reprovar alto** — sem a D-B3 esse mesmo mutante ficaria verde pagando uma
  query por turma em silêncio, e é essa diferença que a D-B3 compra.
- **D-P2 — a guarda mora no `TurmaQueryBuilderTest`**, não em arquivo novo: o assunto do arquivo é a
  projeção de listagem, e é o precedente do `CertificateListingTest`, que guarda a contagem dentro
  do próprio arquivo da listagem.

### Execução iniciada em 2026-08-10 — `/executar-bloco`, `subagent-driven-development`

Main tree, sem worktree (P-03). **Task 0 provada em `a4f550a`:** backend **500 passed, 1 skipped
(1858 assertions)** — bate com o baseline do plano; `typescript:transform` sem diff em
`generated.ts`; `git status --porcelain` vazio.

**Um achado do pré-flight, aritmético, resolvido sem reabrir o plano (D-E1):** os placares esperados
das Tasks 2 e 3 (`500 passed`) e da Task 4 (`501 passed, 1865 assertions`) **não somam o teste que a
própria Task 1 acrescenta** ao `TurmaModelTest` (+1 teste, +1 asserção). Os números corretos passam a
ser **501 passed / 1859 assertions** nas Tasks 1–3 e **502 passed / 1866 assertions** na Task 4 e no
gate. Nenhuma asserção, nenhum teste e nenhum comportamento do plano muda — só a conta.

### Tasks 1–4 entregues — uma revisão de task por entrega

Commits, do base `a4f550a`: `4d202e8` (a relação nomeada `documentacaoObrigatoria`, com o
`TurmaDocumentController::index` consumindo-a e a 2ª cópia do `whereIn` morta), `80d5c24` (o VO
`HabilitacaoStatus` e o `for()` como única API pública do service), `2fe0c71` (o seam de listagem:
`LISTING`, `loadListingData()`, `present()` sem `findOrFail`, `enrolled_count` sem `??`) + `c97b373`
(fix do review da Task 3), `a23e5d3` (a guarda de contagem).

**Um desvio de ordenação, decidido pelo João no meio da Task 2 (D-E2).** A linha
`'documentacaoObrigatoria'` do eager-load foi **antecipada** da Task 3 para a Task 2. O motivo foi
medido, não suposto: o service passou a ler a relação como **propriedade**, e sem a carga a listagem
viola `Model::preventLazyLoading()` no `ContratanteEagerLoadTest` (RED visto; causa confirmada por
`git stash`, não por leitura). O resto do seam ficou na Task 3, como o plano previa.

**Consequência que corrige a medição 4 da abertura, e é ganho:** `preventLazyLoading` **não**
enxergava a forma antiga (`$turma->files()->…`, query feita **na** relação); enxerga a forma nova.
O bloco ganha uma segunda guarda de graça, além da contagem da Task 4.

**Um achado Important do review da Task 3, aceito e corrigido em `c97b373`:** o DoD literal da task
("nenhuma Action pré-carrega relação") e o docblock novo do `loadListingData()` eram **falsos** —
`DesignateRedatorAction` e `RemoveRedatorAction` ainda faziam `load('redatores.user')`, que são
exatamente "as duas rotas de redator" que o próprio DoD nomeia. O plano esqueceu de listar os 2
arquivos. Seguro porque `present()` recarrega pelo `LISTING` com `load()` (não `loadMissing()`) e
nenhum consumidor dependia da carga — o único outro chamador, `OperationDemoSeeder:502`, descarta o
retorno.

**Os dois mutantes da Task 4 foram vistos vermelhos com a mensagem literal, pelo implementador e de
novo pelo revisor**, e revertidos sem resíduo: sem `'documentacaoObrigatoria'` no `LISTING`,
`Failed asserting that 2 is identical to 1.`; sem o `loadCount('enrollments')`,
`TurmaData::__construct(): Argument #15 ($enrolled_count) must be of type
Spatie\LaravelData\Optional|int, null given` — a diferença que a D-B3 compra.

### Task 5 — o gate do bloco (2026-08-10)

Executado por mim direto: é a prova do DoD, e o DoD pede comportamento contra a API real.

**Ferramentas.** Backend **502 passed, 1 skipped (1866 assertions)** — +2 testes / +8 asserções sobre
o baseline 500/1858 de `4ae4c91`, e exatamente o número que a D-E1 previu. `typescript:transform`
rodado de novo: `generated.ts` **sem diff** — nenhum DTO mudou de forma, então o frontend não é
tocado. `git diff main...HEAD -- backend/database/` **vazio** (zero schema) e
`git diff main...HEAD -- frontend/` **vazio**. Pint `--test` **`passed`** nos **15** `.php` do bloco
(a lista do plano tinha 13; os 2 que faltavam são `Designate/RemoveRedatorAction`, que só entraram
no diff com o `c97b373`).

**Código morto e leis §5.** A API antiga do service morreu — `grep` por `isHabilitada($`/
`missingTypes($` em `backend/app/` devolve **vazio**. O `whereIn` dos três tipos obrigatórios tem
**um dono só**: um único hit, dentro da própria relação (`Turma.php:88`). Zero `Repository` real
(o único hit é o comentário `não Repository — ADR-02` do `TurmaQueryBuilder`), zero `abort(` em
`Domains/Operation/`.

**E2e contra a API real**, sessão Sanctum por cookie + CSRF (lição 12: `Origin` e `Accept`
obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login, que o rotaciona).

1. **`GET /api/turmas` → 200, 4 turmas**, cada uma coerente com os documentos que o seed criou,
   conferidos antes na tabela `files`: turma 1 (só `MANUAL`) `habilitada: false`,
   `missing: ['PRUEBAS','EVALUACION_REDATOR']`; turma 2 (os 3 tipos, em andamento) `true`, `[]`;
   turma 4 (`MANUAL`+`PRUEBAS`) `false`, `['EVALUACION_REDATOR']`.
2. **A D-B1 medida onde o usuário vive:** a turma **3** — concluída, com os três tipos presentes —
   responde **`habilitada: false`** com `missing_document_types: []`. É o valor que o gate de status
   dentro do VO preserva, e a prova de que o contrato não mudou de valor.
3. **A contagem medida na API, não só na suíte.** `general_log` do MySQL ligado em `TABLE`, truncado,
   um `GET /api/turmas`: **1 query em `files`** para as 4 turmas —
   `select * from files where type in ('MANUAL','PRUEBAS','EVALUACION_REDATOR') and
   files.fileable_id in (1,2,3,4) …`. As demais consultas da listagem são **8** (turmas, redatores,
   users, courses, quotes, budgets, clients, users), então **8 + 1 = 9**, contra os **8 + 7 = 15**
   medidos na abertura no **mesmo banco**. A decomposição bate com a da spec linha a linha.
4. **`GET /api/turmas/4` → 200** com `enrolled_count: 10` **inteiro** — o caminho sem o `??`, que a
   D-B3 matou.
5. **`GET /api/turmas/4/documents` → 200** com `[(16,'MANUAL'), (17,'PRUEBAS')]`, e a turma 3 com os
   4 registros dela (incluindo o `PRUEBAS` duplicado do seed) — a relação substituiu o `whereIn` do
   controller sem mudar uma linha da resposta.
6. **`POST /api/turmas/4/documents` com o `EVALUACION_REDATOR` que faltava → 201**, e o
   `GET /api/turmas` seguinte mostra a turma 4 em **`habilitada: true`, `missing: []`**. A leitura
   pela relação **não congelou** a resposta.

**Prova extra, de graça:** o `DELETE` do documento recém-subido devolveu **204** e a listagem voltou
a `habilitada: false`, `['EVALUACION_REDATOR']` — soft-delete não conta, medido na API real e não só
no teste. Serviu também para devolver o banco ao cenário canônico de habilitação.

**Desvio declarado contra o Step 3 do plano — o `migrate:fresh --seed` NÃO foi rodado.** O banco de
dev carrega o `LOT-2026-1001` com o `aluno.name` **corrompido de propósito**, deixado pelo bloco
anterior para o **checkpoint visual do João**, que segue pendente; recriar o cenário custaria um
`UPDATE … JSON_SET` a mais, mas apagá-lo sem pedir seria destruir trabalho dele. As 4 turmas e os
documentos foram conferidos direto na tabela **antes** do e2e e estavam no cenário canônico do seed,
e é **este mesmo banco** onde os 7 da abertura foram medidos — não lavar torna a comparação mais
forte, não mais fraca.

**Um erro do plano, achado ao executar:** o Step 3 escreve `GET /api/turmas/{id}/documentos`; a rota
real é `documents` (`Domains/Operation/routes.php:27`). Erro de texto do plano, não do código —
`documentos` devolve 404 porque nunca existiu.

**O que o gate NÃO provou, sem maquiagem:** nada foi visto renderizado. O bloco é backend puro e não
tocou uma linha de `frontend/` — o contrato HTTP saiu idêntico em forma e em valor, então não há
tela nova a conferir. A `general_log` foi desligada e truncada ao fim da medição.

**Pendências revisadas:** nenhuma venceu gatilho, nenhuma fechou, nenhuma nasceu. P-03 (main tree)
segue sem dois blocos de backend em paralelo e o bloco a respeitou; P-04 reavalia **2026-08-15**;
P-15, P-23, P-25 e P-26 revisam **2026-09-30**. **Anotado sem virar pendência:** a P-09 (3 tipos de
documento contra os 4 do Figma) fica **mais barata de fechar** por causa deste bloco — o `whereIn`
dos tipos obrigatórios saiu de dois lugares para um, dentro da relação; a decisão de negócio
continua com a Lotus e o gatilho segue de pé.

**Estado do banco de dev:** cenário do seed, mais as mutações do bloco anterior (template v1 do curso
2, certificados `LOT-2026-1000`…`1003` com o `LOT-2026-1001` corrompido de propósito), mais o
arquivo `18` da turma 4 **soft-deletado** com o objeto correspondente vivo no MinIO — que é o
comportamento prescrito (`migrations.md`: delete de doc apaga o metadado, o arquivo fica no bucket).

**Minor abertos, para o review final do branch triar:**

- **M-1** — `HabilitacaoStatus` tem as propriedades `private` mas não `readonly`: o VO é imutável por
  convenção, não pela engine.
- **M-2** — o docblock do `HabilitacaoStatus` perdeu a nota "(soft-delete não conta)" que o service
  antigo carregava; o comportamento continua certo e agora está provado na API, mas o texto sumiu.
- **M-3** — `TurmaQueryBuilderTest`: `private int $seq = 0;` declarado no meio da classe, não no topo.
- **M-4** — `makeTurmaComDocs()` duplica quase inteira a cadeia comercial de
  `ContratanteEagerLoadTest::makeCadeia()`. Com duas ocorrências, WET é razoável; numa terceira, vale
  extrair um builder (precedente: `IssuableEnrollmentBuilder`).

Evidência task a task em `.superpowers/sdd/progress.md`. Review declarado **BAIXO RISCO** pela spec
(zero `generated.ts`, locales, auth/RBAC, schema, dinheiro e rota pública) → **uma frente só, lente
Claude**, sem segunda frente do Codex.

**Divergência de nomenclatura resolvida:** o Step 5 do plano escreve
`next_action: request_block_review`; o `/executar-bloco` e o precedente dos blocos anteriores usam
`request_code_review`, que é o valor gravado aqui.

### Review de sprint — 2026-08-10: uma frente, 4 achados, todos aprovados e corrigidos

**BAIXO RISCO** conforme o §8 da spec (zero `generated.ts`, locales, auth/RBAC, schema, dinheiro e
rota pública; `executor: claude`) → **lente Claude com o gabarito do projeto, sem segunda frente do
Codex**. Escopo: os 15 `.php` de `main...HEAD`. Ferramentas **reconferidas antes de revisar, não
herdadas do gate**: suíte **502 passed, 1 skipped (1866 assertions)**, Pint `--test` **`passed`** nos
15. **Órfãos zero** — `HabilitacaoStatus` 2 consumidores (via `for()`), `for()` 2,
`documentacaoObrigatoria` 3 (`LISTING`, service, `TurmaDocumentController::index`),
`loadListingData()` 1, `LISTING` 2; a API antiga do service morta (`grep` por
`isHabilitada($`/`missingTypes($` em `app/` vazio). **Leis §5 limpas.**

**O achado que o gate não podia ter pego (Q-1 🟡)** — o gate da RN-16 no `ConcludeTurmaAction`
decidia sobre a relação **em cache**. O bloco trocou "query na relação" por "leitura de relação", e
`for()` lê `documentacaoObrigatoria` como **propriedade**: com o model já carregado (é exatamente o
que `loadListingData()` faz, no mesmo request), um documento arquivado depois daquela carga deixava o
cache dizer "completa" e **concluía a turma** — escrita **TERMINAL** (D5), que habilita emissão de
certificado. **Provado nos dois sentidos com sonda temporária (lição 10)**: com o código do bloco a
conclusão passa; com os dois arquivos vindos de `main`, recusa com `Documentación obligatoria
incompleta (RN-16). Falta: MANUAL.` **Não era bug vivo** — os 2 chamadores (route-binding do
`conclude`, `OperationDemoSeeder:509`) entregam turma sem a relação —, mas é regressão latente a uma
linha de distância. O §5 da spec declarava o cache do VO como consequência de **leitura**
("perguntar de novo no mesmo objeto"); o impacto medido é de **escrita**, e essa parte não estava
coberta pela decisão registrada. Corrigido com `$turma->load('documentacaoObrigatoria')` **dentro da
transação**, declarado no ponto que exige a leitura fresca, mais guarda nova no `ConcludeTurmaTest`
**vista vermelha primeiro** (`A conclusão deveria recusar: o MANUAL foi arquivado depois da carga.`).
O docblock do service, que afirmava ser a relação não-carregada o mecanismo da leitura fresca do
`conclude`, virou falso com o fix e foi reescrito junto.

**Os outros três, todos 🟢:**

- **Q-2** (o M-1 herdado) — as propriedades do `HabilitacaoStatus` eram `private` sem `readonly`: VO
  imutável por convenção, não pela engine. Agora `private readonly`, como o precedente
  `AcademicResult`/`EnrollOutcome`.
- **Q-3** — o bloco matou a 2ª cópia do `whereIn`, mas deixou a 2ª cópia da **lista**:
  `array_column(TurmaDocumentType::cases(), 'value')` em `Turma.php:88` **e**
  `TurmaHabilitacaoService:26`. Nasce `TurmaDocumentType::values(): array<string>`, e a lista canônica
  passa a ter um dono só — o mesmo movimento que a relação nomeada fez pela pergunta.
- **Q-4** — a D-B3 matou o `?? $turma->enrollments()->count()` de propósito (falhar alto), mas o
  contrato novo não estava escrito em lugar nenhum: quem projetar por caminho que não passe por
  `withListingData()`/`loadListingData()` leva `TypeError` em runtime sem saber a causa. Docblock no
  `fromModel` nomeando os dois.

**Não viraram achado, com o motivo medido:** a nota "(soft-delete não conta)" **existe** — mudou de
dono junto com a regra, para o docblock de `Turma::documentacaoObrigatoria()` (era o M-2); o
`private int $seq = 0;` no meio do `TurmaQueryBuilderTest` é estilo, e o Pint passa (M-3); o
`makeTurmaComDocs()` duplicando o `ContratanteEagerLoadTest::makeCadeia()` é **decisão registrada** —
o `CreatesDomainRecords` documenta que Budget/Quote/Turma ficam fora de propósito (H.4.9, spec D8), e
o critério já fixado é "duas ocorrências, WET razoável; na terceira, extrair" (M-4); e o cache do VO
no caminho de **leitura** (`GET`) é consequência declarada no §5 da spec.

**Placar pós-correção: 503 passed, 1 skipped (1868 assertions)** — +1 teste / +2 asserções sobre os
502/1866 que eu reconferi antes de revisar. Pint `passed` nos 7 arquivos do fix;
`typescript:transform` rodado de novo, `generated.ts` **sem diff**. Correções no commit `a8ddb80`.

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito contra a API real, não herdado do gate de execução:** as correções Q-1..Q-4
entraram em `a8ddb80`, depois do e2e da Task 5, e o Q-1 mexeu exatamente no caminho que o gate
exercita — o `conclude`. Sessão Sanctum por cookie + CSRF (lição 12: `Origin` e `Accept`
obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login).

1. **`GET /api/turmas` → 200, 4 turmas**, cada uma coerente com a tabela `files` conferida **antes**
   da chamada: turma 1 (só `MANUAL`) `habilitada: false` / `['PRUEBAS','EVALUACION_REDATOR']`; turma 2
   (os 3 tipos, em andamento) `true` / `[]`; turma 4 (`MANUAL`+`PRUEBAS`) `false` /
   `['EVALUACION_REDATOR']`. `enrolled_count` inteiro nas quatro — o caminho sem o `??` (D-B3).
2. **A D-B1 medida onde o usuário vive:** a turma **3** — concluída, com os três tipos presentes —
   responde **`habilitada: false`** com `missing_document_types: []`.
3. **A contagem medida na API, não só na suíte.** `general_log` do MySQL em `TABLE`, truncada, um
   `GET /api/turmas`: **1 query em `files`** para as 4 turmas — `select * from files where type in
   ('MANUAL','PRUEBAS','EVALUACION_REDATOR') and files.fileable_id in (1,2,3,4) …`. A listagem
   inteira são **9** (turmas, redatores, users, courses, quotes, budgets, clients, users, files),
   contra os **15** medidos na abertura **no mesmo banco**; a decomposição bate com a da spec linha a
   linha. **Achado de método, registrado:** o `general_log` grava as queries do Laravel como
   `Prepare`/`Execute`, não como `command_type='Query'` — filtrar por `Query` devolve zero e leria
   como "nenhuma consulta", que é falso negativo perfeito.
4. **O caminho que a Q-1 tocou, exercitado nos dois sentidos pela API:** `POST /api/turmas/1/conclude`
   → **422** `application/problem+json` com `Documentación obligatoria incompleta (RN-16). Falta:
   PRUEBAS, EVALUACION_REDATOR.`; `POST /api/turmas/2/conclude` (documentação completa) → **200**
   com `status: concluida`, `habilitada: false`, `concluded_at` preenchido e `enrolled_count: 8`. O
   `load()` novo dentro da transação não fechou o caminho feliz.
5. **`GET /api/turmas/{id}/documents` → 200** pela relação: turma 3 com os 4 registros dela
   (incluindo o `PRUEBAS` duplicado do seed) e turma 4 com `[(16,'MANUAL'), (17,'PRUEBAS')]` — o
   arquivo `18`, soft-deletado, continua fora.

**Demais itens:** suíte **503 passed, 1 skipped (1868 assertions)** · `pnpm lint` e `pnpm build`
verdes · Pint `--test` **`passed`** nos **17** `.php` do bloco (eram 15 no review; o fix acrescentou
`TurmaDocumentType.php` e `ConcludeTurmaTest.php`) · `typescript:transform` **sem diff** em
`generated.ts` · `git diff main...HEAD -- frontend/` e `-- backend/database/` **vazios** · código
morto zero (o único arquivo novo é `HabilitacaoStatus.php`, com consumidor; nenhum `TODO`/`FIXME`
novo) · leis §5 limpas (zero `Repository`, zero `abort(` em `Domains/Operation/`, zero delete por
query builder no diff, `generated.ts` intocado).

**O que o gate NÃO provou, sem maquiagem:** **nada foi visto renderizado.** O bloco é backend puro,
não tocou uma linha de `frontend/`, e o contrato HTTP saiu idêntico em forma e em valor — não há tela
nova a conferir. E a Q-1 em si **não é alcançável por HTTP**: o `conclude` recebe o model do
route-binding, sem relação carregada, então a prova do defeito e do fix vive na suíte (sonda + guarda
vista vermelha); o que a API prova é que o gate segue correto nos dois sentidos depois da mudança.

**Duas mutações declaradas no banco de dev.** O `migrate:fresh --seed` **não** foi rodado: o banco
carrega o `LOT-2026-1001` com o `aluno.name` corrompido de propósito, deixado para o **checkpoint
visual do João**, que segue pendente — e é **este mesmo banco** onde os 7 da abertura foram medidos,
o que torna a comparação mais forte, não mais fraca. A turma 2, concluída pela API no item 4, foi
devolvida a `em_andamento` por `UPDATE` direto: a conclusão é **terminal** e não tem rota de
reversão, então a auditoria guarda o rastro da conclusão e **não** o da reversão. O `general_log` foi
desligado e truncado ao fim da medição.

**Pendências revisadas:** nenhuma venceu gatilho (P-04 reavalia **2026-08-15**; P-03 segue sem dois
blocos de backend em paralelo e o bloco a respeitou; P-15, P-23, P-25 e P-26 revisam **2026-09-30**),
nenhuma fechou, nenhuma nasceu. **Uma foi corrigida por ter ficado imprecisa por causa deste bloco:**
a P-09 dizia que mudar de 3 para 4 tipos de documento exige alterar o `TurmaHabilitacaoService` — não
exige mais, porque o service consome `TurmaDocumentType::values()`; o custo virou uma linha no enum, e
a decisão de negócio segue com a Lotus.

**Arquivamento:** plano → `plans/archive/2026-08-10-turma-habilitacao-listagem.md`; spec →
`specs/archive/2026-08-10-turma-habilitacao-listagem-design.md` (não é compartilhada: nenhum item do
backlog a consome). Entrega registrada no `progress.md` (a de 2026-08-03/`zerar-catraca` desceu ao
`progress-archive.md` para manter dez); item 4 removido do `backlog.md`, que fica com 3 itens.

**Estado do banco de dev:** cenário do seed, mais as mutações do bloco anterior (template v1 do curso
2, certificados `LOT-2026-1000`…`1003` com o `LOT-2026-1001` corrompido de propósito), mais o arquivo
`18` da turma 4 **soft-deletado** com o objeto correspondente vivo no MinIO — comportamento prescrito
(`migrations.md`: delete de doc apaga o metadado, o arquivo fica no bucket). As 4 turmas voltaram ao
cenário canônico. `migrate:fresh --seed` devolve tudo.
