# 38 — Revisão

## Em aberto

## Rodada 2 — `0740843a..19570b2b` — 2026-10-21 · Lente 1: opus · Lente 2: sonnet

Correções da rodada 1, todas aprovadas pelo João, inclusive o Q-4 plausível: Q-1 em `0292fb2e`,
Q-2 em `5b62ef18`, Q-3 em `a4cda8d0`, Q-5 em `c3747485` e Q-4 em `19570b2b`. A lente 1 releu cada
uma e as deu como fechadas, sem regressão. Os testes de regressão do Q-1, do Q-3 e do Q-4 foram
vistos reprovando antes da correção. A suíte backend inteira passou em `19570b2b`: 1369 passed e
5 skipped. A lente Codex não foi tentada de novo, porque a recusa da rodada 1 vem da conta, não
do bloco.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A régua 2 da `MensagemLiteralTest` pula `app/Console` com a premissa de que esse código não chega ao `ProblemDetails`, e nenhuma catraca confere a premissa. Hoje nenhum código de `app/` fora de `app/Console` importa `App\Console\`, então a brecha não é usável agora, mas um import futuro passaria sem a régua ver. | CONFIRMED | `backend/tests/Unit/Shared/MensagemLiteralTest.php:71-72,81-86` | registrado, não bloqueia |
| Q-2 | Menor | O contrato valida as horas de módulo com `numeric`, e o `CourseModuleData` declara `int`: `1.5` vira `1` em silêncio desde que o curso passou pela `CreateCourseAction`. O impacto é baixo, porque as horas de módulo não entram no snapshot e o complemento real usa horas inteiras. | CONFIRMED | `backend/app/Console/CargaInicial/ArquivoDeCarga.php:147-148`; `backend/app/Console/CargaInicial/CarregadorDeCadastros.php:362-368`; `backend/app/Domains/Catalog/Data/CourseModuleData.php:26,28` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

Observações da lente 1, sem achado:

- O docblock do documento do redator diz "como o `StoreRedatorDocumentAction`". Aquele faz o
  `put` fora da transação, e a carga faz o `put` dentro e compensa pelo comando. O resultado é o
  mesmo.
- O `plano.md` (R5 e R9) ainda descreve `Reprobado` como aceito. O plano é registro histórico; a
  regra vigente é a do `a4cda8d0`.

Padrão reincidente: nenhum.

## Rodada 1 — `0740843a..16d4f12f` — 2026-10-21 · Lente 1: opus · Lente 2: sonnet

Bloco classificado **alto risco**: carga em produção de certificados (documento legal) e escrita
de dado real. A lente Codex foi tentada e **não rodou**: o Codex recusou `gpt-5.5` (modelo do
`~/.codex/config.toml`) e `gpt-5.4` com `The '<modelo>' model is not supported when using Codex
with a ChatGPT account`. Por isso a rodada saiu só com a lente 1 opus. A suíte não foi rodada
pelo revisor: o container `app` da lane estava parado.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | Documento do redator sobe por `execute` (put+register) dentro da `DB::transaction`; o path só vai para a `Contagem` depois do `register`. Falha no `register` deixa o PDF (com dado pessoal) no bucket, sem compensar e sem reportar. Isso contraria o contrato do `UploadFileAction` (P-49) e a spec §5. O teste de compensação lança antes do `put`. | CONFIRMED | `backend/app/Console/CargaInicial/CarregadorDeCadastros.php:280-281`; `backend/app/Shared/Files/Actions/UploadFileAction.php:27-33`; `backend/app/Console/Commands/CarregarCargaInicial.php:106,117` | aguarda aprovação do João |
| Q-2 | Menor | O curso é gravado direto, contornando `CreateCourseAction`, e o docblock afirma "Sem Action do fluxo vivo para contornar". O loop de `CourseModule` duplica o `sort_order` da Action. A spec §5 exige o motivo escrito no código. | CONFIRMED | `backend/app/Console/CargaInicial/CarregadorDeCadastros.php:324,352-368`; `backend/app/Domains/Catalog/Actions/CreateCourseAction.php:20-45` | registrado, não bloqueia |
| Q-3 | Menor | O guarda do `Normalizador` aceita `reprobado`, e `orcamentoComTurma` monta `certificado` em toda matrícula. O contrato (`erroDeTurma`) recusa certificado não `aprobado`, e o `NormalizadorTest` ainda prova a saída `reprobado`. O resultado é que o extrator gera arquivo que o próprio contrato recusa. | CONFIRMED | `backend/app/Console/CargaInicial/Extracao/Normalizador.php:147,447-463`; `backend/app/Console/CargaInicial/ArquivoDeCarga.php:459-470`; `backend/tests/Feature/CargaInicial/NormalizadorTest.php:301-306` | registrado, não bloqueia |
| Q-4 | Menor | O helper `falha()` monta a mensagem fora do `new ...Exception(` para não ser pego pela catraca `MensagemLiteralTest`, sem declarar os sítios em `DEBITO_CONHECIDO`. | PLAUSIBLE | `backend/app/Console/CargaInicial/ArquivoDeCarga.php:66-70`; `backend/app/Console/CargaInicial/Extracao/LeitorDeRegistros.php:305-309`; `backend/tests/Unit/Shared/MensagemLiteralTest.php:83,91` | observação: a regra cobre texto que chega ao HTTP, e este é texto de console de comando Artisan |
| Q-5 | Menor | Três sobras. (a) O parâmetro `Client $cliente` de `snapshot()` não é lido. (b) `CargaComConflitoException::conflitos()` não tem consumidor. (c) `'schema_version' => 1` está literal no `Normalizador`, em vez de usar `ArquivoDeCarga::SCHEMA_VERSION`. | CONFIRMED | `backend/app/Console/CargaInicial/CarregadorDeHistorico.php:314,325`; `backend/app/Console/CargaInicial/CargaComConflitoException.php:21`; `backend/app/Console/CargaInicial/Extracao/Normalizador.php:286` com `ArquivoDeCarga.php:26,80` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 3 confirmados, 1 plausível, 0 refutados

Padrão reincidente: nenhum. Se o Q-4 se repetir em outro bloco, a proposta é que a régua passe a
exigir declaração de todo helper que monta exceção a partir de parâmetro.
