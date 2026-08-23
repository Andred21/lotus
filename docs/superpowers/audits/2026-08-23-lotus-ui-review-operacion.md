# Revisão de UI — Operação (`/operacion` e `/operacion/turmas/:id`)

**Data:** 2026-08-23 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/features/operation/components/` (lista + detalhe) · **Base:** `refactor/frontend-revisao-ui` @ `e076c292`
**Evidência bruta:** `.artifacts/ui-review/20260823-1537-operacion/` (24 capturas + `report.txt`, coberta por `.gitignore:26`)

> Run 2 da fatia 1 do item 16 (`frontend-revisao-ui-por-modulo`), Task 7 do plano
> `2026-08-22-frontend-revisao-ui-por-modulo.md`. Papel **admin** — a jornada de Operação é do
> operador administrativo, e a run 1 já cobriu o papel redator.
>
> A §2 é o `report.txt` verbatim, artefato da skill. A §3 é o que for feito com ele na Task 9 e
> **não** faz parte do relatório.

## 1. Escopo e limites da run

- Papel: **admin** (`admin@lotus.cl`), sessão real criada pela tela de login. Sessão Playwright
  própria (`uireview-operacion`, chromium headed), fechada ao fim; a sessão `default` da Task 7
  Step 1 foi preservada e não foi tocada.
- Alvo medido, não presumido: a SPA da **5173** é servida por esta worktree (pid 80157,
  cwd `/home/jvbat/projetos/fix-frontend/frontend`). A 5174 é o main tree e não entrou na run.
- Read-only: nenhuma mutação além do login. `git status --short` vazio antes e depois, mesmo
  branch, mesmo commit (`e076c292`).
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`. Idioma EN→ES→PT pelo menu, sem recarga;
  tema claro→escuro→claro. Tema e idioma vivem no `localStorage` do perfil **efêmero** da sessão de
  revisão, que foi fechada — não há resíduo a devolver.
- Uma interação abriu diálogo sem submeter: "Adicionar aluno" numa turma **concluída**, para provar
  até onde vai o beco sem saída da UI-01. Cancelado sem nenhum campo preenchido.
- Chrome DevTools MCP: `complementary_unavailable`. Toda a evidência é do Playwright CLI.
- Estados não capturados por exigirem mock, falha fabricada, mutação ou outro papel: `loading` das
  duas telas; `error`/`AppErrorState`; aviso lateral com cache em mão (`InlineLoadState`); a
  resposta **422 real** de uma escrita em turma concluída (a UI-01 é sustentada por leitura do
  backend, não por submissão); visão `Arquivados` da lista e da aba Alunos **com conteúdo** (o banco
  de dev não tem nenhum arquivado e arquivar é mutação); wizard `/operacion/turmas/nueva/:quoteId`;
  modo `edit` do `TurmaConfigCard`; esta superfície vista pelo papel redator.
- Falsos positivos descartados na verificação, registrados para não voltarem em revisão futura:
  1. **"Ver" da linha é `<button>` com `navigate()`, não `<a href>`** — não abre em nova aba nem
     mostra destino na barra de status. É o padrão do projeto inteiro (`BudgetsTable.tsx:124` faz
     igual) e a jornada termina sem esforço extra. A rubrica exige impacto observável.
  2. **`GET /api/courses` inteiro na abertura de toda turma**, para ler um único `workload_hours`
     (`useTurmaConfigForm.ts:47-48`). Escolha declarada em comentário no sítio; catálogo local com
     3 cursos; `TurmaData` não carrega a carga horária. Custo real, impacto nulo nesta jornada.
  3. **Arquivo chamado `77888a93-…-fd8aad9890b5.pdf`** na turma 4 — a tela imprime
     `file.original_name` (`DocumentTypeCard.tsx:71`); o nome veio assim do servidor. Dado de dev,
     não defeito de interface.
  4. **"Confirm completion" apagado em rosa** na aba Conclusão — medido, está de fato `disabled`, o
     motivo está escrito acima dele, e componente desabilitado não responde por contraste.
  5. **Foto quase branca do cliente "Subestación Norte S.A."** — é a imagem cadastrada; os outros
     três clientes caem para iniciais legíveis (CG, ED, TR).
  6. **Rolagem vertical do detalhe em 390x844** — rolagem vertical esperada não é defeito.
- Contraste do tema escuro **medido**, não presumido: código da cotação 5,28:1, tag de modalidade
  10,35:1, tag de estado 10,08:1 — todos acima de 4,5:1. Nenhum achado de contraste no escuro. O
  único achado de contraste é do tema **claro** e não é de texto (UI-03, trilho a 1,00:1).
