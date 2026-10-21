<?php

namespace App\Console\CargaInicial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseModule;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\StudentClientLog;
use App\Domains\Identity\Models\User;
use App\Shared\Audit\PivotAudit;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Files\ContentClass;
use App\Shared\Support\Rut;
use Carbon\CarbonImmutable;
use finfo;
use Illuminate\Http\UploadedFile;

/**
 * A primeira metade da carga: cliente, alunos, redatores com documentos e
 * habilitação, cursos com módulos. O orquestrador abre a transação em volta;
 * esta classe só grava e conta.
 *
 * Cada bloco contorna uma Action do fluxo vivo, e o motivo está ao lado dele
 * (spec §5.1, coluna "Contorna"). O que nenhum bloco contorna: a auditoria. Tudo
 * grava por Eloquent (`new Model` + `forceFill` + `save`), que aceita
 * `created_at`/`updated_at` explícitos e dispara o owen-it; o pivot grava só por
 * `PivotAudit`.
 *
 * Casar com o que já existe nunca altera nada: registro igual é contado como
 * existente, registro diferente vira conflito e fica FORA do mapa devolvido.
 */
final class CarregadorDeCadastros
{
    public function __construct(private readonly UploadFileAction $upload) {}

    /**
     * @param  array<string, mixed>  $carga  o `carga.json` já conferido pelo `ArquivoDeCarga`
     */
    public function carregar(array $carga, string $pasta, bool $gravarArquivos, Contagem $contagem): Cadastros
    {
        // Os documentos se conferem ANTES de qualquer gravação, nos dois modos:
        // o `--simular` tem de enxergar o PDF que a carga real recusaria.
        $recusados = $this->conferirDocumentos($carga['redatores'], $pasta, $contagem);

        $cliente = $this->cliente($carga['cliente'], $contagem);
        $alunos = $this->alunos($carga['alunos'], $cliente, $contagem);
        $redatores = $this->redatores($carga['redatores'], $pasta, $gravarArquivos, $recusados, $contagem);
        $cursos = $this->cursos($carga['cursos'], $contagem);
        $this->habilitar($carga['redatores'], $redatores, $cursos);

        return new Cadastros($cliente, $alunos, $cursos, $redatores);
    }

