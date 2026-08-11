{{-- Faixa de cabeçalho de cada página: título em TEXTO (no template ele vive
     dentro de um raster de 4205×378) e o logo à direita, sobre uma borda
     inferior única.

     `$dibujo` é o id do desenho, e vem de FORA porque este partial entra cinco
     vezes no mesmo documento. O Word identifica cada figura pelo id do
     `<wp:docPr>` e pede reparo do arquivo quando ele repete — o
     `docs/templates/manual.docx`, escrito pelo próprio Word, numera os seus dez
     desenhos de 1 a 10 sem repetir. O `<pic:cNvPr>` segue o mesmo template pelo
     lado oposto: `id="0"` nos dez, porque ali o id é interno à figura. --}}
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="19276"/><w:tblLayout w:type="fixed"/>
<w:tblBorders><w:bottom w:val="single" w:sz="8" w:space="0" w:color="202020"/></w:tblBorders>
<w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="15276"/><w:gridCol w:w="2000"/></w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="680" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2000"/></w:tcPr><w:p/></w:tc>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="15276"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
        <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="111111"/><w:sz w:val="32"/></w:rPr>
        <w:t xml:space="preserve">@xml($titulo)</w:t></w:r></w:p>
    </w:tc>
    <w:tc><w:tcPr><w:tcW w:type="dxa" w:w="2000"/><w:vAlign w:val="center"/></w:tcPr>
        <w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
            {{-- 335×466 px do `lotus-logo.png`, a 12mm de altura: 432000 EMU
                 de altura e 310558 de largura preservam a proporção. --}}
            <wp:extent cx="310558" cy="432000"/>
            <wp:docPr id="@xml($dibujo)" name="LOTUS OTEC"/>
            <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="LOTUS OTEC"/><pic:cNvPicPr/></pic:nvPicPr>
            <pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
            <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="310558" cy="432000"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>
            </a:graphicData></a:graphic>
        </wp:inline>
        </w:drawing></w:r></w:p>
    </w:tc>
</w:tr>
</w:tbl>
<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
