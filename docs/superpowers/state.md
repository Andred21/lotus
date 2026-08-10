---
schema_version: 1
active_feature: documentos-oficiais
active_work_item: documentos-oficiais-template-e-docx
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
resume_state: null
active_spec: docs/superpowers/specs/2026-08-10-documentos-oficiais-template-e-docx-design.md
active_plan: docs/superpowers/plans/2026-08-10-documentos-oficiais-template-e-docx.md
context_packet: null
blocker: null
review_findings_approved: null
last_completed_work_item: hardening-revisao-ui-assistida
state_basis_commit: 8ee1d9e
updated_at: 2026-08-10T22:10:00-03:00
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

## Item ativo — `documentos-oficiais-template-e-docx`

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

## Último item fechado — 2026-08-10 (`hardening-revisao-ui-assistida`)

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

## Penúltimo item fechado — 2026-08-10 (`turma-habilitacao-listagem`)

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

## Antepenúltimo item fechado — 2026-08-10 (`certificacao-lote-e-snapshot`)

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito contra a API real, não herdado do gate de execução:** as correções Q-1..Q-6
entraram em `d01c279`, depois do e2e da Task 6, e mexeram exatamente nos caminhos que o gate exercita
— `show`, listagem e `ProblemDetails`. `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie +
CSRF (lição 12: `Origin` e `Accept` obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login).

**A cadeia do §6 da spec, pela API:**

1. **Porta destravada pela própria API:** o seed fresco deixa a turma 3 com
   `emission_blocked: 'sin_plantilla'`; `PUT /api/courses/2` criando o template v1 com
   `layout_config.city = 'Santiago'` e `validity_months: 24` zerou o bloqueio (`null`). Os `modules`
   foram **omitidos** do payload de propósito — coleção nested `Optional`, ausente não mexe — e os 2
   voltaram intactos. O primeiro ensaio de emissão levou **422** por comportamento correto, não por
   defeito: `redator_id: 1` não é o designado da turma (`El redactor no está designado en esta
   clase.`), e o painel diz que o designado é o 3.
2. **Emissão individual** em `enrollments/21` → **201 `LOT-2026-1000`**, `snapshot_ok: true`.
3. **Lote `[22, 21, 23, 24]`** com a falha provocada (21 já tinha vigente) → **200** com relatório
   por item: `LOT-2026-1001`/`1002`/`1003` **contíguos**, sem buraco onde o item falho ficou — a
   recusa **não consumiu número de sequência** —, e a falha **nomeada** (`Ya existe un certificado
   vigente para esta matrícula.`). `[26, 26]` → **422** problem+json, o `distinct` vivo.
4. **`aluno.name` corrompido direto na coluna** do certificado 2 (`UPDATE … JSON_SET`), com o resto
   do JSON conferido por **MD5 antes e depois** como byte-idêntico (`JSON_REMOVE` do campo mexido dá
   o mesmo hash nos dois lados). As seis chamadas:

   | Chamada | Resultado |
   |---|---|
   | `GET /api/certificates` | **200**, `snapshot_ok: false` **só** na linha corrompida (as outras 3 em `true`) |
   | `GET /api/certificates/2` (corrompido) | **500** `application/problem+json`, `detail` nomeando `LOT-2026-1001` **e** o campo faltante |
   | `GET /api/certificates/2/pdf` | **500** problem+json, mesmo `detail` |
   | `GET /api/publico/certificados/{uuid}` **sem cookie** | **500** problem+json, mesmo `detail` |
   | `GET /api/certificates/1` (são) | **200**, `snapshot_ok: true` |
   | `GET /api/certificates/1/pdf` (são) | **200 `application/pdf`**, 40.119 bytes |

   Controle extra: a rota pública do certificado **são**, sem cookie, segue **200** com o payload
   completo. O gate único não fechou o caminho feliz.

**A prova que nenhum gate anterior tinha feito, e que o Q-1 obrigou — `APP_DEBUG=false`.** O achado
existe porque `backend/.env` tem `APP_DEBUG=true` e não há `.env.testing`: suíte e e2e provavam a D8
num caminho que a produção não percorre. Com o `.env` posto em `APP_DEBUG=false` e `config:clear`,
medido **nos dois sentidos** (lição 10):

- `GET /api/certificates/2` e a rota pública sem cookie seguem devolvendo o `detail` **inteiro**
  (`El certificado LOT-2026-1001 no puede presentarse: su documento congelado no tiene los campos
  aluno.name.`) — o `PublicDetail` atravessa a máscara, que é a promessa da D8;
- um 500 **comum**, provocado parando o container `gotenberg` e pedindo o PDF do certificado **são**,
  continua **mascarado** com `Ocorreu um erro inesperado. Tente novamente.` — o default não foi
  afrouxado para todo mundo.

`gotenberg` religado e `.env` restaurado no mesmo passe, com o PDF são voltando a **200
`application/pdf`, 40.119 bytes**; `git status` limpo (o `.env` é ignorado, e foi conferido).

**Demais itens:** suíte **500 passed, 1 skipped (1858 assertions)** · frontend **13 arquivos / 47
testes**, `pnpm lint` e `pnpm build` verdes · `typescript:transform` **sem diff** em `generated.ts` ·
`git diff 7227d04..HEAD -- backend/database/` **vazio** (zero schema, como a spec previu) · código
morto zero (nenhum `.gitkeep`, nenhum `TODO`/`FIXME` novo; os 6 símbolos nascidos no bloco todos com
consumidor) · leis §5 limpas (zero `Repository`, zero import cross-feature, zero PrimeReact direto em
`features/`; o único `abort()` de `app/` é o 404 pré-existente do `PublicCertificateController`, que
o bloco não tocou).

**Pint com uma exceção honesta:** `passed` em 13 dos 14 `.php` do bloco. `ProblemDetails.php`
reprova, e **já reprovava na versão base** — conferido rodando `pint --test` sobre o arquivo extraído
de `7227d04`, com a mesma lista de 6 fixers (`ordered_imports`, `binary_operator_spaces`,
`single_blank_line_at_eof`, …). É dívida de estilo pré-existente num arquivo que o bloco só tocou em
8 linhas; reformatá-lo inteiro seria ruído de diff (lição 9).

**O que o gate NÃO provou, sem maquiagem:** **a tag da linha corrompida não foi vista renderizada.**
O host WSL não tem browser utilizável (Playwright sem as bibliotecas de sistema, limitação herdada de
2026-08-08). A prova aqui é o `snapshot_ok` na API real, o `pnpm build`/`pnpm lint` e a paridade das
três locales; **o checkpoint visual fica com o João.**

**Pendências revisadas:** nenhuma venceu gatilho (P-04 reavalia **2026-08-15**; P-03 segue sem dois
blocos de backend em paralelo; P-15, P-23, P-25 e P-26 revisam **2026-09-30**), nenhuma fechou,
nenhuma nasceu — o bloco não deixou doc nem mecanismo afirmando o que o código não faz. **Fica
anotado para decisão do João, sem virar pendência:** a suíte roda com `APP_DEBUG=true` herdado do
`.env`, e a única guarda do caminho mascarado é o `config(['app.debug' => false])` que o Q-1 escreveu
dentro do próprio teste; um `.env.testing` fixando o modo produção é decisão de infra dele, não do
agente.

**Arquivamento:** plano → `plans/archive/2026-08-10-certificacao-lote-e-snapshot.md`; spec →
`specs/archive/2026-08-10-certificacao-lote-e-snapshot-design.md` (não é compartilhada: o item 5 do
backlog, `turma-habilitacao-listagem`, tem decisões próprias e não a consome). Entrega registrada no
`progress.md` (a de 2026-08-02/`operation` desceu ao `progress-archive.md` para manter dez); item 4
removido do `backlog.md`, com o `turma-habilitacao-listagem` renumerado para 4.

**Estado do banco de dev:** `migrate:fresh --seed` do gate mais as mutações do e2e (template v1 do
curso 2 com `city: Santiago` e `validity_months: 24`, certificados `LOT-2026-1000`…`1003`, e o
`aluno.name` do `LOT-2026-1001` **deixado corrompido de propósito** para o checkpoint visual do João
encontrar a linha marcada). Nada é fixture de código; `migrate:fresh --seed` devolve o cenário
canônico.

**Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). O item nasceu da **revisão de arquitetura de 2026-08-09**, com as decisões já tomadas por
ele na entrevista — a edição do `backlog.md` que criou os itens 4 e 5 estava na árvore sem commit e
entra no commit da seleção, porque é o artefato que a prova.

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa** (mesmo caso
de `profundidade-backend-b4-b7` e `profundidade-form-crud`): o item não cita Drive, Notion nem
Figma, e as fontes são o repositório mais as decisões escritas. Dispensa confirmada pelo João na
abertura.

**Uma divergência do item foi levantada e fechada antes do desenho:** o texto diz "13 decisões já
tomadas na entrevista", e o backlog escreve 6 aqui (mais 5 no item 5, total 11). **Decisão do João:
as 6 escritas são tudo** — o "13" contava a entrevista inteira, incluindo o que virou recorte e
fora-de-escopo. Nenhuma decisão perdida; a spec desenha sobre as 6 mais o que o código mediu.

**Cinco medições contra o texto do item, feitas antes de desenhar:** (1) `missingRequiredFields()`
tem exatamente 2 consumidores, ambos com a política copiada — a D4 bate com o repo; (2) **`show` não
checa snapshot hoje**, então "falha alto" é comportamento novo, não refactor, e `index` idem; (3) a
D3 muda comportamento no lote (`->first()` vira `implode(' ')`; hoje as 6 portas lançam uma mensagem
cada, então a diferença só aparece com recusa de 2+ razões); (4) `App\Shared\Validation` não existe;
(5) o Action da D1 fica **sem `DB::transaction`** de propósito — exceção declarada à regra de Action
da `backend-ddd.md`, e é o ponto do bloco.

### Brainstorming de 2026-08-10 — spec aprovada, três decisões novas

As 6 decisões da entrevista entraram sem reabertura. Só três pontos estavam abertos, e o João
fechou os três: **D7** — `missingRequiredFields()` vira privado, com `isPresentable(): bool` e
`assertPresentable(string $codigo)` adjacentes no molde `assert*`/`constrain*` do
`CertificateEligibility` (B1); **D8** — a linha corrompida **mantém o botão Ver**, que cai no estado
de erro já existente do `CertificateViewDialog` — é onde o suporte lê quais campos faltam; **D9** —
a marcação é **tag de estado** (`AppTag severity="danger"` no lugar do Vigente/Vencido), porque com
o documento corrompido o estado da linha é justamente o que não dá para afirmar.

**Consequência declarada na spec, não descoberta depois:** "corrompido" **não** vira um quinto
`CertDerivedStatus` — promovê-lo contaminaria o dropdown de filtro, os quatro contadores do rodapé e
o `CertificateViewDialog`. Filtrar por "Vigente" continua trazendo a linha corrompida cujas datas
dizem vigente. Corrupção é defeito do documento, não estado dele.

Spec: `docs/superpowers/specs/archive/2026-08-10-certificacao-lote-e-snapshot-design.md`. Review declarado
**ALTO RISCO** (peso legal + rota pública + `generated.ts`) → duas frentes em `ready_for_review`.
Backend mais um arquivo de frontend → **main tree, sem worktree (P-03)**; zero schema, ADR/DER não
abrem.

### Plano escrito em 2026-08-10 — 7 tasks (0–6), `executor: claude`

`docs/superpowers/plans/archive/2026-08-10-certificacao-lote-e-snapshot.md`. Branch prevista:
`refactor/certificacao-lote-e-snapshot`, a partir de `eca31e4`.

A escrita do plano achou **quatro desvios contra a spec aprovada, declarados no §Desvios** em vez de
silenciados (lição 13):

- **D-P1** — o §6 da spec descreve "uma fixture, quatro provas"; medido, **duas já são testes
  vivos** (`CertificatePdfTest.php:398,416` e `PublicCertificateTest.php:184`, ambos em 500). O
  plano cria **dois** testes (`index` marcando, `show` em 500) e trata os dois existentes como
  regressão que tem de ficar verde **sem edição** — duplicá-los seria cobertura falsa.
- **D-P2** — o guard `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu` sobrevive à
  mudança de casa **por construção, conferido e não suposto**: o dublê entra por
  `$this->instance(IssueCertificateAction::class, …)` e o Action novo recebe o
  `IssueCertificateAction` pelo construtor, do container. Por isso o arquivo de teste fica com zero
  linhas de diff, e o mutante (`DB::transaction` em volta do laço) é reprovado no endereço novo.
- **D-P3** — `App\Shared\Validation` **não cria aresta** na matriz: o `DomainDependencyTest` governa
  só `App\Domains\* → App\Domains\*`; `App\Shared\*` é transversal e já é consumido por domínios
  (precedente `App\Shared\Data\ContratanteData`, do B4).
- **D-P4** — o teste de `squash()` estende `Tests\TestCase`, não o `PHPUnit\Framework\TestCase` do
  vizinho `RutTest`: `ValidationException::withMessages()` monta um validador pela facade e precisa
  do container. Sem `RefreshDatabase` — nada toca banco.

Ordem das tasks: 0 baseline → 1 `ValidationMessages::squash()` com os dois adapters → 2
`BatchIssueCertificatesAction` → 3 gate único do snapshot → 4 `snapshot_ok` + `show` falhando alto +
docblock do D6 + `generated.ts` → 5 tag no `HistorialTable` + chave nas 3 locales → 6 gate do bloco
contra a API real.

### Execução iniciada em 2026-08-10 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/certificacao-lote-e-snapshot` a partir de `7227d04` — **não de `eca31e4`** como o
plano escreveu: `7227d04` é o próprio commit do plano, docs-only (plano + `state.md`, zero código),
e branchar antes dele deixaria o plano fora da branch que ele governa. Main tree, sem worktree
(P-03).

