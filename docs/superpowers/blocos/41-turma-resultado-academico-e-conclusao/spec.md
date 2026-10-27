# Bloco 41 — `turma-resultado-academico-e-conclusao` — spec

> Ficha: `docs/superpowers/backlog.md` §41. Lane `feat/41-turma-resultado-academico-e-conclusao`,
> base `main@dfa34847`. Brainstorming em 2026-10-24 com o João.

## 1. Intenção

O admin da Lotus lança nota e presença de cada aluno da turma e declara o resultado (aprobado,
reprobado, pendiente). Hoje:

- a tabela da aba Alunos mostra só nome, RUT e status — nota e presença ficam invisíveis;
- o status é escolhido à mão mesmo quando nota e presença já dizem o resultado;
- a turma concluída tranca o registro acadêmico inteiro, e uma nota errada de um aluno ainda sem
  certificado não tem como ser corrigida;
- a conclusão só bloqueia por documento faltante, e não avisa de aluno sem nota ou presença.

O bloco faz o sistema **sugerir** o resultado pela regra mínima, **avisar** sem travar quando o
humano diverge dela, deixar corrigir o resultado depois da conclusão enquanto não há certificado, e
mostrar quem está incompleto na hora de concluir.

## 2. Estado de partida (medido no código, `main@dfa34847`)

- **A "regressão" não é regressão em produção.** As colunas NOTA/ASIST. % que o João viu nasceram
  na rodada de UI Impeccable (`c4f82d4e`, branch `docs/impeccable-product`, 24 commits nunca
  mesclados). A `main` — e portanto produção — nunca as teve. **Decisão do João: refazer sobre a
  `main`, ignorando a branch Impeccable** (§3, D1).
- `EnrollmentTable.tsx` tem colunas nome, RUT, status e ações; a coluna de ações some inteira com
  `registroBloqueado` (turma concluída).
- `RegisterResultDialog.tsx` + `useRegisterResult.ts`: `AppDropdown` de status, `AppInputText` de
  nota final (`grades.final`, texto livre — `PrintableGrade` aceita número ou string não vazia,
  "6,4" com vírgula) e de presença (`attendance_pct`, numérico 0–100).
- `AcademicResult.php`: "aprovação é DECLARADA pelo admin (decisão do João, 2026-08-07)"; nenhuma
  regra de corte existe no schema nem no código.
- `RecordEnrollmentResultAction` chama `Turma::assertAcademicallyWritable()`, que recusa com 422
  (`operation.turma.concluded_locked`) qualquer turma fora de `em_andamento`.
- `ConcludeTurmaAction` bloqueia só pelos tipos de documento faltantes
  (`TurmaHabilitacaoService::for()->missingTypes()`: MANUAL, PRUEBAS, EVALUACION_REDATOR). Turma sem
  redator conclui. `TurmaData::rules()` já exige `local_aplicacao` no presencial na escrita, mas o
  dado legado (carga inicial, bloco 38) pode ter nulo.
- `ConcludePanel.tsx` lista os documentos faltantes num `AppCard tone="warning"` e confirma por
  `ConfirmDialog` com mensagem fixa.
- `Certificate` (Certification) liga a `enrollment_id`; `active_enrollment_id` (coluna gerada) só é
  preenchida quando `status = emitido`. Revogado não conta como ativo.
- A dependência entre domínios aponta Certification → Operation (`CertificateSnapshotBuilder`,
  `CertificateEligibility` importam `Enrollment`). Operation não importa Certification hoje.
- `Enrollment` já é `Auditable` (lei 2): toda escrita de resultado gera trilha.

## 3. Decisões (do João, 2026-10-24)

- **D1 — Base:** refazer sobre a `main`. A branch `docs/impeccable-product` não entra, não é
  portada nem lida como referência de implementação. Conflito futuro com ela é custo aceito.
- **D2 — Regra mínima:** nota **≥ 4,0** (escala chilena 1,0–7,0) **e** presença **≥ 70 %**. Fixa
  agora, num ponto único do backend, para no futuro virar `courses.note_min` /
  `courses.presence_min` sem tocar no frontend.
