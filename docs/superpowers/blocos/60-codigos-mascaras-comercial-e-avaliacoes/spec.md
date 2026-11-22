# Bloco 60 — Códigos, máscaras, Comercial e evaluaciones

> Spec aprovada no `/planejar-bloco 60` em 2026-11-22. Ficha: `backlog.md` §60.
> Fonte: pedidos da Lotus de 2026-11-21 (Cursos 1 e 2, Comercial 1 e 2, Operación 1 e 2,
> Interface 1). Paga a `P-09`.

## 1. Contexto — medido no código em 2026-11-22

- **RUT já é gravado formatado.** `UserProvisioner::ensureIdentityAvailable`
  (`UserProvisioner.php:121`) aplica `Rut::parse()->format()` (`12.345.678-5`), e as linhas 46-50
  e 80-83 gravam essa forma em `users.rut`. Toda escrita de RUT passa por ali: cliente, redator,
  staff e aluno, este pelo `StudentResolver`. A busca por identidade compara a mesma forma
  (`StudentResolver.php:63`), e a carga inicial também grava `->format()`. O `unique` de
  `users.rut` funciona porque a forma é uma só.
- **A busca de aluno não normaliza o termo.** `StudentQueryBuilder::searchable()`
  (`StudentQueryBuilder.php:51`) faz `LIKE` com o termo cru, e `12345678` não acha `12.345.678-5`.
- **Telefone é texto livre**, sem normalização: `users.phone` e `client_contacts.phone`, ambos
  `varchar(30)`. Os DTOs só validam `string`/`max`.
- **Código da cotação.** `Quote::code()` (`Quote.php:94`) devolve `Scap {budget_id} - Cot {seq}`,
  calculado e não persistido. O formato se repete no `BudgetStatusCell` (forma curta `Cot N`), num
  comentário do `TurmaQueryBuilder.php:110`, em `columnWidth.ts:42`, num comentário de
  `turmaColumns.ts`/`TurmasTable.tsx`, no `CarregadorDeHistorico.php:129` (mensagem de conflito) e
  em seis testes de backend e um de frontend.
- **Documentos da turma.** `TurmaDocumentType` tem `MANUAL`, `PRUEBAS` e `EVALUACION_REDATOR`, os
  três obrigatórios. A lista vem de `cases()`/`values()` e é lida por
  `Turma::documentacaoObrigatoria()`, `TurmaHabilitacaoService`, `HabilitacaoStatus`,
  `TurmaQueryBuilder::whereDisplayStatus()` (com paridade em `TurmaStatusParityTest`),
  `ConcludeTurmaAction` e `OperationMetricsQuery`. O upload acumula arquivos (D8 do bloco 6d: N
  arquivos por tipo, sem substituir). No front, três `DocumentTypeCard` (`TurmaDocuments.tsx`), o
  `ConcludePanel`, o `PendenciasList` (dashboard do redator) e o `CompliancePanel` (dashboard do
  admin). Os seeders `OperationDemoSeeder` e `PerformanceScenarioSeeder` usam `PRUEBAS`.
- **Orçamentos.** `GET /api/budgets` devolve a lista inteira, sem paginação. O `status` do
  orçamento é derivado das cotações em PHP (`BudgetSummaryService`), e o `BudgetData` não expõe
  `created_at`, que existe na tabela.
- **`PeriodFilter`** mora em `app/pages/Dashboard/admin/`, com o tipo `DashboardPeriod` de
  `useDashboard` e os presets em `periodPresets`. Feature não importa de `app/`.
- **Auditoria de console ligada:** `config/audit.php` tem `'console' => true`. Escrita por model
  Eloquent numa migration ou num comando gera linha em `audits`.

## 2. Intenção

A Lotus pediu sete ajustes de uso diário em 2026-11-21. Todos tornam o sistema mais legível para
quem opera: identificar curso e cotação por código curto, achar os orçamentos de um cliente sem
sair dele, digitar RUT e telefone sem pensar no formato e registrar as três evaluaciones de uma
turma como a Lotus de fato as recebe.

