# Revisão de UI — Dashboard redator (`/`, view `ready-redator`)

**Data:** 2026-08-22 · **Skill:** `lotus-ui-review` (`.agents/skills/lotus-ui-review/SKILL.md`)
**Superfície:** `frontend/src/app/pages/Dashboard/redator/` (view `ready-redator`) · **Base:** `refactor/frontend-revisao-ui` @ `251a87a2`
**Evidência bruta:** `.artifacts/ui-review/20260822-2035-dashboard-redator/` (15 arquivos, coberta por `.gitignore`)

> Run 1 da fatia 1 do item 16 (`frontend-revisao-ui-por-modulo`), Task 4 do plano
> `2026-08-22-frontend-revisao-ui-por-modulo.md`. A view `ready-redator` foi vista de relance na
> passada de 2026-08-17 (`2026-08-17-lotus-ui-review-dashboard-analitico-redator.md`); esta é a
> primeira run **logada como redator de verdade**, com o acesso provisionado pelas portas reais na
> Task 3 — e é isso que expõe os três `C`, todos no card "Documentación pendiente", que nenhuma
> leitura de código tinha achado.
>
> A §2 é o `report.txt` verbatim, artefato da skill. A §3 é o que foi feito com ele e **não** faz
> parte do relatório.

## 1. Escopo e limites da run

- Papel: **redator** (`juan.morales@lotus.cl`), sessão real — não é a view admin simulada.
  Uma view por run: `ready-admin` e `unauthorized` ficam declaradas como estados não testados.
- Read-only: nenhuma mutação de dado além do login; `git status --short` vazio antes e depois.
- Viewports percorridos: `1440x900`, `1024x768`, `390x844`. A troca de idioma (EN→ES→PT→ES) e a
  abertura do menu de idioma foram exercidas em `1440x900`; a troca de tema, em `1440x900` e
  `390x844`.
- Tema e idioma foram trocados porque a superfície pedida os inclui. Ambos vivem no `localStorage`
  do perfil efêmero da sessão de revisão (`lotus-lang`, `lotus-ui`) e foram devolvidos ao estado
  inicial (claro, `es-CL`) ao fim da run. Nenhuma escrita na API além do login.
- Estados não capturados por exigirem mock, falha fabricada ou banco alterado: `loading`
  (`DashboardSkeleton`), `error` (`AppErrorState`), aviso lateral de falha com cache em mão
  (`InlineLoadState`), `unauthorized` (inalcançável no papel — as 6 chaves do contrato são
  não-anuláveis), vazio de `Documentación pendiente` e vazio de `Agenda`.
- Chrome DevTools MCP: `complementary_unavailable`. Toda a evidência é do Playwright CLI.
- Falsos positivos descartados na verificação, registrados para não voltarem em revisão futura:
  1. **`period_start`/`period_end` na chamada do dashboard** embora o redator não tenha seletor de
     janela — o payload devolvido é `view=redator` e nada na tela depende dos parâmetros. Sem
     impacto observável.
  2. **A mesma turma contada em "Clases en curso" e listada sob "ATRASADAS"** — não é contradição:
     a turma segue aberta (`En curso` em `/operacion/turmas/4`) e já passou da data de término. As
     duas leituras são complementares.
  3. **`<a href="#">` dentro de `menuitem` no menu de idioma** — markup padrão do `Menu` do
     PrimeReact, sem impacto observado no percurso por teclado.
  4. **Trilho âmbar no KPI "Mis documentos por vencer" com valor 0** — o tom descreve a natureza da
     métrica, não o valor; é o mesmo critério dos quatro cards.
  5. **Folga no rodapé do card "Documentación pendiente" em 1440** — é a grade igualando a altura
     ao card "Alertas" ao lado. Diferença intencional de grupo.
- Contraste do tema escuro **medido**, não presumido: "Falta:" 8,58:1, "Hasta <data>" 6,23:1 e
  texto de corpo 11,40:1 sobre o `#1e293b` do card. Nenhum achado de contraste.

