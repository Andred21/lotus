# Bloco 41 — rulings da execução

> Decisões tomadas em nome do João durante o `/executar-bloco 41`, uma por linha, cada uma com o custo se estiver errada.

- **Pipeline de profundidade 1 não usado.** O plano não tem `## Grupos paralelos`, então a execução foi estritamente sequencial (implementador, revisor da task, próxima task). Não há desvio do §5.1 a registrar. Custo se errado: nenhum, só tempo de parede.
- **Task 1: `frontend/src/shared/types/typescript-transformer-manifest.json` entrou no commit** junto com o `generated.ts`. É o hash que o `typescript:transform` regenera. Custo se errado: nenhum funcional.
- **Task 2: arquivos editados fora do `Files:`.** O `RedatorScopeQuery` ganhou `with('redatores')`, porque o novo requisito de redator fazia lazy-load com o `preventLazyLoading` ligado. O `ListQueryBudgetTest` subiu `DASHBOARD['redator']` de 7 para 8 consultas. As fixtures de `PipelineQueryTest` e `TurmaQueryBuilderTest` passaram a designar redator, para a turma seguir "habilitada". Custo se errado: uma consulta a mais no dashboard do redator.
- **Task 3: `EnrollmentQueryBuilder::withStudentData()` criado fora do `Files:`** para o `EmissionPanelQuery`. Sem ele, o painel de emissão herdava o `afterQuery` da trava de resultado e fazia uma consulta extra a `certificates`. O `SoftDeletedRelationProjectionTest` passou a usar `fresh()->loadListingData()`. O `afterQuery` funcionou e o fallback do plano não foi usado. Custo se errado: uma escolha de API a mais no query builder.
- **Task 4: `EnrollmentResultCells.tsx` criado fora do `Files:`.** Extrair as células de NOTA e ASISTENCIA mantém o `EnrollmentTable.tsx` dentro do `max-lines: 150`. A asserção do `EnrollmentSection.test.tsx` foi invertida: na turma concluída, o admin agora vê "Registrar resultado". Custo se errado: um componente a mais na pasta `Enrollment/`.
- **Task 4: o aviso `operation.detail.lock.concluida` aparece para todo papel na turma concluída,** inclusive para o redator, que não corrige resultado. O plano não separa o banner por papel, e separar é decisão de UI do João. Custo se errado: o redator lê um aviso sobre uma correção que só o admin faz.
- **Task 5: `RemoveEnrollmentDialog.tsx` criado fora do `Files:`.** É uma extração literal, que deixou o `EnrollmentTable.tsx` com 145 linhas, abaixo das 150. Custo se errado: nenhum funcional.
- **Task 7: o piso da tabela de alunos fica em `40rem`.** A 390 px, NOTA, ASISTENCIA e ESTADO cabem numa linha. O RUT quebra no hífen porque a coluna não tem `identifierClass`, e isso vem de antes do bloco: ela tinha cerca de 105 px no piso antigo e precisa de cerca de 133 px. Medido no navegador, nem `48rem` evita a quebra. A medida está no `smoke.md`. Custo se errado: o RUT segue partido a 390 px até a pendência abaixo ser paga.
- **Ambiente: `npm install -g @playwright/cli@latest`** para o smoke no navegador. O `playwright-cli` não estava instalado. O pacote ficou global na máquina, fora da worktree. Custo se errado: um pacote global a desinstalar.
- **Smoke: o banco local da lane (offset +1) ficou com dado de teste.** A turma 2 está concluída, e a matrícula 21 tem nota, presença e certificado emitido. `migrate:fresh --seed` restaura. Custo se errado: nenhum fora da lane.
- **Revisão final, I-1: a presença com vírgula passou a ser corrigida no front.** O smoke mostrou que o diálogo sugere o status a partir de `87,5`, mas a API recusa com `El campo attendance pct debe ser numérico.`. O corpo do PUT agora vai com `trim()` e `,` trocada por `.`, e há teste. O backend não mudou e segue validando `numeric`. Custo se errado: nenhum relevante.
- **Revisão final, I-2: corrida entre a emissão do certificado e a correção do resultado.** A opção tomada foi a (b). O docblock do `RecordEnrollmentResultAction` agora diz o que o `lockForUpdate` da vigência garante: se a emissão já entrou na transação, a correção espera e recebe 422. Diz também a janela que fica: o `IssueCertificateAction` decide a porta 2 e monta o snapshot a partir da matrícula carregada antes da transação. Fechar a janela (reler a matrícula com `lockForUpdate` dentro da transação da emissão) virou pendência, porque mexe no núcleo de peso legal de Certification, fora dos `Files:` do plano. Custo se errado: uma correção que entre nessa janela de milissegundos produz um certificado com o resultado antigo, até a pendência ser paga.
- **Revisão final, minor 3: o título da lista ganhou a contagem,** "Alunos sem nota ou presença (N):", nas 3 locales. A spec §4.6 pede a contagem e vence o plano, que não a trazia. Custo se errado: só o texto do título.
- **Revisão final, minor 4: só os comentários desatualizados foram corrigidos,** em `TurmaDetailPage.tsx` e no docblock de `lib/turmaStatus.ts`. Eles diziam que a conclusão trancava o resultado. Em `turmaStatus.ts`, "sete Actions" virou "as demais escritas", porque a contagem já estava errada: há 18 ocorrências de `assertAcademicallyWritable` no backend. O banner por papel fica como está (ver a Task 4). Custo se errado: nenhum funcional.
- **Revisão final, testes que faltavam:** um teste de renderização do aviso da regra no `RegisterResultDialog`, com Salvar habilitado, e a tabela concluída mostrando nota e presença. No `EnrollmentTable.test.tsx`, o caso da turma concluída não é um teste novo: o teste existente virou `it.each([false, true])` sobre `registroBloqueado`, porque um teste separado deixava o arquivo com 157 linhas, acima do `max-lines: 150`. Custo se errado: nenhum funcional.
- **Pendências para o João (fora do plano, a registrar em `docs/superpowers/pendencias/abertas.md` no fechamento):**
  - `identifierClass` na coluna RUT do `EnrollmentTable` e do `ArchivedEnrollmentsList`, para o RUT não quebrar no hífen a 390 px;
  - o `CompliancePanel` não mostra os requisitos novos. Hoje mostra "Habilitada: No" com "—" quando a turma presencial não tem local ou não tem redator;
  - serializar a emissão e a correção pela linha da matrícula, com `lockForUpdate` em `Enrollment` nos dois lados e a porta 2 dentro da transação (ver I-2). O docblock do `RecordEnrollmentResultAction` já fala em "pendência registrada";
  - o diálogo de conclusão diz "irreversível", mas o aviso da turma concluída diz que o admin ainda corrige o resultado. É decisão de copy.

  Custo se errado: cada item segue como está até alguém pagar.
