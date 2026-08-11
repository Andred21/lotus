# Integridade e concorrência no backend (design)

> BD-2 do `backlog.md`, promovido pelo João em 2026-08-11 com os quatro itens íntegros.
> Backend puro, main tree (P-03), zero schema. Fonte: repositório — `Q-16` (`backlog.md:302`) e os
> débitos "Bloco 5.2a/5.2b (minors do review final)" (`backlog.md:356` e `:360`). Sem Context Packet
> por ausência medida de fonte externa.

## 1. Escopo

Quatro itens, na ordem escrita do BD-2:

1. **Q-16** — `lockForUpdate()` antes do `ensureSingle()` nos dois serviços de principal
   (`PrimaryContactService`, `PrimaryAddressService`), no mesmo commit.
2. Unicidade de RUT/email para **dentro** da `DB::transaction`.
3. `UserData::fromModel` deduplicando `getRoleNames()`.
4. Os quatro testes que faltam: `SuperadminGuard` com outro superadmin **inativo**; auto-colisão de
   RUT/email no próprio update; o 422 de `role: redator` afirmando a **chave**; error-bag de
   `CreateRoleAction`/`UpdateRoleAction`.

**Fora de escopo (lista fechada):**

- a decisão do 5.2b sobre `GET /api/roles` enumerar permissão de superadmin — é do João
  (`backlog.md:173`);
- converter violação de índice único em 422 (opção recusada na D3 — ver §5);
- qualquer mudança de schema, de `generated.ts`, de contrato HTTP ou de frontend;
- os demais BDs (BD-3..BD-7) e as pendências que eles cobrem.

## 2. Decisões

**D1 — o lock é duplo: mutex no `Client` e leitura travada da coleção.** O texto do Q-16 pede
`lockForUpdate()` no `Client`; medido, isso sozinho não fecha a janela (§3.1). Escolha do João entre
três formas apresentadas.

**D2 — a prova é teste MySQL-only, com o harness extraído para `tests/Support/`.** Escolha do João
entre harness extraído, molde copiado e sonda manual de gate. O `CertificateNumberTest` passa a
consumir o harness sem mudança de comportamento.

**D3 — o item 2 entra nos três sítios medidos**, não só no `UpdateStaffUserAction` que o débito
nomeia. Escolha do João entre literal, três sítios e três sítios + 422 de colisão concorrente; a
terceira foi recusada, e o que ela fecharia fica declarado como limitação (§5).

**D4 — o item 3 entra sem alegar ganho de query.** `getRoleNames()` faz `loadMissing('roles')` e a
segunda chamada lê a relação em cache: a dedução é de `pluck`, não de `SELECT`. Medição própria
deste desenho, contra o que o débito insinua.

**D5 — nenhuma escrita muda de forma.** Os `update()` por instância continuam por instância (lei
§5.2 / ADR-08 — o query builder não dispara evento e a auditoria perderia o rastro). O lock entra
como leitura; não nasce caminho novo de escrita.

## 3. Item 1 — o lock

### 3.1 A medição que mudou o desenho

Sonda executada contra o MySQL de dev antes de escrever, com a transação já tendo feito uma leitura
consistente antes de pedir o lock do `Client`:

```
isolation: REPEATABLE-READ
leitura comum  (ensureSingle hoje): [..., "SONDA-A"]
leitura com lock                  : [..., "SONDA-A", "SONDA-B"]
```

`SONDA-B` é o principal que a transação concorrente **já commitou**. Em `REPEATABLE READ`, o
`SELECT` comum volta do snapshot da transação; a leitura travada volta do commit mais recente.
Consequência direta: a transação que acorda do `lockForUpdate()` no `Client` e lê os principais com
`SELECT` comum conta **1**, faz o early-return de `ensureSingle()` e os dois principais sobrevivem —
o defeito que o Q-16 existe para fechar. O mutex é necessário e não suficiente.

### 3.2 A forma

Nos dois serviços, no topo de `ensureSingle()`, antes da leitura de hoje:

```php
// mutex por cliente: serializa as regiões críticas concorrentes
$client->newQuery()->whereKey($client->getKey())->lockForUpdate()->first();

$primaries = $client->contacts()
    ->where('is_primary', true)
    ->orderBy('id')
    ->lockForUpdate()      // leitura travada: lê o commit mais recente, não o snapshot
    ->get();
```

Papéis distintos e declarados no docblock: o lock do `Client` **serializa**; o da coleção faz a
transação acordada **enxergar**. O `PrimaryAddressService` recebe o espelho exato, sobre
`$client->addresses()`.

