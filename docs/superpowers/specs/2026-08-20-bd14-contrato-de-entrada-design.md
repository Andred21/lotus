# Design — BD-14 · contrato de entrada: o que o corpo da requisição pode escrever

> Spec do `active_work_item` `bd14-contrato-de-entrada`. Escrita em 2026-08-20, sobre a árvore da
> branch `feat/bd14-contrato-de-entrada`, a partir de `main@0c8db94`. **Sem Context Packet:** o
> escopo é interno ao repositório — `backlog.md` (D-12, D-13), `pendencias/abertas.md` (P-29, P-35) e
> o código. Nenhuma fonte canônica no Drive, Notion ou Figma governa este bloco.

## 1. Fronteira do bloco

Quatro itens, **backend puro**: D-13, D-12, P-29 e P-35.

**A P-03 dispara:** bloco de backend roda no **main tree** (`/home/jvbat/projetos/lotus`), não em
worktree linkada. O `state.md` mostra um único `active_work_item` de backend, então o gatilho formal
da ficha (dois em paralelo) segue sem vencer.

`generated.ts` só regenera se um `rules()` alterar o tipo TS emitido. `prohibited` é regra de
validação, não tipo — a expectativa é **zero diff** em `frontend/src/shared/types/generated.ts`, e a
prova é rodar `typescript:transform` e conferir a árvore limpa, não presumir.

## 2. O que foi medido antes de decidir (contra `0c8db94`)

1. **D-13 — 10 campos, 5 Actions, uma resposta errada repetida.** O idiom
   `instanceof Optional ? null : $x` aparece em `UpdateStaffUserAction:44,53` (`rut`, `phone`),
   `UpdateClientAction:42,48` (`phone`, `business_activity`), `UpdateCourseAction:30,31`
   (`technical_name`, `description`), `UpdateQuoteAction:30,31,32` (`purchase_order`,
   `planned_start_date`, `planned_end_date`) e `UpdateRedatorAction:71` (`phone`).
2. **A mesma pergunta já tem três respostas divergentes no repo.** `UpdateStudentAction:31` preserva
   por ternário; `UpdateProfileAction:23` preserva por `if`; `UpdateRedatorAction:72` preserva
   `is_active` por spread condicional. Nenhuma é fonte da outra.
3. **O SPA nunca omite chave.** `useStaffUserForm:50-51` envia `rut: f.rut || null` e
   `phone: f.phone || null`; `useQuoteForm:58` envia `purchase_order: form.purchase_order ?? null`.
   Limpar um campo pela tela manda `null` **explícito** — preservar na omissão não quebra nenhuma
   tela existente.
4. **`rut` só é `Optional` no staff.** `StudentData:34`, `ClientData:49` e `RedatorData:28` declaram
   `public string $rut` com `required` no `rules()`; só `UserData:36` é `string|Optional|null`.
   O alcance da D-13 sobre RUT é uma Action, não quatro.
5. **D-12 — o silêncio é do construtor promovido.** `UserData:43-45` declara
   `#[Computed] public ?string $photo_url = null`: a promoção desvia do `CannotSetComputedValue`, a
   chave é engolida e a resposta é 200. São 11 DTOs com campo de foto.
6. **A guarda do front é só de desenvolvimento.** O `throw` de `useCrudForm:117-124` está dentro de
   `if (import.meta.env.DEV)` (`:106`). Em produção a chave passaria sem aviso nenhum.
7. **P-29 — o 500 nasce do `default`.** `ProblemDetails:34-36` cai em `[500, 'Erro interno', …]` para
   `QueryException`; violação de índice único vira 500 mascarado.
8. **P-35 — o precedente da simetria já existe escrito.** `CreateCertificateTemplateAction:34-41`
   grava `version` por atribuição explícita com o campo fora do `$fillable`, e o docblock dele
   (`:19-27`) cita `seq_in_budget` como a forma que copiou. `Quote:32` mantém `seq_in_budget` no
   `$fillable` e `CreateQuoteAction:30` o grava por mass assignment.

## 3. Decisões

| # | Decisão | Escolha | Descartado |
|---|---|---|---|
| D1 | Contrato da omissão (D-13) | **omissão preserva** o valor guardado; `null` explícito é o único jeito de apagar | `PUT` exigir a chave (`present`, 422 na omissão); política mista campo a campo |
| D2 | Onde a tradução `Optional` → atributo mora | helper em `App\Shared\Data`, chamado explicitamente pelas Actions | `toWritable()` num `Data` base (o DTO passaria a saber de coluna: `role`, `course_ids`, `templates`, `files` não são); inline nos 10 sítios, sem dono |
| D3 | Chave `#[Computed]` no corpo (D-12) | **422** por `prohibited` no `rules()` dos DTOs de entrada, a partir de lista única; arch test cobre os de saída | seguir ignorada com teste de guarda; adiar a D-12 para outro bloco |
| D4 | Colisão de índice único (P-29) | traduzir SQLSTATE 23000 de `users` em `ValidationException` do campo, na porta única (`UserProvisioner`) | mapear todo 23000 no `ProblemDetails` global (mensagem genérica e 422 onde FK/check é erro de programação); deixar a ficha aberta |
| D5 | Simetria do ADR-17 (P-35) | `seq_in_budget` sai do `$fillable`; `CreateQuoteAction` escreve por atribuição explícita | deixar a assimetria e a ficha aberta pela terceira vez |

