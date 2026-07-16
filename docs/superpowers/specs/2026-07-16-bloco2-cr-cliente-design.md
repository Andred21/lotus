# Bloco 2 · CR Cliente — cargo do contato, principal único, complemento na tela

**Data:** 2026-07-16
**Notion:** CR.1.1 (backend/migration), CR.1.2 (Action/Service), CR.1.3 (tela)
**Origem:** solicitação do contratante em 2026-07-15, itens 1–3 do Cliente.

## Contexto verificado no código (não assumir o card)

- `client_addresses.line2` **já existe** no banco, no `ClientAddressData` e no `EMPTY_ADDRESS` do
  `ClientDialog`. A tela renderiza region/commune/city/line1/number e **pula `line2`** — falta só o
  `FormField`.
- `client_contacts` **não tem** coluna de cargo — este bloco cria.
- `client_contacts.is_primary` **já existe** (default false, indexada) e o DTO já expõe. O que não
  existe é a **garantia de unicidade**: hoje nada impede N contatos principais.
- **A UI grava contato só pelo payload do cliente.** `Update/CreateClientAction` fazem replace total
  dos nested. O `ClientContactController` (`POST clients/{client}/contacts`, `PUT contacts/{contact}`,
  `DELETE contacts/{contact}`) existe, está sob `auth:sanctum` e **nenhuma tela do front o chama**.
- Não existe wrapper de radio em `shared/ui` — o barrel raiz não tem `AppRadioButton`.
- `ClientContact` tem `$auditInclude` além do `$fillable`. Campo novo entra **nos dois**, senão a
  auditoria não registra a mudança de cargo (peso legal).

## Decisões (fechadas com o João em 2026-07-16 — não re-decidir)

1. **Coluna = `job_title`, não `role`.** O card do Notion escreveu `role`, mas `role` neste projeto
   já significa RBAC (spatie `roles`/`permissions`). `ClientContactData.role` convivendo com
   `User->roles` é ruído de leitura permanente, e `role` é genérico demais para "cargo/área".
   `position` foi descartado: ambíguo com ordenação, que os blocos 3–4 vão usar em `course_modules`.
   **Desvio do texto literal da CR — anotar no card do Notion e no progress.md.**
2. **Regra de principal único vive em Domain Service, ligado nos 2 caminhos de escrita.** Só nas
   Client Actions cobriria 100% do caminho real (a tela), mas deixaria o `ClientContactController`
   criando 2º principal — invariante nominal. Deletar o controller órfão foi descartado (CLAUDE.md
   §6: dead code alheio se menciona, não se deleta).
3. **Normalização silenciosa; cliente sem principal é válido.** 2+ principais → mantém 1 (o último),
   desmarca o resto, sem 422. 0 principais → aceita, não auto-promove ninguém. A UI (radio) nunca
   gera payload inconsistente; o serviço é a rede de segurança da API.
4. **`client_addresses.is_primary` fica fora deste bloco.** Tem o mesmo gap, mas o contratante não
   pediu e a tela só edita o 1º endereço (não há UI que gere 2º principal). Gap conhecido → backlog.
5. **A coluna entra na migration original** (`2026_07_06_141820_clients.php`), não em migration nova.
   Greenfield, nada em produção, nenhum ADR trava migration como imutável, e o `down()` do arquivo já
   dropa as 3 tabelas juntas. **Custo aceito:** quem já rodou a migration não ganha a coluna com
   `migrate` — precisa `migrate:fresh --seed` (vale para o DB local do João **e do Andred21**).
   Testes não sofrem: sqlite `:memory:` sempre nasce limpo.

## Backend

### Schema e contrato (CR.1.1)

- `database/migrations/2026_07_06_141820_clients.php`: `$table->string('job_title')->nullable();` no
  `Schema::create('client_contacts', ...)`, depois de `phone`.
- `ClientContact`: `job_title` em `$fillable` **e** em `$auditInclude`.
- `ClientContactData`: `public string|Optional|null $job_title` — mesma forma de `email`/`phone`.
- `php artisan typescript:transform` regenera `frontend/src/shared/types/generated.ts`
  (nunca editar à mão — ADR-04, lei §5.3).
- `docs/der-fisico.md` linha 27 (`client_contacts`) reflete a coluna, em inglês, 1:1 com a migration.

### Regra de principal único (CR.1.2)