    /**
     * Contorna `CreateClientAction`: por baixo dela, `UserProvisioner::provision()`
     * carimba o usuário com o instante da execução e não aceita `created_at`
     * histórico, e a carga precisa datar o cliente na primeira `Fecha Curso` do
     * recorte. O cliente não loga (RN-01): `is_active=false` e senha aleatória.
     */
    private function cliente(array $dados, Contagem $contagem): ?Client
    {
        $rut = Rut::parse($dados['rut'])->format();
        $user = User::withTrashed()->where('rut', $rut)->first();

        if ($user !== null) {
            $client = $user->type === 'cliente' && ! $user->trashed()
                ? Client::where('user_id', $user->id)->first()
                : null;

            if ($client === null || $client->legal_name !== $dados['legal_name']) {
                $contagem->conflito(sprintf('cliente %s: o RUT já pertence a outro cadastro', $rut));

                return null;
            }

            $contagem->existente('clientes');

            return $client;
        }

        if ($this->emailEmUso($dados['email'])) {
            $contagem->conflito(sprintf('cliente %s: o e-mail %s já é de outro usuário', $rut, $dados['email']));

            return null;
        }

        $quando = Instante::meioDia($dados['desde']);
        $user = $this->usuario('cliente', $dados['name'], $rut, $dados['email'], null, false, $quando);

        $client = new Client;
        $client->forceFill([
            'user_id' => $user->id,
            'legal_name' => $dados['legal_name'],
            'type' => 'client',
            'business_activity' => $dados['business_activity'],
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
        $client->setRelation('user', $user);

        (new ClientAddress)->forceFill([
            ...$dados['endereco'],
            'client_id' => $client->id,
            'is_primary' => true,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();

        (new ClientContact)->forceFill([
            ...$dados['contato'],
            'client_id' => $client->id,
            'is_primary' => true,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();

        $contagem->criado('clientes');

        return $client;
    }

    /**
     * Contorna `StudentResolver` (exige e-mail real, D9) e
     * `StudentClientLinkService` (só grava com a data de hoje): o aluno nasce
     * com e-mail sintético, e o vínculo abre em `desde` com o aluno e o usuário
     * datados do mesmo dia. Aluno que já existe não ganha vínculo novo.
     *
     * Sem cliente (em conflito) não há a quem vincular: só os alunos que já
     * existem entram no mapa, e nenhum é criado — a carga já está recusada.
     *
     * @param  list<array<string, mixed>>  $alunos
     * @return array<string, Student>
     */
    private function alunos(array $alunos, ?Client $cliente, Contagem $contagem): array
    {
        $mapa = [];

        foreach ($alunos as $dados) {
            $rut = Rut::parse($dados['rut'])->format();
            $user = User::withTrashed()->where('rut', $rut)->first();

            if ($user !== null) {
                $student = $user->type === 'aluno' && ! $user->trashed() && $user->name === $dados['name']
                    ? Student::where('user_id', $user->id)->first()
                    : null;

                if ($student === null) {
                    $contagem->conflito(sprintf('aluno %s: o RUT já pertence a outro cadastro', $rut));

                    continue;
                }

                $contagem->existente('alunos');
                $mapa[$rut] = $student;

                continue;
            }

            if ($cliente === null) {
                continue;
            }

            if ($this->emailEmUso($dados['email'])) {
                $contagem->conflito(sprintf('aluno %s: o e-mail %s já é de outro usuário', $rut, $dados['email']));

                continue;
            }

            $quando = Instante::meioDia($dados['desde']);
            $user = $this->usuario('aluno', $dados['name'], $rut, $dados['email'], null, false, $quando);

            $student = new Student;
            $student->forceFill([
                'user_id' => $user->id,
                'current_client_id' => $cliente->id,
                'created_at' => $quando,
                'updated_at' => $quando,
            ])->save();
            $student->setRelation('user', $user);

            (new StudentClientLog)->forceFill([
                'student_id' => $student->id,
                'client_id' => $cliente->id,
                'started_on' => $dados['desde'],
                'ended_on' => null,
                'created_at' => $quando,
                'updated_at' => $quando,
            ])->save();

            $contagem->criado('alunos');
            $mapa[$rut] = $student;
        }

        return $mapa;
    }

    /**
     * Contorna `CreateRedatorAction`: ela dispara o convite de acesso, e a carga
     * não manda e-mail a ninguém. O resto ela repete: usuário ativo, role
     * `redator` (RF-ROL-05) e a linha em `redatores`. Sem data histórica, o
     * redator leva o instante da carga. A habilitação vem depois, com os cursos.
     *
     * O documento contorna as regras HTTP e o ClamAV (origem local confiável);
     * mime e tamanho se conferem em `conferirDocumentos`. Ele sobe por
     * `put`/`register` separados, como o `StoreRedatorDocumentAction` (P-49):
     * a carga está dentro de transação, e o path entra na contagem logo depois
     * do `put`, antes do insert em `files`, para o comando apagar do disco o
     * que subiu se qualquer passo seguinte falhar.
     *
     * @param  list<array<string, mixed>>  $redatores
     * @param  array<string, true>  $recusados  `<chave>|<tipo>` dos documentos que não passaram
     * @return array<string, Redator>
     */
    private function redatores(array $redatores, string $pasta, bool $gravarArquivos, array $recusados, Contagem $contagem): array
    {
        $mapa = [];

        foreach ($redatores as $dados) {
            $rut = Rut::parse($dados['rut'])->format();
            $user = User::withTrashed()->where('rut', $rut)->first();

            if ($user !== null) {
                $redator = $user->type === 'redator' && ! $user->trashed() && $user->email === $dados['email']
                    ? Redator::where('user_id', $user->id)->first()
                    : null;

                if ($redator === null) {
                    $contagem->conflito(sprintf('redator %s: o RUT já pertence a outro cadastro', $dados['chave']));

                    continue;
                }

                $contagem->existente('redatores');
            } else {
                if ($this->emailEmUso($dados['email'])) {
                    $contagem->conflito(sprintf('redator %s: o e-mail %s já é de outro usuário', $dados['chave'], $dados['email']));

                    continue;
                }

                $user = $this->usuario('redator', $dados['name'], $rut, $dados['email'], $dados['phone'], true);
                $user->syncRoles(['redator']);

                $redator = $user->redator()->create([]);
                $contagem->criado('redatores');
            }

            $redator->setRelation('user', $user);
            $mapa[$dados['chave']] = $redator;

            foreach ($dados['documentos'] as $documento) {
                $this->documento($redator, $dados['chave'], $documento, $pasta, $gravarArquivos, $recusados, $contagem);
            }
        }

        return $mapa;
    }

    /**
     * @param  array<string, mixed>  $documento
     * @param  array<string, true>  $recusados
     */
    private function documento(Redator $redator, string $chave, array $documento, string $pasta, bool $gravarArquivos, array $recusados, Contagem $contagem): void
    {
        if (isset($recusados[$chave.'|'.$documento['type']])) {
            return;
        }

        if ($redator->documents()->where('type', $documento['type'])->exists()) {
            $contagem->existente('documentos');

            return;
        }

        if ($gravarArquivos) {
            $arquivo = new UploadedFile($pasta.'/'.$documento['arquivo'], $documento['original_name'], null, null, true);
            $validade = $documento['valid_until'] === null ? null : CarbonImmutable::parse($documento['valid_until']);

            $meta = $this->upload->metadataOf($arquivo);
            $path = $this->upload->put($redator, $arquivo);
            $contagem->arquivoGravado($path);
            $this->upload->register($redator, $path, $meta, $documento['type'], $validade);
        }

        $contagem->criado('documentos');
    }

    /**
     * Confere cada PDF contra as regras de `ContentClass::Documento` (mime lido
     * dos bytes, teto de tamanho). Devolve os `<chave>|<tipo>` que não passaram.
     *
     * @param  list<array<string, mixed>>  $redatores
     * @return array<string, true>
     */
    private function conferirDocumentos(array $redatores, string $pasta, Contagem $contagem): array
    {
        $recusados = [];
        $classe = ContentClass::Documento;
        $finfo = new finfo(FILEINFO_MIME_TYPE);

        foreach ($redatores as $dados) {
            foreach ($dados['documentos'] as $documento) {
                $caminho = $pasta.'/'.$documento['arquivo'];
                $motivo = null;

                if (! is_file($caminho)) {
                    $motivo = 'o arquivo não existe';
                } elseif (! in_array($finfo->file($caminho), $classe->mimes(), true)) {
                    $motivo = 'o tipo do arquivo não é aceito';
                } elseif (filesize($caminho) > $classe->tetoEmKb() * 1024) {
                    $motivo = 'o arquivo passa do tamanho máximo';
                }

                if ($motivo !== null) {
                    $recusados[$dados['chave'].'|'.$documento['type']] = true;
                    $contagem->conflito(sprintf('documento %s (%s): %s', $documento['arquivo'], $documento['type'], $motivo));
                }
            }
        }

        return $recusados;
    }

    /**
     * Sem Action do fluxo vivo para contornar: o curso entra pelo catálogo, sem
     * template de certificado. Casa pelo `name`: as mesmas horas é o mesmo
     * curso (os módulos não se tocam); horas diferentes ou curso arquivado é
     * conflito, porque a carga nunca sobrescreve.
     *
     * @param  list<array<string, mixed>>  $cursos
     * @return array<string, Course>
     */
    private function cursos(array $cursos, Contagem $contagem): array
    {
        $mapa = [];

        foreach ($cursos as $dados) {
            $course = Course::withTrashed()->where('name', $dados['name'])->first();

            if ($course !== null) {
                if ($course->trashed() || (int) $course->workload_hours !== $dados['workload_hours']) {
                    $contagem->conflito(sprintf('curso %s: já existe com outras horas ou arquivado', $dados['name']));

                    continue;
                }

                $contagem->existente('cursos');
                $mapa[$dados['chave']] = $course;

                continue;
            }

            $course = new Course;
            $course->forceFill([
                'name' => $dados['name'],
                'technical_name' => $dados['technical_name'],
                'description' => $dados['description'],
                'workload_hours' => $dados['workload_hours'],
            ])->save();
            $contagem->criado('cursos');

            foreach ($dados['modulos'] as $ordem => $modulo) {
                $module = new CourseModule;
                $module->forceFill([
                    ...$modulo,
                    'course_id' => $course->id,
                    'sort_order' => $ordem + 1,
                ])->save();
                $contagem->criado('modulos');
            }

            $mapa[$dados['chave']] = $course;
        }

        return $mapa;
    }

    /**
     * Contorna `CourseRedatorController`: a habilitação é o pivot gravado por
     * `PivotAudit` (a trilha de quem pode ser designado), só com os cursos que
     * não estão em conflito. Acrescenta, nunca retira. Habilita só o redator
     * CRIADO nesta carga: o que já existia não se toca (spec §7), e a escrita
     * auditada do pivot não aparece na `Contagem`.
     *
     * @param  list<array<string, mixed>>  $redatores
     * @param  array<string, Redator>  $mapaRedatores
     * @param  array<string, Course>  $mapaCursos
     */
    private function habilitar(array $redatores, array $mapaRedatores, array $mapaCursos): void
    {
        foreach ($redatores as $dados) {
            $redator = $mapaRedatores[$dados['chave']] ?? null;

            if ($redator === null || ! $redator->wasRecentlyCreated) {
                continue;
            }

            $ids = [];
            foreach ($dados['cursos'] as $chave) {
                if (isset($mapaCursos[$chave])) {
                    $ids[] = $mapaCursos[$chave]->id;
                }
            }

            PivotAudit::syncWithoutDetaching($redator, 'courses', $ids);
        }
    }

    private function emailEmUso(string $email): bool
    {
        return User::withTrashed()->where('email', $email)->exists();
    }

    /**
     * Replica de propósito a unicidade (RUT e e-mail conferidos por quem chama,
     * incluindo apagados) e o `is_active` do `UserProvisioner`, porque o
     * provisioner (`provision()` e `create()`) carimba o instante da execução e
     * não aceita `created_at` histórico. Não o "unifique" com ele sem resolver
     * a data.
     *
     * `$quando` nulo deixa o Eloquent carimbar o instante da carga. A senha é
     * aleatória e descartada: ninguém importado loga, e o redator define a dele
     * pelo fluxo normal de acesso.
     */
    private function usuario(string $type, string $name, string $rut, string $email, ?string $phone, bool $ativo, ?CarbonImmutable $quando = null): User
    {
        $user = new User;
        $user->forceFill([
            'name' => $name,
            'rut' => $rut,
            'email' => $email,
            'phone' => $phone,
            'password' => bin2hex(random_bytes(16)),
            'type' => $type,
            'is_active' => $ativo,
            ...($quando === null ? [] : ['created_at' => $quando, 'updated_at' => $quando]),
        ])->save();

        return $user;
    }
}
