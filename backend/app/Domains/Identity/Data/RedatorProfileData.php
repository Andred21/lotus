<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Data\Attributes\ReadOnlyCollection;
use App\Shared\Files\Models\File;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Parte do perfil que só o Redator tem. Fora do escopo por decisão do João
 * (spec D1): turmas em andamento, próximas turmas e pendências — tudo que
 * exigiria ler `App\Domains\Operation` de dentro de Identity. `cursos` fica
 * porque sai de `Redator::courses()`, aresta para Catalog já permitida.
 */
#[TypeScript]
class RedatorProfileData extends Data
{
    public function __construct(
        /**
         * Projeção de SAÍDA: o `fromRedator` a preenche e nenhuma Action a lê
         * da entrada — documento se envia por `POST /api/profile/documents`.
         * Por isso `#[ReadOnlyCollection]` em vez de `Optional`.
         *
         * @var array<RedatorProfileDocumentData>
         */
        #[DataCollectionOf(RedatorProfileDocumentData::class)]
        #[ReadOnlyCollection]
        public array $documentos,
        public int $cursos_habilitados,
        /** @var array<int, string> */
        public array $cursos,
    ) {}

    public static function fromRedator(Redator $redator): self
    {
        // Um ativo por tipo, no máximo: o replace do
        // StoreRedatorDocumentAction soft-deleta o anterior do mesmo tipo, e a
        // relação já filtra os soft-deletados.
        $porTipo = $redator->documents->keyBy(fn (File $file) => $file->type);

        return new self(
            documentos: array_map(
                fn (RedatorDocumentType $type) => RedatorProfileDocumentData::slot($type, $porTipo->get($type->value)),
                RedatorDocumentType::cases(),
            ),
            cursos_habilitados: $redator->courses->count(),
            cursos: $redator->courses->pluck('name')->all(),
        );
    }
}
