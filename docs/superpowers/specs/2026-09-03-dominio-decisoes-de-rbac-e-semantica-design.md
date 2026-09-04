# Design — `dominio-decisoes-de-rbac-e-semantica` (item 22)

> **Data:** 2026-09-03 · **Lane:** `lane-a` (main tree) · **Frente:** Backend (com dois toques de
> frontend) · **Branch:** `refactor/backend-decisoes-de-rbac-e-semantica`, de `main@182be2ab` ·
> **Context Packet:** nenhum (`Contexto: não` na fila; as fontes são as fichas e o próprio código).

## 1. O que este bloco é

As quatro fichas travadas em decisão — `D-09`, `D-10`, `D-11` e `D-16` — recebem **veredito escrito
e o código que o veredito pedir**. Nenhuma sai "decidida e não aplicada". A `D-34` fica **fora**, por
escrito: continua sem hospedeiro e escolher um é do João.

Todas as quatro foram **remedidas contra o código** antes de decidir, e duas contradiziam o próprio
texto:

| Ficha | O que a ficha dizia | O que o código mede |
|---|---|---|
| `D-09` | "o backend aceita zero" | verdade sobre **principal**, não sobre contato: `contacts` já tem `min:1` no DTO e recusa própria nas Actions. O que o backend aceita é zero **principais** — e isso é desenho declarado no docblock do `PrimaryCollectionService` |
| `D-10` | admin comum enumera permissão de superadmin | verdade, mas **só pela API crua**: a aba Roles da tela já é `canManage`. E a página monta `useRolesPage()` **fora** do gate, então todo admin comum já dispara `GET /api/roles` hoje |
| `D-11` | quem tem `identity.user.create` sem `commercial.client.view` cria aluno pela API e não pela tela | verdade; nenhuma role semeada produz essa combinação — só role customizada |
| `D-16` | turma concluída com zero matrículas cai em `fully_issued` | verdade, e mais amplo: **qualquer** turma concluída sem matrícula **aprovada** cai lá (zero matrículas ou todas reprovadas). Há teste fixando isso por escrito |

## 2. A forma comum dos dois vereditos de RBAC

`D-10` e `D-11` são o mesmo defeito com dois rostos: **um endpoint rico servindo um consumidor que só
precisa de um lookup**, e o gate acabando calibrado pelo consumidor mais fraco.

O remédio é o mesmo nos dois: **o endpoint enxuto carrega o gate de quem o consome; o endpoint rico
fica com o gate sensível.** Precedente no repositório: `StudentData`/`StudentDetailData`, que já
separam DTO por consumidor, e `studentsApi`, que já estende a fábrica CRUD do front com um endpoint
extra.

## 3. `D-10` — `GET /api/roles` deixa de ser porta de enumeração

**Veredito:** o índice de roles **é** informação sensível — devolve `permissions` de toda role,
inclusive superadmin —, e o gate dele sobe. Quem só precisa dos nomes ganha rota própria.

**Decisões:**

- **D1.** `RoleController@index` passa de `permission:identity.user.view` para
  `permission:identity.access.manage` — o mesmo gate de `store`, `update` e de `/api/permissions`.
- **D2.** Nasce `GET /api/roles/assignable` sob `permission:identity.user.view`, com DTO novo
  `RoleOptionData` (`id`, `name`) — **sem `permissions`**. A rota é declarada **antes** do
  `apiResource`, pelo mesmo motivo de `redatores/archived` e `clients/archived`: senão
  `roles/{role}` casaria a palavra e o binding daria 404.
- **D3.** O filtro de `redator` **fica no front**. O backend devolve todas as roles; mover o filtro
  mudaria comportamento que a ficha não pede, e "assignable" descreve o gate, não a curadoria.
- **D4.** `useStaffRoleOptions` passa a consumir `rolesApi.assignable`. `rolesApi.useList()` continua
  servindo a tabela de Roles, que já vive sob `canManage`.
- **D5.** `AdministracionPage` passa a montar a página de roles com `enabled: canManage`. **Sem
  isto, este bloco quebra a tela**: hoje o `useRolesPage()` roda para todo mundo e, com o gate
  subindo, admin comum abriria `/administracion` com um 403 na aba de usuários.