## 2. Relatório da skill — verbatim

```
BEGIN LOTUS UI REVIEW REPORT
## Run
Surface: Dashboard, view `ready-redator` (rota `/`), sessão do papel redator (`juan.morales@lotus.cl`)
Local URL: http://localhost:5173/
Branch/commit: refactor/frontend-revisao-ui @ 251a87a2a3699dc9572f7de1e9820661e834e497
Date/time: 2026-08-22 17:28–17:40 -03:00
Agent: Claude (Fable 5), skill lotus-ui-review
Playwright CLI: sessão nomeada `uireview-redator`, chromium headed
Chrome DevTools: complementary_unavailable
Git working tree before/after: limpo antes (`git status --short` vazio) / limpo depois (vazio)

## Coverage
| Journey step | Desktop | Tablet | Mobile | Evidence |
|---|---|---|---|---|
| Carga inicial da view `ready-redator` (EN, tema claro) | 1440x900 | — | — | step1-load-1440x900.png, step1-load-1440x900-scrolled.png, step1-load-desktop.yml |
| Seções do papel (Mi situación / Requiere mi acción / Mis clases / Mi historial) | 1440x900 | 1024x768 | 390x844 | step1-load-1440x900-scrolled.png, step6b-es-1024x768-top.png, step7-es-390x844-top.png, step7b-es-390x844-mid.png |
| Troca de tema claro→escuro→claro | 1440x900 | — | 390x844 | step2-dark-1440x900.png, step8-dark-390x844.png |
| Abrir menu de idioma | 1440x900 | — | — | step3-langmenu-1440x900.png |
| Troca de idioma EN→ES | 1440x900 | — | — | step4-es-1440x900.png |
| Troca de idioma ES→PT | 1440x900 | — | — | step5-pt-1440x900.png |
| Troca de idioma PT→ES (retorno ao locale de referência) | 1440x900 | 1024x768 | 390x844 | step6b-es-1024x768-top.png, step7-es-390x844-top.png |
| Percurso por teclado (Tab) sobre os controles da view | 1440x900 | — | — | traversal registrado em Technical signals |
| Verificação do destino de "Ir a Mi Perfil" (`/perfil`) | 1440x900 | — | — | evid-ui01-perfil-documentos.png |
| Verificação do lugar real dos documentos da turma (`/operacion/turmas/4` → aba Documentación) | 1440x900 | — | — | evid-ui01-turma4-documentacion.png |

## Technical signals
Console: 4 mensagens no total, 1 erro — `Failed to load resource: the server responded with a status of 401 (Unauthorized) @ http://localhost:8080/api/me:0`, emitido ANTES do login e descartado como ruído de autenticação (passo 7 da skill). Depois do login, zero erro e zero warning em toda a jornada (carga, tema, três trocas de idioma, três viewports). A outra mensagem informativa é o convite do React DevTools do Vite.
Network: 4 requisições XHR na sessão inteira — `GET /api/me` 401 (pré-login), `GET /sanctum/csrf-cookie` 204, `POST /api/login` 200, `GET /api/dashboard/metricas?period_start=2025-08-22&period_end=2026-08-22` 200 (49 ms). Uma única chamada ao dashboard: as três trocas de idioma e as duas de tema NÃO disparam refetch. Payload verificado (`response-body 474`): `view=redator`, `resumo.turmas_em_andamento=2`, `proximas_turmas=1`, `pendencias_documentais=3`, `agenda.in_progress=[]`, `agenda.starting_soon=[]`, `agenda.ending_soon=[]`, `agenda.overdue=[turma 4, turma 1]`.
Performance: nenhuma medição de performance foi tomada além do `duration: 49ms` que a própria captura de rede registra para `/api/dashboard/metricas`. Sem alegação de lentidão.
Untested states: (a) `loading` — o esqueleto (`DashboardSkeleton`) não foi capturado; a resposta local volta em ~50 ms e retardá-la exigiria interceptação de rota, proibida pela skill; (b) `error` da view (`AppErrorState`) e (c) aviso lateral de falha com cache em mão (`InlineLoadState`) — ambos exigem falha fabricada; (d) `unauthorized` — inalcançável por construção no papel redator (as 6 chaves do contrato são não-anuláveis); (e) vazio de `Documentación pendiente` e vazio de `Agenda` — o redator provisionado tem 3 pendências e 2 turmas atrasadas, e zerar isso seria mutação de dado; (f) sidebar recolhida/expandida por ação do usuário — o rail colapsado do 390x844 foi observado como resultado do reflow, não acionado.

