<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaRequirement;
use App\Domains\Operation\Enums\TurmaStatus;

/**
 * Resposta única da RN-16 sobre uma turma: quais tipos bloqueantes e quais
 * requisitos de configuração (redator, local da presencial) faltam e, a partir
 * disso, se ela está habilitada.
 *
 * O status entra no VO de propósito (D-B1): "habilitada" nunca foi só
 * documentação — turma concluída não é habilitada, tenha ou não os tipos
 * bloqueantes. Concluir pela Action os exige, mas turma concluída pode estar
 * sem eles: a carga de histórico já a cria concluída, e quem tem
 * `manage_concluded_docs` remove documento dela. `missingTypes()` não é vazio
 * por garantia só porque a turma concluiu.
 *
 * Os tipos opcionais ficam de fora do `isHabilitada()`: faltar uma evaluación
 * do cliente ou dos alunos é informação (o dashboard cobra), não bloqueio.
 * Deixar o gate de status fora daqui devolveria a regra a dois donos, que é
 * exatamente o que este bloco existe para desfazer.
 */
final class HabilitacaoStatus
{
    /**
     * @param  array<TurmaDocumentType>  $missingTypes  tipos bloqueantes sem doc ativo.
     * @param  array<TurmaRequirement>  $missingRequirements  configuração que falta na turma.
     * @param  array<TurmaDocumentType>  $missingOptionalTypes  tipos opcionais sem doc ativo.
     */
    public function __construct(
        private readonly TurmaStatus $status,
        private readonly array $missingTypes,
        private readonly array $missingRequirements,
        private readonly array $missingOptionalTypes,
    ) {}

    public function isHabilitada(): bool
    {
        return $this->status === TurmaStatus::EmAndamento
            && $this->missingTypes === []
            && $this->missingRequirements === [];
    }

    /** @return array<TurmaDocumentType> só os bloqueantes. */
    public function missingTypes(): array
    {
        return $this->missingTypes;
    }

    /** @return array<TurmaDocumentType> só os opcionais; não entram em `isHabilitada()`. */
    public function missingOptionalTypes(): array
    {
        return $this->missingOptionalTypes;
    }

    /** @return array<TurmaRequirement> */
    public function missingRequirements(): array
    {
        return $this->missingRequirements;
    }
}
