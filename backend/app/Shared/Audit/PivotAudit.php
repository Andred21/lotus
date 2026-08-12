<?php

namespace App\Shared\Audit;

use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable;

/**
 * Fonte única da escrita de pivot auditada (spec `rastro-unicidade-e-gates`,
 * D1/D12). `turma_redator` e `course_redator` são portas de emissão de
 * certificado — quem assina e quem pode ser designado —, e o pacote não audita
 * pivot sozinho: `sync`/`attach`/`detach` crus não deixam rastro nenhum.
 *
 * O que este helper acrescenta ao `auditSync` do pacote é a COMPARAÇÃO: o
 * `Auditable::auditSync` dispara o evento mesmo quando o diff é vazio
 * (vendor/owen-it/laravel-auditing/src/Auditable.php:831-840) e o
 * `config/audit.php:104` tem `empty_values => true` — então um `sync` que não
 * muda nada gravava uma linha de audit com os dois lados vazios. O
 * `UpdateRedatorAction` roda `courses()->sync` em TODA edição de redator: seria
 * uma linha de ruído por salvada, numa tabela cuja retenção segue aberta
 * (P-02/P-30).
 *
 * A audit cai no model que o usuário TOCOU (D13): `course_redator` é auditado
 * como `course` quando a habilitação vem pela tela de curso e como `redator`
 * quando vem pela ficha do redator. Não se unifica de propósito — a audit
 * registra o ato de quem agiu.
 *
 * O tipo é a interseção `Model&Auditable`: quem não implementa o contrato do
 * pacote não compila. A guarda estática do `PersistenceLawsTest` reprova
 * qualquer `->sync(`/`->attach(`/`->detach(` cru em `app/` fora deste arquivo.
 */
final class PivotAudit
{
    /** Substituição total do conjunto. @param  array<int|string>  $ids */
    public static function sync(Model&Auditable $model, string $relation, array $ids): void
    {
        $desejado = self::normalizar($ids);

        if (self::atuais($model, $relation) === $desejado) {
            return;
        }

        $model->auditSync($relation, $desejado);
    }

    /** Acréscimo idempotente ao conjunto. @param  array<int|string>  $ids */
    public static function syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids): void
    {
        $novos = array_diff(self::normalizar($ids), self::atuais($model, $relation));

        if ($novos === []) {
            return;
        }

        $model->auditSyncWithoutDetaching($relation, array_values($novos));
    }

    /** @param  int|array<int|string>  $ids */
    public static function detach(Model&Auditable $model, string $relation, int|array $ids): void
    {
        $alvo = self::normalizar(is_array($ids) ? $ids : [$ids]);

        if (array_intersect($alvo, self::atuais($model, $relation)) === []) {
            return;
        }

        $model->auditDetach($relation, $alvo);
    }

    /** @return list<int> ids ligados hoje, normalizados */
    private static function atuais(Model&Auditable $model, string $relation): array
    {
        return self::normalizar($model->{$relation}()->get()->modelKeys());
    }

    /**
     * Ordem e repetição do payload não são diferença de conjunto — sem isto,
     * `[2,1]` depois de `[1,2]` gravaria audit sem nada ter mudado.
     *
     * @param  array<int|string>  $ids
     * @return list<int>
     */
    private static function normalizar(array $ids): array
    {
        $normalizados = array_values(array_unique(array_map(intval(...), $ids)));
        sort($normalizados);

        return $normalizados;
    }
}
