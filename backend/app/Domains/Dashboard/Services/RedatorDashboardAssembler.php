<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\RedatorDashboardData;
use App\Domains\Identity\Models\Redator;

/**
 * Monta o payload do redator (spec §4.2/D5).
 *
 * Sem gate por seção, de propósito: o corte aqui é de ESCOPO, não de
 * permissão. Todo redator vê as mesmas cinco seções — a diferença entre um
 * redator e outro é o conjunto de turmas, e esse recorte já mora inteiro no
 * `RedatorScopeQuery`, antes de qualquer agregação. Duplicar o escopo aqui
 * criaria uma segunda porta por onde vazar.
 *
 * O tipo termina de fechar: `RedatorDashboardData` não tem `series`,
 * `rankings`, `pendencias` nem `pipeline`, e sua agenda usa
 * `RedatorAgendaTurmaData`, que não carrega `client_name`. Nome de cliente e
 * UF não são omitidos por escolha deste método — não cabem no DTO.
 */
class RedatorDashboardAssembler
{
    public function __construct(private readonly RedatorScopeQuery $scope) {}

    public function assemble(Redator $redator): RedatorDashboardData
    {
        return new RedatorDashboardData(
            view: 'redator',
            resumo: $this->scope->resumo($redator),
            agenda: $this->scope->agenda($redator),
            pendencias_documentais: $this->scope->pendenciasDocumentais($redator),
            alertas_documentos: $this->scope->alertasDocumentos($redator),
            historico: $this->scope->historico($redator),
        );
    }
}