**Task 0** confirmou o baseline exato do plano: backend **493 passed, 1 skipped (1833 assertions)**;
frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes; `typescript:transform` sem
diff em `generated.ts`.

**O pré-flight do plano achou um conflito medido, decidido pelo João antes de qualquer edição
(D-E1).** O fixture do `CertificateListingTest` **não produz snapshot apresentável**: o default de
`createCertificate` é `['aluno' => ['name' => 'Juan Pérez']]`, sem a seção `curso`, e
`SnapshotCourseData::fromArray(null)` põe `name: ''` — medido no tinker,
`missingRequiredFields()` devolve `["curso.name"]`. Duas consequências contra o texto do plano: o
teste novo da Task 4 afirmaria `snapshot_ok === true` sobre um certificado que mede `false` (as duas
linhas dariam `false`, e o teste não distinguiria corrompido de são); e
`test_show_devolve_o_snapshot_persistido:84`, que passa outro snapshot igualmente sem `curso`,
viraria **500** assim que o `show` chamasse `assertPresentable()`.

**Não é uma quinta mudança de comportamento.** `show` em 500 sobre snapshot sem `curso.name` é o
item 1 da lista fechada do §5 — o fixture já era corrompido pela definição que o projeto tem hoje
(`CertificatePdfService` e `PublicCertificateData` já estouram nele; `CertificatePdfTest:43` monta a
seção `curso` justamente por isso). A listagem só nunca exercitou essas rotas. O único
`assertExactJson` do domínio é sobre `PublicCertificateData`, que não ganha campo.

