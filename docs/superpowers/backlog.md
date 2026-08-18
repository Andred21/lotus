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

**Bloco restante** (o bloco A, `dashboard-backend-agregacoes`, foi entregue em 2026-08-15 e o bloco
B1, `dashboard-frontend-central-controle`, em 2026-08-16 — ver `historico/progress.md`; o contrato do
payload está em `specs/archive/2026-08-14-dashboard-backend-agregacoes-design.md` e os tipos, em
`generated.ts`):

1. ~~**`dashboard-frontend-central-controle`** (B1)~~ — entregue em 2026-08-16
   (`plans/archive/2026-08-15-dashboard-frontend-central-controle.md`). Levou as 5 seções que
   respondem *"o que tenho para fazer agora"*: KPIs, pendências, alertas, agenda e pipeline.
2. **`dashboard-frontend-analitico-e-redator`** (B2) — a outra metade do bloco B, criada pelo corte
   da **D1** da spec do B1 (2026-08-15). Responde *"como a operação evoluiu"*: as 5 séries mensais,
   os 2 rankings, `compliance_turmas`, a carga de redatores e **a view do Redator inteira**.

   **Três coisas que o B1 empurrou para cá, medidas e não supostas:**

   - **A decisão de biblioteca de gráficos é deste bloco.** Não existe chart lib no projeto:
     `package.json` não tem `chart.js` — peer obrigatório do `Chart` do PrimeReact — nem alternativa,
     e não há wrapper de chart em `shared/ui`. O B1 pôde ser entregue sem ela porque as 5 seções
     dele não têm gráfico; as 5 séries mensais daqui têm.
   - **O filtro de período nasce aqui.** A D3 da spec do bloco A fixou que estado operacional ignora
     o período — só séries e rankings o obedecem. O `useDashboard` do B1 já nasceu **com o
     parâmetro** e sem UI (D5), então este bloco liga a tela sem mexer no cache.
   - **A D-16** (turma concluída sem matrícula caindo em `fully_issued` no funil) esperava o
     consumidor dizer se a distinção paga. O consumidor do funil é o B1, e ele **não pediu** a
     distinção — a linha segue no BD-15 com o gatilho intacto.

   **Duas dependências externas ao bloco, já registradas:** a **P-44** (dois usuários de sonda
   aparecem na carga de redatores) tem o gatilho apontando para cá; e o item 4 de "Próximos blocos"
   (ativação de acesso do redator) **bloqueia o valor da view do Redator** — nenhum redator autentica
   hoje. Nenhum dos dois é escopo deste bloco.

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

1. **Arquivados e restauração de soft-delete** — Notion H.5.1–H.5.4.
   Objetivo: tornar o lifecycle de archive/restore explícito e seguro por agregado.
   Ordem: semântica → Actions → endpoints → UI.
   **Fora de escopo:** `forceDelete` e exclusão permanente.
2. **Administração · Roles e permissões — redesenho de composição.** O protótipo tem layout dividido
   (lista de roles à esquerda; detalhe + matriz de permissões à direita, com marcação de permissão
   essencial); o real tem tabela + diálogo. **Não é refinamento visual, é redesenho de tela** — exige
   brainstorming. Task Notion: "Tela de Administração — Roles e Permissões". Respeitar ADR-07
   (permissões essenciais não editáveis).
3. **Hardening** — ownership em rotas nested e política de retenção documental.
4. **Identity · ativação de acesso do redator.** `CreateRedatorAction` cria o `User` com
   `is_active=false` "até o fluxo de ativação", e **o fluxo não existe** — o `UserProvisioner` gera
   senha aleatória (`bin2hex(random_bytes(16))`) que ninguém recebe, e nenhuma tela ativa a conta.
   Consequência medida no fechamento do `dashboard-backend-agregacoes` (2026-08-15): **nenhum redator
   autentica em produção**, então a view `redator` do dashboard está implementada, testada e provada
   ponta a ponta contra a API real — e hoje **inalcançável** por quem deveria usá-la. É a RN-01 pela
   metade: a regra diz que redator autentica, o cadastro nunca o habilita. Toca convite ou
   definição de senha, o gate de `is_active` e provavelmente `password_reset_tokens`; exige
   brainstorming, porque "como o redator recebe a credencial" é decisão de produto, não de código.
   **Bloqueia o valor do bloco B2 do Dashboard**, que é onde a view do Redator é construída — o B1,
   entregue em 2026-08-16, é a tela administrativa e não depende disto.

