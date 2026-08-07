@php
    use Illuminate\Support\Carbon;

    /**
     * Documento oficial da Lotus (`docs/templates/certificado.pdf`), montado a
     * partir do snapshot congelado — nunca das relações vivas (D12, §4.7). Todo
     * campo ausente OMITE a linha em vez de imprimir zero ou vazio (D-P7).
     */
    $snapshot = $certificate->snapshot;
    $curso = $snapshot['curso'];
    // `?? ` em vez do default do `data_get`: o default só cobre chave AUSENTE,
    // e snapshot antigo pode trazer a chave com `null` — foi assim que
    // `curso.modules: null` derrubou o PDF em 500 (R-1).
    $description = data_get($snapshot, 'curso.description');
    $modules = data_get($snapshot, 'curso.modules') ?? [];
    $technicalName = data_get($snapshot, 'curso.technical_name');
    $clienteRut = data_get($snapshot, 'cliente.rut');
    $emissorName = data_get($snapshot, 'emissor.name')
        ?? config('app.certificate_issuer.name');
    $emissorRut = data_get($snapshot, 'emissor.rut')
        ?? config('app.certificate_issuer.rut');
    $grade = data_get($snapshot, 'resultado.grades.final');
    $attendance = data_get($snapshot, 'resultado.attendance_pct');

    $fecha = fn (?string $iso) => $iso === null ? null : Carbon::parse($iso)->format('d-m-Y');
    $inicio = $fecha(data_get($snapshot, 'turma.start_date'));
    $termino = $fecha(data_get($snapshot, 'turma.end_date'));
    $periodo = $inicio !== null && $termino !== null
        ? ($inicio === $termino
            ? "el día {$inicio}"
            : "entre el {$inicio} y el {$termino}")
        : null;

    // `contents` é texto livre autoral (migration de `course_modules`): cada
    // linha é um item do temário, com ou sem marcador escrito à mão.
    $bullets = fn (?string $contents) => collect(preg_split('/\R/', (string) $contents))
        ->map(fn (string $line) => preg_replace(
            '/^[ \t]*(?:[*•–—-](?=[ \t]|$))[ \t]*/u',
            '',
            trim($line),
        ) ?? trim($line))
        ->filter()
        ->all();
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado {{ $certificate->codigo }}</title>
    <style>
        /* O documento oficial é A4 retrato, e a página do temário só fecha
           nessa orientação — por isso ela é fixa (D-P9). */
        @page { size: A4 portrait; margin: 0; }
        * { box-sizing: border-box; }
        body {
            color: #3f3f3f;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            margin: 0;
        }
        .page {
            display: flex;
            flex-direction: column;
            min-height: 297mm;
            padding: 14mm 16mm 8mm;
            page-break-after: always;
            position: relative;
        }
        .page:last-child { page-break-after: auto; }
        .accent {
            background: linear-gradient(90deg, #29a3e0 0%, #29a3e0 55%, #9aa0a6 55%, #9aa0a6 100%);
            height: 4mm;
            left: 0;
            position: absolute;
            right: 0;
        }
        .accent-top { top: 0; }
        .accent-bottom { bottom: 0; }

        .meta { font-size: 9px; line-height: 1.6; }
        .brand { margin: 2mm 0 6mm; text-align: center; }
        .brand img { height: 26mm; }

        h1 {
            color: #3f3f3f;
            font-size: 24px;
            letter-spacing: 1px;
            margin: 0 0 7mm;
            text-align: center;
        }
        .lead { font-size: 12px; margin: 0 0 6mm; text-align: center; }
        .name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 2mm;
            text-align: center;
        }
        .rut { font-size: 15px; margin-bottom: 5mm; text-align: center; }
        .company { font-size: 13px; font-weight: bold; margin-bottom: 5mm; text-align: center; }
        .course {
            color: #29a3e0;
            font-size: 17px;
            font-weight: bold;
            margin: 3mm 0 5mm;
            text-align: center;
        }
        .course small { color: #3f3f3f; display: block; font-size: 10px; font-weight: normal; }
        .narrative { line-height: 1.7; margin: 0 0 4mm; text-align: justify; }
        .registro { margin-top: 6mm; text-align: center; }

        .certificate-footer {
            break-inside: avoid;
            margin-top: auto;
            page-break-inside: avoid;
            padding-top: 6mm;
        }
        .footer-main {
            align-items: flex-end;
            display: flex;
            justify-content: space-between;
            min-height: 40mm;
        }
        .signature {
            margin-bottom: 16mm;
            text-align: center;
            width: 70mm;
        }
        .signature-name { font-weight: bold; margin-bottom: 1mm; }
        .signature-line { border-top: 1px solid #3f3f3f; padding-top: 1mm; }

        .qr { width: 46mm; }
        .qr img { display: block; height: 32mm; width: 32mm; }
        .qr span { display: block; font-size: 8px; line-height: 1.4; margin-top: 1mm; }

        .disclaimer {
            font-size: 8px;
            line-height: 1.5;
            margin: 15mm 0 0;
            text-align: justify;
        }
        .certificate-footer--disclaimer { padding-top: 8mm; }
        .certificate-footer--disclaimer .disclaimer { margin-top: 0; }

        .temario-head {
            border: 1px solid #c9c9c9;
            border-collapse: collapse;
            margin-bottom: 5mm;
            width: 100%;
        }
        .temario-head td { border: 1px solid #c9c9c9; font-size: 10px; padding: 2mm 3mm; }
        .temario-head td:first-child { font-weight: bold; width: 34%; }
        .temario-section { font-size: 10px; font-weight: bold; margin: 4mm 0 1mm; }
        .temario-list { margin: 0; padding-left: 6mm; }
        .temario-list li { line-height: 1.6; }
    </style>
</head>
<body>
<section class="page">
    <div class="accent accent-top"></div>

    <div class="meta">
        N° {{ $certificate->codigo }}<br>
        Emisión: {{ $fecha($snapshot['emitido_em']) }}
    </div>

    <div class="brand">
        <img src="data:image/png;base64,{{ $logo }}" alt="LOTUS OTEC">
    </div>

    <h1>CERTIFICADO DE CAPACITACIÓN</h1>

    <p class="lead">
        En {{ $snapshot['ciudad_emision'] }} a {{ $fecha($snapshot['emitido_em']) }},
        {{ $emissorName }} [{{ $emissorRut }}] certifica que:
    </p>

    <div class="name">{{ $snapshot['aluno']['name'] }}</div>
    <div class="rut">{{ $snapshot['aluno']['rut'] }}</div>
    <div class="company">{{ $snapshot['cliente']['name'] }}</div>

    @if ($clienteRut)
        <p class="lead">
            El trabajador de la empresa RUT: {{ $clienteRut }},
            participó en el curso:
        </p>
    @endif

    <div class="course">
        {{ $curso['name'] }}
        @if ($technicalName)
            <small>{{ $technicalName }}</small>
        @endif
        <small>{{ $curso['workload_hours'] }} horas cronológicas</small>
    </div>

    @if ($description)
        {{-- O original encaixa a descrição DENTRO da frase ("…, abordó las
             responsabilidades…"), o que só fecha se o texto do curso começar por
             verbo. `courses.description` é livre e costuma ser sintagma nominal,
             então a frase se fecha antes e a descrição vira parágrafo próprio —
             o verbo "abordó" do original permanece. --}}
        @if ($periodo !== null)
            <p class="narrative">La actividad realizada {{ $periodo }} abordó los siguientes contenidos:</p>
        @endif
        <p class="narrative">{{ $description }}</p>
    @elseif ($periodo !== null)
        <p class="narrative">La actividad fue realizada {{ $periodo }}.</p>
    @endif

    @if ($grade !== null)
        <p class="narrative">El trabajador logró aprobar el curso con nota {{ $grade }}.</p>
    @endif
    @if ($attendance !== null)
        <p class="narrative">Asistencia registrada: {{ $attendance }}%.</p>
    @endif
    @if ($certificate->valido_ate !== null)
        <p class="narrative">Este certificado es válido hasta el
            {{ $certificate->valido_ate->format('d-m-Y') }}.</p>
    @endif

    <p class="registro">
        El N° de Registro de este documento es el : {{ $certificate->codigo }};
    </p>

    <div class="certificate-footer">
        <div class="footer-main">
            <div class="qr">
                <img src="data:image/svg+xml;base64,{{ $qr }}" alt="QR">
                <span>Verifique la autenticidad de este certificado escaneando el código.</span>
            </div>

            <div class="signature">
                <div class="signature-name">{{ $snapshot['redator']['name'] }}</div>
                <div class="signature-line">Instructor</div>
            </div>
        </div>

        <p class="disclaimer">
            El otorgamiento del presente documento por parte de {{ $emissorName }}, no implica un
            reconocimiento de relación jurídica alguna con la persona identificada en él.
        </p>
    </div>

    <div class="accent accent-bottom"></div>
</section>

@if ($modules !== [])
    <section class="page">
        <div class="accent accent-top"></div>

        <div class="brand">
            <img src="data:image/png;base64,{{ $logo }}" alt="LOTUS OTEC">
        </div>

        <table class="temario-head">
            <tr>
                <td>Temario del Curso:</td>
                <td>{{ $curso['name'] }}</td>
            </tr>
        </table>

        @foreach ($modules as $module)
            <div class="temario-section">{{ data_get($module, 'name') }}</div>
            @if ($bullets(data_get($module, 'contents')) !== [])
                <ul class="temario-list">
                    @foreach ($bullets(data_get($module, 'contents')) as $item)
                        <li>{{ $item }}</li>
                    @endforeach
                </ul>
            @endif
        @endforeach

        <div class="certificate-footer certificate-footer--disclaimer">
            <p class="disclaimer">
                El otorgamiento del presente documento por parte de {{ $emissorName }}, no implica un
                reconocimiento de relación jurídica alguna con la persona identificada en él.
            </p>
        </div>

        <div class="accent accent-bottom"></div>
    </section>
@endif
</body>
</html>