**Decisão do João: reparar o fixture** — o default do `createCertificate` e o snapshot do
`test_show_devolve_o_snapshot_persistido` ganham `'curso' => ['name' => …]`. Edição **só de
fixture**: nenhuma asserção muda, os 9 testes existentes seguem provando o que provavam, e os 2
testes novos passam a isolar `aluno.name` como a única corrupção — que é a história da spec.

### Tasks 1–5 entregues — uma revisão de task por entrega

Commits, do base `7227d04`: `66e0911` (seam `ValidationMessages::squash()` com os dois adapters),
`c7fb9bf` (`BatchIssueCertificatesAction`), `8299921` (gate único do snapshot), `70c0167`
(`snapshot_ok` + `show` falhando alto + `generated.ts`) + `b2a5028` (fix do review da Task 4),
`144c857` (tag da linha corrompida no Historial + chave nas 3 locales).

**Dois mecanismos foram vistos reprovando em primeira mão, não aceitos por relatório (lição 10):**

1. **A ausência de `DB::transaction` no Action do lote.** O revisor da Task 2 foi barrado pelo
   classificador de permissão ao tentar reproduzir o mutante, e disse isso em vez de mascarar.
   Envolvi o laço do `BatchIssueCertificatesAction` num `DB::transaction` eu mesmo:
   `BatchIssueTest.php:299` reprovou com `Failed asserting that table [certificates] matches
   expected entries count of 1. Entries found: 0.` Mutante revertido, árvore limpa, verde de volta.
   O guard sobreviveu à mudança de casa com **zero linhas de diff** no arquivo de teste, que era o
   critério do refactor (D-P2 confirmado).
