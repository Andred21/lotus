# ADRs — Decisões de Arquitetura · Lotus

> Snapshot de 2026-07-04 (atualizado 2026-07-30, doc-sync da Sprint 4). Fonte canônica: `Drive/V2/Planejamento/3-avancado/decisao-stack.md`.
> Princípio diretor de TODAS as decisões: **máxima senioridade, mínima complexidade desnecessária (anti over-engineering), proporcional a ~10 usuários internos.**
>
> Formato adaptado para agente: cada ADR traz a **regra acionável** (o que fazer/não fazer no código) e o **porquê** (contexto + trade-off). As decisões estão fechadas — se uma tarefa contrariar um ADR, sinalize antes de prosseguir.

---

## ADR-01 — Backend: PHP + Laravel
**Regra:** backend é Laravel. **Porquê:** stack principal do dev; ecossistema maduro (Eloquent, Sanctum, pacotes Spatie); produtividade sem sacrificar robustez. Descartados Node/Nest e Python/Django (fora da stack, sem ganho que justifique).

## ADR-02 — DDD-lite, SEM Repository sobre Eloquent
**Regra:**
- Regra de negócio → **Actions** (single-action, `execute()`/`__invoke()`) e **Domain Services**.
- Consultas complexas → **Custom Query Builders**.
- CRUD sem regra → direto do **Controller ao Eloquent**.
- **NUNCA** criar Repository genérico sobre Eloquent.
- Testes: integração contra SQLite em memória / transações isoladas, não mock de repositório.

**Porquê:** Repository sobre Active Record (Eloquent) é abstração vazada — perde eager loading, scopes, e incha o código com métodos anêmicos. Trade-off aceito: abre-se mão da troca teórica de ORM (que nunca acontece num projeto MySQL). Descartados: Repository pattern (anti-padrão aqui), DDD estratégico completo (excessivo para o porte).

## ADR-03 — Erros: RFC 7807 / 9457 (Problem Details)
**Regra:** toda resposta de erro segue RFC 7807 (`type, title, status, detail, instance`), formatada no handler global do Laravel. O front trata erro de forma transversal via interceptor Axios — sem lógica condicional por endpoint. **Porquê:** padrão IETF; erro determinístico. Trade-off: disciplina extra no handler (baixo custo, alto retorno).

## ADR-04 — Sincronização de tipos: spatie/laravel-data + typescript-transformer
**Regra:**
- DTOs com `spatie/laravel-data` são a **fonte da verdade** dos tipos.
- `spatie/laravel-typescript-transformer` gera os tipos TS automaticamente (artisan `typescript:transform` → `frontend/src/shared/types/generated.ts`).
- Tipo TS escrito à mão no front é **dívida temporária** — marque com comentário e substitua pelo gerado quando o DTO existir.

**Porquê:** erro de contrato aparece em tempo de compilação do TS, não em runtime. Consolida validação + resource + DTO numa classe. Funciona em SPA REST (não exige Inertia — NÃO usamos Inertia).

## ADR-05 — Frontend: React + TS, feature-based, Zustand + TanStack Query
**Regra:**
- Estrutura **feature-based** (Bulletproof React).
- **TanStack Query** para server state; **Zustand** para client state (tema, wizards, UI efêmera, sessão).
- Features não importam outras features. Dependência aponta só para baixo (features → shared).

**Porquê:** separar server state de client state elimina `useEffect+fetch` frágil e prop-drilling. Zustand sem boilerplate do Redux; React Query cuida de cache/revalidação. Descartados: Redux clássico (verboso), Context puro para tudo (re-renders em cascata).

> Nota de aplicação: a **sessão do usuário** fica no Zustand. É um caso limítrofe (dado de origem no servidor, mas de leitura ubíqua e client-side) — decisão consciente, alinhada ao ADR. Listagens de domínio (cursos, turmas) vão no TanStack Query, nunca no Zustand.

## ADR-06 — Auth: Laravel Sanctum (cookie HttpOnly, SPA first-party)
**Regra:**
- Sanctum modo **SPA cookie-based** (sessão + cookie HttpOnly + CSRF). **NUNCA** JWT em localStorage.
- `initCsrf()` antes de qualquer request que muta (login/logout).
- Exige SPA e API no mesmo domínio-pai (`SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` configurados).

