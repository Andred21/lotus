# Bloco 52 — `backend-arquivo-recepcao-e-upload` — spec

**Data:** 2026-11-03 · **Branch:** `refactor/52-backend-arquivo-recepcao-e-upload` ·
**Classificação:** architectural · **Contexto:** não (sem packet) · **Ficha:** `backlog.md` §52 ·
**Fonte:** cards 1, 2 e 9 do review de 2026-11-02
(`docs/superpowers/audits/2026-11-02-arquitetura-backend.html`), `P-107`, `P-76`.

## 1. Intenção

Arquivo no Lotus tem peso legal: documento de redator habilita turma, firma entra no certificado. E
hoje, para criar um upload novo, quem escreve precisa lembrar de cinco passos, e nenhum teste
reprova quem esquece um:

1. no controller, `$request->validate([...'file' => ContentClass::X->regras()])` — às vezes com
   `type` em `in:` literal e `valid_until` condicional;
2. na Action, `put()` **fora** da transação;
3. `DB::transaction` com `register()` dentro;
4. try/catch com `discard()` no catch, senão sobra objeto órfão no bucket;
5. saber que o 422 vai dizer "El campo **file**…" (P-107), porque o atributo não é traduzido.

**O resultado que o João quer (2026-11-03):** quem cria um upload declara **que tipo de arquivo é**
e **a que registro ele pertence**, e nada mais. Os passos 2 a 5 deixam de depender de memória.

O bloco é a "recomendação principal" do review: a **porta HTTP** (card 1, um Data de entrada por
forma de upload) e a **porta de storage** (card 2, um módulo de uma entrada só, dono da ordem e da
compensação). Junto vêm as duas pendências de idioma que essa porta toca, a P-107 e a P-76.

## 2. Objetivos

1. **Card 1.** Toda recepção de arquivo passa por uma classe Data de entrada. A escolha
   "tipo → regra do arquivo e aceita validade" mora no enum do domínio. Saem dos controllers os
   `$request->validate()` de arquivo, a cópia `RedatorDocumentController`/`ProfileDocumentController`
   e o parser multipart `RedatorController::documentsFromRequest` (45 linhas).
2. **Card 2.** O `UploadFileAction` dá lugar a um módulo de **uma entrada pública de escrita**, dono
   de: metadados antes da escrita, binário fora da transação, transação em volta da escrita do dono,
   descarte de todos os objetos se a transação não commitar, e relançamento do erro. Os callers
   perdem o try/catch.
3. **P-107.** O 422 de upload diz o nome do campo em es-CL (e nos outros dois locales), definido num
   lugar só.
4. **P-76.** As seis frases da tabela da P-76 vão para `lang/` nos três locales, e a catraca de
   idioma ganha a porta do `$fail` de `ValidationRule` e a da resposta de sucesso.
5. **Catracas.** O que hoje é convenção vira teste que reprova: arquivo validado em controller, e o
   try/catch de compensação reescrito fora do módulo.

## 3. Não-objetivos (Fora)

- **Card 9 (projeção de `File`) fica fora — medido no brainstorming (2026-11-03).** A ficha só o
  admitia "se o front já tratar os dois formatos de `created_at`". Medição: o `TurmaDocumentData`
  serializa com `toISOString()` (`…000000Z`) e os outros DTOs de arquivo (`FileData`,
  `RedatorDocumentData`, `RedatorProfileDocumentData`, `CertificateSignatureFileData`) com
  `toIso8601String()` (`…-03:00`). O front **não trata** os dois formatos em lugar nenhum: repassa a
  string a `Date`, que aceita as duas. O único comparador de string crua (`features/commercial/lib/latestFile.ts`)
  só recebe `FileData`, de formato único. Divergência de formato, não de dado: fica fora.
- **Card 7 e o `validate()` de RUT** (`EnrollmentController::enroll`, `:79`): são do bloco 53.
- **`AuthController::login`** (`validate` de credenciais): não é arquivo.
- **Os dois `Validator::make` de domínio** (`ImportStudentsAction:65`, `StudentResolver:150`): bloco
  53.
- **A carga inicial** (`CarregarCargaInicial`, `CarregadorDeCadastros`): fica nos primitivos de
  hoje, como exceção declarada (D6, decisão do João).
- **FormRequest e Policy:** o review recomendou não adotar. Este bloco não cria nenhum.
- **Política de arquivo** (`ContentClass`: extensões, MIME, tetos, ClamAV, largura da assinatura):
  não muda. O bloco muda **quem a pede**, nunca **o que ela aceita**.
- **Leitura e assinatura de URL** (`SignedUrlTransformer`, `publicDiskFor`): só muda de casa se o
  módulo novo exigir; o comportamento não muda.

## 4. Decisões

### D1 — O contrato HTTP pode mudar onde ficar mais limpo (João, 2026-11-03)

