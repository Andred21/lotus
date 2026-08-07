<?php

namespace App\Domains\Certification\Exceptions;

use RuntimeException;

/**
 * O snapshot congelado não tem o que um certificado precisa nomear. Sobe ao
 * handler global RFC 7807 como 500 — o documento não é apresentado nem
 * impresso.
 *
 * Falhar alto é a escolha deliberada: a alternativa era a rota pública do QR
 * responder 200 com `aluno.name: ""` e `status: emitido`, ou o PDF sair com a
 * linha do nome em branco. Documento de peso legal não atesta o que não sabe;
 * um erro visível vira chamado e conserto, um nome vazio vira prova falsa.
 */
class CorruptedSnapshotException extends RuntimeException
{
    /** @param  list<string>  $fields */
    public static function missingFields(string $codigo, array $fields): self
    {
        return new self(sprintf(
            'O snapshot do certificado %s não tem os campos obrigatórios: %s.',
            $codigo,
            implode(', ', $fields),
        ));
    }
}