**Sucesso:** o operador vê `C-12` no curso e `Scap 190 - R1` em toda tela que cita uma cotação.
Abre o Comercial em Presupuestos. Filtra os orçamentos do cliente dentro do diálogo dele. Conclui
uma turma tendo o Manual e a evaluación do Instructor, recebendo só um aviso se faltar a do
Cliente ou a dos Alumnos. Digita RUT e telefone e vê o formato se montar sozinho.

**Não-objetivos:**
- Imprimir o código SENCE ou o `C-<n>` no certificado.
- Paginar ou filtrar orçamentos no servidor.
- Mudar o formato de RUT gravado.
- Mudar o RUT ou o código de cotação dos certificados já emitidos: o `snapshot` é um retrato com
  peso legal.

**Anti-objetivos** (falha mesmo que funcione):
- Concluir turma sem Manual ou sem a evaluación do Instructor.
- Reescrever dado de produção por `UPDATE` cru, por fora da auditoria (lei 2).
- Feature importando PrimeReact direto ou de `app/` (lei 6).
- Telefone inválido entrando pela API porque só o front valida.

## 3. Abordagens consideradas

**Orçamentos no diálogo do cliente.**
- **A, escolhida:** filtrar no navegador a lista do `GET /api/budgets`, a mesma que o Comercial
  já carrega e guarda em cache. O status já chega derivado, então filtrar por ele é trivial. Custa
  um campo novo no `BudgetData` (`created_at`).
- **B, descartada:** filtros no servidor (`?client_id&status&from&to&q`). Só compensa com volume
  (são cerca de 10 usuários e algumas centenas de orçamentos), e o status derivado obrigaria a
  reescrever a regra do `BudgetSummaryService` em SQL, com teste de paridade.

**Máscaras.**
- **A, escolhida:** componentes próprios em `shared/ui`. O RUT tem tamanho variável (7 ou 8
  dígitos, mais o DV), e o telefone usa a `libphonenumber-js`, que formata enquanto se digita.
- **B, descartada:** o `InputMask` do PrimeReact. Trabalha com padrão fixo e quebra a digitação
  de RUT curto.
- **Também descartado:** o `react-phone-number-input`. Traz input e seletor com estilo próprio,
  fora do tema PrimeReact do `shared/ui`.

**Armazenamento do RUT.**
- **Escolhido:** manter formatado. O que importa é haver uma forma canônica só, e ela existe.
- **Descartado:** migrar para cru. Mexeria em todos os `users.rut` de produção e em seis pontos
  de gravação e busca, mais a carga inicial, e o RUT dos certificados já emitidos ficaria num
  formato diferente do RUT dos usuários, sem ganho nenhum.

**Tipos de evaluación.**
- **Escolhido:** valores novos no `TurmaDocumentType`, com o nome do domínio no código.
- **Descartado:** manter os valores antigos (`PRUEBAS`) só trocando o rótulo. A nomenclatura
  mentiria, e não há arquivo de turma em produção que justifique preservá-la (afirmação do João,
  confirmada pela medição da §5.1).

## 4. Decisões

### 4.1 Código do curso `C-<n>`

- Coluna `courses.code` (`varchar`, `UNIQUE`, imutável), no molde do `budgets.code`: `nullable`
  no schema, mas sempre preenchida pela aplicação.
- `CreateCourseAction` grava `'C-'.$course->id` na mesma transação da criação (ADR-17). Nenhum
  DTO de entrada aceita `code`.
- Os cursos existentes recebem o código por backfill na própria migration. Como o código é
  derivado do `id` e não é dado digitado, o backfill pode usar o query builder.
- O código aparece onde o curso aparece: na listagem do Catálogo, no detalhe e no diálogo do
  curso e nos seletores de curso (formulário de cotação), na forma `C-12 · Nome`.

### 4.2 Código SENCE

- Coluna `courses.sence_code` (`varchar(20)`, `nullable`, `UNIQUE`). Vários `NULL` não colidem no
  MySQL, então "único quando preenchido" sai de graça. O índice não leva `deleted_at`: curso
  arquivado mantém o código e nenhum outro o reaproveita.
- Opcional no cadastro e só dígitos (validação no `CourseData`), com mensagem de unicidade
  traduzida.