Nomes de campo (`file`, `photo`, `type`, `valid_until`, `documents[<TIPO>]`) e rotas podem mudar se
a forma uniforme pedir. **Toda mudança de contrato leva o front junto, no mesmo bloco:** a chamada de
API em `features/*/api` ou `shared/api`, o `generated.ts` regenerado (nunca à mão) e os testes do front
que fixam o campo. **Decisão minha:** não renomear campo só por simetria. Renomear custa mudança no
front sem ganho para o usuário. Só renomeie quando o Data uniforme não tiver outro jeito de existir.

### D2 — O cadastro do redator continua atômico (João, 2026-11-03)

`POST /api/redatores` e `PUT /api/redatores/{id}` seguem recebendo dados **e** documentos num envio
só: ou grava tudo, ou nada (nem linha em `users`/`redatores`, nem linha em `files`, nem objeto no
bucket). Proibido separar em "cria o redator, depois sobe cada documento": isso cria o estado
"redator salvo sem documento por falha de envio", que o João recusou. O que muda é só o interior: o
parser de 45 linhas dá lugar à validação declarada no Data.

### D3 — O tipo do domínio escolhe a regra

Um contrato em `Shared/Files` (interface ou equivalente; nome ao builder) que os enums de tipo de
arquivo dos domínios implementam: **a classe de conteúdo** (`ContentClass`) e **se aceita validade**.
`RedatorDocumentType` já tem os dois (`conteudo()`, `aceitaValidade()`). Também implementam o
contrato `BudgetDocumentType` e `TurmaDocumentType`, além de **um enum novo para o documento de
cotização**, que substitui o `'in:quote_document'` literal do `QuoteFileController`. O valor
persistido segue `quote_document`, sem migration.

Tipo que não aceita validade **proíbe** `valid_until` (`prohibited`), como hoje.

### D4 — As formas de upload (card 1)

Os Data de entrada cobrem as formas abaixo. Nomes, quantas classes e onde cada uma mora ficam com o
builder, dentro destas regras: Data genérico em `Shared/Files/Data`, Data com tipo concreto do
domínio no `Data/` do domínio, e dependência só para baixo (ADR-05 vale no backend pelo
`DomainDependencyTest`).

| Forma | Sítios hoje | Regra |
|---|---|---|
| **Foto** | `UserPhotoController`, `RedatorPhotoController`, `StudentPhotoController`, `ProfilePhotoController`, `ClientPhotoController` | um arquivo, classe `Imagem` |
| **Arquivo de classe fixa** | `CertificateSettingsController::storeSignature` (`Assinatura`), `EnrollmentController::previewImport` (`Planilha`) | um arquivo, classe fixa do sítio |
| **Documento tipado com validade** | `RedatorDocumentController::store`, `ProfileDocumentController::store` | `type` do enum escolhe a classe e se `valid_until` é aceito; o perfil restringe aos `selfServiceValues()` |
| **Anexo tipado** | `BudgetFileController`, `QuoteFileController`, `TurmaDocumentController` | `type` do enum, classe do enum |
| **Conjunto tipado no cadastro** | `RedatorController::store`/`update` (`documents[<TIPO>]`) | ver D5 |

A validação **depende de outro campo** (o `type` escolhe a regra do `file`). O Data resolve isso pelo
`rules(ValidationContext $context)` do spatie/laravel-data, lendo o payload. Ordem preservada: o
`type` é validado antes de o `file` ser validado contra a classe que ele escolhe. Um `type` inválido
nunca manda bytes ao ClamAV.

### D5 — O conjunto de documentos do redator

O `documents[<TIPO>]` vira propriedade declarada de um Data de entrada (o `RedatorData` ou um Data
irmão, à escolha do builder), com as mesmas recusas de hoje, **todas em 422 RFC 7807, nunca 500**:

- `documents` que não é mapa → `identity.errors.documents_shape`;
- chave que não é `RedatorDocumentType` → `identity.errors.document_type_invalid`;
- folha que não é um arquivo só (`documents[CV][]`) → `documents_shape`;
- soma acima de `ContentClass::TETO_AGREGADO_KB` → `shared.file.set_too_large`, **antes** das regras
  por arquivo (não manda quatro binários ao ClamAV para recusar o conjunto);
- cada arquivo contra a classe do seu tipo.

O `RedatorData` hoje é de leitura **e** escrita, e o `documents` de saída é `#[Computed]` com
`prepareForPipeline` tirando a chave de entrada. Se o builder mantiver os dois sentidos no mesmo Data,
a costura tem de continuar provada pelos testes de hoje. Se separar, o `generated.ts` regenera e o
front segue o D1.

### D6 — O módulo de upload (card 2)

