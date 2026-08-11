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

    /**
     * As fontes do `docs/templates/certificado.pdf`, identificadas pelo `name`
     * table dos programas embutidos (o Word ofusca os nomes como
     * `___WRD_EMBED_SUB_1235`): Lexend é a família dominante — três dos oito
     * subsets — e Montserrat ExtraBold é o título. Ambas OFL.
     *
     * São VARIÁVEIS: o Google Fonts serve a mesma URL para 400, 700 e 800 do
     * Lexend, então dois arquivos cobrem os quatro pesos que o documento usa.
     * Reproduzir (no host, de `backend/`):
     *
     *   curl -sA "Mozilla/5.0 … Chrome/120 …" -o resources/fonts/lexend-latin.woff2 \
     *     https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU.woff2
     *   curl -sA "Mozilla/5.0 … Chrome/120 …" -o resources/fonts/montserrat-800-latin.woff2 \
     *     https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr73w5aXo.woff2
     *
     * As URLs saem do bloco `/* latin *\/` de
     * `https://fonts.googleapis.com/css2?family=Lexend:wght@400;700;800&family=Montserrat:wght@800`
     * — já subsetadas em `U+0000-00FF` mais pontuação, que cobre o espanhol.
     */
    public function test_fontes_do_certificado_estao_versionadas_com_licenca(): void
    {
        foreach ([
            'fonts/lexend-latin.woff2' => 60_000,
            'fonts/montserrat-800-latin.woff2' => 40_000,
        ] as $relative => $ceiling) {
            $path = resource_path($relative);
            $this->assertFileExists($path);
            $this->assertSame('wOF2', file_get_contents($path, length: 4), "{$relative} não é WOFF2.");
            $this->assertLessThan($ceiling, filesize($path), "{$relative} passou do subset latino.");
        }

        // Fonte OFL sem o texto da licença ao lado é distribuição irregular.
        $this->assertFileExists(resource_path('fonts/lexend-OFL.txt'));
        $this->assertFileExists(resource_path('fonts/montserrat-OFL.txt'));
    }
}
