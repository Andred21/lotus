# Backlog — Lotus v2

> Fila ordenada de trabalho futuro. **Não representa a etapa atual** e não deve ser usada por
> `/executar-bloco`. Itens presentes aqui **não estão ativos**: somente uma alteração explícita em
> `state.md` promove um item, e o backlog nunca promove trabalho sozinho.
>
> **Planejamento just-in-time (CLAUDE.md §4):** o roadmap adiante vive como título e escopo, não
> como plano pronto que envelhece. Spec e plano de um bloco se escrevem imediatamente antes de
> executá-lo.

## Convenções

| Prefixo | O que é | Onde mora o detalhe |
|---|---|---|
| `BD-*` | **Bloco de execução de dívida** — agrupa pendências e débitos que saem baratos juntos | aqui |
| `D-*` | **Débito técnico** — defeito ou lacuna medida no código | aqui, na seção `## Débitos técnicos` |
| `P-*` | **Pendência** — divergência entre doc/mecanismo e realidade | `pendencias/abertas.md` |

**Agrupar não promove.** Um `BD` é ponteiro: a pendência continua em `pendencias/` e o débito
continua em `## Débitos técnicos`, com o mesmo ID, até o bloco ser aplicado e o `/fechar-sprint`
correspondente removê-los. Afinidade que justifica agrupar: **mesmo arquivo, mesma entidade, mesmo
módulo, mesmo domínio ou mesma frente** (backend × frontend).

---

# Sprints planejadas

## Sprint 5 · Dashboard

Central read-only operacional e analítica, com experiências distintas para Administrativo e Redator.

- **Contexto canônico:** Drive `Planejamento/dashboard-escopo-funcional-analitico.md`
- **Execução detalhada:** Notion EAP 8.4.0–8.4.7
- **Exige `context_required`** antes do planejamento — o escopo é canônico do Drive, não do
  repositório, então o Context Packet vem antes do `/planejar-bloco`.

**Nenhum bloco restante** — o bloco A, `dashboard-backend-agregacoes`, foi entregue em 2026-08-15;
o B1, `dashboard-frontend-central-controle`, em 2026-08-16; e o B2,
`dashboard-frontend-analitico-e-redator`, em 2026-08-17 (ver `historico/progress.md`). O contrato do
payload está em `specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` e os tipos, em
`generated.ts`:

1. ~~**`dashboard-frontend-central-controle`** (B1)~~ — entregue em 2026-08-16
   (`plans/archive/2026-08-15-dashboard-frontend-central-controle.md`). Levou as 5 seções que
   respondem *"o que tenho para fazer agora"*: KPIs, pendências, alertas, agenda e pipeline.
2. ~~**`dashboard-frontend-analitico-e-redator`** (B2)~~ — entregue em 2026-08-17
   (`plans/archive/2026-08-17-dashboard-frontend-analitico-e-redator.md`). Levou a outra metade:
   as 5 séries mensais, os 2 rankings, `compliance_turmas`, a carga de redatores e a view do
   Redator inteira. **A P-44 continua aberta** — a carga mostra dois usuários de sonda, declarados
   pela D10 em vez de apagados. O que bloqueava o VALOR desta view **caiu em 2026-08-19**: o
   `identity-ativacao-acesso-redator` entregou convite, primeiro acesso, recuperação e revogação
   (`plans/archive/2026-08-18-identity-ativacao-acesso-redator.md`), então o redator já autentica e
   alcança a própria view.

**Administrativo:** visão global de Comercial → Operação → Certificação, pendências, riscos,
compliance e análises.

**Redator:** visão exclusivamente própria — turmas atuais/próximas, agenda, documentação das suas
turmas, pendências, compliance pessoal e histórico/indicadores profissionais permitidos.

**O Dashboard não executa mutações.** CTAs apenas direcionam ao módulo dono da ação.

**Direção futura registrada no Drive:** as projeções do Dashboard poderão alimentar uma central de
notificações interna e, depois, canais como e-mail. **Notifications não entra nesta sprint.**

## Sprint 6 · Meu Perfil

Área self-service de identidade, segurança e, para Redator, documentação profissional.

- **Contexto canônico:** Drive `Planejamento/meu-perfil-escopo-funcional.md`
- **Execução detalhada:** Notion EAP 8.5.1–8.5.9
- **Exige `context_required`** antes do planejamento, pelo mesmo motivo da Sprint 5.

**Dois blocos sequenciais, os dois entregues:**

1. ~~**`meu-perfil-backend-self-service`**~~ — entregue em 2026-08-15
   (`plans/archive/2026-08-14-meu-perfil-backend-self-service.md`).
2. ~~**`meu-perfil-frontend`**~~ — entregue em 2026-08-17
   (`plans/archive/2026-08-15-meu-perfil-frontend.md`). Levou a página em duas colunas com corte por
   mutabilidade: identidade e resumo à esquerda, e à direita exatamente o que é self-service —
   dados pessoais, troca de senha e os quatro slots documentais do Redator.

**Escopo do self-service:** Admin e Redator alteram apenas dados pessoais permitidos e a própria
senha. **E-mail, RUT, role, permissões, `type` e `is_active` não são self-service.**

**Exclusivo do Redator:** upload/substituição dos próprios documentos regulatórios e resumo de
idoneidade profissional, cursos habilitados, ~~turmas atuais/próximas e pendências~~.

> **Turmas e pendências NÃO foram entregues, e não é lacuna de execução.** A **D1** da spec do bloco
> 1 as cortou do contrato por decisão do João, para não abrir aresta de `Identity` para `Operation`
> antes do bloco do Dashboard — `RedatorProfileData` tem `cursos_habilitados` e `cursos`, e nada de
> turma. Reabrir isso é decisão de escopo, não conserto: quem responde *"o que tenho para fazer"* é o
> Dashboard do Redator, que vive no **B2** da Sprint 5.