- Aparece no detalhe e no diálogo do curso. Não vai para o certificado.

### 4.3 Código da cotação `Scap x - R y`

- `Quote::code()` passa a devolver `Scap {budget_id} - R{seq_in_budget}`, **sem espaço** entre
  `R` e o número, como no pedido da Lotus (`Scap 190 - R1`).
- A forma curta do `BudgetStatusCell` passa de `Cot N` a `R{N}`.
- Comentários, a mensagem do `CarregadorDeHistorico` e todos os testes que fixam o formato mudam
  junto.
- Toda tela que cita uma cotação mostra o código completo: Turmas, Turmas a configurar
  (`PendingQuotesPanel`), Certificación e Dashboard. O executor confere cada uma e completa onde
  hoje aparece só o `Scap` ou o número solto.
- O `snapshot` de certificado já emitido não muda.

### 4.4 Abas do Comercial

`Presupuestos` passa a ser a primeira aba e a aba padrão de `CommercialPage.tsx`.

### 4.5 Orçamentos no diálogo do cliente

- Uma seção nova no `ClientDialog` (cliente existente; não aparece na criação) lista em tabela os
  orçamentos do cliente, no molde da seção de certificados do `StudentDetailSections`.
- Fonte dos dados: o hook que o Comercial já usa para `GET /api/budgets`, filtrado por
  `client_id` no navegador. O `BudgetData` ganha `created_at` (DTO, depois `typescript:transform`;
  lei 3).
- Filtros: busca por código, estado (`approved`, `rejected`, `pending`, os valores do
  `QuoteStatus` que o `BudgetData.status` já usa) e período pela **data de criação do orçamento**.
- **Períodos** *(decisão do planejamento, depois do revisor)*: `Todos` (padrão, sem recorte, para o
  diálogo não esconder orçamento antigo), `Semana`, `Mes`, `Año` e `Personalizado`. Semana, mês e
  ano são o período **corrente do calendário**: desde segunda-feira, desde o dia 1 e desde 1º de
  janeiro, até hoje. O Dashboard mantém os presets dele (`last12`, `last6`, `currentYear`,
  `custom`, padrão `last12`).
- O `PeriodFilter` sobe para `shared/ui`, com o tipo do período em `shared/`. Os **presets passam
  a ser prop**: cada tela entrega a sua lista e o seu padrão, e um preset pode significar "sem
  recorte". A mensagem de erro do servidor e a opção de tentar de novo, que só o Dashboard usa,
  viram props opcionais. O Dashboard passa a importar de `shared/ui` sem mudar de comportamento. O
  bloco 62 reusa o componente.

### 4.6 Evaluaciones da turma

- `TurmaDocumentType` fica com `MANUAL`, `EVALUACION_REDATOR`, `EVALUACION_CLIENTE` e
  `EVALUACION_ALUNO`, e `PRUEBAS` sai. No código vale o nome do domínio (redator, aluno); na tela,
  os rótulos são **Instructor**, **Cliente** e **Alumnos** (es-CL), com equivalentes em pt-BR e en.
- O enum ganha `bloqueiaConclusao(): bool`, verdadeiro para `MANUAL` e `EVALUACION_REDATOR`, e um
  método estático com a lista dos tipos que bloqueiam. Ele substitui `values()` como dono único da
  pergunta "o que é obrigatório", no mesmo papel que o docblock atual descreve.
- **Habilitação.** `documentacaoObrigatoria()`, `TurmaHabilitacaoService`, `HabilitacaoStatus`,
  `whereDisplayStatus()` e `OperationMetricsQuery` passam a exigir só os tipos que bloqueiam. O
  `TurmaStatusParityTest` continua passando e ganha o caso "habilitada sem Cliente e sem Alumnos".
- **Aviso.** O `HabilitacaoStatus` passa a expor também as evaluaciones que faltam e não bloqueiam,
  e o `TurmaData` as entrega ao front num campo novo. O `ConcludePanel` mostra o aviso com a lista
  e mantém o botão de concluir ativo.
