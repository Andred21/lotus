# Spec — Hardening · Débitos de integridade

- **Work item:** `hardening-debitos-integridade`
- **Data:** 2026-08-01
- **Origem:** fatia do item 3 do `backlog.md` (Hardening), selecionada pelo João depois de triagem
  dos débitos técnicos do `backlog.md` e das pendências do `pendencias.md` **contra o código real**
- **Context packet:** nenhum — a fonte é o código, o `backlog.md` e o `pendencias.md`; o bloco não
  depende de Drive, Notion ou Figma

## 1. Problema

Seis débitos abertos compartilham a mesma classe: o estado que o sistema grava pode divergir do
estado que ele afirma ter gravado, e a divergência não aparece para ninguém. Três podem custar
rastro de auditoria ou dado (peso legal), três são falhas silenciosas de contrato.

Todos foram verificados no código antes de entrar aqui — nenhum entrou por leitura de doc.

## 2. Escopo

### Dentro

| # | Débito | Origem |
|---|---|---|
| 1 | Arquivo órfão no MinIO em rollback de transação | `backlog.md` §Débitos técnicos |
| 2 | P-24 — compensação do `UserPhotoService::store()` apaga o objeto novo | `pendencias.md` |
| 3 | Q-5 — check-then-act sem lock no mínimo de contatos | `backlog.md` §Débitos técnicos |
| 4 | `ClientContactData.is_primary` com default `false` não-`Optional` | `backlog.md` §Débitos técnicos |
| 5 | Sem check de paridade permissão↔i18n | `backlog.md` §Débitos técnicos |
| 6 | Sem unicidade de `client_addresses.is_primary` | `backlog.md` §Débitos técnicos |

### Fora, por decisão do João em 2026-08-01

Débitos de UI (Q-14 `AppErrorState` sem estado de refetch, Q-15 `AppDataTable` contando 0 no load,
CTA duplicado em `ClientsTable`/`BudgetsTable`, cor Tailwind hardcoded nos 6 diálogos de feature);
minors de 5.2a/5.2b; `UserData::fromModel` chamando `getRoleNames()` duas vezes.

Seguem abertas, sem resolver agora, as decisões de Q-6 (idioma canônico das mensagens de
`ValidationException`), P-20 (`openspout` sem ADR) e P-21 (`simple-qrcode` sem uso).

Fora de alcance do bloco: P-02 e P-05 (gatilho "antes de produção"), P-04 (guardrail das leis §5 —
bloco próprio, reavaliação em 2026-08-15), P-18/P-22 (correção manual no Notion), P-03, P-08, P-09,
P-10, P-13, P-15, P-16 (dependem da Lotus ou do Bloco 7).

## 3. Estado verificado antes do desenho

- **Item 1 tem três chamadores dentro de transação**, não dois: `StoreRedatorDocumentAction`
  (transação própria), `CreateRedatorAction` (aninha o anterior) e o `OperationDemoSeeder` (envolve
  17 uploads numa transação única). `StoreTurmaDocumentAction`, `QuoteFileController` e
  `BudgetFileController` chamam fora de transação — não afetados.
- **`UploadFileAction::execute` não checa o retorno de `store()`.** É o mesmo bug que o
  `UserPhotoService` já levou em dev em 2026-08-01 (`photo_path = '0'`, objeto anterior apagado);
  no `UploadFileAction` ele segue aberto e ninguém o registrou.
- **A auditoria é síncrona:** `config/audit.php` tem `queue.enable = false`. Logo o evento `updated`
  do owen-it roda dentro da transação do chamador, quando existe uma.
- **O item 5 já está paritário hoje:** 35 permissões em `PermissionCatalog::descriptions()` e 35
  chaves `perm.*` em `en.json`, `es-CL.json` e `pt-BR.json`. O item é guardrail contra regressão,
  não correção.
- **O item 6 não precisa de migration:** o mesmo gap nos contatos foi fechado por
  `PrimaryContactService` na camada de aplicação (ADR-02/ADR-08), não por constraint.
- **O container `app` já monta o frontend** (`./frontend:/frontend`), e
  `base_path('../frontend/...')` resolve igual no host (`backend/../frontend`) e no container
  (`/var/www/../frontend` = `/frontend`).

## 4. Decisões

### D1 — Upload sai da transação; a transação fica só com o banco

`UploadFileAction` passa a expor três operações no mesmo choke point:

- `put(Model $owner, UploadedFile $file, ?string $disk = null): string` — grava no disco e devolve o
  path. **Aborta se `store()` devolver `false`** (D2). Captura `size`/`mime`/`original_name` antes da
  escrita.
- `register(Model $owner, string $path, string $originalName, string $mime, int $size, string $type, ?CarbonInterface $validUntil = null): File`
  — só o insert em `files`. Roda dentro da transação do chamador.
