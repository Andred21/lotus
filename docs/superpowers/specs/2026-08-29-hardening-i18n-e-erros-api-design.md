# Design — `hardening-i18n-e-erros-api`

> Item 7 da fila (`docs/superpowers/backlog.md`), `lane-a`, main tree, branch
> `feat/hardening-i18n-e-erros-api`. Context Packet: **não** — o item é `Contexto: não` e as
> fontes (ADR-03, ADR-15, fichas `D-07`, `D-18`, `D-36`, `D-38`, `D-58`, `P-61`) vivem todas no
> repositório.
> Base de medição: `main@37e0e2d4`.

## 1. Problema

O backlog pede "eliminar mistura de idiomas nas mensagens emitidas pela API". A medição contra
`main@37e0e2d4`, em 2026-08-29, mostra que o mecanismo já existe e **quase nada o usa**:

- **O transporte está pronto e é ignorado.** `Shared/Http/Middleware/SetLocale.php` normaliza
  `Accept-Language` (`es-CL` → `es_CL`) e chama `app()->setLocale()`; o front manda o header em toda
  requisição (`frontend/src/shared/api/axios.ts:49`). Dentro de `app/` existem **22 chaves**
  `__()` no total, e todas são de e-mail (`identity.*`, `seguranca.*`), auth (`auth.failed`,
  `auth.inactive`) ou validação de framework (`validation.in`). **Nenhuma mensagem de regra de
  negócio passa por `__()`.**
- **41 sítios de `ValidationException::withMessages` escrevem literal**, e o idioma varia por
  domínio: `Commercial` escreve português (`'Cotação aprovada não pode ser editada.'`,
  `UpdateQuoteAction.php:22`), `Operation` e `Certification` escrevem espanhol
  (`'La clase ya fue concluida…'`, `Turma.php:201`). O usuário chileno lê um ou outro conforme o
  endpoint — é a `D-07`, e a `D-58` é uma instância dela.
- **O envelope RFC 7807 é português fixo.** `ProblemDetails.php:24-31` traz seis `title` literais
  (`Erro de validação`, `Não autenticado`, `Acesso negado`, `Recurso não encontrado`,
  `Erro na requisição`, `Erro interno`) e `detailFor` mascara o 500 com
  `'Ocorreu um erro inesperado. Tente novamente.'`. É a `D-36` e a `P-61`.
- **O `detail` de 401/403/404 é o `getMessage()` cru do framework — inglês.** `detailFor` devolve
  `$e->getMessage()` para todo status que não seja 500, e a `AuthorizationException` do Laravel
  carrega `This action is unauthorized.`. **Isto não estava em ficha nenhuma**; foi medido aqui.
- **Seis `description` do Dashboard são frase pronta em espanhol** (`CommercialMetricsQuery.php:48`
  e `:64`, `CertificationMetricsQuery.php:40` e `:76`, `OperationMetricsQuery.php:128` e `:136`,
  `IdentityMetricsQuery.php:54`), três delas montadas por concatenação. É a `D-18`; a `D-38` é a
  consequência visível (`PendingList.tsx:30` imprime o código do enum cru).
- **O espanhol está duplicado e o dicionário JSON de es-CL não existe.** `lang/es/` e `lang/es_CL/`
  são **byte-idênticos** nos oito arquivos (`diff -q`, 8/8 iguais), e existem `en.json`, `es.json` e
  `pt_BR.json` — mas **não** `es_CL.json`. Como o Laravel não funde arquivo parcialmente, uma chave
  ausente em `es_CL` cai no `fallback_locale`, nunca em `es`: manter os dois só funciona duplicando
  100% do conteúdo para sempre.
- **`.env.example` declara `APP_FALLBACK_LOCALE=en`**, contra o ADR-15, que fixa es-CL como
  fallback e referência de rótulo.
- **A suíte depende de arquivo gitignored.** `phpunit.xml` não fixa `APP_LOCALE`; a suíte herda o
  `.env` da máquina (`APP_LOCALE=es_CL`). Em CI, sem `.env`, roda em `en`. Nove arquivos de teste
  casam literal de mensagem hoje.

## 2. O que a fonte canônica exige

