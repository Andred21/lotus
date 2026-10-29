@php
    use Illuminate\Support\Carbon;

    /**
     * Certificado no layout v5 (bloco 40), montado a partir do snapshot
     * congelado — nunca das relações vivas (D12). Só duas coisas são VIVAS e
     * chegam prontas do `CertificatePdfService`: as assinaturas (D5) e a cidade
     * do emissor (D13). Todo campo ausente OMITE a linha em vez de imprimir
     * zero ou vazio (D-P7).
     *
     * O snapshot chega tipado (`CertificateSnapshotData`): a tolerância a
     * versão antiga do schema mora nele, não em defesa espalhada por aqui.
     *
     * @var \App\Domains\Certification\Services\AssinaturasDoCertificado $assinaturas
     * @var class-string<\App\Domains\Certification\Services\TextoDoCertificado> $texto
     */
    $snapshot = $certificate->snapshot;
    $curso = $snapshot->curso;

    $emitidoEm = $snapshot->emitido_em;
    $emitidoNumerico = $emitidoEm === null ? null : Carbon::parse($emitidoEm)->format('d-m-Y');

    // D13: a cidade do emissor lida na hora; a do snapshot é só reserva.
    $cidade = trim((string) ($cidade ?? $snapshot->ciudad_emision));
    $cidade = $cidade === '' ? null : $cidade;

    $grade = $snapshot->resultado->finalGrade();
    $attendance = $snapshot->resultado->attendance_pct;
    $parrafo = $texto::parrafo(
        $texto::periodo($snapshot->turma->start_date, $snapshot->turma->end_date),
        $curso->description,
        $grade === null ? null : $texto::nota($grade),
        $attendance === null ? null : $texto::asistencia($attendance),
    );

    // "En {cidade}, a {data}, {emissor} [{RUT}] certifica que:" — a cidade e a
    // data são opcionais e a frase se fecha sem elas, nunca com "En , a ,".
    $abertura = match (true) {
        $cidade !== null && $emitidoEm !== null => "En {$cidade}, a ".$texto::fechaLarga($emitidoEm).', ',
        $cidade !== null => "En {$cidade}, ",
        $emitidoEm !== null => 'A '.$texto::fechaLarga($emitidoEm).', ',
        default => '',
    };
    $abertura .= "{$snapshot->emissor->name} [{$snapshot->emissor->rut}] certifica que:";

    $detalhe = collect([
        $curso->technical_name,
        "{$curso->workload_hours} horas cronológicas",
    ])->filter(fn (?string $parte) => $parte !== null && trim($parte) !== '')->implode(' · ');

    // O código entra numa string CSS (`content`): só o alfabeto da série.
    $codigoCss = preg_replace('/[^\p{L}\p{N}\-_. ]/u', '', (string) $certificate->codigo);

    // O "%" é do número: sem o espaço duro ele cai sozinho na linha seguinte.
    $parrafo = $parrafo === null ? null : str_replace(' %', "\u{00A0}%", $parrafo);

    $tieneTemario = $curso->modules !== [];
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado {{ $certificate->codigo }}</title>
    <style>
        {{-- Cada imagem pesada entra UMA vez, como variável: a folha e a caixa da
             margem inferior leem a mesma (P-28). --}}
        :root {
            --fundo-primera-pagina: url("data:image/jpeg;base64,{{ $fundo }}");
            --fundo-continuacion: url("data:image/jpeg;base64,{{ $fundoContinuacion }}");
        }
        {{-- Lexend é a família dominante do `docs/templates/certificado.pdf` e
             Montserrat ExtraBold é o título. `font-weight: 100 900` porque as
             duas são variáveis: o navegador interpola o peso do MESMO arquivo. --}}
        @font-face {
            font-family: 'Lexend';
            font-style: normal;
            font-weight: 100 900;
            src: url("data:font/woff2;base64,{{ $lexend }}") format('woff2');
        }
        @font-face {
            font-family: 'Montserrat';
            font-style: normal;
            font-weight: 800;
            src: url("data:font/woff2;base64,{{ $montserrat }}") format('woff2');
        }
        {{-- A4 retrato e uma margem só, a de baixo: é a caixa dela que numera
             "Página X de Y" em toda página física, com o total certo para
             qualquer número de páginas (nem `position: fixed` nem elemento no
             fluxo sabem o total). A margem de cima e as laterais ficam em zero
             de propósito: nelas o `position: fixed` (o fundo) cobre a página
             inteira e o cabeçalho repetido mora no fluxo. A caixa pinta a faixa
             do fundo que a margem tira da folha, na mesma escala (210 x 297mm),
             e a primeira página troca para o fundo com as barras. --}}
        @page {
            size: A4 portrait;
            margin: 0 0 12mm;
            @bottom-center {
                background-image: var(--fundo-continuacion);
                background-position: 0 100%;
                background-repeat: no-repeat;
                background-size: 210mm 297mm;
                color: #666;
                content: "{{ $codigoCss }} · Página " counter(page) " de " counter(pages);
                font-family: 'Lexend', Arial, sans-serif;
                font-size: 8.6px;
                font-weight: 300;
                padding-top: 2mm;
                vertical-align: top;
            }
        }
        @page :first {
            @bottom-center {
                background-image: var(--fundo-primera-pagina);
            }
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        {{-- `overflow-wrap: anywhere` em tudo o que se imprime: um nome sem espaço
             quebra em vez de estourar a coluna, e o PDF nunca corta texto. --}}
        body {
            color: #3f3f3f;
            font-family: 'Lexend', Arial, sans-serif;
            font-size: 11px;
            font-weight: 300;
            overflow-wrap: anywhere;
        }

        {{-- O fundo de continuação cobre toda página física (o `position: fixed`
             se repete); o da primeira, com as barras, o cobre por cima. A altura
             do da primeira é a da área útil da página (297mm - a margem de 12mm). --}}
        .fundo-continuacion {
            background-image: var(--fundo-continuacion);
            background-position: 0 0;
            background-repeat: no-repeat;
            background-size: 210mm 297mm;
            inset: 0;
            position: fixed;
            z-index: -2;
        }
        .fundo-primera-pagina {
            background-image: var(--fundo-primera-pagina);
            background-position: 0 0;
            background-repeat: no-repeat;
            background-size: 210mm 297mm;
            height: 285mm;
            left: 0;
            position: absolute;
            top: 0;
            width: 210mm;
            z-index: -1;
        }

        {{-- Verificação: QR e identificação dividem com o logo a faixa do topo da
             página 1. É a única peça absoluta do documento, e a âncora é o TOPO
             da página 1 — nunca o pé, que é o que deslocava o rodapé antigo. --}}
        .identificacion {
            left: 18mm;
            position: absolute;
            top: 11mm;
            white-space: nowrap;
        }
        .identificacion img { display: block; height: 22mm; width: 22mm; }
        .identificacion .codigo {
            font-size: 10.5px;
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            margin-top: 1.4mm;
        }
        .identificacion .emitido { font-size: 9.7px; margin-top: 0.1mm; }
        .identificacion .aviso {
            color: #555;
            font-size: 8.5px;
            font-style: italic;
            margin-top: 1.3mm;
        }

        {{-- A tabela só existe para repetir o cabeçalho: o `thead` se repete em
             toda página física, e o corpo, que começa abaixo dele, é o fluxo. --}}
        table.paginas { border-collapse: collapse; table-layout: fixed; width: 100%; }
        table.paginas td { padding: 0; vertical-align: top; }
        table.paginas thead { display: table-header-group; }
        .cabecalho { height: 57mm; padding-top: 10.5mm; text-align: center; }
        .cabecalho img { height: 26mm; }

        {{-- `min-height`, NUNCA `height` — regra de segurança, não estilo: com
             altura definida o excedente é pintado POR CIMA da página seguinte.
             Aqui a folha só tem altura mínima (a área útil de uma página menos
             uma folga), para o aviso legal descer ao pé da última página; se o
             conteúdo passar, ela cresce e a paginação leva o excedente. --}}
        .hoja {
            display: flex;
            flex-direction: column;
            min-height: 227mm;
            padding: 0 18mm;
        }
        .hoja--temario { break-before: page; }

        h1 {
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 27px;
            font-weight: 800;
            letter-spacing: 0;
            margin: 12mm 0 0;
            text-align: center;
        }
        .centrado { text-align: center; }
        .apertura { font-size: 12.2px; margin: 6mm 0 0; }
        .alumno-nombre { font-size: 24px; font-weight: 600; margin: 9mm 0 0; }
        .alumno-rut { font-size: 13px; margin: 2.4mm 0 0; }
        .rotulo-curso { font-size: 12.2px; margin: 4.7mm 0 0; }
        .curso {
            border-top: 1px solid #c9c9c9;
            margin-top: 5.8mm;
            padding: 5.5mm 0 0;
        }
        .curso-nombre { color: #29a3e0; font-size: 18px; font-weight: 600; line-height: 1.25; }
        .curso-detalle { font-size: 10.8px; margin-top: 1.5mm; }
        .parrafo { font-size: 12px; line-height: 1.6; margin: 10mm 0 0; }
        .cliente {
            border-top: 1px solid #c9c9c9;
            margin-top: 4.7mm;
            padding-top: 4.2mm;
        }
        .cliente-nombre { font-size: 12px; font-weight: 600; }
        .cliente-rut { font-size: 10.5px; margin-top: 0.2mm; }
        .registro { font-size: 10.5px; margin: 3.2mm 0 0; }
        .registro strong { font-weight: 600; }

        {{-- Duas colunas iguais logo abaixo do corpo (não presas ao pé). A caixa
             tem altura fixa e a imagem se apoia no traço; sem imagem a caixa
             fica vazia e o resto não muda. O PNG já vem limpo do upload e entra
             como está; o `multiply` some qualquer resíduo claro no fundo. --}}
        .firmas {
            display: flex;
            gap: 22mm;
            margin: 13.7mm 10mm 0;
        }
        .firma { flex: 1 1 0; min-width: 0; text-align: center; }
        .firma-caja {
            align-items: flex-end;
            display: flex;
            height: 20mm;
            justify-content: center;
        }
        .firma-caja img {
            max-height: 20mm;
            max-width: 100%;
            mix-blend-mode: multiply;
        }
        .firma-linea { border-top: 1px solid #3f3f3f; margin-bottom: 2.2mm; }
        .firma-nombre { font-size: 10px; font-weight: 600; }
        .firma-cargo { font-size: 9px; margin-top: 0.4mm; }

        {{-- O aviso entra uma vez só, na última folha, e o `margin-top: auto` o
             leva ao pé dela quando o conteúdo é mais curto que a página. --}}
        .aviso-legal {
            font-size: 8.6px;
            line-height: 1.5;
            margin: auto 0 0;
            padding-top: 8mm;
            text-align: center;
            text-wrap: pretty;
        }

        {{-- Temário: um quadro com cabeçalho "Temario del curso | nome do curso" e
             os módulos dentro. Quebra só ENTRE módulos, e o título de um módulo
             nunca fica sozinho no fim da página. --}}
        .temario { border: 1px solid #c9c9c9; }
        .temario-cabecera { border-bottom: 1px solid #c9c9c9; display: flex; font-weight: 600; }
        .temario-cabecera > div { font-size: 10px; line-height: 1.5; padding: 2.7mm 3.4mm; }
        .temario-cabecera > div:first-child { align-items: center; border-right: 1px solid #c9c9c9; display: flex; flex: 0 0 34%; font-style: italic; }
        .temario-cabecera > div:last-child { flex: 1 1 0; min-width: 0; }
        .temario-cuerpo { padding: 0 4mm 7mm; }
        .modulo { break-inside: avoid; margin-top: 2.3mm; }
        .modulo + .modulo { margin-top: 3.5mm; }
        .modulo-titulo { break-after: avoid; font-size: 10px; font-weight: 600; }
        .modulo ul { list-style: disc; margin: 1mm 0 0; padding-left: 6mm; }
        .modulo li { font-size: 10px; line-height: 1.55; }
        .modulo li::marker { color: #3f3f3f; font-size: 8px; }
    </style>
</head>
<body>
@if ($muestra !== null)
<div style="position: fixed; top: 50%; left: 50%; z-index: 9999; width: 260mm; margin-left: -130mm; margin-top: -20mm; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 44px; font-weight: 800; line-height: 1; white-space: nowrap; color: rgba(200, 0, 0, 0.28); transform: rotate(-35deg); pointer-events: none;">{{ $muestra }}</div>
@endif
<div class="fundo-continuacion"></div>
<div class="fundo-primera-pagina"></div>
<div class="identificacion">
    <img src="data:image/svg+xml;base64,{{ $qr }}" alt="QR">
    <div class="codigo">N° {{ $certificate->codigo }}</div>
    @if ($emitidoNumerico !== null)
        <div class="emitido">Emitido el {{ $emitidoNumerico }}</div>
    @endif
    <div class="aviso">Verifique la autenticidad escaneando el código.</div>
</div>

<table class="paginas">
    <thead>
        <tr><td><div class="cabecalho"><img src="data:image/png;base64,{{ $logo }}" alt="LOTUS OTEC"></div></td></tr>
    </thead>
    <tbody>
    <tr><td>
<section class="hoja">
    <h1 class="centrado">CERTIFICADO DE CAPACITACIÓN</h1>

    <p class="apertura centrado">{{ $abertura }}</p>

    <div class="alumno-nombre centrado">{{ $snapshot->aluno->name }}</div>
    @if (trim((string) $snapshot->aluno->rut) !== '')
        <div class="alumno-rut centrado">RUT {{ $snapshot->aluno->rut }}</div>
    @endif

    <p class="rotulo-curso centrado">El trabajador participó en el curso:</p>

    <div class="curso centrado">
        <div class="curso-nombre">{{ $curso->name }}</div>
        <div class="curso-detalle">{{ $detalhe }}</div>
    </div>

    @if ($parrafo !== null)
        <p class="parrafo centrado">{{ $parrafo }}</p>
    @endif

    <div class="cliente centrado">
        <div class="cliente-nombre">{{ $snapshot->cliente->name }}</div>
        @if (trim((string) $snapshot->cliente->rut) !== '')
            <div class="cliente-rut">RUT {{ $snapshot->cliente->rut }}</div>
        @endif
    </div>

    <p class="registro centrado">N° de registro <strong>{{ $certificate->codigo }}</strong>@if ($certificate->valido_ate !== null) · Válido hasta el {{ $texto::fechaLarga($certificate->valido_ate->toDateString()) }}@endif</p>

    <div class="firmas">
        @foreach ([$assinaturas->gerente, $assinaturas->instrutor] as $firma)
            <div class="firma">
                <div class="firma-caja">@if ($firma->pngBase64 !== null)<img src="data:image/png;base64,{{ $firma->pngBase64 }}" alt="Firma de {{ $firma->nome }}">@endif</div>
                <div class="firma-linea"></div>
                <div class="firma-nombre">{{ $firma->nome }}</div>
                <div class="firma-cargo">{{ $firma->cargo }}</div>
            </div>
        @endforeach
    </div>

    @unless ($tieneTemario)
        <p class="aviso-legal">El otorgamiento del presente documento por parte de {{ $snapshot->emissor->name }}, no implica un reconocimiento de relación jurídica alguna con la persona identificada en él.</p>
    @endunless
</section>

@if ($tieneTemario)
    <section class="hoja hoja--temario">
        <div class="temario">
            <div class="temario-cabecera">
                <div>Temario del curso</div>
                <div>{{ $curso->name }}</div>
            </div>
            <div class="temario-cuerpo">
                @foreach ($curso->modules as $module)
                    <div class="modulo">
                        <div class="modulo-titulo">{{ $module->name }}</div>
                        @if ($module->bullets() !== [])
                            <ul>
                                @foreach ($module->bullets() as $item)
                                    <li>{{ $item }}</li>
                                @endforeach
                            </ul>
                        @endif
                    </div>
                @endforeach
            </div>
        </div>

        <p class="aviso-legal">El otorgamiento del presente documento por parte de {{ $snapshot->emissor->name }}, no implica un reconocimiento de relación jurídica alguna con la persona identificada en él.</p>
    </section>
@endif
    </td></tr>
    </tbody>
</table>
</body>
</html>