**O resumo profissional não substitui o Dashboard do Redator.** Meu Perfil responde *"quem sou e
qual minha situação profissional"*; o Dashboard responde *"o que tenho para fazer e como está minha
operação"*.

---

# Próximos blocos

1. **Administração · Roles e permissões — redesenho de composição.** O protótipo tem layout dividido
   (lista de roles à esquerda; detalhe + matriz de permissões à direita, com marcação de permissão
   essencial); o real tem tabela + diálogo. **Não é refinamento visual, é redesenho de tela** — exige
   brainstorming. Task Notion: "Tela de Administração — Roles e Permissões". Respeitar ADR-07
   (permissões essenciais não editáveis).
2. **Hardening** — ownership em rotas nested e política de retenção documental.
---

# Blocos de execução de dívida

> **Fila vazia até promoção explícita do João.** BD-1..BD-9 foram entregues entre 2026-08-11 e
> 2026-08-14, o **BD-16** em 2026-08-18 e o **BD-17** em 2026-08-20 — cada um saiu desta lista com os
> débitos que cobria (o BD-17 levou D-51, D-52 e D-53), e o histórico está na linha da entrega em
> `historico/progress.md`. O BD-16 levou junto o **BD-10**, que ele havia absorvido em 2026-08-17 e
> que nunca chegou a ser promovido. Os BD-11..BD-15 abaixo são o que sobrou do reagrupamento de
> 2026-08-14; o **BD-18** é posterior — nasceu em 2026-08-20, do que o review e o fechamento do BD-17
> mediram. **Nenhum foi promovido.**

## BD-11 · Frontend · shell: navegação no toque

**Cobre:** D-03 · **Frente:** frontend

**A P-34 saiu deste bloco em 2026-08-16, cumprida e não descartada.** A catraca `COR_HARDCODED`
entrou em `src/app/**` sem `ignores` pela **D11** do `dashboard-frontend-central-controle`, com os 3
sítios do shell convertidos para `--shell-ink`/`--shell-ink-muted` e a regra provada nos dois
sentidos. Ficha em `pendencias/encerradas.md`. **O bloco fica só com a D-03** — e, sem a afinidade
que juntava os dois, ele deixou de sair barato em conjunto.

- **D-03** — menu recolhido a 390 tira o rótulo do DOM e deixa só `title`: no toque não há hover,
  então o nome do item de navegação fica inalcançável.

**DoD:** o nome do item de navegação alcançável no toque a 390px, medido no dispositivo emulado — não
o atributo novo no DOM.

## BD-12 · Frontend · o ramo "catálogo vazio" que sobrou do BD-6

**Cobre:** P-40 · **Frente:** frontend

**A D-14 saiu deste bloco em 2026-08-20, para o BD-18, e não foi descartada.** Ela orbita
`useLoadState`, e o BD-18 é o bloco que abre esse arquivo — deixá-la aqui obrigaria a reabri-lo duas
vezes. O DoD dela ("o teste do ramo COM cache em cada sítio") foi junto. **O bloco fica só com a
P-40**, que não é código: é remedição, e o que a trava é ambiente.

- **P-40** — remedição do ramo "catálogo genuinamente vazio" contra HEAD. Depende de conseguir
  esvaziar o catálogo de dev (seeder de cenário, endpoint de teste, ou o João rodando o comando).

> A **P-38** saía deste bloco e foi **encerrada antes**, em 2026-08-16, pelo gatilho literal dela: o
> `meu-perfil-frontend` tocou `frontend-fsliced.md` por outro motivo e trocou a frase pelo corte
> medido com o runner (`pendencias/encerradas.md`).

**DoD:** o ramo vazio medido contra HEAD com o catálogo de dev **de fato** vazio — não a mesma
sonda de `d20bebc` recitada.

## BD-14 · Backend · o que a entrada pode escrever

**Cobre:** D-13, D-12, P-29, P-35 · **Frente:** backend
**Afinidade:** os quatro são contrato de entrada — o que o corpo da requisição pode e não pode
escrever, e o que acontece quando ele omite ou quando dois corpos chegam juntos. Três deles tocam o
caminho de escrita de identidade (`UpdateStaffUserAction`, `UserProvisioner`, DTOs com foto).

- **D-13** — `UpdateStaffUserAction` apaga o `rut` num `PUT` que só o **omite**.
- **D-12** — o backend aceita chave `#[Computed]` (`photo_url`) no corpo e devolve 200 em silêncio,
  nos quatro DTOs com foto.
- **P-29** — corrida de unicidade **entre transações** ainda sobe 500 em vez de 422.
- **P-35** — `seq_in_budget` por mass assignment enquanto `version` saiu do `$fillable`; dois
  consumidores do ADR-17 com defesas diferentes.

**Decisão do João dentro do bloco, não antes:** D-13 muda contrato de entrada (preservar o valor
atual quando a chave falta × exigir a chave no `PUT`) e D-12 decide se chave computada no corpo vira
422 ou segue ignorada. **DoD é o teste que mostra o RUT sobrevivendo à omissão, não o `if` novo.**

**Escopo remedido em 2026-08-18 contra `b758068` (revisão de arquitetura, sem promoção).** Os dois
débitos deste bloco estavam registrados menores do que são, e a diferença muda o desenho, não só a
contagem: a D-13 não é um `if` num campo, é **uma decisão de contrato copiada em 5 Actions**, e a
D-12 vale para **11** campos de foto, não 4. O detalhe de cada uma está na linha delas em
`## Agrupados em bloco`.

**Consequência para a P-35, medida e não suposta:** o alcance real da D-13 inclui
`UpdateQuoteAction:30-32`, então quem executar este bloco **toca `Quote` por outro motivo** — que é
o gatilho literal da ficha da P-35. Ela deixa de depender de payload observado e passa a fechar
dentro do bloco.