- **Conclusão.** O `ConcludeTurmaAction` recusa com 422 sem Manual ou sem a evaluación do
  Instructor, como hoje, e conclui com só Cliente ou Alumnos faltando.
- **Upload.** O acúmulo continua: N arquivos por tipo, nenhum substitui outro (D8).
- **Quem anexa cada tipo** *(decisão do João, 2026-11-22)*:

  | Tipo | Turma em andamento | Turma concluída |
  |---|---|---|
  | `MANUAL`, `EVALUACION_REDATOR` | redator (`submit_docs`) | só superadmin (`manage_concluded_docs`), como hoje |
  | `EVALUACION_ALUNO` | redator (`submit_docs`) | redator (`submit_docs`) e superadmin |
  | `EVALUACION_CLIENTE` | admin e superadmin | admin e superadmin |

  - O redator **não** anexa a evaluación do Cliente, e o admin só anexa essa.
  - A do Cliente ganha uma permissão própria (nome com o executor, no padrão
    `operation.turma.*`). O `RolePermissionSeeder` a entrega ao admin, que hoje fica de fora do
    `submit_docs` por ser "ação do redator", e ao superadmin, que tem todas. O redator não a recebe.
    O rótulo dela entra nas três locales, como o `PermissionI18nParityTest` exige.
  - A exceção da turma concluída mora no `StoreTurmaDocumentAction`, que hoje libera a turma
    concluída só pelo `manage_concluded_docs`. Lá ela passa a depender do tipo.
  - **Remover** arquivo de turma concluída continua só com o superadmin, para todos os tipos.
  - O front (`useTurmaDocsSection`, cartão de Evaluaciones) mostra o envio de cada slot só para
    quem pode, pela mesma matriz. Quem decide continua sendo o backend.
- **Tela.** O cartão do Manual fica como está. Abaixo dele, um cartão **Evaluaciones** com a
  aparência do `BudgetDocumentsCard`: três slots de tag fixa (Instructor, Cliente, Alumnos), cada
  um com a lista dos arquivos do tipo. A tag do slot Cliente mostra o nome do dono do orçamento.
- **Aviso depois da conclusão.** Como Cliente e Alumnos ainda podem chegar, o aviso continua
  depois que a turma conclui:
  - no detalhe da turma, sempre;
  - no `PendenciasList` do redator: só a evaluación dos Alumnos, que é a que ele pode anexar
    (vale também para a turma em andamento), nas turmas que ele ministra, abaixo dos bloqueantes;
  - no `CompliancePanel` do admin: Cliente e Alumnos.
- **Recorte das turmas concluídas** *(decisão do planejamento)*: os dashboards só mostram o aviso
  de turma concluída a partir de uma data de corte fixa no código, a data do deploy do bloco.
  Motivo: a carga inicial trouxe o histórico da v1 como turmas concluídas sem nenhum arquivo, e sem
  o corte cada uma delas viraria aviso. Turma em andamento não tem corte.
- **Contadores** *(decisão do planejamento)*: o aviso **não** entra no KPI
  `pendencias_documentais` do redator nem gera item `TurmaDocsIncomplete` na lista de pendências
  do admin. Os dois contam só o que bloqueia. Turma com só o aviso pendente gera
  `TurmaAwaitingConclusion`, porque está habilitada.
- **Seeders.** `OperationDemoSeeder` e `PerformanceScenarioSeeder` passam a usar os tipos novos.
- Paga a **P-09**: a taxonomia foi decidida pela Lotus, e não é a dos quatro tipos do Figma.

### 4.7 RUT

- Continua gravado formatado. Nada muda no backend de escrita.
- `RutInput` em `shared/ui` formata enquanto se digita (`12.345.678-5`), aceita `k`/`K` no DV e
  entrega à API o texto formatado. Valida o DV no cliente só como dica visual; quem decide é o
  `ValidRut`.
- Substitui o campo de RUT em todos os formulários: cliente, contato (se tiver RUT), redator,
  staff, aluno (identificação e matrícula), perfil e o editor de linha da importação.
- A busca de aluno passa a aceitar o termo com ou sem pontos e hífen: o termo é limpo e comparado
  com a coluna também limpa.

