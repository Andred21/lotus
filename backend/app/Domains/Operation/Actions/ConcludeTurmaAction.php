<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaRequirement;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conclusão da turma (RN-16: documentação e configuração completas habilitam, admin confirma). TERMINAL (D5):
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
            // O mesmo vale para os redatores (requisito de configuração).
            $turma->load(['documentacaoObrigatoria', 'redatores']);

            $habilitacao = $this->habilitacao->for($turma);
            $messages = [];

            if ($habilitacao->missingTypes() !== []) {
                $messages['documents'] = __('operation.turma.documents_incomplete', [
                    'tipos' => implode(', ', array_map(
                        fn (TurmaDocumentType $doc): string => __('operation.document_type.'.$doc->value),
                        $habilitacao->missingTypes(),
                    )),
                ]);
            }

            if ($habilitacao->missingRequirements() !== []) {
                $messages['requirements'] = __('operation.turma.requirements_incomplete', [
                    'itens' => implode(', ', array_map(
                        fn (TurmaRequirement $req): string => __('operation.requirement.'.$req->value),
                        $habilitacao->missingRequirements(),
                    )),
                ]);
            }

            if ($messages !== []) {
                throw ValidationException::withMessages($messages);
            }

            $turma->status = TurmaStatus::Concluida;
            $turma->concluded_at = now();
            $turma->save();

            return $turma;
        });
    }
}
