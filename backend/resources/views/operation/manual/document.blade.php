@xmlDecl
{{-- A declaração XML abre o arquivo: comentário Blade some na compilação mas
     deixa a quebra de linha, e um único byte antes do `<?xml` invalida o
     prólogo. Por isso o `@xmlDecl` vem antes do cabeçalho abaixo.

     Libro de Control de Clases (RF-TUR-04), fiel ao `docs/templates/manual.docx`.

     FONTE DE VERDADE ÚNICA: esta Blade produz `word/document.xml`, o
     `OoxmlPackager` fecha o `.docx`, e o PDF sai DESSE pacote pela rota
     LibreOffice. Não existe caminho HTML paralelo — foi a cópia dupla do
     transporte que o ADR-12 registrou como defeito já pago.

     PAPEL: ofício paisagem (`w:w="20183" w:h="12246"`), medido dentro do
     template. Isto REABRE a D4/D6 do bloco 6d, que fixara A4 retrato porque o
     cliente arquiva em A4; o João escolheu fidelidade literal ao arquivo
     aprovado pela Lotus (D2 da spec). O manual passa a ser o único documento
     oficial fora do A4.

     FONTE: `Arial` é o que o template declara. O LibreOffice do conversor a
     substitui por Liberation Sans com métrica idêntica — que é exatamente a
     fonte que `pdffonts docs/templates/manual.pdf` mostra embutida. Declarar
     Liberation Sans deixaria o Word do cliente sem a fonte; declarar Arial
     acerta os dois lados.

     ESCAPE: nada de `{{ }}` nem `{!! !!}` aqui. `@xml` e `@xmlLines`, sempre —
     ver `App\Shared\Office\Xml` e a guarda estrutural no `ManualTurmaTest`.

     SEM FUNDO RASTER (D3): o template traz ornamentos low-poly nas quinas e os
     títulos de página DENTRO de uma faixa rasterizada de 4205×378 — por isso
     `pdftotext` do template nunca devolve "Libro de Control de Clases". Aqui os
     títulos são texto; os ornamentos ficam para outro bloco.

     MEDIDAS: largura de coluna, corpo de fonte, cor de borda, fundo, margem
     interna e altura de linha vêm célula a célula do template. Onde ele traz
     um formulário VAZIO, a coluna que aqui recebe prosa multilinha (objetivos e
     conteúdos) alinha à esquerda em vez de centralizar — centralizar parágrafo
     corrido é ilegível, e a célula vazia do template não exprime preferência. --}}
@php
    $modulos = $turma->course->modules->sortBy('sort_order')->values();
    $alumnos = $turma->enrollments->values();
    $horasT = $modulos->sum('theory_hours');
    $horasP = $modulos->sum('practice_hours');

    // Turma maior que o formulário ESTENDE a grade; menor mantém as linhas em
    // branco do impresso. Truncar esconderia aluno num documento de sala.
    $filas = fn (int $minimo) => max($alumnos->count(), $minimo);
    $alumno = fn (int $i) => $alumnos->get($i)?->student;

    // Id de desenho: contador em vez de literal, porque o cabeçalho é o mesmo
    // partial cinco vezes e o Word pede reparo do arquivo quando dois desenhos
    // compartilham o id. Incrementar no `@include` mantém a unicidade mesmo se
    // uma página for movida ou duplicada.
    $dibujo = 0;
@endphp
<w:document
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>

{{-- ------------------------------------------------------------------ 1/5 --}}
@include('operation.manual.partials.encabezado', ['titulo' => 'Libro de Control de Clases', 'dibujo' => ++$dibujo])
@php
    $datos = [
        [1020, 'Cliente', $turma->contratante()->name],
        [1247, "Nombre Actividad de Capacitación\n(Curso)", $turma->course->name],
        [1020, 'Modalidad', ucfirst($turma->modalidade->value)],
        [1134, 'Lugar de aplicación', $turma->local_aplicacao ?? ''],
        [1020, 'Fecha de inicio', $turma->start_date->format('d-m-Y')],
        [1020, 'Fecha de término', $turma->end_date->format('d-m-Y')],
        [1247, 'Relator(es)', $turma->redatores->map(fn ($r) => $r->user->name)->implode(', ')],
    ];
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18141"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid><w:gridCol w:w="5839"/><w:gridCol w:w="12302"/></w:tblGrid>
@foreach ($datos as $fila)
<w:tr><w:trPr><w:trHeight w:val="@xml($fila[0])" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@include('operation.manual.partials.celda', ['ancho' => 5839, 'texto' => $fila[1],
    'negrita' => true, 'fuente' => 21, 'fondo' => '25A5E4', 'grosor' => 8, 'margen' => [55, 70]])
@include('operation.manual.partials.celda', ['ancho' => 12302, 'texto' => $fila[2],
    'fuente' => 22, 'fondo' => 'FFFFFF', 'grosor' => 8, 'margen' => [55, 70]])
</w:tr>
@endforeach
</w:tbl>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