**Porquê:** cookie HttpOnly é imune a roubo via XSS (JS não acessa o cookie); Sanctum integra CSRF nativo. localStorage+JWT é vulnerável a XSS. Descartados: JWT/Passport (OAuth completo, excessivo), localStorage (inseguro).

## ADR-07 — RBAC: spatie/laravel-permission
**Regra:**
- Roles/permissões via **seeder**; roles de sistema imutáveis nas permissões essenciais.
- Após mudar permissões, limpar cache com `forgetCachedPermissions()`.
- Índices compostos nas tabelas de junção (evitar N+1).

**Porquê:** padrão de mercado testado; evita tabelas RBAC artesanais (erro da v1). Trade-off: aprender a convenção do pacote (baixo) e atenção ao cache de permissões.

## ADR-08 — Auditoria: owen-it/laravel-auditing (camada de aplicação)
**Regra:**
- `laravel-auditing` via trait nos modelos sensíveis; tabela central `audits`.
- **NA APLICAÇÃO, nunca em triggers de banco.**
- Evitar mass-delete que pule o ORM (dribla os Observers). A solução NÃO é adicionar trigger — é não pular o ORM.
- Pruning da tabela `audits`: poda agendada em duas fases via `RetentionPolicy` e `PodarAuditoria`
  (ver pendência fechada abaixo); exportar histórico frio p/ S3 Glacier segue opcional, sem
  requisito aprovado.

**Porquê:** o pacote captura `user_id`, IP, User-Agent — o que um trigger NÃO enxerga (trigger vê a conexão, não o usuário da app). Descartados: triggers (cegos ao usuário, invisíveis no código, migrations não versionam bem).

## ADR-09 — Banco: MySQL 8 em AWS RDS gerenciado
**Regra:** MySQL 8 em **RDS gerenciado** (classe pequena, ex. db.t4g.micro, região sul-americana). **NUNCA** no mesmo container/máquina da app. **Porquê:** snapshot automático, patching gerenciado, retenção/restore — persistência segura separada do compute efêmero. Descartado: banco em container/EC2 (risco de perda em restart).

**Revisão 2026-09 (spec v2 do item 10, decisão D2 do brainstorming de 2026-09-02):** MySQL 8 em
**container no host único de produção** (`docker-compose.prod.yml`), não em RDS. O que mudou: o
teto de custo do bloco é US$ 30/mês (D8) e o RDS custaria ~US$ 15–20/mês — mais da metade do
teto para ~10 usuários de baixa concorrência. O que NÃO mudou: a porta 3306 nunca é publicada
(rede interna do Compose), o dado vive em volume nomeado, e a persistência segura continua
sendo requisito — paga por `deploy/bin/backup-db.sh` (dump diário `--single-transaction` → S3,
lifecycle de 30 dias, retenção mínima de 7 atendida) com **restore provado** no DoD do bloco.
**Gatilho de reversão a RDS** (qualquer um): restore provado falhar; backup > 7 dias sem
sucesso; cliente exigir RPO menor que o dump diário. RTO/RPO desta revisão: até 24 h de perda
potencial + restore manual pelo runbook — aceito por decisão explícita do João em 2026-09-02.

## ADR-10 — Polimorfismo com enforceMorphMap
**Regra:** relações polimórficas do Eloquent (tabela `files`, `audits`) **sempre** com `Relation::enforceMorphMap()` (alias fixos: 'redator', 'cotacao'...) no AppServiceProvider. **Porquê:** sem morph map, o tipo guarda o namespace da classe; renomear/mover classe corrompe dados históricos. O map desacopla do código-fonte. Trade-off: integridade referencial fica na aplicação (aceitável — acesso só via Laravel, baixa concorrência).

## ADR-11 — Storage: AWS S3 + Flysystem, URLs temporárias
**Regra:**
- Documentos sensíveis no S3 via Flysystem. Acesso por **URLs pré-assinadas temporárias** (`temporaryUrl()`), não servindo o binário pela aplicação.
- Foto de perfil = coluna simples. Documentos = tabela `files` polimórfica.

**Porquê:** cliente baixa direto do S3 (não sobrecarrega o servidor); URLs efêmeras não compartilháveis indefinidamente. Descartados: Google Drive (legado v1, amador), binário no banco/servidor.

