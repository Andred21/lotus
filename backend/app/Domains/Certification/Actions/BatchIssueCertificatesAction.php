<?php

namespace App\Domains\Certification\Actions;

use App\Domains\Certification\Data\BatchIssueData;
use App\Domains\Certification\Data\BatchIssueItemResultData;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Validation\ValidationException;

/**
 * Emissão em lote: um relatório por item, **sem transação externa**.
 *
 * Este Action é a exceção nomeada à regra "Action roda dentro de
 * `DB::transaction`" (`.claude/rules/backend-ddd.md`), e a ausência é a forma
 * da classe, não esquecimento:
 *
 * 1. Cada `IssueCertificateAction::execute()` já É a sua própria transação
 *    (seis portas + D9 + auditoria).
 * 2. Uma transação por fora faria um item falho reverter os que já tinham sido
 *    commitados — documento de peso legal desaparecendo em silêncio.
 * 3. Pior: reverteria o `INSERT` sem devolver o número de sequência, gastando
 *    um `LOT-ANO-SEQ` que nunca vira certificado.
 * 4. Por isso o `try` é POR ITEM, e toda recusa vira linha do relatório em vez
 *    de derrubar o request.
 *
 * Guarda viva disso: `BatchIssueTest::test_falha_inesperada_no_meio_do_lote_
 * preserva_o_que_ja_saiu` — envolver o laço abaixo num `DB::transaction` tem de
 * deixá-lo vermelho.
 */
class BatchIssueCertificatesAction
{
    public function __construct(private readonly IssueCertificateAction $issue) {}

    /** @return array<BatchIssueItemResultData> */
    public function execute(BatchIssueData $data): array
    {
        // Uma vez para o lote inteiro: o redator é o mesmo em todos os itens
        // (D11), e resolvê-lo por item custaria um SELECT por matrícula.
        $redator = Redator::query()->findOrFail($data->redator_id);

        return collect($data->enrollment_ids)
            ->map(fn (int $enrollmentId): BatchIssueItemResultData => $this->item($enrollmentId, $redator))
            ->all();
    }

    private function item(int $enrollmentId, Redator $redator): BatchIssueItemResultData
    {
        try {
            // Resolvida AQUI, dentro do try: `exists:enrollments,id` do DTO
            // consulta a tabela crua e não respeita soft delete, então um id
            // soft-deletado passa a validação e só falha aqui. Se isto
            // estourasse fora do try (como `findOrFail`), a
            // `ModelNotFoundException` subiria sem `catch`, virando 404 pro
            // request inteiro — escondendo itens anteriores já commitados (não
            // há transação externa). Por isso vira `ValidationException`: mesmo
            // formato de recusa das seis portas, capturado abaixo e reportado
            // como item, não como falha da requisição.
            $enrollment = Enrollment::query()->find($enrollmentId);

            if ($enrollment === null) {
                throw ValidationException::withMessages([
                    'enrollment' => 'La matrícula no existe.',
                ]);
            }

            $certificate = $this->issue->execute($enrollment, $redator);

            return new BatchIssueItemResultData(
                enrollment_id: $enrollmentId,
                ok: true,
                codigo: $certificate->codigo,
                certificate_id: $certificate->id,
                error: null,
            );
        } catch (ValidationException $e) {
            return new BatchIssueItemResultData(
                enrollment_id: $enrollmentId,
                ok: false,
                codigo: null,
                certificate_id: null,
                error: ValidationMessages::squash($e),
            );
        }
    }
}
