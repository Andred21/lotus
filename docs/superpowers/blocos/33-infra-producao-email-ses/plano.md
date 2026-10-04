# `infra-producao-email-ses` — plano emendado: Fase A' e aceitação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Emenda de 2026-10-04 — substitui o plano de 2026-09-28.** As Tasks 1 a 6 daquele plano
> entregaram a Fase A pela PR #121 (`44e6e372`, na `main`, ainda não espelhada); as Tasks 7 a 12
> (production access e provas) saem, trocadas pela Fase B' no fim deste arquivo. O texto antigo
> fica no Git: `git show 21273780:docs/superpowers/blocos/33-infra-producao-email-ses/plano.md`. A
> numeração continua na 13 para que "Task N" no `audit.md` nunca aponte para duas coisas.

**Goal:** fechar o bloco 33 com a conta SES em sandbox por decisão — alerta D7 e reset de senha entregues pelo SES a destinatários verificados, a falha de envio no log sem o destinatário e com o código da AWS, e runbook, ADR-23, `operacao-segredos.md`, packet e Drive dizendo isso.

**Architecture:** a Fase A' roda na lane, pelo `/executar-bloco` (Tasks 13 a 19): a D15 em PHP com TDD — um `report` para `TransportExceptionInterface` no `bootstrap/app.php`, que registra pela `FalhaDeObservabilidade`, agora com `aws_erro` —, a emenda dos docs, o audit e a conferência do Drive. Depois vêm o `/revisar-bloco` e o `/finalizar-bloco`, e a PR mescla com o bloco em `blocked` aguardando aceitação. A Fase B' roda em produção depois do merge e do espelho (escrita do João, leitura da sessão) e volta numa PR de docs que leva o bloco a `closed`.

**Tech Stack:** Laravel 13.34 (`Exceptions::report()` → `ReportableHandler::stop()`), Symfony Mailer (`TransportExceptionInterface`), `aws/aws-sdk-php` 3.386.1 (`AwsException::getAwsErrorCode()`), PHPUnit no contêiner `app` da lane, Pint no host, vitest (projeto `repo`), `aws` de leitura com `AWS_PROFILE=lotus`, conector do Google Drive, `gh`, `curl`.

**Spec:** [`spec.md`](./spec.md) — emendas de 2026-10-01 (sandbox) e de 2026-10-04 (D15, D12) e o alinhamento ao item 35 (§10 e `## Verificação externa`). Packet: [`2026-09-28-infra-producao-email-ses.md`](../../context-packets/2026-09-28-infra-producao-email-ses.md). Audit: [`audit.md`](./audit.md).

## Global Constraints

- Lane `../lotus-33-infra-producao-email-ses`, branch `infra/33-infra-producao-email-ses`, offset +1 (`.env` da raiz). Nenhuma outra lane é tocada. O `docs/superpowers/backlog.md` não muda nesta lane: pela invariante 10 a lane só remove a própria ficha no fechamento, e este bloco fecha em aguardando aceitação, que pula até isso.
- Remetente `Lotus <lotus@lotusotec.cl>`, mailer `ses`, região `sa-east-1`, identidade `lotusotec.cl` (do `lotus-site`, nunca recriada). Inline `lotus-ses` na role `lotus-ec2`: `Action` `ses:SendRawEmail` e `ses:SendEmail`, `Resource` `arn:aws:ses:sa-east-1:<conta>:identity/*`, `Condition` `StringEquals` `ses:FromAddress: lotus@lotusotec.cl`. Nenhuma access key nasce. A conta fica em sandbox (`ProductionAccessEnabled: false`).
- Log de falha de envio: mensagem fixa — `Falha ao enviar e-mail` (handler) ou `Falha ao enviar alerta de acesso suspeito` (D7) —, contexto `excecao`, `codigo`, `origem` e, quando a cadeia traz uma `AwsException` com código, `aws_erro`. Nunca a mensagem da exceção; nunca a exceção como objeto no contexto.
- Todo comando de task roda da raiz da lane, `/home/jvbat/projetos/lotus-33-infra-producao-email-ses`, salvo `cd` explícito.
- Backend no contêiner da lane, da raiz da árvore: `docker compose exec -T app …`. Esta árvore não tem `backend/vendor`: a Task 13 roda `composer install` no contêiner antes do primeiro teste. Pint no host, de `backend/`, sempre com argumento: `./vendor/bin/pint <arquivos>`. `typescript:transform` não roda (nenhum DTO muda).
- Testes de repositório: `cd frontend && pnpm test --project repo tests/<arquivo>.test.ts`.
- Sondas (lição 19): `cp` do arquivo para o scratchpad da sessão (`$SCRATCH`), aplicar a sonda, rodar, restaurar com `cp`, conferir com `cmp`. **Nunca `git stash`.**
- Escrita em produção e na AWS é do João (IAM, identidades, `.env`, botão, `tinker`, logins, reset, upload no Drive). A sessão lê. Leitura por SSH que o auto mode barrar, o João roda e cola. Toda leitura `aws` roda com `AWS_PROFILE=lotus`.
- Do `.env` de produção só sai nome de chave, nunca valor. De e-mail só saem remetente, assunto, `Authentication-Results` e horário — nunca corpo, nunca link de reset.
- Nenhum número de conta, ARN completo, InstanceId ou endereço de destinatário em arquivo versionado: o audit diz "o Gmail do João" e conta os externos. O endereço dos testes é `pessoa.externa@example.com`, de domínio reservado.
- `git add` só nos caminhos exatos, nunca `-A`. Commits terminam com `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`, com o modelo que escreveu o commit (ex.: `Sonnet 5.5`).
- Falha em portão é PARE com a saída mostrada, nunca contorno.

## Review Focus

1. **Transporte sem AWS na cadeia** — um mailer SMTP recusando com `550 5.1.1 <endereço>` — sai pela mesma linha fixa, sem a mensagem e sem `aws_erro`. Teste: `test_smtp_recusando_o_destinatario_sai_sem_aws_erro` (Task 13).
2. **Exceção que não é de e-mail** segue para o log padrão, com a mensagem: tipado como `Throwable`, o callback calaria todo erro da aplicação. Teste: `test_excecao_que_nao_e_de_email_segue_para_o_log_padrao`, provado pela sonda 3 (Task 13).
3. **`AwsException` sem código** (falha de conexão com o SES) não grava `aws_erro` — nem `null`. Teste: `test_aws_exception_sem_codigo_nao_grava_aws_erro` (Task 13).
4. **`AwsException` além do primeiro `previous`** ainda dá o `aws_erro`. Teste: `test_aws_erro_vem_de_qualquer_ponto_da_cadeia` (Task 13).
5. **Exceção como objeto no contexto de qualquer registro**: o formatador do Monolog a serializa com a mensagem e a cadeia de `previous`, que é por onde o handler padrão leva o endereço à saída. Teste: a asserção comum `assertFalhaSemDestinatario`, em todos os casos da Task 13.

## Mapa de arquivos

| Arquivo | Ação | Task |
|---|---|---|
| `backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php` | Criar | 13 |
| `backend/app/Shared/Logging/FalhaDeObservabilidade.php` | Modificar: `aws_erro` e docblock | 13 |
| `backend/bootstrap/app.php` | Modificar: o `report` de `TransportExceptionInterface` | 13 |
| `deploy/aws/README.md` | Modificar: §4 (`lotus-ses`) e §13 | 14 |
| `docs/adrs.md` | Modificar: ADR-23 e a emenda de 2026-10-01 | 15 |
| `docs/operacao-segredos.md` | Modificar: uma frase no §4 | 16 |
| `docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md` | Modificar: conta mascarada e nota | 17 |
| `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` | Estender | 13, 18, 19 |
| `docs/superpowers/blocos/33-infra-producao-email-ses/estado.md` e `rulings.md` | Transições e rulings do `/executar-bloco` | Passos 4, 6 e 7 dele |

## Mapa de DoD

| DoD da spec (§9) | Onde se prova |
|---|---|
| 1 — catracas verdes, sondas vistas reprovar, lint e build | Tasks 13 e 18 |
| 2 — `lotus-ses` com as duas ações, `identity/*` e a `Condition`; sem chave nova | B2 |
| 3 — `ProductionAccessEnabled: false`; o domínio e N externos verificados | B3, B8 |
| 4 — identidade `SUCCESS`/`SUCCESS`/`true`; MX do apex Google | B8 |
| 5 — sonda positiva entregue; negativa `Email address is not verified` | B5 |
| 6 — alerta D7 real com DKIM, SPF e DMARC `pass` | B6 |
| 7 — reset real completo | B7 |
| 8 — ADR-23 emendado, §13.6, Drive, packet (o resto veio na Fase A; a P-93 vai a `encerradas.md` no fechamento) | Tasks 14, 15, 17 e 19 |
| 9 — audit sem valor de `.env`, corpo de e-mail ou endereço | Tasks 13, 18, 19 e a PR de aceitação |
| 10 — D15: testes, sondas, suíte, Pint; a linha da sonda negativa em produção | Tasks 13 e 18; B5 |

---

## Fase A' — repositório (`/executar-bloco`)

### Task 13: D15 — falha de envio de e-mail no log sem a mensagem, com `aws_erro`

