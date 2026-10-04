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
