<?php

namespace App\Domains\Operation\Enums;

/**
 * Motivo pelo qual um redator não é idôneo para o curso da turma (RN-09). O
 * valor é o de fio: vai para a tela e para o audit da designação
 * (`new_values.inidoneidade`). A ordem dos cases é a ordem em que os motivos
 * saem do `RedatorIdoneidadeService::motivos()`.
 */
enum MotivoInidoneidade: string
{
    case NaoHabilitado = 'not_qualified';
    case ReufInvalido = 'reuf_invalid';
}