Uma entrada pública de escrita. Recebe os arquivos (um ou vários), o destino deles no bucket (o dono
quando ele já existe, um diretório quando ainda não existe, caso do `CreateRedatorAction`) e a
**escrita transacional do dono**, como closure. O módulo garante, nesta ordem:

1. metadados de cada arquivo **antes** da escrita (`getMimeType()`, nunca `getClientMimeType()`);
2. binários gravados **fora** de qualquer transação, com `false` de `putFile()` virando exceção;
3. `DB::transaction` em volta da closure do dono. É nela que o dono toma o próprio lock
   (`Redator::lockForWrite`, `Turma::lockForWrite`, `lockForUpdate` do `CertificateSettings`),
   apaga o anterior do mesmo tipo (soft delete, auditado) e registra a linha em `files`;
4. se qualquer coisa lança — no put de um dos arquivos, na closure ou no commit —, **todos** os
   objetos já gravados são descartados, o descarte nunca propaga, e o erro original é relançado.

**Decisão minha, confirmada no playback:** a foto (`UserPhotoService`, que grava em
`users.photo_path`, fora de `files`) também usa o módulo, porque hoje repete o mesmo envelope à mão.
A foto mantém a regra dela: o objeto **anterior** só é apagado **depois** do commit, e falha nesse
delete só loga.

**A carga inicial fica fora (João, 2026-11-03).** O `CarregarCargaInicial` abre uma transação para a
carga inteira e o `CarregadorDeCadastros::documento` grava os binários **dentro** dela, pulando o
documento que já existe. Depois do rollback, o comando descarta e lista ao operador o que não conseguiu
apagar. Não é o envelope do módulo: é operação de console em lote, com relatório próprio. Ela segue
nos primitivos baixos de hoje (`metadataOf`, `put`, `register`, `discard`, ou os equivalentes com o
nome novo). É a **única** exceção, declarada nas catracas do D8 com esse motivo escrito. Os
primitivos ficam acessíveis a ela, mas nenhum caller HTTP os usa.

Restrições do módulo:

- Fecha o "Action chama método de outra Action": `CreateRedatorAction` e `UpdateRedatorAction`
  deixam de chamar `StoreRedatorDocumentAction::registerUploaded()`. O "apaga o anterior do tipo e
  registra" vira peça reusável que não é método público de outra Action (o lugar fica com o builder).
- O módulo não é uma Action (o review aponta isso: nome de Action, corpo de serviço). Nome e pasta
  ficam com o builder, respeitando `docs/estrutura-monolito.md` e `backend-ddd.md`. Se a pasta for
  nova, o `estrutura-monolito.md` ganha a linha no mesmo bloco.
- O `UploadFileAction` some ou fica reduzido à entrada única mais os primitivos que só a carga
  inicial usa. Fora da carga, não ficam dois caminhos para subir arquivo, e a catraca do D8 garante
  isso.

### D7 — Idioma (P-107 e P-76)

- **P-107.** Os atributos de validação dos campos de upload (`file`, `photo`, `type`, `valid_until`,
  `documents` e as chaves `documents.<TIPO>` ou o curinga equivalente) ganham nome em
  `lang/{es_CL,pt_BR,en}/validation.php`, `attributes`, ou nos `attributes()` dos Data. Um lugar só.
  O 422 diz "archivo", não "file".
- **P-76.** As seis frases vão para `lang/` nos três locales: `UserProvisioner::DUPLICADO` (RUT e
  e-mail), `ValidRut`, `PrintableGrade`, `ScannedForMalware` e `AuthController::logout`. As que hoje
  estão em pt-BR (`ValidRut`, `UserProvisioner`, `logout`) passam a sair em es-CL para o operador
  chileno. **O texto es-CL é meu:** o builder copia o tom das chaves vizinhas, e o João lê a tabela
  na revisão.
- **Catraca.** O `MensagemLiteralTest` ganha duas portas: o `$fail('<literal>')` de `ValidationRule`
  e a resposta de sucesso com frase literal (`response()->json(['message' => '<literal>'])` e
  vizinhas). Cada porta é **vista reprovar por sonda** antes de ficar verde.

### D8 — Catracas de arquivo

- **Nenhum `validate()` de arquivo em controller.** O `UploadPolicyRatchetTest` (ou catraca irmã)
  passa a reprovar controller que lê `request->file(` ou declara regra de arquivo. A lista `ISENTOS`
  encolhe para refletir o desenho novo: as Actions que hoje são isentas "porque o controller validou"
  passam a receber o arquivo já validado pelo Data.
- **Compensação só no módulo.** Uma catraca reprova `discard(` (ou o nome novo do descarte), e o
  par `put`/`register` chamado direto, fora do módulo de upload. A única isenção é a carga inicial
  (`app/Console/Commands/CarregarCargaInicial.php`, `app/Console/CargaInicial/CarregadorDeCadastros.php`),
  com o motivo do D6 escrito ao lado, no molde do `ISENTOS` de hoje: silêncio reprova.
