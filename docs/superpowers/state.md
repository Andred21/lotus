---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: usecrudform-mais-fundo
state_basis_commit: f766860
updated_at: 2026-08-13T21:30:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Último item fechado — 2026-08-13 (`usecrudform-mais-fundo`, BD-5)

### Seleção — 2026-08-13

**BD-5 do `backlog.md:131`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre (BD-1, BD-2,
BD-7, BD-8, BD-9): o argumento era **título de seção**, não slug promovido. As três decisões dele
fecharam o gate: o slug `usecrudform-mais-fundo`; **rota direta a `ready_for_planning` sem Context
Packet**; e **main tree `/home/jvbat/projetos/lotus`, sem worktree**, na branch
`feat/usecrudform-mais-fundo` criada de `d0cc270`.

**A ausência de fonte externa foi medida, não presumida:** grep por `drive.google`, `notion.so`,
`figma.com`, `docs.google` e `http` nas 22 linhas do BD-5 devolve **zero ocorrência**. As fontes são
o repositório e o próprio texto do backlog, que já traz paths e IDs (`Q-4` dos achados de
2026-08-05, o débito do trio da foto, os 4 hooks fora do `useCrudForm`).

**O main tree venceu a worktree por causa do DoD, não por costume.** O BD-5 é frontend por escopo de
escrita, mas o DoD escrito é **foto real chegando no S3** — exige `app` + MinIO de pé, e é o main
tree que serve o `:8080`. No BD-4 a worktree não pôde subir stack própria (P-03) e **dois passos do
gate ficaram sem prova**; aqui o custo foi antecipado em vez de pago. **Esta decisão caiu horas
depois — ver §"Divergência de estado" abaixo.**

**`state_basis_commit` passa de `7c28699` a `d0cc270`** — o fechamento do BD-4 registrou o merge do
PR #46, que é o HEAD atual da `main`. Não era divergência: com `active_work_item` `null` não havia
trabalho ativo cujo baseline pudesse ter derivado.

### Divergência de estado — 2026-08-13: dois `active_work_item` promovidos em paralelo

A invariante "existe no máximo um `active_work_item`" **quebrou**, e não foi resolvida por
heurística. Duas sessões promoveram itens distintos **a partir do mesmo `d0cc270`**, no mesmo
repositório: `5bf54f3` (12:32, este bloco, branch `feat/usecrudform-mais-fundo`) e `0e3ce3b` (13:05,
`login-fora-do-adr16`, branch `feat/login-fora-do-adr16`) — a segunda **não** descende da primeira.
Cada branch ficou com um `state.md` afirmando que o item ativo é o outro. Precedente exato: os dois
`ready_for_closure` de 2026-08-10, também resolvidos por decisão do João.

**O que a sessão paralela mudou de fato:** o main tree `/home/jvbat/projetos/lotus` passou à branch
de login, e a worktree `fix-frontend` foi movida do detached HEAD para
`feat/usecrudform-mais-fundo`. **Nada foi perdido e nada alheio foi tocado:** `5bf54f3` sobrevive, a
spec deste bloco foi preservada e movida para a worktree antes de qualquer commit — ela chegou a ser
escrita dentro do main tree, que naquele momento já servia a branch alheia —, e o main tree ficou
limpo.

**Decisão do João (D6): as duas execuções correm em paralelo** — o BD-5 na worktree `fix-frontend`,
o `login-fora-do-adr16` no main tree `lotus`. A invariante fica com **exceção declarada, não
resolvida**, e o custo do precedente BD-4 × BD-9 é **aceito de antemão** em vez de descoberto no
merge: os `state.md` conflitam, e `backlog.md`/`pendencias.md` auto-mesclam sem sobreposição textual,
que é exatamente como uma afirmação vencida passou verde naquele bloco. Recusadas: pausar o BD-5, e
o login ceder a vez.