## ADR-12 — PDF: Spatie Laravel PDF + Gotenberg (Chromium headless)
**Regra:** Spatie Laravel PDF com driver **Gotenberg** (container separado). Geração **sob demanda**, stream direto para S3, sem escrever em `/tmp`. **Porquê:** renderização fiel de CSS moderno e QR; isola a carga pesada de PDF do servidor da app (evita memory exhausted do DomPDF em lote). Descartados: DomPDF (CSS limitado, estoura memória), Snappy/wkhtmltopdf (defasado).

**Nota (2026-08-10) — documento editável usa a SEGUNDA porta do mesmo Gotenberg.** Documento que o
cliente edita (hoje o manual de classe) não nasce de HTML: é **OOXML autorado em Blade** e
empacotado em OPC (`.docx`) por `App\Shared\Office\` — `Xml` (escape e `<w:br/>`), `OoxmlPackager`
(ZIP com `[Content_Types].xml` primeiro) e a porta `DocxToPdf`, cuja única implementação é
`GotenbergDocxToPdf` — que fala com `/forms/libreoffice/convert` do **mesmo container Gotenberg**
do certificado, do mesmo jeito que `Shared\Pdf\GotenbergHtmlToPdf` fala com a rota Chromium. O PDF do manual é a
conversão do próprio `.docx` entregue, não um segundo render: os dois formatos saem da mesma fonte,
então não podem divergir. Não há ADR separado porque a decisão de transporte é a desta: um serviço
externo do compose converte documento, e a rota Chromium e a rota LibreOffice são duas portas dele.
Descartado: PhpWord (abstrai o OOXML e some com o controle fino de grade/medida que o template
exige) e template `.docx` com marcadores substituídos (linha de tabela variável — 31 dias, N alunos
— não se resolve por substituição de string).

**Nota (2026-08-22) — o QR do certificado é `simple-qrcode`, embutido no próprio HTML.**
`simplesoftwareio/simple-qrcode ^4.2` gera o código de validação dentro de
`App\Domains\Certification\Services\CertificatePdfService`: `QrCode::format('svg')->size(180)`,
codificado em base64 e embutido no HTML que vai para o Gotenberg. **Não é um segundo serviço nem uma
segunda requisição** — por isso a decisão mora aqui e não em ADR próprio: o QR é conteúdo do
documento que esta ADR decide como renderizar, e SVG embutido sobrevive ao Chromium sem depender de
rede nem de arquivo em disco. O QR tem peso legal (é o que valida o certificado), então a
dependência é registrada com o consumidor nomeado, não só declarada no `composer.json`.

## ADR-13 — Containerização: Docker Compose artesanal + multi-stage, sem Laradock
**Regra:** `docker-compose.yml` artesanal (só serviços usados); imagem de produção via multi-stage build (Composer → Node/Vite → final Alpine enxuto). Serviços: PHP-FPM + Nginx; MySQL via RDS em prod (não em container). **Porquê:** Compose enxuto é proporcional ao porte e ensina as peças. Descartados: Laradock (over-engineering), Sail (só dev), FrankenPHP (adiado — dominar o clássico primeiro).

**Emenda 2026-08-24 (bloco `compose-por-worktree`, paga a P-03):** o Compose já isola projeto, rede e volume por diretório — uma worktree sobe `lotus-infra_lotus-db`, o main tree sobe `lotus_lotus-db` —, mas **não** isola porta host. As portas publicadas de `docker-compose.yml` vêm de variáveis `LOTUS_DEV_*` com default igual à porta histórica, e o `.env` da raiz (gitignored, molde em `.env.example`) escolhe o offset da árvore. O serviço `app` deriva das mesmas variáveis as cinco chaves que carregam porta dentro do valor (`APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `AWS_ENDPOINT_PUBLIC`, `AWS_URL`), e o Vite deriva a sua porta e o `VITE_API_URL`. O prefixo é `LOTUS_DEV_` e não `LOTUS_` porque `docker-compose.prod.yml` lê o mesmo `.env`. Catraca: `frontend/tests/compose-dev.test.ts`.