**Não muda:** `RoleData` (a tabela e o diálogo seguem recebendo `permissions`), `PermissionCatalog`,
`SEGREGATED`, o `SystemRoleGuard`.

## 4. `D-11` — o lookup de empresa deixa de atravessar o gate comercial

**Veredito:** o dropdown é parte do cadastro de aluno, e o gate dele é o do cadastro de aluno.
Endpoint próprio no domínio que o consome.

**Decisões:**

- **D6.** Nasce `GET /api/students/client-options` no domínio Identity, sob
  `permission:identity.user.create` — o gate da ação que o dropdown serve; o hook só busca em modo
  create. DTO novo `StudentClientOptionData` (`id`, `legal_name`).
- **D7.** Declarada **antes** do `apiResource('students')`, pela mesma razão de D2.
- **D8.** Identity ler `Commercial\Models\Client` **não** é acoplamento novo: já acontece em sete
  arquivos (`Student`, `User`, `CreateStudentAction`, `StudentResolver`, `StudentResolution`,
  `StudentClientLinkService`, `StudentClientLog`).
- **D9.** `useStudentClients` troca `clientsApi.useList()` por `studentsApi.clientOptions`. O estado
  `unusable` **sobrevive** — ele cobre falha de rede também —, mas deixa de disparar por RBAC.
- **D10.** `commercial.client.view` continua guardando `GET /api/clients`. A tela de clientes não
  muda.

## 5. `D-16` — o funil ganha o sétimo balde

**Veredito:** sétimo balde. O rótulo "Totalmente emitida" afirma emissão onde não houve nenhuma, e
`PipelineQuery` promete baldes **exclusivos** — a partição honesta é a que separa "emitiu tudo" de
"não tinha o que emitir".

**Decisões:**

- **D11.** Caso novo `PipelineStage::ConcludedWithoutIssuance = 'concluded_without_issuance'`:
  turma concluída **sem nenhuma matrícula aprovada** — zero matrículas ou todas reprovadas. As duas
  origens caem no mesmo balde porque a pergunta do funil é uma só: há algo a emitir?
- **D12.** `PipelineQuery` ganha uma query: turmas concluídas sem matrícula aprovada
  (`whereDoesntHave`). `FullyIssued` passa a ser `concluidas − emissaoPendente − semNadaAEmitir`.
  A soma dos baldes continua igual ao total, e é isso que o teste de exclusividade prova.
- **D13.** Ordem: **último**, depois de `fully_issued`. O balde é beco, não progresso — pô-lo no meio
  sugeriria que a turma caminha por ele rumo à emissão.
- **D14.** Rótulos: es-CL `Concluida, nada por emitir` · pt-BR `Concluída, nada a emitir` ·
  en `Concluded, nothing to issue`. A UI é es-CL e a i18n é do front (ADR-15), então os três locales
  do front recebem a chave; nada disso passa por `lang/` do backend, que só carrega mensagem de API.
- **D15.** `PipelineQueryTest` muda de assertiva: o caso 7 (concluída com matrícula reprovada) sai de
  `fully_issued` e passa a provar o balde novo, e o comentário que citava a spec §4.3 é reescrito com
  a razão nova. **A mudança de teste é o registro da mudança de decisão**, não uma correção de bug.

**Consequência de contrato:** `generated.ts` regenera (enum novo). O front renderiza a etapa pela
chave do enum, então o balde aparece sem mudança estrutural de componente.

## 6. `D-09` — o backend passa a exigir um principal

**Veredito:** o backend cede. O campo existe para responder "quem é o contato desta empresa"; um
cliente sem principal não responde, e a tela já se comporta assim há meses. **Nenhum consumidor de
negócio lê "principal" hoje** — a regra existe para o campo não mentir, não para alimentar
documento.

**Decisões:**

- **D16.** **Entrada explícita recusa.** `ClientData` com `contacts` presente exige **exatamente um**
  `is_primary: true`; recusa localizada nos três locales de `lang/`, pela chave nova de
  `commercial.client.*` (a rule `.claude/rules/backend-lang.md` vale aqui). Vale para create e
  update, porque é o mesmo DTO.