- Nada da run 1 voltou: os cinco achados de `2026-08-22-lotus-ui-review-dashboard-redator.md` não
  reapareceram nesta superfície. A UI-05 desta run toca as MESMAS chaves que a UI-02 da run 1
  passou a usar (`operation.documents.type.*`) — mas por outro motivo (o termo inglês, não o código
  cru do enum) e sem desfazer aquela correção: `Editor assessment` continua sendo a tradução que a
  run 1 acertadamente escolheu usar em vez de `EVALUACION_REDATOR`; o que esta run mede é que a
  palavra `Editor` briga com o `Redator` da aba ao lado.

## 2. Relatório da skill — verbatim

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Operação — lista `/operacion` (busca, filtro de estado, alternância ativos/arquivados) e detalhe `/operacion/turmas/:id` com as cinco abas (Configuração, Alunos, Redator, Documentação, Conclusão). Jornada read-only, papel admin.
Local URL: http://localhost:5173 (SPA desta worktree — pid 80157, cwd `/home/jvbat/projetos/fix-frontend/frontend`; a 5174 é o main tree e NÃO foi usada) contra a API em http://localhost:8080
Branch/commit: refactor/frontend-revisao-ui @ e076c292
Date/time: 2026-08-23, 15:37–16:07 -03
Agent: Claude Opus 5 (1M) — skill `lotus-ui-review`, workflow canônico de `.agents/skills/lotus-ui-review/SKILL.md`
Playwright CLI: @playwright/cli, sessão nomeada `uireview-operacion`, chromium headed (o canal `chrome` não existe nesta máquina: `Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome`). Sessão `default` (admin, da Task 7 Step 1) preservada e intocada.
Chrome DevTools: complementary_unavailable
Git working tree before/after: antes `git status --short` vazio, `refactor/frontend-revisao-ui @ e076c292`; depois idêntico — vazio, mesmo branch, mesmo commit. Evidência em `.artifacts/ui-review/` (ignorada por `.gitignore:26`).

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Lista `/operacion` — carga, painel de cotações pendentes, tabela | 1440x900 EN/ES/PT + escuro | 1024x768 EN | 390x844 EN | 01, 11, 12, 16, 17, 18 |
| Lista — filtro de estado (Todos/Em curso/Habilitada/Concluída) | 1440x900 EN | — | — | 02 |
| Lista — busca sem resultado com filtro ativo + limpar | 1440x900 EN | — | — | 03 |
| Lista — visão Arquivados (vazia) | 1440x900 EN | — | — | 04 |
| Detalhe `/operacion/turmas/4` — aba Configuração | 1440x900 EN | 1024x768 PT | 390x844 EN | 05, 23, 13 |
| Detalhe — aba Alunos (20 matrículas, paginador 10+10) | 1440x900 EN | — | 390x844 PT | 06, 24 |
| Detalhe — aba Redator | 1440x900 EN | — | — | 07 |
| Detalhe — aba Documentação (2 de 3 completos) | 1440x900 EN + escuro | 1024x768 EN/escuro | — | 08, 09, 14, 15 |
| Detalhe — aba Conclusão (bloqueada por documento faltante) | 1440x900 EN | — | — | 10 |
| Detalhe `/operacion/turmas/5` e `/turmas/3` — turma CONCLUÍDA, cinco abas | 1440x900 PT | — | — | 19, 20, 21, 22 |
| Troca de tema (claro↔escuro) nos dois sentidos | 1440x900 + 1024x768 | 1024x768 | — | 15, 16 |
| Troca de idioma EN→ES→PT pelo menu, sem recarga | 1440x900 | — | — | 01, 17, 18 |

## Technical signals
Console: zero erro e zero warning em toda a jornada pós-login. O único ERROR da sessão é `Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:8080/api/me:0`, emitido ANTES do login e descartado como ruído de autenticação (passo 7 da skill). A outra mensagem é o convite do React DevTools do Vite.
Network: todas as requisições XHR da jornada responderam 200 — `GET /api/me`, `GET /api/turmas`, `GET /api/turmas/pendientes-configuracion`, `GET /api/turmas/{3,4,5}`, `GET /api/turmas/{id}/alunos`, `GET /api/courses`. Nenhum 4xx/5xx depois do login. As três trocas de idioma e as duas de tema NÃO disparam refetch. Observado e descartado como falso positivo (ver abaixo): a página de detalhe busca `GET /api/courses` inteiro para ler um único `workload_hours`.
Performance: nenhuma medição de performance foi tomada. Sem alegação de lentidão.
Untested states: (a) `loading` das duas telas — a resposta local volta em dezenas de ms e retardá-la exigiria interceptação de rota, proibida pela skill; (b) `error`/`AppErrorState` e (c) aviso lateral com cache em mão — exigem falha fabricada; (d) a resposta 422 real de qualquer escrita em turma concluída (a UI-01 é sustentada por leitura de código do backend, não por submissão — submeter seria mutação); (e) visão `Arquivados` da lista COM conteúdo — o banco de dev não tem turma arquivada e arquivar é mutação; (f) visão `Arquivados` da aba Alunos com conteúdo, pelo mesmo motivo; (g) wizard `/operacion/turmas/nueva/:quoteId` — o botão "Configurar turma" do painel de pendentes leva a um fluxo de criação, fora do escopo read-only; (h) modo `edit` do `TurmaConfigCard` — o botão "Editar" foi observado, o formulário não foi aberto para não deixar estado de escrita pendurado; (i) esta superfície vista pelo papel redator (a run foi de admin, por decisão do plano); (j) upload, remoção, matrícula, importação e registro de resultado — todas mutações.