- `discard(string $path, ?string $disk = null): void` — compensação. Loga e **nunca propaga**, mesmo
  contrato do `UserPhotoService::deleteObject()`: derrubar a requisição na limpeza faria o usuário
  achar que a operação falhou quando o que falhou foi só a faxina.

`execute()` continua existindo como `put` + `register` para os três chamadores que já rodam fora de
transação.

**Alternativas rejeitadas.** `DB::afterCommit` no write inverte o risco: falha depois do commit
deixa **linha sem binário** — a auditoria afirma que o documento existe e o download dá 404. Sob
peso legal isso é pior que órfão de storage, que é custo. Deixar como está e só documentar foi
rejeitado porque o backlog classifica o caso como perda de rastro e o seeder o amplifica a 17
objetos.

### D2 — `put()` trata `false` como falha, não como path

`UploadedFile::store()` devolve `false` sem lançar quando o disco não está configurado com `throw`.
Sem a guarda, o `false` vira string no insert e o sistema segue como se tivesse gravado. É a mesma
falha do `9197d08`, agora fechada no choke point compartilhado em vez de só no serviço de foto.

### D3 — Chamadores em transação sobem o binário antes de abrir a transação

- `StoreRedatorDocumentAction::execute` — `put` antes; a transação cobre só o soft-delete do
  documento antigo (por instância, para a auditoria registrar) + `register`; `catch` → `discard` +
  rethrow. Ganha `registerUploaded(...)` para quem já segura transação e já fez o `put`.
- `CreateRedatorAction` — sobe **todos** os documentos antes de abrir a transação, guarda
  `[tipo => path]`, e dentro dela chama `registerUploaded`. `catch` → `discard` de todos os paths.

### D4 — O `OperationDemoSeeder` fica como está, declarado

Um chamador que abrir transação **por fora** dos Actions ainda pode orfanar: o `put` acontece com a
transação externa aberta. O único caso hoje é o `OperationDemoSeeder`
(`DB::transaction(fn () => $this->seed())`). É código de dev/demo, gated para `local`/`demo`, e
reestruturá-lo não serve à garantia que interessa (os caminhos de requisição). Fica registrado aqui
para que a limitação não seja lida como esquecimento.

### D5 — P-24: o `update()` da foto entra em transação

`$user->update(['photo_path' => $new])` passa a rodar dentro de `DB::transaction`. Como a auditoria é
síncrona (§3), o evento `updated` do owen-it entra na mesma transação: se o dispatch da auditoria
lançar, o rollback desfaz o UPDATE e a compensação (`deleteObject($new)`) volta a ser verdadeira —
"ninguém aponta para `$new`" deixa de ser uma afirmação falsa nesse caminho.

O docblock atual argumenta explicitamente **contra** transação ali. O argumento cai e o comentário é
reescrito: a transação cobre UPDATE + auditoria, e **nunca** o delete de storage — que é o débito do
D1, não este.

Rejeitado: compensar condicionalmente (`refresh()` e só apagar se `photo_path !== $new`). Não
depende de a auditoria ser síncrona, mas deixa o usuário com 500 e a foto trocada — sucesso parcial
silencioso, que é a classe de bug que este bloco existe para fechar.

### D6 — Q-5: contagem sob lock

`DeleteClientContactAction::execute` passa a `DB::transaction` + `lockForUpdate()` na contagem dos
contatos do cliente, antes do `delete()`. Sem isso, duas exclusões concorrentes leem 2 e apagam 2,
deixando o cliente sem nenhum contato — estado que o cadastro recusa.

### D7 — `is_primary` vira `Optional` em contato **e** endereço

`bool|Optional $is_primary = false` em `ClientContactData` e `ClientAddressData`. O `toArray()` do
spatie omite `Optional`, então `PUT /api/contacts/{id}` sem o campo passa a **manter** o valor
atual em vez de rebaixar o principal em silêncio; no create aninhado, o ausente continua caindo no
default `false` da coluna.

Endereço não tem rota nested hoje — a mudança lá é preventiva e simétrica, custo de uma linha, e o
bloco já mexe em endereço no D8.

`generated.ts` muda (`is_primary?: boolean`) e é **regenerado**, nunca editado (lei §5.3).

### D8 — Item 6: `PrimaryAddressService`, espelho do de contatos

`PrimaryAddressService::ensureSingle(Client $client)` — sem parâmetro `winner`, que só existe nos
contatos por causa da rota nested. Chamado por `CreateClientAction` e `UpdateClientAction` depois do
replace dos endereços. `update()` por **instância**, nunca pelo query builder: só o evento do model
dispara a auditoria (lei §5.2), e rebaixar um endereço principal sem rastro é exatamente o que o
bloco não pode produzir. Cliente sem principal segue estado válido — o serviço não promove ninguém.

