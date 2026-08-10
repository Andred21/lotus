<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Models\Turma;

/**
 * Fonte única da RN-16: "documentação completa habilita". Habilitada NÃO é
 * estado persistido (spec 6d, D3) — deriva de haver ≥1 doc ativo de CADA tipo
 * numa turma em andamento.
 *
 * UMA pergunta, UMA resposta: `for()` devolve o `HabilitacaoStatus` inteiro. Os
 * dois métodos públicos anteriores eram lidos em sequência pelo `TurmaData` e
 * abriam uma query cada — 2 por turma na listagem.
 *
 * Lê `documentacaoObrigatoria` como RELAÇÃO: carregada (listagem, `present()`),
 * custa zero; não carregada (`ConcludeTurmaAction`, que recebe o model do
 * route-binding), o Eloquent busca — que é a leitura fresca que o gate de
 * conclusão precisa ter dentro da transação.
 */
class TurmaHabilitacaoService
{
    public function for(Turma $turma): HabilitacaoStatus
    {
        $all = array_column(TurmaDocumentType::cases(), 'value');
        $present = $turma->documentacaoObrigatoria->pluck('type')->unique()->all();

        return new HabilitacaoStatus($turma->status, array_values(array_diff($all, $present)));
    }
}
