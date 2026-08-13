# Spec — `useCrudForm` mais fundo (BD-5)

> Work item: `usecrudform-mais-fundo` · Backlog: `backlog.md:131` · Baseline: `d0cc270`
> Branch: `feat/usecrudform-mais-fundo` · Worktree `/home/jvbat/projetos/fix-frontend`
> Context Packet: `null` — ausência de fonte externa **medida**, não presumida.
>
> **O isolamento mudou depois do gate (D6).** A promoção escolheu main tree porque o DoD é foto real
> no S3 e é o main tree que serve o `:8080`; uma sessão paralela tomou o main tree para
> `login-fora-do-adr16` (`0e3ce3b`) antes de o desenho fechar. **As duas execuções correm em
> paralelo**: este bloco na worktree, o login no main tree. O `:8080` continua sendo do main tree, que
> agora tem **execução ativa em cima** — não uma branch parada, como no BD-4. É a P-03 outra vez, um
> grau pior.

## 1. O terreno, medido antes de desenhar

Medição de 2026-08-13 sobre `d0cc270`. **Quatro afirmações do backlog não sobreviveram.**

### 1.1 `useQuoteForm` não é candidato legítimo — reprova pelo mesmo critério do `useTurmaConfigForm`

`backlog.md:304-306` escreve que `useCourseForm` e `useQuoteForm` "são candidatos legítimos e
ficaram fora só por corte de escopo — ambos manipulam coleção nested (módulos, itens da cotação) e
usam `setForm`". Três partes disso são falsas para o `useQuoteForm`:

1. **Não satisfaz `MutableResource`.** `useCreateQuote` recebe `{ budgetId, payload }`
   (`useQuotes.ts:28`) e `useUpdateQuote` recebe `{ quoteId, payload }` (`useQuotes.ts:37`); o
   contrato exige `useCreate().mutate(payload)` e `useUpdate().mutate({ id, payload })`. A cotação
   nasce em rota aninhada (`POST /api/budgets/{id}/quotes`) — **o critério idêntico** que o próprio
   backlog usa para excluir o `useTurmaConfigForm`.
2. **Não manipula coleção nested.** `QuoteFormFields` são sete escalares; "itens da cotação" não
   existem nesse form.
3. **Não usa `setForm`.** `useQuoteForm.ts:41` destrutura `{ form, set, didReset }`.

### 1.2 `useCourseForm` cabe, mas só com o hook de fato mais fundo

Três obstáculos medidos, nenhum contornável por configuração:

- `createdIdRef` (`useCourseForm.ts:53,108`) impede recriar o curso quando a segunda chamada falha —
  curso é registro de peso legal. `useCrudForm.submit()` sempre chama `create.mutate`.
- `pending` soma uma **terceira** mutação (`sync.isPending`, `useCourseForm.ts:142`).
- `fieldErrors` vem de **três** fontes (`useCourseForm.ts:136`).

### 1.3 A absorção do trio não cabe inteira no `useCrudForm`

Metade do trio é JSX, e `useCrudForm` é hook: o bloco `AppPhotoField` mais os dois wrappers, o
`FormErrorBanner` de `hasBufferedFailure` e o par `closeBlocked`/`disabled` do `CrudDialog`. E o
quarto diálogo **não roda sobre `useCrudForm`**: `useRedatorForm` usa `useEntityForm` direto, com o
próprio `RedatorDialog.tsx:86` já escrevendo "decisão do BD-5". Absorver só no hook cobre **3 de 4**.

O bloco JSX é idêntico byte a byte nos quatro sítios: `StudentDialog.tsx:82-104`,
`ClientDialog.tsx:82-105`, `StaffUserDialog.tsx:84-107`, `RedatorUserSection.tsx:30-53`.

### 1.4 O texto do Q-4 está impreciso

`backlog.md:311-313` diz que "a propriedade deixou de carregar URL e passa a carregar path, então
quem reintroduzir `...form` manda um caminho interno de storage no corpo da escrita". O
`SignedUrlTransformer` roda **na serialização** (`app/Shared/Files/Transformers/SignedUrlTransformer.php`),
então o frontend recebe **URL pré-assinada**, não path. O que `...form` mandaria de volta é a URL
assinada. O defeito continua real e é outro: `PUT` com `photo_url` devolve **200** porque a promoção
no construtor desvia do `CannotSetComputedValue`.

### 1.5 Fatos que sustentam o desenho

- **A guarda de classificação de hoje já barra o `...form` ingênuo.** `toPayload: (f) => ({...f})`
  em `useClientForm` reprovaria com "chave de payload sem classificação: `photo_url`". O buraco é
  quem **classifica** `photo_url` em `summaryOnly` e passa.
- **A régua de 150 linhas cobre só `src/features/*/components/**`** (`eslint.config.js:246-251`).
  `shared/hooks` e `shared/ui` estão fora — `useCrudForm.ts` já vive em 152 linhas legitimamente.
- **`StaffUserDialog` está em 150 — margem zero.** A absorção é o que devolve folga a ele.
- **O runner cobre `src/**` inteiro**, não só `shared/` (`vite.config.ts:26`), e já existem testes de
  componente (`ValidationPage`, `BudgetDetailPage`, `TurmaDetailPage`). Nenhum diálogo tem um.
