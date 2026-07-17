# ADRs — Decisões de Arquitetura · Lotus

> Snapshot de 2026-07-04 (atualizado 2026-07-10). Fonte canônica: `Drive/V2/Planejamento/3-avancado/decisao-stack.md`.
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
- Necessária estratégia de pruning da tabela `audits` (poda agendada; opcionalmente exportar histórico frio p/ S3 Glacier).

**Porquê:** o pacote captura `user_id`, IP, User-Agent — o que um trigger NÃO enxerga (trigger vê a conexão, não o usuário da app). Descartados: triggers (cegos ao usuário, invisíveis no código, migrations não versionam bem).

## ADR-09 — Banco: MySQL 8 em AWS RDS gerenciado
**Regra:** MySQL 8 em **RDS gerenciado** (classe pequena, ex. db.t4g.micro, região sul-americana). **NUNCA** no mesmo container/máquina da app. **Porquê:** snapshot automático, patching gerenciado, retenção/restore — persistência segura separada do compute efêmero. Descartado: banco em container/EC2 (risco de perda em restart).

## ADR-10 — Polimorfismo com enforceMorphMap
**Regra:** relações polimórficas do Eloquent (tabela `files`, `audits`) **sempre** com `Relation::enforceMorphMap()` (alias fixos: 'redator', 'cotacao'...) no AppServiceProvider. **Porquê:** sem morph map, o tipo guarda o namespace da classe; renomear/mover classe corrompe dados históricos. O map desacopla do código-fonte. Trade-off: integridade referencial fica na aplicação (aceitável — acesso só via Laravel, baixa concorrência).

## ADR-11 — Storage: AWS S3 + Flysystem, URLs temporárias
**Regra:**
- Documentos sensíveis no S3 via Flysystem. Acesso por **URLs pré-assinadas temporárias** (`temporaryUrl()`), não servindo o binário pela aplicação.
- Foto de perfil = coluna simples. Documentos = tabela `files` polimórfica.

**Porquê:** cliente baixa direto do S3 (não sobrecarrega o servidor); URLs efêmeras não compartilháveis indefinidamente. Descartados: Google Drive (legado v1, amador), binário no banco/servidor.

## ADR-12 — PDF: Spatie Laravel PDF + Gotenberg (Chromium headless)
**Regra:** Spatie Laravel PDF com driver **Gotenberg** (container separado). Geração **sob demanda**, stream direto para S3, sem escrever em `/tmp`. **Porquê:** renderização fiel de CSS moderno e QR; isola a carga pesada de PDF do servidor da app (evita memory exhausted do DomPDF em lote). Descartados: DomPDF (CSS limitado, estoura memória), Snappy/wkhtmltopdf (defasado).

## ADR-13 — Containerização: Docker Compose artesanal + multi-stage, sem Laradock
**Regra:** `docker-compose.yml` artesanal (só serviços usados); imagem de produção via multi-stage build (Composer → Node/Vite → final Alpine enxuto). Serviços: PHP-FPM + Nginx; MySQL via RDS em prod (não em container). **Porquê:** Compose enxuto é proporcional ao porte e ensina as peças. Descartados: Laradock (over-engineering), Sail (só dev), FrankenPHP (adiado — dominar o clássico primeiro).

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

**Nota:** filtrar recomendações de i18n que pressupõem Inertia (não usamos).

## ADR-16 — Tailwind como layout; tema do PrimeReact trocado em runtime

**Contexto.** Tailwind v4 está instalado e em uso desde o shell. PrimeReact traz temas
CSS completos. Sem decisão, o dark mode ficou pela metade: a classe `dark` no `<html>`
move o Tailwind, mas não alcança o interior dos componentes Prime — `main.tsx` carregava
apenas `lara-light-blue`.

**Decisão.**
1. As duas folhas do tema Prime (`lara-light-blue`, `lara-dark-blue`) são carregadas por
   um `<link id="prime-theme">` cujo `href` troca junto com o `uiStore.theme`. `applyPrimeTheme()`
   roda ANTES de `createRoot().render()` (folha pendente no `<head>` bloqueia o primeiro paint).
2. Tailwind é camada de **layout** (grid, espaçamento, tipografia dos nossos elementos).
3. Customizar um componente PrimeReact acontece **no wrapper** `shared/ui`, via `className`
   na raiz ou `pt` (passthrough) nas partes internas. Nunca `dark:` cru no call-site sobre
   um componente Prime.
4. Cores que precisam acompanhar o tema usam as CSS vars do Lara
   (`--surface-section`, `--surface-card`, `--surface-border`, `--text-color`),
   não pares `bg-white dark:bg-slate-800`.

**Consequência.** Os `dark:` espalhados nos wrappers viram redundantes e são removidos.
O `<link>` do tema é injetado no topo do `<head>` para que as utilities do Tailwind
continuem vencendo por ordem de cascata. Utility não vence a especificidade do tema — ao
depurar estilo, cheque o seletor COMPLETO que o markup gera, não a classe isolada.

**Rejeitado.** PrimeReact `unstyled` + `pt` global com Tailwind: controle total, mas
reescreve todos os wrappers e abandona o visual Lara. Desproporcional ao estágio do projeto.

> **Nota de sync:** o ADR-16 nasceu no desenvolvimento (repo) e ainda **não foi espelhado
> para o canônico do Drive** (`decisao-stack.md`) — follow-up de write externo.

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

---

## Pendências abertas (não decidir sem o João Victor)
- Estratégia fina de pruning da auditoria (ADR-08).

## Regras de negócio herdadas (referência)
Soft delete nas entidades de negócio; certificados/manuais gerados sob demanda; templates como config versionada do curso; **financeiro não bloqueia ações**; RUT único; valor registrado na cotação; conclusão de turma em dois estágios (documentação habilita, admin confirma); um redator por turma; só admin e redator autenticam (RN-01).