### 4.8 Telefone

- **Backend:** `giggsey/libphonenumber-for-php`, o porte oficial da `libphonenumber` do Google.
  Ganha um value object `Phone` em `App\Shared\Support` (parse com Chile como região padrão, saída
  em E.164) e uma regra `ValidPhone` em `App\Shared\Rules`, no molde do `Rut`/`ValidRut`.
- **Formato gravado:** E.164 (`+56912345678`). Fixo e móvel chilenos são válidos, e número de
  outro país também, desde que venha com o código do país.
- **Pontos de escrita.** Todo DTO que recebe telefone valida com `ValidPhone`. A gravação
  normaliza para E.164 em um ponto por tabela: o `UserProvisioner` para `users.phone` (como já faz
  com o RUT) e a escrita de contato do cliente para `client_contacts.phone`.
- **Nenhum telefone legado sobra para correção manual** *(decisão do João, 2026-11-22)*: a
  conversão dos dados existentes (abaixo) resolve tudo por script. Depois dela, todo telefone
  gravado é E.164 válido ou `NULL`, e o `ValidPhone` vale para todo telefone que chega na
  requisição sem que a edição de um registro antigo trave por causa do telefone.
- **Importação de alunos** *(decisão do João, 2026-11-22)*:
  - A célula de telefone **vazia é aceita**: aluno novo entra sem telefone, e aluno já cadastrado
    mantém o que tem (o `StudentResolver::updatedIdentity` copia do cadastro, e esse valor não é
    revalidado).
  - Célula preenchida é validada **pela API**, com o mesmo `ValidPhone`. O front da importação não
    valida telefone por conta própria; mostra o erro que o backend devolve.
  - O que acontece com célula preenchida e inválida segue o molde da importação: aluno **novo**
    tem erro na linha, editável no `ImportRowEditor`; aluno **já cadastrado** tem só o
    "Actualizar" recusado (`updateRefusal`, ramo do `ImportRowClassifier`), e a matrícula segue com
    o cadastro.
- **Frontend:** `libphonenumber-js`. Um `PhoneInput` em `shared/ui` com `AppDropdown` de país
  (bandeiras do `flag-icons`, que já é dependência), Chile pré-selecionado, formatando enquanto se
  digita (`AsYouType`) e entregando E.164 à API. Na exibição, um formatador em `shared/lib`
  mostra o formato internacional (`+56 9 1234 5678`, `+56 2 2123 4567`).
- **Dados existentes, corrigidos por script** *(decisão do João; o detalhe é do planejamento)*:
  - A conversão passa pelos models Eloquent, auditados no console, e nunca por `UPDATE` cru.
  - Primeiro, a limpeza que dá para fazer com segurança: tirar o que não é dígito nem `+` inicial,
    o prefixo `0` de discagem e o `56` duplicado; quando o campo traz dois números, ficar com o
    primeiro válido. Depois, a `libphonenumber` com Chile como região padrão.
  - O que validar vira E.164. O que **não** validar nem depois da limpeza vira `NULL`. O valor
    antigo não se perde: fica no `old_values` da linha de `audits` que a própria escrita gera.
  - Relatório da conversão: contagens (convertidos, limpos e convertidos, zerados) e os `id` dos
    zerados, nunca o número.
  - Idempotente: rodar de novo não muda nada. Roda **antes** de o `ValidPhone` entrar nos DTOs,
    no mesmo deploy.
  - A forma de rodar fica com o executor: migration de dados ou comando `artisan` que o deploy
    chama.
  - **Os casos da limpeza saem da medição do passo 1**: o script mede o formato, e o executor
    ajusta as regras ao que aparecer, sem inventar caso que não existe.

### 4.9 E-mail

Sem máscara. O valor é normalizado (`trim` e minúsculas) antes de validar e gravar, em todo DTO
que recebe e-mail.

*(Decisão do planejamento, depois do revisor.)* Só as escritas novas normalizam, e os e-mails já
gravados não são reescritos. A collation do MySQL (`utf8mb4_unicode_ci`) já faz o `unique` de
`users.email` e a busca de login ignorarem maiúscula e minúscula, então não existe duplicata por
caixa em produção e reescrever não ganharia nada. A diferença de caixa só aparece no sqlite da
suíte, e os testes da normalização usam a forma já normalizada.

