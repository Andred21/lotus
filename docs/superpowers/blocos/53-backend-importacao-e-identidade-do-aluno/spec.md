# Bloco 53 — `backend-importacao-e-identidade-do-aluno` — design

> Data: 2026-11-03 · Base: `main@1845d096` · Lane: `refactor/53-backend-importacao-e-identidade-do-aluno`
> Fonte: ficha 53 do `backlog.md`; cards 3 e 7 e a seção "FormRequest" (ação barata 2) de
> `docs/superpowers/audits/2026-11-02-arquitetura-backend.html`. Spec de origem da importação:
> `docs/superpowers/blocos/44-operacao-importacao-de-alunos-com-triagem/spec.md` (D9–D22) — este
> bloco emenda D10, D13 e D18 dela, e só elas.

## 1. Intenção

A importação de alunos tem duas portas — a **prévia** (lê o arquivo, classifica, não grava) e a
**confirmação** (recebe as linhas triadas, grava) — e cada uma escreve a sua própria sequência de
regras. Elas **já divergem**: a prévia só reserva o e-mail de aluno novo e nunca testa se um
*Actualizar* passaria; a confirmação reserva o e-mail também do *Actualizar* e valida a
atualização. Resultado: uma linha que a prévia mostrou limpa volta com erro no resumo, depois de o
resto do lote já ter sido gravado.

O João quer que **o que a tela mostrou antes do clique seja o que acontece depois**, e que o admin
descubra uma linha que não passaria **ainda na triagem, antes de importar** — nunca no resumo.

Junto vem a identidade do aluno (card 7): a mesma entrada (RUT, nome, e-mail, telefone) está escrita
em quatro lugares, e o update do `User` é raso — cada um dos quatro `Update*` lembra à mão os três
passos (checar identidade → usar o RUT formatado → gravar traduzindo a colisão).

## 2. Objetivos