**Consequência: a D3 do gate caiu, e um grau pior do que no BD-4.** O bloco perde o main tree como
área de trabalho e passa a usá-lo **só como servidor** do `:8080` para o e2e do S3 — exatamente o
custo que a escolha original existia para evitar. E lá não há uma branch parada, e sim **execução
ativa**: a prova do DoD só vale com `git diff main...HEAD -- backend/` **vazio** naquele tree,
conferido **no momento da prova**, não no início do bloco. O banco de dev também é compartilhado
pelas duas execuções. É a **P-03** aparecendo pela segunda vez seguida num bloco de frontend.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/archive/2026-08-13-usecrudform-mais-fundo-design.md`, com **seis decisões**
(D1–D6), cada uma escolhida pelo João entre alternativas apresentadas com o custo medido.

**O terreno foi medido antes de desenhar, e quatro afirmações do backlog não sobreviveram:**

1. **`useQuoteForm` não é candidato legítimo** — reprova pelo mesmo critério que exclui o
   `useTurmaConfigForm`. `useCreateQuote` recebe `{ budgetId, payload }` e `useUpdateQuote`
   `{ quoteId, payload }`, então não satisfaz `MutableResource`; a cotação nasce em rota aninhada. E
   as outras duas razões que o `backlog.md:304-306` dá para ele também são falsas: **não** manipula
   coleção nested (sete escalares, sem "itens da cotação") e **não** usa `setForm`.
2. **A absorção do trio não cabe inteira no `useCrudForm`** — metade é JSX, e o quarto diálogo não
   roda sobre o hook (`useRedatorForm` usa `useEntityForm` direto). Absorver só no hook cobre 3 de 4.
   O bloco JSX, esse sim, é idêntico **byte a byte nos quatro** sítios.
3. **`useCourseForm` cabe, mas só com o hook mais fundo de verdade:** `createdIdRef` (não recriar
   curso quando a segunda chamada falha), `pending` de três mutações, `fieldErrors` de três fontes.
4. **O texto do Q-4 está impreciso** — o `SignedUrlTransformer` roda na serialização, então o front
   recebe URL pré-assinada, não "um caminho interno de storage". O defeito real é outro e continua
   valendo: `PUT` com `photo_url` devolve **200**, porque a promoção no construtor desvia do
   `CannotSetComputedValue`.

**Dois fatos mediram o desenho em vez de o justificarem depois:** a guarda de classificação que já
existe **barra o `...form` ingênuo** (reprovaria com "chave de payload sem classificação:
`photo_url`") — o buraco do Q-4 é quem **classifica** a chave e passa, e é esse o buraco que a D4
fecha; e `StaffUserDialog` está em **150 linhas, margem zero** na régua, então a absorção é o que lhe
devolve folga.

**As decisões que mudam trabalho:** só `useCourseForm` migra (D1); a absorção mora em dois sítios,
`useCrudForm` com `photo` e um `FormPhotoRow` novo em `shared/ui` (D2); o `afterCreate` vira
**retentável**, com o `submit` pulando o create no resubmit, e `createdIdRef` morre (D3); a guarda do
Q-4 é chave proibida no payload, que **nenhuma classificação salva** (D4); e o hook devolve `busy`
derivado, sem contaminar `pending` — somar `photo.pending` faria o botão de salvar girar por upload
de foto, que é a crítica Q-7 do bloco de documentos oficiais (D5).

**Baseline medido, não herdado:** `pnpm test` = **29 arquivos / 143 testes**, exit 0 — bate com o
gate pós-merge, sem deriva.

**Risco de review BAIXO** pelo gate binário: zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal; `executor: claude`. O risco próprio é de **alcance** e está
declarado: `useCrudForm` tem cinco consumidores e o `submit` muda para todos — a rede é que
`photo.flush` não lança, mas isso é premissa a provar, não a assumir.

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec com uma correção — a D6 — e o restante sem mudança.** O plano saiu em
`docs/superpowers/plans/archive/2026-08-13-usecrudform-mais-fundo.md`: **onze tasks**, uma por commit, na
ordem guarda do Q-4 → mutações extras → `afterCreate` retentável → composição da foto → componente
de `shared/ui` → os três diálogos que migram → Redator → curso → gate.

**Baseline medido em `4284ff7`, não herdado:** `pnpm test` = **29 arquivos / 143 testes**, lint exit
0, build verde. Projeção do plano: **31 arquivos / 156 testes** (2 arquivos e 13 casos).

**Um desvio apareceu só ao escrever o plano, e ele muda o construído (D-P1).** A D2 diz
"`useCrudForm` ganha `photo`", e isso é **impossível na forma literal** — por regra do React, não por
gosto: `useEntityPhoto` chama `useQueryClient`, `useState`, `useEffect` e dois `useMutation`.
Montá-lo condicionalmente violaria as regras dos hooks; montá-lo sempre faria `useQueryClient()`
lançar `No QueryClient set` nos oito testes atuais de `useCrudForm.test.ts`, que rodam **sem**
`QueryClientProvider` de propósito — o `fakeResource` é literal estrutural, e é isso que mantém
aquele arquivo sem TanStack. A capacidade nasce como hook **irmão**, `useCrudFormWithPhoto`, que
compõe os dois na ordem certa. O efeito para os três diálogos é o que a D2 pede: o `afterCreate` de
foto some do sítio de chamada, e `photo`/`busy` chegam prontos. `useBudgetForm` e `useRoleForm`, sem
foto, seguem no `useCrudForm` puro.

**Duas outras coisas que a escrita do plano fixou:** a guarda do Q-4 roda **antes** da checagem de
classificação contraditória, para que a chave proibida ganhe a mensagem certa mesmo quando também
estiver duplamente classificada; e a sonda que a prova tem de ser feita no `useClientForm`, não no
`useStudentForm` — `StudentFormFields` não tem `photo_url`, então `...form` lá reprova no `tsc`, que
é o vermelho errado.

**Uma divergência de projeção ficou declarada em vez de corrigida retroativamente:** a spec projeta o
`useCourseForm` em ~110 linhas e o plano em ~115, pela diferença do docblock do `afterCreate`, que
não existia quando a spec foi escrita.

`executor: claude`, sem `paths_autorizados`: o bloco muda o `submit` de um hook com **cinco**
consumidores, decide apresentação em quatro telas, tem na Task 10 um julgamento que só aparece
rodando (o `crud.form` lido dentro do `afterCreate`), e fecha por prova contra API real num ambiente
compartilhado com outra execução ativa.

**Estado: `ready_for_execution`.** `/executar-bloco usecrudform-mais-fundo` exige instrução posterior
do João.

### Execução — 2026-08-13: início

`/executar-bloco usecrudform-mais-fundo` validou as âncoras (spec, plano, `context_packet` `null`
coerente, Git limpo em `f9e1263`, sem divergência) e confirmou o gate main tree/worktree já resolvido
pela D6: bloco frontend-only, worktree `/home/jvbat/projetos/fix-frontend` na branch
`feat/usecrudform-mais-fundo` é o isolamento certo — o main tree segue com a execução paralela do
`login-fora-do-adr16` (D6), sem escrita nenhuma aqui.

**Mesmo conflito do `catraca-max-lines-e-moldura` (BD-4) reapareceu, e foi resolvido do mesmo jeito:**
o plano recomenda `subagent-driven-development` (Handoff: `executor: claude`, sem
`paths_autorizados` — cinco consumidores do `submit`, apresentação em quatro telas, julgamento em
runtime na Task 10); a sessão tem regra de não chamar o Agent tool sem pedido. Escalado ao João via
pergunta direta — **subagent-driven-development, com Agent tool autorizado para este bloco.**

**Pre-flight scan do plano (onze tasks contra Global Constraints e a spec) achou um ponteiro
fantasma:** o comentário previsto para `useCrudForm.ts` na Task 3 citava `(spec D10)`, herdado
verbatim do plano arquivado `2026-08-05-profundidade-form-crud-e-hidratacao-dto` — cuja spec tem D10
("o id do update vem da entidade"); a spec deste bloco só tem D1–D6. Mesma classe da Q-4 do review do
BD-4 e da correção da Task 9 dele, um passo antes: pego no pre-flight, não no review. João escolheu
tirar a citação em vez de reescrevê-la ou deixar como está. Corrigido no plano em `0ef104f`, antes de
qualquer código.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do BD-4, já fechado — as
onze tasks deste bloco colidiriam de nome com as dez dele; arquivado em
`.superpowers/sdd/archive/catraca-max-lines-e-moldura/`).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

**As onze tasks fecharam, cada uma em commit próprio, revisão individual aprovada antes de avançar:**
`6ff9565` (T1 — guarda Q-4, sonda real em `useClientForm.ts` provando os dois sentidos), `67153e5`
(T2 — `extra` soma pending/erro de mutações extras), `dce04ef` (T3 — `afterCreate` retentável via
`createdRef`, curso/entidade não nasce duas vezes no resubmit), `fc88d61` (T4 —
`useCrudFormWithPhoto`, hook-irmão por regra de hooks do React, desvio D-P1 declarado na spec),
`7815152` (T5 — `FormPhotoRow`, extração byte a byte conferida contra os 4 sítios originais),
`2d82018`/`5c8dff0`/`69dcba0` (T6/7/8 — Student/Client/StaffUser perdem o trio, `StaffUserDialog`
saiu de exatamente 150 para 125 linhas), `4b998d0` (T9 — Redator adota só o `FormPhotoRow`,
`useRedatorForm` explicitamente não migra por ser create multipart, comentário do ponteiro do BD-5
corrigido), `023be10` (T10 — `useCourseForm` migra para `useCrudForm`, `createdIdRef` morto, task de
maior peso legal do bloco: guarda anti-duplicação de curso provada por leitura direta do mecanismo,
não só pelo relatório do implementador). Um commit fora de task, entre T3 e T4: `ae86d0a`, corrigindo
type errors residuais que T2 e T3 deixaram passar porque `vitest run` não faz type-check completo —
lição registrada no ledger para não repetir. Task 11 foi gate — verificação pura, **sem commit de
produção**, relatório em `.superpowers/sdd/task-11-report.md` (local, não versionado). Contagem
final: frontend **31 arquivos / 156 testes** (29/143 no baseline), bate exatamente com a projeção do
plano.

**O DoD 1 (foto real no S3) foi provado nos dois caminhos contra a API real do main tree**, sessão
Sanctum de verdade (`admin@lotus.cl`, cookie + CSRF): `create` (aluno novo) e `edit` (aluno
existente), com `Content-Length` de 68 bytes confirmado via GET na signed URL nos dois casos — não a
falha de zero-byte da lição 6. Registros de teste limpos por `DELETE .../photo` (remove do S3) e
`forceDelete` via tinker, molde do BD-2; `audits` remanescente declarado, não limpo.

**Duas divergências do texto do plano, investigadas e explicadas, nenhuma achado de código:** os
greps de verificação (Tasks 9, 10 e 11) esperavam `ZERO` para padrões que sobrevivem de propósito em
`RedatorDialog.tsx` (hook que não migra, por critério) e num comentário documental de
`useCrudForm.ts` — o texto do plano não previu esses hits legítimos; e o curl de exemplo da Task 11
sem `Accept: application/json` cai num 500 (`Route [login] not defined`, o app não tem rota web de
login por RN-01) em vez do 401 esperado — o client axios real sempre manda esse header, então isso
nunca acontece em produção.

**O que o bloco NÃO provou, sem maquiagem:** nenhum diálogo tem teste de componente — a composição
`FormPhotoRow` + diálogo (Tasks 6-9) não é exercitada por teste automatizado, só os hooks; a Step 6 do
gate proveu o fluxo de foto contra a API direto, não através do `AppPhotoField`/`FormPhotoRow`
renderizado; e `/lotus-ui-review` não rodou — os quatro diálogos migrados nunca foram vistos no
navegador nesta execução.

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona a
revisão do trabalho ativo.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 1 achado

**BAIXO pelo gate binário da skill, confirmado, não herdado da spec:** zero schema, `generated.ts`,
Sanctum, auditoria, RBAC, dinheiro escrito ou documento legal gerado; `executor: claude`. Só lente
Claude, sem Codex.

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **31 arquivos / 156 testes** — bate exato com a projeção do plano.
`git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts` devolve
**zero linha**. Os seis arquivos-alvo (`StaffUserDialog`, `StudentDialog`, `ClientDialog`,
`RedatorDialog`, `RedatorUserSection`, `useCourseForm.ts`) pousaram em
**125 / 97 / 97 / 127 / 40 / 129** linhas, todos com folga da régua de 150.

**Órfãos: zero.** `FormPhotoRow` em 7 arquivos (4 consumidores + componente + 2 barrels),
`useCrudFormWithPhoto` em 6 (3 hooks + hook + teste + barrel), conferido por grep.

**O trio morreu nos três que migraram, sobrevive no quarto por critério:**
`closeBlocked={pending || photo.pending}` tem **uma** ocorrência, em `RedatorDialog.tsx:70` — o hook
do redator não migra (multipart, fora de escopo por D2), exatamente o esperado pela Task 9 Step 4.
`createdIdRef` só sobrevive em comentário documental de `useCrudForm.ts:148`, citando o mecanismo que
substituiu — mesma classe de hit legítimo já registrada no fechamento do BD-4.

**As extrações foram conferidas contra o diff, não presumidas:** os quatro sítios do `FormPhotoRow`
e as três migrações para `useCrudFormWithPhoto` batem com a Task 5/6/7/8 do plano, byte a byte no
JSX. `useCourseForm.ts` bate com a Task 10: `createdIdRef` morto, `sync.mutateAsync` dentro do
`afterCreate`, `extra: [sync]` somando `pending`/`fieldErrors`, `crud.form.redator_ids` lido no
momento da chamada (fechamento correto, não capturado cedo — sem o desvio do `useRef` que a Task 10
previu como contingência).

**O único achado:**

1. **Q-1 🟡 P** — `useCrudForm.ts:159-165`, `runAfterCreate`:
   ```ts
   async function runAfterCreate(created: T) {
     try {
       await afterCreate?.(created)
     } catch {
       return
     }
     onDone()
   }
   ```
   O `catch` engole **qualquer** erro de `afterCreate`, sem log nenhum. O próprio docblock admite a
   premissa: "o erro já está no `fieldErrors` da mutação que falhou" — mas isso é contrato do
   chamador, não garantido pelo tipo de `afterCreate?: (created: T) => void | Promise<void>`. Hoje a
   premissa se sustenta nos 3 caminhos que alcançam este código (`photo.flush` não lança de
   propósito; `useCourseForm.sync` está em `extra`, rastreado). Mas o hook é `shared/hooks`, tem
   **5 consumidores**, mexe em registros de peso legal (curso, cliente, aluno) — se um consumidor
   futuro (ou uma falha do próprio `sync`/`afterCreate` fora do que `extra` cobre) lançar algo não
   rastreado, o diálogo trava aberto sem nenhuma mensagem visível e sem rastro de console. É a classe
   "vazio silencioso" que o projeto já pagou caro (lição 6; Q-1 do review do BD-4,
   `RedatorDocumentsSection.tsx` com `removeDoc.error` nunca lido). Não registrado em nenhuma spec,
   plano ou pendência como debt aceito. Sênior faria: `console.error` no branch do catch, sinal
   mínimo de dev quando a premissa falhar. **Fere:** catálogo universal (catch vazio).

**O que NÃO virou achado, e por quê:** ausência de teste de componente para a composição
`FormPhotoRow` + diálogo, e `/lotus-ui-review` não executado — ambos já declarados como débito
explícito no fechamento da execução (§"O que o bloco NÃO provou"), não achado novo.

**Veredito: o bloco está bom.** Onze commits, cada um batendo com a task correspondente do plano,
nenhuma extração divergiu do original, nenhum órfão. O achado único é de robustez de mecanismo
genérico, não correção ativa — nenhum dos 5 consumidores atuais o alcança hoje.

**Q-1 aprovado e corrigido — commit `f766860`.** `console.error` no branch do catch de
`runAfterCreate`, sinal mínimo de dev quando a premissa do `fieldErrors` falhar. Gate reproduzido
pós-fix: lint 0, build verde, 31 arquivos / 156 testes — sem mudança de contagem.

**Estado: `ready_for_closure`.**

### Fechamento — 2026-08-13

A árvore já estava limpa em `f766860` (a correção do Q-1 entrou commitada), que segue como
`state_basis_commit` — nada pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real, não herdado do relatório de execução nem do review.** A
D6 exigia que a parificação da stack fosse conferida **no momento da prova**, e foi: o main tree
`/home/jvbat/projetos/lotus` está na branch alheia `feat/login-fora-do-adr16`, e
`git diff main...HEAD -- backend/` lá devolve **zero linha** — o `:8080` serve o mesmo backend que a
`main`, então a medição é desta stack e não de outra. `/api/students` sem cookie devolve **401**.
Com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois lados), os **dois caminhos** do
DoD 1 foram provados: **`create`** (aluno novo, id 58, foto subida contra o id devolvido — o que o
`flush` faz) e **`edit`** (aluno pré-existente, id 37), ambos com `POST .../photo` **204** e
`photo_url` não nulo na leitura seguinte. **A prova não parou no 200:** o GET na signed URL devolveu
`http=200 bytes=70 type=image/png` nos dois, que é a falha de zero byte da lição 6 medida em vez de
assumida; os objetos existem em `/data/lotus/user-photos/49` e `/91` no MinIO.

**Limpeza declarada, não maquiada:** `DELETE .../photo` nos dois (o aluno 37 volta a
`photo_url: null`, exatamente como estava antes da sonda, e os dois objetos somem do MinIO), e o
aluno 58 mais o user 91 saíram por `forceDelete` via tinker, com a linha de `student_client_logs`
antes. Restam **7 linhas de `audits`** apontando para ids que não existem mais — declaradas, não
limpas, molde do BD-2.

**O resíduo de backend do Q-4 foi medido no próprio fechamento, e continua vivo:**
`PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo devolve **200**, e o campo
volta `null` na resposta — a promoção no construtor do DTO desvia do `CannotSetComputedValue`, então
chave `#[Computed]` no corpo é ignorada **sem 422**. O BD-5 era frontend-only por escopo declarado e
fechou só a metade dele (`FORBIDDEN_PAYLOAD_KEYS` faz a chave lançar em DEV); a outra metade virou
linha própria em `## Débitos técnicos`, com saída no próximo bloco de backend que tocar DTO com campo
computado. Medido em `StudentData`, não no `ClientData` que o texto original do Q-4 nomeava — a
promoção é a mesma nos quatro DTOs com foto, e a sonda escolheu o alvo sem coleção nested para não
arriscar dado de seed.