- **D3 — Status automático, nos dois sentidos:** com nota **e** presença preenchidas e legíveis,
  atingir as duas põe o status em `aprobado`; ficar abaixo de qualquer uma põe em `reprobado`. A
  escolha manual continua livre e é salva como escolhida.
- **D4 — Divergência avisa, não trava:** status salvo/escolhido diferente do que a regra diria
  mostra aviso no estilo do aviso da soma de módulos do curso (`AppCard tone="warning"`, o mesmo
  padrão do aviso de idoneidade do redator do bloco 39). O salvar segue liberado.
- **D5 — Pós-conclusão:** com a turma concluída, **só** o resultado (nota, presença, status) segue
  editável, e só para matrícula **sem certificado emitido** (ativo). Com certificado emitido, a
  matrícula fica trancada. Matricular, importar, remover e restaurar continuam bloqueados na turma
  concluída. **Só o admin corrige depois da conclusão** (decisão do João, após o builder check): a
  escrita pós-conclusão exige `operation.enrollment.manage`; o redator, que tem só
  `operation.enrollment.record_result` (RN-02), lança apenas com a turma em andamento.
- **D6 — Bloqueio da conclusão:** conclui só com (a) os três tipos de documento, (b) pelo menos um
  redator designado e (c) a configuração completa — hoje, `local_aplicacao` preenchido quando a
  modalidade é presencial. O backend é a fonte única; o painel mostra cada pendência.
- **D7 — Alunos incompletos não bloqueiam:** sem bloqueio, o diálogo de confirmação da conclusão
  lista no corpo os alunos sem nota e/ou sem presença, no aspecto do resumo da importação de alunos
  (`ImportResultSummary`: título em `font-medium` + `ul role="list" list-disc`), e a conclusão
  segue.

## 4. Desenho

### 4.1 Regra de aprovação (backend, ponto único)

- Um objeto de valor em `Domains/Operation` (ex.: `ApprovalRule`) com `minGrade = 4.0` e
  `minAttendancePct = 70`, construído por um único método (ex.: `ApprovalRule::forTurma(Turma)`),
  que hoje devolve as constantes e amanhã lerá o curso. Ninguém mais escreve 4 ou 70.
- A regra viaja ao frontend pelo `TurmaData` (campos novos, ex.: `approval_min_grade`,
  `approval_min_attendance`), regenerando `generated.ts` (lei 3). O frontend nunca crava os números.
- O backend **não** recusa divergência: aprovação continua declarada (D4). O docblock de
  `AcademicResult` passa a dizer "declarada, com sugestão pela regra mínima".

### 4.2 Sugestão e aviso (frontend)

- Função pura em `features/operation/lib/` (ex.: `suggestedStatus(grade, attendance, rule)`)
  devolve `'aprobado' | 'reprobado' | null`. `null` quando nota ou presença está vazia ou ilegível.
  Nota legível = número com vírgula ou ponto decimal ("6,4", "6.4", "6") **dentro da escala
  1,0–7,0**; texto que não é número (permitido pelo `PrintableGrade`) e número fora da escala ("35",
  "65") não avaliam a regra. Presença legível = número 0–100.
- No `useRegisterResult`: **a cada edição** de nota ou presença, se a sugestão (recalculada) for
  não-nula, o status do formulário passa a ela — mesmo que a sugestão não tenha mudado de valor.
  Escolher o status à mão vale até a próxima edição de nota/presença. Abrir o diálogo **não**
  reescreve o status salvo. Exemplos: status manual `reprobado` com sugestão `aprobado`, e a nota
  vai de 5 para 6 → status volta a `aprobado`; matrícula salva `pendiente` com 5 / 80, presença
  editada para 85 → status vira `aprobado`.