---

# Blocos de execução de dívida

> **Fila vazia até promoção explícita do João.** BD-1..BD-9 foram entregues entre 2026-08-11 e
> 2026-08-14, e o **BD-16** em 2026-08-18 — cada um saiu desta lista com os débitos que cobria, e o
> histórico está na linha da entrega em `historico/progress.md`. O BD-16 levou junto o **BD-10**, que
> ele havia absorvido em 2026-08-17 e que nunca chegou a ser promovido. Os BD-11..BD-15 abaixo são o
> que sobrou do reagrupamento de 2026-08-14 — nenhum foi promovido.

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

## BD-12 · Frontend · load-state: os dois sítios que sobraram do BD-6

**Cobre:** D-14, P-40 · **Frente:** frontend
**Afinidade:** os dois orbitam `useLoadState` e o catálogo de cursos.

- **D-14** — `RedatorCourseSelector` e `CourseRedatoresSection` ainda ramificam por `isError` cru.
- **P-40** — remedição do ramo "catálogo genuinamente vazio" contra HEAD. Depende de conseguir
  esvaziar o catálogo de dev (seeder de cenário, endpoint de teste, ou o João rodando o comando).

> A **P-38** saía deste bloco e foi **encerrada antes**, em 2026-08-16, pelo gatilho literal dela: o
> `meu-perfil-frontend` tocou `frontend-fsliced.md` por outro motivo e trocou a frase pelo corte
> medido com o runner (`pendencias/encerradas.md`).

**DoD:** o teste do ramo COM cache em cada sítio — o BD-6 mostrou que forçar `list: []` no teste de
falha deixa a regressão passar verde.

## BD-13 · Frontend · listagens e abas: plural, ausência e custo de montagem

**Cobre:** D-02, D-04, D-05, D-06 · **Frente:** frontend
**Afinidade:** todos são a página de listagem e o que ela mostra ou custa; `CertificatesPage` aparece
em três dos quatro, e os três locales são o arquivo comum de D-02 e D-05.

- **D-02** — plural cru em duas das sete tabelas.
- **D-04** — cada montagem de página com abas busca as **duas** abas.
- **D-05** — bloco de erro bilíngue com caminho de campo cru na tela.
- **D-06** — a linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão.

**DoD:** a paridade das 3 locales verde depois da chave de plural, e o custo de rede medido (1 GET
por aba aberta, não 2 por montagem).

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

- **D-02 · Plural cru em duas das sete tabelas** → **BD-13**. "3 course(s)" e "1 user(s)" contra "4
  clients", "7 instructors" e "6 budgets". Rodapé do `AppDataTable` alimentado por chave sem plural
  i18n; medido em 2026-08-14 ainda vivo nos 3 locales (`"{{count}} usuario(s)"`, `"{{count}}
  curso(s)"`, `"{{count}} módulo(s)"`).
- **D-03 · Menu recolhido a 390 tira o rótulo do DOM e deixa só `title`** → **BD-11**. No toque não
  há hover, então o nome do item de navegação fica inalcançável
  (`src/app/layouts/Sidebar/SidebarItem.tsx`).
- **D-04 · Cada montagem de página com abas busca as DUAS abas** → **BD-13**. Custo de rede dobrado
  na abertura de `PeoplePage` e `CertificatesPage`; sem falha funcional, mas mensurável.
- **D-05 · Bloco de erro bilíngue com caminho de campo cru na tela** → **BD-13**. Título vem do i18n
  do front e segue a sessão (`Could not load the data`), corpo vem do `detail` do RFC 7807 e chega
  sempre em espanhol, citando `aluno.name` (que ainda por cima é português). Medido no estado de erro
  real do `LOT-2026-1001` em `/certificados`.
