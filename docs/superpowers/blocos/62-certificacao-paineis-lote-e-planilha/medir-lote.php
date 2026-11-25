<?php
// Medição do lote (medicao-gotenberg.md, seção "Lote"). Chamado por medir-lote.sh; a mão:
//   docker compose exec -T -e MODO=lote -e CONC=3 -e CERTS=30 -e MIX=misto app php < .../medir-lote.php
// MODO = lote (CertificatePdfService::renderMany, Http::pool com CONC) | serie (CertificatePdfService::render, um por vez).
// CERTS = quantos certificados; MIX = misto (1/3 sem temário, 1/3 com 5 módulos, 1/3 com 16) | grande (todos com 16 módulos, 3 páginas).
// DUMP = diretório (no container) onde cada PDF é gravado como <codigo>.pdf, para comparar os bytes entre braços.
// Imprime uma linha: modo, conc, certs, total em segundos, ms por certificado, bytes totais, falhas e o pico de memória do PHP (MiB).
require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Shared\Pdf\GotenbergHtmlToPdf;

$modo = getenv('MODO') ?: 'lote';
$conc = (int) (getenv('CONC') ?: 1);
$certs = (int) (getenv('CERTS') ?: 30);
$mix = getenv('MIX') ?: 'misto';
config(['app.certificate_validation_url' => 'https://valida.lotus.test', 'app.certificate_issuer.city' => 'Santiago', 'services.gotenberg.concurrency' => $conc]);

$modulos = function (int $n): array {
    $mods = [];
    for ($i = 1; $i <= $n; $i++) {
        $mods[] = ['sort_order' => $i, 'name' => "$i. Módulo $i de seguridad en instalaciones eléctricas de alta tensión", 'contents' => "Módulo $i, punto uno: reglamento\nMódulo $i, punto dos: normativa SEC\nMódulo $i, punto tres: responsabilidades"];
    }

    return $mods;
};
$lista = [];
for ($k = 0; $k < $certs; $k++) {
    $n = $mix === 'grande' ? 16 : [0, 5, 16][$k % 3];
    $snap = ['schema_version' => 2, 'aluno' => ['name' => 'ALUMNO NÚMERO '.($k + 1), 'rut' => '16.200.019-5'], 'curso' => ['name' => 'MANTENIMIENTO DE SUBESTACIONES', 'technical_name' => 'MANTENIMIENTO PREVENTIVO Y CORRECTIVO', 'workload_hours' => 32, 'description' => 'Mantenimiento preventivo y correctivo de subestaciones.', 'modules' => $modulos($n)], 'turma' => ['id' => null, 'start_date' => '2026-07-13', 'end_date' => '2026-08-07', 'modalidade' => 'presencial'], 'cliente' => ['name' => 'TRANSELEC S.A.', 'rut' => '78.987.654-1'], 'emissor' => ['name' => 'OTEC LOTUS SpA', 'rut' => '77.510.327-2'], 'redator' => ['name' => 'PEDRO SOTO', 'rut' => '9.876.543-3'], 'resultado' => ['grades' => ['final' => 6.5], 'approval_status' => 'aprobado', 'attendance_pct' => '95.00'], 'template' => ['version' => 2, 'city' => null], 'ciudad_emision' => 'Santiago', 'emitido_em' => '2026-08-05'];
    $lista[] = new Certificate(['codigo' => sprintf('LOT-2026-%04d', 1001 + $k), 'uuid' => sprintf('00000000-0000-4000-8000-%012d', $k), 'snapshot' => CertificateSnapshotData::fromArray($snap), 'valido_ate' => '2028-10-28']);
}

$svc = app()->make(CertificatePdfService::class, ['pdf' => new GotenbergHtmlToPdf]);
$dump = getenv('DUMP') ?: null;
if ($dump) {
    @mkdir($dump, 0777, true);
}
$falhas = 0;
$bytes = 0;
$t0 = hrtime(true);
if ($modo === 'serie') {
    foreach ($lista as $c) {
        try {
            $pdf = $svc->render($c);
            $bytes += strlen($pdf);
            $dump && file_put_contents("$dump/{$c->codigo}.pdf", $pdf);
        } catch (Throwable $e) {
            $falhas++;
        }
    }
} else {
    try {
        foreach ($svc->renderMany($lista) as $codigo => $pdf) {
            $bytes += strlen($pdf);
            $dump && file_put_contents("$dump/$codigo.pdf", $pdf);
        }
    } catch (Throwable $e) {
        $falhas = -1;
        fwrite(STDERR, $e->getMessage()."\n");
    }
}
$s = (hrtime(true) - $t0) / 1e9;
printf("modo=%s conc=%d certs=%d mix=%s total_s=%.2f ms_por_cert=%.0f bytes=%d falhas=%d php_pico_mib=%.0f\n", $modo, $conc, $certs, $mix, $s, $s * 1000 / $certs, $bytes, $falhas, memory_get_peak_usage(true) / 1048576);
