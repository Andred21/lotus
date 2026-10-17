# Bloco 38 — Carga inicial da produção (recorte 2026)

> Spec aprovada pelo João em 2026-10-17. Ficha: `docs/superpowers/backlog.md` §38. Context
> Packet: `context.md` nesta pasta. Onde está marcado **(Claude)**, a decisão foi de Claude e o
> João pode vetar ao ler; o resto é decisão do João nesta sessão.

## 1. Intenção

Popular a produção com o histórico **2026** da v1, a pedido do cliente: o cliente SWITCH, os
alunos, os redatores com documentos, os cursos com módulos, os orçamentos e as cotações, as
turmas concluídas, as matrículas e os certificados `LOT-2026-*` já emitidos, **com o código da
planilha preservado**. Certificado tem peso legal: o que foi impresso não muda, e o que não é
confiável fica de fora em vez de ser consertado.

A ficha 38 previa 2.011 certificados de 2022 a 2026. O João reduziu o escopo: o resto do histórico
não entra.

## 2. Recorte (decisões do João)

| Tema | Decisão |
|---|---|
| Certificados, turmas, cotações, orçamentos | só os de código `LOT-2026-*` (127 linhas na planilha R1) |
| `LOT-2026-020` (SCAP `1000`, curso de 2024) | fora |
| RUT de aluno com DV inválido (linhas 005, 006, 012, 016, 020, 073, 107) | fora, sem correção |
| RUT repetido com nome diferente (059/084 na SCAP-184, 093/118 na SCAP-185) | fora, sem correção |
| `LOT-2026-127` (Aprobado, sem nota) | entra sem nota |
| Cursos | 200#, 201#, 202# (pasta `Cursos/`), 051# e 035# (aba `CURSOS`), e um 6º, "Electricidad Básica", só para a COT-177 |
| Redatores | só os 3 com pasta: MAO, CZR, COO; cada um com o e-mail do CV |
| Produção antes da carga | vazia: a aceitação do bloco 13 limpa o banco, e a carga parte do zero |
| Datas | históricas, não a da carga: `created_at` segue a data de cada registro (§5.2) |
| Redator sem REUF na turma | a carga liga o redator direto, sem o gate RN-09 (a ficha 39 rebaixa o gate para aviso em outra lane) |
| Curso da turma quando a COT diverge | o da planilha; a COT dá só o `value_uf` |
| COT 177 e 178 (sem turma) | entram como cotação `pending`, sem turma |
| Nome dos cursos 200# e 051# (mesmo NomCURSO) | "Reciclaje con LLEE AT/MT (16 h)" e "Trabajos en Líneas Energizadas AT/MT (8 h)" |
| Módulos do 051# e 035# | 035#: os 4 tópicos da aba de temário do xlsx da COT-180; 051#: **sem módulos** (não há fonte confiável; o João cadastra depois, se quiser) |
| `value_uf` | o da COT de mesmo número; COT-179 = R2 (69,92 UF, leitura de Claude); **COT-187 = 0** (o docx é cópia de 2024) |
| `student_count` | cotação com turma = número de alunos importados da turma |
| Turma do 200# (16 h, SCAP 182 e 184) | dois dias: `end_date` = `Fecha Curso` + 1 |
| Reimpressão de certificado importado | sai no layout da v2; aceito |
| Ordem em produção | o João cria os usuários dele e do cliente, fecha a aceitação do bloco 13, e só então a carga roda |

**Regra de exclusão por RUT (Claude):** RUT excluído sai **inteiro** da carga, com todas as linhas
dele, não só a linha problemática. Assim nenhuma pessoa entra com nome escolhido por heurística.

A estimativa é de **116 certificados em 10 turmas** (SCAP 176, 179–187). O número que vale é o do
relatório de extração aprovado pelo João (§9).

## 3. Não-objetivos