**A régua foi provada nos dois sentidos (lição 10), não herdada do review:** 30 linhas em branco
apensadas ao `StaffUserDialog` fazem o lint reprovar com
`File has too many lines (155). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **31 arquivos / 156 testes**. Alvos
em **125 / 97 / 97 / 127 / 129** linhas, todos sob 150. Órfãos zero (`FormPhotoRow` em 7 arquivos,
`useCrudFormWithPhoto` em 6). Leis §5 limpas por grep: zero `primereact` em `features/`, zero import
cross-feature, `generated.ts` sem diff. **Pint e `typescript:transform` são N/A por escopo medido:**
`git diff main...HEAD` de `backend/` e de `generated.ts` devolve zero arquivo, e o diff do bloco não
tem um `.php`. A suíte backend **rodou** — **591 passed, 5 skipped (2149 assertions)** — mas mede o
código da `main`, porque o container monta o main tree; é evidência de que nada quebrou, não prova
deste bloco.

**Pendências: nenhum gatilho venceu, nenhuma fechou, nenhuma nasceu.** A **P-03** ganhou uma
**contraprova** em vez de mais uma cobrança: o arranjo é o mesmo do BD-4 — duas execuções em
paralelo, worktree sem stack própria, dependendo do main tree —, e desta vez o e2e rodou **inteiro**,
porque a branch alheia não tocou `backend/`. O custo da falta de compose por worktree não é
constante; é contingente ao que a outra branch toca, e por isso a conferência tem de ser feita na
hora da prova. A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera bloco que toque o shell, e
`src/app/` não aparece no diff.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec não
é compartilhada por nenhum item futuro), com o ponteiro da §Spec do próprio plano e os dois desta
narrativa atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Hardening · revisão UI/UX assistida por navegador` (2026-08-10) para o `progress-archive.md`
**verbatim**, como o cabeçalho de lá manda. Do `backlog.md` saíram o **BD-5** e os **dois débitos que
ele cobriu por inteiro** — a absorção do trio da foto nos 4 diálogos e os 4 hooks fora do
`useCrudForm`, cada um com o critério agora decidido, inclusive o `useQuoteForm` que o bloco provou
**não** ser candidato legítimo. **Nada foi promovido:** a fila de dívida fica com o `BD-6` sozinho, e
o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** **`/lotus-ui-review` segue não executado** — os
quatro diálogos migrados nunca foram vistos renderizados nesta execução, então a composição
`FormPhotoRow` + diálogo na tela continua sem checagem visual; e **nenhum diálogo tem teste de
componente**, então o e2e do S3 bateu na API direto, não através do `AppPhotoField`/`FormPhotoRow`
renderizado. Os dois já estavam declarados no fechamento da execução e continuam abertos como débito
escrito, não como omissão. **Uma divergência de projeção fica declarada em vez de corrigida
retroativamente** (precedente da P-27): a spec projetou `useCourseForm` em ~110 linhas e o plano em
~115; o entregue tem **129**.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Penúltimo item fechado — 2026-08-13 (`catraca-max-lines-e-moldura`, BD-4)

### Seleção — 2026-08-13

**BD-4 do `backlog.md:127`, promovido explicitamente pelo João** com o estado em `idle` e
`active_work_item` `null`. O gate do `/planejar-bloco` não promove; as três decisões dele fecharam o
gate: o slug `catraca-max-lines-e-moldura` (mesmo da branch já criada), **rota direta a
`ready_for_planning` sem Context Packet** por ausência medida de fonte externa, e a worktree
`/home/jvbat/projetos/fix-frontend` seguindo — bloco **frontend puro**, a P-03 não dispara.

A branch `feat/catraca-max-lines-e-moldura` já existia em `0c2a24b`, **com zero commit sobre a
`main`** e árvore limpa; isso não era divergência de estado, e `0c2a24b` passa a ser o
`state_basis_commit`.

### O terreno foi medido antes de desenhar, e achou cinco divergências

Medição de 2026-08-13 sobre `0c2a24b`, por workflow de 9 agentes lançado antes do `/clear`.
**Três dos quatro números da catraca estavam vencidos** — `StudentDialog` 281 (o backlog diz 283),
`RedatorDialog` 206 (diz 199), `BudgetDetailPage` 187 (diz 171); só `RedatorDocumentSlot` (175)
bate. Déficit real: **249 linhas a extrair**.

**A premissa do bloco é falsa:** ele não existe por causa do modo leitura do BD-3 — o BD-3 tocou o
`StudentDialog` num único commit (`dfc3f4b`) com saldo **−2 linhas**, e os dois blocos grandes vêm de
`501b731` (2026-08-05). **A justificativa da ordem também:** a adoção da moldura não tira linha de
diálogo nenhum, e as duas tabelas não estão na catraca.

**O DoD escrito não era provável:** não existe regra de validação de `phone` em nenhum DTO de
`Identity` (zero `Max(` na pasta; coluna `varchar(30)` sem unique; nenhum teste assere 422 em phone).

**Os dois diálogos do item (c) não são o mesmo caso:** `useStudentForm` roda sobre `useCrudForm` e já
entrega `errorSummary` pronto; `useRedatorForm` não usa `useCrudForm` e não tem o que espalhar.

E o ponteiro `FormErrorSummary.tsx:62-67`, citado 4× em doc normativo, **apontava para arquivo que não
existia** — o componente é export nomeado em `FormField.tsx`, e as linhas 62-67 de lá são do
`NestedField`, não do `FormErrorSummary` (que vive em `FormField.tsx:79-107`). Corrigido na Task 9
do BD-4 (2026-08-13): as citações vivas passaram a apontar para o destino real.

### Brainstorming e spec — 2026-08-13

Nove decisões do João (D1–D9), registradas na spec
`docs/superpowers/specs/archive/2026-08-13-catraca-max-lines-e-moldura-design.md`. As que mudam trabalho:
o 422 de `phone` provado por **request forjado** (backend intocado); o resumo do redator com `mapped`
**literal**, sem migrar o hook (o BD-5 já o excluiu por critério); o campo de cliente do
`StudentDialog` **colapsado** no molde do `BudgetDialog`, pagando a quarta grafia do débito BD-3 §4;
`useStudentDetail` **ficando no pai** para preservar a rede; **dois** arquivos novos no par do
redator; UI-01, os dois `<p>` e o `sp` morto **entrando**; overlays em vez dos ramos de estado no
`BudgetDetailPage`; o critério de CTA da moldura **vencendo** na `BudgetsTable`; e a rule reescrita
no mesmo commit que esvazia o `ignores`. Ordem escolhida: **catraca primeiro, moldura por último**.

**Uma conta apresentada no brainstorming estava errada e foi corrigida antes da spec:** o colapso do
campo de cliente não corta ~46 linhas, corta ~9 — `FormField` em modo leitura troca os **filhos
inteiros** (`readOnly ? <ReadOnlyValue/> : children`), então as 28 linhas de dica são create-only e
ficam, e o aviso `clientLocked` do modo edit **sumiria** se não saísse para fora do campo. Com a
conta certa, o corte do bloco de view sozinho deixaria o arquivo em 156 — acima da régua —, e por
isso o desenho extrai **dois** blocos do `StudentDialog` e **duas** seções do `RedatorDialog`.

