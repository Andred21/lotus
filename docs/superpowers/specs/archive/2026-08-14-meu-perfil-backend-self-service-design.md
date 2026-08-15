# Spec — `meu-perfil-backend-self-service` (Sprint 6 · Meu Perfil, bloco 1 de 2)

> **Data:** 2026-08-14 · **Estado de origem:** `ready_for_planning` → `planning`
> **Context Packet:** `docs/superpowers/context-packets/2026-08-14-meu-perfil-backend-self-service.md`
> **Fonte canônica:** Drive `meu-perfil-escopo-funcional.md` (ID `1lI3IEOx9_2H093TvhkfO16_hhO9LxFvI`, criado 14/08/2026)
> **Baseline:** `main@a0d5c60`

## 1. O que o bloco entrega

O contrato backend de **Meu Perfil**: o usuário autenticado lê o próprio perfil, edita o que é
self-service (nome, telefone, foto), troca a própria senha e — quando é Redator — envia a própria
documentação profissional. Tudo dentro de `App\Domains\Identity`, com DTOs `spatie/laravel-data`,
rotas próprias sob `/api/profile`, auditoria e testes. Termina com contrato estabilizado e
`generated.ts` regenerado. O frontend (bloco 2) só inicia depois.

**Não entrega:** nenhuma tela; nenhuma leitura de Operation (turmas, matrículas, agenda); nenhuma
alteração em `/api/me`, em `SessionUserData` ou nas rotas administrativas existentes.

## 2. Decisões

D1–D5 foram escolhidas pelo João entre alternativas apresentadas, respondendo às cinco perguntas
abertas do Drive §14. D6–D9 são derivadas e declaradas como tais.

- **D1 — O resumo de atividade que viria do Dashboard FICA FORA.** Decisão do João, tomada depois
  de o desenho inicial propor uma camada comum em `Operation`: *"Vamos excluir a parte que vem de
  dashboard, esperando a finalização do seu bloco na branch e worktree paralela, acredito que evita
  fazer cross-domain com operation."* Corta-se **somente o que precisa de Operation** —
  `turmas_em_andamento`, `proximas_turmas`, `proxima_turma`, `pendencias`. `cursos_habilitados`
  **fica**, porque sai de `Redator::courses()`, que é `Catalog\Models\Course`, aresta já permitida.
- **D2 — Substituição sim, remoção não.** O Redator envia documento e substitui o do mesmo tipo;
  não existe rota self-service de exclusão. Custo zero: `StoreRedatorDocumentAction` já faz replace
  por soft-delete do ativo do mesmo tipo. Remover documento continua sendo ato administrativo.
- **D3 — Trocar a senha encerra as outras sessões e mantém a atual.** Quem trocou continua
  navegando; qualquer outra sessão do mesmo usuário morre.
- **D4 — `/api/profile` é recurso próprio.** Não se pendura em `/api/me`, que segue intocado
  devolvendo `SessionUserData`. Sessão e perfil têm formas e ciclos de vida diferentes; misturá-los
  infla o payload de toda navegação.
- **D5 — O Redator envia documento; o REUF fica administrativo.** Motivo medido, não estético: a
  rota administrativa aceita `valid_until` do corpo da request, e o `RedatorIdoneidadeService`
  decide a habilitação de turma lendo exatamente REUF + `valid_until`. Self-service irrestrito
  deixaria o Redator declarar a própria validade de REUF e se auto-habilitar — RN-09 furada por
  payload. CV, TÍTULO e POSTGRADO não entram em nenhum gate.
- **D6 (derivada) — Status de validade documental é calculado no backend.** Resolve a divergência
  registrada no packet: `RedatorDocumentData.php:12-13` afirma derivação no front, e o Drive §5 diz
  o oposto — *"A regra que decide validade/idoneidade permanece no backend/domínio dono. O React
  não calcula compliance a partir de datas cruas quando o contrato puder fornecer o estado
  semântico."* O Drive vence pela hierarquia e o documento é de hoje, então a regra de reconciliação
  que protege decisão fechada não se aplica. **`RedatorDocumentData` não muda** — o contrato novo é
  do perfil, e reescrever o DTO administrativo é escopo de outro bloco.