- Histórico de 2022 a 2025, e os instrutores sem pasta (Juan Carlos Rodríguez, Nelson González, OJI).
- Corrigir dado de origem: RUT trocado, COT trocada ou texto residual são da Lotus.
- Compatibilidade com o QR legado (Apps Script); `D-70`.
- Template de certificado e preview por curso (ficha 39 e bloco do João); firma PNG no certificado.
- Upload dos PDFs originais do Drive; reemissão de certificado.
- Licença SEC, cursos avulsos e assinaturas dos redatores (sem tipo no sistema).
- Convite, e-mail ou notificação a qualquer importado; login de aluno ou cliente (RN-01).
- Mudar a numeração da v2: `certificate_sequences` não se toca, e o próximo emitido pela v2 segue
  `LOT-2026-1000`.

**Anti-objetivos (falha mesmo que "funcione"):** RUT ou nome de aluno no git ou na imagem; e-mail
saindo para alguém; segunda execução que duplica ou altera; certificado importado que não abre em
`/validar` ou não gera PDF; carga que sobrescreve dado já existente em produção.

## 4. Entradas e arquivo canônico

**Fontes** (espelho local de `00. LEVANTAMIENTO INFO JOAO`): a planilha
`JVBA - REGISTRO CERTIFICADOS LOTUS R1.xlsx` (abas `REGISTROS` e `CURSOS`), o zip das COT, os 3
docx de `Cursos/Template/` e as pastas de `Instructores/`. A coluna `CLAVE` **nunca é lida**.

**Dado pessoal nunca entra no git nem em `backend/`** (Leis 19.628 e 21.719; `backend/` atravessa o
espelho corporativo e entra na imagem). Isso inclui RUT, nome, e-mail e telefone de aluno **e de
redator**.

**Duas peças (Claude):**

1. **Extrator** versionado, sem dado embutido. Lê só a aba `REGISTROS` da planilha (o que vem
   da aba `CURSOS` e das COT entra pelo complemento curado, item 2), aplica o recorte e as
   exclusões do §2, e gera numa pasta **fora da árvore do repositório**:
   - `carga.json`: o arquivo canônico (formato versionado com `schema_version`);
   - `documentos/`: os PDFs dos redatores, um por documento, com o PDF do CZR já dividido por
     página;
   - `relatorio.md`: contagens por entidade, cada linha recusada com o motivo, e os conflitos.
2. **Complemento curado** (`complemento.json`, na mesma pasta de dados, fora do git), escrito por
   Claude a partir dos docx e PDFs, onde a extração automática não é confiável: identidade dos
   redatores (RUT, e-mail e telefone do CV), o mapa arquivo → tipo de documento (com as páginas do
   PDF do CZR), dados do cliente (razão social, giro, endereço e contato da COT), o `value_uf` de
   cada COT e o `student_count` das COT 177 e 178, o curso "Electricidad Básica" (horas e módulos da
   COT-177), e os módulos e a descrição dos 3 docx. O extrator o funde no `carga.json` e o
   relatório o mostra, para o João conferir.

**Mapa de documentos dos redatores (Claude, sobre a análise da pasta):**

| Redator | CV | TITULO | POSTGRADO | REUF |
|---|---|---|---|---|
| MAO | `CV-SMS-Magallanes Acuña.pdf` | certificado de título UFRO (2011) | certificado de aprovação UTN-FRCON (2021) | — (não há) |
| CZR | páginas 1–5 de `Copia de CV-CZR Cert. Titulo.pdf` | página 6 (INACAP) | página 9 (UTN-FRCON) | `Copia de CZR - Registro Sence.pdf`, `valid_until` nulo |
| COO | `CV CMOO 2026 Q.pdf` | — | — | — |

O resto (licença SEC, cursos avulsos, ordenança UTN, carta, certificado de facilitador e as
firmas PNG) não tem tipo no sistema e fica de fora. REUF com `valid_until` nulo vale sempre pela
regra atual (`RedatorIdoneidadeService`); é o que o documento diz, porque ele não traz validade.

Onde o extrator mora e em que linguagem é decisão do plano, com as restrições: roda no host WSL
ou no container `app`, não depende de rede e não grava dentro do repositório.

## 5. A carga

Comando artisan `lotus:carga-inicial {pasta} {--simular}`, padrão `lotus:<verbo-kebab>`. Ele lê
`carga.json` e `documentos/`, e é a única entrada; não há seeder, e o `DatabaseSeeder` não muda.