**Risco de review declarado MÉDIO** na spec (§9), contra o BAIXO do gate binário da skill —
divergência declarada, sem conflito. O risco próprio é de alcance (`shared/ui` alcança 4 consumidores
fora do bloco; a moldura passa a servir 8 tabelas) e de margem (`BudgetDetailPage` pousa com folga
de ~5 linhas).

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-catraca-max-lines-e-moldura.md`: **dez tasks**, uma por commit, na
ordem testes do resumo → `StudentDialog` → slot → `RedatorDialog` → `BudgetDetailPage` (que **zera o
`ignores`** e reescreve a rule) → UI-01 → `BudgetsTable` → `TurmasTable` → docs → gate.

**Baseline medido, não herdado:** `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` = **28
arquivos / 138 testes** — o número registrado neste arquivo até agora (27/131) estava vencido.
Projeção do plano: **29 arquivos / 142 testes** (3 casos do `FormErrorSummary`, 1 arquivo e 1 caso do
`AppFileRow`).

**Três coisas apareceram só ao escrever o plano, e duas mudam trabalho:**

1. **O `BudgetDetailPage` fica mais barato do que a spec projetou.** Os quatro overlays consomem o
   objeto `d` (`useBudgetDetail`) **inteiro**, que a página já tem, então a chamada de volta é de uma
   linha e `formatUf`/`AppCardTone` também ficam órfãos: **~136**, não ~145. A contingência da spec
   (extrair a prop `actions` do `DetailHeader`) vira reserva.
2. **O rótulo do modo leitura do campo de cliente precisa vir do pai.** Hoje o texto é
   `student?.current_client_name ?? t("student.noClient")` — se o filho derivasse o rótulo do
   `options`, view/edit cairia no travessão do `ReadOnlyValue`, que é o default certo para vazio e
   **não** é o texto atual. O filho recebe `readOnlyLabel` pronto e não conhece `StudentData`.
3. **Os testes novos do `FormErrorSummary` nascem verdes**, porque afirmam comportamento que já
   existe — então a Task 1 tem passo de sonda: com o filtro de `mapped` desligado à mão, o caso "não
   repete a chave que já aparece no campo" tem de reprovar, e a árvore volta limpa em seguida.

`executor: claude`, sem `paths_autorizados`: o bloco decide apresentação em vários sítios, atravessa
a lei §5.6 e mexe no `eslint.config.js`, onde bloco no lugar errado apaga seletor existente em
silêncio (Q-2 de 2026-08-04, reincidente no BD-3); a Task 5 ainda reescreve rule normativa.

**Estado: `ready_for_execution`.** `/executar-bloco catraca-max-lines-e-moldura` exige instrução
posterior do João.

### Execução — 2026-08-13: início

`/executar-bloco catraca-max-lines-e-moldura` validou as âncoras (spec, plano, `context_packet`
`null` coerente, Git limpo em `671bc94`, sem divergência) e abriu o gate main tree/worktree: bloco
frontend puro, `using-git-worktrees` normal — a worktree `/home/jvbat/projetos/fix-frontend` na
branch `feat/catraca-max-lines-e-moldura` já era o isolamento certo, sem criar nova.

**Mesmo conflito do `rastro-unicidade-e-gates` reapareceu, e foi resolvido do mesmo jeito:** o
plano recomenda `subagent-driven-development`; a sessão tem regra de não chamar o Agent tool sem
pedido. Escalado ao João via pergunta direta — **subagent-driven-development**, com Agent tool
autorizado para este bloco. Pre-flight scan do plano (10 tasks contra os Global Constraints e a
spec): limpo, sem conflito novo — as dívidas aceitas (D2 sem guarda, D4 requisição ociosa, D8
exceção de CTA) já são decisão declarada do João em §8 da spec, não achado a escalar aqui.

Ledger local reiniciado em `.superpowers/sdd/progress.md` (o anterior era do `BD-3`, já fechado).

**Estado:** `executing`.

### Execução — 2026-08-13: fechamento

10 tasks do plano completas via SDD, cada uma com revisor de task independente. Dois loops de fix
durante a execução: Task 2 (`StudentClientField` devolvia `Fragment` quando devia devolver `<div>`
— o `<p>` do aviso `clientLocked` não era irmão direto da section no original, achado escalado ao
João, ele escolheu `<div>`); Task 9 (número esquecido em `backlog.md:143`). A catraca `max-lines`
fechou de fato — array `ignores` do bloco removido inteiro em `eslint.config.js` (Task 5), regra
vale sem exceção, `.claude/rules/frontend-fsliced.md:106` reescrito. `BudgetsTable`/`TurmasTable`
migraram para `SearchableTableFrame` (D8: CTA muda comportamento só no caso lista-vazia-com-termo,
verificado por álgebra exaustiva no review final). UI-01 corrigido (`AppFileRow` ganha `title`).

**Gate da Task 10 — Steps 1-4 provados** (lint/build/test verdes, 29 arquivos/142 testes, os 6
arquivos-alvo abaixo de 150, sem sonda/vazamento de camada/órfão). **Steps 5 e 6 (e2e do 422 de
`phone` contra API real, checagem visual `/lotus-ui-review`) NÃO executados** — bloqueio de
ambiente: nem o main tree (branch WIP alheia, 500 em `/api/students`) nem uma stack própria da
worktree (comando `docker compose up` bloqueado pelo classifier de auto mode) ficaram disponíveis.
Escalado ao João duas vezes; ele escolheu prosseguir sem essas duas provas. Débito explícito, não
maquiado — ver `.superpowers/sdd/task-10-report.md` Step 7.

**Review final de branch inteira** (opus, intervalo `0c2a24b..96d36ba`, depois `..d50d7f8`):
veredito inicial "Ready to merge: With fixes" — 3 achados Important, todos verificados
pessoalmente antes de agir: `SearchableTableFrame.tsx` sem `flex-wrap` (regressão de layout em
telas estreitas nas duas tabelas migradas, achado real de CSS, não hipótese) e duas entradas do
próprio `state.md` (aqui perto, §"Brainstorming e spec — 2026-08-13") que a Task 9 corrompeu com
um find-replace cego — achado histórico do ponteiro fantasma virou afirmação invertida, e a
descrição de uma spec ARQUIVADA (protegida por D9) passou a mentir sobre o que ela cita. Um fix
subagent corrigiu os dois (commits `eb9bc47`, `d50d7f8`); re-review confirmou ambos resolvidos na
raiz. **Veredito final: "Ready to merge: Yes."** Achados Minor (margem fina em dois arquivos
novos, nome `SlotBody.tsx` foge da convenção `Redator*`, D6 muda espaçamento do banner em ~16px,
`backlog.md:137` com racional que a spec provou falso, D8 sem guarda automatizada) ficam
registrados no ledger local, não bloqueiam.

**Estado:** `ready_for_review`. Próxima instrução aciona a revisão do trabalho ativo — este
comando não a inicia sozinho.

### Review de sprint — 2026-08-13: BAIXO risco, uma lente, 4 achados

**BAIXO pelo gate binário da skill:** zero schema, `generated.ts`, Sanctum, auditoria, RBAC,
dinheiro escrito ou documento legal gerado; `executor: claude`. A spec §9 declara MÉDIO por alcance
e margem — divergência declarada, sem conflito, como no BD-3. **Só lente Claude, sem Codex.**

**Gate reproduzido, não herdado do relatório de execução:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **29 arquivos / 142 testes** (a projeção do plano, exata); os **13** arquivos do bloco
abaixo de 150, o maior sendo `SlotBody` em 144; `ignores` do `max-lines` inexistente (só o
`globalIgnores` do topo e o `CATRACA_COR`, que é outra regra); zero `className="sp"`; zero
`primereact` em `features/`; `BudgetDetailPage.test.tsx` com **diff vazio**.

**A catraca foi provada nos dois sentidos (lição 10), não por lint verde:** 25 linhas em branco
apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar com
`File has too many lines (153). Maximum allowed is 150`, e a árvore volta limpa em seguida. Verde
sozinho não distinguiria "a régua vale" de "a regra parou de casar o glob".

**Órfãos: zero.** Os 7 componentes novos têm exatamente um consumidor cada, conferido por grep.

**As extrações foram conferidas linha a linha, não presumidas:** `StudentDetailSections` bate byte a
byte com `StudentDialog.tsx:172-278` do `0c2a24b`, com uma única divergência — o `sp` → `space-y-2`
da D6; `BudgetOverlays` e `BudgetStatCard` idênticos ao original; `SlotBody` preserva as duas
assimetrias medidas. **E a conferência que o `backlog.md:409-411` pedia foi feita:** todo campo em
`mapped` passa `error=` ao `FormField` nos dois diálogos, e `phone` não passa em nenhum — o resumo
não duplica erro de campo visível.

**A D8 foi confirmada por álgebra sobre o hook, não por leitura do JSX:** `useTableFilter.ts:98` é
`term !== '' || scoped.length !== items.length`, então lista crua vazia **com** termo digitado dá
`filtering: true` e o CTA aparece, onde o critério antigo (`budgets.length === 0`) o escondia. É o
único caso que diverge.

**Os quatro achados:**

1. **Q-1 🟡 P** — `RedatorDocumentsSection.tsx:37,69-70`: `removeDoc.error` **nunca é lido**. Um
   DELETE de documento do redator que falha deixa a linha na tela e não diz nada — vazio silencioso
   (D16) sobre dado que alimenta a idoneidade. O irmão `commercial` já resolve os dois no mesmo
   banner (`useBudgetDetail.ts:47`: `useMutationErrors([uploadFile.error, removeFile.error])`). O
   bloco reescreveu exatamente as duas linhas vizinhas (D6, `<p>` → banner) e passou ao lado da
   terceira. Não registrado em `backlog.md` nem em `pendencias.md`.
2. **Q-2 🟡 M** — o contrato "quem passa `filterSlot` passa um `clear` COMPOSTO"
   (`SearchableTableFrame.tsx:41-45`) é **prosa, não mecanismo**, e este bloco trouxe o terceiro
   consumidor: `BudgetsTable:63,67`, `TurmasTable:40,44` e `useHistorial:60,86` remontam o mesmo
   `clearAll` à mão. Esquecer produz um "Limpar filtros" que não devolve a lista — a mesma classe de
   falha silenciosa que o `filtering` do `useTableFilter` existiu para matar em 2026-08-03, quando
   estas duas tabelas erraram juntas. Pela lição 14 (instrução repetida três vezes quer mecanismo) e
   pela cláusula de reincidência da skill, **vira regra ou tipo, não refactor**: a moldura compondo
   por `onClearFilter`, o par virando tipo obrigatório, ou um `useStatusFilteredTable` em
   `shared/hooks`.
3. **Q-3 🟢 P** — `StudentDialog.tsx:115` introduz
   `options={clients.options as { label: string; value: number }[]}`. A fonte
   (`useStudentClients.ts:16`) devolve `value: c.id` com `ClientData.id` sendo `number | undefined`.
   A extração criou uma fronteira tipada e o cast é o que a atravessa; corrigir no dono do dado
   (filtrar/normalizar uma vez) elimina a asserção em vez de justificá-la em três linhas de
   comentário.
4. **Q-4 🟢 P** — `RedatorDocumentSlot.tsx:10-12` afirma que `preview` e `sizeError` "vivem no
   diálogo"; depois da Task 4 eles vivem em `RedatorDocumentsSection.tsx:38-39`. Lição 13 na forma
   exata, e a mesma classe do ponteiro fantasma que a Task 9 **deste bloco** existiu para corrigir.
   `repo-docs-refs` não pega: é comentário em `.tsx`, não doc normativo.

**O que NÃO virou achado, e por quê:** decisão consciente registrada não é achado — requisição
ociosa de `useStudentDetail` em edit (D4), `mapped` literal do redator sem guarda (D2), CTA da
`BudgetsTable` em lista-vazia-com-termo (D8), margem de 6 linhas do `SlotBody` (spec §8.1, no
ledger), `SlotBody.tsx` fora da convenção `Redator*` (ledger) e os números do `backlog.md` §Débitos
ainda descrevendo o estado pré-bloco (a baixa é do `/fechar-sprint`, por instrução do plano).

**Veredito: o bloco está bom.** Dez tasks, dez commits, nenhuma condicional mudou de forma, nenhum
`key` mudou de critério, e as quatro mudanças de tela são as quatro declaradas. Os quatro achados
são de acabamento e de mecanismo; nenhum é de correção.

### Correção dos achados — 2026-08-13: João aprovou os quatro

Triagem do João: **Q-1 a Q-4, todos**. Quatro commits, um por achado, na ordem do relatório.

**Q-1 (`3451976`)** — `RedatorDocumentsSection` adota o molde do `useBudgetDetail`:
`useMutationErrors([upload.error, removeDoc.error])` num banner só. A exclusão reprovada agora fala;
antes o documento reaparecia na linha e a tela ficava calada.

**Q-2 (`b4d1a50`) — virou tipo, não refactor,** que é o que a cláusula de reincidência pede. Das três
formas oferecidas no relatório (regra escrita, par obrigatório por tipo, `useStatusFilteredTable`),
a escolhida foi a do meio: `SearchableTableFrameProps` deixou de ser interface e virou
`SearchableTableFrameBaseProps<T> & FilterSlotProps`, com `FilterSlotProps` sendo
`{ filterSlot?: undefined; onClearFilter?: undefined } | { filterSlot: ReactNode; onClearFilter: () => void }`.
A composição saiu dos chamadores e entrou na moldura (`table.clear()` + `onClearFilter?.()`). Os três
consumidores (`BudgetsTable`, `TurmasTable`, `useHistorial`) pararam de remontar `clearAll` à mão —
o `useHistorial` passou a expor `clearStatusFilter` e devolve o `table` do hook intacto.
**Provado nas duas direções** (lição 10), não por lint verde: removi o `onClearFilter` da
`TurmasTable` mantendo o `filterSlot` e o `tsc -b` deu
`TS2322: Property 'onClearFilter' is missing ... but required in type '{ filterSlot: ReactNode; onClearFilter: () => void }'`;
restaurado, compila. O terceiro consumidor que motivou o achado é agora impossível de errar.
A regra ficou registrada no bullet "Tabela em card" de `.claude/rules/frontend-fsliced.md`.

**Q-3 (`ae52a6c`)** — `useStudentClients` descarta o `id` nulo com `flatMap` e devolve
`value: number` de verdade; o cast e as três linhas que o justificavam sumiram do `StudentDialog`.
Corrigido no dono do dado, não na fronteira.

**Q-4 (`20bc7e7`)** — docblock do `RedatorDocumentSlot` aponta para `RedatorDocumentsSection`.

**Gate reproduzido depois das correções:** `pnpm build` verde, `pnpm lint` exit 0,
`pnpm test` **29 arquivos / 142 testes** — mesmos números do fechamento da execução, nenhum teste
tocado. Os cinco componentes mexidos seguem sob a régua de 150 (maior: `HistorialTable`, 132).
A `SearchableTableFrame` foi a 164 linhas e isso é legítimo: a régua cobre
`src/features/*/components/**`, e a moldura é `shared/ui` — foi justamente ela que absorveu a
complexidade que estava espalhada em três features.

**Estado: `ready_for_closure`.** Nenhum achado aberto. O fechamento é passo explícito
(`/fechar-sprint`), não automático — e é lá que a baixa dos débitos do `backlog.md` acontece.

### Fechamento — 2026-08-13

A árvore já estava limpa em `7c28699` (as correções dos quatro achados entraram commitadas), que
passa a ser o `state_basis_commit` — diferente do fechamento anterior, aqui não houve trabalho
pendente a commitar antes de arquivar.

**O item 0 foi refeito contra a API real e PAGOU a dívida que a execução declarou.** Os Steps 5 e 6
do gate da Task 10 tinham ficado de fora por bloqueio de ambiente (500 em `/api/students` no main
tree, `docker compose up` recusado na worktree), com o João escolhendo prosseguir sem eles. No
fechamento a stack estava de pé e respondendo — `/api/students` sem cookie devolve **401**, não mais
500 —, então o Step 5 rodou: com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois
lados), o payload forjado `"phone": []` devolveu **422 `application/problem+json`** com
`errors.phone` em `PUT /api/students/37` **e** em `PUT /api/redatores/1`, mensagem
`El campo teléfono debe ser una cadena de caracteres.`. É exatamente o insumo que o item (c) do
bloco mostra: `phone` não está em `mapped` em nenhum dos dois diálogos (`useStudentForm` o declara
em `summaryOnly`; o `RedatorDialog` passa a lista literal `['name', 'rut', 'email']`), então o 422
cai no `FormErrorSummary` em vez de sumir. **Ressalva escrita, não maquiada:** o `:8080` serve o
main tree, hoje na branch alheia `feat/contrato-de-entrada-identidade-e-nested`. O `phone` é
`string\|Optional\|null` no DTO e o 422 vem do cast do spatie/laravel-data, não de regra de formato;
`git diff main...HEAD -- backend/app/Domains/Identity/Data/` está **vazio** naquele tree, então o
caminho medido é o mesmo que a `main` percorre — mas a medição não é de uma stack limpa, e isso é
o custo da **P-03** aparecendo num bloco de frontend.

**A catraca foi provada no próprio fechamento, nos dois sentidos (lição 10), não herdada do
review:** 30 linhas em branco apensadas ao `StudentDialog` — o ex-ignorado — fazem o lint reprovar
com `File has too many lines (154). Maximum allowed is 150`, e a árvore volta limpa em seguida.
Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` **29 arquivos / 142 testes**. Os
seis alvos do plano pousaram em **124 / 125 / 34 / 133 / 105 / 116** linhas. Suíte backend, Pint e
`typescript:transform` são **N/A por escopo medido, não por suposição**: `git diff main...HEAD --
backend/` e `-- frontend/src/shared/types/generated.ts` devolvem **zero arquivo**, e rodar a suíte
no container mediria o código da outra branch, não este bloco.

**Um achado do próprio gate de código morto, corrigido no commit de fechamento:** o comentário de
`useStudentForm.ts:36-38` ainda dizia que "`StudentDialog` não tem FormErrorSummary: um 422 em
`phone` não aparece em lugar nenhum hoje". O bloco tornou a frase falsa ao adicionar o resumo em
`StudentDialog.tsx:74`, e o arquivo ficou **fora** do diff das dez tasks — lição 13 na forma exata,
mesma classe da Q-4 do review, um nível abaixo (comentário de hook, que a guarda `repo-docs-refs`
não alcança).

**Pendências: nenhum gatilho venceu.** A **P-34** (`COR_HARDCODED` fora de `src/app/**`) espera
bloco que toque o shell, e este não tocou — `src/app/` não aparece no diff. A **P-23** (formato do
`progress.md`) segue com revisão em 2026-09-30, e foi exercitada aqui ao mover a entrega mais antiga
para o `progress-archive.md`, que tem as três colunas que o `progress.md` fundiu. A **P-03** ganhou
uma linha: a ausência de compose por worktree custou dois passos de gate **num bloco de frontend**,
não de backend — a worktree não pôde subir stack própria e dependeu do main tree, que naquele
momento servia branch alheia quebrada. Nenhuma pendência nova nasceu: o que fica aberto deste bloco
é prova não executada, registrada no `progress.md`, não divergência entre doc e realidade.

**Arquivamento e histórico:** plano e spec foram para `plans/archive/` e `specs/archive/` (a spec
não é compartilhada por nenhum item futuro), com os ponteiros da narrativa acima e o da §Spec do
próprio plano atualizados. O `progress.md` recebeu a entrega e voltou a dez linhas, movendo
`Certificação · lote em Action e gate único de snapshot` (2026-08-10) para o `progress-archive.md`.
Do `backlog.md` saíram o **BD-4** e os **três débitos que ele cobria** — as 2 tabelas sem a
`SearchableTableFrame`, a catraca do `max-lines` e o `FormErrorSummary` ausente nos dois diálogos —,
mais a atualização da ordem (`BD-5 → BD-6`). O gatilho do trio da foto, que o BD-4 venceu, ficou
escrito no próprio BD-5. **Nada foi promovido:** o próximo item é escolha explícita do João.

**O que o fechamento NÃO provou, sem maquiagem:** o **Step 6 segue não executado** — nada foi visto
renderizado, então o wrap da toolbar a 390x844, os quatro casos de CTA da D8, o aviso `clientLocked`
sobrevivendo fora do `FormField` e o resumo com o 422 **na tela** continuam sem checagem visual. A
equivalência das extrações é literal e conferida linha a linha no review, mas não vira mecanismo:
nenhum diálogo tem teste de componente. D8 e D2 seguem sem guarda automatizada, por decisão
declarada na spec §8.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

### Merge com a `main` — 2026-08-13: duas sprints fecharam em paralelo

O BD-4 fechou às **08:49** e o BD-9 (`contrato-de-entrada-identidade-e-nested`, backend) às
**09:12**, do mesmo dia, em branches irmãs da mesma base `0c2a24b`. **Colisão de código: zero** — 30
arquivos de frontend contra 40 de backend mais `generated.ts`, sem um arquivo em comum. Os **cinco**
arquivos que se cruzam são todos doc de estado, e só **três** conflitaram (`state.md`,
`progress.md`, `progress-archive.md`).

**Merge da `main` na branch, nunca rebase.** Replayar 24 commits reescreveria os SHAs que o
`progress.md` e este arquivo **citam nominalmente** — doc versionado viraria mentira —, e faria 24
encontros com o mesmo `state.md` em vez de um.

**O perigo não estava nos conflitos, estava no auto-merge.** `pendencias.md` e `backlog.md`
mesclaram sozinhos, e um dos dois saiu **falso**: o parágrafo de ordem do `backlog.md` manteve
"então dessa fila resta o BD-9" depois de a `main` já ter entregue o BD-9 — a `main` nunca tocou
aquele parágrafo, então o git escolheu o lado desta branch e a afirmação vencida passou verde.
Corrigido à mão no mesmo commit. Auto-merge é ausência de sobreposição textual, não acordo.
`pendencias.md` é seguro por medição: a `main` mexeu só na P-29, esta branch só na P-03, e os 32 IDs
seguem sem duplicata — este repositório já renumerou ID duplicado três vezes.

**A cadeia foi resolvida por decisão do João: BD-4 fica como Último por ordem de merge**, não por
relógio (ele fechou 23 min antes do BD-9 e chega à `main` depois). BD-9 desce a Penúltimo,
`rastro-unicidade-e-gates` a Antepenúltimo e `faixa-visivel-e-acessibilidade-dos-dialogos` sai da
cadeia de três. O frontmatter é o desta branch (`last_completed_work_item:
catraca-max-lines-e-moldura`, `state_basis_commit: 7c28699`). Os três corpos foram conferidos por
comparação, não de olho: o do BD-9 entrou **byte a byte idêntico** ao da `main`, o do BD-4 idêntico
ao desta branch, e o do `rastro-unicidade-e-gates` difere da `main` em exatamente **duas linhas** —
as correções do ponteiro fantasma que o próprio BD-4 fez em `d50d7f8`, preservadas.

**`progress.md`:** as duas entregas entram, dá 11 contra o teto de 10, então desceu
`2026-08-10 · Operation · habilitação da turma`. **`progress-archive.md`:** os dois lados haviam
arquivado a **mesma** linha (`2026-08-10 · Certificação · lote`) e união ingênua a duplicaria —
ficou uma. E ficou na forma **verbatim de cinco colunas**, não no split de sete que esta branch
tinha feito: o fechamento do BD-9 declarou essa convenção no cabeçalho do arquivo (duas arities
convivendo, apontando para a P-23), e convenção recém-publicada vence reformatação.

**Gate pós-merge, que nenhum dos dois lados exercitou sozinho:** `pnpm lint` exit 0, `pnpm build`
verde (o `tsc -b` combinado é o risco real de um merge frontend×backend), `pnpm test` **29 arquivos
/ 143 testes** — os 142 desta branch mais o caso de `useClientForm` que a `main` trouxe. Backend
**591 passed, 5 skipped (2149 assertions)** e `typescript:transform` com **diff zero**; os dois
rodaram no container, que monta o main tree, e valem para esta branch por medição:
`git diff origin/main -- backend/ frontend/src/shared/types/generated.ts` devolve **zero linha**.

## Antepenúltimo item fechado — 2026-08-13 (`contrato-de-entrada-identidade-e-nested`)

### Seleção — 2026-08-13

**BD-9 do `backlog.md:185`, promovido explicitamente pelo João.** Ele abriu com
`/planejar-bloco ### BD-9 · Contrato de entrada: identidade e coleção nested (backend)` mais o
caminho de um arquivo de contexto, e o gate do comando **reprovou pelo motivo de sempre** (BD-1,
BD-2, BD-7, BD-8): o argumento é **título de seção**, não slug promovido, com o estado em `idle` e
`active_work_item` `null`. O comando mostra o backlog; quem promove é ele.

**Diferente do BD-8, não havia item concorrente a autorizar.** A worktree
`/home/jvbat/projetos/fix-frontend` está na branch `feat/catraca-max-lines-e-moldura` (BD-4), mas com
**zero commits** além de `0c2a24b`, árvore limpa e `state.md` idêntico ao da árvore principal, também
`idle` — branch criada, nada executado. A invariante de um `active_work_item` não precisou de
exceção.

**Três decisões do João fecharam o gate, todas confirmadas de uma vez:** promover o BD-9 com o slug
`contrato-de-entrada-identidade-e-nested`; **rota direta a `ready_for_planning`, sem Context
Packet**, por ausência **medida** de fonte externa; e **main tree, sem worktree** (P-03, bloco de
backend), na branch `feat/contrato-de-entrada-identidade-e-nested` criada de `0c2a24b`.

**A ausência de fonte externa foi medida, não presumida.** O arquivo de contexto que ele passou —
`architecture-review-20260812-backend.html`, 81.193 B — é a mesma revisão de arquitetura que gerou o
BD-8, e o grep por `drive.google`, `notion.so`, `figma.com` e `docs.google` devolve **zero
ocorrência**. Os onze achados dele estão numerados em `<h2>`, e os **4** (`UserProvisioner fecha
metade do invariante e quatro caminhos esquecem a outra`) e **5** (`ClientData::$addresses apaga a
coleção em silêncio`) são literalmente os dois itens do BD-9. O arquivo vive no `/tmp` de **outra
sessão** e é volátil; foi copiado para o scratchpad desta antes de qualquer leitura de desenho.

**Baseline medido nesta branch, não herdado do fechamento anterior:** backend **573 passed,
5 skipped (2104 assertions)** — bate com o placar de fechamento do `rastro-unicidade-e-gates`, o que
confirma que a branch nasce da `main` sem deriva.

### Terreno medido antes de desenhar — 2026-08-13 (fato, não desenho)

1. **O arquivo de contexto que abriu o bloco não existe mais.** O
   `architecture-review-20260812-backend.html` vivia no `/tmp` de outra sessão e não sobreviveu a
   ela. **Não bloqueou:** os achados 4 e 5 estão transcritos integralmente em `backlog.md:185-231`,
   com paths, linhas e as quatro decisões do grilling. `context_packet` segue `null` pela mesma
   ausência medida de fonte externa.
2. **Os caminhos de escrita de identidade são nove**, em cinco creates e quatro updates, e a
   assimetria é exatamente a do achado: `Create/UpdateClientAction` e `Create/UpdateRedatorAction`
   checam só o RUT; os outros cinco checam os dois.
3. **O staff tem `rut` nullable** (`create_users_table.php:18`), e por isso
   `Create/UpdateStaffUserAction` decidem entre `null` e a checagem por ternário. A assinatura
   `ensureIdentityAvailable(string $rut, …)` que o backlog escreveu **não cobre** esses dois.
4. **Fazer `provision()` checar e-mail torna duas chamadas redundantes** — `CreateStudentAction:49`
   e `StudentResolver:63` já chamam `ensureEmailAvailable` logo antes.
5. **O `Optional` no `ClientData` NÃO é inerte no frontend, e isso foi medido por sonda, não
   estimado:** `addresses`/`contacts` com `| undefined` no `generated.ts` e `tsc -b` devolvem **17
   erros em 4 arquivos** (`useClientForm.ts` 10, `ContactFields.tsx` 3, `ClientsTable.tsx` 2,
   `ContactCard.tsx` 2). Inerte em runtime (o front sempre manda as duas), quebrado em compilação.
   Árvore restaurada, `git status` limpo.
6. **O universo da lei da `der-fisico.md:103-106` é cinco, não dois** — a minha primeira contagem
   estava errada e foi corrigida antes de virar decisão. `#[DataCollectionOf]` são cinco
   propriedades em três DTOs, mas `BudgetData::$quotes` e `$files` **nunca são lidos na entrada**
   (grep de `data->quotes`/`data->files` em `app/` vazio): são projeção de saída e não violam lei
   nenhuma. Uma guarda que só olhasse o atributo nasceria vermelha nelas.
7. **Quem produz o `| undefined` no `generated.ts` é o docblock, não o tipo PHP.**
   `BudgetData::$files` é `array|Optional = []` com `/** @var FileData[] */` e sai sem `| undefined`;
   `CourseData:35,38` escreve `|Optional` no `@var` e sai com ele.
8. **Não existe um único `ValidationContext` em `app/`** — os 14 `rules()` do repositório são
   estáticos. A distinção create/update do `contacts` não tinha precedente e precisou de mecanismo.

### Brainstorming e spec — 2026-08-13

Spec em `docs/superpowers/specs/archive/2026-08-13-contrato-de-entrada-identidade-e-nested-design.md`. As
**D1–D4** vêm fechadas do grilling de 2026-08-12 e não foram reabertas; as **D5–D9** são desta
sessão, cada uma escolhida pelo João entre alternativas apresentadas com o custo medido:

- **D5** — o helper é a **porta única dos nove**, com `?string $rut` para caber no staff, e
  `ensureRutAvailable`/`ensureEmailAvailable` viram **privados**. Recusado: fechar só os quatro
  quebrados, que deixaria os dois métodos públicos e três formas de checar identidade convivendo.
- **D6** — `contacts` é `sometimes` no PUT e obrigatório no POST, com a obrigatoriedade do POST
  morando na **Action**, não em `rules()`. Recusado: `sometimes` nos dois verbos, que revogaria a
  regra do Drive (um ou mais contatos, ratificada 2026-07-31) e deixaria a UI como única guardiã.
- **D7** — o 422 **agrega** RUT e e-mail numa exceção só, em vez de dois round-trips.
- **D8** — o helper lê `deleted_at` na mesma query, e cada campo ganha duas mensagens (vivo e
  arquivado), quatro no total, em PT-BR. A Q-6 (idioma canônico) segue travada e não foi reaberta.
- **D9** — a lei ganha guarda estática em `PersistenceLawsTest`, e a exceção read-only é declarada
  **no sítio** por `#[ReadOnlyCollection]`. Recusados: migrar `BudgetData` junto (medido: 3 erros TS
  em 2 arquivos, e o tipo passaria a mentir sobre uma saída sempre preenchida) e allowlist literal
  dentro do teste.

