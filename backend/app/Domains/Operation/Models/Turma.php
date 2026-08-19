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
use App\Shared\Data\ContratanteData;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Query\Builder as QueryBuilder;
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
    use AuditableTrait, SoftDeletes;

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
                'turma' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
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

    /** @param  QueryBuilder  $query */
    public function newEloquentBuilder($query): TurmaQueryBuilder
    {
        return new TurmaQueryBuilder($query);
    }
}