**Um achado de desenho para o brainstorming, não uma task:** a resposta "preservar na omissão" já
existe escrita **uma vez**, em `UpdateStudentAction.php:31`
(`$data->phone instanceof Optional ? $user->phone : $data->phone`), e nunca foi propagada. O mesmo
campo `phone` tem hoje três comportamentos — apaga em `UpdateStaffUserAction:53`,
`UpdateClientAction:42` e `UpdateRedatorAction:63`; preserva em `UpdateStudentAction:31`; e é pulado
por `if` em `UpdateProfileAction:23`. Concentrar a tradução `Optional` → atributo num módulo só é o
que dá à decisão do João **um** lugar para ser tomada.

## BD-15 · Docs e guardas de documentação

**Cobre:** P-20, P-21, P-23, P-32, P-39, D-08 · **Frente:** documentação e mecanismo
**Afinidade:** três tocam `docs/adrs.md`, dois tocam a guarda que confere doc contra código
(`repo-docs-refs.test.ts`), e todos são a lição 13 na forma dela — doc que afirma o que não é.

- **P-20** — `openspout/openspout` em produção sem ADR hospedeiro. **Decisão do João:** qual ADR
  hospeda, ou ADR-20 novo.
- **P-21** — `simple-qrcode` sem a nota no ADR-12; hospedeiro já é óbvio, falta escrever.
- **P-23** — `progress.md` sem a coluna `Contexto`. **Decisão do João:** restaurar ou declarar a
  mudança no cabeçalho.
- **P-32** — a guarda da lição 13 confere path, não classe. Espera reincidência **por classe** para
  desenhar o seletor sem falso-positivo.
- **P-39** — a premissa de RBAC do plano do BD-6 está errada; corrigir **na fonte que for reusada**,
  não retro-editando o plano.
- **D-08** — a §5.3 (`generated.ts` não se edita à mão) segue sem mecanismo.

**Nota de método:** P-20 e P-21 vivem no mesmo arquivo, então a decisão de numeração sai numa
sentada só — é o que torna o agrupamento barato.


## BD-18 · Frontend · `useLoadState`: a promise, a forma e os dois ramos crus

**Cobre:** D-54, D-56, D-14 · **Frente:** frontend
**Afinidade:** os três pousam no **mesmo arquivo**. D-54 é o `refetch` dele, D-56 é a forma que ele
deveria ser o único a montar, e D-14 são os dois últimos consumidores que ainda ramificam sem ele.
Separados, cada um reabre `shared/hooks/useLoadState.ts` por conta própria.

- **D-54** — o `refetch` engole a promise que o `AppErrorState` aguarda (contrato Q-14).
- **D-56** — a forma normalizada de lista é montada à mão, não espalhada de um lugar só.
- **D-14** — `RedatorCourseSelector:38` e `CourseRedatoresSection:28` ainda ramificam por `isError`
  cru, apagando cache utilizável.

**Escopo medido em 2026-08-20 contra `6edf1224`, e ele é MAIOR do que as duas fichas registravam.**
`shared/hooks/useResourceState.ts` — irmão do `useLoadState` para payload de objeto, consumido pelo
`useProfilePage` — carrega **as duas** grafias: o mesmo
`loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null` (`:35`) e o mesmo
`refetch: () => { void query.refetch() }` (`:40-42`). Logo são **2** hooks compartilhados engolindo a
promise, não 1, e **6** sítios montando a forma à mão, não 5. As fichas dos dois débitos foram
remediadas com isso.

**Ordem interna: D-56 antes de D-54.** Extrair o normalizador primeiro faz a promise nascer certa nos
seis sítios de uma vez; corrigir a promise antes é consertar duas cópias que o passo seguinte
apagaria. D-14 vem por último — os dois consumidores só adotam `failedWithoutData` depois que a
política tem dono único.

**Uma fronteira medida, para o desenho não escorregar:** `useDashboard.ts:124-129` declara por que
**não** usa `useLoadState` — a assinatura é `UseQueryResult<T[]>`, de LISTA, e ali o dado é objeto
único com seções anuláveis. O normalizador de lista continua de lista; quem serve objeto é o
`useResourceState`. Unificar os dois numa peça só é decisão de desenho, não consequência do bloco.

**DoD:** (1) o "Reintentar" de um `AppErrorState` vivo permanecendo em `loading` enquanto o GET está
em voo — provado com catraca de teste **e** no navegador, num dos sítios reais
(`QuotesList.tsx:60`/`:74`, `BudgetDialog.tsx:85`, `CourseRedatoresSection.tsx:33`); (2) o teste do
ramo **COM cache** em cada sítio do D-14 — o BD-6 mostrou que forçar `list: []` no teste de falha
deixa a regressão passar verde; (3) a linha de rule do D-56 escrita em
`.claude/rules/frontend-fsliced.md` **no mesmo commit** que zera o último sítio, nunca antes.

---

# Débitos técnicos

> Registro canônico de cada débito. A cobertura por bloco está mapeada acima; **entrar num BD não
> move nem apaga a linha daqui** — a remoção acontece só depois do bloco aplicado e do
> `/fechar-sprint` correspondente.
>
> Os IDs `D-*` nasceram no reagrupamento de 2026-08-14: até então **12 dos débitos desta página não
> tinham número** e eram citados pelo título em negrito, o que tornava impossível mapeá-los a bloco
> sem repetir o texto. Uma linha saiu no mesmo passo por ser **duplicata, não por estar resolvida**:
> "consolidar as migrations adicionais nas originais" já vivia como **P-05**, com o mesmo gatilho
> ("antes de subir para produção"), e um débito com dois donos diverge dos dois.

## Agrupados em bloco

- **D-03 · Menu recolhido a 390 tira o rótulo do DOM e deixa só `title`** → **BD-11**. No toque não
  há hover, então o nome do item de navegação fica inalcançável
  (`src/app/layouts/Sidebar/SidebarItem.tsx`).