**Consequência declarada, não escolha:** cinco caminhos que **não têm defeito** (staff e aluno)
mudam de forma. É o preço da porta única, e a prova de que o comportamento deles não mudou entra no
DoD.

**Um ruído previsto antes de aparecer:** `UniquenessInsideTransactionTest:116` filtra por
`select exists`; trocar `->exists()` por leitura de `deleted_at` muda o SQL e reprova os três casos.
O teste muda no mesmo commit, medindo a mesma coisa.

**Risco de review declarado ALTO** (§8 da spec), **divergindo do MÉDIO que o backlog escreveu**: o
gate da `revisar-sprint` é binário e lista `generated.ts` entre os gatilhos de alto
(`SKILL.md:37`). A divergência fica declarada; o backlog não foi corrigido por conta própria.

O estado entra em `planning` com `active_spec` preenchido neste commit; `active_plan` segue `null`
até o João ler a spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-13

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-13-contrato-de-entrada-identidade-e-nested.md`: **seis tasks**, uma
por commit, na ordem helper → creates → updates e morte dos métodos antigos → coleção nested com os
consumidores TS → guarda da lei → gate.

**Baseline medido antes de escrever, não herdado do fechamento anterior:** backend **573 passed,
5 skipped (2104 assertions)**; frontend **28 arquivos / 138 testes**, lint limpo, build verde. Os
27/131 registrados no fechamento do BD-8 eram de antes dos merges na `main` — o número do frontend
subiu sozinho, sem este bloco tocar nada. Projeção do plano: **590 casos** no backend (+17),
frontend **inalterado** em 28/138, porque `useClientForm` é hook de feature e está fora do corte do
runner.

**A ordem das três primeiras tasks é a do bloco anterior (helper → call-sites → guarda), e por quê:**
o helper nasce sem chamador na Task 1, o que deixa um revisor rejeitar a forma da porta única sem
rejeitar a migração dos nove caminhos, e vice-versa. A Task 3 é onde
`ensureRutAvailable`/`ensureEmailAvailable` **deixam de existir** — a D5 na forma mais forte: método
apagado, não privado.

**Três coisas que só apareceram ao escrever o plano, e que mudam trabalho:**

1. **`ClientContactMinimumTest:54-67` afirma literalmente o comportamento que a D6 muda.**
   `test_update_sem_a_chave_contacts_da_422_em_vez_de_apagar` é o caso que o bloco tem de
   **inverter**, não um vermelho a consertar. Os outros seis casos do arquivo ficam — inclusive o
   `contacts: []` e a guarda da rota nested, que seguem valendo.
2. **Trocar `->exists()` por leitura de `deleted_at` quebra o filtro de SQL do
   `UniquenessInsideTransactionTest:116`** (`str_starts_with($query->sql, 'select exists')`). O
   filtro novo casa SELECT + `deleted_at` projetado, porque o UPDATE de `users` também contém
   `rut = ?` e o caractere de citação muda entre sqlite e MySQL. No mesmo passe, o cliente e o
   redator passam a exigir `['rut','email']`: a assimetria que aquele arquivo registrava deixa de
   existir.
3. **A guarda da lei pede reflexão, não regex.** A pergunta é sobre o TIPO ("admite `Optional`?"), e
   o texto do arquivo responde mal — default e união podem estar em linhas diferentes do atributo. A
   varredura resolve o FQCN a partir do path (PSR-4) e lê os atributos do construtor.

`executor: claude`, sem `paths_autorizados`: `generated.ts` regenera na Task 4 (lei §5.3), a forma do
erro HTTP muda em quatro rotas (RFC 7807, §5.4) e três tasks fecham por sonda vista reprovando —
julgamento, não transformação mecânica.

### Execução — 2026-08-13, via Subagent-Driven Development

**As seis tasks fecharam, cada uma em commit próprio, revisão individual aprovada antes de avançar:**
`0bd994e` (T1 — `ensureIdentityAvailable`/`duplicateStatus` isolados, nenhum call-site migrado),
`606bd36` (T2 — `provision()` passa a checar e-mail, fecha os dois `create`s de graça), `74d32ea` (T3
— os cinco caminhos restantes migram, `ensureRutAvailable`/`ensureEmailAvailable` deletados),
`29c3815` (T4 — `ClientData::$addresses`/`$contacts` viram `Optional`, `generated.ts` regenerado e os
5 consumidores TS corrigidos no mesmo commit), `fe36ab0` (T5 — guarda de reflexão em
`PersistenceLawsTest`, `#[ReadOnlyCollection]` nas duas projeções de saída de `BudgetData`). Task 6
foi gate — verificação pura, **sem commit**: suíte, Pint, `generated.ts` sem diff, zero órfão, e um
E2E completo contra a API real (sessão Sanctum de verdade) provando os 11 cenários do DoD por corpo
de resposta, não só status. Contagem final: backend **590 passed, 5 skipped** (573 no baseline);
frontend **28 arquivos**. Ledger fino task-a-task, achados Minor de cada review e o relatório do gate
em `.superpowers/sdd/progress.md` (local, não versionado).

