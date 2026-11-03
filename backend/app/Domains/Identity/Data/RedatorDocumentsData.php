<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\ContentClass;
use Closure;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada do conjunto de documentos do cadastro do redator, em multipart:
 * `documents[<TIPO>] = arquivo`. Só entrada de request, fora do contrato TS.
 *
 * O conjunto entra inteiro ou não entra (spec D2): as Actions de create e
 * update o sobem num só `FileUploader::store`, junto com a escrita dos dados.
 */
class RedatorDocumentsData extends Data
{
    /** @param  array<string, UploadedFile>  $documents */
    public function __construct(
        public array $documents = [],
    ) {}

    /**
     * A ordem das checagens é o que protege o ClamAV: forma, chave, folha e
     * soma recusam com UMA frase e devolvem só essa regra, então nenhum
     * binário chega ao `ScannedForMalware` de um conjunto que já falhou.
     * Só um conjunto íntegro ganha as regras de conteúdo de cada tipo.
     *
     * @return array<string, mixed>
     */
    public static function rules(ValidationContext $context): array
    {
        $documents = $context->payload['documents'] ?? [];

        if (! is_array($documents)) {
            return self::recusa('identity.errors.documents_shape');
        }

        foreach (array_keys($documents) as $tipo) {
            if (RedatorDocumentType::tryFrom((string) $tipo) === null) {
                return self::recusa('identity.errors.document_type_invalid', ['tipo' => $tipo]);
            }
        }

        foreach ($documents as $arquivo) {
            // `documents[CV][]` passa pela chave e é array de arquivos: sem
            // esta checagem a regra de conteúdo o trataria como um arquivo só.
            if (! $arquivo instanceof UploadedFile) {
                return self::recusa('identity.errors.documents_shape');
            }
        }

        // Quatro documentos de 10 MB passariam um a um e somariam 40 MB contra
        // os 12 MB do `client_max_body_size`: a recusa viria do nginx em HTML,
        // fora do RFC 7807 (achado Q-3 do review de 2026-08-25).
        $somaEmKb = array_sum(array_map(
            fn (UploadedFile $arquivo) => (int) ceil(((int) $arquivo->getSize()) / 1024),
            $documents,
        ));

        if ($somaEmKb > ContentClass::TETO_AGREGADO_KB) {
            return self::recusa('shared.file.set_too_large', ['max' => intdiv(ContentClass::TETO_AGREGADO_KB, 1024)]);
        }

        $regras = ['documents' => ['sometimes', 'array']];

        foreach (array_keys($documents) as $tipo) {
            $regras["documents.{$tipo}"] = RedatorDocumentType::from((string) $tipo)->conteudo()->regras();
        }

        return $regras;
    }

    /**
     * @param  array<string, mixed>  $replace
     * @return array{documents: list<Closure>}
     */
    private static function recusa(string $chave, array $replace = []): array
    {
        return ['documents' => [
            fn (string $atributo, mixed $valor, Closure $fail) => $fail(__($chave, $replace)),
        ]];
    }
}