2. **A fonte do `snapshot_ok`.** Achado **Importante** do review da Task 4, provado pelo próprio
   revisor: com o certificado são `Revocado` e o corrompido `Emitido`, `status` era proxy
   **perfeito** de `snapshot_ok`, e o mutante `snapshot_ok: $certificate->status !==
   CertificateStatus::Emitido` — campo derivado de fonte inteiramente errada — deixava o teste **e a
   suíte inteira** verdes. É a "igualdade acidental" da `backend-ddd.md` §Testes, num campo que a
   Task 5 consome na UI. Corrigido em `b2a5028` com uma terceira linha **revogada E corrompida**, de
   modo que `Revocado` mapeia para os dois valores; mutante revisto **vermelho** (`Failed asserting
   that true is identical to false.` em `CertificateListingTest.php:145`), revertido em seguida.

**Um desvio forçado pelo schema (D-E2):** o cenário do `index` não pode ter dois `Emitido` na mesma
matrícula — `certificates_active_enrollment_unique`, sobre a coluna gerada `active_enrollment_id`,
recusa antes de a listagem responder (o primeiro RED foi `UniqueConstraintViolationException`). O
são virou `Revocado`, seguindo o precedente do próprio arquivo. Revogado produz `NULL` na coluna
gerada, e `NULL` não colide — é o que permite as duas linhas revogadas do fix acima.

