<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Transformers\SignedUrlTransformer;
use Illuminate\Support\Facades\Storage;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Tests\TestCase;

/**
 * O transformer é o único lugar do projeto que sabe assinar URL de leitura.
 * Antes dele, sete `fromModel` resolviam serviço pelo container para fazer a
 * mesma operação com dois TTLs diferentes.
 *
 * O teste exercita o transformer PELA SERIALIZAÇÃO, não chamando `transform()`
 * na mão: é assim que a produção o alcança, e fabricar um `DataProperty` só
 * para satisfazer a assinatura provaria menos. O `Storage::fake('s3')` é o
 * mesmo setup que o `UserPhotoTest` já usa para assinar URL em teste.
 */
class SignedUrlTransformerTest extends TestCase
{
    public function test_assina_o_path_na_serializacao(): void
    {
        Storage::fake('s3');

        $saida = (new SondaSignedUrlData('documentos/contrato.pdf'))->toArray();

        $this->assertIsString($saida['url']);
        $this->assertStringContainsString('documentos/contrato.pdf', $saida['url']);
    }

    public function test_valor_nulo_continua_nulo_sem_passar_pelo_transformer(): void
    {
        Storage::fake('s3');

        // `TransformedDataResolver:102` devolve null antes de chamar o
        // transformer. É isso que mantém `photo_url: null` sem linha extra —
        // se deixar de valer, as 4 entidades com foto quebram de uma vez.
        $this->assertNull((new SondaSignedUrlNullableData(null))->toArray()['url']);
    }
}

class SondaSignedUrlData extends Data
{
    public function __construct(
        #[WithTransformer(SignedUrlTransformer::class, 10)]
        public string $url,
    ) {}
}

class SondaSignedUrlNullableData extends Data
{
    public function __construct(
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $url,
    ) {}
}