## Findings
### UI-01 — "Ir a Mi Perfil" é a única ação da pendência e leva ao lugar onde ela não pode ser resolvida
Classification: C
Surface/journey: Dashboard `ready-redator` → card "Documentación pendiente" → botão "Ir a Mi Perfil"
Viewport: 1440x900 (reproduz igual em 1024x768 e 390x844 — o botão é o mesmo em todas)
Reproduction: logar como redator, abrir `/`, ler as três linhas do card "Documentación pendiente" ("Falta: EVALUACION_REDATOR", "Falta: PRUEBAS, EVALUACION_REDATOR", "Falta: MANUAL, PRUEBAS, EVALUACION_REDATOR") e clicar em "Ir a Mi Perfil". A página `/perfil` abre na seção "DOCUMENTACIÓN PROFESIONAL" com quatro slots: Currículum (CV), Certificado REUF, Título universitario, Post-Grado. Nenhum deles é MANUAL, PRUEBAS ou EVALUACION_REDATOR. Voltar e abrir `/operacion/turmas/4` → aba "Documentación": ali estão os três tipos, com "Evaluación del redactor · Pendiente · Subir PDF" — exatamente o documento que o Dashboard apontou.
Evidence: evid-ui01-perfil-documentos.png; evid-ui01-turma4-documentacion.png; step1-load-1440x900.png (o card e o botão); `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx:36-41`; `frontend/src/features/operation/lib/turmaDocuments.ts:6`; `frontend/src/features/identity/hooks/useProfileDocuments.ts:5,30`
Observed fact: os tipos listados na pendência são `TurmaDocumentType` (`MANUAL`, `PRUEBAS`, `EVALUACION_REDATOR`); os slots de `/perfil` são `RedatorDocumentType` (CV, REUF, título, pós-graduação). São dois conjuntos disjuntos. A aba "Documentación" da turma, acessível ao redator, oferece o upload do tipo pendente.
Inference: o docblock de `PendenciasList` afirma que "o Redator anexa documento POR LÁ" (Meu Perfil); isso vale para a documentação PESSOAL dele — que é o assunto do card "Alertas" ao lado —, não para a documentação da TURMA, que é o assunto deste card. O destino foi herdado do vizinho errado.
Impact: a única ação oferecida na seção "Requiere mi acción" termina numa página onde o trabalho apontado não existe. O redator sai do Dashboard, não encontra os campos, e precisa descobrir sozinho que o caminho é Operación → turma → Documentación. As três pendências continuam abertas, e documentação de turma é o gate de habilitação (peso legal).
Recommendation: levar a ação ao lugar onde ela se resolve — a linha da pendência já traz `turma_id`, e a rota `/operacion/turmas/:id` existe e é acessível ao papel. Ou cada linha vira navegação para a turma (como já são as linhas do `AgendaPanel`, que apontam para `/operacion/turmas/:id`), ou o botão do cabeçalho deixa de ser "Ir a Mi Perfil". Decidir com o João qual das duas formas — a segunda mantém uma ação só por card, a primeira dá destino por linha e elimina a ambiguidade de "qual das três turmas".
Rule/reference: rubrica Eixo 1 condição C ("leva a destino incorreto"); `.claude/rules/frontend-fsliced.md` — "Vocabulário de domínio é o do backend"; `AgendaPanel.tsx:59` como precedente de linha navegável na mesma tela