- As duas são **vistas reprovar por sonda** (arquivo temporário no scratchpad, nunca `git stash`).

## 5. Restrições (o que não pode piorar)

Tudo isto está escrito em comentário no código de hoje, foi aprendido com defeito real e continua
valendo:

- `bail` na frente das regras de arquivo; antivírus por último; largura da assinatura antes do
  antivírus.
- Teto agregado antes das regras por arquivo, no único sítio de vários arquivos.
- `getMimeType()` para a coluna `mime`; `original_name` segue o nome do cliente.
- `putFile()`/`store()` que devolve `false` vira exceção, nunca path. O `delete()` que devolve `false`
  loga.
- Binário **nunca** dentro de transação; o insert em `files` **sempre** dentro.
- O soft delete do arquivo anterior do mesmo tipo segue auditado, dentro da transação.
- Os locks de dono de hoje continuam, com o mesmo alcance (Redator, Turma, CertificateSettings), e o
  `ParentLockOnChildWriteTest` segue verde. **Decisão minha (builder check):** hoje o
  `test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao` exige o texto `DB::transaction` no
  arquivo de cada Action de `TOMAM_LOCK`. Com o D6, quem abre a transação é o módulo, então a catraca
  passa a aceitar **também** a chamada à entrada do módulo como prova de transação, com o
  `lockForWrite` dentro da closure passada a ele. Nada de `DB::transaction` aninhado só para agradar
  a catraca. A mudança é vista reprovar por sonda: uma Action de `TOMAM_LOCK` sem nenhuma das duas
  formas reprova.
- A checagem de turma concluída + `operation.turma.manage_concluded_docs` do
  `StoreTurmaDocumentAction` continua **antes** de subir o binário.
- O `ProfileDocumentController` responde **403 de não-redator antes de validar o payload**, como
  hoje. O Data injetado no método valida antes do corpo, então o builder tem de preservar essa
  precedência (Data montado depois da checagem, middleware, ou equivalente), e um teste a prova.
- Códigos de resposta inalterados (`201` do documento de turma, `200` da prévia da planilha).
- `generated.ts` só regenerado (`typescript:transform`), nunca editado. O gate do fechamento roda o
  transform mesmo que só enum tenha mudado (observação do item 48).
- Nenhum Repository, nenhum FormRequest, nenhuma Policy, nenhum `abort(422)`.

## 6. Deixado ao builder

- Nomes e pastas das classes Data, do contrato de tipo e do módulo de upload (dentro de D3, D4, D6).
- Se o `RedatorData` mantém leitura e escrita ou se separa (D5).
- A forma exata da closure do módulo e o que ela recebe (o "registrador").
- Onde mora o "apaga o anterior do tipo e registra" (D6).
- Renomear ou não um campo do contrato (D1, com a regra de só renomear se preciso).
- A redação es-CL, pt-BR e en das seis frases e dos atributos (D7).

## 7. Critérios de aceite (DoD)

1. Nenhum `validate()` nem `Validator::make` de arquivo em `app/**/Http/Controllers`; a catraca do D8
   reprova o primeiro que voltar, e foi vista reprovar.
2. **Teste com disco fake** (`Storage::fake`): quando a escrita do dono lança dentro da transação, o
   objeto gravado é descartado (o disco não tem o path) e nenhuma linha nova existe em `files`. Um
   caso com **vários** arquivos (o cadastro do redator) prova que **todos** são descartados.
3. O cadastro do redator com documentos continua atômico: o teste de hoje (ou um novo) prova que a
   falha de um documento não deixa redator, user, linha de `files` nem objeto no bucket.
4. O 422 de upload com arquivo de tipo recusado, em es-CL, nomeia o campo em espanhol ("archivo"),
   provado por teste de feature. A P-107 fecha.
5. As seis frases da P-76 saem de `lang/` nos três locales; as duas portas novas do
   `MensagemLiteralTest` foram vistas reprovar. A P-76 fecha.
6. Os seis callers do `UploadFileAction` e a foto não têm try/catch de compensação; a carga inicial
   é a única isenção declarada; a catraca de compensação do D8 foi vista reprovar.
7. Suíte do backend verde, Pint limpo nos arquivos tocados. Se o contrato mudou: `typescript:transform`
   sem diff pendente, `pnpm lint`, `pnpm build` e `pnpm test` verdes.
8. Prova e2e no stack da lane (curl com cookie e CSRF, ou navegador): um upload de cada forma do D4
   responde como antes (ou como o contrato novo, se mudou), e o arquivo de tipo recusado devolve o 422
   com o campo em es-CL.

## Verificação externa

Nenhuma. O bloco é refatoração interna de backend (e do front, se o contrato mudar), provada por
testes e pelo stack da lane. `efeito_externo: nao`.