## 5. O que se constrói, em ordem

1. **Medição em produção, só leitura** (o João roda, o agente confere a saída). Contagem por
   formato de `users.rut` por tipo de usuário, de `users.phone` e de `client_contacts.phone`, e de
   `files` com `fileable_type` de turma, por `type`. Nenhum valor é impresso, só contagens. O script
   é `scripts/medir-formatos-producao.php`, na pasta do bloco, com o comando de execução no cabeçalho.
   - RUT fora do formato `format()` significa um caminho de escrita que escapa do provisioner, e
     vira achado do bloco.
   - `files` de turma *(decisão do planejamento)*: `MANUAL` e `EVALUACION_REDATOR` não mudam de
     valor, então a execução segue com eles presentes. Se houver `PRUEBAS`, esses arquivos passam
     a `EVALUACION_ALUNO` por uma conversão pelo model `File`, auditada e idempotente, junto com a
     troca do enum. Qualquer outro `type` de turma fora do enum para a task e volta ao João.
2. Curso: `code`, `sence_code`, backfill, Action, DTO e telas (§4.1 e §4.2).
3. Código da cotação `R y` e a revisão das telas que citam cotação (§4.3).
4. Abas do Comercial (§4.4).
5. `PeriodFilter` em `shared/ui` e orçamentos no diálogo do cliente (§4.5).
6. Evaluaciones: backend (enum, habilitação, conclusão, métricas, paridade, seeders) e depois o
   front (cartão, aviso, dashboards) (§4.6).
7. Máscaras: `RutInput` e busca de aluno (§4.7), telefone de ponta a ponta mais a conversão
   (§4.8), e-mail (§4.9).
8. `der-fisico.md` (as duas colunas de `courses` e a nota de E.164 no telefone), `P-09` encerrada
   em `pendencias/`.

## 6. Fica com o executor

- A forma de rodar a conversão dos telefones (§4.8), desde que idempotente e auditada.
- Os nomes exatos dos métodos novos do enum e do campo novo do `TurmaData`.
- A lista exata das telas que mostram curso e cotação, conferida no código.
- O layout da tabela de orçamentos no diálogo do cliente, dentro do molde do
  `StudentDetailSections`.
- As versões das bibliotecas, respeitando a política de cadeia de suprimentos do lockfile.

## 7. Fora

- Imprimir SENCE ou `C-<n>` no certificado.
- Filtros de orçamento no servidor e paginação.
- Mudar o RUT gravado.
- Os painéis da Certificación por lote e a planilha (bloco 62) e a validação no site (bloco 61).

## 8. Riscos

- **Telefone legado que não valida nem depois da limpeza** vira `NULL`, e o operador perde o
  número na tela. O valor antigo continua recuperável em `audits`. A medição do passo 1 adianta o
  tamanho do problema, e o relatório da conversão dá o número exato depois do deploy.
- **Arquivo `PRUEBAS` em produção.** Produção tem dado real desde a carga de 2026-10-24. O passo 1
  mede, e a conversão auditada da §5.1 cobre o caso.
- **E-mail.** A collation já evita duplicata por caixa. O script conta as duplicatas por
  `lower(trim(email))` só para confirmar que são zero.
- **`R y` muda texto que outra lane pode fixar em teste.** O `lane.sh conferir` cobre arquivo, não
  texto; o executor procura `Cot ` na `main` antes do merge.

## Verificação externa

1. Medição de formato em produção antes de migrar (RUT, telefone, e-mail duplicado e `files` de
   turma), rodada pelo João por SSH, com a saída colada e conferida.
   - prova: nenhuma
2. Depois do deploy, a conversão dos telefones e o backfill de `courses.code` rodaram em produção:
   contagem de telefones em E.164, de telefones zerados pela conversão, de telefones fora de E.164
   (tem de ser zero) e de cursos sem `code` (tem de ser zero), rodada pelo João e conferida.
   - prova: nenhuma