**Derivadas** (consequência das cinco, não escolha nova):

| # | Derivada |
|---|---|
| D1a | As três grafias divergentes convergem para o helper da D2 — `UpdateProfileAction:23` e o spread de `is_active` em `UpdateRedatorAction:72` deixam de ser forma própria; `UpdateStudentAction:31` passa a responder pela fonte única, sem mudar de comportamento |
| D1b | `password` (`UpdateStaffUserAction:57`) **não** entra no helper: `''` também significa "mantém", e isso é regra de senha, não de omissão. Fica com o `if` próprio, com o porquê no comentário |
| D1c | `rut` omitido no staff chama `ensureIdentityAvailable(null, …)` — pula só a checagem de RUT, e-mail segue checado —, e a chave não entra no array de escrita |
| D4a | A detecção de coluna cobre **as duas grafias de driver**: sqlite (`UNIQUE constraint failed: users.email`) e MySQL (`Duplicate entry … for key 'users_email_unique'`). A suíte roda em sqlite e produção é MySQL; sem as duas, o 422 nasce verde no teste e volta a 500 no cliente |
| D4b | O caminho de create já escreve **dentro** do provisioner (`provision():33`) e fica coberto por dentro; os updates envolvem a própria escrita na chamada explícita |
| D5a | `$auditInclude` de `Quote` mantém `seq_in_budget` — sair do `$fillable` não tira da auditoria (ADR-08 intacto) |

## 4. Componentes

**`App\Shared\Data\WritableAttributes`** — `from(array $attrs): array` descarta as chaves cujo valor
é instância de `Optional` e deixa passar o resto, `null` incluído. Um docblock, uma lei, um lugar.

**`App\Shared\Data\ComputedFields`** — devolve as regras `prohibited` das chaves computadas a partir
de uma lista única, para o `rules()` dos DTOs de entrada com foto não divergir por cópia.

**`UserProvisioner`** — além da porta única de checagem que já existe (`ensureIdentityAvailable`),
passa a ser a porta única da **tradução** de violação de índice de `users` em erro de validação por
campo. As Actions envolvem a própria escrita por ela.

**`Quote` + `CreateQuoteAction`** — `seq_in_budget` fora do `$fillable`, escrita explícita sob o
`lockForUpdate` que já existe.

## 5. Definition of Done — comportamento, não arquivo novo

1. Para **cada um dos 10 campos** das 5 Actions, o `PUT` que **omite** a chave mantém o valor
   guardado, provado por HTTP — `phone` no staff, cliente e redator; `business_activity` no cliente;
   `technical_name` e `description` no curso; `purchase_order`, `planned_start_date` e
   `planned_end_date` na cotação; `rut` no staff (item 2). O mesmo `PUT` com a chave em `null`
   continua apagando. O par (omite × manda `null`) é o teste — só o segundo ramo deixaria a
   regressão passar verde.
2. `PUT /api/users/{id}` que omite `rut` mantém o RUT do usuário. É a medição original da D-13.
3. `PUT` com `photo_url` no corpo devolve **422** nos DTOs de entrada com foto — hoje devolve 200 e
   engole. Arch test prova `#[Computed]` nos 11 campos e a regra nos de entrada.
4. Violação de índice único de `users` devolve **422 com o campo nomeado** (`rut` ou `email`),
   provada nas duas grafias de driver.
5. `seq_in_budget` enviado no payload de criação de cotação **não** vence a derivação sob lock, e a
   numeração por orçamento segue 1, 2, 3.

## 6. Riscos e limites declarados

- **Nenhuma lei do §5 é tocada.** Sem Repository, auditoria segue na aplicação, `generated.ts` não é
  editado à mão, Sanctum intacto, RN-01 intacta.
- **P-50:** a suíte unida estoura o `memory_limit` de 128M do container; se acontecer, rodar por
  diretório e declarar isso no fechamento.
- **A D-12 muda contrato de resposta** de 200 para 422 em payload que hoje passa. O risco real é
  cliente de API fora do SPA — não existe hoje —, e a guarda de DEV do front impede que um payload
  novo com a chave nasça sem estourar em desenvolvimento.
- **O que este bloco NÃO faz:** não localiza o envelope RFC 7807 (D-36, decisão que espera a D-07) e
  não toca `CreateQuoteAction` além do `seq_in_budget`.