- **`--simular`:** valida tudo, executa a carga dentro de uma transação que sofre rollback, não sobe
  arquivo ao disco e imprime a mesma tabela de contagens da carga real (a criar, já existentes, em
  conflito).
- **Real:** sobe os documentos ao disco default (S3 em produção), depois grava tudo numa transação
  única. Falha na transação → nada no banco; arquivo órfão no disco é aceitável e reportado.
- **Pré-condição:** recusa rodar com conflito (§7) e sai com código diferente de zero.
- **Sem e-mail:** nenhuma notificação, nenhum convite, nenhum evento que envie mensagem.
- **Auditoria ligada:** grava via Eloquent, para o owen-it registrar a trilha (lei 2, ADR-08). Nada
  de `DB::table` em tabela auditável, nada de `WithoutModelEvents`.
- Onde mora a orquestração é decisão do plano, respeitando `docs/estrutura-monolito.md` e o
  `DomainDependencyTest`. Toda Action do fluxo vivo contornada tem o motivo escrito no código.

### 5.1 O que cada entidade recebe

| Entidade | Como nasce | Contorna |
|---|---|---|
| Cliente SWITCH | `users(type=cliente, is_active=false)`, RUT `77.117.942-8`, e-mail sintético; `clients` com `legal_name` e `business_activity` da COT; um endereço e um contato principal (Oscar Ibarra) da COT | `CreateClientAction` |
| Aluno | `users(type=aluno, is_active=false)` + `students`; nome = o da linha mais recente (Claude); e-mail sintético | `StudentResolver` (exige e-mail, D9) |
| Vínculo aluno↔cliente | `student_client_logs` aberto, com `started_on` = a primeira `Fecha Curso` do aluno no recorte; `students.current_client_id` = SWITCH (Claude) | `StudentClientLinkService` (só grava hoje) |
| Redator | `users(type=redator, is_active=true)`, role `redator`, `redatores`; sem convite | `CreateRedatorAction` (convite fixo) |
| Documento do redator | `files` com o tipo do mapa; mime e tamanho validados pelas regras de `ContentClass::Documento`; um por tipo | regras HTTP e ClamAV (origem local confiável) |
| Habilitação | `course_redator` pela coluna de relatores da aba `CURSOS`, transcrita no complemento: MAO nos 5 cursos, COO no 201 e 202, CZR no 201 | `CourseRedatorController` |
| Curso | 6 cursos. `name` (§2 para 200#/051#; os outros pelo nome da aba `CURSOS`, e "Electricidad Básica" da COT-177, todos transcritos no complemento); `technical_name` = NomCURSO só quando difere do `name` (200#/051#), senão nulo (Claude); `workload_hours` = HrCap (COT-177 para o 6º); `description` do docx quando houver (202#), senão nula (Claude); sem template de certificado | — |
| Módulo | `course_modules` em ordem: 200#/201#/202# do docx (horas 0); 035# da COT-180 (as horas do tópico em `theory_hours`, Claude); Electricidad Básica da aba `Aprendizajes Esperados` da COT-177; 051# nenhum | — |
| Orçamento | 12 orçamentos: `budgets.id` = número da SCAP (176–187), `code` = `Scap n`, cliente SWITCH | `CreateBudgetAction` (id automático) |
| Cotação | `seq_in_budget=1`. Com turma (10): `course_id` = o da turma (planilha), `student_count` = alunos importados da turma, `approved`, `approved_at` = `Fecha Curso`. Sem turma: 177 (Electricidad Básica) e 178 (051#), `pending`, `student_count` da COT (inteiro; se a COT não traz número, 1 com linha no relatório, Claude). `value_uf` conforme §2 | `CreateQuoteAction`, `ApproveQuoteAction` |
| Turma | uma por SCAP; `presencial`, `local_aplicacao` = `Realizado en`, `start_date` = `Fecha Curso`, `end_date` = `start_date` (200#: + 1 dia), `status=concluida`, `concluded_at` = `end_date` (Claude) | `CreateTurmaAction`, `ConcludeTurmaAction` (RN-16) |
| Redator da turma | `turma_redator` = MAO, gravado com auditoria (`PivotAudit`) | `DesignateRedatorAction` (RN-09) |
| Matrícula | `grades = {"final": N}` (ou `null` no `LOT-2026-127`), `approval_status=aprobado`, `attendance_pct` nulo | `ImportStudentsAction`, resultado acadêmico |
| Certificado | `codigo` da planilha, `uuid` novo, `valido_ate` = `Vigencia`, `status=emitido`, `redator_id` = MAO, snapshot §6 | `IssueCertificateAction` (portas e numeração) |

**E-mail sintético (Claude):** `<RUT sem pontos nem hífen>@sin-correo.invalid`, para aluno e
cliente. `.invalid` é TLD reservado (RFC 2606) e nunca entrega. O plano confere se as telas de
edição de aluno e de cliente aceitam esse e-mail; se recusarem, isso vira limitação registrada,
não mudança de regra. Redator usa o e-mail do CV (decisão do João).

### 5.2 Datas históricas

Decisão do João: o registro importado carrega a data do histórico, não a da carga. O `created_at`
(e o `updated_at`) de cada registro:

| Registro | Data |
|---|---|
| Certificado | `F.EMISION` |
| Matrícula e turma | `Fecha Curso` (início da turma) |
| Orçamento e cotação com turma | `Fecha Curso` da turma |
| Orçamento e cotação sem turma (177, 178) | data da COT (complemento) |
| Aluno, usuário do aluno, vínculo | a primeira `Fecha Curso` do aluno no recorte |
| Cliente e usuário do cliente | a primeira `Fecha Curso` do recorte |
| Curso, módulo, redator, habilitação, documento | o instante da carga (não há data histórica) |
| `turma_redator` | o instante da carga: o `PivotAudit` não aceita atributo de pivot, e a lane 39 muda a assinatura dele; o vínculo não aparece em tela (Claude) |

A tabela `audits` guarda o instante real da carga: a trilha não se retrodata. Instante gravado em
UTC a partir da data de calendário de Santiago (`FusoDoNegocio`).

## 6. Snapshot do certificado importado

`schema_version: 2`, montado **da linha da planilha**, não do curso de hoje:

- `aluno`: o nome **como impresso** na linha e o RUT formatado por `Rut::format()`;
- `curso`: `name` = NomCURSO (impresso), `technical_name` **nulo** (o Blade imprime os dois, e o
  nome sairia repetido; Claude), `workload_hours` = HrCap, `description` = a do curso importado,
  `modules` = os do curso importado;
- `turma`: id, datas e modalidade da turma importada (200# em dois dias);
- `cliente`: o nome e o RUT impressos (`Nombre Cliente`, `RUT Cliente`);
- `emissor`: o da config (`OTEC LOTUS SpA`);
- `redator`: nome e RUT do MAO;
- `resultado`: `grades`, `approval_status`, `attendance_pct`;
- `template`: `version` nulo, `city` = `Realizado en`;
- `ciudad_emision` = `Realizado en`; `emitido_em` = `F.EMISION`.

Todo snapshot importado passa em `isPresentable()`. O PDF reimpresso sai no layout da v2, aceito.

## 7. Idempotência e convívio com produção

Chaves de casamento: cliente, aluno e redator pelo RUT; curso pelo `name`; orçamento pelo `id`;
cotação por (`budget_id`, `seq_in_budget`); turma por `quote_id`; matrícula por (`turma_id`,
`student_id`); certificado pelo `codigo`; documento por (redator, tipo).

A carga parte de produção vazia (a aceitação do bloco 13 limpa o banco); restam só os usuários que
o João cria antes. Por isso não há mapeamento para registro lançado à mão. A idempotência e a
recusa por conflito ficam como rede de segurança:

- Registro que já existe **igual** → conta como "já existe" e não se toca.
- Registro que já existe **diferente** (por exemplo, o orçamento 180 de outro cliente, ou um
  e-mail de redator já usado por um usuário admin) → **conflito**: o `--simular` lista e a carga
  real recusa. Nunca sobrescreve (Claude).
- A segunda execução sai com tudo "já existe" e zero criações.
- Invariantes de banco garantidas pela própria carga: `active_quote_id` (turma só de cotação
  `approved`), `enrollments_turma_student_unique`, `certificates_active_enrollment_unique`,
  `users.rut` e `users.email` únicos, `budgets.code` único.

## 8. Testes e prova local

Feature tests com um `carga.json` **sintético** (RUTs fictícios com DV válido, gerados no teste),
nunca com dado real:

- contagens por entidade e o `--simular` que não grava nada (nem banco nem disco);
- idempotência: a segunda execução não cria nem altera nada;
- conflito recusa a carga sem gravar;
- código legado preservado e `certificate_sequences` intocado;
- `budgets.id` explícito e `code` coerente; código composto da cotação `Scap n - Cot 1`;
- snapshot: `isPresentable()`, emissor, nome impresso, certificado sem nota;
- `/validar` (endpoint público por `uuid`) e PDF (pelo caminho do `CertificatePdfService`) de um
  certificado importado;
- nenhum e-mail ou notificação enviado;
- auditoria gravada para as entidades auditáveis.

**Prova local com o dado real**, na stack da lane, a pasta de dados fora da árvore: `--simular`,
carga, segunda carga, contagens contra o relatório, e um PDF de cada curso aberto em PNG
(`pdftoppm`) para conferência visual.

**Prova de ausência de dado pessoal:** grep no diff inteiro da branch (inclusive `docs/`) pelos
RUTs e nomes de aluno do relatório e pelos RUTs, e-mails e telefones dos redatores. Nome de
instrutor e de empresa não é segredo (aparece no certificado público).

## 9. Execução em produção

Claude prepara e confere; o João executa (escrita remota é bloqueada no auto mode).

1. Pré-condições: aceitação do bloco 13 fechada (banco limpo); os usuários do João e do cliente
   criados; a imagem com este bloco promovida.
2. O João roda a contagem por tabela em produção; Claude confere que só existem os usuários
   esperados e nenhum conflito previsível (orçamentos 176–187, os RUTs e e-mails do relatório).
3. A pasta de dados vai ao host (`/opt/lotus/carga-inicial`, só root) e entra no `run --rm` montada
   só para leitura.
4. `--simular`; Claude confere que as contagens são as do relatório aprovado.
5. Backup manual (`backup-db.sh`, runbook §9).
6. Carga real; depois, contagem por tabela e segunda execução sem mudança.
7. Amostra de certificados, um por curso, aberta em `/validar` e no PDF.
8. A pasta de dados sai do host.

Rollback: restaurar o dump do passo 5.

## 10. Riscos

- **Ficha 39 em outra lane:** pode mudar o snapshot, o template ou o `RedatorIdoneidadeService`. A
  carga não chama o serviço de idoneidade nem cria template; se a 39 mesclar antes, o plano
  revalida o snapshot e o PDF.
- **Restore depois de dado real:** o passo 5 do runbook §15 do bloco 13 apaga o banco. Por isso a
  carga roda **depois** da aceitação do bloco 13.
- **E-mail sintético recusado pela UI:** registrado como limitação (§5.1).
- **Arquivo órfão no S3** em falha da transação: reportado; a reexecução não duplica, porque o
  documento casa por (redator, tipo).

## Verificação externa

Todos os itens acontecem em produção depois do merge, executados pelo João com a conferência de
Claude (§9). O `codigo` não é a chave de `/validar`, e o `uuid` só existe depois da carga, então
nenhum item tem prova HTTP declarável de antemão.

1. `--simular` em produção com contagens iguais às do relatório aprovado e nenhum conflito (§9,
   passos 2 a 4).
   - prova: nenhuma
2. Backup manual antes da carga, listado no S3 (§9, passo 5).
   - prova: nenhuma
3. Carga real feita, contagens por tabela iguais às do relatório, segunda execução sem mudança
   (§9, passo 6).
   - prova: nenhuma
4. Um certificado importado de cada curso abre em `/validar` e gera o PDF (§9, passo 7).
   - prova: nenhuma
5. Pasta de dados removida do host (§9, passo 8).
   - prova: nenhuma
