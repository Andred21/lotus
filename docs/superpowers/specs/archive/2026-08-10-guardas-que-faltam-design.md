# Design — `guardas-que-faltam`

> **BD-1** da seção de dívida do `backlog.md`, promovido explicitamente pelo João em 2026-08-10
> depois de o gate do `/planejar-bloco` reprovar por estado `idle`. Backend + frontend + doc.
> Zero schema, zero mudança de contrato HTTP, zero mudança de comportamento em runtime.
>
> Desenho aprovado pelo João em 2026-08-10, com quatro decisões respondidas por ele antes de
> qualquer linha desta spec: o que a guarda da lição 13 confere (D1), onde ela mora (D2), o escopo
> do teste do `useEntityPhoto` (D5) e a correção da frase vencida da rule (D6).

## 1. O ponto de partida, medido

Oito mecanismos que trocam instrução por reprovação automática. **Nenhum corrige defeito visível** —
a superfície dos oito está limpa hoje, medida em 2026-08-10 e não herdada de relatório:

| # | Guarda | Medição de hoje |
|---|---|---|
| 1 | §5.1 sem Repository, §5.2 sem trigger | 0 classe `Repository` em `backend/app/`; 0 `CREATE TRIGGER`/`DB::unprepared` em `backend/database/` |
| 2 | `NestedRouteOwnershipTest` conta segmentos | 96 rotas `api/`; **0** com ≥2 segmentos `{}` e <2 models tipados |
| 3 | `postMultipart` sem mock do axios | o `api` real fixa só `Accept: application/json` |
| 4 | referência de doc existe | 87 referências conferíveis em 10 docs; **3** não resolvem, e as 3 são negação deliberada |
| 5 | `mapped` ∩ `summaryOnly` | 5 hooks usam `useCrudForm`; **0** com chave nos dois |
| 6 | barrel de `shared/hooks` enxuto | 3 exports; **0** consumidores fora do próprio `useCrudForm.test.ts`, por caminho relativo |
| 7 | teste do `useEntityPhoto` | 161 linhas, **0** testes |
| 8 | P-25 na rule | a rule segue sem a linha |

É o mesmo perfil do `hardening-guardrails-e-transportes` de 2026-08-04, e a consequência é a mesma:
**o DoD não pode ser "suíte verde"**, porque ela já é. É guarda vista reprovando com sonda
deliberada (lição 10).

### 1.1 O precedente existe, e é um só

[`DomainDependencyTest`](../../../backend/tests/Feature/Shared/DomainDependencyTest.php) já é guarda
de arquitetura por varredura de código, e resolveu antes três problemas que a guarda 1 teria de
resolver de novo: comentário não conta como dependência (`token_get_all()` remove `T_COMMENT` e
`T_DOC_COMMENT` antes da varredura), FQN inline não escapa da regra, e forma não coberta pela
varredura é **banida** em vez de fingidamente coberta (o group use). A frase que ele carrega —
*"guardrail com escape conhecido é pior que nenhum"* — é o critério de aceite deste bloco inteiro.

O `state.md` da seleção diz que as guardas 1 e 4 são "peças sem precedente no repositório". Está
errado quanto à 1, e a correção entra no mesmo commit desta spec.

### 1.2 O container não enxerga a raiz do repositório

`docker-compose.yml` monta `./backend:/var/www` e `./frontend:/frontend`. `CLAUDE.md`,
`.claude/rules/` e `docs/` **não** estão montados — conferido de dentro do container, não deduzido
do arquivo. Um teste PHPUnit não tem como ler o doc que a guarda 4 confere; só passaria a ter com um
volume novo, que é mudar infra por causa de uma guarda de doc. É o mesmo racional que o bloco
anterior usou para recusar `libjpeg-turbo-dev` no `Dockerfile` (D-P1).

O vitest roda nativo no WSL, a partir de `frontend/`, e enxerga a raiz por `path.resolve`. É o único
runner do projeto com acesso ao que a guarda 4 precisa ler.

### 1.3 O corte do runner de frontend não é o que a doc diz