**A revisão final de branch (mandato da própria skill SDD, não o `/revisar-sprint` do João — essa
continua sendo a próxima instrução explícita) achou dois Important, ambos reais e ambos corrigidos
antes de fechar:**

1. A guarda nova de T5 checava só o TIPO do parâmetro (`array|Optional` admite `Optional`), nunca o
   DEFAULT — e a lei em `backend-ddd.md` exige as duas coisas (`= new Optional`). Confirmado por
   reflexão real: `BudgetData::from(['client_id'=>1])->files` devolve `array(0){}`, não `Optional`,
   apesar do tipo admitir. Uma coleção nova escrita `array|Optional $x = []` passaria pela guarda e
   ainda apagaria em silêncio — o mesmo defeito que o bloco existe para fechar, sob grafia diferente.
   Corrigido em `11c7337`, sonda provada nos dois sentidos (código velho deixa passar errado, código
   novo reprova nomeando a sonda).
2. A spec (§5, ecoada em §9) afirmava que o frontend ficava sem teste novo porque "o runner só cobre
   hooks de `shared/`" — falso, e o mesmo engano que `frontend-fsliced.md` já registra como lição
   repetida duas vezes (lição 13) no próprio arquivo. A lacuna real era a normalização
   `client.addresses ?? []`/`contacts ?? []` (T4) nunca ter sido exercitada por teste. Corrigido em
   `e06c204`: caso novo em `useClientForm.test.tsx`, prosa da spec corrigida nos dois pontos. Frontend
   138→139 testes.

