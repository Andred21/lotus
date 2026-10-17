<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\Cadastros;
use App\Console\CargaInicial\CarregadorDeCadastros;
use App\Console\CargaInicial\Contagem;
use App\Console\CargaInicial\Instante;
use App\Domains\Identity\Models\StudentClientLog;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Models\File;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use OwenIt\Auditing\Models\Audit;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\TestCase;

/**
 * A carga dos cadastros contorna as Actions do fluxo vivo (convite, e-mail
 * obrigatório, datas do relógio). O que ela NÃO pode contornar é a auditoria,
 * a unicidade e o "nunca sobrescreve" — é o que estes testes seguram.
 */
class CarregadorDeCadastrosTest extends TestCase
{
    use RefreshDatabase;

    private string $pasta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Storage::fake('s3');
        Notification::fake();
        Mail::fake();

        $this->pasta = sys_get_temp_dir().'/carga-cad-'.bin2hex(random_bytes(6));
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

    /** @param  array<string, mixed>|null  $payload */
    private function carregar(?Contagem $c = null, bool $gravarArquivos = true, ?array $payload = null): Cadastros
    {
        return app(CarregadorDeCadastros::class)->carregar($payload ?? CargaSintetica::payload(), $this->pasta, $gravarArquivos, $c ?? new Contagem);
    }

    public function test_cria_cliente_com_endereco_contato_e_datas_historicas(): void
    {
        $cad = $this->carregar();
        $this->assertSame('Empresa Prueba Servicios Ltda.', $cad->cliente->legal_name);
        $this->assertFalse($cad->cliente->user->is_active);
        $this->assertSame('cliente', $cad->cliente->user->type);
        $this->assertTrue($cad->cliente->addresses()->sole()->is_primary);
        $this->assertSame('Contacto Prueba', $cad->cliente->contacts()->sole()->name);
        $this->assertTrue($cad->cliente->created_at->equalTo(Instante::meioDia('2026-02-13')));
    }

    public function test_cria_alunos_inativos_com_email_sintetico_e_vinculo_desde_o_primeiro_curso(): void
    {
        $cad = $this->carregar();
        $tres = $cad->alunos[CargaSintetica::rut(16333333)];
        $this->assertFalse($tres->user->is_active);
        $this->assertStringEndsWith('@sin-correo.invalid', $tres->user->email);
        $this->assertSame($cad->cliente->id, $tres->current_client_id);
        $this->assertSame('2026-03-02', StudentClientLog::where('student_id', $tres->id)->sole()->started_on->toDateString());
        $this->assertTrue($tres->created_at->equalTo(Instante::meioDia('2026-03-02')));
    }

    public function test_cria_redator_ativo_sem_convite_com_role_habilitacao_e_documentos(): void
    {
        $cad = $this->carregar();
        $r1 = $cad->redatores['R1'];
        $this->assertTrue($r1->user->is_active);
        $this->assertTrue($r1->user->hasRole('redator'));
        $this->assertEqualsCanonicalizing([$cad->cursos['A#']->id, $cad->cursos['B#']->id], $r1->courses()->pluck('courses.id')->all());
        $this->assertEqualsCanonicalizing(['CV', 'REUF'], $r1->documents()->pluck('type')->all());
        Storage::disk('s3')->assertExists($r1->documents()->where('type', 'CV')->value('path'));
        Notification::assertNothingSent();
        Mail::assertNothingSent();
    }

    public function test_redator_existente_igual_nao_recebe_habilitacao_nem_audit_de_sync(): void
    {
        $r1 = $this->carregar()->redatores['R1'];
        $r1->courses()->detach(); // o redator já existe, sem habilitação: a carga não a refaz
        $syncs = Audit::where('event', 'sync')->count();

        $this->carregar();

        $this->assertSame(0, $r1->courses()->count());
        $this->assertSame($syncs, Audit::where('event', 'sync')->count());
    }

    public function test_cria_cursos_com_modulos_em_ordem(): void
    {
        $cad = $this->carregar();
        $this->assertSame(['Módulo 1', 'Módulo 2'], $cad->cursos['A#']->modules()->orderBy('sort_order')->pluck('name')->all());
        $this->assertSame(0, $cad->cursos['B#']->modules()->count());
    }

    public function test_segunda_carga_conta_tudo_como_existente_e_nao_grava_nada(): void
    {
        $this->carregar();
        $audits = Audit::count();
        $contagem = new Contagem;
        $this->carregar($contagem);
        $this->assertSame($audits, Audit::count());
        foreach ($contagem->linhas() as [$entidade, $criados]) {
            $this->assertSame(0, $criados, $entidade);
        }
    }

    public function test_sem_gravar_arquivos_nao_sobe_documento_nem_cria_linha(): void
    {
        $contagem = new Contagem;
        $this->carregar($contagem, gravarArquivos: false);
        $this->assertSame([], Storage::disk('s3')->allFiles());
        $this->assertSame(0, File::count());
        $this->assertContains(['documentos', 2, 0], $contagem->linhas());
    }

    public function test_rut_sem_pontos_e_k_minusculo_casa_com_o_formatado(): void
    {
        $this->carregar();
        $p = CargaSintetica::payload();
        $p['alunos'][0]['rut'] = str_replace(['.', '-'], '', strtolower($p['alunos'][0]['rut']));
        $contagem = new Contagem;
        $this->carregar($contagem, payload: $p);
        $this->assertContains(['alunos', 0, 3], $contagem->linhas());
    }

    public function test_rut_de_aluno_ja_usado_por_outro_tipo_e_conflito(): void
    {
        User::factory()->create(['rut' => CargaSintetica::rut(16111111), 'type' => 'admin']);
        $contagem = new Contagem;
        $cad = $this->carregar($contagem);
        $this->assertTrue($contagem->temConflito());
        $this->assertArrayNotHasKey(CargaSintetica::rut(16111111), $cad->alunos);
    }

    public function test_email_de_redator_ja_usado_por_outro_usuario_e_conflito(): void
    {
        User::factory()->create(['email' => 'relator@prueba.test', 'rut' => CargaSintetica::rut(17111111)]);
        $contagem = new Contagem;
        $this->carregar($contagem);
        $this->assertStringContainsString('relator@prueba.test', implode("\n", $contagem->conflitos()));
    }

    public function test_documento_que_nao_e_pdf_e_conflito(): void
    {
        file_put_contents("{$this->pasta}/documentos/R1-CV.pdf", 'texto puro');
        $contagem = new Contagem;
        $this->carregar($contagem);
        $this->assertStringContainsString('R1-CV.pdf', implode("\n", $contagem->conflitos()));
    }

    public function test_grava_trilha_de_auditoria_dos_cadastros_e_da_habilitacao(): void
    {
        $cad = $this->carregar();

        foreach ([$cad->cliente, $cad->cliente->user, $cad->alunos[CargaSintetica::rut(16111111)], $cad->cursos['A#'], $cad->redatores['R1']] as $model) {
            $this->assertTrue(
                Audit::where('auditable_type', $model->getMorphClass())->where('auditable_id', $model->getKey())->where('event', 'created')->exists(),
                $model::class,
            );
        }

        $this->assertTrue(
            Audit::where('auditable_type', $cad->redatores['R1']->getMorphClass())->where('auditable_id', $cad->redatores['R1']->id)->where('event', 'sync')->exists(),
        );
    }

    public function test_email_sintetico_passa_na_regra_email_do_laravel(): void
    {
        $this->assertTrue(Validator::make(['e' => '161111119@sin-correo.invalid'], ['e' => 'email'])->passes());
    }
}
