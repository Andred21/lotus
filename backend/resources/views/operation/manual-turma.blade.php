<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual de Clases — {{ $turma->course->name }}</title>
<style>
    body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #111; margin: 32px; }
    h1 { font-size: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
    h2 { font-size: 15px; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #eee; }
    .meta td:first-child { font-weight: bold; width: 30%; background: #f6f6f6; }
</style>
</head>
<body>
    <h1>Manual de Clases — {{ $turma->course->name }}</h1>

    <h2>Datos de la clase</h2>
    <table class="meta">
        <tr><td>Cliente</td><td>{{ $turma->quote->budget->client->legal_name }}</td></tr>
        <tr><td>Curso</td><td>{{ $turma->course->name }} ({{ $turma->course->workload_hours }} h)</td></tr>
        <tr><td>Modalidad</td><td>{{ $turma->modalidade->value }}</td></tr>
        @if ($turma->local_aplicacao)
            <tr><td>Lugar de aplicación</td><td>{{ $turma->local_aplicacao }}</td></tr>
        @endif
        <tr><td>Fecha de inicio</td><td>{{ $turma->start_date->format('d-m-Y') }}</td></tr>
        <tr><td>Fecha de término</td><td>{{ $turma->end_date->format('d-m-Y') }}</td></tr>
        <tr><td>Relator(es)</td><td>{{ $turma->redatores->map(fn ($r) => $r->user->name)->implode(', ') ?: '—' }}</td></tr>
    </table>

    <h2>Contenido programático</h2>
    <table>
        <tr><th>#</th><th>Módulo</th><th>Objetivos</th><th>Contenidos</th><th>Horas T</th><th>Horas P</th></tr>
        @foreach ($turma->course->modules->sortBy('sort_order') as $i => $module)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $module->name }}</td>
                <td>{{ $module->learnings }}</td>
                <td>{{ $module->contents }}</td>
                <td>{{ $module->theory_hours }}</td>
                <td>{{ $module->practice_hours }}</td>
            </tr>
        @endforeach
    </table>

    <h2>Participantes</h2>
    <table>
        <tr><th>#</th><th>Nombre</th><th>RUT</th><th>Firma</th></tr>
        @forelse ($turma->enrollments as $i => $enrollment)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $enrollment->student->user->name }}</td>
                <td>{{ $enrollment->student->user->rut }}</td>
                <td></td>
            </tr>
        @empty
            <tr><td colspan="4">Sin participantes matriculados.</td></tr>
        @endforelse
    </table>
</body>
</html>
