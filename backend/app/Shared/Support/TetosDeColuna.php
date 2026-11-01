<?php

namespace App\Shared\Support;

/**
 * Tamanho das colunas de contato de `users` (migration `create_users_table`). Acima
 * disso o MySQL estoura como 500 e, numa importação, derruba o lote inteiro; por
 * isso as portas que gravam e-mail ou telefone recusam na ENTRADA com estes
 * números: `StudentResolver` (importação e matrícula), `StudentData`,
 * `EnrollmentData`, `RedatorData`, `UserData`, `ClientData` e `ProfileUpdateData` (só telefone,
 * porque o perfil não troca e-mail). O front repete os dois no editor da triagem
 * (`ImportRowEditor`), que não lê PHP.
 */
final class TetosDeColuna
{
    public const EMAIL = 255;

    public const TELEFONE = 30;
}
