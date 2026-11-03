# Bloco 55 — `backend-borda-http-auth-e-permissao` — design

> Data: 2026-11-03 · Base: `main@bade28c3` · Lane: `refactor/55-backend-borda-http-auth-e-permissao`
> Fonte: ficha 55 do `backlog.md`; card 10 e a seção "FormRequest e Policy" de
> `docs/superpowers/audits/2026-11-02-arquitetura-backend.html`; `D-17` (backlog, seção de dívidas);
> `P-91` e `P-54` (`docs/superpowers/pendencias/abertas.md`).
> Classificação: *bounded* — o escopo vem fechado pela ficha; a única decisão real (onde mora o
> `permission:`) foi tomada no brainstorming.

## 1. Intenção

A borda HTTP do backend tem quatro defeitos pequenos que dividem a mesma raiz: a regra existe, mas
quem a garante é a memória de quem escreve a próxima rota.

- **Onde mora a permissão.** Para saber quem pode chamar um endpoint, hoje se abre o controller
  (15 controllers declaram `permission:` em `HasMiddleware`) **e** o `routes.php` (5 grupos
  `Route::middleware('permission:…')` cobrem 11 sub-controllers: foto, arquivo, contato, endereço,
  convite, documento, habilitação de redator). O João quer **concentrar e padronizar**: um lugar só,
  com uma catraca que reprove a rota autenticada sem `permission:`.
- **"Só admin" em `User`.** O escopo staff é repetido à mão: 6 × `abort_unless($user->type ===
  'admin', 404)` (4 no `UserController`, 2 no `UserPhotoController`) e 2 × `where('type', 'admin')`.
  Rota nova de `{user}` precisa lembrar. O molde que já resolve isso para `{turma}` é o binding.
- **Permissão órfã (D-17, metade que falta).** Nada mede permissão do catálogo sem consumidor; as
  `feedback.*` órfãs foram removidas à mão em 2026-08-22 e a próxima nasce igual sem ninguém ver.
- **P-91.** `/api/*` autenticada, sem sessão e sem `Accept: application/json`, devolve **500** em
  vez de 401 — medido em produção (`GET /api/courses/archived`).

## 2. Objetivos

1. **`permission:` declarada num lugar só: o controller, via `HasMiddleware`.** Os 5 grupos de
   `routes.php` somem; cada um dos 11 controllers que dependiam deles passa a declarar a mesma
   permissão no próprio `middleware()`. O `routes.php` fica só fiação: caminho, ordem,
   `whereNumber`, `throttle`, `scopeBindings`, `auth.active`.
2. **Catraca de permissão de rota**, lendo o roteador montado (molde do
   `AuthenticatedRouteMiddlewareTest`):
   - toda rota `api/*` autenticada tem `permission:` no middleware resolvido, ou está na lista
     DECLARADA de exceções, com motivo;
   - a lista de exceções é fiel nos dois sentidos (rota que passou a ter permissão sai dela; rota
     nova sem permissão entra por escrita explícita) e cada motivo tem mais de 40 caracteres;
   - nenhuma `permission:` vem da rota/grupo: vem só do middleware do controller.
3. **Escopo staff no binding de `{user}`.** `User` ganha o escopo `staff()` (`type = 'admin'`) e um
   `resolveRouteBinding` que o aplica, no molde de `Turma::resolveRouteBinding`. Os 6 `abort_unless`
   somem; `index`, `archived` e `restore` usam `User::staff()`.
4. **Catraca de `{user}`**: um teste percorre toda rota do roteador com parâmetro `{user}` e prova que
   um id de user não-staff dá 404 — rota nova de `{user}` entra no laço sem ninguém lembrar.
5. **Catraca de permissão órfã (D-17)** sobre o `PermissionCatalog`, nos dois sentidos (D5).
6. **P-91**: `/api/*` sem sessão e sem `Accept` devolve 401 RFC 7807, provado por teste de feature
   sem o cabeçalho, visto reprovar antes do conserto, e por curl contra o stack da lane.

## 3. Fora do escopo

- **Por decisão da ficha, até o João estudar o caso:** registrar "não adotar FormRequest nem Policy"
  em ADR, e apagar `Policies/` e `Http/Requests/` do `docs/estrutura-monolito.md`.
- **P-54.** Só entraria se o bloco escrevesse migration de permissão, e ele não escreve (D6). No
  fechamento, a linha `**Bloco:**` da P-54 deixa de apontar o item 55 e volta a apontar "o próximo
  bloco que escrever migration de permissão".
- Frontend: nada muda.
- Permissão nova, renomeada ou removida; mudança de quem pode o quê.
- `role:` e `role_or_permission:` — não aparecem em rota hoje; a catraca cobre só `permission:` (uma
  rota guardada só por `role:` cai na regra "autenticada sem permissão" e reprova).

