<?php

namespace App\Domains\Operation\Models;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\QueryBuilders\TurmaQueryBuilder;
use App\Shared\Concerns\ArchivesChildren;
use App\Shared\Data\ContratanteData;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Turma = instância operacional de um curso, nascida de uma cotação aprovada
 * (1:1). Um ou mais redatores via pivot `turma_redator` (N:N). `files()` para o
 * manual futuro (morph key `turma`, já registrada no morph map).
 */
class Turma extends Model implements Auditable
{
    use ArchivesChildren, AuditableTrait, SoftDeletes;

    protected $fillable = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status',
    ];

    protected $auditInclude = [
        'quote_id', 'course_id', 'modalidade', 'local_aplicacao',
        'start_date', 'end_date', 'status', 'concluded_at',
    ];

    /**
     * O default da coluna repetido em memória, e não por gosto de simetria: o
     * `turmas.status` nasce `em_andamento` no banco, mas `Turma::create([...])`
     * sem a chave devolve a instância com `status` NULO — o default é do INSERT,
     * não do objeto. Enquanto o gate da RN-15 perguntava `=== Concluida`, esse
     * nulo passava batido; com a forma fail-closed ele recusaria escrita numa
     * turma recém-criada. O buraco é anterior à mudança de forma, e ela é que o
     * revelou (review de 2026-08-12, Q-6).
     */
    protected $attributes = [
        'status' => 'em_andamento',
    ];

    protected $casts = [
        'modalidade' => TurmaModalidade::class,
        'status' => TurmaStatus::class,
        'start_date' => 'date',
        'end_date' => 'date',
        'concluded_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Turma $turma) {
            if (! $turma->isForceDeleting()) {
                // Instância a instância: soft-delete pelo builder não audita.
                //
                // ENUMERA-E-APAGA, logo check-then-act: a transação da
                // `DeleteTurmaAction` é que dá atomicidade a esta cascata.
                // Não arquive turma por fora dela. O `lockRow` que ela toma
                // serializa arquivar contra arquivar, mas os escritores de
                // filho ainda não tomam o mesmo lock — a janela contra eles
                // segue aberta (pendência P-47).
                //
                // O pivot `turma_redator` fica FORA: não tem `deleted_at`, e
                // designação não é registro com ciclo de vida próprio — desfazê-la
                // faria o `auditSync` registrar uma remoção que ninguém pediu
                // (spec D2).
                $turma->enrollments()->get()->each(fn (Enrollment $e) => self::markAndDelete($e));
                $turma->files()->get()->each(fn (File $f) => self::markAndDelete($f));
            }
        });

        static::restored(function (Turma $turma) {
            // `restored`, não `restoring`: os filhos saem ANTES do pai e voltam
            // DEPOIS dele. `onlyTrashed()` + a marca fazem voltar só quem ESTA
            // cascata arquivou (spec D2).
            $turma->enrollments()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (Enrollment $e) => self::restoreAndUnmark($e));
            $turma->files()->onlyTrashed()->where('archived_with_parent', true)->get()
                ->each(fn (File $f) => self::restoreAndUnmark($f));
        });
    }

    public function quote(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Quote::class)->withTrashed();
    }

    public function course(): BelongsTo
    {
        // Arquivamento não apaga: a projeção de leitura precisa do registro
        // mesmo soft-deletado (ver .claude/rules/backend-ddd.md).
        return $this->belongsTo(Course::class)->withTrashed();
    }

    /**
     * Arquivamento não apaga, e AQUI isso tem peso legal. O pivot `turma_redator`
     * não tem `deleted_at`: sem o `withTrashed()`, arquivar um redator deixa a
     * linha do pivot viva e o redator DESAPARECE da turma — a listagem passa a
     * exibir turma sem redator (`TurmaQueryBuilder::LISTING`), o painel a trata
     * como sem redator (`EmissionPanelQuery`) e `CertificateEligibility` RECUSA a
     * emissão do certificado de uma turma já concluída (spec D3).
     *
     * O gate da `ArchiveRedatorAction` cobre turma em andamento; este
     * `withTrashed` cobre a concluída, que é onde a emissão acontece. Os dois são
     * necessários — nenhum resolve o caso do outro.
     *
     * E este `withTrashed` sozinho NÃO salva a emissão: `CertificateController::store`
     * e `BatchIssueCertificatesAction` resolvem o redator por `findOrFail`, e sem o
     * `Redator::withTrashed()` de lá o 404 vem ANTES de a porta 6 rodar. São três
     * peças, não duas — não reverta nenhuma achando que a outra cobre.
     *
     * `withTrashed()` não é método de `BelongsToMany`: é a macro que o
     * `SoftDeletingScope` instala no Builder, e `Relation::__call` a encaminha e
     * devolve a própria relação. Por isso encadeia.
     */
    public function redatores(): BelongsToMany
    {
        return $this->belongsToMany(Redator::class, 'turma_redator')->withTimestamps()->withTrashed();
    }

    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    /**
     * Os documentos que a RN-16 exige — `files()` restrita aos tipos do
     * `TurmaDocumentType`. Relação NOMEADA e não `whereIn` solto por dois
     * motivos: a pergunta tinha duas cópias (o service da habilitação e a
     * listagem de documentos), e `with()`/`LISTING` só aceitam nome de relação
     * — é o que deixa a documentação obrigatória entrar no eager-load da
     * listagem e matar o N+1. Soft-delete fica de fora pelo default do
     * `morphMany`: doc arquivada não conta (RN-16).
     */
    public function documentacaoObrigatoria(): MorphMany
    {
        return $this->files()->whereIn('type', TurmaDocumentType::values());
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** A travessia da cadeia comercial mora AQUI (e a catraca garante). */
    public function contratanteClient(): Client
    {
        return $this->quote->budget->client;
    }

    public function contratante(): ContratanteData
    {
        return $this->contratanteClient()->contratante();
    }

    /**
     * RN-15 — blindagem: turma concluída não aceita mais escrita. ONZE caminhos
     * chamam isto, e é a única mensagem: edição e arquivamento da própria turma,
     * designação e remoção de redator, documentos do 6d (store e delete),
     * matrícula individual, import, remoção de matrícula, resultado de
     * matrícula e a própria conclusão (que assim recusa concluir duas vezes).
     *
     * As quatro grafias inline que testavam `status !== EmAndamento` à mão, com
     * quatro mensagens diferentes — três em PT-BR num app es-CL —, morreram no
     * bloco `rastro-unicidade-e-gates`. O que mudou foi haver uma resposta só.
     *
     * A pergunta é `!== EmAndamento`, e não `=== Concluida`, porque a segunda
     * forma é fail-OPEN: com dois casos no enum as duas são idênticas hoje, mas
     * um terceiro status ('cancelada', 'suspensa') abriria os onze caminhos em
     * silêncio, sem nenhum teste virar vermelho. Escrita acadêmica só é
     * liberada no estado que a RN-15 libera — os demais recusam por default.
     * Apontado no review de 2026-08-12 (Q-6).
     *
     * A mensagem é imutável: dois testes a afirmam literalmente
     * (`EnrollmentResultTest`, `IssueCertificateTest`).
     */
    public function assertAcademicallyWritable(): void
    {
        if ($this->status !== TurmaStatus::EmAndamento) {
            throw ValidationException::withMessages([
                'turma' => __('operation.turma.concluded_locked'),
            ]);
        }
    }

    /**
     * Contraparte de instância do `withListingData()` — o mesmo molde de
     * `Client`, `Quote`, `Course` e `Enrollment`. É daqui que o `present()` do
     * controller carrega, e por isso as Actions não pré-carregam nada: a carga
     * da projeção tem um dono só.
     */
    public function loadListingData(): static
    {
        return $this->load(TurmaQueryBuilder::LISTING)->loadCount('enrollments');
    }

    /**
     * Trava a linha SEM julgar estado. `withTrashed()` porque o lock tem de ser
     * tomado mesmo sobre turma arquivada — é o estado de quem vai ser
     * restaurado, e pular a linha faria a operação seguir SEM mutex nenhum.
     *
     * No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve `''`).
     * Molde: `Client::lockRow()`.
     */
    public static function lockRow(int $turmaId): static
    {
        /** @var static $turma */
        $turma = static::withTrashed()->whereKey($turmaId)->lockForUpdate()->firstOrFail();

        return $turma;
    }

    /**
     * Trava a linha E RECUSA turma arquivada. É o que o escritor de filho toma;
     * `lockRow()` cru fica para quem arquiva ou restaura.
     *
     * A diferença é a P-49 inteira: `lockRow` sozinho SERIALIZA (o escritor
     * espera o arquivador commitar) e depois deixa o filho pousar sob a turma
     * recém-arquivada. Quem recusa é este `trashed()`.
     *
     * NÃO substitui `assertAcademicallyWritable()`: aquele pergunta pelo
     * `status` (RN-15), este pelo `deleted_at`. Turma arquivada mantém
     * `status = em_andamento`, então nenhum dos dois cobre o outro.
     *
     * Molde: `Client::lockForWrite()`.
     */
    public static function lockForWrite(int $turmaId): static
    {
        $turma = static::lockRow($turmaId);

        if ($turma->trashed()) {
            throw ValidationException::withMessages([
                'turma' => __('operation.turma.archived'),
            ]);
        }

        return $turma;
    }

    /**
     * O ownership da spec D1 alcança a superfície inteira por AQUI, e não rota
     * a rota: `{turma}` aparece em 20 rotas de `Operation/routes.php`, nenhuma
     * precisa lembrar de filtrar, e rota nova nasce coberta.
     *
     * Devolve `null` (e não `firstOrFail`) porque é o contrato do
     * `SubstituteBindings`: com `null` ele lança `NotFoundHttpException`, que o
     * `ProblemDetails` traduz em 404 RFC 7807. Turma alheia é indistinguível de
     * turma inexistente de propósito — 403 confirmaria que ela existe (D3).
     *
     * `Auth::user()` já está populado: `Authenticate` implementa
     * `AuthenticatesRequests` e o `$middlewarePriority` do framework o coloca
     * ANTES do `SubstituteBindings`. Rota sem auth cai no `null` e o escopo não
     * se aplica — não existe nenhuma hoje com `{turma}`, e se nascer uma, ela
     * nasce pública por escrita explícita e não por acidente deste método.
     *
     * As rotas aninhadas seguem intactas: `scopeBindings()` resolve o FILHO
     * dentro do `{turma}` já escopado, e as duas com `withoutScopedBindings()`
     * (`designateRedator`, `removeRedator`) isentam o `{redator}`, não o
     * `{turma}`.
     */
    public function resolveRouteBinding($value, $field = null): ?static
    {
        $user = Auth::user();

        return $this->newQuery()
            ->when($user !== null, fn (TurmaQueryBuilder $q) => $q->visibleTo($user))
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->first();
    }

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): TurmaQueryBuilder
    {
        return new TurmaQueryBuilder($query);
    }
}
