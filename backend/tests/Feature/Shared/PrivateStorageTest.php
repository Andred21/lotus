<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Data\FileData;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\WithTransformer;
use Tests\TestCase;

/**
 * Eixo "S3 privado + URL temporária" do item 4 do backlog (ADR-11). Medido em
 * 2026-08-25: já estava satisfeito. Este teste não constrói nada — ele impede
 * que deixe de estar sem ninguém perceber.
 */
class PrivateStorageTest extends TestCase
{
    public function test_o_disco_de_arquivos_nao_declara_visibilidade_publica(): void
    {
        foreach (['s3', 's3_public'] as $disco) {
            $config = config("filesystems.disks.{$disco}");

            if ($config === null) {
                continue;   // `s3_public` só existe quando AWS_ENDPOINT_PUBLIC está definido
            }

            $this->assertNotSame(
                'public',
                $config['visibility'] ?? null,
                implode("\n", [
                    "O disco `{$disco}` passou a gravar objeto público.",
                    'O ADR-11 diz o contrário: o binário NÃO é servido pela app nem pelo bucket —',
                    'o acesso é por URL pré-assinada temporária, e documento aqui tem peso legal.',
                ]),
            );
        }
    }

    public function test_a_url_de_leitura_do_dto_e_assinada_e_expira(): void
    {
        // O contrato do `FileData` é que `download_url` sai do
        // `SignedUrlTransformer`, e não o path cru. Ler o atributo do DTO é o
        // que prova isso sem depender de um bucket de verdade.
        $propriedade = new \ReflectionProperty(FileData::class, 'download_url');
        $atributos = $propriedade->getAttributes(WithTransformer::class);

        $this->assertCount(1, $atributos, '`FileData::$download_url` perdeu o `WithTransformer` — a URL sairia crua.');
        $this->assertSame(
            SignedUrlTransformer::class,
            $atributos[0]->getArguments()[0],
        );
        $this->assertGreaterThan(0, $atributos[0]->getArguments()[1], 'A expiração da URL assinada tem de ser positiva.');
    }
}