## 4. Anti-objetivos (falhou mesmo se "funcionar")

- **Qualquer endpoint mudar de resposta por causa da mudança de lugar** (a única troca admitida no
  bloco é a do D7a, que vem do binding, não do lugar). A permissão de cada rota
  depois do bloco é exatamente a de antes. Em particular, as fotos de `users/{user}/photo` continuam
  em `identity.user.update` (não em `identity.access.manage`, que é a do `UserController`), e
  `courses/{course}/redatores` continua em `catalog.course.update`.
- Permissão órfã encontrada pela catraca D-17 ser apagada pelo bloco (D6).
- Rota autenticada sem permissão descoberta pela catraca ser silenciosamente posta na lista de
  exceções (D3).
- O escopo staff vazar para autenticação: login, sessão e `Auth::user()` de redator seguem iguais (o
  guard não usa route binding).

## 5. Decisões

**D1 — Lugar único = controller (`HasMiddleware`).** Escolha do brainstorming, sobre a preferência
do João por concentrar e padronizar. Motivos: a maioria já está lá (15 controllers, `only:` por
método); a permissão fica colada na ação, e os comentários que explicam escolhas (ex.: `restore` na
mesma linha do `destroy`, ADR-07) ficam onde já estão; mover 5 grupos para 11 controllers custa menos
que o inverso.

**D2 — Os 11 controllers sem `HasMiddleware` passam a tê-lo**, com a permissão que o grupo dava, para
todos os métodos que o grupo cobria. São, pelo `routes.php` atual: `CourseRedatorController`
(`catalog.course.update`); `ClientAddressController`, `ClientContactController`, `ClientPhotoController`
(`commercial.client.update`); `BudgetFileController` (`commercial.budget.update`); `QuoteFileController`
(`commercial.quote.update`); `RedatorInvitationController`, `RedatorDocumentController`,
`UserPhotoController`, `RedatorPhotoController`, `StudentPhotoController` (`identity.user.update`). O
comentário de `Identity/routes.php` que cita "fora do grupo `permission:identity.user.update`" é
reescrito para o estado novo.

**D3 — Exceções declaradas da catraca de permissão.** Lista inicial, pelas rotas atuais sem
`permission:` sob `auth.active`: `api/logout`, `api/me`, `api/versao`, `api/profile`,
`api/profile/photo`, `api/profile/password`, `api/profile/documents` (recurso próprio, spec D4 do
perfil), `api/dashboard/metricas` (gate por seção dentro do `DashboardVisibilityData`) e `api/user`
(closure de scaffold do Laravel em `backend/routes/api.php`, devolve o próprio usuário; o front não
a usa — **decisão do João, 2026-11-03: fica como exceção**, e removê-la é assunto de outro bloco,
registrado como pendência no fechamento). A chave da
lista inclui o método HTTP quando o mesmo URI tem métodos com regras diferentes. **Se a catraca achar
rota autenticada sem permissão fora desta lista, o builder PARA e reporta ao João** — pode ser
furo de segurança real, e decidir se ela ganha permissão ou entra como exceção é dele.

**D4 — Como a catraca sabe a origem.** "Vem do controller" = presente em
`$route->controllerMiddleware()` e ausente de `$route->middleware()` (o que a rota e os grupos
declaram). A forma exata da leitura fica com o builder, desde que leia o roteador montado, não o
texto dos arquivos.

**D5 — Catraca de permissão órfã, dois sentidos.**
1. Toda chave de `PermissionCatalog::descriptions()` tem consumidor no backend: aparece como
   `permission:<nome>` (inclusive na forma `a|b`) no middleware resolvido de alguma rota, ou como
   checagem em código em `backend/app/` fora do próprio `PermissionCatalog` — hoje, chamadas
   `->can('<nome>')` (11 sítios: dashboard por seção, `approve`, `manage_concluded_docs`,
   importação, `record_result`). Uso só no front não conta: gate só de front é cosmético.
2. Todo `permission:<nome>` do roteador existe no catálogo (hoje, um nome digitado errado dá 403
   silencioso).

**D6 — Órfã real não se apaga aqui.** Se a catraca D5 reprovar no estado atual da `main`, o builder
para e reporta ao João; apagar permissão mexe em role de produção (migration + P-54) e é decisão
dele.

**D7 — Escopo staff.** Escopo `staff()` em `User` (forma: scope local ou query builder próprio, à
escolha do builder — o `Turma` usa builder próprio, mas `User` não precisa dele só por isto);
`resolveRouteBinding` aplica `staff()` e respeita `$field`. `restore` recebe `int` (não há binding):
passa a `ArchivedListing::resolveArquivado(User::staff(), $user)`. `index` e `archived` usam
`User::staff()`. O comentário de `archived` (spec D10 do bloco de arquivamento) é mantido, apontando
o escopo em vez do `abort_unless`.

