<?php

namespace App\Domains\Operation\Enums;

/**
 * Requisitos de configuração da turma para concluir, além dos documentos da
 * RN-16: quem ensina (`redator`) e onde (`local_aplicacao`, só na presencial).
 * A ordem dos casos é a ordem em que a mensagem os lista.
 */
enum TurmaRequirement: string
{
    case Redator = 'redator';
    case LocalAplicacao = 'local_aplicacao';
}