**Files:**
- Create: `backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php`
- Modify: `backend/app/Shared/Logging/FalhaDeObservabilidade.php` (o arquivo inteiro, 41 linhas)
- Modify: `backend/bootstrap/app.php:3-7` (imports)
- Modify: `backend/bootstrap/app.php:148-150` (o report novo, entre o dontReport e o shouldRenderJsonWhen)
- Modify: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` (seção nova no fim)

**Interfaces:**
- Consumes: do código existente, `FalhaDeObservabilidade::registrar(string $mensagem, Throwable $falha, array $dados = []): void` — a assinatura não muda — e o `DetectorDeAcessoSuspeito::alertar`, que já chama `registrar('Falha ao enviar alerta de acesso suspeito', $falha, ['familia' => …])`.
- Produces: no canal default, nível `error`, a linha **`Falha ao enviar e-mail`** para toda `Symfony\Component\Mailer\Exception\TransportExceptionInterface` que chega ao handler, com contexto `excecao`, `codigo`, `origem` e, quando a cadeia de `getPrevious()` traz uma `Aws\Exception\AwsException` com código, **`aws_erro`** (string: `MessageRejected`, `AccessDenied`, `Throttling`). A Task 14 (runbook §13.1, §13.3 e §13.4) e a Task 16 citam esses dois nomes; a Fase B' (B5) os lê na saída de erro da sonda negativa.

- [ ] **Step 1: stack, vendor e linha de base** — da raiz da lane:

```bash
cd /home/jvbat/projetos/lotus-33-infra-producao-email-ses
docker compose up -d
docker compose exec -T app composer install --no-interaction --no-progress 2>&1 | tail -3
docker compose exec -T app php artisan --version
docker compose exec -T app php artisan test 2>&1 | tail -4
git status --short
```

Expected: `composer install` sem erro; `Laravel Framework 13.34.0`; a suíte verde — anote o placar (`Tests: N passed (…), M skipped`), que é a linha de base do Step 10; `git status` vazio (`backend/vendor` está no `backend/.gitignore`). Suíte vermelha aqui é PARE: a árvore tem de estar verde antes de qualquer edição.

- [ ] **Step 2: Write the failing test** — crie `backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\User;
use App\Shared\Alerts\DetectorDeAcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Aws\Command;
use Aws\Ses\Exception\SesException;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Monolog\Handler\TestHandler;
use RuntimeException;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;
use Throwable;

/**
 * D15 do item 33: falha de transporte de e-mail vai ao log default SEM a
 * mensagem e COM o código da AWS (spec do bloco, §4.9).
 *
 * A falha lançada é a cadeia real do `SesTransport` em sandbox: uma
 * `TransportException` cujo `Reason` nomeia o destinatário, sobre a
 * `SesException` de código `MessageRejected`. Um teste por caminho de envio —
 * os dois `report($e)` que contêm a falha (reset e cadastro), o reenvio do
 * convite, que não contém e chega pelo handler, e o alerta D7 — e quatro do
 * que o callback do `bootstrap/app.php` não pode errar.
 */
class FalhaDeEnvioDeEmailTest extends TestCase
{
    use RefreshDatabase;

    private const DESTINATARIO = 'pessoa.externa@example.com';

    /** @var list<array{0: string, 1: array<array-key, mixed>}> */
    private array $registros = [];

    protected function setUp(): void
    {
        parent::setUp();

        Log::listen(function (MessageLogged $registro): void {
            $this->registros[] = [$registro->message, $registro->context];
        });
    }

    public function test_reset_responde_generico_e_o_log_nao_leva_o_destinatario(): void
    {
        User::factory()->create(['type' => 'admin', 'email' => self::DESTINATARIO, 'is_active' => true]);
        $generica = $this->postJson('/api/password/forgot', ['email' => 'ninguem@example.com'])->json();
        $this->enviosFalhamCom(self::destinatarioNaoVerificado());

        // A falha não pode virar oráculo: a resposta é a mesma de um e-mail sem conta.
        $this->postJson('/api/password/forgot', ['email' => self::DESTINATARIO])
            ->assertOk()
            ->assertExactJson($generica);

        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', 'MessageRejected');
    }

    public function test_cadastro_de_redator_sobrevive_e_o_log_nao_leva_o_destinatario(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->enviosFalhamCom(self::destinatarioNaoVerificado());

        $redator = app(CreateRedatorAction::class)->execute(RedatorData::from([
            'name' => 'Ana Reyes', 'rut' => '11.111.111-1', 'email' => self::DESTINATARIO, 'course_ids' => [],
        ]));

        $this->assertNotNull($redator->id);
        $this->assertDatabaseHas('users', ['email' => self::DESTINATARIO, 'is_active' => true]);
        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', 'MessageRejected');
    }

    public function test_reenvio_do_convite_responde_500_e_o_log_nao_leva_o_destinatario(): void
    {
        $this->actingAsAdmin();
        $usuario = User::factory()->create(['type' => 'redator', 'email' => self::DESTINATARIO, 'is_active' => true]);
        $redator = $usuario->redator()->create([]);
        $this->enviosFalhamCom(self::destinatarioNaoVerificado());

        $this->postJson("/api/redatores/{$redator->id}/invitation")
            ->assertStatus(500)
            ->assertHeader('Content-Type', 'application/problem+json');

        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', 'MessageRejected');
    }

    public function test_alerta_d7_grava_o_aws_erro_sem_o_destinatario(): void
    {
        Log::channel(EventoDeSeguranca::CANAL)->getLogger()->setHandlers([new TestHandler]);
        User::factory()->create(['type' => 'admin', 'email' => self::DESTINATARIO, 'is_active' => true]);
        $this->enviosFalhamCom(self::destinatarioNaoVerificado());

        app(DetectorDeAcessoSuspeito::class)->sessaoDeContaDesativada(4242, '203.0.113.9');

        $this->assertFalhaSemDestinatario('Falha ao enviar alerta de acesso suspeito', 'MessageRejected');
    }

    /**
     * Transporte sem AWS na cadeia — o SMTP de um mailer futuro recusando o
     * destinatário — sai pela mesma linha, sem `aws_erro`.
     */
    public function test_smtp_recusando_o_destinatario_sai_sem_aws_erro(): void
    {
        User::factory()->create(['type' => 'admin', 'email' => self::DESTINATARIO, 'is_active' => true]);
        $this->enviosFalhamCom(new TransportException(
            'Expected response code "250" but got code "550", with message "550 5.1.1 <'.self::DESTINATARIO.'>: Recipient address rejected".',
        ));

        $this->postJson('/api/password/forgot', ['email' => self::DESTINATARIO])->assertOk();

        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', null);
    }

    /**
     * O callback é por TIPO: tipado como `Throwable`, calaria todo erro da
     * aplicação. Exceção que não é de e-mail segue para o handler padrão, com
     * a mensagem.
     */
    public function test_excecao_que_nao_e_de_email_segue_para_o_log_padrao(): void
    {
        report(new RuntimeException('falha que nao e de e-mail'));

        $this->assertContains('falha que nao e de e-mail', array_column($this->registros, 0));
        $this->assertNull($this->contextoDe('Falha ao enviar e-mail'));
    }

    public function test_aws_erro_vem_de_qualquer_ponto_da_cadeia(): void
    {
        report(new TransportException(
            'Falha ao entregar a mensagem.',
            0,
            self::falhaDoSes('Throttling', 'Maximum sending rate exceeded'),
        ));

        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', 'Throttling');
    }

    public function test_aws_exception_sem_codigo_nao_grava_aws_erro(): void
    {
        $semCodigo = new SesException(
            'Error executing "SendRawEmail" on "https://email.sa-east-1.amazonaws.com"; cURL error 28: Operation timed out',
            new Command('SendRawEmail'),
            ['connection_error' => true],
        );

        report(new TransportException('Request to AWS SES API failed. Reason: '.$semCodigo->getMessage().'.', 0, $semCodigo));

        $this->assertFalhaSemDestinatario('Falha ao enviar e-mail', null);
    }

    /**
     * O critério da D15, igual para todo caminho. A linha fixa existe, com a
     * classe e o `aws_erro` esperado (ou sem ele); o destinatário não aparece
     * em registro nenhum; e nenhum registro leva a exceção como objeto — o
     * formatador do Monolog a serializa com a mensagem e a cadeia de
     * `previous`, que é por onde o handler padrão leva o endereço à saída.
     */
    private function assertFalhaSemDestinatario(string $mensagem, ?string $awsErro): void
    {
        $this->assertStringNotContainsString(
            self::DESTINATARIO,
            (string) json_encode($this->registros, JSON_PARTIAL_OUTPUT_ON_ERROR),
        );

        foreach ($this->registros as [$texto, $contexto]) {
            foreach ($contexto as $valor) {
                $this->assertNotInstanceOf(Throwable::class, $valor, "Exceção no contexto de \"{$texto}\".");
            }
        }

        $linha = $this->contextoDe($mensagem);

        $this->assertNotNull($linha, "Sem a linha \"{$mensagem}\", a falha some junto com a mensagem.");
        $this->assertSame(TransportException::class, $linha['excecao']);

        if ($awsErro === null) {
            $this->assertArrayNotHasKey('aws_erro', $linha);
        } else {
            $this->assertSame($awsErro, $linha['aws_erro'] ?? null);
        }
    }

    /** @return array<array-key, mixed>|null */
    private function contextoDe(string $mensagem): ?array
    {
        foreach ($this->registros as [$texto, $contexto]) {
            if ($texto === $mensagem) {
                return $contexto;
            }
        }

        return null;
    }

    private function enviosFalhamCom(Throwable $falha): void
    {
        Notification::swap(new class($falha) extends ChannelManager
        {
            public function __construct(private Throwable $falha) {}

            public function send($notifiables, $notification)
            {
                throw $this->falha;
            }
        });
    }

    private static function destinatarioNaoVerificado(): TransportException
    {
        return self::falhaDoSes(
            'MessageRejected',
            'Email address is not verified. The following identities failed the check in region SA-EAST-1: '.self::DESTINATARIO,
        );
    }