- **D-06 · A linha do certificado corrompido mostra a célula de aluno vazia, sem o travessão** →
  **BD-13**. A lista não distingue "sem nome" de "campo faltando", e é o único lugar onde o registro
  aparece antes do clique. O diálogo do mesmo registro explica a falha; a linha, não.
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
  **BD-14**. Resíduo medido do Q-4 (review de 2026-08-05), que o BD-5 fechou **só do lado do
  frontend**: `FORBIDDEN_PAYLOAD_KEYS` no `useCrudForm` faz a chave lançar em DEV, então o `...form`
  ingênuo não a reintroduz mais. O defeito do outro lado foi **remedido no `/fechar-sprint` de
  2026-08-13**, não herdado: `PUT /api/students/37` com `"photo_url":"http://evil/x.png"` no corpo
  devolve **200**, e o campo volta `null` na resposta — a promoção no construtor do DTO desvia do
  `CannotSetComputedValue`, então o campo `#[Computed]` é ignorado sem 422. Vale para os quatro DTOs
  com foto, não só o `ClientData` que o texto original do Q-4 nomeava. **Uma afirmação do Q-4
  original não sobreviveu à medição:** `photo_url` **não** carrega path interno de storage — o
  `SignedUrlTransformer` roda na serialização e o front recebe URL pré-assinada.
- **D-13 · `UpdateStaffUserAction` apaga o `rut` do staff num `PUT` que só o OMITE** → **BD-14**.
  `UserData::$rut` é `Optional`, e a Action traduz `Optional` para `null` antes de gravar
  (`($data->rut instanceof Optional || $data->rut === null) ? null : $data->rut`,
  `UpdateStaffUserAction.php:44`): quem manda o formulário sem a chave zera o RUT de um usuário que
  tinha. É a mesma classe do defeito que o bloco `contrato-de-entrada-identidade-e-nested` fechou nas
  coleções nested — omissão virando apagamento —, num campo escalar. **Pré-existente e fora do escopo
  daquele bloco**, que só atravessou o arquivo para trocar a checagem de unicidade pela porta única.
- **D-14 · `RedatorCourseSelector` e `CourseRedatoresSection` ainda ramificam por `isError` cru** →
  **BD-12**. É o terceiro e o quarto sítio do padrão que o review do BD-6 (2026-08-14) transformou em
  regra — falha que apaga cache utilizável — e os dois ficaram **fora do escopo** daquele bloco, que
  só cobria os três sítios da spec (wizard, card de cotações, dropdown de cliente). Depois do
  `useLoadState` o fix é de uma linha em cada um: trocar `courses.isError` / `redatores.isError`
  (`RedatorCourseSelector.tsx:38`, `CourseRedatoresSection.tsx:28`) por `failedWithoutData` no ramo
  que substitui a tela, e mandar a falha com cache para um `InlineLoadState` ao lado da lista.
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

- **D-31 · Duas chaves i18n órfãs no dicionário de `/perfil`.**
  `profile.documents.noValidity` e `profile.identity.role` existem nos três locales e **nenhum
  `.tsx` as consome** — medido no gate do BD-16 (2026-08-17) e reconfirmado no fechamento
  (2026-08-18), com grep em `src/**` fora de `locales/`. Não quebram nada: a paridade de chaves
  entre `pt-BR`, `es-CL` e `en` continua exata, que é o que a rule exige. O custo é de leitura —
  quem procura o rótulo de um dado acha uma chave que a tela não usa e não sabe se é a errada ou se
  a tela é que esqueceu de usá-la. **Apagar as três cópias de cada uma** é a limpeza; entra em
  qualquer bloco que toque os dicionários por outro motivo.

- **D-15 · `DIAS_AVISO = 30` em Identity duplica `DashboardWindows::EXPIRY_WINDOW_DAYS = 30`.**
  Duplicação **declarada e datada na spec do Meu Perfil** (2026-08-14): unificar antes do merge
  significaria importar de um domínio que na árvore `fix-frontend` ainda não existia. **O gatilho
  venceu** — medido no `/fechar-sprint` de 2026-08-16,
  `git ls-tree -r main -- backend/app/Domains/Dashboard/Services/DashboardWindows.php` acha o
  arquivo, então os dois números convivem na **mesma** árvore e a unificação deixou de depender de
  merge. Decidir o dono do número (Shared, ou um dos dois domínios) é parte da task. **Fica sem bloco
  até o João agrupá-la** — o fechamento constata que a trava caiu, não escolhe onde ela entra.

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