- **D7 (derivada) — Sem permissão nova.** `PermissionCatalog` não ganha `profile.*`. As rotas ficam
  sob `auth:sanctum` e **nunca** sob `permission:identity.user.update`, que é o gate das rotas
  administrativas. A posse é estrutural (§4).
- **D8 (derivada) — Campo proibido devolve 422, não 200 silencioso.** Ignorar o campo forjado
  também protege o dado, mas some com o sinal: o cliente que enviou `email` acredita que salvou.
  A recusa nomeia o campo.
- **D9 (derivada) — Nenhum serviço existente é reimplementado.** Foto reusa `UserPhotoService`;
  documento reusa `StoreRedatorDocumentAction`; hash de senha reusa o cast `'hashed'` do model.

## 3. Contrato

DTOs novos em `backend/app/Domains/Identity/Data/`, todos `#[TypeScript]`.

### Saída

```
ProfileData                                  fromUser(User $user): self
  id, uuid, name, email, rut, phone, photo_url, role, type
  redator: ?RedatorProfileData               null para Admin

RedatorProfileData                           fromRedator(Redator $redator): self
  documentos: RedatorProfileDocumentData[]   4 slots SEMPRE, um por tipo
  cursos_habilitados: int
  cursos: string[]

RedatorProfileDocumentData
  type: RedatorDocumentType
  status: DocumentValidityStatus
  self_service: bool
  valid_until, original_name, size, created_at, download_url   nullable
```

`photo_url` e `download_url` levam `#[WithTransformer(SignedUrlTransformer::class, …)]` — 60 e 10,
os TTLs já em uso em `SessionUserData` e `RedatorDocumentData`. `documentos` é coleção só de saída:
leva `#[DataCollectionOf]` **e** `#[ReadOnlyCollection]`, conforme a catraca do `PersistenceLawsTest`.

**Os quatro slots são sempre quatro, e sempre na mesma ordem** — a dos cases de
`RedatorDocumentType`, não a ordem de chegada no banco, senão a lista da tela muda de posição a cada
upload. Documento nunca enviado sai com `status: ausente` e os cinco campos opcionais em `null` — a
tela não precisa saber quais tipos existem para desenhar a lista, e "não enviou" não se confunde com
"não existe esse tipo".

`self_service: false` no REUF carrega a D5 ao front como **dado**, não como regra reescrita lá.

### Entrada

```
ProfileUpdateData     name, phone                 + campos proibidos (§4)
ProfilePasswordData   current_password, password, password_confirmation
```

> **Emenda (review 2026-08-15, Q-5):** a spec original dizia "`password_confirmation` é chave do
> payload, lida pela regra `confirmed`, não propriedade". A implementação a promoveu a propriedade
> de verdade para o tipo gerado não mentir sobre o que a rota espera — o front do bloco 2 consome
> `ProfilePasswordData` do `generated.ts` e precisa ver o campo. Decisão aceita pelo João no review;
> este parágrafo substitui o texto original.

Upload de foto e de documento validam no controller com `$request->validate()`, como já fazem
`UserPhotoController` e `RedatorDocumentController` — arquivo não se hidrata em DTO em lugar nenhum
do repo.

### Enum novo

`backend/app/Domains/Identity/Enums/DocumentValidityStatus.php`, com a convenção do repo (case
PascalCase, valor snake_case):

```php
case Vigente = 'vigente';
case VenceEmBreve = 'vence_em_breve';
case Vencido = 'vencido';
case Ausente = 'ausente';
```

Duas regras viram método, e é onde elas se testam sem montar request:

- `DocumentValidityStatus::for(?CarbonInterface $validUntil, bool $presente): self` — dona do
  limiar. `const DIAS_AVISO = 30`. Ausente vence tudo; `valid_until` nulo é `Vigente` (mesma
  semântica do `RedatorIdoneidadeService`: nulo vale sempre); data passada é `Vencido`; dentro dos
  30 dias é `VenceEmBreve`.
- `RedatorDocumentType::isSelfService(): bool` — `false` só no REUF. A D5 vira propriedade do tipo,
  não `if` repetido em controller, DTO e teste.

## 4. Autorização — a posse é estrutural

Nenhuma rota carrega `{id}`, `{user}` ou `{redator}`. Toda ação opera sobre `$request->user()`.
**Não existe request capaz de endereçar outro usuário**, então não há o que verificar em runtime —
a garantia é a forma da rota, não uma checagem que alguém pode esquecer de escrever.

