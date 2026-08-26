<?php

namespace Tests\Feature\Shared;

use App\Shared\Files\Actions\UploadFileAction;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * `files.mime` guardava o MIME que o CLIENTE declarou (`getClientMimeType`),
 * num repositório onde o arquivo tem peso legal: bastava o cliente dizer
 * "application/pdf" para a linha afirmar isso, fossem quais fossem os bytes.
 */
class FileMimeFromContentTest extends TestCase
{
    use BuildsRealUploads;

    public function test_o_mime_gravado_vem_do_conteudo_e_nao_do_cliente(): void
    {
        $upload = $this->uploadReal($this->pngReal(), 'documento.pdf', 'application/pdf');

        $meta = app(UploadFileAction::class)->metadataOf($upload);

        $this->assertSame('image/png', $meta['mime']);
        $this->assertSame('documento.pdf', $meta['original_name'], 'O nome declarado continua sendo o do cliente — é o que a pessoa reconhece.');
    }

    public function test_pdf_legitimo_continua_gravando_application_pdf(): void
    {
        $upload = $this->uploadReal($this->pdfReal(), 'cv.pdf', 'application/pdf');

        $this->assertSame('application/pdf', app(UploadFileAction::class)->metadataOf($upload)['mime']);
    }
}