- **ADR-15** — `lang/` do Laravel cobre só as mensagens que a API emite (validação, auth) dentro do
  envelope RFC 7807; o front manda `Accept-Language`; `SetLocale` normaliza; **es-CL é o fallback e
  a referência**. Os dois dicionários (front e back) são independentes: nenhuma chave é compartilhada.
- **ADR-03** — toda resposta de erro segue RFC 7807, formatada no handler global.
- **CLAUDE.md §5.4** — erros sobem ao handler global; nunca `abort(422)`.
- **CLAUDE.md §5.3** — `generated.ts` não se edita à mão. Este bloco **não muda contrato**
  (ver §4.4), e a lei não é disparada.
- **ADR-02** — DDD-lite sem Repository. `__()` é helper de aplicação, não de infraestrutura.

## 3. Decisões

### D1 — o backend traduz a frase do Dashboard, e isto **derruba** a D1 de 2026-08-22

A spec `specs/archive/2026-08-22-frontend-revisao-ui-por-modulo-design.md` decidiu, na D1, "o
backend manda as partes, o cliente compõe", com a razão explícita: *"Localizar a frase no backend
exige `Accept-Language`, que hoje não existe"*.

**A razão não vale mais, e não valia já naquele dia:** o `SetLocale` está registrado e o axios manda
o header. Decisão do João em 2026-08-29: **o `description` continua no payload e passa a ser
traduzido no backend**, por `__()` com chave e parâmetros. A `D-18` e a `D-38` fecham pelo mesmo
mecanismo, o contrato não muda e o front não recebe diff.

Consequência aceita e escrita: a lista de documentos faltantes segue chegando como texto
interpolado (`:tipos`), então o cliente não pode reformatá-la. Quem quiser a lista estruturada
abre bloco próprio — este não a promete.

### D2 — chave por domínio, um arquivo por domínio

`lang/<locale>/<dominio>.php`, espelhando a divisão de `app/Domains/`. Precedente vivo:
`identity.php` e `seguranca.php` já existem e são consumidos por `__()`.

Recusado o arquivo `errors.php` único: é o arquivo que toda lane de backend editaria, conflito de
merge garantido no modo multi-lane, e cresce sem teto. Recusado o dicionário JSON com a frase como
chave: `es_CL.json` não existe, a chave-frase quebra a cada correção de vírgula do espanhol e a
paridade entre locales fica sem catraca barata.

### D3 — o espanhol é `es_CL`, e só

`lang/es/` e `lang/es.json` saem; `lang/es_CL.json` nasce com o conteúdo que era o de `es.json`;
`SetLocale::SUPPORTED` passa a `['en', 'es_CL', 'pt_BR']`; `.env.example` passa a
`APP_FALLBACK_LOCALE=es_CL`.

Ficam **três** locales no backend, os mesmos três do front (`es-CL`, `pt-BR`, `en`) — e é essa
igualdade que torna a paridade mensurável. O front nunca mandou `es` puro; quem mandar cai no
fallback es-CL, que é o que o ADR-15 manda.

### D4 — o bloco é de backend; o `screenDetail` do front não é tocado

O front hoje **engole** o `detail` do servidor em erro de carga
(`frontend/src/shared/lib/screenDetail.ts:37`), e o docblock dele nomeia este débito como a razão.
As 41 mensagens de domínio já chegam à tela pelos formulários (`problemMessage.ts:14`,
`useEntityForm.ts:57`) — a supressão pega só erro de GET.

Decisão do João: **não virar essa chave aqui**. O DoD se prova na API. O bloco corrige o **texto**
do docblock (o débito de backend foi pago) sem mudar comportamento, e abre ficha nova apontando a
virada para a frente de frontend.

Recusado virar a chave agora: exigiria que nenhum `getMessage()` cru escapasse à tela, o que
transforma um bloco de backend em backend+frontend com superfície de risco maior que o ganho.

### D5 — os defaults do framework também são localizados

`detailFor` para de devolver `$e->getMessage()` cru nos status que o framework escreve
(401/403/404). Sem isso, o 403 continua respondendo `This action is unauthorized.` em inglês depois
de o bloco inteiro passar — o achado que nenhuma ficha tinha.