## Findings
### UI-01 — a turma concluída oferece oito controles de escrita que a API sempre recusa, e a mesma página já sabe trancar
Classification: C
Surface/journey: `/operacion/turmas/3` (Seguridad en alta tensión, Enel Distribución, status `Concluída`, 15 alunos) e `/operacion/turmas/5` (GATE T7, `Concluída`, 0 aluno) — abas Configuração, Alunos, Redator e Documentação.
Viewport: 1440x900 (reproduz igual nos três; não é questão de largura)
Reproduction: abrir `/operacion` como admin, clicar "Ver" na linha `Scap 5 - Cot 1` (status `Concluída`) e percorrer as quatro abas. Aba Configuração: botão "Editar" habilitado. Aba Alunos: "Importar planilha (xlsx/csv)" e "Adicionar aluno" habilitados na toolbar, mais "Registrar resultado" e "Remover" em cada uma das 15 linhas. Aba Redator: "Remover" e "Trocar" habilitados. Aba Documentação: nenhum botão de upload, nenhum botão de excluir, e um cartão informativo "A turma está concluída: a documentação ficou imutável (RN-15)". Clicar "Adicionar aluno" abre o diálogo completo (campo RUT, "Cancelar", "Continuar") sem nenhum aviso de que a turma está fechada — cancelado sem digitar nada.
Evidence: `21-alunos-turma-concluida-1440x900-pt.png` (toolbar e ações de linha habilitadas sob a tag `Concluída`), `22-dialogo-adicionar-aluno-turma-concluida-pt.png` (o diálogo abre), `19-detalhe-docs-concluida-1440x900-pt.png` (a aba que TRANCA, com o banner do RN-15), `20-detalhe-conclusao-concluida-1440x900-pt.png`. Leitura de DOM: `btns: [{Importar planilha, dis:false},{Adicionar aluno, dis:false},{Registrar resultado, dis:false},{Remover, dis:false}...]`, `tags: [Concluída, Online, Aprovado ×10]`.
Observed fact: em turma concluída, oito controles de escrita continuam habilitados em três abas, enquanto a quarta aba esconde os dela e explica o motivo. No código, `useTurmaDocsSection.ts:42,62` deriva `canSubmit: !concluida && hasPermission` a partir de `turma.status === 'concluida'`; `EnrollmentSection.tsx:26` condiciona a toolbar apenas a `s.loadError || emArquivados` e nunca consulta `turma.status`; `TurmaConfigCard` e `RedatorDesignation` também não consultam. Do outro lado, as cinco Actions correspondentes chamam `assertAcademicallyWritable()` antes de qualquer escrita — `UpdateTurmaAction.php:16`, `EnrollStudentAction.php:22`, `ImportStudentsAction.php:31`, `RecordEnrollmentResultAction.php:14`, `RemoveEnrollmentAction.php:11`, `DesignateRedatorAction.php:20`, `RemoveRedatorAction.php:14` — e `Turma.php:196-203` lança 422 quando `status !== EmAndamento`.
Inference: a regra RN-15 foi implementada no servidor para todo o registro acadêmico e na interface apenas para documentos. A turma concluída é, para a interface, indistinguível de uma em curso em três das cinco abas.
Impact: o operador abre formulário, escolhe planilha ou seleciona redator e só descobre a recusa ao submeter. Pior: a mensagem que o servidor devolve é a string fixa em espanhol `La clase ya fue concluida: el registro académico está bloqueado (RN-15).` (`Turma.php:200`), então quem estiver em pt-BR ou en recebe a recusa em outro idioma. Numa plataforma cujo registro acadêmico tem peso legal, oferecer a ação e recusá-la depois também esconde do operador que aquele registro está fechado.
Recommendation: derivar o mesmo `concluida` que a aba Documentação já deriva e aplicá-lo às outras três — esconder (não só desabilitar) os controles de escrita e mostrar o mesmo cartão de bloqueio que a aba Documentação mostra, para o motivo aparecer uma vez por página. A chave `operation.documents.lock.concluida` já existe nos três locales; se o texto for reusado fora da aba de documentos, ele precisa deixar de falar só de documentação. A mensagem em espanhol fixa no backend é de dono do backend e fica FORA do fence deste bloco — registrar como ficha, no molde da UI-04 da run 1.
Rule/reference: rubrica eixo 1 (condição C — "oferece controle inoperante") e eixo 5 (condição C — "permite escrita em read-only"); `useTurmaDocsSection.ts:42,62`; `EnrollmentSection.tsx:26`; `backend/app/Domains/Operation/Models/Turma.php:196-203`.