## ADR-14 — Compute/Deploy: EC2 única com Docker Compose
**Regra:** EC2 única rodando os containers via Docker Compose. Sem ECS/Fargate, sem Copilot/CodePipeline (MVP). **Porquê:** menor custo, controle total, aprende a base de infra. Trade-off aceito conscientemente: responsabilidade operacional é do dev (patching SO, TLS, monitorar/reiniciar, backup) — a senioridade está em automatizar esse trabalho.

**Itens `[FASE 2]` a resolver:** TLS automático (Let's Encrypt + Certbot no Nginx); deploy reproduzível (script git pull → rebuild → restart; GitHub Actions quando incomodar — não montar pipeline no dia 1); backup do banco (snapshot RDS); monitoramento básico (healthcheck + alerta CloudWatch).

## ADR-15 — i18n: ES-CL / PT-BR / EN, dicionários separados por camada

**Regra:**
1. **Front:** `i18next` + `react-i18next` + `i18next-browser-languagedetector`, configurados em
   `shared/config/i18n.ts`. Dicionários são JSON em `shared/config/locales/` (`es-CL`, `pt-BR`,
   `en`), importados no bundle. **`es-CL` é o fallback e a referência de rótulo** — o produto é
   para o cliente chileno; as 3 chaves são idênticas entre os locales.
2. **Back:** `lang/` do Laravel cobre **só as mensagens que a API emite** (validação, auth) dentro
   do envelope RFC 7807 (ADR-03). O front manda `Accept-Language`; o middleware `SetLocale`
   (`Shared/Http/Middleware`) normaliza (`es-CL` → `es_CL`) e ajusta o locale da app.
3. **Os dois dicionários são independentes** — nenhuma chave é compartilhada, nada é compilado de
   um lado para o outro.

**Porquê:** o front é uma SPA que consome JSON, não um app Blade — não há bootstrap do servidor
onde injetar o dicionário, e o rótulo de tela nunca precisa existir em PHP. Cada camada traduz o
que ela mesma emite: rótulo/tela é do front, mensagem de erro da API é do back. `i18next` é o
padrão de fato do ecossistema React e resolve detecção/fallback/interpolação sem código nosso.

**Revisão (2026-07-17).** A versão original deste ADR mandava "localização do Laravel como fonte;
compilar traduções PHP → JSON via Vite" para não duplicar dicionário, e deixava a biblioteca
`[A CONFIRMAR NA FASE 2]`. **Nada disso foi construído** e a decisão real foi outra: não existe
plugin de compilação no `vite.config.ts`, e os dois dicionários vivem separados desde a fundação da
UI. O texto acima descreve o que existe. A premissa "evita duplicar dicionário" não se sustentou:
não há duplicação a evitar, porque os conjuntos de mensagem não se sobrepõem.

**Proveniência ratificada (doc-sync 2026-07-30):** a revisão não trazia atribuição nominal explícita
no texto; confirmada como decisão do João no portão de triagem do bloco `hardening-doc-sync-sprint4`.

**Emenda (2026-08-29, bloco `hardening-i18n-e-erros-api`).** O backend passa a suportar **três**
locales — `en`, `es_CL`, `pt_BR` —, os mesmos três do front. O `lang/es/` saiu: era byte-idêntico ao
`lang/es_CL/` nos oito arquivos, e como o Laravel não funde arquivo de tradução parcialmente, chave
ausente em `es_CL` cai no `fallback_locale` e nunca em `es` — manter os dois só funcionaria
duplicando 100% do conteúdo para sempre. `Accept-Language: es` passa a cair no fallback es-CL, que
este ADR já fixava. `APP_FALLBACK_LOCALE` passa a `es_CL` no `.env.example` e no `phpunit.xml`, que
não o fixava e deixava a suíte herdar o `.env` gitignored da máquina.

**Nota:** filtrar recomendações de i18n que pressupõem Inertia (não usamos).

## ADR-16 — Tailwind como layout; tema do PrimeReact trocado em runtime

**Contexto.** Tailwind v4 está instalado e em uso desde o shell. PrimeReact traz temas
CSS completos. Sem decisão, o dark mode ficou pela metade: a classe `dark` no `<html>`
move o Tailwind, mas não alcança o interior dos componentes Prime — `main.tsx` carregava
apenas `lara-light-blue`.

**Decisão.**
1. As duas folhas do tema Prime (`lara-light-blue`, `lara-dark-blue` — **substituídas pelas cópias
   geradas, ver ponto 5**) são carregadas por
   um `<link id="prime-theme">` cujo `href` troca junto com o `uiStore.theme`. `applyPrimeTheme()`
   roda ANTES de `createRoot().render()` (folha pendente no `<head>` bloqueia o primeiro paint).
2. Tailwind é camada de **layout** (grid, espaçamento, tipografia dos nossos elementos).
3. Customizar um componente PrimeReact acontece **no wrapper** `shared/ui`, via `className`
   na raiz ou `pt` (passthrough) nas partes internas. Nunca `dark:` cru no call-site sobre
   um componente Prime.
4. Cores que precisam acompanhar o tema usam as CSS vars do Lara
   (`--surface-section`, `--surface-card`, `--surface-border`, `--text-color`),
   não pares `bg-white dark:bg-slate-800`.
5. **Identidade própria sobre o Lara (2026-08-11).** Os temas carregados são cópias GERADAS
   (`frontend/scripts/generate-brand-theme.mjs` → `src/shared/styles/themes/lara-*-lotus.css`)
   com a escala celeste da marca no lugar do azul, radius 4px e Inter self-hosted — porque o Lara
   compila cores inline (97 hexes) e override de token não alcança as regras. Uma camada fina
   (`frontend/src/shared/styles/brand-theme.css`) cobre o que é regra nova: foco visível de
   teclado e `tabular-nums` em células. O texto navy sobre a primária (AA) é propriedade do tema
   gerado, não da camada fina. Guarda de drift: `frontend/tests/brand-theme.test.ts`.
   A **exceção de shell** — o `Sidebar`/`AppLayout`/`AppHeader` fora do ponto 4, aprovada em
   2026-07-26 e registrada em `docs/superpowers/backlog.md` (BD-3) — **acabou**: o shell consome
   os tokens do tema, e a sidebar navy fixa nos dois temas é regra, não par `dark:`.

**Consequência.** Os `dark:` espalhados nos wrappers viram redundantes e são removidos.
O `<link>` do tema é injetado no topo do `<head>` para que as utilities do Tailwind
continuem vencendo por ordem de cascata. Utility não vence a especificidade do tema — ao
depurar estilo, cheque o seletor COMPLETO que o markup gera, não a classe isolada.

**Rejeitado.** PrimeReact `unstyled` + `pt` global com Tailwind: controle total, mas
reescreve todos os wrappers e abandona o visual Lara. Desproporcional ao estágio do projeto.

> **Nota de sync:** o ADR-16 nasceu no desenvolvimento (repo) e foi **espelhado para o canônico do
> Drive** (`decisao-stack.md`) em **2026-07-31**, junto com ADR-15 (revisão), ADR-18 e ADR-19 —
> P-17 encerrada.
>
> **Proveniência ratificada (doc-sync 2026-07-30):** o texto não trazia atribuição nominal explícita;
> confirmada como decisão do João no portão de triagem do bloco `hardening-doc-sync-sprint4`.
>
> O ponto 5 (2026-08-11) **ainda não está espelhado** no Drive — conferido no `/fechar-sprint` de
> 2026-08-12, que também mediu por que não fechou ali: as ferramentas de Drive do agente são de
> leitura, não de escrita. Rastreado como **P-31** em `docs/superpowers/pendencias/abertas.md`.

## ADR-17 — Código de negócio para Orçamento/Cotação (rastreio manual do cliente)

**Regra:**
- `budgets.code` (varchar, `UNIQUE`, **imutável**) gerado na Action de criação a partir do
  próprio `id` (`'Scap ' . id`) — **sem** tabela de sequência dedicada. Nullable no schema porque
  o `id` só existe depois do insert; a Action preenche na mesma transação.
- `quotes.seq_in_budget` (smallint) = contador atômico por orçamento via `lockForUpdate()` em
  transação; índice `UNIQUE(budget_id, seq_in_budget)` como defesa extra.
- O código composto (`Scap 100 - Cot 2`) é **calculado** (accessor/DTO), nunca persistido como string.
- Geração na **aplicação**, não em trigger (coerente com ADR-08). `id` bigint continua sendo a FK
  em todo relacionamento — `codigo` nunca vira FK.
- `course_certificate_templates.version` (int) = **segundo consumidor do mesmo padrão** (2026-08-12):
  `MAX(version)+1` com `lockForUpdate()` em transação no `CreateCertificateTemplateAction`, índice
  `UNIQUE(course_id, version)` como defesa extra, e `withTrashed()` na conta porque o replace nested
  do `UpdateCourseAction` arquiva e recria. Não é ADR nova: é este ADR aplicado de novo.

**Porquê:** separa a natural key (rastreio legível que o cliente pede por telefone/e-mail) da
surrogate key (`id`). Evita reaproveitamento de número após soft-delete. Trade-off: lock
transacional na criação de cotação — custo desprezível a ~10 usuários. Descartados: segundo
`AUTO_INCREMENT` (InnoDB só permite um por tabela); `COUNT(*)` de cotações (race condition +
reaproveitamento de número).

**Estado:** implementado na Sprint 2 (`CreateBudgetAction`, `CreateQuoteAction`) — ver
`docs/der-fisico.md` para o schema real.

## ADR-18 — Frontend: clientes REST (`createCrudResource`) na camada `shared/api`

**Regra:**
- Todo cliente REST de recurso (`createCrudResource<T>('resource')`) vive em `shared/api/*Api.ts`,
  nunca dentro de uma feature.
- Feature fica com UI, hooks de tela e regra de negócio (`useXForm`, dialogs, mutações de
  sub-recurso acopladas a uma tela — ex.: `useCourseRedatores`, `useRedatorDocuments`).

**Porquê:** o cliente gerado por `createCrudResource` é glue burro e tipado sobre uma rota REST
pública do backend — mesma categoria dos tipos gerados, que já vivem todos em
`shared/types/generated.ts` (ADR-04). Não encapsula regra, então não pertence à feature; o que
encapsula (formulário, composição de tela) permanece nela. Como feature não importa feature
(ADR-05), qualquer recurso referenciado por mais de uma feature (relações cross-domínio:
redator↔curso, cotação→cliente) precisaria ser promovido — em vez de decidir caso a caso, o
cliente **sempre** nasce em `shared/api`. Mantém `shared/api` como manifesto da superfície REST do
app. Descartado: lookup fino em `shared` + CRUD na feature — duplica query keys e cria stale de
cache na invalidação (feature invalida `keys.all`, lookup usa outra key), complexidade sem retorno
a ~10 usuários.

## ADR-19 — Dinheiro em decimal + bcmath, nunca float

**Contexto.** Valores em UF (cotação, orçamento) são registro de peso legal: entram em proposta
comercial assinada e viram base de faturamento. `float`/`double` não representam decimais exatos
(`0.1 + 0.2 = 0.30000000000000004`); somar N cotações em float acumula erro que aparece como
centavo faltando no total exibido ao cliente. O padrão já existia no código desde a Sprint 2 — este
ADR o formaliza, não o inaugura.

**Regra:**
1. **Coluna** de dinheiro é `decimal(12,4)` (`quotes.value_uf`). Nunca `float`/`double`.
2. **Cast** do Eloquent é `'decimal:4'` — o model devolve string, não float.
3. **Aritmética** de dinheiro usa **bcmath** (`bcadd`/`bcsub`/`bcmul`/`bccomp`), sempre com a escala
   explícita (`4`) e operandos em string. Nunca `+`, `array_sum()` ou `Collection::sum()` sobre
   valor monetário. Referência: `BudgetSummaryService::totalValueUf()`.
4. **DTO** expõe o valor como `string` (`BudgetData::$total_value_uf`), não `int|float` — o tipo TS
   gerado é `string` e o front formata (`uf` em `features/commercial/lib`), sem reconverter.
5. A extensão `bcmath` está no `docker/php/Dockerfile` — é dependência de execução, não opcional.

**Escopo.** Dinheiro e UF. **Não** se aplica a contador inteiro (`student_count` soma com
`Collection::sum()` — inteiro não tem erro de representação) nem a horas (`theory_hours`,
`practice_hours`, `workload_hours` são `smallint`).

**Porquê:** correção exata pelo mesmo motivo do resto do projeto — certificado e proposta têm peso
legal, e "quase certo" em dinheiro é errado. Trade-off aceito: bcmath é verboso (string entra,
string sai) e ~ordem de grandeza mais lento que float — irrelevante a ~10 usuários somando dezenas
de cotações.

**Descartados:** *float com `round()` na borda* — empurra o erro para a última casa e falha em
comparação (`0.1+0.2 == 0.3` é `false`); *inteiro de centavos* (armazenar `value_uf * 10000`) —
funciona, mas força conversão em toda leitura/escrita e no front, e `decimal` + bcmath já resolve
com o schema legível; *`brick/math` ou value object `Money`* — abstração de uso único no estágio
atual, o `BudgetSummaryService` é o único lugar que soma dinheiro. Se um segundo agregado precisar
somar valor, reconsiderar o value object.

## ADR-20 — Importação de planilha: OpenSpout em streaming
**Regra:** `openspout/openspout ^5.3` lê planilha enviada pelo usuário, em **streaming** — o
`SpreadsheetRowReader` (`app/Domains/Operation/Services/`) entrega linha a linha por `\Generator`, e
nada além da linha corrente fica em memória. Extensões aceitas: `xlsx`, `csv`, `txt`; qualquer outra
é `ValidationException` no próprio reader. Os dois readers são abertos com
`SHOULD_PRESERVE_EMPTY_ROWS: true`.

**Porquê.** O consumidor é a importação de alunos em massa (`ImportStudentsAction`), onde a planilha
é do cliente e o tamanho não é nosso: carregar o documento inteiro para ler N linhas é o custo que a
biblioteca existe para evitar. O `SHOULD_PRESERVE_EMPTY_ROWS` não é preferência — sem ele, XLSX e CSV
descartam linha em branco **antes** de o consumidor vê-la e recontam do zero, e o número de linha que
o operador lê no erro deixa de ser o número de linha da planilha dele.

**Eixo próprio, não nota.** O precedente de 2026-08-10 manda registrar biblioteca nova como nota no
ADR existente **do mesmo eixo**; aqui não há. ADR-11 decide onde o arquivo mora e como é servido,
ADR-12 é geração de documento — o OpenSpout é ingestão, e ingestão não tinha ADR.

**Descartado:** PhpSpreadsheet — carrega o documento inteiro em memória, o oposto do requisito.

## ADR-21 — Logs de ações centralizados no monólito, sem microserviço em nuvem

**Contexto.** O `RNF-SEC-05` da fonte canônica pede, literalmente: *"Micro-serviço em nuvem com logs
das ações do software, com registro das ações feitas"* (Drive, replicado na spec
`docs/superpowers/specs/archive/2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md:64-65`).
Antes deste bloco não havia log de ação nenhum: `config/logging.php` era o stub vanilla do Laravel, e
o app inteiro tinha só três chamadas de `Log::warning` de descarte de arquivo órfão (medição da spec
§1).