Rotas em `backend/app/Domains/Identity/routes.php`, dentro do grupo `auth:sanctum` já existente:

```
GET    /api/profile              perfil próprio (Admin e Redator)
PUT    /api/profile              name, phone
POST   /api/profile/photo
DELETE /api/profile/photo
PUT    /api/profile/password
POST   /api/profile/documents    só Redator
GET    /api/me                   INTOCADO — segue devolvendo SessionUserData
```

`POST /api/profile/documents` exige `$request->user()->redator`; Admin recebe 403, renderizado pelo
handler RFC 7807 como qualquer outra exceção.

**Campos proibidos.** `ProfileUpdateData::rules()` declara `prohibited` para `email`, `rut`, `type`,
`is_active`, `roles`, `permissions` e `photo_url` — os seis vetados pelo Drive mais a foto, que tem
rota própria. Payload forjado responde **422 nomeando o campo**. Se `rules()` não carregar chave
sem propriedade correspondente, a validação desce para `$request->validate()` no controller; o
requisito é o 422, o mecanismo é detalhe de implementação e o teste prova o comportamento.

## 5. Fronteira de domínio

**Zero aresta nova entre domínios.** Sem camada comum em Operation, sem `OperationWindows`, sem
`RedatorAtividadeQuery`. `backend/tests/Feature/Shared/DomainDependencyTest.php` **não é tocado por
este bloco** — a colisão que a abertura registrou como provável com a branch do Dashboard deixa de
existir por decisão de escopo (D1).

`cursos_habilitados` e `cursos` saem de `Redator::courses()` (`belongsToMany` para
`Catalog\Models\Course`), aresta já presente na allowlist de `Identity`.

**Duplicação temporária declarada:** `DocumentValidityStatus::DIAS_AVISO = 30` coexiste com
`Dashboard\Services\DashboardWindows::EXPIRY_WINDOW_DAYS = 30`, que vive na branch paralela e ainda
não existe nesta árvore. São o mesmo número com o mesmo significado em dois domínios. Unificá-los é
**tarefa nomeada no fechamento do bloco**, depois do merge do Dashboard — não antes, porque agora
significaria importar de um domínio que aqui não existe.

## 6. Senha e sessões

`PUT /api/profile/password` recebe `current_password`, `password` e `password_confirmation`.

- `current_password` usa a regra homônima do Laravel: erro determinístico de 422 nomeando o campo,
  não 403 genérico.
- `password` usa `['required', 'string', 'min:8', 'confirmed']` — a mesma força já vigente em
  `UserData.php:58`. Política nova de senha não se inventa aqui.
- O cast `'password' => 'hashed'` do model faz o hash; nenhum `Hash::make` no controller.
- `password` **não** está em `$auditInclude` do `User`, então hash nunca entra em `audits` — de
  graça, sem código defensivo.

O encerramento das outras sessões vira `PurgeOtherSessionsAction` em
`backend/app/Domains/Identity/Actions/`: apaga de `sessions` as linhas com o `user_id` do usuário e
`id` diferente da sessão corrente.

**A prova precisa de dois testes que medem coisas diferentes**, e sem os dois "encerra as outras" e
"não me derruba" viram a mesma asserção, que é o que faz um regresso passar verde:

1. contra a tabela: duas linhas do usuário mais uma de terceiro; depois da ação sobra a corrente e
   a de terceiro;
2. contra o HTTP: troca de senha com sessão real, e a request seguinte do mesmo cliente continua
   autenticada.

**Armadilha medida:** `backend/phpunit.xml` define `SESSION_DRIVER=array`. A suíte não usa a tabela
`sessions`, então um teste ingênuo do encerramento passaria verde sem exercitar nada — cobertura
fantasma. O teste (1) escreve e conta linhas diretamente na tabela, que existe no sqlite via
`0001_01_01_000000_create_users_table.php`, e é imune ao driver; o teste (2) força
`config(['session.driver' => 'database'])`. **A tarefa do plano declara isso explicitamente.**