### UI-02 — a tabela de turmas não distribui largura: o código quebra em quatro linhas no desktop e a coluna de ações some no tablet
Classification: B
Surface/journey: `/operacion`, tabela de turmas (7 linhas) — e, no detalhe, a tabela de matrículas da aba Alunos.
Viewport: 1440x900, 1024x768 e 390x844
Reproduction: abrir `/operacion` em 1440x900 com o idioma EN. A célula `Scap 1 - Cot 2` da coluna `CODE` renderiza em **4 caixas de linha** dentro de um `span` de 34px, num `th` de 67px; as tags `In person` e `In progress` quebram em duas linhas cada. Todas as sete linhas ficam com 105px de altura. Trocar para ES: o cabeçalho `CÓDIGO` alarga a coluna para 82px, o código cai para 2 linhas e as linhas encolhem para 85px (uma para 73px) — o pior caso é o inglês, porque a largura vem do conteúdo e `CODE` é o rótulo mais curto. Em 1024x768 a mesma tabela mede 1147px num contêiner de 718px: **429px ficam fora**, e o que fica fora é `STUDENTS`, `STATUS` e as duas ações de linha (Arquivar/Ver). Em 390x844 o contêiner cai para 276px e **871px** ficam fora. A mesma medição na aba Alunos em 390x844: tabela de 768px em 276px, **492px** fora, levando junto RUT, status de matrícula e as duas ações.
Evidence: `01-lista-1440x900-en.png` (código em 4 linhas, tags quebradas), `17-lista-1440x900-es.png` e `18-lista-1440x900-pt.png` (2 linhas), `11-lista-1024x768-en.png` (tabela cortada em REDATOR), `12-lista-390x844-en.png`, `24-detalhe-alunos-390x844-pt.png`. Medições: `heads` EN `[CODE 67, COURSE 130, CLIENT 249, MODALITY 98, REDATOR 263, STUDENTS 100, STATUS 108, ações 132]`, `rowH [105 ×7]`; ES `[CÓDIGO 82, …]`, `rowH [85,105,85,105,73,85,105]`; contêiner 1024 `{cw:718, sw:1147, hidden:429}`; 390 `{cw:276, sw:1147}`; matrículas 390 `{cw:276, sw:768, hidden:492}`.
Observed fact: nenhuma das colunas de `TurmasTable.tsx:85-123` declara largura — só a última tem `style={{ width: '8rem' }}`. A largura acaba sendo negociada pelo conteúdo, e as duas colunas de identidade (CLIENT 249 + REDATOR 263 = 512px, 45% da tabela) consomem o espaço que falta ao código e ao curso. O `document.scrollWidth` continua igual ao `innerWidth` nos três viewports: o vazamento é intra-contêiner (`.p-datatable-wrapper overflow-x-auto`), não da página.
Inference: a rolagem horizontal é intencional e funciona; o que não existe é política de largura nem sinal de que há mais tabela à direita.
Impact: no desktop o código da cotação — o identificador pelo qual o operador procura a turma — é o dado menos legível da linha, e a quebra infla toda a tabela em ~40px por linha. No tablet e no celular a coluna de ações e o estado ficam fora da área visível sem nenhuma affordance; quem não descobrir a rolagem lateral não abre a turma pela linha.
Recommendation: dar largura mínima ao código (e impedir a quebra dele, que é identificador atômico) e teto às duas colunas de identidade, de modo que a soma caiba em 1024. Se a soma não puder caber, a rolagem lateral precisa de affordance visível. É a mesma família da UI-03 da run 1 (texto essencial cortado em 390x844) e a correção tem o mesmo dono: a tela, não o wrapper.
Rule/reference: rubrica eixo 3 (condição B) e eixo 4 (condição B — "exige scroll … sem bloquear"); `TurmasTable.tsx:85-123`; `EnrollmentTable.tsx`.