    /**
     * A montagem do `SesTransport` (`Illuminate\Mail\Transport\SesTransport`,
     * `catch (AwsException $e)`): o `Reason` é a mensagem da AWS, e a
     * `AwsException` viaja como `previous`.
     */
    private static function falhaDoSes(string $codigo, string $motivo): TransportException
    {
        $aws = new SesException(
            'Error executing "SendRawEmail" on "https://email.sa-east-1.amazonaws.com"; AWS HTTP error: '.$codigo.' (client): '.$motivo,
            new Command('SendRawEmail'),
            ['code' => $codigo, 'message' => $motivo],
        );

        return new TransportException(sprintf('Request to AWS SES API failed. Reason: %s.', $motivo), 0, $aws);
    }
}
```

`Notification::swap` troca a instância de `ChannelManager` no contêiner, e o `Dispatcher` que o `$user->notify()` resolve é alias dela (`NotificationServiceProvider`), então o swap pega os três caminhos de envio.

- [ ] **Step 3: Run test to verify it fails**

Run: `docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest`

Expected: 8 testes, **7 reprovam e 1 passa**, cada um pelo motivo certo:
- `test_reset_…`, `test_cadastro_…`, `test_reenvio_…` e `test_smtp_…` reprovam na primeira asserção: `pessoa.externa@example.com` está nos registros, porque o handler padrão grava a mensagem crua.
- `test_aws_erro_vem_de_qualquer_ponto_da_cadeia` e `test_aws_exception_sem_codigo_…` reprovam em "Exceção no contexto": o registro padrão leva `exception` como objeto.
- `test_alerta_d7_…` reprova no `aws_erro`: `null` em vez de `MessageRejected`.
- `test_excecao_que_nao_e_de_email_…` **passa**: é guarda contra o callback que engole tudo, e quem prova que ela morde é a sonda 3 do Step 9.

Outro motivo de falha (erro de sintaxe, classe não encontrada, 404 na rota, 403 no reenvio) é PARE: o teste está errado, não o código.

- [ ] **Step 4: o `aws_erro` na `FalhaDeObservabilidade`** — substitua `backend/app/Shared/Logging/FalhaDeObservabilidade.php` inteiro:

```php
<?php

namespace App\Shared\Logging;

use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * O registro da falha DO registro. Existe por dois motivos que andam juntos.
 *
 * **Contenção (catraca 5 da spec).** Observabilidade não pode derrubar a ação
 * que ela observa: um canal de log fora do ar não pode transformar o 422 de
 * senha errada num 500, nem impedir que a sessão de uma conta desativada seja
 * invalidada. Quem contém precisa de um lugar para dizer que conteve — senão a
 * contenção vira silêncio, que é o defeito oposto.
 *
 * **Não vazar PII pela porta dos fundos (catraca 4).** O `EventoDeSeguranca`
 * fecha o canal `seguranca` com métodos nomeados e parâmetros tipados, mas o
 * `catch` que o protege escreve no canal DEFAULT — e `Throwable::getMessage()`
 * cru é exatamente por onde o dado volta a entrar. Uma `TransportException` do
 * Symfony Mailer carrega a resposta do servidor SMTP, que rotineiramente traz o
 * destinatário (`550 5.1.1 <alguem@lotus.cl>: Recipient address rejected`) e às
 * vezes o `MAIL_USERNAME`. Por isso esta classe registra **classe, código e
 * origem** da exceção — o que basta para investigar — e **nunca a mensagem**.
 *
 * **O código da AWS fica (item 33, D15).** Sem a mensagem, uma falha do SES
 * vira só `TransportException` — e era a mensagem que separava destinatário
 * não verificado de policy errada e de rajada acima do sandbox. O
 * `SesTransport` guarda a `AwsException` como `previous`, e
 * `getAwsErrorCode()` devolve um identificador fixo do protocolo
 * (`MessageRejected`, `AccessDenied`, `Throttling`), sem dado de ninguém: ele
 * entra como `aws_erro`. Fica ausente quando a cadeia não tem `AwsException`
 * ou ela não traz código (falha de conexão). Desde a D15 esta classe registra
 * também toda falha de envio que chega ao handler, pelo `report` de
 * `TransportExceptionInterface` do `bootstrap/app.php`.
 *
 * Sem `try/catch` interno de propósito: se o canal default também estiver fora
 * do ar, a aplicação já está em estado catastrófico e blindar o `catch` do
 * `catch` só esconderia isso.
 */
final class FalhaDeObservabilidade
{
    /** @param array<string,scalar|null> $dados */
    public static function registrar(string $mensagem, Throwable $falha, array $dados = []): void
    {
        $contexto = $dados + [
            'excecao' => $falha::class,
            'codigo' => $falha->getCode(),
            'origem' => $falha->getFile().':'.$falha->getLine(),
        ];

        $erroDaAws = self::erroDaAws($falha);

        if ($erroDaAws !== null) {
            $contexto['aws_erro'] = $erroDaAws;
        }

        Log::error($mensagem, $contexto);
    }

