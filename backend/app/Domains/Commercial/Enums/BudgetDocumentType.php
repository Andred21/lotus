<?php

namespace App\Domains\Commercial\Enums;

use App\Shared\Files\ContentClass;
use App\Shared\Files\TipoDeArquivo;

/**
 * Tipos de anexo do orçamento (RN-14): orden de compra, factura e comprobante.
 * Enum do domínio, não global: a `files` polimórfica tem `type` string livre, e
 * este enum só restringe e rotula os anexos de orçamento (mesmo padrão do
 * `TurmaDocumentType`). `invoice` e `receipt` são os valores que já estavam
 * gravados antes dele — por isso não houve migration nem backfill. O documento
 * da cotação (`quote_document`) é outro fluxo e não entra aqui.
 */
enum BudgetDocumentType: string implements TipoDeArquivo
{
    case PURCHASE_ORDER = 'purchase_order';
    case INVOICE = 'invoice';
    case RECEIPT = 'receipt';

    public function conteudo(): ContentClass
    {
        return ContentClass::Documento;
    }

    public function aceitaValidade(): bool
    {
        return false;
    }
}
