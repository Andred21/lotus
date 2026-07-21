<?php

namespace App\Domains\Identity\Models;

use App\Domains\Commercial\Models\Client;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Histórico de vínculo aluno↔cliente (RN-10). Append-only: fechar um vínculo é
 * setar ended_on, nunca deletar — por isso NÃO usa SoftDeletes nem é Auditable
 * (o próprio log é o registro histórico). open_link_student_id é coluna gerada
 * pelo banco (não é fillable) que garante 1 vínculo aberto por aluno.
 */
class StudentClientLog extends Model
{
    protected $fillable = ['student_id', 'client_id', 'started_on', 'ended_on'];

    protected $casts = [
        'started_on' => 'date',
        'ended_on' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
