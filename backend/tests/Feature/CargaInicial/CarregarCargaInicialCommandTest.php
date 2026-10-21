<?php

namespace Tests\Feature\CargaInicial;

use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\Models\File;
use Carbon\CarbonInterface;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use OwenIt\Auditing\Models\Audit;
use RuntimeException;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O comando é a casca da carga: lê o arquivo, ensaia numa transação que sempre
 * desfaz, recusa por conflito e só então grava de verdade (spec §5, §7).
 */
class CarregarCargaInicialCommandTest extends TestCase
{
    use CreatesDomainRecords, RefreshDatabase;

    private string $pasta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Storage::fake('s3');
        Notification::fake();
        Mail::fake();

        $this->pasta = sys_get_temp_dir().'/carga-cmd-'.bin2hex(random_bytes(6));
        CargaSintetica::gravarEm($this->pasta);
    }

    protected function tearDown(): void
    {
        $this->apagar($this->pasta);

        parent::tearDown();
    }

    private function apagar(string $caminho): void
    {
        if (is_dir($caminho)) {
            foreach (scandir($caminho) as $item) {
                if ($item !== '.' && $item !== '..') {
                    $this->apagar($caminho.'/'.$item);
                }
            }
            rmdir($caminho);
        } elseif (file_exists($caminho)) {
            unlink($caminho);
        }
    }

    public function test_simular_nao_grava_nada_e_mostra_contagens(): void
    {
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta, '--simular' => true])
            ->expectsOutputToContain('certificados')->assertExitCode(0);
        $this->assertSame(0, Certificate::count());
        $this->assertSame(0, User::count());
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_carga_real_grava_tudo_e_a_segunda_nao_muda_nada(): void
    {
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
        $this->assertSame(3, Certificate::count());
        $this->assertSame(3, Budget::count());
        $audits = Audit::count();
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
        $this->assertSame(3, Certificate::count());
        $this->assertSame($audits, Audit::count());
    }

    public function test_conflito_recusa_sem_gravar(): void
    {
        $outro = $this->makeClientWithUser();
        $b = new Budget(['client_id' => $outro->id, 'code' => 'Scap 176']);
        $b->id = 176;
        $b->save();
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
            ->expectsOutputToContain('176')->assertExitCode(1);
        $this->assertSame(0, Certificate::count());
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_falha_depois_do_upload_apaga_do_disco_o_que_ja_subiu(): void
    {
        // O segundo upload falha: o primeiro já está no disco, e a transação do banco não o alcança.
        $this->app->instance(UploadFileAction::class, new class extends UploadFileAction
        {
            private int $chamadas = 0;

            public function put(Model $owner, UploadedFile $file, ?string $disk = null): string
            {
                if (++$this->chamadas === 2) {
                    throw new RuntimeException('disco indisponivel');
                }

                return parent::put($owner, $file, $disk);
            }
        });

        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
            ->expectsOutputToContain('A carga foi desfeita')->assertExitCode(1);

        $this->assertSame(0, Certificate::count());
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_falha_no_registro_depois_do_put_apaga_do_disco_o_que_acabou_de_subir(): void
    {
        // O binário já está no disco quando o insert em `files` lança: o path tem de estar na contagem antes dele.
        $this->app->instance(UploadFileAction::class, new class extends UploadFileAction
        {
            public function register(Model $owner, string $path, array $meta, string $type, ?CarbonInterface $validUntil = null): File
            {
                throw new RuntimeException('insert em files falhou');
            }
        });

        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
            ->expectsOutputToContain('A carga foi desfeita')->assertExitCode(1);

        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_arquivo_que_nao_se_apaga_e_listado_para_remocao_manual(): void
    {
        $this->app->instance(UploadFileAction::class, new class extends UploadFileAction
        {
            private int $chamadas = 0;

            public function put(Model $owner, UploadedFile $file, ?string $disk = null): string
            {
                if (++$this->chamadas === 2) {
                    throw new RuntimeException('disco indisponivel');
                }

                return parent::put($owner, $file, $disk);
            }

            public function discard(string $path, ?string $disk = null): void {}
        });

        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
            ->expectsOutputToContain('não foi possível apagar')->assertExitCode(1);

        $this->assertCount(1, Storage::disk('s3')->allFiles());
    }

    public function test_arquivo_invalido_sai_com_erro(): void
    {
        $p = CargaSintetica::payload();
        $p['schema_version'] = 2;
        CargaSintetica::gravarEm($this->pasta, $p);
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])
            ->expectsOutputToContain('schema_version')->assertExitCode(1);
    }

    public function test_nenhum_email_ou_notificacao_sai_e_a_carga_audita(): void
    {
        $this->artisan('lotus:carga-inicial', ['pasta' => $this->pasta])->assertExitCode(0);
        Notification::assertNothingSent();
        Mail::assertNothingSent();
        $c = Certificate::where('codigo', 'LOT-2026-001')->sole();
        $this->assertSame(1, $c->audits()->where('event', 'created')->count());
        $this->assertNull($c->audits()->first()->user_id);
    }
}
