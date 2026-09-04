# Spec — `backend-envelope-de-erro-e-recusa-de-dominio`

> Item 26 da fila · `lane-a` · main tree · branch `refactor/backend-envelope-de-erro-e-recusa-de-dominio`
> (aberta de `main@4a0080ce`) · Context Packet: **não** (`Contexto: não` na ficha; as fontes vivem no
> repositório) · brainstorming de 2026-09-02 com o João.

## 1. O problema, medido

A decisão sobre o envelope de erro está repartida entre quatro camadas, e cada uma sabe um pedaço
do que a outra precisa:

- **quatro exceções de domínio estendem `HttpException` e fixam o status na factory** —
  `Operation/Exceptions/TurmaConfiguracaoException.php:15,20`,
  `Operation/Exceptions/RedatorNaoElegivelException.php:16,21`,
  `Identity/Exceptions/ImmutableSystemRoleException.php:26`,
  `Identity/Exceptions/RedatorOnlyActionException.php:24`;
- **`ProblemDetails` fareja esse status de volta** — `isForbidden()` (`ProblemDetails.php:108-111`)
  identifica 403 por `getStatusCode() === 403`, com 14 linhas de comentário em `:104` explicando
  por que precisa farejar;
- **a frase que o usuário lê nasce ora de `lang/`, ora literal dentro da exceção** — cinco recusas
  seguem literais (`P-71`), duas delas em pt-BR num produto es-CL;
- **o 419 devolve `CSRF token mismatch.` em inglês nos três locales** (`P-72`), porque o `default`
  do `detailFor()` é `$e->getMessage() ?: __('problem.detail.generic')` e frase não vazia vence o
  fallback.

Depois deste bloco a exceção **declara a recusa** e o `ProblemDetails` — que já é o dono do
envelope — traduz recusa em status e em frase localizada.

## 2. Decisões

| # | Decisão | Alternativas descartadas |
|---|---|---|
| **D1** | Classe base `RecusaDeDominio` + enum `TipoDeRecusa`, com o mapa tipo→status num lugar só. | *Interfaces marcadoras* (`RecusaDeEntrada`/`RecusaDeAcesso`): sem herança, mas o mapa volta a ser `instanceof` repetido em cada consumidor, e não há lugar único para o logger consultar. *Manter `HttpException`*: pagaria `P-71`/`P-72` e deixaria o candidato 6 fora — o transporte segue vazando para o domínio. |
| **D2** | O enum nomeia **`RegraDeNegocio`** (422) e **`AcaoProibida`** (403). | `ConfiguracaoInvalida` para o 422 — nome estreito demais: o tipo cobre as quatro recusas de Operation, não só configuração de turma. |
| **D3** | O 419 ganha **braço próprio** `TokenMismatchException => __('problem.detail.csrf')` no `detailFor()`. | *A catraca passa a enxergar `getMessage()` de exceção de framework*: transformaria `MensagemLiteralTest` num varredor de biblioteca de terceiro, sem lista fechada. |
| **D4** | **`P-60`, metade de comportamento: continua estourando.** O gate `assertPresentable()` não muda; `show`, PDF e QR seguem recusando juntos. Só o idioma da frase muda. | *Degradar na rota pública* (200 com o que o snapshot tem): obrigaria `PublicCertificateData` a aceitar nome vazio e contradiz a política escrita no docblock da própria exceção — documento de peso legal não atesta o que não sabe. *Recusa nomeada em 422*: tiraria o caso do teto de 500 sem que o SPA tenha estado próprio para ele; a mudança de status seria contrato novo sem consumidor. |
| **D5** | `CorruptedSnapshotException` **não** vira `RecusaDeDominio`. | Herdar da base a arrastaria para o mapa 422/403, contra a D4. Ela segue `RuntimeException implements PublicDetail`. |
| **D6** | `InactiveAccountException` fica **fora do bloco**. | É 401 por `AuthenticationException`, não recusa de domínio; já é `PublicDetail` e já lê `lang/`. |