Os seis chamadores (`CreateClientAction`, `UpdateClientAction`, `Create`/`UpdateClientContactAction`,
`Create`/`UpdateClientAddressAction`) **já** abrem `DB::transaction` — conferido arquivo a arquivo.
Nenhuma Action muda.

### 3.3 A prova, em duas camadas

`SQLiteGrammar::compileLock()` devolve `''`: na suíte o lock é no-op silencioso. Por isso:

**Camada 1 — suíte sqlite.** Guarda de transação no molde do Q-5
(`ClientContactMinimumTest::test_exclusao_roda_dentro_de_transacao`): observa que `ensureSingle()`
roda com `DB::transactionLevel() === 2`. **2, não 1** — o `RefreshDatabase` já mantém uma transação
aberta durante o teste inteiro, e asserir `> 0` mediria o `RefreshDatabase`, não o código sob teste.
O docblock diz explicitamente que esta camada **não** prova serialização.

**Camada 2 — MySQL real.** Sonda de dois processos por serviço: cliente com três contatos, um
principal; P1 promove o segundo, P2 promove o terceiro, em conexões distintas; ao fim, **exatamente
1 principal**. Vista reprovando contra o código sem o lock (lição 10).

O mecanismo de alinhamento que torna o vermelho determinístico é **medição do plano**, não promessa
desta spec. Dois candidatos nomeados: gate segurando as linhas dos contatos que cada processo vai
atualizar, liberando os dois juntos; ou sinal externo entre os processos depois do `UPDATE` e antes
da região crítica. A janela a reproduzir é conhecida: as duas transações precisam formar seu read
view **antes** de a concorrente commitar.

### 3.4 O harness

Sai do `CertificateNumberTest` para `tests/Support/`, com quatro responsabilidades:

- pular fora do MySQL (`markTestSkipped` — `lockForUpdate` é no-op em sqlite);
- clonar a configuração da conexão MySQL numa conexão de gate própria;
- subir processo filho (`Symfony\Component\Process`) com `APP_ENV`, `DB_CONNECTION` e `DB_DATABASE`
  herdados da conexão do teste, com timeout e idle timeout;
- esperar em `performance_schema.data_lock_waits` até N processos estarem bloqueados na tabela
  observada, falhando com diagnóstico se um processo morrer antes.

O `CertificateNumberTest` passa a consumi-lo com **zero mudança de comportamento**: mesmo caso, mesmo
placar. Baseline medido antes de planejar, contra MySQL real: **3 passed (20 assertions)**, caso
concorrente em 0,31s.

Comando (idioma já documentado nos planos arquivados):

```bash
docker compose exec -T -e DB_CONNECTION=mysql -e DB_DATABASE=lotus_test app php artisan test --filter=...
```

**Restrição medida:** a fixture da sonda nasce **pela conexão do gate**, não por factory — o que a
transação do `RefreshDatabase` cria, os processos filhos não enxergam. Limpeza em `finally`, como no
precedente.

**Efeito no placar:** a suíte em sqlite passa de **1 para 3 skipped** (o caso de contatos e o de
endereços somam-se ao de certificado). Skip aqui é sinal honesto: o caso existe, versionado, e roda
onde o lock existe.

## 4. Item 2 — unicidade dentro da transação

Três sítios, o mesmo movimento de uma linha em cada:

| Sítio | Hoje |
|---|---|
| `UpdateStaffUserAction:34-38` | `ensureRutAvailable` + `ensureEmailAvailable` antes do `DB::transaction` |
| `UpdateClientAction:29` | `ensureRutAvailable` antes do `DB::transaction` |
| `UpdateRedatorAction:33` | `ensureRutAvailable` antes do `DB::transaction` |

Os irmãos que já fazem certo são a referência: `CreateStaffUserAction:30-34`, `UpdateStudentAction:25-26`
e `CreateStudentAction:49` chamam de dentro. O `UpdateRedatorAction` mantém o upload de binários
**fora** da transação — é decisão registrada da spec do redator (D3 de lá), e este bloco não a toca:
só a checagem de RUT entra.

**Guarda:** `DB::listen` captura `DB::transactionLevel()` no momento do `select ... from users where
rut = ?`; a asserção é **2**, pelo mesmo motivo do §3.3. Mutante = devolver a chamada para fora, e o
teste reprova.

