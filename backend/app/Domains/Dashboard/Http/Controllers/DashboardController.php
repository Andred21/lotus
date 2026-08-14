<?php

namespace App\Domains\Dashboard\Http\Controllers;

use App\Domains\Dashboard\Data\AdminDashboardData;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Dashboard\Data\RedatorDashboardData;
use App\Domains\Dashboard\Services\AdminDashboardAssembler;
use App\Domains\Dashboard\Services\RedatorDashboardAssembler;
use App\Domains\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * Endpoint único do dashboard (`GET /api/dashboard/metricas`).
 *
 * Uma rota, dois payloads: o papel do usuário autenticado escolhe o assembler,
 * e `view` discrimina o union no TS (D5). Não há parâmetro de papel — pedir o
 * dashboard "de outro" não é uma requisição possível de formular.
 *
 * Sem `permission:` no middleware: o gate do dashboard é por SEÇÃO, não pela
 * rota (D7). Barrar a rota inteira por uma permissão faria o usuário com acesso
 * parcial perder também as seções que ele pode ver.
 */
class DashboardController extends Controller
{
    public function metricas(
        Request $request,
        DashboardFilterData $filter,
        AdminDashboardAssembler $admin,
        RedatorDashboardAssembler $redator,
    ): AdminDashboardData|RedatorDashboardData {
        /** @var User $user */
        $user = $request->user();

        if ($user->type !== 'redator') {
            return $admin->assemble($user, $filter);
        }

        // Só admin e redator autenticam (RN-01), e todo user `redator` tem
        // linha em `redatores`. Ausência aqui é banco inconsistente, não
        // requisição inválida: sobe 500, porque devolver 403/404 disfarçaria
        // um defeito de dado como decisão de permissão.
        $perfil = $user->redator;

        if ($perfil === null) {
            throw new RuntimeException("Usuário {$user->id} é do tipo redator e não tem perfil de redator.");
        }

        return $redator->assemble($perfil);
    }
}
