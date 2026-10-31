# Bloco 44 — Importação de alunos com triagem

> Spec do bloco. Ficha: `## 44.` em `docs/superpowers/backlog.md`. Contexto:
> `docs/superpowers/blocos/44-operacao-importacao-de-alunos-com-triagem/context.md` (status
> `partial`: as tasks N-722/N-742 do Notion estão com o corpo vazio; há dois
> `requisitos-negocio.md` no Drive, e foi usado o de 2026-10-24). Brainstorming com o João em
> 2026-10-31. Mockup aprovado: `.superpowers/brainstorm/644231-1793462662/content/triagem-v2.html`,
> fora do Git, descrito em D7.

## Por que

Hoje o upload da planilha **grava no ato**: o aluno é matriculado e, quando vem de outra empresa,
**troca de empresa em silêncio**. A troca só aparece no resumo, depois de gravada. Por isso a
equipe matricula à mão. O João quer ver a planilha lida e classificada **pelo servidor** antes de
qualquer gravação, e quer triar no próprio diálogo (excluir, corrigir, ver o cadastro existente e
a troca de empresa). O critério histórico "upload de planilha com preview antes de persistir"
(Notion N-742) nunca foi cumprido. Este bloco o cumpre.

## Objetivos

1. **Prévia sem escrita.** O servidor lê o arquivo, valida e classifica cada linha. Não grava
   nada no banco, no S3 nem na sessão.
2. **Triagem no diálogo.** Antes de confirmar, o admin exclui linhas, corrige linhas e escolhe se
   atualiza o cadastro divergente. Ele também vê quem vai trocar de empresa.
3. **Confirmação revalidada.** Só a confirmação persiste. O servidor recalcula tudo e grava linha
   a linha. As linhas recusadas voltam para a triagem.
4. **Modelo baixável.** É um `.xlsx` com o cabeçalho que o leitor espera.

## Não-objetivos

- Colunas novas na planilha.
- Importar para várias turmas de uma vez.
- Mudar o teto de 100 linhas (`ImportStudentsAction::MAX_LINHAS`).
- Mudar a matrícula avulsa (`EnrollStudentForm`/`useEnrollStudentFlow`).

## Anti-objetivos

O bloco falha, mesmo funcionando, se acontecer qualquer um destes:

- a prévia gravar algo, inclusive `audits`, `student_client_logs` ou um `User` provisório;
- a confirmação confiar na classificação, no status ou no "cliente atual" que o navegador manda;
- surgir um segundo caminho de matrícula ou de vínculo além do `EnrollStudentAction` e do
  `StudentClientLinkService`;
- a edição do cadastro passar por fora do `UpdateStudentAction` ou dispensar a permissão
  `identity.user.update`;
- o modelo e o leitor declararem o cabeçalho em dois lugares.

## Decisões

### Decididas pelo João

- **D1 — A leitura fica no servidor.** É o `SpreadsheetRowReader` atual (OpenSpout, sem
  dependência nova). O navegador não lê a planilha.
- **D2 — Cadastro divergente: o admin é avisado e escolhe.** Quando um aluno já cadastrado vem na
  planilha com nome, e-mail ou telefone diferente do cadastro, a linha mostra os dois valores e
  oferece *Mantener registro* (padrão) ou *Actualizar*. *Actualizar* grava pelo
  `UpdateStudentAction`. O certificado já emitido não muda, porque o nome está congelado no
  snapshot (`CertificateSnapshotData`, `aluno.name`). A mudança vale para as emissões futuras.
- **D3 — Confirmação por linha, como hoje.** As linhas boas são gravadas. As com problema voltam
  com o motivo, e o lote não é abortado.
- **D4 — A troca de empresa não pede confirmação por linha.** O aviso visível na triagem basta, e
  a troca segue com o "Confirmar" geral. O histórico continua preservado pelo
  `StudentClientLinkService`: o log anterior é fechado e um novo é aberto. Isso é coerente com o
  requisito do Drive: "associado pelo admin ou sistema, mantendo logs".
- **D5 — O visual segue o mockup v2,** com a estilização da Lotus (D7).

### Decididas no design (calls do Claude, aceitas pelo João na playback)

- **D6 — Três rotas**, todas no grupo `auth.active` e sob `permission:operation.enrollment.manage`
  (só admin e superadmin a têm; o redator não), com o binding de `{turma}` já escopado:
  - `POST turmas/{turma}/alunos/importar/previa`, multipart com `file`, sob `throttle:import`.
    Recebe as mesmas regras de upload de hoje (`ContentClass::Planilha`). Devolve a prévia
    (DTO de saída novo, `#[TypeScript]`).
  - `POST turmas/{turma}/alunos/importar` passa a receber **JSON**:
    `{ rows: [{ row, rut, name, email, phone, update_registration }] }`, com no máximo
    `MAX_LINHAS` linhas, sob `throttle:import`. Devolve o resumo atual (`ImportResultData`) e as
    linhas recusadas, com `row` e mensagem. **O envio multipart para gravar deixa de existir.**
  - `GET turmas/{turma}/alunos/importar/plantilla` devolve o `.xlsx` do modelo.
