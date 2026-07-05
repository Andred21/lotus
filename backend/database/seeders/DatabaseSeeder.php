<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Roles e permissões primeiro (o admin abaixo recebe uma role).
        $this->call(RolePermissionSeeder::class);

        // Idempotente: não duplica o admin em re-runs. uuid é setado à mão porque
        // WithoutModelEvents desliga o hook static::creating() que normalmente o gera.
        $admin = User::firstOrCreate(
            ['email' => 'admin@lotus.cl'],
            [
                'uuid'      => (string) Str::uuid(),
                'name'      => 'Admin Lotus',
                'password'  => Hash::make('senha123'),
                'type'      => 'admin',
                'is_active' => true,
            ],
        );

        // Conta de owner em dev: superadmin (acesso total). Ajuste para 'admin'
        // se quiser exercitar as restrições das ações segregadas.
        $admin->syncRoles(['superadmin']);
    }
}
