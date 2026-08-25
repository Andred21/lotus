<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class BatchIssueData extends Data
{
    /**
     * Teto de itens por lote. Turma real tem 8 a 15 alunos
     * (`OperationDemoSeeder`), então 200 é ~13× a maior — folga para vários
     * lotes juntos e ainda longe do `fastcgi_read_timeout` (60 s em dev, 120 s
     * em produção). Cada item é uma `IssueCertificateAction` completa: seis
     * portas, snapshot e auditoria, em transação própria. Sem teto, o único
     * limite era o `post_max_size`.
     */
    public const MAX_ITENS = 200;

    public function __construct(
        /** @var array<int> */
        public array $enrollment_ids,
        public int $redator_id,
    ) {}

    public static function rules(): array
    {
        return [
            'enrollment_ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_ITENS],
            // `distinct`: a UI nunca manda id repetido, mas a API crua manda —
            // e um duplicado renderia o item duas vezes no relatório (emitido +
            // "ya existe un certificado vigente"), com `key` React duplicada.
            'enrollment_ids.*' => ['integer', 'distinct', 'exists:enrollments,id'],
            'redator_id' => ['required', 'integer', 'exists:redatores,id'],
        ];
    }
}
