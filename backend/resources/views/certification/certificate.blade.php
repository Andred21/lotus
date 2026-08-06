@php
    $snapshot = $certificate->snapshot;
    $layout = $snapshot['template']['layout_config'];
    $orientation = ($layout['orientation'] ?? null) === 'portrait' ? 'portrait' : 'landscape';
    $grade = data_get($snapshot, 'resultado.grades.final');
    $attendance = data_get($snapshot, 'resultado.attendance_pct');
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Certificado {{ $certificate->codigo }}</title>
    <style>
        @page { size: A4 {{ $orientation }}; margin: 18mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #16233a;
            font-family: DejaVu Sans, sans-serif;
            font-size: 13px;
        }
        .certificate {
            min-height: 170mm;
            border: 3px solid #19365f;
            padding: 18mm;
            position: relative;
            text-align: center;
        }
        h1 {
            font-size: 30px;
            letter-spacing: 5px;
            margin: 0 0 8mm;
        }
        .code { font-weight: bold; margin-bottom: 10mm; }
        .statement { font-size: 16px; line-height: 1.7; margin: 0 auto; max-width: 85%; }
        .student { font-size: 23px; font-weight: bold; margin: 5mm 0 2mm; }
        .details { line-height: 1.7; margin-top: 7mm; }
        .result { display: inline-block; margin: 0 5mm; }
        .footer {
            align-items: end;
            bottom: 14mm;
            display: flex;
            justify-content: space-between;
            left: 18mm;
            position: absolute;
            right: 18mm;
        }
        .signature { min-width: 65mm; text-align: center; }
        .signature-line { border-top: 1px solid #16233a; margin-bottom: 2mm; }
        .qr img { display: block; height: 36mm; margin: 0 auto 2mm; width: 36mm; }
        .qr { font-size: 9px; max-width: 48mm; overflow-wrap: anywhere; }
    </style>
</head>
<body>
<main class="certificate">
    <h1>CERTIFICADO</h1>
    <div class="code">{{ $certificate->codigo }}</div>

    <p class="statement">Se certifica que</p>
    <div class="student">{{ $snapshot['aluno']['name'] }}</div>
    <div>RUT {{ $snapshot['aluno']['rut'] }}</div>
    <p class="statement">
        completó satisfactoriamente el curso
        <strong>{{ $snapshot['curso']['name'] }}</strong>
        @if ($snapshot['curso']['technical_name'])
            ({{ $snapshot['curso']['technical_name'] }})
        @endif
        con una duración de {{ $snapshot['curso']['workload_hours'] }} horas.
    </p>

    <div class="details">
        <div>Empresa: {{ $snapshot['cliente']['name'] }} · RUT {{ $snapshot['cliente']['rut'] }}</div>
        <div>
            Período: {{ $snapshot['turma']['start_date'] }} al {{ $snapshot['turma']['end_date'] }}
            · Modalidad: {{ $snapshot['turma']['modalidade'] }}
        </div>
        @if ($grade !== null)
            <div class="result"><strong>Nota final:</strong> {{ $grade }}</div>
        @endif
        @if ($attendance !== null)
            <div class="result"><strong>Asistencia:</strong> {{ $attendance }}%</div>
        @endif
        @if ($certificate->valido_ate !== null)
            <div>Válido hasta: {{ $certificate->valido_ate->format('Y-m-d') }}</div>
        @endif
        <div>{{ $snapshot['ciudad_emision'] }}, {{ $snapshot['emitido_em'] }}</div>
    </div>

    <div class="footer">
        <div class="signature">
            <div class="signature-line"></div>
            <strong>{{ $snapshot['redator']['name'] }}</strong><br>
            RUT {{ $snapshot['redator']['rut'] }}
        </div>
        <div class="qr">
            <img src="data:image/svg+xml;base64,{{ $qr }}" alt="QR">
            Verifique este certificado con su código QR.<br>
            UUID {{ $certificate->uuid }}
        </div>
    </div>
</main>
</body>
</html>