- **Parqueados, sem correção:**
  - o aviso da regra mostra a presença salva crua (`80.00`), porque o plano manda mostrar os valores "como digitados";
  - o F1 troca só a primeira vírgula. Com duas vírgulas, a API devolve 422;
  - o docblock reescrito de `lib/turmaStatus.ts` ficou com uma linha longa sem reflow.

  Custo se errado: cosmético.
- **Minors adiados que ficam** (vindos das revisões das tasks):
  - a fixture de `TurmasTable.test.tsx` não tem `approval_rule`;
  - `approval_rule` vem antes de `client_rut` no `TurmaData`;
  - o ramo `asOfArchiving` do `TurmaStatusParityTest` não exercita o requisito de redator;
  - o `ConcludeTurmaAction` calcula `missingTypes` e `missingRequirements` duas vezes;
  - o `assertNull(attendance_pct)` é fraco;
  - `Enrollment::markResultLocks` usa `app(ResultLock::class)` no model;
  - o `afterQuery` tipado como `Eloquent\Collection` quebra se alguém encadear `pluck()`;
  - `result_locked` não é rejeitado no corpo do PUT;
  - o teste de auditoria decodifica as notas condicionalmente;
  - não há teste da corrida em MySQL, porque em sqlite o lock é no-op;
  - `formatAttendance` com valor não numérico dá "NaN %";
  - `canResult` só lê `result_locked` na turma concluída;
  - `rule === undefined` é redundante no `ruleWarning`;
  - o helper de teste usa `null` para "sem regra";
  - o `useConclusionSection` consulta as matrículas também na turma concluída;
  - o `IncompleteResultsList` usa `key={i}`.

  Custo se errado: limpeza pendente.