`App\Domains\Commercial\Services\PrimaryContactService`:

```php
public function ensureSingle(Client $client, ?ClientContact $winner = null): void
```

- Lê os contatos do cliente. 0 ou 1 principal → não faz nada.
- 2+ principais → mantém 1, desmarca os demais com `$contact->update(['is_primary' => false])`
  **por instância**. Query builder não dispara evento = **não audita** (lei §5.2) — o mesmo motivo
  do comentário já existente no replace de nested do `UpdateClientAction`.
- `$winner === null` → vence o último principal por `id` (caminho replace-total).
  `$winner` informado → vence ele (caminho REST nested).
- 0 principais → estado válido, não promove ninguém.

**Chamadores:**

- `CreateClientAction` / `UpdateClientAction`: `ensureSingle($client)` após o loop de
  `contacts()->create(...)`, dentro da transação que já existe.
- `ClientContactController` `store`/`update`: passam a injetar `CreateClientContactAction` /
  `UpdateClientContactAction` (hoje escrevem direto no Eloquent). Escrita **com regra** → Action,
  conforme o padrão de entidade. Cada Action é fina: create/update + `ensureSingle($client, $contact)`
  em `DB::transaction`. `destroy` não muda (delete não cria 2º principal).

> **Trade-off registrado:** são 2 Actions novas para rotas que nenhuma tela chama. O preço é fechar a
> invariante em toda a API (decisão 2) e manter a simetria do padrão de entidade.

### Testes (integração, sqlite `:memory:` — não mock)

- Replace-total: marcar B como principal desmarca A; estado final tem no máximo 1.
- Payload com 2 principais → persiste 1 (o último marcado).
- Payload com 0 principais → persiste 0 (estado válido).
- Mesma prova pelo caminho REST nested (`POST clients/{client}/contacts` com `is_primary`).
- `job_title` ida e volta no create e no update.

## Frontend (CR.1.3)

### `AppRadioButton` — wrapper novo em `shared/ui`

Não existe wrapper de radio. Pasta-por-componente (`AppRadioButton/AppRadioButton.tsx` + `index.ts`),
`forwardRef`, reexporta `AppRadioButtonProps`, entra no barrel raiz `shared/ui/index.ts`. A feature
importa daqui, **nunca** `RadioButton` do PrimeReact (lei §5.6).

### `ClientDialog`

- **Complemento:** `FormField` de `line2` no grid de endereço, entre `line1` (rua) e `number`.
  Backend, DTO e `EMPTY_ADDRESS` já têm o campo.
- **Contatos:** a linha é `grid-cols-3` (nome/email/telefone) e passa a carregar cargo + radio:

```
[◉] [nome        ] [cargo       ] [email       ] [telefone    ]
```

  Radio em coluna `auto` + 4 colunas `1fr`.
- **Exclusão mútua real:** `checked={c.is_primary}`; o `onChange` marca o índice `i` e **desmarca
  todos os outros no mesmo `setForm`** — a UI nunca emite payload com 2 principais. O
  `PrimaryContactService` é a rede da API, não a única defesa.
- **Contato novo já nasce `is_primary: false`** no botão "adicionar", e o `EMPTY` do `useClientForm`
  mantém `true` só no 1º contato — ambos corretos hoje, **não mexer**.
- Kit de form de `shared/ui` (`FormField`/`NestedField`) — **não** redefinir helper local
  (ver Bloco 1).

### i18n

3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de rótulo:
`client.complement`, `client.contactJobTitle`, `client.contactPrimary`.

## Definition of Done

Comportamento provado **end-to-end contra a API real**, não build/lint/test verde:

1. `migrate:fresh --seed`.
2. Criar cliente pela tela com 2 contatos, cada um com cargo.
3. Marcar o 2º como principal, salvar.
4. Reabrir o cliente: o 1º contato desmarcou, o 2º é o principal, os cargos persistiram.
5. Complemento (`line2`) persiste e volta da API.
6. Suíte verde: `docker compose exec -T app php artisan test`.
7. `pnpm build` (type-check com os tipos regenerados) e `pnpm lint`.

## Fora de escopo

- Unicidade de `client_addresses.is_primary` (decisão 4) — vai para o backlog.
- Deletar o `ClientContactController`/rotas nested órfãs — mencionado, não removido (CLAUDE.md §6).
- Blocos 3–4 (`course_modules`, `AppTextarea`) — outras CRs.