- **D17.** `PUT /clients/{client}/contacts/{contact}` que desmarque o **único** principal também
  recusa — é entrada explícita pela porta nested, e fechar só o DTO do pai deixaria a mesma porta
  dos fundos que a `DeleteClientContactAction` já teve de tapar para o mínimo de um contato.
- **D18.** **Zero por efeito colateral promove.** Apagar o contato principal pela rota nested promove
  o mais antigo dos restantes, em vez de recusar. É o que a UI já faz em `removeContact`, e recusar
  aqui obrigaria o usuário a promover outro antes de excluir — fricção sem ganho.
- **D19.** `PrimaryCollectionService::ensureSingle` vira `ensureExactlyOne`: além de rebaixar
  excedentes, promove quando a coleção ficou sem principal. O docblock que declara *"Cliente SEM
  principal é estado válido: o serviço não promove ninguém"* recebe **emenda datada** — a decisão
  mudou em 2026-09-03, e o registro diz por quê. A promoção é `update()` por instância, como o
  rebaixamento, para a auditoria pegar o autor (lei §5.2).
- **D20.** **Endereços herdam a promoção automática, não a recusa de entrada.** O serviço é
  compartilhado, então D18/D19 alcançam `ClientAddress`; D16/D17 ficam só em contatos, porque
  `contacts` é obrigatório (`min:1`, com mensagem própria) e endereço não é. A assimetria é
  deliberada e fica escrita.
- **D21.** A UI **não muda**. Ela já produz exatamente um principal; este bloco só faz o contrato
  dizer o mesmo.

## 7. Prova (DoD comportamental)

Cada veredito prova comportamento contra a API real ou o navegador, não build verde:

1. **D-10** — com role `admin`: `GET /api/roles` responde **403**; `GET /api/roles/assignable`
   responde **200** com `id`/`name` e **sem** `permissions`. Com `superadmin`: `GET /api/roles`
   segue **200** com permissões. `/administracion` abre para admin comum **sem** erro e o select de
   role do form de usuário continua populado.
2. **D-11** — role customizada com `identity.user.create` e **sem** `commercial.client.view`: o
   dropdown de empresa do create de aluno **lista**, e `GET /api/clients` segue **403** para ela.
3. **D-16** — turma concluída sem matrícula aprovada aparece em `concluded_without_issuance` no
   Dashboard, com o rótulo es-CL na tela; `fully_issued` deixa de contá-la; a soma dos baldes
   continua igual ao total de itens do funil.
4. **D-09** — `PUT /api/clients/{id}` com contatos sem principal responde **422** com a frase
   localizada; `DELETE` do contato principal responde **204** e o cliente volta do `GET` com outro
   contato marcado `is_primary`.

**Gate do bloco:** suíte backend verde (a `main` mede 1175 passed / 5 skipped), `pint` nos arquivos
tocados, `php artisan typescript:transform` com `generated.ts` **commitado** e sem diff residual,
`pnpm lint` 0, `pnpm build` e `pnpm test` verdes.

## 8. Fora de escopo (declarado)

- **`D-34`** — o gate RBAC do Dashboard atravessando o seam como `null`. Segue sem hospedeiro; o
  candidato continua sendo o item 9.
- Mover o filtro de `redator` para o backend (D3).
- Validação de endereço no backend — hoje inexistente, e a `D-09` não a pede.
- Qualquer mudança na tela de clientes ou no fluxo de cotação.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Subir o gate de `GET /api/roles` quebrar consumidor não mapeado | `rolesApi` tem três consumidores no front, todos lidos neste design; `ListQueryBudgetTest` e `StaffUserCrudTest` tocam a rota e entram na suíte do gate |
| `ensureExactlyOne` promover em cenário concorrente e duplicar principal | a promoção roda dentro da mesma transação e sob o `Client::lockForWrite()` que as Actions já tomam; a leitura segue `lockForUpdate` |
| Balde novo desalinhar contagem do funil | o teste de exclusividade soma os baldes e compara com o total — é a régua que já existe |
| Recusa nova barrar dado legado sem principal | não há produção; o seeder cria contato principal, e a UI nunca produziu cliente sem principal |