    /**
     * O código de erro da primeira `AwsException` da cadeia de `previous`.
     */
    private static function erroDaAws(Throwable $falha): ?string
    {
        for ($e = $falha; $e !== null; $e = $e->getPrevious()) {
            if ($e instanceof AwsException) {
                return $e->getAwsErrorCode();
            }
        }

        return null;
    }
}
```

- [ ] **Step 5: Run** — o mesmo comando do Step 3. Expected: **2 passam** (`test_alerta_d7_…` e o de exceção que não é de e-mail); os outros 6 reprovam como no Step 3, porque o handler ainda grava o registro cru.

- [ ] **Step 6: o `report` no `bootstrap/app.php`** — dois imports, na ordem alfabética do bloco: `use App\Shared\Logging\FalhaDeObservabilidade;` logo antes de `use App\Shared\Logging\RegistraEventoDeErro;`, e `use Symfony\Component\Mailer\Exception\TransportExceptionInterface;` depois de `use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;`. Depois, entre a linha `$exceptions->dontReport(RecusaDeDominio::class);` e a linha em branco que precede `$exceptions->shouldRenderJsonWhen(`, insira:

```php

        // Falha de transporte de e-mail vai ao log SEM a mensagem (item 33,
        // D15). A mensagem é texto do servidor de envio, e ele nomeia quem não
        // recebeu: o SES em sandbox devolve "Email address is not verified. The
        // following identities failed the check in region SA-EAST-1:
        // <endereço>", e a recusa de IAM traz o ARN do papel assumido — número
        // da conta e InstanceId. O registro padrão grava a mensagem e serializa
        // a exceção com a cadeia de `previous`, então o dado chegava ao canal
        // default por três caminhos: os `report($e)` do reset de senha e do
        // cadastro de redator, e o reenvio do convite, que não contém a falha e
        // sobe até aqui.
        //
        // Um ponto só, e não um `catch` por envio: o próximo envio já nasce
        // coberto. A `FalhaDeObservabilidade` grava classe, código, origem e o
        // `aws_erro` (`MessageRejected`, `AccessDenied`, `Throttling`), que diz
        // por que falhou sem dizer para quem. O `stop()` encerra aqui: sem ele o
        // handler gravaria a mensagem crua logo depois da linha limpa.
        $exceptions->report(function (TransportExceptionInterface $e): void {
            FalhaDeObservabilidade::registrar('Falha ao enviar e-mail', $e);
        })->stop();
```

- [ ] **Step 7: Run test to verify it passes** — o mesmo comando. Expected: `8 passed`.

- [ ] **Step 8: Pint**

```bash
(cd backend && ./vendor/bin/pint app/Shared/Logging/FalhaDeObservabilidade.php bootstrap/app.php tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php)
docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest 2>&1 | tail -3
```

Expected: Pint `PASS`, ou `FIXED` só de estilo; os 8 seguem verdes.

- [ ] **Step 9: Sondas (lição 19)** — três, cada uma restaurada por `cp`:

```bash
SCRATCH=<scratchpad da sessão>
B=backend/bootstrap/app.php
F=backend/app/Shared/Logging/FalhaDeObservabilidade.php
cp $B $SCRATCH/app.php.bak && cp $F $SCRATCH/FalhaDeObservabilidade.php.bak

# Sonda 1 — sem o stop(): o handler grava a mensagem crua depois da linha limpa
sed -i 's/})->stop();/});/' $B
docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest 2>&1 | tail -20
cp $SCRATCH/app.php.bak $B

# Sonda 2 — sem o aws_erro
sed -i 's/return \$e->getAwsErrorCode();/return null;/' $F
docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest 2>&1 | tail -20
cp $SCRATCH/FalhaDeObservabilidade.php.bak $F

# Sonda 3 — o callback tipado como Throwable, que engole tudo
sed -i 's/function (TransportExceptionInterface \$e): void/function (Throwable $e): void/' $B
docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest 2>&1 | tail -20
cp $SCRATCH/app.php.bak $B

cmp $B $SCRATCH/app.php.bak && cmp $F $SCRATCH/FalhaDeObservabilidade.php.bak && echo restaurado
docker compose exec -T app php artisan test --filter=FalhaDeEnvioDeEmailTest 2>&1 | tail -3
```

Expected:

| Sonda | Reprovam | Passam |
|---|---|---|
| 1 — sem `stop()` | reset, cadastro, reenvio, SMTP, cadeia funda, sem código (6) | D7, exceção que não é de e-mail (2) |
| 2 — sem `aws_erro` | reset, cadastro, reenvio, D7, cadeia funda (5) | SMTP, sem código, exceção que não é de e-mail (3) |
| 3 — callback em `Throwable` | exceção que não é de e-mail (1) | os outros 7 |

Depois, `restaurado` e `8 passed`. Matriz diferente é PARE: o teste não prova o que diz.

- [ ] **Step 10: Suíte inteira**

Run: `docker compose exec -T app php artisan test 2>&1 | tail -4`
Expected: a linha de base do Step 1 mais 8 `passed`, os mesmos `skipped`, nenhum `failed`.

- [ ] **Step 11: Prova no contêiner** — o molde da sonda negativa do runbook §13.3, com um SMTP que recusa a conexão (nada sai da máquina):

```bash
SONDA=$SCRATCH/sonda-d15.log
antes=$(docker compose exec -T app sh -c 'cat storage/logs/laravel.log 2>/dev/null | wc -l')
docker compose exec -T app php artisan tinker --execute 'config(["mail.default" => "smtp", "mail.mailers.smtp.host" => "127.0.0.1", "mail.mailers.smtp.port" => 1]); try { Mail::raw("sonda", fn ($m) => $m->to("pessoa.externa@example.com")->subject("sonda")); } catch (\Throwable $e) { echo get_class($e), PHP_EOL; report($e); }'
docker compose exec -T app sh -c "tail -n +$((antes + 1)) storage/logs/laravel.log" > $SONDA
cat $SONDA
grep -c 'Falha ao enviar e-mail' $SONDA
grep -c 'pessoa.externa@example.com\|Connection could not be established\|aws_erro' $SONDA
```

Expected: o `tinker` imprime `Symfony\Component\Mailer\Exception\TransportException`; o `$SONDA` tem uma linha `local.ERROR: Falha ao enviar e-mail {"excecao":"Symfony\\Component\\Mailer\\Exception\\TransportException","codigo":0,"origem":"…"}`; as contagens são `1` e `0` — sem a mensagem crua, sem o endereço e sem `aws_erro`, porque a falha não veio da AWS.

- [ ] **Step 12: audit** — acrescente ao fim de `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md`, com os valores reais dos Steps 1 a 11 no lugar de cada `<…>`:

```markdown

## Task 13 — D15, o destinatário fora do log

- Linha de base: `composer install` no contêiner da lane (a árvore não tinha `backend/vendor`); `php artisan test` <placar do Step 1>.
- `FalhaDeEnvioDeEmailTest`, vermelho antes do código: 7 de 8 reprovando, cada um pelo motivo do plano (o de exceção que não é de e-mail é guarda e já passava). Com o `aws_erro`: 2 de 8. Com o `report` do `bootstrap/app.php`: 8 de 8.
- Sondas: 1 (sem `stop()`) reprova 6; 2 (sem `aws_erro`) reprova 5; 3 (callback em `Throwable`) reprova 1 — a matriz do plano. Arquivos restaurados por `cp`, `cmp` limpo.
- Pint nos três arquivos: <resultado>. Suíte inteira: <placar do Step 10> (linha de base mais 8).
- Prova no contêiner da lane (`tinker`, SMTP recusado em `127.0.0.1:1`, o molde da sonda negativa do runbook §13.3): uma linha `Falha ao enviar e-mail` com `excecao` `TransportException` e sem `aws_erro`; nenhuma linha com a mensagem crua ou com o endereço da sonda.
```

- [ ] **Step 13: Commit** (o `/executar-bloco` acrescenta o `estado.md` a este primeiro commit — Passo 4 dele):

```bash
git add backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php backend/app/Shared/Logging/FalhaDeObservabilidade.php backend/bootstrap/app.php docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "fix(33): falha de envio de e-mail vai ao log sem o destinatario, com aws_erro

Um report para TransportExceptionInterface no bootstrap registra pela
FalhaDeObservabilidade e para ai: o reset, o cadastro de redator e o
reenvio do convite deixam de gravar a mensagem do SES, que nomeia o
destinatario (e, na recusa de IAM, a conta e o InstanceId). O codigo da
AWS fica como aws_erro, inclusive no alerta D7.

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 14: runbook — `lotus-ses` em `identity/*` e o §13 em sandbox

**Files:**
- Modify: `deploy/aws/README.md:94-108` (o bloco da lotus-ses no §4)
- Modify: `deploy/aws/README.md:770-876` (o §13)

**Interfaces:**
- Consumes: Task 13 — a linha `Falha ao enviar e-mail` e o campo `aws_erro`.
- Produces: o §13.1 "Destinatários em sandbox" (citado pelas Tasks 15 e 16), o §13.3 com as sondas e a tabela `aws_erro`, e o §13.6 "Sair do sandbox" (citado pela Task 15 e pelo FUT-4).

Cada step é uma troca exata (ferramenta `Edit`): o texto de "Troque" existe hoje uma vez só no arquivo. Não achou → PARE e reporte; não improvise.

- [ ] **Step 1: §4, o parágrafo da `lotus-ses`.** Troque:

```markdown
O e-mail é a **terceira** inline, `lotus-ses` (item 33, ADR-23). Só a identidade `lotusotec.cl`
— criada e possuída pelo stack `lotus-contato` do `lotus-site`, nunca recriada daqui — e só com
o remetente do molde: qualquer outro `From` é `AccessDenied`. O ARN se monta em runtime; o número
da conta não entra neste arquivo.
```

por:

```markdown
O e-mail é a **terceira** inline, `lotus-ses` (item 33, ADR-23), e só deixa sair o remetente do
molde: qualquer outro `From` é `AccessDenied`. O `Resource` é `identity/*`, e não só a identidade
`lotusotec.cl` — criada e possuída pelo stack `lotus-contato` do `lotus-site`, nunca recriada
daqui —, porque **em sandbox o IAM confere também a identidade do destinatário** (emenda de
2026-10-01): com o `Resource` só no domínio, um externo verificado volta
`not authorized … identity/<destinatário>`. Fora do sandbox a policy vale igual; quem trava o envio
continua sendo a `Condition` no remetente. O ARN se monta em runtime; o número da conta não entra
neste arquivo.
```

- [ ] **Step 2: §4, o `Resource` do comando.** Troque `\"Resource\":\"arn:aws:ses:sa-east-1:$CONTA:identity/lotusotec.cl\"` por `\"Resource\":\"arn:aws:ses:sa-east-1:$CONTA:identity/*\"` (dentro das aspas duplas o `*` não expande).

- [ ] **Step 3: §4, o readback.** Troque:

```markdown
O readback tem de mostrar as duas ações, o `Resource` na identidade e a `Condition` no remetente.
A policy vale na hora para a role assumida pela instância — não há reinício. Revogar é
```

por:

```markdown
O readback tem de mostrar as duas ações, o `Resource` terminando em `:identity/*` e a `Condition`
no remetente. A policy vale na hora para a role assumida pela instância — não há reinício. Revogar é
```

- [ ] **Step 4: título e abertura do §13.** Troque:

```markdown
## 13. E-mail — production access, `.env` e as duas provas

Pré-condições: a inline `lotus-ses` aplicada (§4) e a `main` do corporativo com
```

por:

```markdown
## 13. E-mail — sandbox, destinatários, `.env` e as duas provas

A conta SES fica **em sandbox por decisão** (ADR-23, emenda de 2026-10-01): 200 mensagens por
24 h, divididas com o formulário do site, 1 por segundo e **só destinatário verificado**.
Pré-condições: a inline `lotus-ses` aplicada (§4) e a `main` do corporativo com
```

- [ ] **Step 5: o §13.1.** Troque o bloco inteiro, do título até a frase que o fecha:

````markdown
### 13.1 Production access — primeiro, porque é a única espera externa

A conta nasce em sandbox: 200 mensagens/24 h, 1/s e **só destinatário verificado**. O site vive
com isso (o destinatário dele é do domínio); a aplicação não — admins e redatores têm e-mail de
qualquer domínio. Console SES em `sa-east-1` → *Account dashboard* → *Request production access*:
tipo **Transactional**, URL `https://app.lotusotec.cl`, uso "alertas de segurança e recuperação
de senha da intranet de gestão de capacitação, ~10 usuários internos, dezenas de mensagens por
mês, sem lista de marketing; bounce e complaint tratados pela suppression list". Ou por CLI:

```bash
aws sesv2 put-account-details --region sa-east-1 --production-access-enabled \
  --mail-type TRANSACTIONAL --website-url https://app.lotusotec.cl \
  --use-case-description "Alertas de seguranca e recuperacao de senha da intranet Lotus; ~10 usuarios internos; dezenas de mensagens por mes; sem marketing" \
  --contact-language EN
aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Max24h:SendQuota.Max24HourSend}'
```

Guarde o número do caso. A resposta leva de um a alguns dias úteis; até lá os passos seguintes
andam, e a prova final espera.
````

por:

````markdown
### 13.1 Destinatários em sandbox

Todo endereço `@lotusotec.cl` recebe pela identidade de domínio. Qualquer outro precisa virar
identidade própria **antes** do primeiro envio — vale para admin e redator com e-mail de outro
domínio:

```bash
aws sesv2 create-email-identity --region sa-east-1 --email-identity <e-mail>
```

A AWS manda à pessoa um e-mail de verificação **em inglês**, do remetente da própria AWS, com um
link que vale 24 h. Avise antes: sem aviso ele parece phishing e expira sem clique. (A versão
personalizada desse e-mail exige production access — 13.6.) Depois do clique:

```bash
aws sesv2 get-email-identity --region sa-east-1 --email-identity <e-mail> --query VerifiedForSendingStatus   # true
```

Só então o cadastro, o convite ou o reset. Com a ordem invertida, a falha fica calada para quem
esperava o e-mail; o log default registra `aws_erro` `MessageRejected` (13.3), sem o endereço:

| Envio | Sem a verificação | O que fazer |
|---|---|---|
| Cadastro de redator | o cadastro fica, e o convite se perde | verificar e reenviar o convite pela tela |
| Reenvio do convite | a tela mostra o erro | verificar e reenviar |
| Reset de senha | a resposta é a genérica de sempre, e nada chega | verificar e pedir de novo |
| Alerta D7 | a falha é contida, e um admin não verificado no meio da série deixa os seguintes sem o alerta | verificar todo admin ativo antes da prova do 13.4 |

No desligamento do usuário, a identidade sai junto — é dado pessoal na conta onde o site também
vive:

```bash
aws sesv2 delete-email-identity --region sa-east-1 --email-identity <e-mail>
```
````

- [ ] **Step 6: o §13.3.** Troque o bloco inteiro, do título até a última linha da tabela:

````markdown
### 13.3 Sonda em sandbox — antes da aprovação, de propósito

A autorização IAM acontece **antes** da regra do sandbox. Então, ainda em sandbox, um envio a um
destinatário não verificado prova a role e a policy sem entregar nada:

```bash
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml exec -T app php artisan tinker --execute "Mail::raw(\"sonda\", fn (\$m) => \$m->to(\"<e-mail de um admin>\")->subject(\"sonda\"));"'
```

A falha sobe como `Symfony\Component\Mailer\Exception\TransportException`, com a mensagem
`Request to AWS SES API failed. Reason: <mensagem da AWS>.` — o código de erro da AWS
não aparece na tela. Leia o texto depois de `Reason:`:

| Texto depois de `Reason:` | Significa | Próximo passo |
|---|---|---|
| `Email address is not verified` | credencial e policy OK; conta em sandbox | esperar 13.1 |
| `is not authorized to perform: ses:SendRawEmail` | `lotus-ses` ausente ou errada | §4, reaplicar |
| `Maximum sending rate exceeded` | 1/s do sandbox — só se a sonda for repetida rápido | esperar 1 s e repetir |
| nenhuma exceção | a conta já saiu do sandbox | 13.4 |
````

por:

````markdown
### 13.3 Sondas — positiva e negativa

Duas, pelo `tinker` do contêiner, depois do 13.2. A **positiva** vai a um externo verificado no
13.1 (o Gmail do João) e prova de uma vez a role, a policy e a checagem do destinatário: não lança
exceção, e a mensagem chega com `dkim=pass`, `spf=pass` e `dmarc=pass` no *Show original*. A
**negativa** vai a um endereço que não é identidade — um reservado, que não é de ninguém, como
`sonda@example.com` — e prova que o sandbox segue de pé. Ela contém a exceção, imprime a mensagem e
a reporta, para a saída de erro mostrar também a linha que o log default grava (item 33, D15):

```bash
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml exec -T app php artisan tinker --execute "Mail::raw(\"sonda\", fn (\$m) => \$m->to(\"<externo verificado>\")->subject(\"sonda positiva\"));"'
sudo -i sh -c 'cd /opt/lotus && SHA=$(cat CURRENT_SHA) && LOTUS_IMAGE=ghcr.io/gatika-cl/lotus-app:$SHA LOTUS_CLAMAV_IMAGE=ghcr.io/gatika-cl/lotus-clamav:$SHA LOTUS_ENV_FILE=/opt/lotus/.env docker compose -p lotus -f docker-compose.prod.yml exec -T app php artisan tinker --execute "try { Mail::raw(\"sonda\", fn (\$m) => \$m->to(\"sonda@example.com\")->subject(\"sonda negativa\")); } catch (\Throwable \$e) { echo \$e->getMessage(), PHP_EOL; report(\$e); }"'
```

A falha sobe como `Symfony\Component\Mailer\Exception\TransportException`, com a mensagem
`Request to AWS SES API failed. Reason: <mensagem da AWS>.` Leia o texto depois de `Reason:` e, na
negativa, a linha da saída de erro:

| Sonda | Saída | Significa | Próximo passo |
|---|---|---|---|
| positiva | nenhuma exceção, e a mensagem chega | role, policy e destinatário verificado OK | 13.4 |
| positiva | `Email address is not verified` | o externo ainda não clicou no link | 13.1 |
| negativa | `Email address is not verified`; na saída de erro, a linha `Falha ao enviar e-mail` com `"aws_erro":"MessageRejected"` e sem o endereço | sandbox de pé, e o log sem o destinatário | 13.4 |
| negativa | nenhuma exceção | a conta saiu do sandbox sem ninguém pedir (13.6) | PARE |
| qualquer uma | `is not authorized to perform: ses:SendRawEmail` | `lotus-ses` ausente ou errada | §4, reaplicar |
| qualquer uma | `Maximum sending rate exceeded` | 1/s do sandbox — sondas repetidas rápido demais | esperar 1 s e repetir |

O log default grava toda falha de envio **sem a mensagem** — o endereço não sai — e com o código
da AWS em `aws_erro`. A mesma tabela serve à linha da sonda, a `Falha ao enviar alerta de acesso
suspeito` (13.4) e a `Falha ao enviar e-mail` do reset, do convite e do cadastro:

| `aws_erro` | Significa | Próximo passo |
|---|---|---|
| `MessageRejected` | destinatário (ou remetente) não verificado | 13.1 |
| `AccessDenied` | a `lotus-ses` não autoriza este envio | §4, reaplicar |
| `Throttling` | rajada acima do que o sandbox aceita | esperar e repetir; se for recorrente, é bloco próprio |
| ausente | a falha não veio da AWS (rede, configuração) | a `excecao` e a `origem` da mesma linha |
````

- [ ] **Step 7: título e pré-condição do §13.4.** Troque:

```markdown
### 13.4 As duas provas — depois de `ProductionAccessEnabled: true`

**Alerta D7 (`login_falho_repetido`).** Pré-condição: o contador é a chave `email|ip` numa janela
```

por:

```markdown
### 13.4 As duas provas

Pré-condição: **todo admin ativo** é `@lotusotec.cl` ou está verificado (13.1). O alerta sai a um
admin de cada vez, e um não verificado no meio da série deixa os seguintes sem e-mail.

**Alerta D7 (`login_falho_repetido`).** O contador é a chave `email|ip` numa janela
```

- [ ] **Step 8: o fim do §13.4.** O loop D7 e os dois `grep` não mudam. Troque, a partir do fim da linha do segundo `grep`:

````markdown
grep -c 'Falha ao enviar alerta'   # 0
```

**Reset de senha.** Pela UI, no link "¿Olvidaste tu clave?" (o rótulo muda com o idioma da UI;
em pt-BR é "Esqueceu sua senha?") com o e-mail do admin → a mensagem chega → o link abre a tela de
nova senha → senha nova → login com ela. A antiga deixa de logar e as sessões anteriores caem
(`PurgeOtherSessionsAction`). Máximo 6 pedidos/min por IP (`throttle:password`).
````

por:

````markdown
grep -c 'Falha ao enviar alerta'   # 0
```

Com `Falha ao enviar alerta`, leia o `aws_erro` da linha na tabela do 13.3. `MessageRejected` é
admin não verificado: 13.1, e 15 min de espera antes de repetir — a janela do D7.

**Reset de senha.** Pela UI, no link "¿Olvidaste tu clave?" (o rótulo muda com o idioma da UI;
em pt-BR é "Esqueceu sua senha?") com o e-mail de um usuário `@lotusotec.cl` ou verificado (13.1)
→ a mensagem chega → o link abre a tela de nova senha → senha nova → login com ela. A antiga deixa
de logar e as sessões anteriores caem (`PurgeOtherSessionsAction`). Máximo 6 pedidos/min por IP
(`throttle:password`).
````

- [ ] **Step 9: o §13.5 e o §13.6 novo.** Troque:

```markdown
`delete-role-policy lotus-ses` derruba o envio sem reiniciar. Pedido de production access negado:
o bloco para em `blocked` com o motivo; nada do repositório precisa voltar.
```

por:

````markdown
`delete-role-policy lotus-ses` derruba o envio sem reiniciar. As identidades externas podem ficar
(sozinhas não enviam nada) ou sair com `delete-email-identity` (13.1).

### 13.6 Sair do sandbox — só quando o gatilho do ADR-23 disparar

O gatilho está no ADR-23 (emenda de 2026-10-01): uma feature que envie e-mail a quem não é admin
ou redator interno — cliente, aluno, usuário de outra empresa (FUT-4 do backlog) —, verificar
externo virando rotina, ou o volume somado ao do site chegando perto de 200/24 h. Aí, e só aí:
console SES em `sa-east-1` → *Account dashboard* → *Request production access*, tipo
**Transactional**, URL `https://app.lotusotec.cl`, uso "alertas de segurança e recuperação de
senha da intranet de gestão de capacitação, ~10 usuários internos, dezenas de mensagens por mês,
sem lista de marketing; bounce e complaint tratados pela suppression list" — ajustado ao que a
feature nova mudar. Ou por CLI:

```bash
aws sesv2 put-account-details --region sa-east-1 --production-access-enabled \
  --mail-type TRANSACTIONAL --website-url https://app.lotusotec.cl \
  --use-case-description "Alertas de seguranca e recuperacao de senha da intranet Lotus; ~10 usuarios internos; dezenas de mensagens por mes; sem marketing" \
  --contact-language EN
aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Max24h:SendQuota.Max24HourSend}'
```

Guarde o número do caso; a resposta leva de um a alguns dias úteis. Aprovado, o readback mostra
`Producao: true` e uma cota maior. Dois efeitos: o teto de 200/dia que freava o `/api/contacto` do
site deixa de existir, porque o production access é da conta, não do Lotus (D-54 do `lotus-site`:
avise a sessão de lá); e as identidades pessoais do 13.1 deixam de ser necessárias e podem sair com
`delete-email-identity`. A policy `lotus-ses` não muda.
````

- [ ] **Step 10: Verify**

```bash
R=deploy/aws/README.md
grep -n '^## 13\|^### 13\.' $R
grep -c 'identity/\*' $R
grep -c 'identity/lotusotec.cl' $R
grep -n -i 'production access\|put-account-details' $R
grep -c 'aws_erro' $R
grep -nE '[0-9]{12}' $R
tail -c 1 $R | od -c | head -1
(cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts)
```

Expected: sete títulos — `## 13. E-mail — sandbox, destinatários, …`, `### 13.1 Destinatários em sandbox`, `### 13.2 …`, `### 13.3 Sondas — positiva e negativa`, `### 13.4 As duas provas`, `### 13.5 Recuo`, `### 13.6 Sair do sandbox — …`; `3`; `0`; "production access" só nas linhas do 13.1 e do 13.6, e `put-account-details` só no 13.6; `aws_erro` ≥ 5; nenhum número de 12 dígitos; o arquivo termina em `\n`; `repo-docs-refs` PASS.

- [ ] **Step 11: Commit**

```bash
git add deploy/aws/README.md
git commit -m "docs(33): runbook — lotus-ses em identity/* e o par. 13 em sandbox

Destinatario verificado antes do primeiro envio (13.1), sondas positiva e
negativa com a linha da D15 e a tabela de aws_erro (13.3), provas sem
production access (13.4) e o pedido pronto para quando o gatilho do
ADR-23 disparar (13.6).

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 15: ADR-23 — sandbox por decisão, `identity/*` e o gatilho

**Files:**
- Modify: `docs/adrs.md` (ADR-23, hoje nas linhas 433-472)
- Test: `frontend/tests/repo-docs-refs.test.ts` (já cobre o ADR)

**Interfaces:**
- Consumes: Task 14 — os nomes §13.1 e §13.6 do runbook.
- Produces: o parágrafo **Emenda de 2026-10-01 — sandbox por decisão**, com o gatilho do production access (D14, lugar a).

- [ ] **Step 1: a Decisão.** Troque:

```markdown
instance role `lotus-ec2`**, inline `lotus-ses` (`ses:SendRawEmail` e `ses:SendEmail` só na
identidade, `Condition ses:FromAddress` no remetente — runbook `deploy/aws/README.md` §4);
`services.ses` fica sem `key`/`secret` e o SDK cai na chain até o IMDSv2, o mesmo caminho do disco
`s3`. **A conta sai do sandbox** (production access, runbook §13): os destinatários são pessoas com
e-mail de qualquer domínio, e o sandbox só entrega a identidade verificada. **DNS do apex não
muda**: o SPF é avaliado sobre o MAIL FROM (`ses.`) e o DMARC alinha pelo DKIM.
```

por:

```markdown
instance role `lotus-ec2`**, inline `lotus-ses` (`ses:SendRawEmail` e `ses:SendEmail` em
`identity/*`, `Condition ses:FromAddress` no remetente — runbook `deploy/aws/README.md` §4);
`services.ses` fica sem `key`/`secret` e o SDK cai na chain até o IMDSv2, o mesmo caminho do disco
`s3`. **A conta fica em sandbox, por decisão** (emenda de 2026-10-01, abaixo): `@lotusotec.cl`
recebe pela identidade de domínio, e o endereço de outro domínio vira identidade verificada antes
do primeiro envio (runbook §13.1). **DNS do apex não muda**: o SPF é avaliado sobre o MAIL FROM
(`ses.`) e o DMARC alinha pelo DKIM.
```

- [ ] **Step 2: as Consequências.** Troque:

```markdown
por escrito aqui. Production access é da conta: o teto de 200/dia que freava o `/api/contacto`
do site (D-54 de lá) deixa de existir — efeito declarado ao site, decisão dele.
```

por:

```markdown
por escrito aqui. O teto do sandbox segue — 200 mensagens/24 h e 1/s, divididos com o
`/api/contacto` do site, que o Turnstile de lá segura.
```

- [ ] **Step 3: a emenda.** Troque:

```markdown
2026-09-28: acopla os usuários do sistema ao domínio da empresa).

---

## Pendências abertas (não decidir sem o João Victor)
```

por:

```markdown
2026-09-28: acopla os usuários do sistema ao domínio da empresa).

**Emenda de 2026-10-01 — sandbox por decisão.** O João decidiu não pedir production access agora:
os destinatários são ~10 usuários internos, e verificar o e-mail de quem é de fora custa um clique
por pessoa (runbook §13.1). Em sandbox o IAM confere também a identidade do destinatário, por isso a
`lotus-ses` vai em `identity/*`, e não só no domínio — o remetente segue travado pela `Condition`.
**Gatilho para pedir o production access** (runbook §13.6, com o texto e o comando prontos): uma
feature que envie e-mail a quem não é admin ou redator interno — cliente, aluno, usuário de outra
empresa (FUT-4 do backlog) —, verificar externo virando rotina, ou o volume somado ao do site
chegando perto de 200/24 h. Aprovado, o teto que freia o `/api/contacto` do site deixa de existir:
efeito a avisar ao site (D-54 de lá).

---

## Pendências abertas (não decidir sem o João Victor)
```

- [ ] **Step 4: Verify**

```bash
grep -c 'A conta sai do sandbox\|deixa de existir — efeito declarado' docs/adrs.md
grep -c 'Emenda de 2026-10-01 — sandbox por decisão' docs/adrs.md
grep -c 'identity/\*' docs/adrs.md
grep -n 'arn:aws' docs/adrs.md
(cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts)
```

Expected: `0`; `1`; `2`; nada (nenhum ARN literal); `repo-docs-refs` PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/adrs.md
git commit -m "docs(33): ADR-23 emendado — sandbox por decisao, identity/* e o gatilho

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 16: `operacao-segredos.md` — a falha calada do destinatário não verificado

**Files:**
- Modify: `docs/operacao-segredos.md:59-68` (o parágrafo **E-mail (SES, ADR-23).** do §4)

**Interfaces:**
- Consumes: Task 13 (`aws_erro`) e Task 14 (o §13.1 do runbook).

- [ ] **Step 1: a frase.** Troque:

```markdown
alerta que não chegou. Depois de qualquer mudança em `lotus-ses`, no `.env` (`MAIL_*`) ou na
identidade SES, o gate é o do runbook §13: alerta ou reset em caixa real.
```

por:

```markdown
alerta que não chegou. Depois de qualquer mudança em `lotus-ses`, no `.env` (`MAIL_*`) ou na
identidade SES, o gate é o do runbook §13: alerta ou reset em caixa real. Em sandbox (ADR-23,
emenda de 2026-10-01) há um segundo jeito de falhar calado: o destinatário de fora de
`@lotusotec.cl` que ainda não clicou no link de verificação da AWS — o log default diz `aws_erro`
`MessageRejected`, sem o endereço, e a ordem certa é a do runbook §13.1.
```

- [ ] **Step 2: Verify**

```bash
grep -c 'segundo jeito de falhar calado' docs/operacao-segredos.md
grep -n 'MAIL_PASSWORD\|smtp\|SMTP\|\.env\.production\.example' docs/operacao-segredos.md
(cd frontend && pnpm test --project repo tests/repo-docs-refs.test.ts)
```

Expected: `1`; nada (o DoD 8 da Fase A segue de pé); PASS.

- [ ] **Step 3: Commit**

```bash
git add docs/operacao-segredos.md
git commit -m "docs(33): operacao-segredos — destinatario nao verificado tambem falha calado

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 17: packet — número da conta mascarado e nota da emenda

**Files:**
- Modify: `docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md` (key fact 1, linha 43; nota depois da linha Derived snapshot)

- [ ] **Step 1: mascarar a conta**

```bash
P=docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md
grep -cE '[0-9]{12}' $P
sed -i -E 's/conta `[0-9]{12}`/conta `<conta>`/' $P
grep -cE '[0-9]{12}' $P
grep -c 'conta `<conta>`' $P
```

Expected: `1`, depois `0` e `1`. O número nunca aparece na saída: só a contagem.

- [ ] **Step 2: a nota.** Troque:

```markdown
> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.
```

por:

```markdown
> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

> **Nota de 2026-10-04 (item 33).** A linha "Sandbox" de *Resolved decisions and divergences* e o
> key fact 2 ("não satisfaz o DoD") foram substituídos pela emenda de 2026-10-01 da spec: a conta
> fica em sandbox por decisão do João `[J-1]`, com destinatário verificado e o production access
> adiado com gatilho (ADR-23). O número da conta virou `<conta>`: o repositório pessoal é público.
```

- [ ] **Step 3: Verify** — `grep -c 'Nota de 2026-10-04 (item 33)' $P` → `1`; `git diff --stat $P` → `1 file changed, 6 insertions(+), 1 deletion(-)`.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/context-packets/2026-09-28-infra-producao-email-ses.md
git commit -m "docs(33): packet sem o numero da conta e com a nota da emenda de sandbox

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 18: gate da Fase A' e o audit do replanejamento

**Files:**
- Modify: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` (seção inserida antes da seção da Task 13, e seção nova no fim)

**Interfaces:**
- Consumes: Tasks 13 a 17 inteiras — o gate mede a branch toda; o SHA do commit da Task 13 (`git log --format=%h -1 -- backend/bootstrap/app.php`).

- [ ] **Step 1: frontend** — o merge da `origin/main` trouxe `pnpm-lock.yaml` novo:

```bash
cd /home/jvbat/projetos/lotus-33-infra-producao-email-ses/frontend
pnpm install --frozen-lockfile 2>&1 | tail -2
pnpm test --project repo 2>&1 | tail -4
pnpm lint; echo "lint exit=$?"
pnpm build > $SCRATCH/build.log 2>&1; echo "build exit=$?"; tail -3 $SCRATCH/build.log
```

Expected: install sem erro; `repo` verde; `lint exit=0`; `build exit=0`.

- [ ] **Step 2: backend**

```bash
cd /home/jvbat/projetos/lotus-33-infra-producao-email-ses
docker compose exec -T app php artisan test 2>&1 | tail -4
(cd backend && ./vendor/bin/pint --test app/Shared/Logging/FalhaDeObservabilidade.php bootstrap/app.php tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php)
```

Expected: o placar do Step 10 da Task 13, nenhum `failed`; Pint `PASS` (o `--test` não reescreve nada).

- [ ] **Step 3: escopo do diff e número da conta**

```bash
git fetch origin
git diff --name-only origin/main...HEAD
AWS_PROFILE=lotus aws sts get-caller-identity --query Account --output text > $SCRATCH/conta.txt
git grep -c -F -f $SCRATCH/conta.txt -- deploy docs backend ':!docs/superpowers/audits/'; echo "exit=$?"
```

Expected: exatamente os onze caminhos — `backend/app/Shared/Logging/FalhaDeObservabilidade.php`, `backend/bootstrap/app.php`, `backend/tests/Feature/Shared/FalhaDeEnvioDeEmailTest.php`, `deploy/aws/README.md`, `docs/adrs.md`, `docs/operacao-segredos.md`, os quatro da pasta do bloco (`audit.md`, `estado.md`, `plano.md`, `spec.md`) e o packet; depois, nenhuma linha e `exit=1` (o número da conta não está em arquivo nenhum fora dos dois audits legados, que a spec §3 deixa de fora; no planejamento, em 2026-10-04, a única ocorrência no escopo era a do packet, que a Task 17 mascara). O número fica só no scratchpad.

- [ ] **Step 4: estado do espelho**

```bash
gh api repos/Gatika-CL/lotus/contents/deploy/aws/env.prod.example -H 'Accept: application/vnd.github.raw' 2>/dev/null | grep '^MAIL_MAILER=' || echo "sem acesso ao corporativo: o João confirma"
```

Expected: `MAIL_MAILER=log` — o #121 ainda não foi espelhado (D13). Sem acesso, pergunte ao João e registre a resposta.

- [ ] **Step 5: audit, a narrativa** — insira, logo antes da linha `## Task 13 — D15, o destinatário fora do log`, com os valores reais no lugar de cada `<…>`:

```markdown
## Replanejamento de 2026-10-01 e emenda de 2026-10-04

- **Decisão de 2026-10-01 (João):** a conta SES fica em sandbox. `@lotusotec.cl` recebe pela identidade de domínio; endereço de outro domínio vira identidade verificada antes do primeiro envio (runbook §13.1); o production access fica adiado, com o gatilho no ADR-23, no runbook §13.6 e no FUT-4, que entra pela PR de docs da aceitação. Spec emendada em `187679be`.
- **Achado do IAM:** em sandbox o SES confere a autorização também contra a identidade do destinatário. Com `Resource` só em `identity/lotusotec.cl`, um externo verificado voltaria `not authorized … identity/<destinatário>`, e a sonda da spec de 2026-09-28 leria isso como policy errada. A `lotus-ses` passa a `identity/*`, com a mesma `Condition` no remetente (runbook §4).
- **Espelho:** o #121 (`44e6e372`) está na `main` e não no corporativo (<leitura do Step 4>); o espelho leva o #121 e esta emenda juntos, uma vez (D13).
- **Emenda de 2026-10-04 (João):** o destinatário que vazava para o log default — pelo reset, pelo cadastro de redator e pelo reenvio do convite, este pelo handler — é corrigido neste bloco (D15, Task 13, `<sha>`); o Drive é emendado por nova versão do mesmo arquivo, conferida por tamanho e hash (D12, Task 19). Spec em `0eb9a18b`.
- **Harness:** o merge `95fd1d0e` trouxe o item 35 antes do plano. A revisão é o `/revisar-bloco`, e a Fase B' roda depois do merge, com o bloco em `blocked` aguardando aceitação (spec §10 e `## Verificação externa`).

```

- [ ] **Step 6: audit, o gate** — acrescente ao fim do arquivo:

```markdown

## Task 18 — gate da Fase A'

- `pnpm install --frozen-lockfile`: <resultado>. `pnpm test --project repo`: <arquivos e testes>. `pnpm lint`: exit 0. `pnpm build`: exit 0.
- `php artisan test`: <placar>. Pint `--test` nos três `.php`: `PASS`.
- `git diff --name-only origin/main...HEAD`: os onze caminhos do plano; em `backend/`, só os três da Task 13.
- O número da conta, lido de `sts get-caller-identity` para o scratchpad, não aparece em `deploy/`, `docs/` nem `backend/` (fora dos dois audits legados de `docs/superpowers/audits/`, spec §3).
```

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "docs(33): audit do replanejamento e gate da Fase A'

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

### Task 19: nova versão do Drive conferida (D12)

**Files:**
- Modify: `docs/superpowers/blocos/33-infra-producao-email-ses/audit.md` (seção nova no fim)

**Interfaces:**
- Consumes: o upload do João — `arquitetura-aws-lotus.md`, ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, nova versão do mesmo arquivo.
- Produces: a prova do item 1 da `## Verificação externa` da spec, que o `/finalizar-bloco` (6a) copia para o corpo do `estado.md`.

- [ ] **Step 1: carregar o conector** — `ToolSearch` com `select:mcp__claude_ai_Google_Drive__get_file_metadata,mcp__claude_ai_Google_Drive__download_file_content`. Sem o conector neste despacho → devolva BLOCKED com esse motivo.

- [ ] **Step 2: metadados** — `get_file_metadata` com `fileId` `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI` e `excludeContentSnippets: true`.

Expected: `fileSize` `"10600"` e `modifiedTime` de 2026-10-04 ou depois. Com `fileSize` `"10130"` e `modifiedTime` `2026-06-22T20:17:27Z`, a nova versão ainda não subiu → devolva BLOCKED: "aguardando o João subir a nova versão do Drive (D12)". Nada depende desta task.

- [ ] **Step 3: conteúdo e hash** — `download_file_content` com o mesmo `fileId`; grave o base64 devolvido em `$SCRATCH/drive-conferido.b64` (ferramenta `Write`) e:

```bash
base64 -d $SCRATCH/drive-conferido.b64 > $SCRATCH/drive-conferido.md
wc -c < $SCRATCH/drive-conferido.md
sha256sum $SCRATCH/drive-conferido.md
```

Expected: `10600` e `a4dd4fe9aa9cbb8940f5fb8dda449a872a6f6e92de088a0ef09409b75753af1d` — o arquivo montado no planejamento a partir da versão de 2026-06-22 (10130 bytes, sha256 `71f5fdcdc4d8d917f52158f1bcbfe4d9eace556df0225e7df5d807d38ec5e08f`), com só as linhas 52 e 179 trocadas. Hash diferente → PARE: o que subiu não é o arquivo aprovado; mostre ao João o `diff` entre `$SCRATCH/drive-conferido.md` e o arquivo remontado como no bloco abaixo.

Se o João precisar do arquivo de novo e ele tiver sumido do `/tmp`, remonte-o da versão atual do Drive (baixe-a como no Step 3, para `$SCRATCH/drive-atual.md`, e confira o sha256 `71f5fdcd…`):

```bash
awk -v l52='- **Implementação:** Laravel Mail driver SES, credencial pela instance role da EC2 (sem chave no host). Conta em sandbox por decisão (2026-10-01, ADR-23): destinatário @lotusotec.cl recebe direto; endereço externo é verificado como identidade antes do primeiro envio. Production access (pedido à AWS, ~1 dia útil) só quando uma feature mandar e-mail a quem não é usuário interno — cliente, aluno, outra empresa — ou o volume encostar em 200/24 h (runbook §13.6, FUT-4).' \
    -v l179='- ~~Sair do sandbox do SES antes de produção~~ — decidido em 2026-10-01 ficar em sandbox (ADR-23); production access com gatilho (runbook §13.6, FUT-4).' \
    'NR==52{print l52; next} NR==179{print l179; next} {print}' $SCRATCH/drive-atual.md > $SCRATCH/arquitetura-aws-lotus.md
sha256sum $SCRATCH/arquitetura-aws-lotus.md   # a4dd4fe9aa9cbb8940f5fb8dda449a872a6f6e92de088a0ef09409b75753af1d
```

O João sobe esse arquivo pelo Drive: botão direito em `arquitetura-aws-lotus.md` → Informações do arquivo → Gerenciar versões → Fazer upload de nova versão. Mesmo ID, histórico preservado.

- [ ] **Step 4: audit** — acrescente ao fim, com o `modifiedTime` real:

```markdown

## Task 19 — Drive conferido (D12)

- `arquitetura-aws-lotus.md` (ID `10eFmpqDTKL4wfWsJW-Rr7dDuBkb1RtaI`, G-1 do packet): nova versão do mesmo arquivo, subida pelo João; `fileSize` 10600, `modifiedTime` <valor>.
- O conteúdo baixado tem sha256 `a4dd4fe9aa9cbb8940f5fb8dda449a872a6f6e92de088a0ef09409b75753af1d`: o arquivo montado no planejamento a partir da versão de 2026-06-22 (10130 bytes, sha256 `71f5fdcdc4d8d917f52158f1bcbfe4d9eace556df0225e7df5d807d38ec5e08f`), com só as linhas 52 (§1.4, *Implementação*) e 179 (*Pendências*) trocadas pelo texto que o João aprovou em 2026-10-04.
- É a prova do item 1 da `## Verificação externa` da spec.
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/blocos/33-infra-producao-email-ses/audit.md
git commit -m "docs(33): audit — nova versao do Drive conferida por tamanho e hash (D12)

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 15, 16, 17 | sim — `docs/adrs.md`; `docs/operacao-segredos.md`; o packet | nenhuma entre elas: a 15 e a 16 consomem a 14, não uma à outra; a 17 não consome nem produz |

Task fora de grupo executa e revisa uma a uma. A 13, a 18 e a 19 dividem o `audit.md`; a 14 produz o que a 15 e a 16 consomem.

## Handoff de execução

**executor: claude**

- **Sessão:** `sonnet`, esforço `medium` — o frontmatter do `/executar-bloco`. Sem `--max`: o código e o texto de cada task estão no plano, e a revisão final da branch já é `opus` (`revisor-branch`).
- **Escolha do Passo 3:** 7 tasks e 9 arquivos distintos → `subagent-driven-development`.
- **Papéis** (`.claude/papeis.md`): `implementador-integracao` na Task 13 (três arquivos de código e o audit, TDD, o handler global de exceção); `implementador-mecanico` nas Tasks 14 a 19 (texto pronto no plano, um arquivo cada); `revisor-task` em toda task; `re-revisor` e `corretor-tardio` só em rodada de correção; `revisor-branch` no fim.
- **Sem delegação ao Codex:** a Task 13 mexe no handler global de exceção, e as Tasks 18 e 19 leem a AWS, o corporativo e o Drive — julgamento fora do plano. A lente Codex entra no `/revisar-bloco`, que classifica o bloco como alto risco.
- **Stack:** o `/executar-bloco` sobe o stack antes da Task 13 (`docker compose up -d` na raiz da lane), e a Task 13 roda o `composer install` no contêiner.
- **Drive (Task 19):** o implementador carrega o conector por `ToolSearch`. Sem o conector no despacho, ou sem a nova versão no Drive, ele devolve BLOCKED, e o controlador resolve com o João.

**Sequência obrigatória:** 13 → 14 → 15 → 16 → 17 → 18 → 19.
- 13 antes de 14 e 16: o runbook e o `operacao-segredos.md` citam a linha `Falha ao enviar e-mail` e o `aws_erro` que a 13 cria.
- 14 antes de 15 e 16: o ADR-23 cita o §13.1 e o §13.6; o `operacao-segredos.md`, o §13.1.
- 15, 16 e 17 formam o G1 (pipeline de profundidade 1).
- 18 depois de 13 a 17: o gate mede a branch inteira.
- 19 por último: depende do João subir o arquivo. BLOCKED ali não trava nada, e o gate da 18 não precisa rodar de novo.

`efeito_externo: sim` e `executor: claude` já estão no `estado.md`.

---

## Depois da execução — revisão, PR e aceitação

Nada daqui é task do `/executar-bloco`. A ordem do harness:

1. O `/executar-bloco 33` termina em `ready_for_review`, com o `rulings.md`.
2. `/revisar-bloco 33` — alto risco (credencial IAM, reset de senha, handler global), com a lente Codex junto.
3. `/finalizar-bloco 33`, na lane: verificação fresca, portão da revisão, merge da `origin/main` e os registros de fechamento em **aguardando aceitação** — a prova do item 1 da `## Verificação externa` (Task 19) vai para o corpo do `estado.md`; os itens 2 a 7 vão para o `blocker`; a linha do `historico/progress.md` diz que o bloco mesclou sem a prova externa; o `backlog.md` não muda. Depois, a PR. O merge é do João.
4. O João espelha a `main` no corporativo (`CONTRIBUINDO.md`): um espelho só, com o #121 e esta emenda (D13).
5. `/finalizar-bloco 33` no main tree (pós-PR): `lane.sh fechar 33`. A lane fecha; o bloco segue em `blocked` aguardando aceitação.
6. A Fase B', abaixo, e a PR de docs da aceitação, que leva o bloco a `closed`.

## Fase B' — aceitação em produção

**Não é task do `/executar-bloco`:** roda depois do passo 5 acima. Escrita do João; leitura da sessão. As leituras usam `aws`, `curl`, `dig` e `gh`, que a allowlist do `guard-main-shell` nega no main tree: rodam numa árvore fora dele — a da PR de docs da aceitação — ou o João roda e cola. Toda leitura `aws` com `AWS_PROFILE=lotus`. Cada leitura vai ao `audit.md`, seção `## Fase B' — aceitação`, sem valor de `.env`, sem corpo de e-mail, sem endereço de destinatário. Os passos B2 e B3 andam a qualquer hora, até antes do merge, se o João quiser adiantar; o B1 vem antes do B4, e o B4 antes do B5, do B6 e do B7.

### B1. Espelho (spec §5, passo 1; D13)

O João espelha. Leitura:

```bash
gh api repos/Gatika-CL/lotus/commits/main --jq '.sha[0:8] + " " + .commit.message' 2>/dev/null || echo "sem acesso: o João cola o SHA"
gh api repos/Gatika-CL/lotus/contents/deploy/aws/env.prod.example -H 'Accept: application/vnd.github.raw' 2>/dev/null | grep '^MAIL_MAILER='
```

Esperado: o SHA da `main` do corporativo — o `SHA_ESPELHADO` que o B4 promove — e `MAIL_MAILER=ses` no molde de lá.

### B2. Policy (passo 2; Verificação externa 2)

O João aplica a `lotus-ses` do runbook §4. Leitura:

```bash
AWS_PROFILE=lotus aws iam list-role-policies --role-name lotus-ec2
AWS_PROFILE=lotus aws iam get-role-policy --role-name lotus-ec2 --policy-name lotus-ses --query PolicyDocument --output json | sed -E 's/[0-9]{12}/<conta>/g'
AWS_PROFILE=lotus aws iam list-access-keys --user-name lotus-infra --query 'length(AccessKeyMetadata)'
```

Esperado: `lotus-alerta`, `lotus-s3`, `lotus-ses`; o documento com `ses:SendRawEmail` e `ses:SendEmail`, `Resource` `arn:aws:ses:sa-east-1:<conta>:identity/*` e `Condition.StringEquals.ses:FromAddress` `lotus@lotusotec.cl`; `1` (nenhuma chave nova — DoD 2).

### B3. Destinatários (passo 3; Verificação externa 3)

O João conta, na base de produção, os admins e redatores ativos fora de `@lotusotec.cl` — pelo `tinker` do runbook, `User::query()->where('is_active', true)->whereIn('type', ['admin', 'redator'])->where('email', 'not like', '%@lotusotec.cl')->count()`; a lista ele usa só no terminal dele. Roda `create-email-identity` para cada um e para o próprio Gmail (runbook §13.1), e avisa cada pessoa, que clica no link em até 24 h. Leitura, sem imprimir endereço:

```bash
AWS_PROFILE=lotus aws sesv2 list-email-identities --region sa-east-1 --query "EmailIdentities[?IdentityType=='DOMAIN'].IdentityName" --output text
for id in $(AWS_PROFILE=lotus aws sesv2 list-email-identities --region sa-east-1 --query "EmailIdentities[?IdentityType=='EMAIL_ADDRESS'].IdentityName" --output text); do
  AWS_PROFILE=lotus aws sesv2 get-email-identity --region sa-east-1 --email-identity "$id" --query VerifiedForSendingStatus --output text
done | sort | uniq -c
```

Esperado: só `lotusotec.cl` de domínio; `N True`, com N igual à contagem do João mais 1 (o Gmail dele). O audit registra só N. O B6 só roda com todo admin ativo verificado.

### B4. `.env` e botão (passos 1 e 4; Verificação externa 4)

O João põe `MAIL_MAILER=ses` no `/opt/lotus/.env` e **depois** clica o botão no `SHA_ESPELHADO` (runbook §13.2). Leitura:

```bash
gh run list --repo Gatika-CL/lotus --workflow deploy.yml --limit 1 --json databaseId,conclusion,headSha 2>/dev/null || echo "o João cola o run e a conclusão"
curl -s -o /dev/null -w '%{http_code}\n' https://app.lotusotec.cl/up
```

E, por SSH (o João roda se o auto mode barrar): os dois comandos do gate do runbook §13.2 e `sudo tail -2 /opt/lotus/releases.jsonl`.

Esperado: run `success` no `SHA_ESPELHADO`; `200` — a prova `producao GET /up -> 200`; `1`; a saída do `config:show` contém `ses`; o ledger com `fim` e `resultado ok` no mesmo SHA.

### B5. Sondas (passo 5; D9, D15; Verificação externa 5)

O João roda as duas sondas do runbook §13.3 — a positiva para o próprio Gmail, a negativa para `sonda@example.com` — e cola:
- da positiva: que não houve exceção; da caixa, `From: Lotus <lotus@lotusotec.cl>`, `Subject: sonda positiva`, o `Authentication-Results` com `dkim=pass header.d=lotusotec.cl`, `spf=pass` em `ses.lotusotec.cl` e `dmarc=pass`, e o horário;
- da negativa: a linha impressa e a linha da saída de erro, `production.ERROR: Falha ao enviar e-mail {…}`.

Esperado: a impressa com `Reason: Email address is not verified` — o audit registra o texto só até `verified`; a de erro com `"aws_erro":"MessageRejected"` e sem `@` nenhum. `not authorized … ses:SendRawEmail` → PARE, volta ao B2.

### B6. Prova D7 (passo 6; Verificação externa 6)

Pré-condição: B3 completo para todo admin ativo. O João — ou a sessão, de fora, numa árvore que não seja o main tree: são só `POST`s de login com senha errada — roda o loop do runbook §13.4 com o e-mail de um admin. Leitura: as 15 linhas do loop; da caixa de um admin, `From`, `Subject` (`Lotus — alerta de acceso sospechoso`), os três `pass` e o horário; do host, por SSH, os dois `grep` do §13.4.

Esperado: `422` × 15, nenhum `419` nem `429`; os três `pass`; `acesso.suspeito` ≥ 1 e `Falha ao enviar alerta` = 0. Com `Falha ao enviar alerta`, o `aws_erro` da linha decide (runbook §13.3; spec §6): `MessageRejected` volta ao B3 e espera os 15 min da janela; `Throttling` é bloco próprio, decisão do João; `AccessDenied` volta ao B2.

### B7. Reset (passo 7; Verificação externa 7)

O João faz o reset pela UI (runbook §13.4) com uma conta `@lotusotec.cl` ou verificada: pede, recebe, abre o link, define a senha nova, loga com ela. Leitura: da caixa, `From`, `Subject`, os três `pass` e o horário — **nunca o link**; e o `curl` de login com a senha antiga devolvendo `422`, que o João roda porque a senha é dele.

### B8. Leitura final (passo 8; Verificação externa 7)

```bash
AWS_PROFILE=lotus aws sesv2 get-account --region sa-east-1 --query '{Producao:ProductionAccessEnabled,Envio:SendingEnabled,Enviados24h:SendQuota.SentLast24Hours}'
AWS_PROFILE=lotus aws sesv2 get-email-identity --region sa-east-1 --email-identity lotusotec.cl --query '{Verificada:VerifiedForSendingStatus,Dkim:DkimAttributes.Status,MailFrom:MailFromAttributes.MailFromDomainStatus}'
dig +short MX lotusotec.cl
```

Esperado: `false` (decisão, ADR-23), `true` e mais que zero no dia das provas; `true`/`SUCCESS`/`SUCCESS`; só MX do Google.

### A PR de docs da aceitação

Num commit só — o modo Aceitação do `/finalizar-bloco`, que o item 36 automatiza; até lá, do João:

- `estado.md`: no corpo, abaixo do que o fechamento escreveu, uma linha por item da `## Verificação externa` (2 a 7) com a prova e a seção do audit; no frontmatter, `blocked` → `closed`, com o bloco YAML do modo Aceitação.
- `audit.md`: a seção `## Fase B' — aceitação`, de B1 a B8.
- `docs/superpowers/historico/progress.md`: a linha que o fechamento gravou, atualizada — sem linha nova.
- `docs/superpowers/backlog.md`: sai a ficha 33 (a seção e a linha dela em `# Ordem de execução`, se houver); *Futuros* ganha o FUT-4 e *Débitos técnicos* o `D-74`, com os textos da spec §10.