- **D7 — Tela** (mockup v2): o diálogo passa de `sm` para `lg`. No cabeçalho ficam o título com a
  turma e o link "Descargar plantilla". No topo, as contagens por situação em tags de tom: nuevos
  (sucesso), ya registrados (neutro), cambian de empresa (aviso), ya matriculados (neutro), con
  error (perigo). A tabela tem as colunas Fila, RUT (mono), Nombre, Email, Situación e ações. A
  situação é uma tag com uma linha secundária: "Enel → CGE", "Registro: <nome do cadastro>" ou
  "Se omite". As ações são editar e quitar. O rodapé tem "Las filas con error no se envían",
  Cancelar (texto) e "Confirmar N filas" (primário).
- **D8 — Estados do diálogo:** *upload* (texto de ajuda, `AppFileUpload` e o link do modelo),
  *triagem* (a tabela) e *resultado*. O resultado traz o resumo de hoje (`ImportResultSummary`) e,
  quando há linhas recusadas, elas voltam para a triagem com o motivo, para corrigir e reenviar
  sem subir o arquivo de novo.
- **D9 — Classificação da prévia, uma por linha:** `new` (aluno novo), `registered` (já
  cadastrado e vinculado à empresa da turma), `moves` (já cadastrado em outra empresa, com
  `current_client`), `already_enrolled` (matrícula ativa nesta turma, omitida na confirmação) e
  `error` (com mensagem). `registered` e `moves` levam ainda `divergent` (quais campos diferem) e
  os valores do cadastro.
- **D10 — Validações da prévia = as da gravação, sem escrita.** RUT válido, tipo aluno, e-mail
  obrigatório e teto de nome **para aluno novo**, colisão de e-mail, teto de linhas. Se um
  registrado for marcado para atualizar, valem as regras do `UpdateStudentAction`
  (`ensureIdentityAvailable`). **Fonte única:** a regra mora no `StudentResolver` e no
  `UserProvisioner`, e a prévia a chama em modo sem escrita. Copiar regra para a prévia é
  proibido.
- **D11 — RUT repetido na mesma planilha:** a primeira ocorrência segue classificada, e as
  seguintes viram `error`. Na confirmação vale a mesma regra.
- **D12 — Edição na triagem.** Os campos editáveis são RUT, nome, e-mail e telefone. O **RUT fica
  travado** em linha `registered`/`moves`, porque mudá-lo transforma a linha em outro aluno.
  Linha editada ganha a marca "editada · se valida al confirmar", e o navegador não a
  reclassifica. Linha `error` só é enviada se tiver sido editada. Linha `already_enrolled` não é
  enviada. *Quitar* tira a linha do envio. A escolha *Actualizar* só existe em linha com
  `divergent`.
- **D13 — A confirmação ignora o que o navegador classificou.** De cada linha o servidor lê só
  `row`, `rut`, `name`, `email`, `phone` e `update_registration`, e recalcula todo o resto. Por
  linha, numa transação: com `update_registration` e aluno existente, primeiro
  `UpdateStudentAction`, depois `EnrollStudentAction`. Se uma das duas falha, nada daquela linha
  fica. Com `update_registration` em aluno inexistente, a flag é ignorada (o aluno novo nasce com
  os dados da linha). Sem a permissão `identity.user.update`, a linha que pede atualização é
  recusada com mensagem própria. Linha adulterada (RUT inválido, e-mail que colide, nome acima do
  teto) vira erro daquela linha.
- **D14 — Modelo.** É gerado pelo backend com o writer do OpenSpout. O cabeçalho
  (`RUT`, `Nombre`, `Email`, `Teléfono`) vira uma **constante única** consumida pelo leitor e pelo
  writer. O leitor continua aceitando `.xlsx` e `.csv` (o requisito do Drive cita os dois), e o
  modelo sai só em `.xlsx`. O download no front é um blob autenticado salvo como arquivo. Como
  hoje só existe "abrir em aba" (`useBlobTabOpener`), entra um helper de salvar arquivo em
  `shared/`.
- **D16 — Editar linha de aluno já cadastrado liga *Actualizar*.** Corrigir nome, e-mail ou
  telefone numa linha `registered`/`moves` só faz sentido para gravar no cadastro, então o front
  marca `update_registration: true` ao salvar a edição (o admin pode voltar a *Mantener*, e aí a
  edição é descartada no envio). A escolha *Mantener/Actualizar* aparece em toda linha com
  `divergent` **ou** editada. O servidor não usa `divergent` para nada: com a flag, grava os
  valores da linha (o `UpdateStudentAction` é inócuo quando nada muda).