Rejeitado: constraint no banco. MySQL não tem índice parcial; exigiria coluna gerada
(`is_primary ? client_id : NULL`) + unique, o que traz migration, `der-fisico` e uma rejeição
chegando como `QueryException` em vez de `ValidationException`. Rejeitado também generalizar os dois
serviços num só: são duas ocorrências e a semântica do `winner` difere.

### D9 — Item 5: teste de paridade nas três locales, sem escapatória

`PermissionI18nParityTest` lê
`base_path('../frontend/src/shared/config/locales/{en,es-CL,pt-BR}.json')` e assere, para cada
locale, que as chaves de `perm.*` são exatamente `array_keys(PermissionCatalog::descriptions())` com
`.` → `_`, e que nenhum valor é vazio.

**Sem `markTestSkipped` se o diretório não existir.** Um teste que passa quando não conseguiu ler
nada é a lição 10 outra vez — e a lição 10 já reapareceu dentro do fix dela própria no bloco
anterior.

Rejeitado: cobrir só `es-CL`. A UI é es-CL (ADR-15), mas as outras duas apodreceriam em silêncio, e
o review do último bloco já checava as três à mão.

## 5. Arquitetura

Nenhuma camada nova, nenhuma migration, nenhuma permissão nova. Arquivos tocados, por domínio:

- `app/Shared/Files/Actions/UploadFileAction.php` — D1, D2
- `app/Domains/Identity/Actions/StoreRedatorDocumentAction.php`, `CreateRedatorAction.php` — D3
- `app/Domains/Identity/Services/UserPhotoService.php` — D5
- `app/Domains/Commercial/Actions/DeleteClientContactAction.php` — D6
- `app/Domains/Commercial/Data/ClientContactData.php`, `ClientAddressData.php` — D7
- `app/Domains/Commercial/Services/PrimaryAddressService.php` (novo),
  `CreateClientAction.php`, `UpdateClientAction.php` — D8
- `tests/Feature/Identity/PermissionI18nParityTest.php` (novo) — D9
- `frontend/src/shared/api/generated.ts` — regenerado (D7)

## 6. Erros

Nada muda no envelope: erro de domínio sobe como `ValidationException` e vira RFC 7807 no handler
global (lei §5.4). O `RuntimeException` do D2 é falha de infraestrutura, não de domínio — sobe como
500, que é o correto: o usuário não tem como corrigir um disco que não aceitou a escrita.
`discard()` nunca converte falha de faxina em erro de requisição.

## 7. Definition of Done

Critério de aceite **provado**, não código escrito:

1. Falha dentro da transação do documento de redator deixa `files` sem linha **e** o disco sem
   objeto (`Storage::fake` + falha forçada no insert).
2. `store()` devolvendo `false` aborta com exceção e não insere nada em `files`.
3. Com um listener de teste que lança no `updated` de `User`: `photo_path` fica intacto no banco e o
   objeto novo é apagado do disco.
4. `PUT /api/contacts/{id}` sem `is_primary`, num contato que é principal, mantém o contato
   principal.
5. `DELETE /api/contacts/{id}` segue devolvendo `422` com um contato e `204` com três.
6. Payload de cliente com dois endereços `is_primary=true` deixa exatamente um, e o rebaixado tem
   linha em `audits`.
7. `PermissionI18nParityTest` passa nas três locales — e foi **visto reprovando** com uma chave
   removida à mão antes de valer como prova (lição 10).
8. Suíte backend cheia verde (baseline 347 passed / 1083 assertions), `pnpm build` e `pnpm lint`
   verdes, Pint limpo nos arquivos PHP tocados, `generated.ts` regenerado com o diff esperado do D7 e
   nenhum outro.

**Buraco declarado:** a suíte roda sqlite `:memory:`, onde `lockForUpdate()` é no-op. O teste do D6
prova o comportamento (critério 5), não a serialização. A serialização real fica provada à mão
contra MySQL, com duas sessões concorrentes, no gate de fechamento — e se não for provada, o Q-5
volta ao backlog em vez de ser dado como fechado.

## 8. Execução e review

Backend-only, **main tree** — P-03: o compose monta o main tree e um worktree rodaria teste contra o
código errado.

`generated.ts` muda (D7), o que tira o bloco da faixa de baixo risco: o review pede **segunda lente
do Codex** (`mcp__codex__codex`, read-only) além do `/revisar-sprint`.

## 9. Fechamento

Ao fechar: P-24 sai de `pendencias.md`; Q-5, o órfão do MinIO, o `is_primary` não-`Optional`, a
paridade permissão↔i18n e a unicidade de `client_addresses.is_primary` saem de `backlog.md`
§Débitos técnicos. O que **não** sai: os itens de UI, os minors de 5.2a/5.2b e as decisões de Q-6,
P-20 e P-21, que este bloco não tocou.