- **Baseline medido, não herdado:** `pnpm test` = **29 arquivos / 143 testes**, exit 0.

## 2. Decisões (D1–D5)

Cada uma escolhida pelo João entre alternativas apresentadas com o custo medido.

- **D1 — o item 2 migra só o `useCourseForm`.** `useQuoteForm` vira **exclusão por critério**, com a
  redação do `useTurmaConfigForm` (rota aninhada, não satisfaz `MutableResource`). Recusado: ampliar
  o `MutableResource` para aceitar chave de recurso pai e nome de id divergente, que faria o
  `useCrudForm` modelar rota aninhada — exatamente o que `createCrudResource.ts:6-8` declara fora de
  escopo. A prosa vencida do `backlog.md:304-306` é corrigida no `/fechar-sprint`, não aqui.
- **D2 — a absorção mora em dois sítios:** `useCrudForm` ganha `photo` (cobre 3 diálogos) e um
  componente novo de `shared/ui` recebe o JSX (cobre os 4). Recusado: um `useDialogPhoto` cobrindo os
  4 igualmente, porque o encadeamento `afterCreate` **não sumiria de nenhum** — quem chama o create
  continua sendo outro hook — e o trio viraria dueto. Recusada também a absorção total (migrar o
  `useRedatorForm`), que exige o `useCrudForm` aprender `FormData` e mexe no único caminho multipart
  do repositório.
- **D3 — `afterCreate` retentável, mais mutações extras.** O `useCrudForm` guarda a entidade criada;
  se `afterCreate` lançar, `onDone` não roda e o próximo `submit` pula o `create`. `createdIdRef`
  morre. Recusadas: só as mutações extras (o `useCourseForm` manteria `submit` próprio e o débito
  ficaria meio pago) e a migração parcial.
- **D4 — a guarda do Q-4 é chave proibida no payload**, DEV throw no `useCrudForm`, terceira no mesmo
  sítio das duas irmãs do review de 2026-08-05. Pega o **efeito**, venha de spread, cópia manual ou
  classificação indevida. Recusado: varredura estática contra `...form` em `toPayload` (pega a forma,
  deixa passar `photo_url: f.photo_url` escrito à mão) e fechar no backend com 422, que mudaria a
  forma do erro em quatro rotas (lei §5.4) e subiria o risco de review para ALTO.
- **D5 — o hook devolve `busy`, e o banner fica nos diálogos.** `pending` segue sendo só
  `create || update`. Recusado: somar `photo.pending` dentro de `pending` (o botão de salvar giraria
  por upload de foto — crítica Q-7 do bloco de documentos oficiais) e absorver o banner no componente
  novo, que moveria o aviso do topo do diálogo para dentro da linha da foto em quatro telas sem
  checagem visual no gate.

- **D6 — as duas execuções correm em paralelo:** o BD-5 na worktree `/home/jvbat/projetos/fix-frontend`,
  o `login-fora-do-adr16` no main tree `/home/jvbat/projetos/lotus`. Duas sessões promoveram itens
  distintos a partir de `d0cc270` no mesmo repositório (`5bf54f3` às 12:32, `0e3ce3b` às 13:05), cada
  branch com um `state.md` dizendo que o item ativo é outro. A invariante "existe no máximo um
  `active_work_item`" fica com **exceção declarada, não resolvida** — decisão do João, com o
  precedente BD-4 × BD-9 (2026-08-13) e o custo dele **aceito de antemão**, não descoberto no merge:
  os `state.md` conflitam, e `backlog.md`/`pendencias.md` auto-mesclam sem sobreposição textual, que
  é como uma afirmação vencida passou verde naquele bloco. Recusadas: pausar o BD-5, e o login ceder
  a vez.

## 3. O que muda

### 3.1 `shared/hooks/useCrudForm.ts` (152 → ~215 linhas)

Três capacidades novas, nesta ordem de dependência:

```ts
photo?: { resource: PhotoResource; invalidateKey: readonly unknown[]; url?: string | null }
extra?: { isPending: boolean; error: ProblemDetails | null }[]
```

- **`photo`** — monta `useEntityPhoto` dentro, derivando `id` de
  `mode === 'create' ? null : (entity?.id ?? null)`, e **encadeia `flush(created.id)` antes** do
  `afterCreate` do chamador. Devolve `crud.photo` e `crud.busy = pending || photo.pending`.
- **`afterCreate` retentável** — guarda a entidade criada; se `afterCreate` lançar, `onDone` não roda
  e o próximo `submit` em `create` pula o `create.mutate` e re-executa só o `afterCreate`.
  **Os 5 consumidores atuais não mudam de comportamento:** `photo.flush` não lança de propósito
  (`useEntityPhoto.ts:97-101`), então nunca aciona o caminho novo.
- **`extra`** — soma no `pending` e entra no `useMutationErrors`.

### 3.2 Guarda do Q-4 (mesmo arquivo, bloco `import.meta.env.DEV`)

