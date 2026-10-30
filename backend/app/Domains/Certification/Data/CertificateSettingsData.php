<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Models\CertificateSettings;
use App\Shared\Data\ComputedFields;
use App\Shared\Support\TetosImpressos;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Configuración › Certificados: nome e cargo da gerente (escrita) e a imagem de
 * assinatura dela (só saída — sobe em multipart, por rota própria).
 */
#[TypeScript]
class CertificateSettingsData extends Data
{
    public function __construct(
        #[Required, Max(TetosImpressos::NOME_ASSINANTE)]
        public string $manager_name,
        #[Required, Max(TetosImpressos::CARGO_ASSINANTE)]
        public string $manager_title,
        #[Computed]
        public ?CertificateSignatureFileData $signature = null,
    ) {}

    public static function rules(): array
    {
        return ComputedFields::rejected('signature');
    }

    public static function fromModel(CertificateSettings $settings): self
    {
        $settings->loadMissing('signature');

        return new self(
            manager_name: $settings->manager_name,
            manager_title: $settings->manager_title,
            signature: $settings->signature
                ? CertificateSignatureFileData::fromModel($settings->signature)
                : null,
        );
    }
}