{{-- ------------------------------------------------------------------ 2/5 --}}
@include('operation.manual.partials.encabezado', ['titulo' => 'Antecedentes Participantes', 'dibujo' => ++$dibujo])
@php
    $columnas = [[1361, 'N°'], [5216, 'Nombre'], [2948, 'RUT'], [4819, 'Empresa'], [3798, 'Firma']];
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18142"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid>@foreach ($columnas as $col)<w:gridCol w:w="@xml($col[0])"/>@endforeach</w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="510" w:hRule="atLeast"/><w:tblHeader w:val="true"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1],
    'negrita' => true, 'fuente' => 19, 'fondo' => '25A5E4', 'grosor' => 7])
@endforeach
</w:tr>
@for ($i = 0; $i < $filas(22); $i++)
<w:tr><w:trPr><w:trHeight w:val="360" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@php
    $celdas = [
        [1361, (string) ($i + 1), null],
        [5216, $alumno($i)?->user->name ?? '', null],
        // A coluna do RUT é a zebrada do template.
        [2948, $alumno($i)?->user->rut ?? '', 'EFEFEF'],
        [4819, $alumno($i)?->currentClient?->legal_name ?? '', null],
        [3798, '', null],
    ];
@endphp
@foreach ($celdas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1],
    'fondo' => $col[2], 'fuente' => 18, 'margen' => [8, 25]])
@endforeach
</w:tr>
@endfor
</w:tbl>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

{{-- ------------------------------------------------------------------ 3/5 --}}
@include('operation.manual.partials.encabezado', ['titulo' => 'Control de Asistencia de Participantes', 'dibujo' => ++$dibujo])
@php
    // 31 dias em cinco blocos; cada bloco de sete fecha numa coluna FIRMA
    // larga. A última coluna leva FIRMA/CONFORMIDAD/PARTICIPANTES em três
    // linhas, como no template.
    $dias = [];
    foreach (range(1, 31) as $dia) {
        $dias[] = [255, (string) $dia, 'ECECEC'];

        if ($dia % 7 === 0) {
            $dias[] = [1020, 'FIRMA', null];
        }
    }
    $columnas = array_merge([[454, 'N°', null], [2891, 'NOMBRE', null]], $dias,
        [[2806, "FIRMA\nCONFORMIDAD\nPARTICIPANTES", null]]);
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18136"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid>@foreach ($columnas as $col)<w:gridCol w:w="@xml($col[0])"/>@endforeach</w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="624" w:hRule="atLeast"/><w:tblHeader w:val="true"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1],
    'negrita' => true, 'fuente' => 11, 'fondo' => '25A5E4'])
@endforeach
</w:tr>
@for ($i = 0; $i < $filas(20); $i++)
<w:tr><w:trPr><w:trHeight w:val="295" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $indice => $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'fondo' => $col[2],
    'texto' => match ($indice) { 0 => (string) ($i + 1), 1 => $alumno($i)?->user->name ?? '', default => '' },
    'alinear' => $indice === 1 ? 'left' : 'center',
    'fuente' => 13, 'borde' => 'A8A8A8', 'margen' => [20, 12]])
@endforeach
</w:tr>
@endfor
</w:tbl>
<w:p><w:pPr><w:spacing w:before="0" w:after="60" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="8"/></w:rPr></w:pPr></w:p>
@php
    $notas = [
        'NOTA 1:' => ' LOS PARTICIPANTES DEBERAN FIRMAR AL MENOS UNA VEZ A LA SEMANA Y AL FINALIZAR EL MES, Y AL FINALIZAR EL PROCESO DE CAPACITACION, ACREDITANDO CON ELLO LA ASISTENCIA REGISTRADA EN EL PRESENTE FORMULARIO DE CONTROL.',
        'NOTA 2:' => ' LA NOMENCLATURA A UTILIZAR DEBERA CORRESPONDER A LA SIGUIENTE: / PRESENTE; X AUSENTE; XA ATRASADO; NO SE ACEPTARAN ENMENDADURAS NI CORRECCIONES.',
        'NOTA 3:' => ' LA ASISTENCIA DEBERA SER REGISTRADA COMO MAXIMO A LOS 20 MINUTOS DEL COMIENZO DEL HORARIO FORMAL DE CLASES.',
    ];
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18142"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid><w:gridCol w:w="18142"/></w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="1587" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="18142"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="75" w:type="dxa"/><w:start w:w="120" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="202020"/><w:start w:val="single" w:sz="8" w:space="0" w:color="202020"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="202020"/><w:end w:val="single" w:sz="8" w:space="0" w:color="202020"/></w:tcBorders></w:tcPr>
@foreach ($notas as $rotulo => $nota)
<w:p><w:pPr><w:spacing w:before="0" w:after="36" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:i w:val="0"/><w:color w:val="111111"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">@xml($rotulo)</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b w:val="0"/><w:i w:val="0"/><w:color w:val="111111"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">@xml($nota)</w:t></w:r></w:p>
@endforeach
</w:tc>
</w:tr>
</w:tbl>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