- **D-08 · A lei §5.3 segue sem mecanismo** → **BD-15**. A linha original pedia Arch tests no backend
  mais `eslint-boundaries` no frontend; **as duas partes nomeadas existem** e foram remedidas em
  2026-08-14 contra `977586e`, não herdadas de relatório: `PersistenceLawsTest` cobre §5.1 (classe
  `Repository` sobre Eloquent), §5.2 (`CREATE TRIGGER`/`unprepared()` em `database/` e `app/`), a
  escrita de pivot sem auditoria e a coleção nested read-write — quatro testes, com o escape da
  primeira declarado no docblock do próprio arquivo (a exclusão de `QueryBuilders/` é por path, então
  um `FooRepository.php` dentro dela escaparia; reprovar por semelhança de nome mataria
  `TurmaQueryBuilder`, que é o padrão do ADR-02); e a §5.6 virou `no-restricted-imports` no
  `eslint.config.js`, nas **três** fronteiras (feature→PrimeReact, feature→feature em quatro grafias,
  `shared/`→feature), por mecanismo diferente do `eslint-boundaries` que a linha nomeava e com o
  mesmo efeito. **O que falta é a §5.3:** `generated.ts` não se edita à mão, e o único mecanismo hoje
  é `globalIgnores` no lint (`eslint.config.js:158`), que apenas **tira o arquivo do corte** — não
  impede edição nenhuma. As §5.4 (Sanctum), §5.5 (RN-01), §5.7 (financeiro) e §5.8 (DoD) seguem sem
  guarda e sem desenho medido, então não entram aqui como promessa. Teste que roda o
  `typescript:transform` e compara com o commitado é a candidata óbvia — ela reprova sozinha se
  alguém editar à mão. **DoD é a sonda:** editar `generated.ts` e ver o mecanismo reprovar nomeando o
  arquivo.
- **D-12 · O backend aceita `photo_url` no corpo da escrita e devolve 200, em silêncio** →
  **BD-14**. **Alcance remedido em 2026-08-18** contra `b758068`: são **11** campos de foto em 11
  DTOs — `StudentData:48`, `RedatorData:45`, `UserData:45`, `ClientData:66`, `ProfileData:32`,
  `SessionUserData:29`, `EnrollmentData:36`, `TurmaData:54` (`client_photo_url`),
  `TurmaRedatorData:28`, `CertificateData:41` (`aluno_photo_url`) e `EmissionPanelEnrollmentData:34`
  (`student_photo_url`) —, não os 4 que o registro herdou do Q-4. Os 7 que faltavam nasceram na
  `celula-de-identidade` (2026-08-14) e no Meu Perfil, depois da linha ter sido escrita. Resíduo medido do Q-4 (review de 2026-08-05), que o BD-5 fechou **só do lado do
  frontend**: `FORBIDDEN_PAYLOAD_KEYS` no `useCrudForm` faz a chave lançar em DEV, então o `...form`
  ingênuo não a reintroduz mais. O defeito do outro lado foi **remedido no `/fechar-sprint` de
  2026-08-13**, não herdado: `PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo
  devolve **200**, e o campo volta `null` na resposta — a promoção no construtor do DTO desvia do
  `CannotSetComputedValue`, então o campo `#[Computed]` é ignorado sem 422. Vale para os quatro DTOs
  com foto, não só o `ClientData` que o texto original do Q-4 nomeava. **Uma afirmação do Q-4
  original não sobreviveu à medição:** `photo_url` **não** carrega path interno de storage — o
  `SignedUrlTransformer` roda na serialização e o front recebe URL pré-assinada.
- **D-13 · A omissão apaga o valor guardado, em 10 campos de 5 `Update*Action`** → **BD-14**.
  **Título e escopo remedidos em 2026-08-18** contra `b758068`: o registro original nomeava um campo
  (`rut`) numa Action, e a medição achou o mesmo idiom — `instanceof Optional ? null : $x` — em
  `UpdateStaffUserAction:44,53` (`rut`, `phone`), `UpdateClientAction:42,48` (`phone`,
  `business_activity`), `UpdateCourseAction:30,31` (`technical_name`, `description`),
  `UpdateQuoteAction:30,31,32` (`purchase_order`, `planned_start_date`, `planned_end_date`) e
  `UpdateRedatorAction:63` (`phone`). As `Create*Action` usam a mesma forma e **não** são defeito —
  não há valor anterior a apagar. O texto original segue abaixo, porque a medição do `rut` continua
  correta; o que mudou é o alcance.
  `UserData::$rut` é `Optional`, e a Action traduz `Optional` para `null` antes de gravar
  (`($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut`,
  `UpdateStaffUserAction.php:44`): quem manda o formulário sem a chave zera o RUT de um usuário que
  tinha. É a mesma classe do defeito que o bloco `contrato-de-entrada-identidade-e-nested` fechou nas
  coleções nested — omissão virando apagamento —, num campo escalar. **Pré-existente e fora do escopo
  daquele bloco**, que só atravessou o arquivo para trocar a checagem de unicidade pela porta única.
- **D-14 · `RedatorCourseSelector` e `CourseRedatoresSection` ainda ramificam por `isError` cru** →
  **BD-18** (saiu do BD-12 em 2026-08-20). É o terceiro e o quarto sítio do padrão que o review do BD-6 (2026-08-14) transformou em
  regra — falha que apaga cache utilizável — e os dois ficaram **fora do escopo** daquele bloco, que
  só cobria os três sítios da spec (wizard, card de cotações, dropdown de cliente). Depois do
  `useLoadState` o fix é de uma linha em cada um: trocar `courses.isError` / `redatores.isError`
  (`RedatorCourseSelector.tsx:38`, `CourseRedatoresSection.tsx:28`) por `failedWithoutData` no ramo
  que substitui a tela, e mandar a falha com cache para um `InlineLoadState` ao lado da lista.
