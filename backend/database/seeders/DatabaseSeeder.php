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
        // Roles e permissões primeiro (o admin abaixo recebe uma role). Este é o
        // ÚNICO seeder que produção precisa, e ele roda em qualquer ambiente:
        // um banco novo sem as roles do ADR-07 deixa o RBAC sem chão.
        $this->call(RolePermissionSeeder::class);

        // Gate de ambiente, pelo mesmo padrão do OperationDemoSeeder: o admin
        // abaixo tem senha conhecida e vem com a role `superadmin`. A imagem de
        // produção carrega os seeders (o RolePermissionSeeder é necessário lá),
        // então um `db:seed --force` num servidor novo alcançaria esta linha —
        // e criaria uma conta de acesso total com credencial pública num sistema
        // que emite documento com peso legal. Fora de local/demo, só as roles.
        if (! app()->environment(['local', 'demo'])) {
            $this->command?->warn('Admin de desenvolvimento ignorado: só é criado em local/demo. Roles e permissões foram instaladas.');

            return;
        }

        // Idempotente: não duplica o admin em re-runs. uuid é setado à mão porque
        // WithoutModelEvents desliga o hook static::creating() que normalmente o gera.
        $admin = User::firstOrCreate(
            ['email' => 'admin@lotus.cl'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Admin Lotus',
                'password' => Hash::make('senha123'),
                'type' => 'admin',
                'is_active' => true,
            ],
        );

        // Conta de owner em dev: superadmin (acesso total). Ajuste para 'admin'
        // se quiser exercitar as restrições das ações segregadas.
        $admin->syncRoles(['superadmin']);

        // Cenário operacional de demonstração (spec bloco 6-frontend §7). O
        // próprio seeder tem o gate de ambiente — nunca roda fora de local/demo.
        $this->call(OperationDemoSeeder::class);
    }
}