- Aviso de divergência: sugestão não-nula e diferente do status do formulário → `AppCard
  tone="warning"` dentro do diálogo, com texto que nomeia a regra (ex.: "Nota 5,0 e presença 60 %
  ficam abaixo do mínimo (4,0 e 70 %). Você pode salvar assim mesmo."). Mesmo padrão de texto do
  `hoursMismatch`. Chaves nas 3 locales.
- Fora disso o diálogo mantém o combobox (`AppDropdown`) e os campos atuais.

### 4.3 Nota e presença na tabela

- `EnrollmentTable` ganha as colunas NOTA e ASIST. % entre RUT e status, com dado técnico em
  `technicalDataClass` e travessão em texto normal quando nulo. Presença formatada na locale
  ("92,5 %" em es-CL/pt-BR). O orçamento de largura (`enrollmentWidths`, `COL.*`) acomoda as duas
  colunas novas nos dois estados de `actions`.
- `EnrollmentData` já carrega `grades` e `attendance_pct`; a nota exibida é `grades.final`.

### 4.4 Edição pós-conclusão

- Backend: `RecordEnrollmentResultAction` deixa de chamar `assertAcademicallyWritable()` e passa a
  exigir (a) turma não arquivada, (b) matrícula **sem certificado ativo**, recusando com 422 e
  mensagem própria (nas 3 locales do backend) quando há certificado emitido, e (c) com a turma
  concluída, ator com `operation.enrollment.manage` — sem ela, a recusa continua a de hoje
  (`concluded_locked`, 422). As outras escritas acadêmicas (matricular, importar, remover,
  restaurar) mantêm o `assertAcademicallyWritable()`.
- "Certificado ativo" = `status = emitido`, a mesma definição de vigente que o
  `CertificateVigenciaResolver` já usa e que a emissão já respeita ao permitir reemitir após
  revogar. Certificado `revocado` não tranca.
- A pergunta "a matrícula tem certificado ativo?" respeita a direção Certification → Operation:
  Operation não importa classe de Certification. Como responder (coluna `active_enrollment_id` por
  query em Operation, contrato em `Shared` implementado por Certification, ou relação declarada) é
  escolha do plano, justificada.
- `EnrollmentData` ganha um booleano de saída (ex.: `result_locked`, `#[ReadOnly]`/só saída) que
  diz se a matrícula tem certificado ativo, para o front decidir a ação por linha. Sem N+1 na
  listagem (carga declarada no builder de listagem).
- Frontend: com a turma concluída, a coluna de ações reaparece contendo **só** "registrar
  resultado", e só nas linhas com `result_locked = false`; remover não aparece. O aviso do topo da
  página ("o registro acadêmico ficou bloqueado") passa a dizer que só o resultado de quem ainda não
  tem certificado pode ser corrigido. Matricular/importar/arquivados seguem como hoje na concluída.
- A trilha de auditoria do `Enrollment` registra a correção pós-conclusão (já é `Auditable`; um
  teste prova o registro).

### 4.5 Bloqueio da conclusão

- O `TurmaHabilitacaoService` (ou o VO que ele devolve) passa a responder também redator ausente e
  configuração incompleta. `habilitada` = sem nenhuma pendência das três. O `ConcludeTurmaAction`
  recusa com 422 nomeando cada pendência, lendo fresco dentro da transação como já faz com os
  documentos.
- `TurmaData` expõe as pendências não-documentais (ex.: `missing_requirements: ('redator' |
  'local_aplicacao')[]`) ao lado de `missing_document_types`.
- `ConcludePanel` lista as três famílias de pendência no card de aviso existente. Display status
  `habilitada` passa a significar "pronta para concluir" com o novo critério.
- Turma já concluída não é revalidada (o critério só vale na transição).

### 4.6 Diálogo de confirmação da conclusão

- `ConfirmDialog` ganha corpo customizado se ainda não tiver (filhos ou prop de conteúdo, em
  `shared/ui`). Abaixo da mensagem atual, quando houver matrícula ativa sem nota final **ou** sem
  presença, aparece um bloco no aspecto do `ImportResultSummary`: título em `font-medium` ("Alunos
  sem nota ou presença (N)") e `ul role="list" list-disc` com um item por aluno — nome e o que
  falta ("sem nota", "sem presença", "sem nota e presença").
- A lista deriva no front das matrículas ativas da turma (o hook da seção de conclusão consome o
  hook de matrículas da própria feature). Confirmar segue habilitado.

## 5. Critérios de aceite (provados por teste)

1. Tabela da aba Alunos mostra nota e presença, em turma em andamento e concluída; nulo vira
   travessão. (vitest de componente)
2. `suggestedStatus`: 4,0 e 70 → aprobado; 3,9 e 100 → reprobado; 7 e 69,9 → reprobado; "6,4"
   com vírgula lê; nota vazia, presença vazia, texto não numérico ou nota fora de 1,0–7,0 ("35")
   → `null`. (vitest)
3. No diálogo: digitar nota 5 e presença 80 põe status `aprobado`; trocar à mão para `reprobado`
   mostra o aviso e o salvar envia `reprobado`; editar a nota de 5 para 6 depois disso volta o
   status a `aprobado`. Abrir matrícula salva divergente mostra o aviso sem mudar o status.
   (vitest)
4. `TurmaData` carrega a regra (4.0, 70) vinda do ponto único. (PHPUnit)
5. Turma concluída: PUT do resultado de matrícula sem certificado, pelo admin, passa (200) e gera
   audit; pelo redator da turma recusa 422; com certificado `emitido` recusa 422; com certificado
   `revocado` passa. Matricular/remover em turma concluída seguem 422. Turma em andamento: o
   redator segue lançando como hoje. (PHPUnit)
6. `EnrollmentData.result_locked` true só com certificado emitido, sem N+1 na listagem. (PHPUnit)
7. Concluir sem redator → 422; presencial sem `local_aplicacao` → 422; sem documento → 422 como
   hoje; com tudo → 200, mesmo com aluno sem nota. `TurmaData.missing_requirements` reflete cada
   caso. (PHPUnit)
8. Diálogo de confirmação lista os alunos sem nota/presença e confirma; sem incompletos, a lista
   não aparece. Painel mostra redator/configuração faltantes. (vitest)
9. Turma concluída no front: ação "registrar resultado" só nas linhas sem certificado; remover
   ausente. (vitest)
10. Gate: `php artisan test`, Pint nos arquivos tocados, `pnpm build`, `pnpm lint`, `pnpm test`
    verdes; `generated.ts` regenerado, nunca à mão. Verificação no navegador na stack da lane
    (offset +1) das telas: tabela, diálogo com aviso, edição pós-conclusão, conclusão com lista.

## Verificação externa

Nenhuma. O bloco cobre regra de sugestão, edição pós-conclusão e gate de conclusão, todos provados
por teste e no navegador local; chega a produção pelo espelho e pela promoção de sempre, sem passo
próprio. `efeito_externo: nao`.

## 6. Não-objetivos

- `courses.note_min` / `courses.presence_min` (migration e UI do curso) — só o ponto único.
- Mesclar ou portar a rodada Impeccable (D1).
- Mudar certificado já emitido; reemitir; revogar.
- Bloquear a conclusão por aluno incompleto (D7) ou o salvar por divergência (D4).
- Diálogo de resultado em série, controle segmentado, novo vocabulário de status.

**Anti-objetivos:** certificado emitido cujo snapshot mude; matrícula com certificado emitido
editável; número da regra escrito no frontend; `generated.ts` editado à mão; PrimeReact fora de
`shared/ui`; Operation importando classe de Certification.

## 7. Calls do Claude (confira)

- Divergência só é avaliada com nota e presença legíveis; `aprobado` com campo vazio não avisa.
- Nota não numérica (permitida pelo `PrintableGrade`) ou fora de 1,0–7,0 não dispara sugestão nem
  aviso.
- O auto-status reaplica a sugestão a cada edição de nota/presença, nunca ao abrir o diálogo.
- "Configuração completa" = `local_aplicacao` no presencial; datas e modalidade já são obrigatórias
  na escrita.
- Certificado `revocado` destrava a edição (não é ativo), pela mesma definição de vigente da
  emissão.
- `efeito_externo: nao`.
