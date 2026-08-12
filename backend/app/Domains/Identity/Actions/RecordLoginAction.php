<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;

/**
 * Grava uma linha de `login_logs` por login BEM-SUCEDIDO.
 *
 * **Sem `DB::transaction`, e é exceção declarada à regra de Action da
 * `backend-ddd.md`:** é um insert só, não há duas escritas a atomizar.
 * Precedente de exceção escrita e justificada no código:
 * `BatchIssueCertificatesAction`.
 *
 * Recebe IP e user-agent como DADO, não a `Request`: a fronteira da Action é
 * domínio, não transporte — igual às 10 irmãs do domínio.
 *
 * Quem chama é responsável por chamar DEPOIS do gate de `is_active` do
 * `AuthController`. Ver `LoginLogTest::test_usuario_inativo_nao_grava_login`.
 */
class RecordLoginAction
{
    public function execute(User $user, ?string $ipAddress, ?string $userAgent): void
    {
        $user->loginLogs()->create([
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }
}
