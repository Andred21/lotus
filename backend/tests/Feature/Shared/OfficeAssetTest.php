<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * Assets versionados dos documentos oficiais. Peso é requisito do bloco, não
 * detalhe: o "visualizador travado" que o João relatou foi medido como excesso
 * de bytes embutidos, e o teto vem do documento que a Lotus já aprovou.
 *
 * O JPEG é REPRODUZÍVEL, e a receita mora aqui porque é aqui que ela é cobrada.
 * Com o compose de pé (`docker compose up -d`):
 *
 *   docker compose cp docs/templates/fundo-certificado.png app:/tmp/fundo.png
 *   docker compose exec -T app sh -c 'cd /tmp && printf "%s" \
 *     "<!doctype html><html><head><style>html,body{margin:0;padding:0}
 *      img{display:block;width:1414px;height:2000px}</style></head>
 *      <body><img src=\"fundo.png\"></body></html>" > shot.html && \
 *     curl -s -o out.jpg -F "files=@shot.html;filename=index.html" \
 *       -F "files=@fundo.png" -F "format=jpeg" -F "quality=92" \
 *       -F "width=1414" -F "height=2000" \
 *       http://gotenberg:3000/forms/chromium/screenshot/html'
 *   docker compose cp app:/tmp/out.jpg backend/resources/images/fundo-certificado.jpg
 *
 * `quality=92` foi escolhido por varredura: 92 → 74.604 B, 85 → 41.002,
 * 78 → 34.249, 70 → 29.889. O maior valor que ainda passa folgado sob o teto
 * preserva o gradiente low-poly, que é onde JPEG agressivo faz banding.
 */
class OfficeAssetTest extends TestCase
{
    /**
     * O teto NÃO é palpite: 98.258 bytes é o peso do MESMO fundo, nas mesmas
     * dimensões, dentro do `docs/templates/certificado.pdf` aprovado pela
     * Lotus (extraído com `pdfimages -j`). O PNG entregue tem 1.245.172.
     */
    public function test_fundo_do_certificado_e_jpeg_1414x2000_mais_leve_que_o_template(): void
    {
        $path = resource_path('images/fundo-certificado.jpg');

        $this->assertFileExists($path);

        $info = getimagesize($path);
        $this->assertNotFalse($info);
        $this->assertSame([1414, 2000], [$info[0], $info[1]]);
        $this->assertSame(IMAGETYPE_JPEG, $info[2]);

        $this->assertLessThan(
            98258,
            filesize($path),
            'O fundo passou do peso do mesmo fundo dentro do certificado aprovado.',
        );
    }
}