### UI-02 — o código cru do enum vai à tela nos três idiomas
Classification: C
Surface/journey: Dashboard `ready-redator` → card "Documentación pendiente" → linha de cada turma
Viewport: 1440x900 (idem 1024x768 e 390x844)
Reproduction: abrir `/` como redator em EN → lê-se "Missing: MANUAL, PRUEBAS, EVALUACION_REDATOR"; trocar para ES → "Falta: MANUAL, PRUEBAS, EVALUACION_REDATOR"; trocar para PT → "Falta: MANUAL, PRUEBAS, EVALUACION_REDATOR". O texto dos tipos não muda em nenhum dos três.
Evidence: step1-load-1440x900.png (EN), step4-es-1440x900.png (ES), step5-pt-1440x900.png (PT); `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx:64`; `frontend/src/app/pages/Dashboard/admin/CompliancePanel.tsx:70-80`; `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json:779`
Observed fact: `PendenciasList` imprime `item.missing_types.join(', ')` — os identificadores do enum. As chaves `operation.documents.type.MANUAL|PRUEBAS|EVALUACION_REDATOR` existem nos três locales ("Evaluación del redactor", "Avaliação do redator", "Editor assessment") e são usadas na aba Documentación da turma e no `CompliancePanel` da view admin DESTE MESMO Dashboard, corrigido na revisão de 2026-08-22 (UI-07).
Inference: a correção anterior tratou a coluna do admin e não alcançou a lista do redator, que compõe a mesma frase a partir do mesmo array. Não é o caso da pendência D-38 (frase pronta vinda do backend, que exigiria `Accept-Language`): aqui o backend manda as PARTES e quem compõe é o cliente, que já tem as três traduções em mão.
Impact: o redator lê identificador de banco em vez do nome do documento, no único ponto da tela que lhe diz o que fazer. O mesmo documento aparece como "EVALUACION_REDATOR" no Dashboard e como "Evaluación del redactor" na aba onde ele é enviado — o usuário precisa fazer a correspondência sozinho.
Recommendation: mapear os tipos pela chave existente antes do `join`, como o `CompliancePanel` faz: item.missing_types.map((tipo) => t('operation.documents.type.' + tipo)).join(', '). Correção de uma linha, no dono do texto.
Rule/reference: rubrica Eixo 8 condição C ("exibe idioma inesperado ou oculta informação necessária") e Eixo 7 condição B/C (divergência de padrão contra tela irmã já corrigida); spec D1 delimita D-38 e não cobre este caso

### UI-03 — a lista de documentos faltantes é cortada em 390x844 e não há como recuperá-la
Classification: C
Surface/journey: Dashboard `ready-redator` → card "Documentación pendiente" → linha da turma com mais documentos pendentes
Viewport: 390x844 (não reproduz em 1024x768 nem em 1440x900)
Reproduction: em 390x844, rolar até "Requiere mi acción". A terceira linha exibe "Falta: MANUAL, PRUEBAS, EVALUACI…". Medição da caixa: `clientWidth=229px`, `scrollWidth=292px` — 63px de texto fora da caixa. A segunda linha ("Falta: PRUEBAS, EVALUACION_REDATOR") mede 229 contra 233 e perde o último caractere. Nas mesmas linhas em 1024x768 (`cw=544, sw=544`) e 1440x900 (`cw=391, sw=391`) não há corte.
Evidence: step7b-es-390x844-mid.png; medição por `eval` sobre `span.truncate` (valores acima); `frontend/src/app/pages/Dashboard/redator/PendenciasList.tsx:62-64`
Observed fact: o `<span>` da linha "Falta:" tem `truncate` e, ao contrário do `<span>` do nome do curso logo acima (`title={item.course_name}`), NÃO tem atributo `title` nem qualquer outro caminho para o texto completo. A linha que perde mais texto é justamente a da turma com três documentos pendentes.
Inference: o `truncate` foi copiado do nome do curso sem o `title` que o acompanha lá; e mesmo o `title` não resolveria em 390px, porque tooltip por hover não existe em toque — é a mesma razão registrada no `AgendaPanel` (UI-01 da revisão de 2026-08-17).
Impact: no telefone o redator vê que falta documentação e não vê QUAL. O dado escondido é o que decide a ação, e é dado de gate de habilitação de turma. Corrigir UI-02 agrava o corte: "Falta: Manual, Pruebas, Evaluación del redactor" é mais longo que a string de códigos.
Recommendation: deixar a linha quebrar em vez de truncar (a lista é curta e limitada a três tipos) — trocar `truncate` por quebra normal nesse `<span>`, mantendo o `truncate` do nome do curso. Verificar na tela, em 390x844, com a turma de três tipos.
Rule/reference: rubrica Eixo 3 condição C ("truncam conteúdo essencial") e Eixo 4 condição C ("conteúdo essencial … cortado"); precedente do `AgendaPanel` (UI-01 de 2026-08-17)