- **D-54 · Dois hooks de `shared/hooks` engolem a promise do `refetch`, e 7 consumidores espalham
  isso** → **BD-18**.
  Medido em 2026-08-20 durante o BD-17 (revisão final do branch), contra `1d61b28`.
  `useLoadState.ts:51-53` devolve `refetch: () => { void query.refetch() }` — descarta a promise que
  o `AppErrorState` aguarda (`AppErrorState.tsx:33-40`) para manter o "Reintentar" em `loading`
  enquanto o GET está em voo. O botão pisca e volta no mesmo tick. É exatamente o contrato Q-14, que
  o BD-17 mediu, **contornou** (por isso o `useTurmasPage` nasceu com `refetch: () => query.refetch()`
  em vez de usar o `useLoadState`) e não corrigiu na origem, porque corrigir ali é outro bloco.
  Alcance medido: os 6 chamadores reais **do `useLoadState`** são `useQuotesListCourses.ts:10`, `useQuoteCourseSearch.ts:12`,
  `useCommercialClients.ts:11`, `useCourseRedatores.ts:19`, `useStudentClients.ts:14` e
  `useRedatorCourses.ts:13`; o `refetch` deles chega a um "Reintentar" vivo em pelo menos
  `QuotesList.tsx:60` e `:74`, `BudgetDialog.tsx:85` e `CourseRedatoresSection.tsx:33`.
  **Custo se ficar:** o contrato Q-14 vale só onde alguém o reescreveu à mão, e a próxima tela que
  usar `useLoadState` herda a regressão sem quebrar tipo nem teste. **Correção:** uma linha
  (`refetch: () => query.refetch()`) mais varredura dos sítios e um teste de catraca no
  `useLoadState`. **Não é regressão do BD-17** — é anterior a ele; o BD-17 só o mediu.
  **Alcance remedido em 2026-08-20** contra `6edf1224`, na medição que montou o BD-18:
  `useResourceState.ts:40-42` — o irmão do `useLoadState` para payload de objeto, consumido
  pelo `useProfilePage` — carrega o MESMO `refetch: () => { void query.refetch() }`. São
  **dois** hooks compartilhados engolindo a promise, não um, e **sete** consumidores no total.

- **D-56 · A forma normalizada de lista é montada à mão em 6 sítios, e a política já divergiu uma
  vez** → **BD-18**.
  Medido em 2026-08-20 no review do BD-17 (Q-2), contra `ae102f11`. O par
  `error: isError ? (error ?? ({} as ProblemDetails)) : null` + `refetch: () => query.refetch()` —
  a política "falhou" vs. "veio vazia", mais o contrato Q-14 — está escrito por extenso em
  `shared/hooks/useCrudPage.ts:56`, `shared/hooks/useArchivedPage.ts:78`,
  `shared/hooks/useLoadState.ts:39` e nos dois aliases que o BD-17 criou
  (`features/operation/hooks/useTurmasPage.ts` e `usePendingQuotesPage.ts`). O BD-17 fez o certo
  tirando a derivação de dentro do JSX (D-52) e **escolheu copiar em vez de centralizar**, porque a
  peça que faltava é a que o `useLoadState` deveria ser e não é — ver **D-54**, que é a raiz e o
  vizinho desta linha. **A reincidência é medida, não temida:** a mesma política já morava em seis
  hooks e já tinha divergido (Q-1/Q-1b/Q-2 do review de 2026-08-14), que é o motivo do bullet do
  `useLoadState` na rule. **Correção:** um `listSource(query)` em `shared/hooks/` devolvendo o
  contrato `ListSource<T>` que o BD-17 acabou de escrever em `shared/lib/archivable.ts` — os seis
  sítios passam a espalhá-lo, não a derivá-lo. Sai junto do D-54 e pelo mesmo motivo: corrigir a
  promise em seis cópias é o custo que a centralização apaga.
  **Linha proposta para `.claude/rules/frontend-fsliced.md`, a escrever quando o débito for pago**
  (escrevê-la antes tornaria a rule falsa nos seis sítios): *"A forma normalizada de lista é
  `ListSource<T>` e nasce num lugar só (`shared/hooks`). Hook que monta
  `isError ? (error ?? {}) : null` à mão está recriando a política — o alias espalha, não deriva."*
  **Não é regressão do BD-17** — é o alcance que ele mediu e não cobriu.
  **Alcance remedido em 2026-08-20** contra `6edf1224`: o sexto sítio é `useResourceState.ts:35`,
  que repete a mesma linha para payload de objeto. O normalizador de lista não o serve — a
  fronteira está declarada em `useDashboard.ts:124-129` —, então ele entra no bloco como decisão
  de desenho, não como sexta cópia a apagar sem pensar.