## 3. O mecanismo

Três peças novas em `app/Shared/Exceptions/`:

```php
enum TipoDeRecusa
{
    case RegraDeNegocio;   // 422
    case AcaoProibida;     // 403

    public function status(): int { ... }
}

abstract class RecusaDeDominio extends RuntimeException implements PublicDetail
{
    abstract public function tipo(): TipoDeRecusa;
}
```

As quatro exceções passam a estender `RecusaDeDominio`, declaram o tipo e param de citar status.
`ProblemDetails` ganha um braço `RecusaDeDominio` **antes** do braço `HttpExceptionInterface` no
`match` de status/título. **O `detailFor()` não ganha braço** — medido no planejamento: a base
implementa `PublicDetail`, e o `if ($e instanceof PublicDetail || $e instanceof ValidationException)`
de `ProblemDetails.php:78` já devolve `getMessage()`. É o mesmo `detail` que as quatro exceções
produzem hoje; braço novo ali seria código morto.

**`isForbidden()` não morre.** O 403 real nasce do spatie (`UnauthorizedException extends
HttpException`), não do domínio — o próprio candidato 6 registra isso. O que encolhe é o que ele
precisa cobrir, e o comentário de 14 linhas encolhe junto, para o que continua verdade.

### 3.1 A terceira consumidora do mapa

`RegistraEventoDeErro::isAcessoNegado()` (`:103`) casa hoje `HttpExceptionInterface &&
getStatusCode() === 403`. Sair de `HttpException` tira `ImmutableSystemRoleException` e
`RedatorOnlyActionException` do evento `acesso.negado` **em silêncio** — nenhum teste do
repositório mede isso hoje. O método passa a perguntar também
`$e instanceof RecusaDeDominio && $e->tipo() === TipoDeRecusa::AcaoProibida`.

Isto não reabre a D6 da spec de 2026-08-26 (que fixou o ponto de captura no braço 403 genérico): o
teto continua sendo "qualquer 403", só que agora ele sabe ler as duas origens.

### 3.2 O que se perde, escrito

`ProblemDetails::fromException()` monta `$headers` a partir de `HttpExceptionInterface`. As quatro
exceções não têm header próprio hoje, então o braço vazio serve — mas recusa que precise de header
(`Retry-After`, por exemplo) não caberá em `RecusaDeDominio` sem desenho novo.

## 4. As cinco frases (`P-71`)

| Sítio | Chave |
|---|---|
| `TurmaConfiguracaoException.php:15` | `operation.turma.quote_not_approved` |
| `TurmaConfiguracaoException.php:20` | `operation.turma.already_exists` |
| `RedatorNaoElegivelException.php:16` | `operation.redator.not_qualified` |
| `RedatorNaoElegivelException.php:21` | `operation.redator.reuf_invalid` |
| `CorruptedSnapshotException.php:42` | `certification.snapshot.not_presentable`, com `:codigo` e `:campos` |

Nos três locales (`en`, `es_CL`, `pt_BR`), e as cinco linhas saem da `DEBITO_CONHECIDO`
(`tests/Unit/Shared/MensagemLiteralTest.php:154`) **no mesmo commit** em que o sítio passa a ler
`lang/`.

**O frontend não casa nenhuma dessas frases** — medido em 2026-09-02, zero ocorrência das cinco em
`frontend/src`. Traduzir não quebra tela. A distinção que o docblock do `RedatorNaoElegivelException`
promete ao front (não-habilitado × REUF inválido) continua existindo: são duas chaves distintas,
como eram duas frases distintas.

**A `CorruptedSnapshotException` muda de forma:** o `sprintf` com dois `%s` vira `__()` com dois
parâmetros. É a razão escrita na `P-71` para ela ter ficado por último.

**Custo colateral declarado:** **duas** asserções existentes comparam a frase es-CL inteira, as duas
em `CertificateListingTest.php:191,220` — o teste de snapshot corrompido de `PublicCertificateTest`
afirma só o 500 e o `status`, e por isso não é tocado. As duas passam
a comparar contra `__('certification.snapshot.not_presentable', [...])`, no molde do
`MensagemDeIdentidadeLocalizadaTest`. Não é edição de contrato — é a mesma asserção apontando para
o dono novo da frase.