Fora de escopo, registrado por ser adjacente: `AuthenticateSession` não está registrado em
`bootstrap/app.php`, então hoje nada mais invalida sessão por troca de senha. Este bloco resolve o
caso por ação explícita, não ligando middleware global — ligá-lo mexeria no eixo de autenticação de
toda a aplicação, o que é decisão própria, não efeito colateral de Meu Perfil.

## 7. Documentos do Redator

`POST /api/profile/documents` — e só isso, sem `DELETE` (D2).

- Reusa `StoreRedatorDocumentAction::execute()` inteiro: escrita no disco antes da transação,
  replace por soft-delete **por instância** do ativo do mesmo tipo (é o que faz o owen-it gravar a
  linha em `audits`), binário preservado no bucket.
- `type` limitado aos tipos com `isSelfService() === true`. `REUF` no corpo responde **422 nomeando
  o campo**, nunca 403 — é entrada inválida para esta superfície, não falta de permissão.
- `valid_until` segue aceito, e só nos três tipos permitidos. Nenhum deles entra no gate da RN-09,
  que lê exclusivamente REUF.
- `file` mantém `['required', 'file', 'max:10240']`, idêntico à rota administrativa.

## 8. Auditoria e erros

Auditoria de `name`, `phone` e `photo_path` já vem de graça: os três estão em `$auditInclude` do
`User`, e a exigência do Drive §8.3 é atendida sem código novo. O bloco **não** cria trilha própria.

Erros sobem ao handler global RFC 7807 (`ProblemDetails::fromException`). Nenhum `abort()`, nenhum
`response()->json()` de erro montado à mão — lei §5.4 do `CLAUDE.md`.

## 9. Testes e DoD

DoD comportamental, alinhado ao §13 do Drive. Cada item abaixo é um comportamento provado, não um
arquivo criado:

1. Admin autenticado lê `/api/profile` e recebe `redator: null`.
2. Redator autenticado recebe os **4 slots**, com `status: ausente` no que nunca enviou.
3. `status` responde à data: vigente, dentro dos 30 dias e vencido — três casos, um por fronteira;
   o quarto estado (`ausente`) é o item 2. `valid_until` nulo é vigente, não "vence em breve".
4. `PUT /api/profile` altera `name` e `phone`, e a linha correspondente aparece em `audits`.
5. `PUT /api/profile` com `email`, `rut`, `type`, `is_active`, `roles` ou `permissions` no corpo
   responde **422 nomeando o campo**; o valor no banco não muda.
6. Senha: atual errada reprova com 422 em `current_password`; atual certa troca, e o novo hash
   autentica.
7. Sessões: os dois testes do §6, com a ressalva do `SESSION_DRIVER` tratada.
8. Foto: `POST` grava e `DELETE` remove, ambos via `UserPhotoService`; sem segunda implementação.
9. Documento: `CV` substitui o anterior, que fica soft-deletado; `REUF` reprova com 422.
10. Admin em `POST /api/profile/documents` recebe 403.
11. Sem N+1 na leitura do perfil, provado por **contagem de queries** com um Redator de vários
    cursos e vários documentos. `Model::preventLazyLoading()` **não serve aqui** e a spec registra o
    porquê para o plano não tentar: ele não está ligado globalmente na suíte (só dentro de testes
    específicos, como `ContratanteEagerLoadTest`), e `Builder::hydrate()` só marca a instância
    quando hidrata **mais de uma** linha — o perfil hidrata um usuário só, então a guarda nunca
    dispararia e o teste passaria verde com o N+1 presente.
12. `typescript:transform` regenerado e `generated.ts` commitado — **nunca editado à mão** (lei
    §5.3). Nenhum consumidor de TS existente quebra: os tipos são todos novos e aditivos.
13. Pint verde nos arquivos tocados; `php artisan test` verde na suíte inteira.

## 10. Riscos

- **Risco de review projetado ALTO**, pelo gatilho binário do projeto: regenera `generated.ts`,
  toca o eixo de autenticação (troca da própria senha) e mexe em ownership de documento de Redator.
  A classificação final é do `/revisar-sprint`.
- **Colisão certa no merge com a branch do Dashboard:** `generated.ts`. As duas árvores geram o
  arquivo correto para o próprio backend; o remédio é regenerar depois do merge, mecânico, com
  precedente no merge do BD-6.
- **Duplicação do limiar de 30 dias** até o merge do Dashboard (§5), com a unificação nomeada no
  fechamento.