**Regra:** os logs de ações do software são centralizados **dentro do monólito**, num canal próprio —
`seguranca` (`backend/config/logging.php:134-142`, driver `monolog` sobre `stderr`, formatado em JSON)
— escrito por um ponto único, `EventoDeSeguranca`
(`backend/app/Shared/Logging/EventoDeSeguranca.php`). Não existe, nem nasce deste bloco, nenhum
microserviço próprio para esta função, em nuvem ou não.

**Decisão do João, 2026-08-26:** centralizar dentro do monólito em vez de construir um serviço
separado (spec **D5**).

**Porquê.** O projeto atende ~10 usuários internos, roda numa única EC2 (ADR-14) e não tem worker de
fila — medido: `SESSION_DRIVER`, `CACHE_STORE` e `QUEUE_CONNECTION` são `database` e nenhuma classe
implementa `ShouldQueue` (cabeçalho do `docker-compose.prod.yml`). Um microserviço de logs próprio,
neste porte, é **mais superfície de operação do que proteção**: mais um deploy, mais uma rede, mais um
componente que pode cair — enquanto o monólito já escreve em `stderr` e o Docker já coleta. Adicionar
um serviço só para reempacotar o mesmo evento multiplica o que pode falhar sem multiplicar o que fica
provado.

**O que se perde.** Sem um coletor externo, o log **morre com a instância**: se o coletor (CloudWatch
ou equivalente, item 10 do backlog — `infra-producao-provisionamento-aws`) não estiver de pé quando a
EC2 sumir, não há para onde o evento ter escapado antes. E a retenção do log, hoje, é só o teto local
do Docker — `json-file` **10 MB × 3** (`x-logging` em `docker-compose.prod.yml`), pensado originalmente
como proteção de disco (spec D9) e que passa a valer, também, como a política de retenção declarada do
log de segurança: quando o teto girar, o evento mais antigo deixa de existir.