**A regra é por TIPO de exceção, não por inspeção do texto** — adivinhar se uma string "parece do
framework" seria heurística sobre conteúdo, exatamente o que a lei de auditoria do projeto recusa
em outros lugares. `AuthenticationException`, `AuthorizationException`, `NotFoundHttpException` e
`ModelNotFoundException` passam a ter `detail` de `lang/`, ignorando o `getMessage()`.

Mensagem escrita por nós continua vencendo, e são duas as portas: `ValidationException` (o `detail`
é a primeira mensagem de campo, já localizada no `throw`) e quem implementa `PublicDetail` (escrito
para quem lê a resposta — regra do bloco de certificação). As duas mantêm o próprio `detail`.

Consequência aceita: um `abort(403, 'motivo específico')` perderia o motivo. Medição: **não existe
`abort()` com mensagem própria nesses quatro tipos** no repositório — e a lei §5.4 já proíbe
`abort(422)`. Se um caso legítimo aparecer, a porta é `PublicDetail`, que já existe.

## 4. Arquitetura

### 4.1 Layout de `lang/`

```
lang/
  en/            es_CL/           pt_BR/
    commercial.php                        # mensagens de recusa do domínio Commercial
    operation.php
    certification.php
    identity.php   (já existe: e-mails)   # as novas entram sob `identity.errors.*`
    dashboard.php                         # os 6 `description` de pendência/alerta
    problem.php                           # o envelope: title, máscara do 500, defaults 401/403/404/429
    shared.php                            # ContentClass, SpreadsheetRowReader
    validation.php / auth.php / …         # os que já existem, intocados
  en.json        es_CL.json       pt_BR.json
```

Chave = `<arquivo>.<agregado>.<motivo>`, ex.: `commercial.quote.approved_cannot_edit`,
`operation.turma.concluded_locked`, `problem.title.forbidden`.

`identity.php` recebe as mensagens de erro sob `errors.*` para não misturar com o corpo dos e-mails
de convite e reset, que já moram lá.

### 4.2 Os sítios que mudam de grafia

| Onde | Sítios | Vira |
|---|---|---|
| `app/Domains/**` — `ValidationException::withMessages` | 41 | `__('<dominio>.<agregado>.<motivo>')` |
| `Shared/Files/ContentClass.php:123`, `Shared/.../SpreadsheetRowReader.php:43,60` | 3 | `__('shared.*')` com `:max`/`:linhas` |
| `ProblemDetails::fromException` — os 6 `title` | 6 | `__('problem.title.*')` |
| `ProblemDetails::detailFor` — máscara do 500, `detail` do 429 | 2 | `__('problem.detail.*')` |
| `ProblemDetails::detailFor` — `getMessage()` cru de 401/403/404 | 1 caminho | `__('problem.detail.*')` **por tipo de exceção** (ver D5) |
| `Domains/Dashboard/Services/*MetricsQuery.php` — `description` | 6 | `__('dashboard.*', [...])` |

`__()` dentro de Model (`Turma`, `Client`, `Redator`) é aceito e declarado: o helper é da
aplicação, o Model já escrevia a frase para o usuário, e o que muda é a grafia — não a camada. O
ADR-02 fica intacto.

### 4.3 Fluxo

`Accept-Language` → `SetLocale` (normaliza, valida contra `SUPPORTED`) → `app()->setLocale()` →
`__()` resolve no momento do `throw` → `ProblemDetails` monta o envelope → `application/problem+json`.

Nada é resolvido antes do middleware; nenhuma mensagem é cacheada entre requisições.

### 4.4 O que **não** muda

`description` continua `string` no DTO. Nenhum campo nasce, muda de tipo ou sai. **`generated.ts`
não muda** e o frontend não recebe uma linha de diff de contrato — provado por
`git diff main...HEAD -- frontend/src/shared/types/generated.ts` vazio no fechamento.

### 4.5 Bordas declaradas

| Entrada | Locale efetivo |
|---|---|
| `Accept-Language` ausente | `es_CL` (fallback do ADR-15) |
| `Accept-Language: es` | `es_CL` (não está em `SUPPORTED`, cai no fallback) |
| `Accept-Language: fr-FR` | `es_CL` |
| `Accept-Language: pt-BR;q=0.9,es` | `pt_BR` — **o primeiro item, sem negociação de `q`** |