1. **Uma decisão por linha, num módulo só.** Um classificador recebe a linha, o contexto da turma e
   a escolha *Mantener*/*Actualizar*, e devolve a decisão: criar, matricular (já cadastrado, com ou
   sem troca de empresa), atualizar e matricular, já matriculado, ou recusar com motivo. A prévia o
   chama sem gravar; a confirmação o chama e executa a decisão. Ninguém mais reimplementa a sequência.
2. **Teste de paridade** (molde da emissão/ADR-22): para um conjunto de cenários, o que a prévia
   prometeu por linha é o que a confirmação fez. O cenário da divergência viva (e-mail de
   *Actualizar* repetido por outra linha) entra no conjunto e **reprova contra o código de hoje**.
3. **A prévia mostra o veredito do *Actualizar*.** Em linha cadastrada com divergência, a prévia
   diz se *Actualizar* passaria e, se não, o motivo (e-mail de outro aluno, e-mail malformado, nome
   acima do teto…). O admin vê isso antes de escolher.
4. **Confirmar é tudo ou nada na checagem.** Ao confirmar, o servidor classifica **todas** as linhas
   enviadas (com as edições e as escolhas da tela) antes de gravar qualquer coisa. Se alguma linha
   seria recusada, **nada é importado**: resposta 422 com o motivo por linha, e a triagem reabre com
   essas linhas marcadas.
5. **Identidade do aluno com uma fonte de regra** (card 7): forma (RUT válido, nome com teto
   impresso, e-mail com formato e teto, telefone com teto) declarada uma vez e usada pela matrícula
   individual, pela linha da importação, pelo classificador e pelo cadastro de aluno.
6. **`UserProvisioner::update`** à altura do `provision()`: checa RUT e e-mail (exceto o próprio
   user), formata o RUT, grava e traduz a colisão de índice em 422 do campo. Os quatro `Update*`
   (`UpdateStudentAction`, `UpdateRedatorAction`, `UpdateStaffUserAction`,
   `Commercial\UpdateClientAction`) passam a chamar só ele para a parte do `User`.
7. **Marca "coleção só de entrada"** no `PersistenceLawsTest`, espelho verificado da
   `#[ReadOnlyCollection]`. `ImportConfirmData::$rows` deixa de ser `Optional`, ganha
   `required|array|min:1|max:<teto>` no `rules()`, e o `Validator::make` da Action some.
8. **Fim das inversões de camada** do card 3: o `StudentResolver` não injeta mais
   `UpdateStudentAction`; a prévia não lê constante de Action (`MAX_LINHAS` muda de dono); nenhum
   `Validator::make` em `app/Domains/*/Actions` nem em `app/Domains/*/Services`.

## 3. Fora do escopo

- Reavaliar a linha **na hora da edição** na triagem. Decisão do João: linha editada é julgada ao
  clicar Confirmar (a marca "editada · se valida al confirmar" da D12 continua valendo).
- Mudar o teto de 100 linhas, o leitor de planilha, o modelo `.xlsx` ou o cabeçalho (D14/D21).
- FormRequest e Policy (item 55). Renomear `*PageRequest` (item 51).
- Redesenho visual da triagem. O front muda só o necessário para os objetivos 3 e 4.
- Qualquer mudança de schema. Nenhuma migration.

## 4. Anti-objetivos (falhou mesmo se "funcionar")

- A prévia e a confirmação com **duas** implementações da classificação, ainda que hoje iguais.
- Um *Actualizar* que a prévia mostrou como aceito e a confirmação recusa (ou o contrário), para a
  mesma linha com os mesmos valores.
- A checagem tudo-ou-nada **gravar** alguma linha antes de recusar o lote.
- Uma linha *Mantener* passar a ser recusada por um valor que ela **não grava** (ex.: e-mail
  malformado na planilha de um aluno cadastrado que o admin manteve). Hoje ela passa, e continua
  passando.
- Célula em branco apagando cadastro (D17 segue valendo, inclusive no `UserProvisioner::update`).
- Um 500 por colisão de identidade em qualquer caminho (a tradução do `writing()` segue cobrindo).

## 5. Decisões

**D1 — O classificador (decidido pelo João, forma é chamada minha).** Mora em
`Operation/Services/` (a importação é de Operation). Entrada: a turma (ou o contexto já resolvido
dela: contratante, matrículas ativas), as linhas do lote e, por linha, a escolha *Actualizar* (a
prévia de arquivo classifica com a escolha desligada **e** devolve o veredito do *Actualizar*). Saída:
uma decisão por linha. A confirmação executa as decisões; a prévia as projeta em
`ImportPreviewRowData`. A leitura do RUT acontece uma vez por linha (hoje a confirmação lê duas: a
`previewByRut` e de novo dentro do `resolveByRut`) — *chamada minha: desejável, não exigido se o
custo de forma for alto; o builder decide e justifica.*

**D2 — Validar o que a linha grava, e só isso (chamada minha, preserva o comportamento atual).**
- toda linha: RUT válido e de aluno; nome presente (D17);
- aluno novo: forma completa da identidade + e-mail obrigatório (D9) + identidade livre no banco;
- *Actualizar*: forma completa dos valores que serão gravados (em branco preserva o cadastro, D17)
  + identidade livre no banco, exceto o próprio user + permissão `identity.user.update` (D13/D20);
- *Mantener*: nada além da primeira linha — os valores da planilha não são gravados.

**D3 — Duplicidade de e-mail no lote passa a independer da escolha (chamada minha, aprovada pelo
João na apresentação).** Emenda a D18 do bloco 44. A decisão de uma linha não pode depender do que
o admin escolhe nas **outras**, senão a prévia não consegue prometer nada. Regra nova: conta todo
e-mail que a planilha **propõe gravar** — o de aluno novo e o e-mail **divergente** (não vazio,
diferente do cadastro sem distinguir caixa) de linha cadastrada, **independentemente** de *Actualizar*.
Primeira ocorrência reserva; nas seguintes: linha nova vira recusa; linha cadastrada perde só o
*Actualizar* (o *Mantener* segue livre). A ordem é a da planilha, como na D11. A regra do RUT
repetido (D11) não muda.

**Linha editada vale como qualquer outra (decidido pelo João).** Na confirmação as linhas chegam
com as edições da tela, e a ordem da planilha decide quem reserva — inclusive quando a linha que
perde é uma que o admin não tocou e a prévia mostrou limpa (ex.: a linha 2 deu erro na prévia, não
reservou o e-mail, foi corrigida, e agora reserva antes da linha 5). Como nada é gravado (D6), o
custo é só a marca cair na linha intocada; por isso **a mensagem de duplicidade no lote nomeia a
linha que reservou primeiro** ("e-mail repetido com a linha 2"), para o admin entender a marca.
Vale para o e-mail e para o RUT repetido (D11). A confirmação não recebe do navegador quais linhas
foram editadas.

**D4 — Linha já matriculada não atualiza cadastro (chamada minha, aprovada).** Hoje a confirmação
atualiza o cadastro de uma linha já matriculada se a flag vier (a prévia nunca oferece). O
classificador decide "já matriculado" e ignora a flag. A matrícula soft-deletada continua
restaurando (D7), e essa linha **não** é "já matriculada".

**D5 — Veredito do *Actualizar* na prévia (decidido pelo João).** `ImportPreviewRowData` ganha um
campo com o motivo pelo qual *Actualizar* seria recusado (nulo = passaria), presente em linha
`registered`/`moves` com `divergent` não vazio. O front mostra o motivo e não deixa escolher
*Actualizar* nessa linha. Sem a permissão, nada muda em relação a hoje (D20 já esconde a escolha).
Nome do campo e forma visual: builder, seguindo `ImportTriageTable` (o `Note` já usado para motivo).
O veredito vale para os valores **originais** da planilha: **editar a linha continua liberado** (é
como o admin corrige o e-mail que colide), a edição liga *Actualizar* como manda a D16, e os valores
editados são julgados ao Confirmar. Voltar a *Mantener* descarta a edição (D16) e devolve a linha ao
veredito original — *chamada minha, decorre da D16 e do anti-objetivo do *Mantener*.*

**D6 — Confirmar é tudo ou nada na checagem (decidido pelo João).** Emenda a D13 do bloco 44 e a
regra "linha com erro sai no resumo e o lote segue". A confirmação classifica todas as linhas
enviadas antes de qualquer escrita; havendo recusa, lança 422 pelo `ProblemDetails` com um erro por
linha recusada, identificando a **linha da planilha** (`row`) de forma que não colida com as chaves
por índice que o spatie gera para `rows.N.campo`. Nada é gravado. O front, ao receber esse 422,
reabre a triagem com as linhas marcadas reaproveitando o caminho de linha recusada que já existe
(`isRefusedPending` / `refused` em `useImportStudentsFlow`). A forma exata das chaves é do builder,
travada por teste de API.

O erro por linha do 422 **distingue dois tipos de recusa** (*chamada minha, decorre da D3 e do
anti-objetivo do *Mantener**):
- **recusa da linha** (aluno novo inválido, RUT inválido, nome ausente…): a linha volta pelo caminho
  genérico de recusa que já existe — só volta a ser enviável editada ou quitada;
- **recusa só do *Actualizar*** (os valores a gravar colidem ou são inválidos, falta permissão): a
  linha volta como na D5 — *Actualizar* bloqueado com o motivo, *Mantener* livre e **enviável sem
  editar**. Se a linha tinha sido editada, voltar a *Mantener* descarta a edição (D16), como hoje.
Sem essa distinção, um aluno cadastrado só se matricularia apagando a célula que colide ou quitando
a linha, o que contraria o anti-objetivo.

**D7 — Gravação continua por linha (chamada minha).** Passada a checagem, cada linha grava na sua
transação, como hoje (atualizar + matricular juntos, D13). Uma transação global seguraria a trava da
turma pelo tempo do bcrypt de até 100 alunos novos (~18 s medidos no bloco 44); com ~10 usuários,
uma corrida entre checar e gravar é improvável, e se ocorrer a linha sai em `ImportResultData.errors`
como hoje. `errors` continua existindo por isso.

**D8 — Identidade do aluno respeitando a fronteira de domínio (chamada minha, imposta pelo código).**
A `DomainDependencyTest` só deixa Operation enxergar `Models`, `Enums` e `Services` de Identity —
**`Data` é interno**. Por isso a ficha ("um Data de identidade usado na matrícula, na prévia e na
importação") se realiza assim:
- **Identity é dona da regra de forma** da identidade do aluno, exposta pela superfície pública
  (`Identity/Services/`), com precedente em `StudentLookup`/`StudentResolution`: um value object da
  identidade (RUT, nome, e-mail, telefone) e as regras de forma num lugar só, que os `Data` dos dois
  domínios espalham no `rules()` (molde de `ComputedFields::rejected`).
- **Operation tem o Data de entrada da matrícula individual** (hoje o `EnrollmentData` acumula
  entrada e saída — "matricular por RUT" e "matrícula com resultado"). `EnrollmentData` vira **só
  saída**, com a mesma forma de hoje — os ~25 consumidores do front não mudam; só o formulário de
  matricular troca de tipo. `EnrollmentController::store` recebe o Data novo, e a
  `EnrollStudentAction` recebe a identidade inteira, não cinco escalares.
- A validação **por linha** da importação (que não pode derrubar o lote com 422 de entrada, D13) é
  feita em Identity com um `Data` dela (`validateAndCreate`, como o `StudentResolver` já faz hoje com
  `StudentData`), nunca com `Validator::make`.
- `StudentData` (cadastro de aluno) espalha a mesma regra de forma; o que é só dele (`client_id`,
  e-mail obrigatório no cadastro, campos computados) continua dele.

Nome das classes e onde exatamente cada uma mora: builder, dentro dessas restrições. Nova aresta de
domínio, se surgir, é declarada na `DomainDependencyTest::ALLOWED` com motivo — mas o desenho acima
não deveria precisar de nenhuma (Operation→Identity e Commercial→Identity já existem).

**D9 — `UserProvisioner::update` (decidido na ficha, forma é chamada minha).** Uma operação que
recebe o `User` e os atributos de identidade/contato a gravar, e faz os três passos: checagem de
RUT+e-mail com `exceptUserId`, RUT formatado, escrita pelo `writing()`. Respeita `Optional` (ausente
= não mexe), como `WritableAttributes` faz hoje; o RUT nulo do staff pula só a checagem de RUT, nunca
a de e-mail (regra atual do `ensureIdentityAvailable`). O que é de cada ator fica no ator: transição
de `is_active` e purga de sessão (redator, staff), senha (staff), `syncRoles`, cursos e documentos
(redator), campos de `clients` (cliente). O `StudentResolver::updateRegistration` passa a usar o
provisionador direto em vez de injetar `UpdateStudentAction` (a auditoria é do model `User`, não da
Action, então nada se perde — o builder confirma com teste).

**D10 — Marca de coleção só de entrada (decidido na ficha, forma é chamada minha).** Atributo novo
ao lado de `ReadOnlyCollection` em `App\Shared\Data\Attributes`. Como a outra, **verificada, não
confiada**: a guarda exige `#[DataCollectionOf]` junto e reprova o uso indevido por um critério
mecânico que o builder escolhe e documenta no docblock (ex.: o Data marcado não pode ter
`fromModel` nem aparecer como projeção de saída). A propriedade marcada é **obrigatória** (sem
`Optional` no tipo nem no default) e a exigência de presença mora no `rules()`. A marca nova tem de
ser **vista reprovar numa sonda** (aplicada a uma coleção read-write como `ClientData::$contacts`,
ou o critério equivalente), registrada no plano.

**D11 — Teto de linhas muda de dono (chamada minha).** `MAX_LINHAS` sai da Action para um lugar que
a prévia, o leitor e o `ImportConfirmData::rules()` possam ler sem um Service depender de Action
(ex.: o próprio classificador, ou uma constante de domínio em `Operation/Services`). O valor (100) e
o docblock que justifica o número não mudam.

**D12 — Mensagens.** Todo motivo novo de recusa sai de `lang/` (`operation.enrollment.import.*` ou
`identity.errors.*`), com paridade nos três locales do backend; texto de tela novo vai para os três
locales do front (`MensagemLiteralTest`, `LocaleParityTest`).

**D13 — `generated.ts` regenera** (lei §5.3): o Data novo de matrícula, o campo novo da prévia e a
`ImportConfirmData` sem `Optional` mudam tipos. A task que regenera ajusta os consumidores do front no
mesmo commit (`generated-types.md`).

## 6. Restrições

- Leis §5: DDD-lite sem Repository; auditoria só na aplicação; `generated.ts` só por regeneração;
  erros sobem ao `ProblemDetails` (nunca `abort(422)`); feature do front não importa PrimeReact
  direto nem outra feature.
- `DomainDependencyTest` (superfície pública e arestas declaradas).
- `PersistenceLawsTest` segue verde para todas as coleções existentes.
- Regras de entidade da `backend-ddd.md`: controller fino, Action = escrita, obrigatoriedade que
  depende do verbo na Action/classificador, não no `rules()`.
- Todo teste de regressão é visto reprovar contra o código antigo antes de valer (sem `git stash`
  desguardado — prove a reprovação com cópia no scratchpad ou commit WIP).
- Suíte backend inteira, `pnpm build`, `pnpm lint` e `pnpm test` verdes ao fim.

## 7. Deixado ao builder

Nomes de classes, campos e chaves de erro; a forma interna da decisão (enum, VO, classe por
caso); onde o value object e as regras de forma de identidade moram dentro de `Identity/Services`;
o critério mecânico da marca só-de-entrada; a ordem das tasks; se a leitura única de RUT por linha
compensa (D1). Tudo isso com teste que trave a escolha.

## 8. Riscos

- **Lane 51** (em planejamento, sem plano ainda) mexe em `ClientData`, no `Budget` e no
  `PersistenceLawsTest` (alcance de `TurmaData::$redatores`). Este bloco toca
  `Commercial/Actions/UpdateClientAction.php` e `PersistenceLawsTest.php`. O `lane.sh conferir`
  mede a interseção quando os dois planos existirem; havendo colisão, a saída é replanejar ou
  sequenciar, decisão do João.
- O front da triagem (`useImportStudentsFlow`, `ImportTriageTable`) tem testes que fixam o caminho
  de resultado de hoje (`errors` no 200); eles mudam junto com a D6.

## 9. Critério de aceite (DoD)

1. O teste de paridade prévia × confirmação está verde, e o cenário da divergência viva (D3) foi
   visto reprovar contra `main@1845d096`.
2. Uma confirmação com uma linha recusável devolve 422, por linha, e **nenhuma** escrita aconteceu
   (contagem de `users`, `students`, `enrollments` e `audits` igual antes e depois), provado contra a
   API.
3. A prévia devolve o veredito do *Actualizar*, e o front impede escolher *Actualizar* com o motivo
   visível; o 422 da confirmação reabre a triagem com as linhas marcadas (teste de front).
4. `grep -rn 'Validator::make' backend/app/Domains/*/Actions backend/app/Domains/*/Services` não
   devolve nada.
5. Os quatro `Update*` não chamam mais `ensureIdentityAvailable` nem `writing()` direto; o
   `StudentResolver` não injeta Action; nenhum Service de Operation lê constante de Action.
6. A marca só-de-entrada foi vista reprovar por sonda, e `ImportConfirmData::$rows` não é mais
   `Optional`.
7. `EnrollmentData` é só saída, com a forma de saída inalterada; o formulário de matrícula usa o
   Data novo; a matrícula individual segue funcionando contra a API.
8. Suíte backend, `pnpm build`, `pnpm lint`, `pnpm test` verdes; `generated.ts` regenerado, não
   editado.

## Verificação externa

Nenhuma. O bloco é refatoração de backend com o ajuste correspondente na triagem do front, tudo
provado por suíte local e pela API do stack da lane. `efeito_externo: nao`.