### UI-03 — no tema claro o trilho da barra de progresso da documentação é branco sobre branco
Classification: B
Surface/journey: `/operacion/turmas/4`, aba Documentação, indicador "2 of 3 documents complete".
Viewport: 1440x900 e 1024x768 (independe da largura)
Reproduction: abrir a aba Documentação de uma turma com documentação parcial no tema CLARO. A barra verde ocupa 171px e o trilho tem 256px; os 85px restantes são invisíveis. Medido: trilho `rgb(255,255,255)` sobre o fundo do cartão `rgb(255,255,255)` — razão de contraste **1,00:1**. Alternar para o tema ESCURO: o trilho passa a `rgb(11,18,32)` sobre `rgb(30,41,59)`, razão **1,55:1** — fraco, mas visível.
Evidence: `08-detalhe-docs-1440x900-en.png` e `14-detalhe-docs-1024x768-en.png` (a faixa verde termina no vazio), `15-detalhe-docs-1024x768-en-dark.png` (o trilho aparece), `19-detalhe-docs-concluida-1440x900-pt.png` (3 de 3, barra cheia — o defeito só aparece em progresso parcial).
Observed fact: `TurmaDocuments.tsx:35` pinta o trilho com `background: 'var(--surface-section)'`. No tema claro `--surface-section` resolve para `#ffffff`, exatamente o valor de `--surface-card`, que é o fundo em que a barra é desenhada.
Inference: o token foi escolhido pelo nome ("seção") e não pela função (superfície que precisa contrastar com o cartão). Os tokens disponíveis que contrastam já existem: `--surface-d` `#e2e8f0`, `--surface-border` `#dfe7ef`, `--surface-c` `#f1f5f9`.
Impact: no tema claro — o padrão — a barra deixa de ser proporção e vira uma faixa verde de comprimento arbitrário: 2 de 3 e 3 de 3 são graficamente indistinguíveis. Não há perda de informação, porque o texto "2 of 3 documents complete" está imediatamente acima; é o gráfico que não cumpre o papel dele.
Recommendation: trocar o token do trilho por um que contraste com o cartão nos dois temas — `--surface-d` (`#e2e8f0`) mede **1,23:1** contra o branco, que é o bastante para delinear uma faixa de 8px e é o mesmo tom que o tema já usa para separar superfícies; `--surface-border` serve igual. Se a barra precisar de semântica de progresso para leitor de tela, o wrapper `shared/ui` é o lugar — hoje o elemento não tem `role="progressbar"` nem `aria-valuenow` (medido: `document.querySelector('[role="progressbar"]')` devolve `null`).
Rule/reference: rubrica eixo 2 (condição B) e eixo 6 (contraste); `TurmaDocuments.tsx:35`; tokens medidos em `getComputedStyle(document.documentElement)`.

### UI-04 — códigos internos de regra de negócio (RN-09, RN-15) aparecem para o usuário, nos três idiomas
Classification: B
Surface/journey: `/operacion/turmas/:id`, aba Redator (todas as turmas) e aba Documentação (turma concluída).
Viewport: 1440x900
Reproduction: abrir a aba Redator de qualquer turma — o rodapé da seção diz "Only redatores enabled for this course with valid documentation are shown (RN-09)." Abrir a aba Documentação de uma turma concluída — o cartão informativo diz "A turma está concluída: a documentação ficou imutável (RN-15)."
Evidence: `07-detalhe-redator-1440x900-en.png` (RN-09), `19-detalhe-docs-concluida-1440x900-pt.png` (RN-15). Nos três locales: `en.json:708`/`pt-BR.json:708`/`es-CL.json:708` (RN-09) e `:790` nos três (RN-15).
Observed fact: as duas frases terminam com o identificador interno da regra entre parênteses, em `es-CL`, `pt-BR` e `en`.
Inference: o código veio da especificação para a cópia e não foi retirado. Ele identifica a regra para quem escreve o sistema, não para quem o opera.
Impact: o operador da Lotus não tem onde consultar "RN-09"; o parêntese não acrescenta nada ao que a frase já diz e sugere um vocabulário que a interface não explica. É a mesma classe da UI-02 da run 1 (identificador de banco impresso na tela), num grau menor: aqui a frase continua compreensível sem o código.
Recommendation: remover os dois sufixos das seis strings (duas chaves × três locales), preservando o texto restante. Se a rastreabilidade da regra for desejada no código, ela cabe em comentário no sítio que usa a chave, não na tela.
Rule/reference: rubrica eixo 8 (condição B — inconsistência de rótulo sem induzir ação errada).

