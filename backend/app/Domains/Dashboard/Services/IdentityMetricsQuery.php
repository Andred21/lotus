<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;

/**
 * O que o dashboard do admin lê do módulo Identity.
 *
 * Existe por causa do gate, não por organização: documento de idoneidade de
 * redator é dado de Identity e responde a `identity.user.view`. Enquanto esses
 * alertas moravam no `CertificationMetricsQuery`, quem só podia ver certificado
 * recebia o nome e o `redator_id` de pessoas que a seção `redatores` do mesmo
 * payload lhe negava (review de 2026-08-14, Q-1).
 */
class IdentityMetricsQuery
{
    /** @return AlertData[] */
    public function alertasDocumentos(): array
    {
        $today = CarbonImmutable::today();

        return File::query()
            // Alias do morph map (ADR-10), não literal: o `AppServiceProvider`
            // é o único lugar que liga alias a classe.
            ->where('fileable_type', (new Redator)->getMorphClass())
            ->whereIn('type', RedatorDocumentType::values())
            ->whereNotNull('valid_until')
            // `where`, não `whereDate`: `date(valid_until)` é função sobre a
            // coluna e cega `files_valid_until_index` (Task 12). A coluna é
            // `date` e o horizonte é `endOfDay()`, então a comparação por
            // instante seleciona exatamente as mesmas linhas.
            ->where('valid_until', '<=', DashboardWindows::expiryHorizon())
            ->orderBy('valid_until')
            ->orderBy('id')
            ->get(['id', 'fileable_id', 'type', 'valid_until'])
            ->map(function (File $document) use ($today): AlertData {
                $expired = $document->valid_until->isBefore($today);

                return new AlertData(
                    type: $expired
                        ? DashboardAlertType::RedatorDocumentExpired
                        : DashboardAlertType::RedatorDocumentExpiringSoon,
                    severity: $expired
                        ? DashboardSeverity::High
                        : DashboardSeverity::Medium,
                    entity_id: $document->id,
                    description: $expired
                        ? __('dashboard.alert.redator_document_expired', ['tipo' => __('identity.document_type.'.$document->type)])
                        : __('dashboard.alert.redator_document_expiring', ['tipo' => __('identity.document_type.'.$document->type)]),
                    date: $document->valid_until->toDateString(),
                    navigation: ['redator_id' => (int) $document->fileable_id],
                );
            })
            ->all();
    }
}
