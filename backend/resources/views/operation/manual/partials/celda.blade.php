{{-- Célula de tabela do manual. TODA célula do documento passa por aqui: o que
     muda de uma para a outra é largura, corpo da fonte, fundo, margem e cor de
     borda — cada valor medido dentro do `docs/templates/manual.docx`, tabela a
     tabela, e passado pelo `@include`.

     O texto sempre sai por `@xmlLines`, nunca por `@xml`: para uma linha só os
     dois devolvem o mesmo, e para as multilinha (objetivos e conteúdos do
     módulo, rótulos de duas linhas do cabeçalho) só `@xmlLines` produz o
     `<w:br/>`. Um flag aqui só criaria a chance de a célula errada comer a
     quebra. `@xml` fica para os atributos, onde `<w:br/>` seria corrupção. --}}
@php
    $texto ??= '';
    $fuente ??= 17;
    $negrita ??= false;
    $fondo ??= null;
    $borde ??= '202020';
    $grosor ??= 6;
    $alinear ??= 'center';
    $span ??= null;
    $margen ??= [20, 35];
@endphp
<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="@xml($ancho)"/>@if ($span)<w:gridSpan w:val="@xml($span)"/>@endif<w:vAlign w:val="center"/><w:tcMar><w:top w:w="@xml($margen[0])" w:type="dxa"/><w:start w:w="@xml($margen[1])" w:type="dxa"/><w:bottom w:w="@xml($margen[0])" w:type="dxa"/><w:end w:w="@xml($margen[1])" w:type="dxa"/></w:tcMar>@if ($fondo)<w:shd w:fill="@xml($fondo)" w:val="clear"/>@endif<w:tcBorders><w:top w:val="single" w:sz="@xml($grosor)" w:space="0" w:color="@xml($borde)"/><w:start w:val="single" w:sz="@xml($grosor)" w:space="0" w:color="@xml($borde)"/><w:bottom w:val="single" w:sz="@xml($grosor)" w:space="0" w:color="@xml($borde)"/><w:end w:val="single" w:sz="@xml($grosor)" w:space="0" w:color="@xml($borde)"/></w:tcBorders></w:tcPr>
<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="@xml($alinear)"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>@if ($negrita)<w:b/>@else<w:b w:val="0"/>@endif<w:i w:val="0"/><w:color w:val="111111"/><w:sz w:val="@xml($fuente)"/></w:rPr><w:t xml:space="preserve">@xmlLines($texto)</w:t></w:r></w:p></w:tc>
