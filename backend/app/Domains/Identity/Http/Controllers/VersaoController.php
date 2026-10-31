<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\VersaoData;
use App\Http\Controllers\Controller;

/** Versão em execução. Rota dentro do grupo `auth.active`: nunca anônima. */
class VersaoController extends Controller
{
    public function __invoke(): VersaoData
    {
        return VersaoData::fromConfig();
    }
}
