<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Student;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use App\Shared\Rules\ValidRut;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\Validation\Email;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de aluno. Campos do usuário-aluno achatados no topo,
 * como no RedatorData.
 *
 * `client_id` é ENTRADA (obrigatório no store, D3 da spec): todo aluno nasce
 * vinculado, e o vínculo é gravado pelo StudentClientLinkService. Na saída, o
 * vínculo vigente aparece em `current_client_id`/`current_client_name`, que são
 * #[Computed] — o update não os aceita, porque trocar de cliente é ato da
 * matrícula.
 */
#[TypeScript]
class StudentData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        #[Required]
        public string $rut,
        #[Required, Email]
        public string $email,
        public string|Optional|null $phone,
        /** Cliente ao qual o aluno é vinculado no cadastro. Só entrada. */
        public int|Optional|null $client_id,
        #[Computed]
        public ?int $current_client_id = null,
        #[Computed]
        public ?string $current_client_name = null,
        #[Computed]
        public int $enrollments_count = 0,
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    public static function rules(): array
    {
        return [
            'rut' => ['required', 'string', new ValidRut],
            // Só a FORMA aqui. A existência do cliente é regra do cadastro e
            // vive na CreateStudentAction: `exists` neste DTO fazia o PUT
            // recusar um client_id inválido que o UpdateStudentAction ignora
            // de propósito (D3), bloqueando edição de dados pessoais.
            'client_id' => ['sometimes', 'nullable', 'integer'],
        ];
    }

    public static function fromModel(Student $student): self
    {
        return new self(
            id: $student->id,
            name: $student->user->name,
            rut: $student->user->rut,
            email: $student->user->email,
            phone: $student->user->phone,
            client_id: new Optional,
            current_client_id: $student->current_client_id,
            current_client_name: $student->currentClient?->legal_name,
            // `enrollments_count` vem do withCount() do controller; o fallback
            // cobre a chamada direta (testes de unidade) sem gerar N+1 na lista.
            enrollments_count: $student->enrollments_count ?? $student->enrollments()->count(),
            photo_url: $student->user->photo_path,
        );
    }
}
