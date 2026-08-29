<?php

namespace App\Domains\Operation\Enums;

/**
 * O estado de EXIBIÇÃO da turma, agora do backend. `TurmaStatus` tem dois
 * valores porque é o que o banco guarda; a tela mostra três — `habilitada` é
 * a RN-16 derivada (`TurmaHabilitacaoService`, nunca persistida). O front
 * derivava em `features/operation/lib/turmaStatus.ts`; com a lista paginada o
 * filtro tem de ser SQL (`TurmaQueryBuilder::whereDisplayStatus`), e a
 * paridade entre os dois é catraca (`TurmaStatusParityTest`).
 *
 * Sem `#[TypeScript]`, como `CertificateDisplayStatus`: o transformer já
 * emite os enums de `app/`. Chave i18n: `operation.status.<valor>`.
 */
enum TurmaDisplayStatus: string
{
    case EmAndamento = 'em_andamento';
    case Habilitada = 'habilitada';
    case Concluida = 'concluida';
}