`.claude/rules/frontend-fsliced.md:161-167` afirma que o runner "cobre os hooks de `shared/hooks/`" e
que teste de componente com PrimeReact segue fora. Existem hoje **8 testes de hook de feature** —
`useBudgetForm`, `useClientForm`, `useRoleForm`, `useStaffUserForm`, `useStudentForm`,
`useBatchIssue`, `useValidationPage`, `useRegisterResult` —, todos com `renderHook` +
`QueryClientProvider`, e o `useBudgetForm.test.tsx` até documenta por que mora na feature (teste em
`shared/` importando `features/` quebraria a lei §5.6).

A frase está vencida: é lição 13 dentro do arquivo que a guarda 8 já vai abrir. Duas consequências —
a correção entra neste bloco (D6), e a guarda 7 tem molde pronto em vez de infra a inventar.

## 2. As decisões de abertura (D1–D6)

**D1 — a guarda da lição 13 confere referência de código, não comando.** A versão registrada no
BD-1 ("todo comando citado nos `§Comandos` das rules existe como script em
`package.json`/`composer.json`, e vice-versa") não fecha honesta: só 2 das 4 rules têm `## Comandos`,
o que elas citam é `docker compose exec -T app php artisan …` e `pnpm …`, **nenhum** é script de
`composer.json`, e o "vice-versa" reprovaria no dia 1 contra `setup`/`post-autoload-dump`, que doc
nenhuma cita. As três reincidências reais da lição 13 foram outra coisa: o ADR-15 mandando por uma
arquitetura que nunca existiu, as leis mandando por DTO em `app/Data` (pasta que nunca existiu) e a
nota do ADR-12 citando `LibreOfficeConverter` (classe que nunca existiu, Q-5 do bloco anterior). A
guarda confere **path e arquivo citados em doc normativo**.

**D2 — ela mora no vitest, em `frontend/tests/repo-docs-refs.test.ts`.** Consequência direta da
§1.2. O `include` do `vite.config.ts` passa de `["src/**/*.test.{ts,tsx}"]` para
`["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"]`. O arquivo carrega, escrito nele, o motivo de um
teste sobre docs do repositório morar dentro de `frontend/`.

**D3 — exceção é lista declarada, não heurística de vizinhança.** As 3 referências que não resolvem
são citação deliberada de coisa inexistente: `generated-types.md:16` escreve **"Não existe
`app/Data`"**, `docs/README.md:88` é a própria lição 13 citando a mesma pasta, e
`estrutura-monolito.md:192` lista `app/Domains/` vs `src/Domains/` como alternativa em aberto.
Detectar isso por vizinhança de texto ("não existe", "nunca existiu", "vs") é frágil, e guarda frágil
cai na frase do `DomainDependencyTest`. Vira lista com o motivo ao lado, molde do `ALLOWED`: lista
que só encolhe, e ampliar é 1 linha mais justificativa no commit.

**D4 — o escopo é doc normativo.** Dentro: `CLAUDE.md`, `INSTRUÇÕES-DO-PROJETO.md`,
`.claude/rules/*.md`, `docs/README.md`, `docs/adrs.md`, `docs/der-fisico.md`,
`docs/estrutura-monolito.md`. Fora: `docs/superpowers/**` (progress, state, plans e specs são
histórico e congelam referência morta de propósito — `ManualPdfService` é o exemplo de ontem) e
`docs/pendencias.md`, que **registra** divergência e portanto cita o que não existe por natureza.
Também ficam fora glob (`src/features/*/components/**`), placeholder (`<Dominio>`, `XData.php`) e
`Drive/…`, que é fonte externa ao repositório.

**D5 — o teste do `useEntityPhoto` cobre seis casos**, escolhidos por corresponderem aos comentários
que o próprio hook carrega descrevendo armadilha já pensada: buffer no `create` sem request; `flush`
subindo o buffer; `flush` que falha **não** lançando e ligando `hasBufferedFailure`; `onRetry`
reenviando para o `retryId` e não para a prop `id`; `sizeError` apagando o `onRetry`; `onRemove` em
`create` limpando sem request. O revoke do objectURL fica fora — é o único comportamento do hook
sem consequência visível para o usuário.

**D6 — a frase vencida da §1.3 é corrigida neste bloco**, no mesmo commit da P-25, porque o commit
já abre o arquivo. Passa a descrever o corte real: hooks de `shared/hooks/` **e** hooks de feature
por `renderHook`, com componente PrimeReact no jsdom seguindo fora.

## 3. As oito guardas

### 3.1 Backend — guardas 1 e 2

**1 · `backend/tests/Feature/Shared/PersistenceLawsTest.php`**, molde do `DomainDependencyTest`:
varredura com `token_get_all()`, um `assertSame([], …)` por lei, com diagnóstico separado.

- **§5.1** — nenhuma classe em `backend/app/` com nome terminando em `Repository`. A varredura é
  sobre `app/` inteiro, não só `Domains/`: a lei não abre exceção para `Shared/`, e foi assim que a
  superfície foi medida. `QueryBuilders/` fica **explicitamente fora**: `TurmaQueryBuilder` e
  `EnrollmentQueryBuilder` são o padrão aprovado pelo ADR-02, e uma varredura por semelhança de nome
  os reprovaria. A distinção é a razão de a lei nomear "Repository **sobre Eloquent**".
- **§5.2** — nenhum `CREATE TRIGGER` nem `DB::unprepared` em `backend/database/`. A varredura é sobre
  migrations e seeders, e a segunda forma existe porque trigger em Laravel entra por `DB::unprepared`,
  não por sintaxe de schema builder.

**2 · `NestedRouteOwnershipTest` deixa de filtrar por assinatura.** Hoje ele lê
`$route->signatureParameters(['subClass' => Model::class])` e faz `continue` quando `count < 2` — uma
rota com dois segmentos `{}` e binding não tipado sai do universo do teste **em silêncio**, que é o
escape conhecido. Passa a contar os `{}` da URI: ≥2 segmentos com <2 models tipados vira reprovação
nomeando a rota, com a instrução de tipar o binding. Zero rotas reprovam hoje.

### 3.2 Frontend — guardas 3, 5, 6 e 7

**3 · caso sem mock em `postMultipart.test.ts`.** O arquivo abre com
`vi.mock('./axios', …)`, então nada exercita a instância real. O caso novo importa o `api` de
verdade e afirma que `Content-Type` está **ausente** de `defaults.headers` (`common`, `post`, `put`,
`patch`) — a lição 6 no lugar onde ela pode ser quebrada, que é alguém acrescentar um header ao
`axios.create`. Risco declarado: importar `./axios` puxa `@shared/config/i18n`; se o i18n não
inicializar sozinho em jsdom, o caso precisa de um `beforeAll`, e isso é detalhe de execução, não
mudança de desenho.

**5 · `unclassifiedPayloadKeys` ganha a recíproca.** Hoje ela só testa **ausência** nas duas listas.
Chave declarada em `mapped` **e** em `summaryOnly` é declaração contraditória — o campo mostra o
próprio erro e o resumo mostra também — e passa despercebida. A reprovação sai no mesmo idioma da
que já existe, apontando a chave e as duas listas.

**6 · `shared/hooks/index.ts` perde `unclassifiedPayloadKeys`, `MutableResource` e
`CrudFormOptions`.** Duas linhas; o único consumidor é `useCrudForm.test.ts`, que já importa por
`./useCrudForm`. Barrel é fronteira pública: símbolo interno exposto ali é convite a acoplamento que
ninguém pediu.

**7 · `useEntityPhoto` ganha teste**, molde do `useBudgetForm.test.tsx` (`renderHook` +
`QueryClientProvider`), com os seis casos da D5. Mora em `src/shared/hooks/useEntityPhoto.test.ts` —
o hook é de `shared/`, e diferente dos hooks de formulário não há lei §5.6 a contornar.

### 3.3 Doc — guardas 4 e 8

**4 · `frontend/tests/repo-docs-refs.test.ts`**, conforme D1–D4. Extrai de cada doc os tokens entre
crases que parecem path, descarta padrão/placeholder/`Drive/`, e resolve contra a raiz tentando as
bases que o projeto usa ao citar (`backend/`, `frontend/`, `frontend/src/`, `backend/app/`, `docs/`)
— porque a doc cita `shared/api/axios.ts` e `Domains/Catalog/Data/CourseData.php` relativos ao
projeto de que falam, e exigir path absoluto reprovaria 30 referências corretas.

**8 · `.claude/rules/frontend-fsliced.md`** recebe a linha da **P-25** ("hook genérico não importa
tipo de `shared/ui`", com `useFilePreview` e `SearchableTableFrame` como os dois casos medidos) e a
correção da frase vencida da §1.3.

## 4. Ordem e commits

Oito commits, um por guarda, nesta ordem: **1, 2** (backend), **3, 5, 6, 7** (frontend), **4, 8**
(doc). Backend primeiro porque é a metade que a P-04 data; doc por último porque a guarda 4 confere
o estado final dos arquivos que a 8 acabou de editar. Cada commit carrega a guarda **e** a evidência
da sonda que a viu vermelha.

## 5. O que prova (DoD)

1. **As oito vistas vermelhas**, cada uma com sonda deliberada e o texto da reprovação registrado:
   uma classe `FooRepository` de sonda; uma rota nested com binding sem tipo; um `Content-Type`
   acrescentado ao `axios.create`; um path inventado num doc normativo; uma chave nas duas listas de
   um hook; e, para a 7, o comportamento correspondente quebrado no hook.
2. **Backend no placar de sempre mais o teste novo** — a linha de base é 522 passed, 1 skipped
   (1961 assertions), medida no fechamento do bloco anterior.
3. **Frontend**: `pnpm lint` limpo, `pnpm build` verde, e a contagem saindo de **13 arquivos / 47
   testes** para **15 arquivos** — `repo-docs-refs.test.ts` e `useEntityPhoto.test.ts` são os dois
   arquivos novos; as guardas 3 e 5 acrescentam caso a arquivo existente.
4. **`git diff` de `backend/database/` vazio** — zero schema.
5. **Zero mudança de comportamento para o usuário**: nenhuma rota, DTO, tela ou payload muda. Três
   arquivos de produção são tocados, e o que cada um faz está declarado: `shared/hooks/index.ts`
   perde export sem consumidor (guarda 6); `useCrudForm.ts` ganha **uma reprovação a mais dentro do
   `import.meta.env.DEV` que já existe** (guarda 5) — é o mecanismo dela, e por construção não
   alcança o bundle de produção; e `vite.config.ts` amplia o `include` do runner (D2), que é build,
   não runtime.
6. **`typescript:transform` sem diff** em `generated.ts` — nenhum DTO é tocado.

## 6. Fora de escopo

Os outros seis BDs. Qualquer correção de defeito visível. Numerar os 12 débitos sem ID (decisão de
formato do João). Ampliar a guarda 4 para além de path — conferir afirmação sobre existência de
teste ou de comando foi considerado e recusado nesta rodada. O revoke do objectURL na guarda 7. E a
`docs/pendencias.md`: as linhas da **P-04** e da **P-25** **não** fecham por este bloco existir —
fecham no `/fechar-sprint` que provar o DoD acima.

## 7. Risco de review

**MÉDIO.** O bloco não toca schema, auth, RBAC, dinheiro, documento legal nem `generated.ts`, e não
é execução delegada — nenhum dos gatilhos de ALTO se aplica. O risco próprio é outro e é específico:
**guarda que promete cobrir e não cobre**. Cinco das oito são varredura de texto ou de arquivo, e
varredura tem escape por construção. O foco do review é um só — para cada guarda, existe uma forma
de violar a lei que ela **não** pega? Se existir e não estiver banida explicitamente, é achado.

## 8. Isolamento

Branch `hardening/guardas-que-faltam`, criada de `7e76db4`, **no main tree** — as guardas 1 e 2
tocam backend e a P-03 continua não vencida (nenhum outro bloco de backend aberto). Sem worktree.