### Task 6 — o gate do bloco (2026-08-10)

Executado por mim direto: é a prova do DoD do bloco, e o DoD pede comportamento contra a API real.

**Ferramentas.** Backend **498 passed, 1 skipped (1850 assertions)** — +5 testes / +17 asserções
sobre o baseline 493/1833. Frontend **13 arquivos / 47 testes**, `pnpm lint` limpo, `pnpm build`
verde. Pint `--test` **`passed`** nos **11** `.php` vivos do bloco (lista conferida antes, para o
`--test` nunca cair sem argumento — lição 9). `typescript:transform` rodado de novo: `generated.ts`
**sem diff** depois do commit da Task 4, e `git diff main...HEAD -- backend/database/` **vazio** —
zero schema, como a spec previu.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(`Origin` e `Accept` obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login, que o rotaciona).

1. **Portas destravadas pela própria API:** o seed fresco deixa a turma 3 com
   `emission_blocked: 'sin_plantilla'`; `PUT /api/courses/2` criando o template v1 com
   `layout_config.city = 'Santiago'` e `validity_months: 24` zerou o bloqueio (`null`). A turma é
   `online` com `local_aplicacao: null`, então a cidade do template era mesmo obrigatória. Os
   `modules` foram **omitidos** do payload de propósito — coleção nested `Optional`, ausente não
   mexe — e voltaram intactos.
2. **Emissão individual** em `enrollments/21` → **201 `LOT-2026-1000`**, `snapshot_ok: true`.
3. **Lote `[22, 21, 23, 24]`** com a falha provocada (21 já tinha vigente) → **200** com relatório
   por item: `LOT-2026-1001`/`1002`/`1003` **contíguos**, sem buraco onde o item falho ficou — a
   recusa **não consumiu número de sequência** —, e a falha **nomeada**
   (`Ya existe un certificado vigente para esta matrícula.`). `[25, 25]` → **422** problem+json, o
   `distinct` vivo.
4. **`aluno.name` corrompido direto na coluna** do certificado 2 (`UPDATE … JSON_SET`), com o resto
   do JSON conferido byte a byte como intacto. As seis chamadas:

   | Chamada | Resultado |
   |---|---|
   | `GET /api/certificates` | **200**, `snapshot_ok: false` **só** na linha corrompida |
   | `GET /api/certificates/2` (corrompido) | **500** `application/problem+json`, `detail` nomeando `LOT-2026-1001` **e o campo faltante** |
   | `GET /api/certificates/2/pdf` | **500** problem+json, mesmo `detail` |
   | `GET /api/publico/certificados/{uuid}` **sem cookie** | **500** problem+json, mesmo `detail` |
   | `GET /api/certificates/1` (são) | **200**, `snapshot_ok: true` |
   | `GET /api/certificates/1/pdf` (são) | **200 `application/pdf`** |

   Controle extra: a rota pública do certificado **são**, sem cookie, segue **200**. E a página 1 do
   PDF são foi inspecionada com `pdftoppm` — nome, RUT, cliente, curso, vigência, QR e assinatura
   todos impressos. O gate único não fechou o caminho feliz.

