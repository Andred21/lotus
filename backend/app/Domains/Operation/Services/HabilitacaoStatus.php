<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaStatus;

/**
 * Resposta única da RN-16 sobre uma turma: quais tipos obrigatórios faltam e,
 * a partir disso, se ela está habilitada.
 *
 * O status entra no VO de propósito (D-B1): "habilitada" nunca foi só
 * documentação — turma concluída não é habilitada, ainda que tenha os três
 * documentos (e ela sempre tem, porque concluir exige documentação completa).
 * Deixar o gate de status fora daqui devolveria a regra a dois donos, que é
 * exatamente o que este bloco existe para desfazer.
 */
final class HabilitacaoStatus
{
    /** @param  array<string>  $missingTypes  valores de TurmaDocumentType sem doc ativo. */
    public function __construct(
        private readonly TurmaStatus $status,
        private readonly array $missingTypes,
    ) {}

    public function isHabilitada(): bool
    {
        return $this->status === TurmaStatus::EmAndamento && $this->missingTypes === [];
    }

    /** @return array<string> */
    public function missingTypes(): array
    {
        return $this->missingTypes;
    }
}
