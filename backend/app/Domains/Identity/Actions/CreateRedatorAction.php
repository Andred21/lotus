<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Shared\Files\Actions\UploadFileAction;
use App\Shared\Support\Rut;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Cria o redator (usuário-redator + redator + documentos) numa transação.
 * is_active=false até ativação (definição de senha é fluxo à parte).
 *
 * @param  array<UploadedFile>  $documents
 */
class CreateRedatorAction
{
    public function __construct(private UploadFileAction $uploads) {}

    public function execute(RedatorData $data, array $documents = []): Redator
    {
        $rut = Rut::parse($data->rut)->format();

        if (User::where('rut', $rut)->exists()) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return DB::transaction(function () use ($data, $rut, $documents) {
            $user = User::create([
                'name'      => $data->name,
                'rut'       => $rut,
                'email'     => $data->email,
                'phone'     => $data->phone instanceof Optional ? null : $data->phone,
                'password'  => bin2hex(random_bytes(16)), // placeholder até ativação
                'type'      => 'redator',
                'is_active' => false,
            ]);

            $redator = $user->redator()->create([]);

            foreach ($documents as $document) {
                $this->uploads->execute($redator, $document, 'documento');
            }

            return $redator->load(['user', 'documents']);
        });
    }
}