**O que o gate NÃO provou, sem maquiagem:** **a tag da linha corrompida não foi vista renderizada.**
O host WSL não tem browser utilizável (Playwright sem as bibliotecas de sistema, limitação herdada
de 2026-08-08). A prova aqui é o `snapshot_ok` na API real, o `pnpm build`/`pnpm lint` e a paridade
das três locales; **o checkpoint visual fica com o João.**

**Estado do banco de dev:** `migrate:fresh --seed` do gate mais as mutações do e2e (template v1 do
curso 2 com `city: Santiago`, certificados `LOT-2026-1000`…`1003`, e o `aluno.name` do
`LOT-2026-1001` **deixado corrompido de propósito** para o checkpoint visual do João encontrar a
linha marcada). Nada é fixture de código; `migrate:fresh --seed` devolve o cenário canônico.

### Três Minor abertos, dois deles decisão do João, para o review herdar

- **Minor-2 (decisão do João — o plano manda o texto).**
  `CorruptedSnapshotException.php:18` afirma "**A listagem é a exceção deliberada, e é a única.**" A
  frase é **falsa**: `store()` e `revoke()` também projetam `CertificateData` sem passar pelo gate.
  O texto está mandado **verbatim pelo plano, na linha 793**, então a contradição é do plano, não da
  implementação — não corrigi unilateralmente.
- **Minor-4 (decisão do João — escopo).** `certificatesApi.ts:68-71` / `IssuedDialog` consomem o
  certificado por um caminho que **não passa pelo `show` gateado**. Fechar isso seria uma **quinta**
  mudança de comportamento, e o §5 da spec é lista **fechada** de quatro.
- **Minor-3 (técnico, sem decisão pendente).** `CertificateData.php:49-50` acessa
  `$certificate->snapshot` duas vezes; com `withoutObjectCaching` no cast, são dois decodes do JSON
  por certificado listado.

Evidência task a task em `.superpowers/sdd/progress.md`. Review **ALTO RISCO** pela spec (peso legal
+ rota pública + `generated.ts`) → duas frentes: lente Claude com o gabarito do projeto + Codex
read-only sobre `7227d04..HEAD`.

### Review de sprint — 2026-08-10: duas frentes, 6 achados, todos aprovados e corrigidos

**ALTO RISCO** conforme a spec → lente Claude com o gabarito do projeto + `mcp__codex__codex`
read-only sobre `7227d04..HEAD`. Órfãos **zero** (`missingRequiredFields` privado com 2 chamadores
internos, `isPresentable` 1, `assertPresentable` 3, `ValidationMessages` 2, o Action do lote 1, e os
imports `Redator`/`Enrollment` do controller seguem usados pelo `store`). Leis §5 limpas. **Sem
divergência de fato entre os revisores**: o Codex viu 5 dos 6 e eu confirmei cada um no código antes
de aceitar — com o escopo do Q-3 corrigido (ele disse "`curso.name` ou `emissor.name`"; medi, e
`emissor.name` já tem quem o mate). O Q-1 nenhuma das duas lentes tinha visto antes desta rodada.

**O achado que o gate não podia ter pego (Q-1 🟡)** — `ProblemDetails::detailFor()` troca o `detail`
de **todo 500** por `'Ocorreu um erro inesperado. Tente novamente.'` quando `app.debug` é falso. A
D8 promete o contrário: a linha corrompida mantém **Ver**, o `CertificateViewDialog` imprime
`error.detail` no `AppErrorState`, "é onde o suporte lê quais campos faltam". Em produção o suporte
lia "erro inesperado" — sem código, sem campo. **Nem a suíte nem o e2e viam**, e o motivo foi
medido: `backend/.env` tem `APP_DEBUG=true` e **não existe `.env.testing`**, então os dois provaram a
D8 num caminho que a produção não percorre. Nasce `App\Shared\Exceptions\PublicDetail`, interface
marcadora para a exceção cuja mensagem foi escrita para quem lê a resposta; o default segue
mascarando e só quem declara passa. No mesmo achado, a mensagem saiu de **PT-BR** para **es-CL** —
ela agora chega à tela de um usuário chileno, e todas as recusas irmãs deste diff já estavam em
espanhol. Guarda nova com `config(['app.debug' => false])`, **vista vermelha primeiro**, com o
diff literal `+'Ocorreu um erro inesperado. Tente novamente.'`.