**Limitação declarada (D3).** Mover para dentro dá atomicidade de check+write; **não** fecha a
corrida. Duas escritas concorrentes com o mesmo RUT continuam colidindo no índice único de
`users.rut` e subindo **500**, não 422 — o índice não distingue `deleted_at`, que é a razão de o
check existir com `withTrashed` (lição 8). Fechar isso era a terceira opção apresentada e foi
recusada; fica escrito para não ser lido como esquecimento.

## 5. Item 3 — `getRoleNames()`

`UserData::fromModel` guarda a coleção uma vez e alimenta `role` (`->first() ?? ''`) e `roles`
(`->all()`). Uma linha.

Sem teste novo: `StaffUserActionTest::test_from_model_projeta_roles_e_type` já assere os dois campos
e reprovaria se a dedução mudasse o valor. `generated.ts` não muda — a forma do DTO é a mesma.

## 6. Item 4 — os quatro testes

Cada um nasce com o mutante que o justifica, visto reprovando antes de virar verde (lição 10):

| Teste | Arquivo | Mutante que ele mata |
|---|---|---|
| outro superadmin **inativo** não conta | `SuperadminGuardTest` | remover `->where('is_active', true)` do `SuperadminGuard` |
| auto-colisão de RUT/email no próprio update passa | `StaffUserActionTest` | remover o `when($exceptUserId !== null, ...)` do `UserProvisioner` |
| 422 de `role: redator` afirma a chave `role` | `StaffUserActionTest` | qualquer outra regra reprovando no lugar do `Rule::notIn` |
| error-bag de `Create`/`UpdateRoleAction` afirma `name` e `permissions` | `CreateRoleActionTest`, `UpdateRoleActionTest` | mesma classe do anterior |

Os dois últimos são a mesma lição: `expectException(ValidationException::class)` **não discrimina a
porta**. O teste do `redator` passa hoje se o `exists:roles,name` reprovar por seeder ausente — a
regra que ele existe para provar nem precisa rodar. É a guarda de porta múltipla que a
`.claude/rules/backend-ddd.md` já exige, aplicada ao error-bag.

Chaves conferidas no código, não supostas: `PermissionCatalog::assertAssignable()` lança em
`permissions`; a colisão de nome das duas Role Actions lança em `name`. Idioma da asserção:
`$this->assertArrayHasKey('rut', $e->errors())`, no molde do `StudentResolverTest`.

## 7. O que este bloco NÃO faz

- não fecha a corrida de unicidade de RUT/email (§4);
- não toca a assimetria "a UI não volta a zero principais, o backend aceita zero" — débito separado
  do `backlog.md`, sem relação com concorrência;
- não promove ninguém: cliente sem principal continua estado válido, como os dois serviços já
  declaram;
- não muda o `GET /api/roles` (fora de escopo por decisão pendente do João);
- não roda `migrate:fresh --seed` no banco de dev — o `LOT-2026-1001` corrompido de propósito segue
  esperando o checkpoint visual dele.

## 8. Risco de review

**MÉDIO.** Nenhum gatilho de ALTO do gabarito se aplica: sem schema, sem `generated.ts`, sem
auth/Sanctum, sem RBAC em produção (o item 4 só acrescenta teste), sem dinheiro, sem documento legal,
`executor: claude`. Os dois gatilhos próprios do bloco:

1. **caminho de escrita auditado** — os dois serviços de principal decidem quem perde `is_primary`,
   e o registro tem peso de cadastro; o lock não pode mudar quem vence nem trocar o `update()` por
   instância;
2. **concorrência que a suíte não enxerga por construção** — o item 1 inteiro vive num caminho que
   sqlite anula em silêncio (`compileLock()` devolve `''`). Guarda que promete e não entrega é o
   risco central, igual ao do BD-1.

Foco do review: a sonda realmente disputa (dois processos vistos esperando pelo mesmo lock), o
vermelho foi visto sem o lock, e o harness extraído não afrouxou o caso do certificado.

## 9. Definition of done

- sonda MySQL **verde com o lock e vista vermelha sem ele**, nos dois serviços;
- guarda de transação (`transactionLevel() === 2`) com **um caso por alvo**: dois serviços do item 1
  e os três sítios do item 2, cinco casos ao todo;
- os quatro testes do item 4, cada um visto reprovando contra seu mutante;
- `CertificateNumberTest` migrado ao harness com placar idêntico ao baseline (3 passed / 20
  assertions em MySQL);
- suíte sqlite verde, com o novo total de skipped declarado;
- Pint `passed` nos `.php` tocados;
- `typescript:transform` sem diff em `generated.ts`;
- `git diff main...HEAD` de `backend/database/` e de `frontend/` **vazios**.