{{-- ------------------------------------------------------------------ 4/5 --}}
@include('operation.manual.partials.encabezado', ['titulo' => 'Temas de La Capacitación', 'dibujo' => ++$dibujo])
@php
    $columnas = [[1020, 'N°'], [7143, 'Módulo'], [3118, 'Objetivos'], [3402, 'Contenidos'],
        [1729, "Horas\nT"], [1729, "Horas\nP"]];
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18141"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid>@foreach ($columnas as $col)<w:gridCol w:w="@xml($col[0])"/>@endforeach</w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="624" w:hRule="atLeast"/><w:tblHeader w:val="true"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1],
    'negrita' => true, 'fuente' => 19, 'fondo' => '25A5E4', 'grosor' => 7])
@endforeach
</w:tr>
@for ($i = 0; $i < max($modulos->count(), 5); $i++)
@php
    $mod = $modulos->get($i);
    $celdas = [
        [1020, (string) ($i + 1), null, 'center'],
        // A coluna do módulo é a zebrada do template.
        [7143, $mod?->name ?? '', 'EFEFEF', 'left'],
        [3118, $mod?->learnings ?? '', null, 'left'],
        [3402, $mod?->contents ?? '', null, 'left'],
        [1729, $mod ? (string) $mod->theory_hours : '', null, 'center'],
        [1729, $mod ? (string) $mod->practice_hours : '', null, 'center'],
    ];
@endphp
<w:tr><w:trPr><w:trHeight w:val="1134" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@foreach ($celdas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1], 'fondo' => $col[2],
    'alinear' => $col[3], 'fuente' => 19, 'margen' => [55, 70]])
@endforeach
</w:tr>
@endfor
{{-- O total é SOMA dos módulos, nunca campo digitado. --}}
<w:tr><w:trPr><w:trHeight w:val="624" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@include('operation.manual.partials.celda', ['ancho' => 14683, 'span' => 4, 'texto' => 'Total de Horas Capacitadas',
    'alinear' => 'left', 'fuente' => 19, 'fondo' => 'EFEFEF', 'grosor' => 7, 'margen' => [55, 70]])
@include('operation.manual.partials.celda', ['ancho' => 1729, 'texto' => (string) $horasT,
    'fuente' => 19, 'fondo' => 'EFEFEF', 'margen' => [55, 70]])
@include('operation.manual.partials.celda', ['ancho' => 1729, 'texto' => (string) $horasP,
    'fuente' => 19, 'fondo' => 'EFEFEF', 'margen' => [55, 70]])
</w:tr>
</w:tbl>
<w:p><w:r><w:br w:type="page"/></w:r></w:p>

{{-- ------------------------------------------------------------------ 5/5 --}}
@include('operation.manual.partials.encabezado', ['titulo' => 'Evaluaciones', 'dibujo' => ++$dibujo])
@php
    $columnas = [[567, 'N°'], [4252, 'NOMBRE'], [2154, 'FECHA'], [2154, 'FECHA'], [2154, 'FECHA'],
        [2154, 'FECHA'], [2154, 'NOTA FINAL'], [2551, "FIRMA\nCONFORMIDAD\nPARTICIPANTES"]];
@endphp
<w:tbl>
<w:tblPr><w:tblW w:type="dxa" w:w="18140"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblInd w:w="0" w:type="dxa"/></w:tblPr>
<w:tblGrid>@foreach ($columnas as $col)<w:gridCol w:w="@xml($col[0])"/>@endforeach</w:tblGrid>
<w:tr><w:trPr><w:trHeight w:val="737" w:hRule="atLeast"/><w:tblHeader w:val="true"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'texto' => $col[1],
    'negrita' => true, 'fuente' => 16, 'fondo' => '25A5E4', 'grosor' => 7, 'borde' => 'A8A8A8'])
@endforeach
</w:tr>
@for ($i = 0; $i < $filas(20); $i++)
<w:tr><w:trPr><w:trHeight w:val="360" w:hRule="atLeast"/><w:cantSplit/></w:trPr>
@foreach ($columnas as $indice => $col)
@include('operation.manual.partials.celda', ['ancho' => $col[0], 'borde' => 'A8A8A8',
    'texto' => match ($indice) { 0 => (string) ($i + 1), 1 => $alumno($i)?->user->name ?? '', default => '' },
    'alinear' => $indice === 1 ? 'left' : 'center',
    'fuente' => 17, 'margen' => [8, 25]])
@endforeach
</w:tr>
@endfor
</w:tbl>

{{-- Parágrafo mínimo: OOXML exige um `<w:p>` depois da última tabela, e um de
     corpo normal empurraria a quinta página para uma sexta. --}}
<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>
<w:sectPr>
    <w:pgSz w:w="20183" w:h="12246" w:orient="landscape"/>
    <w:pgMar w:top="340" w:right="454" w:bottom="454" w:left="454" w:header="85" w:footer="113" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>
