<?php

namespace Database\Seeders;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Fotos de demonstração para a revisão visual da célula de identidade.
 *
 * NÃO é encadeado no DatabaseSeeder: a suíte roda em sqlite :memory: sem MinIO
 * e sem rede. Roda só por `db:seed --class=DemoPhotosSeeder`.
 *
 * Fonte: randomuser.me, cujos retratos são de pessoas reais e licenciados pelo
 * serviço para uso como placeholder. Não se raspa rosto avulso da web — aqui o
 * cadastro de aluno vira certificado com peso legal, e foto de pessoa real
 * identificável em cadastro fictício é problema de privacidade. As URLs são
 * determinísticas, então o seed não depende da API e não sorteia.
 *
 * Semeia UM SIM, UM NÃO: a revisão precisa ver, na mesma tabela, a linha com
 * foto e a linha com iniciais. Cobertura total esconderia a regressão do
 * fallback do AppAvatar.
 */
class DemoPhotosSeeder extends Seeder
{
    private const PORTRAITS = [
        'https://randomuser.me/api/portraits/men/32.jpg',
        'https://randomuser.me/api/portraits/women/44.jpg',
        'https://randomuser.me/api/portraits/men/75.jpg',
        'https://randomuser.me/api/portraits/women/68.jpg',
        'https://randomuser.me/api/portraits/men/11.jpg',
        'https://randomuser.me/api/portraits/women/23.jpg',
        'https://randomuser.me/api/portraits/men/54.jpg',
        'https://randomuser.me/api/portraits/women/9.jpg',
    ];

    public function run(UserPhotoService $photos): void
    {
        $users = Redator::with('user')->get()->pluck('user')
            ->concat(Student::with('user')->get()->pluck('user'))
            ->filter()
            ->values();

        $usadas = 0;

        foreach ($users as $i => $user) {
            if ($i % 2 !== 0) {
                continue;
            }

            if ($user->photo_path !== null) {
                $this->command->line("· {$user->name} já tem foto, pulado");

                continue;
            }

            $url = self::PORTRAITS[$usadas % count(self::PORTRAITS)];

            if ($this->seedOne($photos, $user, $url)) {
                $usadas++;
            }
        }

        $this->command->info("Fotos de demonstração: {$usadas} semeadas, ".($users->count() - $usadas).' sem foto (proposital).');
    }

    /** Falha de rede registra e segue: seed de demonstração não derruba o dev. */
    private function seedOne(UserPhotoService $photos, User $user, string $url): bool
    {
        $tmp = null;

        try {
            $res = Http::timeout(10)->get($url);

            if ($res->failed()) {
                $this->command->warn("· {$url} devolveu {$res->status()}, {$user->name} fica sem foto");

                return false;
            }

            $tmp = tempnam(sys_get_temp_dir(), 'lotus-demo-photo');
            file_put_contents($tmp, $res->body());

            // `$test: true` pula a checagem de is_uploaded_file, que só vale
            // para arquivo vindo de requisição HTTP real.
            $photos->store($user, new UploadedFile($tmp, "demo-{$user->id}.jpg", 'image/jpeg', null, true));
            $this->command->line("✓ {$user->name}");

            return true;
        } catch (Throwable $e) {
            $this->command->warn("· falha ao semear {$user->name}: {$e->getMessage()}");

            return false;
        } finally {
            if ($tmp !== null && file_exists($tmp)) {
                @unlink($tmp);
            }
        }
    }
}
