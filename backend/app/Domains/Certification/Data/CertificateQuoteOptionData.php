<?php

namespace App\Domains\Certification\Data;

use App\Domains\Operation\Models\Turma;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Opção do filtro de cotação do Historial: só o que o dropdown mostra e envia.
 * Nasce da TURMA e não da cotação: `Turma` é aresta declarada de Certification
 * (`DomainDependencyTest::ALLOWED`) e `Commercial\Models\Quote` não — o
 * código vem de `$turma->quote->code`, a fonte única (ADR-17).
 */
#[TypeScript]
class CertificateQuoteOptionData extends Data
{
    public function __construct(
        public int $id,
        public string $code,
    ) {}

    public static function fromTurma(Turma $turma): self
    {
        return new self(id: $turma->quote_id, code: $turma->quote->code);
    }
}