Nove achados Minor triados como backlog (não bloqueiam merge, nenhum fixado nesta passagem) — inclui
uma discordância explícita da triagem da T4 (`$data->contacts === []` em `CreateClientAction` **não**
é código morto: `OperationDemoSeeder` chama a Action direto, sem passar por `rules()` — manter).
Recomendações não-bloqueantes: a guarda de T5 só alcança propriedade promovida no construtor marcada
`#[DataCollectionOf]` (`QuoteData::$files` etc. ficam fora, spec §6 já declara essa fronteira);
`UpdateStaffUserAction` tem o mesmo defeito de família num campo escalar (`rut` some em silêncio num
PUT que o omite) — pré-existente, fora de escopo, vale backlog. Detalhe completo, achado a achado, em
`.superpowers/sdd/progress.md`.

**O que o gate NÃO provou, registrado sem maquiagem:** corrida de unicidade concorrente (a suíte roda
sqlite `:memory:`, a defesa real é o `unique` do MySQL); nenhuma tela vista renderizada (o frontend só
mudou de tipo mais a normalização `?? []`, sem mudança visual); a listagem `GET /api/clients` não
recebeu asserção formal neste gate (fora do escopo de escrita do bloco).

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona
`/revisar-sprint` (ou equivalente) sobre o trabalho ativo.

### Review de sprint — 2026-08-13: ALTO risco, UMA lente, 4 achados

Risco ALTO pelo gabarito: `generated.ts` regenerado (lei §5.3), forma do 422 mudando em quatro rotas,
eixo de identidade. **A segunda lente foi recusada pelo João** — o despacho ao Codex não foi
autorizado, e o review saiu com lente única. Fica declarado, não resolvido em silêncio (mesmo
precedente do fechamento de 2026-08-12).

**Gate reproduzido, não herdado:** backend 590 passed / 5 skipped / 2146 assertions; frontend
`pnpm build` verde, `pnpm lint` limpo, 28 arquivos / 139 testes; `typescript:transform` sem diff;
Pint `passed` nos `.php` do bloco; zero `dd(`/`dump(`/`console.log`/`SONDA` no diff.

**Órfãos: zero.** `ensureRutAvailable`/`ensureEmailAvailable` não existem mais em `app/`, `tests/`
nem `database/` — a D5 na forma forte. Os nove caminhos de escrita de identidade passam pela porta
única (4 via `provision()`, 5 diretos), conferidos um a um.

Os quatro achados, com as duas provas por sonda (árvore restaurada nos dois casos):

1. **Q-1 🟡/P — `#[ReadOnlyCollection]` era isenção AUTO-DECLARADA.** A guarda dava `continue` na
   marca antes de qualquer checagem: DTO sonda com `#[DataCollectionOf] public array $itens = []`
   reprovava; a MESMA sonda, `array = []` intacto, passava só por ganhar a marca. A guarda não olhava
   Action nenhuma — a read-only-ness, que é a premissa inteira da exceção, era a única parte não
   mecanizada (a spec §1.5 a mediu à mão, uma vez).
2. **Q-2 🟡/P — checagem de `contacts` rodava depois de escrever.** Sonda: `POST /api/clients` sem
   `contacts` e com e-mail ocupado devolvia `status 422 | chaves: email`. Só `email`. Dois
   round-trips para o operador, num check que é entrada pura e custa zero de banco.