A última linha é o comportamento de hoje (`explode(',', $header)[0]`). O bloco **não** o muda; passa
a registrá-lo por escrito e com teste, em vez de deixá-lo acidental.

## 5. Catracas

Cada uma vista **reprovar por sonda negativa** antes de valer.

1. **`LocaleParityTest`** — os três diretórios (`en`, `es_CL`, `pt_BR`) e os três JSON têm o mesmo
   conjunto de chaves, recursivamente; nenhum valor vazio; **nenhum valor igual à própria chave** —
   é assim que tradução faltando se disfarça de tradução feita.
2. **`MensagemLiteralTest`** (estática, sobre o código) — nenhum `ValidationException::withMessages`
   em `app/` com valor literal; nenhum literal nos braços de `ProblemDetails::fromException` e
   `detailFor`. É a régua que impede o 42º sítio de nascer errado.
3. **`EnvelopeLocalizadoTest`** (comportamental) — a MESMA falha, em 403, 404, 422 de domínio, 429 e
   500, com os três `Accept-Language`: três respostas distintas, nenhuma devolvendo chave crua e
   nenhuma devolvendo inglês de framework quando o locale pedido não é `en`.
4. **`phpunit.xml`** fixa `APP_LOCALE=es_CL` e `APP_FALLBACK_LOCALE=es_CL` — a suíte para de
   depender de um arquivo gitignored, e o resultado passa a ser o mesmo na máquina e na CI.
5. Os **nove** arquivos de teste que casam literal passam a casar `__('chave')` sob locale fixado.

## 6. Fora de escopo

- **`screenDetail` do front** (D4) — só o docblock é corrigido; comportamento intocado. Vira ficha.
- **Dicionários do front** (`shared/config/locales/*.json`) — ADR-15: camadas independentes.
- **As URLs de `type` do RFC 7807** — identificador estável, não texto de tela.
- **E-mails** (`identity.*`, `seguranca.*`) — já passam por `__()` e já têm os quatro locales.
- **Lista estruturada de documentos faltantes no payload** — recusada na D1; quem quiser abre bloco.

## 7. Definition of Done

Provado contra a **API real** rodando, nos três locales, depois de qualquer correção de review —
não só na suíte:

1. A mesma recusa de domínio (ex.: concluir turma sem documento) devolve mensagem em es-CL, pt-BR e
   en conforme o `Accept-Language`, com `title` e `detail` **ambos** no mesmo idioma.
2. Um 403 real devolve `title` e `detail` localizados — e **nenhum** dos três devolve
   `This action is unauthorized.`.
3. Um 404, um 422 de validação de framework, um 429 e um 500 mascarado: idem, nos três locales.
4. `GET /api/dashboard/metricas` devolve a pendência `turma_docs_incomplete` com a lista de
   documentos traduzida, nos três locales.
5. Sem header, com `Accept-Language: es` e com `fr-FR`: resposta em es-CL nos três casos.
6. `git diff main...HEAD -- frontend/src/shared/types/generated.ts` **vazio**.
7. Gate: `php artisan test` verde, `pint --test` nos arquivos do bloco, `typescript:transform` sem
   drift, `pnpm lint` 0 e `pnpm build` verde.

## 8. Riscos

- **Regressão silenciosa de texto.** 41 sítios reescritos de uma vez; um erro de chave vira mensagem
  crua na tela de um produto de peso legal. Mitigação: a catraca 1 recusa valor igual à chave, e a 3
  exerce os cinco status ponta a ponta.
- **A suíte muda de locale.** Fixar `APP_LOCALE` no `phpunit.xml` pode revelar testes que passavam
  por acidente do `.env` da máquina. É achado desejado, não dano — mas pode alargar o bloco. Se
  passar de um punhado de arquivos, o plano declara o corte e a ficha.
- **`lang/es/` sai do repositório.** Se algum consumidor não medido pedir `es` puro, ele passa a
  receber es-CL. Medido: o front nunca manda `es`, e não há outro cliente.
- **Ordem de chave vs. interpolação.** Mensagem com `:tipos`/`:max` depende de o parâmetro chegar
  com o mesmo nome nos três locales; a catraca 1 confere chaves, não placeholders. O plano põe o
  teste dos placeholders na task da mensagem dinâmica.
