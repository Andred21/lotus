<?php

namespace App\Shared\Files\Transformers;

use App\Shared\Files\Actions\UploadFileAction;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelData\Support\DataProperty;
use Spatie\LaravelData\Support\Transformation\TransformationContext;
use Spatie\LaravelData\Transformers\Transformer;

/**
 * Assina a URL de leitura de um objeto do storage NA SERIALIZAÇÃO. A propriedade
 * do DTO carrega o path; este transformer é o único lugar que a converte em URL
 * pré-assinada (spec D2/D3/D4).
 *
 * Por que na saída e não na construção: `QuoteData::collect()` não carrega
 * argumento extra, então passar o serviço por parâmetro não atravessa o
 * aninhamento `Budget → Quote → File`. Transformer é por propriedade e atravessa.
 *
 * Valor `null` nunca chega aqui: `TransformedDataResolver:102` devolve null antes
 * de chamar o transformer — é o que mantém `photo_url: null` sem linha extra.
 *
 * Assina contra {@see UploadFileAction::publicDiskFor()}, não contra o disco
 * padrão: em dev o endpoint que grava (`minio:9000`) não é o que o navegador
 * resolve (achado de 2026-07-31).
 */
final class SignedUrlTransformer implements Transformer
{
    public function __construct(private int $minutes) {}

    public function transform(DataProperty $property, mixed $value, TransformationContext $context): string
    {
        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk(UploadFileAction::publicDiskFor(config('filesystems.default')));

        return $storage->temporaryUrl($value, now()->addMinutes($this->minutes));
    }
}