### UI-05 — em inglês a mesma tela chama o mesmo papel de "Redator" e de "Editor"
Classification: B
Surface/journey: `/operacion` (coluna `REDATOR`) e `/operacion/turmas/:id` (aba `Redator`, seção `ASSIGNED REDATOR`, tipo de documento `Editor assessment`).
Viewport: 1440x900, idioma EN
Reproduction: com o idioma em EN, abrir `/operacion/turmas/4`: a aba se chama "Redator", a seção "ASSIGNED REDATOR", o texto de apoio fala em "redatores"; na aba Documentação, o terceiro cartão se chama "Editor assessment"; e na aba Conclusão a lista de pendências repete "Editor assessment". Trocar para ES ou PT: as duas metades voltam a concordar ("Redactor"/"Evaluación del redactor", "Redator"/"Avaliação do redator").
Evidence: `07-detalhe-redator-1440x900-en.png` (aba e seção "Redator"), `09-detalhe-docs-scroll-1440x900-en.png` ("Editor assessment"), `10-detalhe-conclusao-1440x900-en.png` ("Documents missing to enable the class: • Editor assessment"). `en.json:778` `"EVALUACION_REDATOR": "Editor assessment"` contra `en.json:653,680` `"redator": "Redator"`.
Observed fact: só o locale `en` diverge. Fora desta superfície o mesmo papel aparece ainda como `"redator": "Editor"` (`en.json:136`), `"noRedator": "No instructor"` (`:220`), `"sectionRedatores": "Enabled writers"` (`:468`), `"redatorCount": "Writers"` (`:476`) e `"tabRedatores": "Instructors"` (`:577`) — cinco grafias para a mesma coisa.
Inference: a tradução para inglês foi feita chave a chave, sem glossário; `es-CL` (a referência) e `pt-BR` se mantiveram consistentes porque o termo é o mesmo do domínio.
Impact: na aba Conclusão, o operador em inglês lê que falta "Editor assessment" e precisa deduzir que o cartão a preencher é o do "Redator" da aba ao lado. Baixo, mas é exatamente a ambiguidade que a rule proíbe.
Recommendation: fixar `Redator` como o termo em inglês nas chaves desta superfície (`operation.documents.type.EVALUACION_REDATOR` → "Redator assessment"). As outras cinco grafias estão fora desta superfície e não foram medidas em tela — devem ser tratadas junto, mas em bloco próprio.
Rule/reference: `.claude/rules/frontend-fsliced.md`, seção "Vocabulário de domínio é o do backend. `Redator`, não `Writer`"; rubrica eixo 8 (condição B) e eixo 7.

### UI-06 — em 390x844 a régua de abas corta três das cinco abas sem nenhuma affordance
Classification: B
Surface/journey: `/operacion/turmas/:id`, cabeçalho de abas.
Viewport: 390x844
Reproduction: abrir `/operacion/turmas/4` em 390x844. Visíveis: "Configuration" e "Students" (e um pedaço da terceira). Medido: as cinco abas ocupam de x=97 a x=739; o contêiner termina em x=373. `.p-tabview-nav-content` tem `overflow-x: auto` com `clientWidth 276` e `scrollWidth 642`, e `document.querySelector('.p-tabview-nav-prev, .p-tabview-nav-next')` devolve `null` — não há botão de rolagem. A rolagem funciona: `Tab` até uma aba e `ArrowRight` move o foco e arrasta a régua (`scrollLeft` 0 → 80); arrastar horizontalmente também.
Evidence: `13-detalhe-390x844-en.png`, `24-detalhe-alunos-390x844-pt.png`. Medições de `getBoundingClientRect()` das cinco abas: `[Configuration 97-243, Students 243-353, Redator 353-453, Documentation 453-612, Conclusion 612-739]`, contêiner `97-373`.
Observed fact: a régua é rolável mas não sinaliza que continua — corta no meio da terceira aba, junto à borda do cartão, sem seta, sem sombra, sem esmaecimento.
Inference: o `TabView` do PrimeReact tem a prop `scrollable`, que acrescenta os botões prev/next quando o conteúdo transborda; o wrapper `AppTabView.tsx:10-12` não a repassa nem a liga.
Impact: em celular, "Documentation" — a aba mais usada nesta superfície, segundo a run 1 — nasce fora da tela. Quem não arrastar a régua conclui que a turma tem duas abas.
Recommendation: ligar `scrollable` no wrapper `AppTabView` (é `shared/ui`, então vale para todas as telas de detalhe de uma vez), ou dar affordance equivalente. Não usar `TabView` direto na feature.
Rule/reference: rubrica eixo 4 (condição B) e eixo 7; `shared/ui/AppTabView/AppTabView.tsx:10-12`.