3. **Q-3 🟢/P — uma regra, três redações**, e duas línguas: "precisa **de** ao menos um contato"
   (`CreateClientAction`), "precisa **ter** ao menos um contato" (`DeleteClientContactAction`) e
   `El campo contacts debe tener al menos 1 elementos.` (o `min:1` de `rules()`, pelo locale `es` do
   validador).
4. **Q-4 🟢/P — marca inerte:** `BudgetData::$files` tinha `#[ReadOnlyCollection]` sem
   `#[DataCollectionOf]`, então a guarda não olhava a propriedade de jeito nenhum e a marca sugeria
   cobertura inexistente.

**Descartado como achado, com razão registrada:** o objeto `entity` novo a cada render em
`useClientForm` (o `useEntityForm` reseta comparando `id`+`mode`, não identidade — não há laço); o
filtro SQL reescrito no `UniquenessInsideTransactionTest` (ainda discrimina); o `| undefined` na
saída do `ClientData` (consequência declarada da D4, custo medido); a língua das mensagens (Q-6,
congelada pelo João); `BudgetData` não migrar (D9).

**Fora dos achados:** o deferimento do `rut` do `UpdateStaffUserAction`, declarado no relatório de
execução acima como "vale backlog", nunca chegou ao `backlog.md`.

### Correção dos achados — 2026-08-13: os 4 aprovados pelo João, os 4 aplicados

Cada um com o vermelho visto antes do verde, sem exceção.

- **Q-3** — `ClientData::CONTATO_OBRIGATORIO` vira o texto único, com `messages()` cobrindo
  `contacts.min`/`contacts.array`, e as duas Actions passam a citar a constante. Vermelho real: as
  três asserções de mensagem do `ClientContactMinimumTest` eram `fn ($m) => is_string($m)` — vagas
  **porque** o texto variava. Apertadas para a frase literal, 3 reprovaram (duas em espanhol, uma
  com "precisa ter"). A LÍNGUA do resto da validação segue sendo o Q-6 congelado; isto fecha só a
  divergência de redação desta regra.
- **Q-2** — a checagem de contato sai de dentro da transação e vai para o topo do `execute()`, antes
  de `provision()` e do `client()->create()`. Vermelho por teste novo em `ClientCrudTest`
  (`test_store_sem_contatos_reclama_do_contato_antes_da_identidade`): contra o código velho
  `errors.contacts` vinha `null`. **O que isto NÃO faz, dito sem maquiagem:** o caso combinado
  continua devolvendo UM campo por vez — agora `contacts` em vez de `email`. Agregar os dois num
  422 exigiria plumbar a regra de contato (Commercial) por dentro do `ensureIdentityAvailable`
  (Identity), e o preço não paga: a D7 agrega o que mora na MESMA chamada, e estes dois moram em
  camadas diferentes. O que a correção compra é a ordem determinística e a transação contendo só
  escrita.
- **Q-1** — a marca deixou de ser palavra-de-honra. A guarda agora varre `app/` atrás de
  `$data-><campo>` em arquivos que citam a classe do DTO, e reprova nomeando o sítio. Vermelho por
  sonda (`SondaQ1Action` lendo `$data->quotes`): `BudgetData::$quotes: marcada como SAIDA, mas lida
  da entrada em app/Domains/Commercial/Actions/SondaQ1Action.php`. Sonda apagada, árvore conferida
  por `git status`. Limite honesto e declarado no docblock: só arquivos que citam a classe entram, e
  a convenção `XData $data` é o que torna isso preciso — falso positivo aqui é barulhento, falso
  negativo é o que a guarda existe para não ter.
- **Q-4** — `BudgetData::$files` ganha `#[DataCollectionOf(FileData::class)]`, e a guarda passou a
  reprovar marca sem coleção. Este foi o único vermelho que **não** precisou de sonda: a checagem
  nova nomeou `BudgetData::$files` no primeiro `run`. `QuoteData::$files` — mesmo defeito na classe
  irmã, um nível abaixo (não tinha nem a marca, então era invisível) — recebeu os dois atributos no
  mesmo commit; é escopo ligeiramente além do achado, declarado aqui de propósito.

**Gate após as correções:** backend **591 passed, 5 skipped, 2149 assertions** (+1 caso, o do Q-2);
Pint `passed` nos 8 arquivos tocados; `typescript:transform` **sem diff** — nenhuma mudança de
contrato TS, nenhum consumidor frontend tocado, e por isso o gate do frontend não foi rerodado.

O deferimento do `rut` do `UpdateStaffUserAction` foi registrado em `backlog.md`, em
`## Débitos técnicos`.

**Estado: `ready_for_closure`.** O review não executa fechamento — `/fechar-sprint` é instrução
explícita do João.

### Fechamento — 2026-08-13

**As correções do review estavam no working tree, não commitadas** — o último commit da branch era o
handoff para review (`b2fe20e`). O fechamento começou por commitá-las (`59a39e3`, que passa a ser o
`state_basis_commit`); a árvore ficou limpa antes de qualquer prova.

**O item 0 foi refeito contra a API real, não herdado do review:** as quatro correções entraram
depois do e2e de execução e mexeram exatamente no que ele mediu — ordem da checagem, texto das
mensagens e a guarda. Sessão Sanctum por cookie + CSRF, `Origin` e `Accept` nos dois lados,
**10 cenários provados por corpo de resposta**, não por status:

1. **D7 na API:** RUT `76.123.456-0` e e-mail `contacto@transelec.demo.cl`, os dois ocupados, saem
   **num 422 só** — `errors.rut` **e** `errors.email` —, com `content-type: application/problem+json`
   conferido no header.
2. **Q-2 na API:** POST sem `contacts` com o mesmo e-mail ocupado devolve **`contacts`, e
   `errors.email` ausente**. A ordem que a correção comprou, medida onde o operador vive.
3. **As três portas da regra de contato falam a mesma frase** (Q-3): POST sem contatos,
   `contacts: []` no PUT (caminho do `min:1`, que antes respondia em espanhol) e DELETE do último
   contato pela rota nested — `O cliente precisa de ao menos um contato.` nos três.
4. **O coração do bloco:** PUT **sem** as chaves `addresses`/`contacts`, mudando só o `legal_name`,
   devolve **200** e o GET seguinte mostra **1 endereço e 2 contatos intactos**. O replace explícito
   segue funcionando — `addresses` com outro item troca de fato (`city` passa a `Valparaiso`) e os
   contatos não são tocados.
5. **A porta única nos caminhos que antes só checavam RUT:** `POST /api/redatores` com e-mail de
   redator existente → 422 `email`; `PUT /api/clients/{id}` com RUT de outro usuário → 422 `rut`.
6. **D8 (arquivado) pelo caminho real:** o cliente do gate foi soft-deletado pela própria API e a
   recriação com o mesmo par devolveu as **duas** mensagens de arquivado, não as de "já cadastrado".

**Ferramentas:** backend **591 passed, 5 skipped (2149 assertions)** contra o baseline **573** da
abertura; frontend **28 arquivos / 139 testes**, `pnpm lint` limpo e `pnpm build` verde; Pint
`{"tool":"pint","result":"passed"}` nos **21** `.php` do bloco; `typescript:transform` **sem diff**
(`git status --porcelain frontend/` vazio depois de rodar); zero `abort(` novo em `app/`.

**Órfãos: zero**, reconferidos no fechamento e não herdados do review: `ensureRutAvailable` e
`ensureEmailAvailable` não aparecem em `app/`, `tests/` nem `database/`; `ensureIdentityAvailable`
tem seis sítios em `app/` (o `UserProvisioner` mais cinco Actions) e três em `tests/`;
`#[ReadOnlyCollection]` é usada nas três propriedades de saída que a declaram.

**Item 7 — dois docs VIVOS nomeavam método morto, e é a lição 13 exata:** a lição 8 do
`docs/README.md` e a **P-29** citavam `ensureRutAvailable`/`ensureEmailAvailable`. Os dois foram
corrigidos para `UserProvisioner::ensureIdentityAvailable`; a guarda `repo-docs-refs` não os pegaria,
porque confere **path** e o escopo dela exclui `docs/superpowers/**` e `docs/pendencias.md`. **A P-29
NÃO fecha:** o BD-9 unificou a checagem e agregou o 422, e o que ela registra — a corrida entre
transações distintas, que estoura no índice único como 500 — segue exatamente igual, porque o
`SELECT` de unicidade não trava linha inexistente. O gatilho dela também não venceu: este bloco não
tocou `ProblemDetails` nem `ValidationMessages`. Nenhuma pendência nova nasceu; os limites do bloco
já estão declarados no sítio (docblock da guarda) ou no `backlog.md`.

**A rule `backend-ddd.md` ganhou o que o bloco criou**, porque sem isso um DTO novo com coleção de
saída reprovaria num teste cujo remédio a rule não documentava: a catraca da lei (tipo **e** default),
a exceção `#[ReadOnlyCollection]` com a verificação das duas pontas, e a direção "obrigatoriedade que
depende do verbo mora na Action, não em `rules()`", com o texto único da recusa.

**Mutação declarada no banco de dev**, append-only e toda pela API: cliente 14 (`Gate BD9`) criado e
soft-deletado no próprio gate, com o user de RUT `21.111.111-9`; endereços 22-23; contatos 35-36 (o
35 apagado pela rota nested, para provar que só o último é recusado). **Nenhuma linha pré-existente
foi alterada**, e nenhum `migrate:fresh`, `refresh`, `reset` ou seeder rodou — o banco segue com o
`LOT-2026-1001` corrompido de propósito para o checkpoint visual do João.

**O que o fechamento NÃO provou, sem maquiagem:** corrida de unicidade concorrente (a suíte roda
sqlite `:memory:` e a defesa real é o `unique` do MySQL — é a P-29, aberta); **nenhuma tela vista
renderizada**, porque o frontend só mudou de tipo mais a normalização `?? []`; e `GET /api/clients`
não recebeu asserção formal neste gate. O `progress-archive.md` passou a conter uma linha de **cinco**
colunas numa tabela de sete — a entrega mais antiga saiu do `progress.md` **verbatim**, como o
fechamento manda, e o cabeçalho do arquivo agora declara as duas arities apontando para a P-23.

**Estado: `idle`.** O próximo item é escolha do João, no `backlog.md`; nada foi promovido.
