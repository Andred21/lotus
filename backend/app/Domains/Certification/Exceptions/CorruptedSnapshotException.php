<?php

namespace App\Domains\Certification\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use RuntimeException;

/**
 * O snapshot congelado não tem o que um certificado precisa nomear. Sobe ao
 * handler global RFC 7807 como 500 — o documento não é apresentado nem
 * impresso.
 *
 * Falhar alto é a escolha deliberada em `show`, no PDF e na rota pública do
 * QR: a alternativa era responder 200 com `aluno.name: ""` e
 * `status: emitido`, ou imprimir a linha do nome em branco. Documento de peso
 * legal não atesta o que não sabe; um erro visível vira chamado e conserto, um
 * nome vazio vira prova falsa.
 *
 * **A listagem é a exceção deliberada ao falhar alto.** `GET /api/certificates`
 * não estoura: um registro corrompido não pode derrubar o histórico inteiro de
 * quem foi só consultar. Ela projeta `CertificateData::$snapshot_ok = false` e
 * a tabela marca a linha, sem afirmar um estado que o documento não sustenta.
 *
 * **Ela não é a única projeção sem gate, e chamá-la de única seria falso:**
 * `CertificateController::store()` e `::revoke()` também devolvem
 * `CertificateData` sem passar por `assertPresentable()`. Nos dois a resposta é
 * o eco de uma escrita que acabou de acontecer, não a apresentação do
 * documento — quem apresenta é `show`, o PDF e o QR. Fechar esses dois seria a
 * quinta mudança de comportamento, e o §5 da spec é lista fechada de quatro.
 *
 * A mensagem é `PublicDetail`: lida de `lang/` nos três locales. O
 * `CertificateViewDialog` a imprime no `AppErrorState` quando o suporte
 * clica em Ver na linha marcada — é ali que ele descobre QUAIS campos faltam
 * (D8). Sem a interface, `ProblemDetails` a trocaria por "erro inesperado" em
 * produção, e a D8 valeria só com `APP_DEBUG=true`.
 *
 * **Ela NÃO é `RecusaDeDominio`** (spec de 2026-09-02, D5): o veredito da
 * `P-60` é que a rota pública do QR continua estourando 500, e herdar da base
 * a arrastaria para o mapa 422/403. Documento de peso legal não atesta o que
 * não sabe; quem escaneia um certificado com snapshot corrompido vê a recusa,
 * não uma página que inventa o que falta.
 */
class CorruptedSnapshotException extends RuntimeException implements PublicDetail
{
    /** @param  list<string>  $fields */
    public static function missingFields(string $codigo, array $fields): self
    {
        return new self(__('certification.snapshot.not_presentable', [
            'codigo' => $codigo,
            'campos' => implode(', ', $fields),
        ]));
    }
}
