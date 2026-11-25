<?php
// Medição do bloco 62 (medicao-gotenberg.md). Da raiz da lane, com o stack de pé:
//   docker compose exec -T -e N=10 -e OUT=/tmp/62-antes -e EXTRA='{"skipNetworkAlmostIdleEvent":"true"}' app php < docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medir-gotenberg.php
// MODULOS = módulos do temário (default 16). N = renders; OUT = onde fica o primeiro PDF (no container); EXTRA = campos a mais no formulário do Gotenberg.
// Imprime a mediana e o máximo do html() (PHP, por reflexão) e da conversão (Gotenberg), e o tamanho do HTML.
require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Domains\Certification\Data\Snapshot\CertificateSnapshotData;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificatePdfService;
use App\Shared\Pdf\GotenbergHtmlToPdf;
use App\Shared\Pdf\PageOptions;

config(['app.certificate_validation_url' => 'https://valida.lotus.test', 'app.certificate_issuer.city' => 'Santiago']);
$mods = [];
$modulos = getenv('MODULOS') !== false ? (int) getenv('MODULOS') : 16; // 16 = temario_grande (3 páginas); 0 = sem temário
for ($i = 1; $i <= $modulos; $i++) {
    $mods[] = ['sort_order' => $i, 'name' => "$i. Módulo $i de seguridad en instalaciones eléctricas de alta tensión", 'contents' => "Módulo $i, punto uno: reglamento\nMódulo $i, punto dos: normativa SEC\nMódulo $i, punto tres: responsabilidades"];
}
$snap = ['schema_version' => 2, 'aluno' => ['name' => 'SEBASTIÁN GALLARDO', 'rut' => '16.200.019-5'], 'curso' => ['name' => 'MANTENIMIENTO DE SUBESTACIONES', 'technical_name' => 'MANTENIMIENTO PREVENTIVO Y CORRECTIVO', 'workload_hours' => 32, 'description' => 'Mantenimiento preventivo y correctivo de subestaciones.', 'modules' => $mods], 'turma' => ['id' => null, 'start_date' => '2026-07-13', 'end_date' => '2026-08-07', 'modalidade' => 'presencial'], 'cliente' => ['name' => 'TRANSELEC S.A.', 'rut' => '78.987.654-1'], 'emissor' => ['name' => 'OTEC LOTUS SpA', 'rut' => '77.510.327-2'], 'redator' => ['name' => 'PEDRO SOTO', 'rut' => '9.876.543-3'], 'resultado' => ['grades' => ['final' => 6.5], 'approval_status' => 'aprobado', 'attendance_pct' => '95.00'], 'template' => ['version' => 2, 'city' => null], 'ciudad_emision' => 'Santiago', 'emitido_em' => '2026-10-28'];
$cert = new Certificate(['codigo' => 'LOT-2026-1001', 'uuid' => '00000000-0000-4000-8000-000000000001', 'snapshot' => CertificateSnapshotData::fromArray($snap), 'valido_ate' => '2028-10-28']);
$svc = app()->make(CertificatePdfService::class, ['pdf' => new GotenbergHtmlToPdf]);
$html = new ReflectionMethod($svc, 'html');
$n = (int) (getenv('N') ?: 10);
$out = getenv('OUT') ?: '/tmp/62';
@mkdir($out, 0777, true);
$tp = [];
$tg = [];
$size = 0;
for ($k = 0; $k < $n; $k++) {
    $t0 = hrtime(true);
    $h = $html->invoke($svc, $cert, false);
    $t1 = hrtime(true);
    $pdf = Illuminate\Support\Facades\Http::attach("files", $h, "index.html")->post(rtrim(config("services.gotenberg.url"),"/")."/forms/chromium/convert/html", array_merge(["preferCssPageSize"=>"true"], json_decode(getenv("EXTRA") ?: "{}", true)))->throw()->body();
    $t2 = hrtime(true);
    $tp[] = ($t1 - $t0) / 1e6;
    $tg[] = ($t2 - $t1) / 1e6;
    $size = strlen($h);
    if ($k === 0) {
        file_put_contents("$out/cert.pdf", $pdf);
    }
}
$med = function ($a) { sort($a); $c = count($a); return $c % 2 ? $a[intdiv($c, 2)] : ($a[$c / 2 - 1] + $a[$c / 2]) / 2; };
printf("html_bytes=%d php_med=%.1fms php_max=%.1fms gotenberg_med=%.1fms gotenberg_max=%.1fms\n", $size, $med($tp), max($tp), $med($tg), max($tg));
printf("php=%s\ngot=%s\n", implode(',', array_map(fn ($x) => round($x, 1), $tp)), implode(',', array_map(fn ($x) => round($x, 1), $tg)));