**Isto substitui a forma escrita no requisito.** O que existe — um canal dentro do monólito — não é
uma leitura equivalente de "micro-serviço em nuvem"; é uma **substituição deliberada**, registrada
aqui por escrito. O Drive é a fonte canônica e vence os `/docs` (`CLAUDE.md` §3): este ADR documenta a
substituição do lado do código, mas não fecha a divergência sozinho — a revisão do `RNF-SEC-05` ainda
precisa ser **replicada no Drive** por João Victor. Até lá, a P-64 (`docs/superpowers/pendencias/abertas.md`)
mantém essa divergência visível para que uma sessão futura não reabra a decisão sem saber que ela já
foi tomada.

**Descartado:** microserviço de logs em nuvem, na forma literal do requisito — desproporcional ao
porte atual do time e da infraestrutura (uma EC2, sem fila); reavaliável se o projeto crescer o
suficiente para justificar operar um componente a mais.

---

## ADR-22 — Contrato de paginação próprio (`App\Shared\Pagination`), não o `LengthAwarePaginator`

**Contexto (2026-08-28):** nenhum endpoint de lista paginava; três crescem sem teto (alunos,
certificados, turmas). O `LengthAwarePaginator` do Laravel devolve `links/path/from/to` que a
SPA não lê, e o alias TS que o `typescript-transformer` emite para `PaginatedDataCollection`
aponta para a classe do framework sem tipo — o front tiparia à mão de qualquer jeito.