**Os outros cinco:**

- **Q-2 🟡** (lição 13, o Minor-2 herdado) — o docblock afirmava "**a listagem é a exceção
  deliberada, e é a única**", e `store()`/`revoke()` também projetam `CertificateData` sem gate. O
  texto vinha **verbatim do plano, linha 793**; com a aprovação do João foi corrigido, nomeando os
  dois e o motivo de ficarem fora (são eco de escrita, não apresentação do documento — quem
  apresenta é `show`, o PDF e o QR), sem virar a quinta mudança de comportamento.
- **Q-3 🟡** — a política obrigatória tem três campos e **`curso.name` não tinha quem o matasse**:
  `aluno.name` morre em 3 testes, `emissor.name` no `CertificatePdfTest:384`, e remover `curso.name`
  deixava a **suíte inteira** verde. A terceira linha do teste da listagem (a revogada **e**
  corrompida, que existe para quebrar a correlação `status`×`snapshot_ok`) passa a corromper
  `curso.name` em vez de `aluno.name` — fecha o buraco sem teste novo e sem perder o poder
  discriminante. Mutante **visto vermelho** (`Failed asserting that true is identical to false.`),
  revertido em seguida.
- **Q-4 🟢** (o Minor-3 herdado) — `CertificateData::fromModel` lia `$certificate->snapshot` duas
  vezes; com `withoutObjectCaching` no cast são dois decodes de JSON por linha de uma listagem que
  não pagina. Variável local; não reabre o bug do cache de casts, que era do Eloquent e não da
  variável.
- **Q-5 🟢** — `test_show_de_snapshot_corrompido_falha_alto` afirmava só status e content-type;
  passa a afirmar o `detail` que nomeia o certificado e o campo, que é exatamente o texto de que a
  D8 depende.
- **Q-6 🟢** — o seam `ValidationMessages::squash()` tinha unit test, a **fiação** dele no Action do
  lote não tinha nenhuma: voltar para `->first()` ficava verde. Teste novo com recusa de duas
  razões; mutante **visto vermelho** (`-'La clase no está concluida. El redactor no está designado
  en esta clase.'` / `+'La clase no está concluida.'`), revertido em seguida. Não é bug vivo — as
  seis portas emitem uma mensagem cada —, é guarda contra a regressão.

**Não viraram achado, por serem decisão consciente registrada:** o **Minor-4** (o `IssuedDialog` lê
o certificado por caminho não-gateado, porque `useIssueCertificate` semeia `detailKey` com a resposta
do POST — fechar seria a quinta mudança de comportamento); a **tag não vista renderizada**, que é
limitação declarada do gate e segue com o João; e o corrompido **não** virar um quinto
`CertDerivedStatus`, com filtro e contadores continuando a classificar a linha pelas datas —
consequência declarada na spec.

**Placar pós-correção: 500 passed, 1 skipped (1858 assertions)** — +2 testes / +8 asserções sobre os
498/1850 do gate, que eu reconferi antes de revisar em vez de herdar do relatório. Pint `passed` nos
5 arquivos novos/editados do fix. **Uma exceção honesta:** `ProblemDetails.php` reprova no Pint, e
**já reprovava antes desta edição** — conferido rodando `pint --test` sobre a versão de `HEAD`, com a
mesma lista de fixers. É dívida de estilo pré-existente num arquivo que o bloco não tinha tocado;
reformatá-lo inteiro seria ruído de diff (lição 9), então ficou. `pnpm lint`, `pnpm build` e
`pnpm test` (13 arquivos / 47 testes) verdes; `typescript:transform` **sem diff** em `generated.ts` —
nenhum DTO mudou de forma. Correções no commit `d01c279`.