### UI-07 — o filtro de estado da lista não tem nome acessível
Classification: B
Surface/journey: `/operacion`, toolbar da tabela, dropdown ao lado da busca.
Viewport: 1440x900 (independe)
Reproduction: `Tab` a partir do topo chega ao dropdown na 15ª parada, com anel de foco visível. Medido no DOM: o `.p-dropdown` não tem `aria-label` nem `aria-labelledby`; o `input` interno também não; não existe `<label>` nenhum na página; e não há texto adjacente que o nomeie. O único texto exposto é o VALOR corrente ("All"/"Todos"). Abrir o dropdown revela as opções `All | In progress | Enabled | Concluded`, que só então denunciam que o filtro é de estado.
Evidence: `01-lista-1440x900-en.png` (dropdown rotulado apenas "All"), `02-filtro-aberto-1440x900-en.png` (as quatro opções). Leitura de DOM: `{ddAria:null, ddLabelledby:null, inpAria:null, inpLabelledby:null, labels:[]}`.
Observed fact: o controle é operável por teclado e tem foco visível, mas não expõe nome — nem para leitor de tela, nem visualmente.
Inference: `TurmasTable.tsx:60-69` monta o `filterSlot` com um `AppDropdown` sem rótulo; o desenho conta com a proximidade do campo de busca para explicar a função.
Impact: quem usa leitor de tela ouve "Todos, combo box" sem saber o que está filtrando; quem enxerga precisa abrir o dropdown para descobrir. A jornada não trava — dá para buscar por texto e para abrir a lista de opções —, e por isso isto não foi classificado C.
Recommendation: dar nome ao controle — `aria-label` com a chave que já existe (`operation.table.status`) ou rótulo visível na toolbar. O sítio é a tela; se as outras tabelas com `filterSlot` tiverem o mesmo buraco, a correção é a mesma em cada uma.
Rule/reference: rubrica eixo 6 (condição B; a condição C exigiria controle não acionável); `TurmasTable.tsx:60-69`.

### UI-08 — no cabeçalho de detalhe as tags de estado flutuam acima do título, mais perto do botão "Voltar"
Classification: B
Surface/journey: `/operacion/turmas/:id`, cabeçalho (`DetailHeader`).
Viewport: 1440x900 e 1024x768 (em 390x844 o cabeçalho empilha e o problema não existe)
Reproduction: abrir qualquer turma em 1440x900 e medir. Botão "Back to Operations": `top 104, bottom 152`. Tags `In progress`/`In person`: `top 168, bottom 194`. Título `h1`: `top 188, bottom 220`. A distância vertical entre o botão e as tags é de 16px; entre o botão e o título, 36px. O centro das tags fica 23px acima do centro do título que elas qualificam.
Evidence: `05-detalhe-config-1440x900-en.png`, `19-detalhe-docs-concluida-1440x900-pt.png`, `14-detalhe-docs-1024x768-en.png`.
Observed fact: `DetailHeader.tsx:65` alinha a linha com `sm:items-start`, e o `h1` dentro dela carrega `my-[0.83em]` (19,92px medidos). O bloco de tags alinha ao topo do BLOCO do título, que começa ~20px acima do TEXTO do título.
Inference: a margem do `h1` foi cravada para reproduzir o espaçamento que o user-agent daria (o projeto não carrega Preflight), e o alinhamento ao topo não a compensa.
Impact: o estado da turma — atributo primário, e o que decide se a página é editável — lê como enfeite solto no canto, associado ao botão de voltar em vez de ao título. Não impede nada; atrasa a leitura.
Recommendation: alinhar o par título/tags pela linha do título (`sm:items-center` na linha, ou zerar a margem superior do `h1` e controlar o espaçamento pelo `gap` do contêiner). É `shared/ui`, então vale para todas as telas de detalhe.
Rule/reference: rubrica eixo 3 (condição B — "inconsistência … que dificulta varredura, sem impedir o uso"); `shared/ui/DetailHeader/DetailHeader.tsx:65-88`.

### UI-09 — o botão "Limpar busca" também limpa o filtro de estado, sem dizer
Classification: B
Surface/journey: `/operacion`, vazio de busca com filtro de estado ativo.
Viewport: 1440x900
Reproduction: selecionar `Concluded` no filtro (a lista cai para 2 linhas, rodapé "2 classes"), digitar `zzzz` na busca. O vazio mostra "No results for "zzzz"", "Check the term or clear the search." e um botão "Clear search". Clicar nele: a busca esvazia, **e o filtro volta a "All"** — a lista volta às 7 linhas em vez das 2 que o filtro selecionava.
Evidence: `03-vazio-filtro-1440x900-en.png`. Leitura de DOM depois do clique: `{dropdown:"All", search:"", rows:7, foot:"7 classes"}`.
Observed fact: `SearchableTableFrame.tsx:104-119` compõe `clearAll = table.clear() + onClearFilter()` — os dois sempre —, mas escolhe o rótulo só por `table.term !== ''`: com termo, "Clear search"; sem termo, "Clear filters". Com os DOIS ativos, o rótulo nomeia um e a ação faz os dois.
Inference: a bifurcação foi desenhada para o caso "filtro sozinho" (onde mandar limpar uma busca vazia não faria sentido) e não previu o caso composto.
Impact: o operador que estreitou a lista por estado e depois errou a busca perde o filtro sem ter pedido, e a lista volta maior do que estava. Pequeno, mas é ação não anunciada num controle que se propõe a explicar o que faz.
Recommendation: escolher o rótulo pelo que a ação vai efetivamente limpar — "Clear filters" (ou uma terceira redação) quando houver termo E filtro. É `shared/ui` e alcança as cinco tabelas que usam a moldura.
Rule/reference: rubrica eixo 1 (condição B — "rótulo … aumenta hesitação") e eixo 8; `shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:101-120`.

