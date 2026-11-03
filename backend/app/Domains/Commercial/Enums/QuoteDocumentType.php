<?php

namespace App\Domains\Commercial\Enums;

use App\Shared\Files\ContentClass;
use App\Shared\Files\TipoDeArquivo;
use Spatie\TypeScriptTransformer\Attributes\Hidden;

/**
 * O tipo do documento da cotação: um só, `quote_document`. Existe para o
 * anexo da cotação passar pelo mesmo contrato `TipoDeArquivo` dos demais.
 */
#[Hidden]
enum QuoteDocumentType: string implements TipoDeArquivo
{
    case QUOTE_DOCUMENT = 'quote_document';

    public function conteudo(): ContentClass
    {
        return ContentClass::Documento;
    }

    public function aceitaValidade(): bool
    {
        return false;
    }
}