**Decisão:** `PageRequest` (entrada: `page` ≥ 1, `per_page` 1..100 default 25, `q` ≤ 100,
`sort` só da allowlist do builder — fora dela 422, nunca clamp), `PageData { data, meta }` com
`PageMetaData { page, per_page, total, last_page, total_unfiltered }`, e o trait `Paginates` no
QueryBuilder custom do agregado (ADR-02: builder, não Repository). `total_unfiltered` é medido
depois de `visibleTo` e antes de `q`/filtro, para o front medir o EFEITO do filtro. Busca e
filtro nomeado vão para o SQL, com paridade por teste contra a classificação de domínio
(`CertificateDisplayStatusParityTest`, `TurmaStatusParityTest`). Só pagina lista que cresce sem
teto; as bounded continuam devolvendo array.

**Consequências:** o front tem UM lugar que conhece o envelope (`shared/api/page.ts`) e UM hook
(`useServerTable`) com a mesma forma do `useTableFilter`, então a moldura não distingue as duas
fontes. Cursor foi descartado: sem `total`, o paginador e o rodapé de contagem morrem. Cache e
Redis ficam fora por decisão (spec D12), não por adiamento.

---

## Pendências abertas (não decidir sem o João Victor)
- ~~Estratégia fina de pruning da auditoria (ADR-08)~~ — **paga por este bloco.** Ver
  `RetentionPolicy` (`backend/app/Shared/Retention/RetentionPolicy.php`, janelas de 12 meses/5
  anos/12 meses) e os comandos `lotus:podar-auditoria` (`PodarAuditoria`) e `lotus:podar-logins`
  (`PodarLogins`), agendados em `routes/console.php` e executados pelo serviço `scheduler` do
  `docker-compose.prod.yml`. O eixo separado de logs de ação (`RNF-SEC-05`) é o ADR-21, acima —
  exportação fria para Glacier segue opcional e sem requisito aprovado.

## Regras de negócio herdadas (referência)
Soft delete nas entidades de negócio; certificados/manuais gerados sob demanda; templates como config versionada do curso; **financeiro não bloqueia ações**; RUT único; valor registrado na cotação; conclusão de turma em dois estágios (documentação habilita, admin confirma); **redator↔turma é N:N** (a v1 previa um redator por turma; superado no Bloco 6b, spec `2026-07-21-bloco6b-turma-designacao-design.md` D5 — pivot `turma_redator`); só admin e redator autenticam (RN-01).