Chave de `FORBIDDEN_PAYLOAD_KEYS` (hoje só `photo_url`) presente no payload lança, e **nenhuma
classificação salva**. A mensagem nomeia a razão: `#[Computed]` no DTO, `SignedUrlTransformer` na
saída, `PUT` devolvendo 200 em vez de 422.

### 3.3 `shared/ui/FormPhotoRow/` (novo, ~35 linhas + barrel)

Assina `{ name, photo, readOnly, children }`. Nome no molde `FormField`/`FormSection`/
`FormErrorBanner`, não `App*`: é composição de formulário, não primitivo envelopado.

### 3.4 Os quatro diálogos

| Arquivo | Hoje | Projetado |
|---|---|---|
| `StaffUserDialog.tsx` | **150** | ~131 |
| `StudentDialog.tsx` | 124 | ~105 |
| `ClientDialog.tsx` | 123 | ~104 |
| `RedatorDialog.tsx` | 125 | ~120 |
| `RedatorUserSection.tsx` | 56 | ~40 |

O Redator **segue montando `useEntityPhoto` à mão** e consome o `FormPhotoRow`; a razão substitui o
comentário de `RedatorDialog.tsx:86`, que hoje aponta para "decisão do BD-5" — este bloco.

### 3.5 `useCourseForm` (145 → ~110) e `CourseDialog`

`createdIdRef` morre; `sync` vira `mutateAsync` dentro do `afterCreate`; `extra: [sync]` cobre
`pending` e `fieldErrors`. `CourseDialog.tsx:39-43` troca o `mapped` literal por `{...errorSummary}`.

Classificação nova exigida pelo hook: `mapped` os quatro escalares
(`name`, `technical_name`, `description`, `workload_hours`), `summaryOnly: ['modules',
'redator_ids']`, `excludePrefixes: ['modules.']`. **`redator_ids` entra porque é a chave que o 422 do
`sync` traria**, e ela não está no payload do curso — chave classificada fora do payload não reprova
a guarda, que só olha as chaves que o payload produz.

## 4. Definition of Done

**Foto real chegando no S3, não lint verde** (lição 6: `Content-Type` fixado → `File` vira `{}` →
201 com arquivo vazio).

1. **E2E contra a API real, sessão Sanctum viva:** upload em `create` (buffer + `flush` pós-201) e em
   `edit`, com o objeto conferido no MinIO e o `photo_url` novo chegando na leitura seguinte.
   O `:8080` serve o **main tree**, que roda a execução paralela de `login-fora-do-adr16` (D6): a
   prova só vale com `git diff main...HEAD -- backend/` **vazio** naquele tree, conferido **no momento
   da prova**, não no início do bloco — a branch de lá está em movimento. Sem isso, a medição é de
   outra stack e não conta. O banco de dev também é compartilhado pelas duas execuções: os registros
   que o e2e criar entram no relatório e saem por `forceDelete`, como no BD-2.
2. **Resubmit após `afterCreate` reprovado não recria a entidade** — provado por teste de unidade em
   `useCrudForm.test.ts`, com o vermelho visto contra o código sem o mecanismo.
3. **Chave proibida no payload lança em DEV** — provado nos dois sentidos: sonda com `photo_url` no
   `toPayload` reprova nomeando a chave; árvore volta limpa.
4. **`busy` não contamina `pending`** — o botão de salvar não gira durante upload de foto.
5. O trio não sobrevive em lugar nenhum: zero ocorrência de `closeBlocked={pending || photo.pending}`
   e zero `afterCreate` de foto escrito à mão nos três diálogos que rodam sobre `useCrudForm`.
6. Ferramentas: `pnpm lint` exit 0, `pnpm build` verde, `pnpm test` acima do baseline de 29/143. Os
   quatro diálogos abaixo de 150.
7. Backend intocado: `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio.

## 5. Risco

**BAIXO pelo gate binário da `revisar-sprint`:** zero schema, zero `generated.ts`, zero Sanctum,
auditoria, RBAC, dinheiro escrito ou documento legal gerado; `executor: claude`.

**O risco próprio é de alcance, e está declarado:** `useCrudForm` tem **5 consumidores**
(`useClientForm`, `useBudgetForm`, `useRoleForm`, `useStudentForm`, `useStaffUserForm`) e o `submit`
muda para todos. A rede é que `photo.flush` não lança — o caminho novo nasce inalcançável para os
cinco — mas isso é premissa a **provar**, não a assumir.

## 6. Fora de escopo, por critério e não por corte

- **`useQuoteForm` e `useTurmaConfigForm`** — rota aninhada, não satisfazem `MutableResource` (D1).
- **`useRedatorForm`** — multipart com chave polimórfica; entra se o transporte deixar de ser
  multipart ou se o hook aprender a devolver `FormData` (D2).
- **O banner de `hasBufferedFailure`** segue repetido nos quatro diálogos, três linhas cada (D5).
- **Fechar o Q-4 no backend** com 422 no `PUT` — a raiz de verdade, recusada aqui por mudar a forma
  do erro em quatro rotas (D4). Continua aberto como débito.