- **D17 — Campo em branco nunca apaga cadastro.** Na planilha, e-mail ou telefone vazio em aluno
  já cadastrado **não conta como divergência**, e *Actualizar* preserva o valor do cadastro
  nesses campos. Isso evita perder dado por célula vazia. O nome é obrigatório em toda linha.
- **D18 — Duplicidade interna do lote.** Além do RUT (D11), um e-mail repetido entre linhas
  da mesma planilha (aluno novo ou *Actualizar*) faz a segunda ocorrência virar `error` na
  prévia. Na confirmação vale a mesma checagem, e o banco continua sendo a última barreira (a
  colisão vira erro da linha).
- **D19 — Aluno arquivado.** Quando o aluno do RUT está soft-deletado, a prévia classifica pela
  empresa (`registered`/`moves`) e acrescenta `archived: true`. A tela mostra a linha
  secundária "Archivado · se reactivará". Na confirmação, o caminho é o de hoje: o resolver
  restaura e vincula.
- **D20 — A prévia informa a permissão.** O DTO da prévia traz `can_update_registration`
  (o usuário tem `identity.user.update`). Sem ela, o front não oferece *Actualizar* nem
  edição de linha cadastrada, e o servidor recusa mesmo assim (D13).
- **D21 — O cabeçalho é só a fonte do writer.** O leitor continua pulando a linha 1 sem
  validá-la (fora do escopo). A constante única garante que o modelo baixado volte pelo leitor.
- **D22 — Turma não gravável recusa a prévia também.** O `assertAcademicallyWritable` fica no
  topo da prévia, como na confirmação. Na tela, o botão de importar já fica guardado pela RN-15.
- **D15 — Mensagens** em `lang/` (`operation.enrollment.import.*`) com paridade en/es_CL/pt_BR.
  Os textos de tela vão para os três locales do front.

## Restrições

- Leis do §5: DDD-lite sem Repository; auditoria só na aplicação; `generated.ts` só por
  `typescript:transform`, com os consumidores ajustados no mesmo commit; erro sempre por
  `ValidationException` (RFC 7807); feature sem PrimeReact direto e sem importar outra feature.
- Controller fino, saída por `XData`. Coleção de saída com `#[ReadOnlyCollection]`. Coleção de
  entrada nasce `Optional` (`PersistenceLawsTest`).
- Catracas a atualizar: `UploadPolicyRatchetTest` e `RateLimitTest` (rota de prévia);
  `ParentLockOnChildWriteTest` (toda Action nova que recebe `Turma` entra em `TOMAM_LOCK` ou
  `ISENTAS`, com motivo); `MensagemLiteralTest`/`LocaleParityTest`.
- Front: hook com estado e mutations em `features/operation/hooks`; componente com no máximo 150
  linhas (a tabela e o editor de linha viram irmãos); upload só por `postMultipart`; estilo só por
  tokens de tema; `AppButton` com papel declarado; RUT com `identifierClass`.

## Deixado ao builder

- Os nomes dos DTOs e dos services novos, e se a prévia vira um service em `Operation/Services`
  ou uma Action somente-leitura. A regra de fonte única do D10 vale nos dois casos.
- Como o `StudentResolver` expõe a validação sem escrita: método novo, ou parâmetro no existente.
- Paginação ou rolagem da tabela, com até 100 linhas.
- Onde a constante do cabeçalho mora: no leitor, ou num value object compartilhado.

## DoD

1. Upload na prévia **não escreve nada**: provado por teste que conta as linhas de `users`,
   `students`, `enrollments`, `student_client_logs` e `audits` antes e depois.
2. A prévia classifica nas cinco situações e aponta `divergent`, com teste por situação. RUT
   repetido vira erro.
3. A confirmação grava as linhas triadas: a troca fecha o log anterior e abre o novo;
   *Actualizar* altera o cadastro e gera auditoria; *Mantener* não altera.
4. Linha adulterada é recusada pelo servidor sem derrubar as outras, com teste que manda uma
   classificação falsa e dados inválidos.
5. Sem `identity.user.update`, a linha que pede atualização é recusada.
6. O modelo baixado volta pelo próprio importador sem erro, com teste de ida e volta writer →
   leitor.
7. No front, a triagem exclui, corrige e mostra a troca de empresa e a divergência antes de
   gravar; as linhas recusadas voltam para a tabela. Coberto por teste vitest dos hooks.
8. Jornada vista no navegador, no stack da lane: upload, triagem, confirmação, recusadas, modelo.

## Verificação externa

Nenhuma. O bloco cobre backend, frontend e testes locais, sem infra nem produção.
`efeito_externo: nao`.