**D7a — 403 vira 404 para id não-staff (decisão do João, 2026-11-03).** O `SubstituteBindings` roda
antes do `permission:` (prioridade em `bootstrap/app.php`; o middleware do spatie não está na lista e
segue a ordem declarada). Com o escopo no binding, um ator **sem** a permissão que pede
`users/{user}` ou `users/{user}/photo` com id de redator, cliente ou aluno passa de 403 para 404. É a
mesma resposta do `{turma}` (não confirma que o registro existe) e está aceita. Para id staff, ator
sem permissão continua recebendo 403. É a única mudança de resposta que o bloco admite.

**D8 — P-91.** Conserto no `withMiddleware` de `bootstrap/app.php` (`redirectGuestsTo` que não monta
rota nomeada para `api/*`, ou equivalente): a `AuthenticationException` chega ao handler global e sai
401 RFC 7807, igual ao caso com `Accept`. Rotas fora de `api/*` não existem no Lotus para o guest, mas
o conserto não pode depender de uma rota `login` nomeada existir.

## 6. Restrições

- Leis do `CLAUDE.md` §5: DDD-lite; erros sobem ao handler RFC 7807 (o conserto do P-91 não pode
  responder à mão). O 404 do binding é o `ModelNotFoundException` normal, já tratado pelo handler.
- `.claude/rules/backend-ddd.md` (escopo de dado vai no binding/`visibleTo`, não em Policy).
- Pint só nos arquivos tocados, do host, de dentro de `backend/`.
- Catraca vista reprovar por sonda (lição 10): cada catraca nova tem a sonda registrada na prova.

## 7. Deixado ao builder

- Nome e arquivo dos testes novos (sugestão: `tests/Feature/Shared/PermissionRouteMiddlewareTest.php`,
  `tests/Feature/Identity/StaffUserBindingTest.php`, `tests/Feature/Identity/PermissionCatalogOrphanTest.php`).
- Forma do escopo staff (D7) e do conserto do P-91 (D8).
- Como a catraca D5 acha as checagens em código: varredura de texto de `backend/app/` por `can('…')`
  e equivalentes do spatie é aceitável; o que importa é que uma chave inventada no catálogo reprove.
- Como montar o pedido de cada rota `{user}` na catraca de binding (método, corpo mínimo, ator com
  todas as permissões) — o binding roda antes da validação do Data, então o 404 vem antes de 422.

## 8. Riscos

- **Método de controller sem `only:`.** Um controller com `HasMiddleware` pode ter método público
  fora de todos os `only:` — a catraca D3 vai achá-lo. Tratamento: D3 (para e reporta).
- **Catraca de outra lane** (observação do harness): uma lane viva que adicione rota autenticada
  quebra contra esta catraca depois do merge. Hoje não há outra lane viva; registrar no fechamento.
- **`can()` dinâmico.** Permissão checada com nome montado em runtime escaparia da varredura D5 e
  apareceria como órfã falsa — se acontecer, é sinal para escrever o nome literal, não para afrouxar
  a catraca.

## 9. Critério de aceite (DoD)

1. Nenhum `permission:` em `backend/app/Domains/*/routes.php`; os 11 controllers da D2 declaram a
   permissão em `HasMiddleware`; suíte backend inteira verde sem mudar nenhuma asserção de status de
   teste existente, salvo a troca 403→404 do D7a, se algum teste a fixar (cada alteração citada na
   prova).
2. A catraca de permissão de rota foi vista reprovar por sonda em dois casos: rota autenticada nova
   sem permissão, e `permission:` declarada num grupo de `routes.php`.
3. Os 6 `abort_unless` e os 2 `where('type', 'admin')` não existem mais; a catraca de `{user}` passa
   e foi vista reprovar por sonda (rota `{user}` nova com binding que não aplica o escopo — ex.:
   `resolveRouteBinding` removido).
4. A catraca de órfã foi vista reprovar por sonda nos dois sentidos (chave inventada no catálogo; rota
   com nome de permissão inexistente) e está verde no estado do bloco.
5. Teste de feature: `GET /api/courses/archived` sem sessão e sem `Accept` devolve 401
   `application/problem+json`, visto vermelho antes do conserto; e o mesmo pedido por curl contra o
   stack da lane (`http://localhost:8081`) devolve 401.
6. Pint limpo nos arquivos tocados.

## Verificação externa

1. Deploy em produção da `main` com o conserto do P-91: `/api/*` sem sessão e sem `Accept` devolve
   401, não 500.
   - prova: `producao GET /api/courses/archived -> 401`
