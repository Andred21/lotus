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
 * Lê `documentacaoObrigatoria` como PROPRIEDADE: carregada (listagem,
 * `present()`), custa zero; não carregada, o Eloquent busca. A consequência é
 * que a resposta herda o cache da relação — quem precisa de leitura fresca
 * declara a carga antes de perguntar, e é o que o `ConcludeTurmaAction` faz
 * dentro da transação (o gate da RN-16 não pode decidir sobre estado velho).
 */
class TurmaHabilitacaoService
{
    public function for(Turma $turma): HabilitacaoStatus
    {
        $present = $turma->documentacaoObrigatoria->pluck('type')->unique()->all();

        // Filtrar `cases()` e não `array_diff` sobre `values()`: a diferença é o
        // TIPO do que sai — o VO carrega o enum (D-57), e a coluna `type` da
        // `files` continua sendo string livre, que é contra o que se compara.
        $missing = array_values(array_filter(
            TurmaDocumentType::cases(),
            fn (TurmaDocumentType $case): bool => ! in_array($case->value, $present, true),
        ));

        return new HabilitacaoStatus($turma->status, $missing);
    }
}
