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
        // uuid é setado à mão porque WithoutModelEvents desliga o hook
        // static::creating() do model, que normalmente o gera.
        User::factory()->create([
            'uuid'      => (string) Str::uuid(),
            'name'      => 'Admin Lotus',
            'email'     => 'admin@lotus.cl',
            'password'  => Hash::make('senha123'),
            'type'      => 'admin',
            'is_active' => true,
        ]);
    }
}