### UI-04 — a turma contada em "Próximas clases" não aparece em nenhuma janela da agenda
Classification: B
Surface/journey: Dashboard `ready-redator` → "Mi situación" (KPI) versus "Mis clases" (Agenda)
Viewport: 1440x900 (idem nas outras duas)
Reproduction: abrir `/` como redator. Os KPI dizem "Clases en curso 2", "Próximas clases 1". O card "Agenda" traz contagem 2 e uma única janela, "ATRASADAS", com as turmas 4 (06-07→31-07-2026) e 1 (20-07→14-08-2026). A terceira turma — id 6, 01-09→10-09-2026, conferida em `/operacion/turmas/6` — não aparece em nenhuma janela. O payload confirma: `starting_soon`, `ending_soon` e `in_progress` chegam vazios.
Evidence: step1-load-1440x900-scrolled.png; `response-body 474` (payload citado em Technical signals); `/operacion/turmas/6` (Fecha de inicio 01-09-2026, Fecha de término 10-09-2026)
Observed fact: o número do KPI e o conteúdo da agenda vêm de contagens diferentes do backend; a janela `starting_soon` não alcança uma turma que começa em 10 dias.
Inference: o recorte das quatro janelas é decidido em `backend/app/Domains/Dashboard` e é mais estreito que o do KPI. O front só desenha o que recebe — `AgendaPanel` esconde janela vazia por desenho (D13), então não há nada a corrigir no cliente.
Impact: a seção chamada "Mis clases" mostra 2 das 3 turmas do redator, sem dizer que omite uma. Quem lê "Próximas clases 1" não encontra qual é. O dado não se perde por completo — a turma 6 aparece na pendência documental, com a data — então há esforço extra, não bloqueio.
Recommendation: não corrigir nesta fatia. O ajuste é da janela no backend, e o fence de escopo deste bloco proíbe tocar `backend/` (spec, "Fora desta fatia" e D1). Registrar ficha `D-*` no backlog apontando para o item que revisar as métricas do Dashboard.
Rule/reference: rubrica Eixo 5 condição B ("o estado é compreendido, mas … diferenciação pode ser mais clara"); spec §"Fora desta fatia" — nenhuma linha de `backend/`

