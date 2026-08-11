<?php

namespace Tests\Feature\Shared;

use App\Shared\Office\OfficeRenderException;
use App\Shared\Office\OoxmlPackager;
use App\Shared\Office\Xml;
use Tests\TestCase;
use ZipArchive;

class OoxmlPackagerTest extends TestCase
{
    /**
     * O `{{ }}` do Blade escapa para HTML e cobre `& < > " '`, mas NÃO remove
     * caractere de controle, que é ilegal em XML 1.0 (§2.2). Um deles corrompe
     * o pacote inteiro em silêncio: o leitor recusa o ZIP, não a célula.
     */
    public function test_escape_cobre_metacaractere_e_caractere_de_controle(): void
    {
        $this->assertSame('A &amp; B &lt;c&gt; &quot;d&quot;', Xml::text('A & B <c> "d"'));
        $this->assertSame('ABC', Xml::text("A\x00B\x08C"));
        $this->assertSame('Ação', Xml::text('Ação'));
        $this->assertSame('', Xml::text(null));
    }

    /**
     * Quebra de linha em OOXML é `<w:br/>`; um `\n` cru dentro de `<w:t>` some.
     * E `<w:br/>` não pode ficar DENTRO do `<w:t>` — o separador fecha e reabre
     * a tag, senão o pacote sai bem-formado mas inválido contra o schema.
     */
    public function test_quebra_de_linha_vira_br_do_ooxml(): void
    {
        $quebra = '</w:t><w:br/><w:t xml:space="preserve">';

        $this->assertSame("a{$quebra}b{$quebra}c", Xml::lines("a\nb\r\nc"));
        $this->assertSame("a &amp; b{$quebra}c", Xml::lines("a & b\nc"));
    }

    public function test_pacote_abre_como_zip_com_as_parts_entregues(): void
    {
        $bytes = (new OoxmlPackager)->package([
            '[Content_Types].xml' => '<Types/>',
            '_rels/.rels' => '<Relationships/>',
            'word/document.xml' => '<w:document/>',
        ]);

        $file = tempnam(sys_get_temp_dir(), 'ooxml-test');
        file_put_contents($file, $bytes);

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($file) === true);
        $this->assertSame(3, $zip->numFiles);
        // OPC: `[Content_Types].xml` primeiro — há leitor que só olha o início.
        $this->assertSame('[Content_Types].xml', $zip->getNameIndex(0));
        $this->assertSame('<w:document/>', $zip->getFromName('word/document.xml'));
        $zip->close();
        unlink($file);
    }

    /**
     * Pacote que não produziu bytes é FALHA, não documento.
     *
     * O caso é medido, não hipotético: fechar um ZIP sem nenhuma entrada faz o
     * libzip APAGAR o arquivo temporário. O que este teste viu antes da
     * correção foi `ErrorException: file_get_contents(/tmp/ooxmlXXXXXX): Failed
     * to open stream` — 500 sem nome de domínio, carregando o caminho do
     * temporário no `detail`, e com o `unlink` pulado. A falha agora tem tipo
     * (`OfficeRenderException`, o que o contrato do `DocxToPdf` declara) e o
     * temporário morre no `finally`. As demais checagens (`tempnam`, `open`,
     * `addFromString`, `close`) fecham a mesma porta antes, cada uma no seu
     * ponto — inclusive a única que devolveria bytes vazios sem nenhum aviso:
     * `open()` falhando deixa para trás o arquivo de zero byte do `tempnam`.
     */
    public function test_pacote_vazio_falha_em_vez_de_devolver_documento_de_zero_byte(): void
    {
        $this->expectException(OfficeRenderException::class);

        (new OoxmlPackager)->package([]);
    }
}
