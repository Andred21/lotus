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

    /**
     * Elisão da descrição do curso. Os três números moram JUNTOS porque são um
     * ajuste só: o clamp é impresso no CSS a partir daqui e o limiar é o produto
     * dos outros dois. Antes o clamp estava no `<style>` e o limiar 120 linhas
     * abaixo, ligados só por prosa — divergiam em silêncio.
     *
     * O limiar troca o tier de 11px pelo de 9px ANTES de o clamp de 11px morder.
     * Ele precisa ficar abaixo da MENOR capacidade das 7 linhas de 11px, e essa
     * capacidade depende de como o texto quebra. Medido no PDF real, varrendo o
     * comprimento da descrição até as reticências aparecerem (2026-08-08):
     *
     *   prosa espanhola comum .................. 806 chars
     *   prosa técnica real (palavra ~12,6) ..... 771
     *   palavras uniformes de 12/16/18/20 ...... 726 / 712 / 671 / 604
     *   palavras uniformes de 22/24/25/26 ...... 652 / 700 / 567 / 586
     *   palavras uniformes de 28/30/32 ......... 622 / 657 / 694
     *
     * Não é monotônico: a capacidade despenca quando o comprimento da palavra
     * cai logo acima de um divisor da linha e sobra um vão morto por linha.
     * 567 é o piso DENTRO do espanhol real — palavras de 25 caracteres, a
     * ordem das mais longas do idioma —, não o piso absoluto. Daí 80 × 7 = 560,
     * logo abaixo dele: errar para baixo custa tipografia (600 caracteres de
     * prosa comum caberiam a 11px e saem a 9px), errar para cima custa texto.
     *
     * Fora desse perfil o modelo não vale e o limiar não protege: com palavras
     * de 33 caracteres a capacidade cai para 508 (remedido em 2026-08-08 no PDF
     * real — 508 caracteres saem inteiros, 509 já saem elididos), abaixo dos
     * 560, e a descrição é elidida ainda a 11px. Este é o mesmo 508 citado no
     * `CertificatePdfTest`; não há duas medições, há uma com faixa de validade.
     *
     * O limiar é, portanto, ajuste de QUALIDADE e não de segurança: quem
     * garante que nada some calado são o clamp inteiro e o `min-height` da
     * folha, não este número — a elisão fora do perfil continua COM reticências.
     *
     * Acima do limiar o tier de 9px comporta ~1.370 (técnica) a ~1.430 (prosa)
     * caracteres; só o que passar disso vira reticências.
     */
    $narrativeLines = 7;
    $narrativeLinesCompact = 10;
    $narrativeCharsPerLine = 80;
    $narrativeCompact = mb_strlen($curso->description ?? '')
        > $narrativeLines * $narrativeCharsPerLine;
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
        /* `min-height`, NUNCA `height` — isto é regra de segurança, não estilo.

           Com altura DEFINIDA a folha vira uma caixa que não pagina: o Chromium
           pinta o excedente POR CIMA da página seguinte. Medido em 2026-08-08,
           com nome de curso de 147, nome técnico de 179 e nome de cliente de
           100 caracteres: QR, assinatura e aviso legal do certificado saíram
           sobrepostos ao temário — QR sobre o logo, assinatura sobre o
           cabeçalho, disclaimer atravessando a tabela. Documento corrompido, e
           sem nenhum aviso.

           Com `min-height` a folha cresce e a paginação normal leva o excedente
           para uma página limpa: feio, porém íntegro. Nada é recortado nem
           sobreposto — e o que sobra de conteúdo com peso legal (nomes de
           aluno, curso e cliente) continua legível por inteiro.

           QUANDO ela cresce, medido no PDF real em 2026-08-08 com a descrição
           de 3.689 caracteres do cenário do gate:

             pior caso (nota + assistência + vigência) — a página 1 fecha com
             ~2 pt de folga, ou seja ZERO linha extra. O nome do curso a 17px
             cabe em uma linha até 67 caracteres; na primeira quebra para a
             segunda linha o rodapé inteiro cai para uma página 2 (penhasco em
             68 caracteres na prosa medida; 67 com palavras longas, 70 com
             palavras curtas). O nome técnico a 10px só quebra além de 130.

             cenário do gate (só vigência) — a folga é ~52 pt, e nem um nome de
             255 caracteres (o limite da coluna) estoura a folha.

           O maior `courses.name` real hoje tem 36 caracteres e o maior
           `technical_name`, 65 — ambos com folga. Mas a coluna é `string(255)`
           e não há validação de comprimento: um título regulatório extenso
           alcança o penhasco com dado que o schema aceita. Encolher o clamp em
           função do nome exigiria modelar quebra de linha em PHP; o que cortar
           é decisão de negócio, e está com o João. */
        .page {
            background-image: url("data:image/jpeg;base64,{{ $fundo }}");
            background-origin: border-box;
            background-position: top center;
            /* `repeat-y` com slab de 297mm, NUNCA `100% 100%`: a folha usa
               `min-height` e pode crescer: esticar deformaria as barras, e
               repetir dá à página excedente o fundo dela. */
            background-repeat: repeat-y;
            background-size: 100% 297mm;
            display: flex;
            flex-direction: column;
            min-height: 297mm;
            padding: 14mm 16mm 8mm;
            page-break-after: always;
            position: relative;
        }
        .page:last-child { page-break-after: auto; }

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
        /* `courses.description` é o único campo de tamanho livre do documento —
           por isso é ele que cede. O limite mora AQUI e não em `.narrative`
           porque nota, assistência e vigência também são `.narrative`, e essas
           NUNCA podem ser cortadas.

           `-webkit-line-clamp` com inteiro é o único mecanismo que este
           Chromium (m149) marca com reticências: medido, `line-clamp: auto`,
           `block-ellipsis` e `text-overflow` cortam mudos no meio da linha.

           O clamp é o que impede a descrição de empurrar o rodapé para fora da
           folha — e impede COM aviso. Os números vêm do `@php` do topo, junto
           do limiar que eles derivam. */
        .narrative--contenidos {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: {{ $narrativeLines }};
            overflow: hidden;
        }
        .narrative--compact {
            font-size: 9px;
            line-height: 1.5;
            -webkit-line-clamp: {{ $narrativeLinesCompact }};
        }
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
        {{-- Abaixo do limiar (ver o `@php` do topo) o clamp nunca morde e o
             parágrafo sai idêntico ao que sempre saiu; acima, 9px preserva
             mais texto antes das reticências. --}}
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
</section>

@if ($curso->modules !== [])
    <section class="page">
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
    </section>
@endif
</body>
</html>
