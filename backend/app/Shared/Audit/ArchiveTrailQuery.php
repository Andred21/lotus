<?php

namespace App\Shared\Audit;

use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\DB;

/**
 * PRIMEIRO caminho de LEITURA de `audits` no projeto — a tabela era write-only,
 * com 16 models `Auditable`. Serve a coluna "arquivado por" da visão de
 * Arquivados (spec D7).
 *
 * Em lote de propósito: uma listagem de N arquivados faria N consultas se a
 * assinatura fosse por instância. Se a tabela crescer, o índice a olhar é
 * `(auditable_type, auditable_id, event)`.
 *
 * NÃO substitui a auditoria nem a reinterpreta: lê o que o `owen-it` já grava
 * (ADR-08), sem trigger de banco (lei §2).
 */
class ArchiveTrailQuery
{
    /**
     * Autor da última audit `deleted` de cada id.
     *
     * @param  array<int>  $ids
     * @return array<int, string|null> id => nome, ou `null` quando a audit não
     *                                 tem usuário (seeder, console). Id sem
     *                                 audit `deleted` NÃO aparece no mapa.
     */
    public static function archivedBy(string $auditableType, array $ids): array
    {
        if ($ids === []) {
            return [];
        }

        // `auditable_type` guarda a CHAVE do morph map (`AppServiceProvider`),
        // não o FQCN. A assinatura aceita a classe porque é o que o chamador
        // tem em mãos; a tradução é aqui, num lugar só.
        $tipo = Relation::getMorphAlias($auditableType);

        $ultimas = DB::table('audits')
            ->selectRaw('auditable_id, MAX(id) as audit_id')
            ->where('auditable_type', $tipo)
            ->where('event', 'deleted')
            ->whereIn('auditable_id', $ids)
            ->groupBy('auditable_id');

        $linhas = DB::table('audits')
            ->joinSub($ultimas, 'ultimas', fn ($join) => $join->on('audits.id', '=', 'ultimas.audit_id'))
            ->leftJoin('users', 'users.id', '=', 'audits.user_id')
            ->get(['audits.auditable_id', 'users.name']);

        $mapa = [];
        foreach ($linhas as $linha) {
            $mapa[(int) $linha->auditable_id] = $linha->name;
        }

        return $mapa;
    }
}