## Summary
A: (1) A jornada termina nos três viewports, nas duas telas e nos três idiomas, sem erro de console depois do login e sem nenhuma requisição fora de 200. (2) Teclado: a ordem de tabulação da lista é a esperada — "Pular para o conteúdo" → menu lateral (7 links) → idioma → tema → menu do usuário → "Configurar turma" → busca → filtro → Ativos/Arquivados → ações da primeira linha —, com anel de foco visível (`outline: 2px solid` + `box-shadow` de 3,2px). (3) Filtro e busca funcionam e se compõem: `Concluded` reduz de 7 para 2 linhas com o rodapé acompanhando ("2 classes"), e o vazio de busca traz reprodução do termo. (4) A visão Arquivados exibe o vazio próprio ("No archived records / Anything you archive shows up here and can be restored.") e acrescenta as colunas `Archived on`/`Archived by`. (5) A troca de idioma repinta os VALORES das células, não só os cabeçalhos (`In person` → `Presencial`, `In progress` → `En curso`) — o D-55 não voltou nesta tabela. (6) Tema escuro medido, não presumido: código da cotação 5,28:1, tag de modalidade 10,35:1, tag de estado 10,08:1 — todos acima de 4,5:1. (7) A aba Alunos pagina de verdade (20 matrículas, 10 por página, rodapé "20 students enrolled") e as ações de linha têm nome acessível ("Record result", "Remove"). (8) Em turma concluída, os arquivos perdem o botão de excluir e mantêm pré-visualizar/baixar — a metade que a UI-01 elogia. (9) Nenhum vazamento horizontal de página: `document.scrollWidth === window.innerWidth` nos três viewports; o transbordo das tabelas é intra-contêiner. (10) Observação sem reprodução própria: as listas de arquivo dos cartões de documento renderizam o marcador `disc` padrão do navegador (`DocumentTypeCard.tsx:67`, `<ul className="mt-3 space-y-2">` sem `list-none`; o projeto não carrega Preflight). Aparece como um "•" solto à esquerda de cada arquivo e da frase "No files.", inclusive onde a lista já é um cartão. É inconsistente com os sítios que pedem marcador de propósito (`ConcludePanel.tsx:37` e `ImportResultSummary.tsx:31` escrevem `list-disc`) e com os que o desligam (`AgendaPanel.tsx:110`, `AlertList.tsx:28` escrevem `list-none`). Ruído visual, sem impacto na jornada.
Falsos positivos descartados, com o motivo: (a) a ação "Ver" da linha é `<button>` com `navigate()`, não `<a href>` — não abre em nova aba nem mostra o destino na barra de status; descartado porque é o padrão do projeto inteiro (`BudgetsTable.tsx:124` faz igual) e a jornada termina sem esforço extra: a rubrica exige impacto observável. (b) `GET /api/courses` dispara na abertura de toda turma para ler um único `workload_hours` (`useTurmaConfigForm.ts:47-48`); é escolha declarada em comentário no sítio, o catálogo local tem 3 cursos e `TurmaData` não carrega a carga horária — custo real, impacto nulo nesta jornada. (c) O terceiro arquivo da turma 4 se chama `77888a93-50ca-4ad5-8ed4-fd8aad9890b5.pdf`; a tela imprime `file.original_name` (`DocumentTypeCard.tsx:71`), então o nome veio assim do servidor — é dado de dev, não defeito de interface. (d) O botão "Confirm completion" da aba Conclusão aparece apagado em rosa; medido, ele está de fato `disabled`, o motivo está escrito acima dele ("Documents missing to enable the class: Editor assessment") e componente desabilitado não responde por contraste. (e) A foto do cliente "Subestación Norte S.A." é um círculo quase branco em fundo branco; é a imagem cadastrada, não o componente — os outros três clientes caem para iniciais legíveis (CG, ED, TR). (f) Rolagem vertical do detalhe em 390x844 — rolagem vertical esperada não é defeito.
Preferências de sessão alteradas pela própria jornada, declaradas: tema (claro→escuro→claro) e idioma (EN→ES→PT) foram trocados porque a superfície pedida os inclui. Vivem no `localStorage` do perfil EFÊMERO desta sessão de revisão, que é fechada ao fim da run; a sessão `default` do navegador, logada como admin desde a Task 7 Step 1, não foi tocada. Nenhuma escrita na API além do login. O diálogo "Adicionar aluno" foi aberto e cancelado sem nenhum campo preenchido, como evidência da UI-01.
B: 8 (UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09)
C: 1 (UI-01)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

Vazia até a triagem da run 2 (Task 8) e o passe de correção (Task 9). Os nove achados acima ainda
não têm destino decidido — decidir aqui seria promover trabalho sem o gate do João.
