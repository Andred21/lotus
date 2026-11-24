<?php

use App\Domains\Certification\Http\Controllers\CertificateController;
use App\Domains\Certification\Http\Controllers\CertificatePreviewController;
use App\Domains\Certification\Http\Controllers\CertificateSettingsController;
use App\Domains\Certification\Http\Controllers\PublicCertificateController;
use Illuminate\Support\Facades\Route;

// Anônimas de propósito (validação do QR, peso legal): o QR é o papel, quem
// tem o uuid tem o certificado. Por isso a única contenção possível é por IP.
// `whereUuid`: o que não é uuid nem chega ao controller (nem ao banco).
Route::get('publico/certificados/{uuid}', [PublicCertificateController::class, 'show'])
    ->whereUuid('uuid')
    ->middleware('throttle:public-certificate');
// Renderiza no Gotenberg a cada requisição, como o PDF do painel: o limitador
// é mais apertado que o da validação pelo mesmo motivo (spec D6).
Route::get('publico/certificados/{uuid}/pdf', [PublicCertificateController::class, 'pdf'])
    ->whereUuid('uuid')
    ->middleware('throttle:public-certificate-pdf');

Route::middleware('auth.active')->group(function () {
    Route::post('enrollments/{enrollment}/certificate', [CertificateController::class, 'store']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::get('certificates/emission-panel', [CertificateController::class, 'emissionPanel']);
    Route::post('certificates/batch', [CertificateController::class, 'batch'])
        ->middleware('throttle:certificate-batch');
    // Renderiza no Gotenberg a CADA requisição — nada é cacheado nem lido do
    // bucket. É a rota mais cara do sistema, e o limitador é a contenção dela
    // (spec D6); persistir o PDF ficou fora do bloco de propósito.
    Route::get('certificates/{certificate}/pdf', [CertificateController::class, 'pdf'])
        ->middleware('throttle:certificate-pdf');
    // Amostra do certificado do curso: o mesmo Gotenberg por requisição do PDF
    // real, então o mesmo limitador.
    Route::get('courses/{course}/certificate-preview', [CertificatePreviewController::class, 'show'])
        ->whereNumber('course')
        ->middleware('throttle:certificate-pdf');
    Route::get('certificates/{certificate}', [CertificateController::class, 'show']);
    Route::post('certificates/{certificate}/revoke', [CertificateController::class, 'revoke']);

    // Configuración › Certificados (spec D3): singleton, só o superadmin.
    Route::get('certificate-settings', [CertificateSettingsController::class, 'show']);
    Route::put('certificate-settings', [CertificateSettingsController::class, 'update']);
    Route::post('certificate-settings/signature', [CertificateSettingsController::class, 'storeSignature'])
        ->middleware('throttle:upload');
    Route::delete('certificate-settings/signature', [CertificateSettingsController::class, 'destroySignature']);
});