## 5. O 419 (`P-72`)

Braço próprio no `detailFor()` e `problem.detail.csrf` nos três locales. O `title` já está
localizado (cai no genérico `problem.title.http`) e continua assim.

**A exceção que o handler entrega não é a `TokenMismatchException`** — medido no vendor durante o
planejamento: `Illuminate\Foundation\Exceptions\Handler::prepareException()` (`:774`) a embrulha
num `HttpException(419, ..., $e)` e roda na `:716`, **antes** de `renderViaCallbacks()` na `:718`.
É o que explica o `title` já localizado que a `P-72` mediu. O braço casa pela **causa**
(`$e->getPrevious() instanceof TokenMismatchException`), não pelo texto (D5).

## 6. Catracas

Cada uma **vista reprovar por sonda** antes de contar, com o arquivo restaurado do scratchpad —
nunca por `git stash` (a pilha tem stashes alheios).

1. **Estática, nova** — nenhum arquivo de `app/Domains/**/Exceptions/` estende `HttpException` nem
   escreve literal de status (`403`/`422`) no corpo. É a porta por onde o candidato 6 volta.
   `InactiveAccountException` passa: estende `AuthenticationException`.
2. **Comportamental, nova** — um 403 de recusa de domínio (`POST /api/profile/documents` como
   admin, que estoura `RedatorOnlyActionException`) continua emitindo `acesso.negado`. Nasce
   vermelha contra a implementação ingênua da §3, que é exatamente o defeito que ela existe para
   impedir.
3. **`MensagemLiteralTest` e `LocaleParityTest`, existentes** — verdes com a `DEBITO_CONHECIDO`
   cinco linhas menor.

**A prova de que o contrato HTTP não mudou são os testes de endpoint existentes passando sem
edição:** os 422 de `TurmaCrudTest` e `TurmaDesignationTest`, os 403 de `SystemRoleImmutabilityTest`
e `UpdateRoleActionTest`. Teste de endpoint editado neste bloco é sinal de contrato quebrado, não
de teste desatualizado.

## 7. DoD

- as três fichas fechadas, cada uma **por mecanismo verde ou por decisão escrita**, nunca por
  remoção na fé: `P-71` (cinco sítios em `lang/`), `P-72` (419 localizado), `P-60` (veredito da D4
  escrito no código e no teste);
- `DEBITO_CONHECIDO` cinco linhas menor; `LocaleParityTest` e `MensagemLiteralTest` verdes;
- o 419 devolvendo `detail` localizado nos **três locales, medido contra a API real** — mesma forma
  em que a `P-72` mediu o defeito;
- as três catracas da §6 vistas reprovar por sonda;
- `php artisan test` inteiro verde **sem edição nos testes de endpoint existentes**;
- `pint` nos arquivos tocados; `generated.ts` com diff vazio (nenhum DTO muda);
- a linha de cada ficha removida do índice de `pendencias/` no `/fechar-sprint`.

## 8. Fora de escopo

- **`P-60`, metade do dado de dev** — reseedar/corrigir o `LOT-2026-1001` é o candidato da `P-44`,
  hospedada no item 13.
- **`P-51`** — default literal em DTO de entrada muda contrato e regenera `generated.ts`; frente de
  DTO.
- **`D-17`** — catraca de catálogo de permissões; família RBAC.
- **`P-49`, `P-52`, `P-54`, `P-59`** — vivos e sem hospedeiro, cada um em outro eixo; nenhum
  compartilha superfície de prova com o envelope.
- **`D-09`/`D-10`/`D-11`/`D-16`** — item 22.
- **`D-34`** — atravessa o seam para o SPA; escolha do João.
- **candidato 2 do mesmo review (fatia Site)** — `app/Domains/Site` não existe em `main`.
