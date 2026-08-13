<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conclusão da turma (RN-16: doc habilita, admin confirma). TERMINAL (D5):
 * não existe caminho de reversão — erro raro se corrige via suporte, com
 * auditoria. Habilita a emissão de certificados (RN-08, Sprint 4).
 */
class ConcludeTurmaAction
{
    public function __construct(private TurmaHabilitacaoService $habilitacao) {}

    public function execute(Turma $turma): Turma
    {
        return DB::transaction(function () use ($turma) {
            $turma->assertAcademicallyWritable();

            // Leitura fresca DENTRO da transação, e declarada aqui: o `for()`
            // lê a relação como propriedade, então um model que já chegou
            // carregado (é o que `loadListingData()` faz) decidiria sobre o
            // cache — e um documento arquivado depois daquela carga concluiria
            // a turma, em escrita terminal, sem a documentação da RN-16.
            $turma->load('documentacaoObrigatoria');

            $missing = $this->habilitacao->for($turma)->missingTypes();
            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'documents' => 'Documentación obligatoria incompleta (RN-16). Falta: '.implode(', ', $missing).'.',
                ]);
            }

            $turma->status = TurmaStatus::Concluida;
            $turma->concluded_at = now();
            $turma->save();

            return $turma;
        });
    }
}
