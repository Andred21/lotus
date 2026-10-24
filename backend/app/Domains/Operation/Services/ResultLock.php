<?php

namespace App\Domains\Operation\Services;

/**
 * "O resultado desta matrícula já não pode mudar" — a pergunta que Operation
 * faz e que só Certification sabe responder (certificado vigente).
 *
 * Existe como interface em Operation, e não como import de Certification, porque
 * a direção de dependência é Certification -> Operation (`DomainDependencyTest`):
 * `CertificateVigenciaResolver` a implementa e o `AppServiceProvider` a liga.
 * Assim o critério de "vigente" continua com UM dono (o resolver) e Operation
 * não aprende o que é um certificado.
 *
 * "Trancado" = certificado vigente (`emitido`); revogado não tranca.
 */
interface ResultLock
{
    /**
     * Quais dessas matrículas estão trancadas — uma consulta para a lista
     * inteira, nunca uma por linha.
     *
     * @param  list<int>  $enrollmentIds
     * @return list<int>
     */
    public function lockedAmong(array $enrollmentIds): array;

    /**
     * A mesma pergunta para a escrita, travando a linha: só vale DENTRO da
     * transação da correção (é a mesma leitura da porta 3 da emissão).
     */
    public function isLockedForUpdate(int $enrollmentId): bool;
}