- **D-16 · Turma concluída com zero matrículas cai em `fully_issued` no funil** → **BD-15**.
  Declarado no review do `dashboard-backend-agregacoes` (2026-08-14) como não-regressão: a spec §4.3
  escolheu o balde de propósito ("turma concluída sem matrícula aprovada pendente cai em 'tudo
  emitido': não há o que emitir"), e a classificação exclusiva exige que ela caia em algum lugar. O
  que incomoda é a **leitura**: o rótulo afirma emissão completa onde não houve emissão nenhuma.
  Custo do fix: um sétimo balde, ou um rótulo que distinga "sem matrícula a emitir" — decisão de
  contrato, e o consumidor (bloco B) ainda não existe para dizer se a distinção paga.
- **D-17 · `DomainDependencyTest` detecta aresta usada-e-não-declarada, não a contrária** →
  **BD-15**. Declarado no mesmo review. A lista de arestas de um domínio pode envelhecer com sobras
  em silêncio — importe removido, entrada permanece —, e nada reprova. O cenário (9) do
  `dashboard-backend-agregacoes` cobre a direção contrária **só para `Dashboard`**; generalizar é
  varrer os `use` de cada domínio e reprovar declaração sem consumidor, que é a mesma forma da
  varredura de órfãos que os fechamentos já fazem à mão.

## Sem bloco atribuído

- **D-55 · O DataTable não reexecuta as funções `body` quando só o idioma muda.**
  Medido em 2026-08-20 na prova de navegador do BD-17 (browser em `en-US`, interface alternada ao
  vivo), contra `1d61b28`. Trocar o idioma no menu repinta os **cabeçalhos** (`ARCHIVADO EL` →
  `ARQUIVADO EM` → `ARCHIVED ON`) mas **não** o conteúdo das células renderizadas por `body`: a data
  continua na grafia do idioma anterior até um F5. **Não é do BD-17 e foi isolado assim:** a coluna
  `ÚLTIMO ACCESO` de `UsersTable` (`formatDateTime`, que este bloco não toca) congela igual — em
  inglês o cabeçalho vira `LAST LOGIN` e o valor segue `20-08-2026 10:59 a. m.` — e o `AppTag` de
  estado idem (`Activo` em tela inglesa). A prova complementar é `ArchivedQuotesList`, mesma
  `formatDate` **fora** de DataTable (layout flex): ali a troca é ao vivo, `19-08-2026` → `8/19/2026`
  → `19/08/2026`. Logo o memo do `BodyCell` do PrimeReact é keyed no dado da linha, e `archivedColumns`
  já constrói closure nova a cada render — a causa está acima de qualquer coisa que o bloco escreveu.
  **Alcance:** toda célula traduzida ou formatada de toda tabela da aplicação. **Correção provável:**
  rekey do `AppDataTable` em `i18n.language`; mexe em componente compartilhado por todas as telas,
  então quer bloco próprio e prova visual. **Com recarga, a grafia está correta nos três idiomas** —
  o D-51 está pago; isto é limitação de plataforma, não regressão.

- **D-34 · O gate RBAC do Dashboard atravessa o seam como `null`, e o cliente o remonta.**
  Medido em 2026-08-18 contra `b758068` (revisão de arquitetura). A visibilidade por permissão nasce
  em `AdminDashboardAssembler.php:56-62` como quatro booleanos, é passada posicionalmente para
  `AnalyticsQuery::series()` (`:27-32`) e `::rankings()` (`:73-76`), e chega ao payload como
  **ausência de dado** — `AnalyticsQuery.php:319` precisa do sentinela `'0.0000'` justamente porque o
  contrato não tem onde dizer "proibido". Do outro lado, o navegador **reconstrói a permissão
  farejando nulo**: `RankingsPanel.tsx:25` decide se o usuário tem `commercial.quote.view`
  varrendo `[...rankings.courses, ...rankings.clients]` atrás de um `uf_aprovada` não nulo, e
  `SeriesPanel.tsx:54` faz o mesmo teste na série. **Não é regressão nem achado teórico:** é o
  desfecho do Q-2 do review do B2, que foi corrigido do lado do cliente — a correção está certa para
  o defeito que tratava (a métrica de UF deixou de ser oferecida com o gate fechado) e **alargou** o
  vazamento, porque agora duas telas sabem traduzir `null` em permissão. Custo hoje: um scan O(n) por
  render e a regra de RBAC morando em dois repositórios. Custo se ficar: toda tela nova aprende a
  farejar nulo. Fix: a visibilidade vira campo explícito no payload e módulo próprio no backend.
  **Sem bloco até o João agrupá-lo** — toca contrato de API e regenera `generated.ts` (lei §5.3),
  então não é emenda de bloco alheio.

- **D-35 · `src/app/**` é o único lado do seam `shared/ui` sem o ban de PrimeReact.**
  Medido em 2026-08-18 contra `b758068`. A lei §5.6 virou mecanismo em `eslint.config.js:362`, e o
  bloco é escopado **por feature** (`src/features/${feature}/**`), então `src/app/**` não é visitado
  por ele. O comentário de `:388-390` declara a exceção, mas só para a metade *feature→feature*
  ("AppRouter importa 5 features, e compor rotas é o trabalho dele") — a metade **PrimeReact** fica
  de fora sem razão escrita. A camada não é mais o shell de 3 arquivos que motivou a redação: ela
  concentra hoje **28 arquivos** em `app/pages/Dashboard/`. **A régua nasceria verde:** zero import
  de `primereact` em `src/app` hoje, medido — a mesma condição que a D11 do
  `dashboard-frontend-central-controle` usou para ligar `COR_HARDCODED` nesta mesma camada sem
  `ignores` (P-34, encerrada). É a quarta repetição do padrão "camada inteira sem a régua que as
  outras têm", depois de P-34 (cor), D8 do B2 (`max-lines`) e P-38. Fix: acrescentar `src/app/**` ao
  bloco `no-restricted-imports` **só** na fronteira PrimeReact, deixando *feature→feature* liberada.
  **Sem bloco até o João agrupá-lo**; entra barato em qualquer bloco que toque `eslint.config.js`.

- **D-37 · `archived_with_parent` nasceu sem backfill, e não há como recuperá-lo.**
  A coluna marcadora da cascata de arquivamento (migration `2026_08_18_000001`) entra com `false`
  em todas as linhas: qualquer agregado arquivado **antes** de 2026-08-18 restaura o pai sem os
  filhos, em silêncio. Não há backfill correto possível — casar por `deleted_at` é o que a spec D2
  do bloco recusou (`timestamp` de precisão 0: segundo inteiro não é identidade) e marcar todo
  filho arquivado ressuscitaria o que alguém arquivou de propósito. Medido no review de 2026-08-18
  (Q-7) e documentado no docblock da própria migration. **Sem produção, o alcance é só banco de
  desenvolvimento já semeado.** O gatilho é o primeiro deploy: antes dele, conferir se existe
  agregado arquivado de antes dessa data e, se existir, decidir caso a caso — corrigir à mão ou
  aceitar o restore incompleto.

- **D-33 · O foco cai no `<body>` quando o olho da senha alterna.**
  Medido no fechamento do BD-16 (2026-08-18) em Chromium real, `/perfil` como Redator: com o foco no
  olho, Espaço alterna o campo (`password` → `text`) e o `document.activeElement` vira `BODY`. O
  ícone é trocado pelo Prime na alternância e o nó focado sai do DOM, então quem navega por teclado
  volta ao topo do documento e perde o lugar a cada toggle. **Não é regressão deste bloco:** o mesmo
  teste no main tree (`:5173`, sem os commits do BD-16) devolve `BODY` igual — muda só o alvo, que lá
  mede 16x16 e aqui 28x28 (UI-04). É a terceira ponta do mesmo `AppPassword`, depois da tecla (D-24,
  não reproduzida) e do alvo (UI-04, pago). O fix mora no wrapper — devolver o foco ao novo ícone
  depois da troca —, e entra em qualquer bloco que toque `AppPassword` por outro motivo.

- **D-32 · A ordem de foco de `/perfil` diverge da visual abaixo de `xl`.**
  `ProfilePage.tsx` usa `order-*` para inverter as duas colunas abaixo de 1280px, e `order` reordena
  a PINTURA, não a árvore de acessibilidade. Medido no review de 2026-08-18 (UI-01): em 390px o foco
  salta `main.scrollTop` 0 → 1862 → 2230 → 0 ao longo do Tab; em 1024px o `y` do elemento focado vai
  1875 → 2383 e volta para 323. WCAG 1.3.2 (Meaningful Sequence) e 2.4.3 (Focus Order). Nenhum
  controle fica inalcançável ou sem nome — o custo é desorientação e scroll evitável em teclado e
  leitor de tela, nas duas viewports em que a página é mais longa.
  **A correção existiu e foi revertida por decisão do João (2026-08-18):** virar as colunas em `xl`
  (leitura à direita, self-service à esquerda) alinha DOM e pintura nas três larguras e dispensa o
  `order-*`, mas tira a identidade da esquerda no desktop — e o layout venceu. Inverter só o DOM
  **não** serve: mudaria a viewport em que a violação acontece, já que a ordem de leitura de duas
  colunas em LTR é a esquerda inteira e depois a direita. `tabIndex` positivo também não: troca um
  defeito de ordem por outro. O que resta é desenho — ou a D1 abre mão do lado, ou a D-27 abre mão
  da precedência abaixo de `xl`, ou o cartão de identidade encolhe o bastante para não precisar da
  inversão. **Decisão do João**, e é por isso que entra sem bloco.

- **D-15 · `DIAS_AVISO = 30` em Identity duplica `DashboardWindows::EXPIRY_WINDOW_DAYS = 30`.**
  Duplicação **declarada e datada na spec do Meu Perfil** (2026-08-14): unificar antes do merge
  significaria importar de um domínio que na árvore `fix-frontend` ainda não existia. **O gatilho
  venceu** — medido no `/fechar-sprint` de 2026-08-16,
  `git ls-tree -r main -- backend/app/Domains/Dashboard/Services/DashboardWindows.php` acha o
  arquivo, então os dois números convivem na **mesma** árvore e a unificação deixou de depender de
  merge. Decidir o dono do número (Shared, ou um dos dois domínios) é parte da task. **Fica sem bloco
  até o João agrupá-la** — o fechamento constata que a trava caiu, não escolhe onde ela entra.

- **D-36 · O envelope RFC 7807 não é localizado, e o front teve de calar o `detail` por causa disso.**
  `backend/app/Shared/Exceptions/ProblemDetails.php:22-36,68,71` devolve `title` e `detail` genéricos
  LITERAIS em português ("Erro interno", "Ocorreu um erro inesperado. Tente novamente.", "Erro ao
  processar a requisição."), apesar de `App\Shared\Http\Middleware\SetLocale` já traduzir por
  `Accept-Language` e de existirem `backend/lang/{en,es,es_CL,pt_BR}`. Num 500 o cliente chileno lia
  português. `CorruptedSnapshotException::missingFields()` é es-CL fixo pelo mesmo motivo — ali é
  deliberado (D8), mas continuaria fixo se a sessão fosse pt-BR ou en. **Medido em 2026-08-18, no
  BD-13.** O `title` nunca chegou à tela (o front usa `t('common.loadError')`), e a D-05 do BD-13
  acabou de calar o `detail` nos estados de carga — então o custo hoje é o `CertificateViewDialog`,
  que imprime o `detail` cru por desenho, e qualquer consumidor futuro da API. **A correção é `__()`
  com chaves nas 4 `lang/`**; entra em bloco de backend, onde o custo da P-03 já esteja pago.
  Frente: backend. (O ID `D-32` do plano do BD-13 já estava tomado pela ordem de foco de `/perfil`;
  este débito ficou com o próximo livre.)
  **Medido de novo no fechamento do `arquivados-roots-restantes` (2026-08-19), agora com os dois
  idiomas no MESMO envelope:** `POST /api/quotes/11/restore` sob orçamento arquivado devolveu
  `title` `"Erro de validação"` com `detail` `"El presupuesto de esta cotización está archivado:
  restáuralo primero."` — as mensagens novas daquele bloco saíram em es-CL por decisão de spec,
  então o 422 carrega português no envelope e espanhol no conteúdo. Segue sem custo de tela
  (`problemMessage` lê `errors`/`detail`, nunca `title`), e segue esperando a mesma decisão da
  **D-07**.

## Travados em decisão — não entram em bloco

Executar sem a decisão é escolher no lugar do João.

- **D-18 · O `description` das pendências e alertas do Dashboard é string fixa em espanhol no
  backend, e a tela do B1 já mostra as outras duas locales em volta dela.** Nasceu da **D17** da spec
  do `dashboard-frontend-central-controle` (2026-08-15), e a medição que a produziu está nos quatro
  produtores: `CommercialMetricsQuery.php:48`, `OperationMetricsQuery.php:128`,
  `CertificationMetricsQuery.php:38` e `IdentityMetricsQuery.php:46` — todos montam frase pronta
  (`"Cotización pendiente de aprobación."`). O front **não** pode traduzir: em
  `turma_docs_incomplete` a string carrega a lista de documentos faltantes, dado que o React não
  deriva. A D17 mitigou pelo que estava ao alcance do frontend — o **rótulo do tipo** é traduzido nas
  3 locales e vira a linha principal, com o `description` como detalhe —, então o defeito hoje é
  cosmético e localizado, não uma tela em espanhol. **Fecha junto da D-07, e pelo mesmo motivo:**
  traduzir texto de servidor exige primeiro o idioma canônico e o mecanismo de i18n do backend, que
  é a decisão que a D-07 espera. Fazer só este sítio criaria um terceiro padrão de idioma no repo.
- **D-07 · Idioma das mensagens de `ValidationException` é inconsistente no repo.** Commercial
  escreve em PT (`DeleteQuoteAction`, `DeleteClientContactAction`), Operation em ES (`Turma`,
  `ConcludeTurmaAction`) — o usuário chileno lê um ou outro conforme o endpoint. Pré-existente;
  levantado no segundo review (2026-08-01) porque o 422 novo de contatos tem uma única mensagem e ela
  é a que o cliente vê. **Exige decisão do João sobre o idioma canônico** antes de valer a pena
  unificar. (Era o `Q-6`.)
- **D-09 · Assimetria entre camadas:** a UI não consegue voltar a zero principais, mas o backend
  aceita zero.
- **D-10 · Bloco 5.2b:** `GET /api/roles` permite a admin comum enumerar permissões do superadmin
  enquanto `/api/permissions` é superadmin-only. A parte de teste desta linha e a linha inteira do
  **Bloco 5.2a** saíram em 2026-08-11 com o BD-2.
- **D-11 · Alunos · o dropdown de empresa depende de uma permissão de outro módulo.** O módulo de
  alunos inteiro é gated por `identity.user.*` (D8 da spec, e é o que o `StudentController` exige),
  mas o dropdown de empresa do create lista via `clientsApi`, que exige `commercial.client.view`.
  Quem tem `identity.user.create` sem `commercial.client.view` cria aluno pela API e não pela tela.
  **Duas tentativas de contornar na UI foram revertidas por serem piores que o problema:** gate duplo
  no botão escondia a ação de quem tinha autorização real (`3e0bc36`); travar o submit por `isError`
  bloqueava com lista utilizável em cache (`03280c6`). O estado atual é o menos ruim — a falha fica
  **visível** (dropdown desabilitado + motivo + "Reintentar"), não escondida. **Alinhar de verdade
  exige decisão do João sobre RBAC/spec:** endpoint de clientes sob `identity.user.view`, permissão
  nova, ou aceitar o acoplamento.

- **DS-05 · O avatar de `/perfil` é `scale-200` sobre imagem pequena, não tamanho real.**
  Achado estético da auditoria de 2026-08-17 (`audits/2026-08-17-perfil-ui-review-e-design.md`),
  **deixado fora do BD-16 por decisão explícita do João**: a previsão de recorte é aritmética e pede
  medição no navegador antes de virar task. O risco chegou a reabrir durante a execução — a faixa da
  D8 esbarra no `transform` —, e a Task 15 mediu que não recortava. Segue de pé como estética, não
  como defeito.
- **DS-07 · O mural de credenciais como assinatura da tela.** Mesma auditoria, mesma decisão: inverte
  a ordem da spec D1 (imutável à esquerda, self-service à direita) e é bloco próprio, com
  brainstorming — não emenda de bloco alheio.

**Pendências no mesmo estado** (detalhe em `pendencias/abertas.md`): P-02 e P-33 (retenção de
`audits` e `login_logs`), P-05 (consolidar migrations), P-03 (compose por worktree), P-30 (âmbar de
marca), P-28 (fundo do certificado), P-31/P-18/P-22 (escrita fora do repositório) e as de decisão da
Lotus (P-08, P-09, P-10, P-13, P-15, P-16).

---

# Módulos ainda não implementados

Hoje são `ModulePlaceholder` ou equivalente. A auditoria visual de 2026-07-24 os listou como
divergência crítica de UI; **não são** — são módulo a construir.

- **Dashboard** — coberto pela **Sprint 5** acima, e **não é mais placeholder**: o bloco A entregou o
  contrato (2026-08-15) e o B1, a tela operacional (2026-08-16), que substituiu a saudação de 17
  linhas por KPIs, pendências, alertas, agenda e pipeline. O que falta do protótipo é justamente o
  **B2**: os gráficos de turmas e de certificados (as 5 séries mensais), os rankings, o compliance,
  a carga de redatores e a view do Redator.
- **Perfil do Usuário** — coberto pela **Sprint 6** acima. Página dedicada para usuário
  (administrativo e redator), visualizando seu perfil e dados.
- ~~**Pessoas · Alunos**~~ — entregue em 2026-07-27
  (`plans/archive/2026-07-27-bloco-alunos-modulo.md`).
- ~~**Certificados**~~ — entregue: backend no Bloco 7 (2026-08-07,
  `plans/archive/2026-08-05-certificacao-sprint-4.md`) e frontend em 2026-08-08
  (`plans/archive/2026-08-08-certificacao-frontend.md`).

---

# Futuros dependentes de decisão

- **FUT-1 · Templates de documento de turma gerados via código** — o redator baixa o template
  pré-preenchido com dados da turma/alunos, preenche online ou à mão e sobe. Depende de desenho com a
  Lotus; abrir task no Notion e avaliar documentação Drive/local quando definido.
  **Interseção com "Arquivados e restauração":** o manual em PDF/DOCX pré-preenchido é exatamente a
  fatia "baixa, preenche à mão, sobe" para o tipo `MANUAL`. O que continua futuro é o mecanismo
  genérico para os outros tipos (`PRUEBAS`, `EVALUACION_REDATOR`) e o preenchimento online.
- **FUT-2 · Refino de ancoragem cross-módulo** — link de dado compartilhado leva à página do módulo
  dono com a entidade selecionada, ou a exibe inline. O caso turma→orçamento já existe; o mecanismo
  genérico depende de decisão e task no Notion.
