@php
    use Illuminate\Support\Carbon;

    /**
     * Documento oficial da Lotus (`docs/templates/certificado.pdf`), montado a
     * partir do snapshot congelado — nunca das relações vivas (D12, §4.7). Todo
     * campo ausente OMITE a linha em vez de imprimir zero ou vazio (D-P7).
     *
     * O snapshot chega tipado (`CertificateSnapshotData`): a tolerância a
     * versão antiga do schema mora nele, não em defesa espalhada por aqui.
     */
    $snapshot = $certificate->snapshot;
    $curso = $snapshot->curso;
    $periodo = $snapshot->turma->periodo();
    $grade = $snapshot->resultado->finalGrade();
    $attendance = $snapshot->resultado->attendance_pct;

    $fecha = fn (?string $iso) => $iso === null ? null : Carbon::parse($iso)->format('d-m-Y');
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
        /* Altura FIXA, não mínima. Com `min-height` a folha crescia junto com a
           descrição do curso e levava o rodapé para a página seguinte — com
           3.689 caracteres o certificado saía em 3 páginas, rodapé/QR/assinatura
           na página 2 (gate de 2026-08-07). `flex-shrink: 0` em tudo menos na
           descrição declara QUEM cede espaço quando falta, e o rodapé
           (`margin-top: auto`) volta a ancorar no pé da folha em qualquer
           combinação de conteúdo. Esta é a garantia estrutural; o clamp abaixo
           é só o aviso visível. */
        .page--certificado { height: 297mm; }
        .page--certificado > * { flex-shrink: 0; }

        /* `courses.description` é o único campo de tamanho livre do documento —
           por isso é ele que cede. O limite mora AQUI e não em `.narrative`
           porque nota, assistência e vigência também são `.narrative`, e essas
           NUNCA podem ser cortadas.

           `-webkit-line-clamp` com inteiro é o único mecanismo que este
           Chromium (m149) marca com reticências: medido, `line-clamp: auto`,
           `block-ellipsis` e `text-overflow` cortam mudos no meio da linha. Daí
           o inteiro, calibrado no pior caso (nota + assistência + vigência
           presentes) contra o PDF real: 7 linhas a 11px, 10 a 9px. */
        .narrative--contenidos {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 7;
            flex-shrink: 1;
            min-height: 0;
            overflow: hidden;
        }
        /* Acima do limiar o corpo cai para 9px e cabem ~1.300 caracteres em vez
           de ~700 — só o que passar disso vira reticências. */
        .narrative--compact { font-size: 9px; line-height: 1.5; -webkit-line-clamp: 10; }
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
<section class="page page--certificado">
    <div class="accent accent-top"></div>

    <div class="meta">
        N° {{ $certificate->codigo }}<br>
        Emisión: {{ $fecha($snapshot->emitido_em) }}
    </div>

    <div class="brand">
        <img src="data:image/png;base64,{{ $logo }}" alt="LOTUS OTEC">
    </div>

    <h1>CERTIFICADO DE CAPACITACIÓN</h1>

    <p class="lead">
        En {{ $snapshot->ciudad_emision }} a {{ $fecha($snapshot->emitido_em) }},
        {{ $snapshot->emissor->name }} [{{ $snapshot->emissor->rut }}] certifica que:
    </p>

    <div class="name">{{ $snapshot->aluno->name }}</div>
    <div class="rut">{{ $snapshot->aluno->rut }}</div>
    <div class="company">{{ $snapshot->cliente->name }}</div>

    @if ($snapshot->cliente->rut)
        <p class="lead">
            El trabajador de la empresa RUT: {{ $snapshot->cliente->rut }},
            participó en el curso:
        </p>
    @endif

    <div class="course">
        {{ $curso->name }}
        @if ($curso->technical_name)
            <small>{{ $curso->technical_name }}</small>
        @endif
        <small>{{ $curso->workload_hours }} horas cronológicas</small>
    </div>

    @if ($curso->description)
        {{-- O original encaixa a descrição DENTRO da frase ("…, abordó las
             responsabilidades…"), o que só fecha se o texto do curso começar por
             verbo. `courses.description` é livre e costuma ser sintagma nominal,
             então a frase se fecha antes e a descrição vira parágrafo próprio —
             o verbo "abordó" do original permanece. --}}
        @if ($periodo !== null)
            <p class="narrative">La actividad realizada {{ $periodo }} abordó los siguientes contenidos:</p>
        @endif
        {{-- 700 = as 7 linhas do clamp a 11px (~100 caracteres por linha nos
             178mm úteis). Abaixo do limiar o clamp nunca morde e o parágrafo
             sai idêntico ao que sempre saiu; acima, 9px preserva mais texto. --}}
        @php $narrativeCompact = mb_strlen($curso->description) > 700; @endphp
        <p class="narrative narrative--contenidos {{ $narrativeCompact ? 'narrative--compact' : '' }}">{{ $curso->description }}</p>
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
                <div class="signature-name">{{ $snapshot->redator->name }}</div>
                <div class="signature-line">Instructor</div>
            </div>
        </div>

        <p class="disclaimer">
            El otorgamiento del presente documento por parte de {{ $snapshot->emissor->name }}, no implica un
            reconocimiento de relación jurídica alguna con la persona identificada en él.
        </p>
    </div>

    <div class="accent accent-bottom"></div>
</section>

@if ($curso->modules !== [])
    <section class="page">
        <div class="accent accent-top"></div>

        <div class="brand">
            <img src="data:image/png;base64,{{ $logo }}" alt="LOTUS OTEC">
        </div>

        <table class="temario-head">
            <tr>
                <td>Temario del Curso:</td>
                <td>{{ $curso->name }}</td>
            </tr>
        </table>

        @foreach ($curso->modules as $module)
            <div class="temario-section">{{ $module->name }}</div>
            @if ($module->bullets() !== [])
                <ul class="temario-list">
                    @foreach ($module->bullets() as $item)
                        <li>{{ $item }}</li>
                    @endforeach
                </ul>
            @endif
        @endforeach

        <div class="certificate-footer certificate-footer--disclaimer">
            <p class="disclaimer">
                El otorgamiento del presente documento por parte de {{ $snapshot->emissor->name }}, no implica un
                reconocimiento de relación jurídica alguna con la persona identificada en él.
            </p>
        </div>

        <div class="accent accent-bottom"></div>
    </section>
@endif
</body>
</html>