### UI-05 — o menu de idioma não marca o idioma ativo, e destaca o primeiro item
Classification: B
Surface/journey: cabeçalho do shell, na jornada de troca de idioma da view
Viewport: 1440x900
Reproduction: com a interface em EN, clicar no botão "Language". O menu abre com ES, PT e EN; o item ES vem com fundo destacado e nenhum dos três indica qual está ativo. No snapshot de acessibilidade os três são `menuitem` sem `aria-checked`/`aria-current`.
Evidence: step3-langmenu-1440x900.png (menu aberto com EN ativo e ES destacado); snapshot com `menuitem "ES"/"PT"/"EN"`; `frontend/src/shared/ui/LanguageMenu/LanguageMenu.tsx:23-27`
Observed fact: os itens do menu são montados a partir de `SUPPORTED_LANGUAGES` sem estado de seleção; o destaque visual do primeiro item é o foco que o menu do PrimeReact aplica ao abrir.
Inference: o destaque no item errado pode ser lido como "o idioma atual é ES" enquanto a tela inteira está em inglês. O botão que abre o menu mostra bandeira e código do idioma corrente, então a informação existe — a um clique de distância do lugar onde ela contradiz.
Impact: hesitação de um passo na troca de idioma; nenhuma ação incorreta observada, e a troca funciona nos três sentidos (EN→ES→PT→ES, `<html lang>` acompanhando).
Recommendation: marcar o item ativo no `LanguageMenu` (`shared/ui`, onde a correção alcança todo consumidor). Se entrar nesta fatia, provar na tela com os três idiomas; se não, vira ficha `D-*`.
Rule/reference: rubrica Eixo 1 condição B ("feedback aumenta hesitação"); ADR-15; correção pertence a `shared/ui`, nunca ao call-site

## Summary
A: (1) A jornada completa termina nos três viewports: carga, leitura das quatro seções, troca de tema nos dois sentidos e troca de idioma EN→ES→PT→ES, sem erro de console depois do login e com uma única chamada de API. (2) Tema escuro medido, não presumido: "Falta:" 8,58:1, "Hasta <data>" 6,23:1 e texto de corpo 11,40:1 contra o `#1e293b` do card — todos acima de 4,5:1. (3) Teclado: Tab alcança o link "Saltar al contenido", o menu lateral, o menu do usuário, o botão "Ir a Mi Perfil" e as duas linhas da agenda, com anel de foco visível (`outline: 2px solid`) em todos. (4) Sem overflow horizontal em 390x844 (`document.scrollWidth == window.innerWidth == 390`); o rail lateral colapsa e os KPI viram linha rótulo/número, como o desenho previa. (5) Os quatro KPI ficam com os números na mesma base em 1024x768, mesmo com o rótulo de três linhas — o defeito UI-06 de 2026-08-17 não voltou. (6) A agenda com uma única janela preenchida usa a largura inteira em vez de meia grade — UI-01 de 2026-08-17 não voltou.
Falsos positivos descartados, com o motivo: (a) `period_start`/`period_end` na chamada do dashboard, embora o redator não tenha seletor de janela — o payload devolvido é `view=redator` e nada na tela depende dos parâmetros; sem impacto observável. (b) A mesma turma contada em "Clases en curso" e listada sob "ATRASADAS" — não é contradição: a turma segue aberta (`En curso` em `/operacion/turmas/4`) e já passou da data de término; as duas leituras são complementares. (c) O item do menu de idioma renderiza `<a href="#">` dentro de `menuitem` — markup padrão do `Menu` do PrimeReact, sem impacto observado no percurso por teclado (o foco chega e o comando dispara). (d) O KPI "Mis documentos por vencer" mantém o trilho âmbar com valor 0 — o tom descreve a natureza da métrica, não o valor, é o mesmo critério dos quatro cards e o número está visível ao lado. (e) O card "Documentación pendiente" fica com folga no rodapé em 1440x900 — é a grade igualando a altura ao card "Alertas" ao lado, diferença intencional de grupo.
Preferências de sessão alteradas pela própria jornada, declaradas: tema e idioma foram trocados porque a superfície pedida os inclui; ambos vivem no `localStorage` do perfil efêmero desta sessão de revisão (`lotus-lang`, `lotus-ui`) e foram devolvidos ao estado inicial (claro, es-CL) ao fim da run. Nenhuma escrita na API além do login.
B: 2 (UI-04, UI-05)
C: 3 (UI-01, UI-02, UI-03)
Mutations performed: none
Code changes performed: none
END LOTUS UI REVIEW REPORT
```

## 3. Passe de correção

> A preencher depois da triagem com o João (Task 5 do plano). Até lá, os cinco achados
> permanecem propostos: 3 `C` (UI-01, UI-02, UI-03) e 2 `B` (UI-04, UI-05).
