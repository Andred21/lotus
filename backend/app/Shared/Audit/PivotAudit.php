<?php

namespace App\Shared\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use OwenIt\Auditing\Contracts\Auditable;
use OwenIt\Auditing\Events\AuditCustom;

/**
 * Fonte única da escrita de pivot auditada (spec `rastro-unicidade-e-gates`,
 * D1/D12). `turma_redator` e `course_redator` são portas de emissão de
 * certificado — quem assina e quem pode ser designado —, e o pacote não audita
 * pivot sozinho: `sync`/`attach`/`detach` crus não deixam rastro nenhum.
 *
 * O helper acrescenta DUAS coisas ao caminho do pacote, e por isso não delega
 * mais ao `auditSync`:
 *
 * 1. **Grava o CONJUNTO, não o delta.** O `Auditable::dispatchRelationAuditEvent`
 *    guarda `old->diff(new)` e `new->diff(old)`
 *    (vendor/owen-it/laravel-auditing/src/Auditable.php:828-829): habilitar um
 *    curso a mais gravava `old_values = {"courses":[]}`, como se o redator não
 *    tivesse nenhum antes. Com D2 (sem backfill) o ponto de partida dos pivots
 *    que já existiam nunca foi registrado — então nem a soma das linhas
 *    reconstruía o estado anterior, que é exatamente o que uma porta de emissão
 *    de certificado precisa provar. Aqui `old_values`/`new_values` carregam o
 *    conjunto inteiro dos dois lados, lido do banco antes e depois da escrita.
 * 2. **Compara antes de gravar.** O pacote dispara o evento mesmo com diff
 *    vazio e o `config/audit.php:104` tem `empty_values => true` — um `sync`
 *    que não muda nada gravava linha de audit vazia. O `UpdateRedatorAction`
 *    roda `courses()->sync` em TODA edição de redator: seria uma linha de
 *    ruído por salvada, numa tabela cuja retenção segue aberta (P-02/P-30).
 *
 * A comparação fica FORA da transação de propósito: o caminho quente é o no-op
 * (toda edição de redator passa por ele) e ele custa um SELECT só. Quem de fato
 * escreve paga a releitura de dentro da transação, que é o valor que vai para a
 * audit.
 *
 * Escrita e audit são ATÔMICAS: as duas dentro do mesmo `DB::transaction`.
 * Sem isso, `DesignateRedatorAction`, `RemoveRedatorAction` e o
 * `CourseRedatorController` — que chamam o helper sem transação externa —
 * podiam gravar o pivot e perder a audit numa falha entre as duas. Chamada
 * aninhada vira savepoint, então quem já abre transação (as Actions de redator)
 * não muda de comportamento.
 *
 * O nome do evento segue o do pacote (`sync` também para o acréscimo
 * idempotente, `detach` para a remoção): há testes e audits já gravadas com
 * esses valores.
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

        self::gravar($model, $relation, 'sync', fn () => $model->{$relation}()->sync($desejado));
    }

    /** Acréscimo idempotente ao conjunto. @param  array<int|string>  $ids */
    public static function syncWithoutDetaching(Model&Auditable $model, string $relation, array $ids): void
    {
        $novos = array_values(array_diff(self::normalizar($ids), self::atuais($model, $relation)));

        if ($novos === []) {
            return;
        }

        self::gravar($model, $relation, 'sync', fn () => $model->{$relation}()->syncWithoutDetaching($novos));
    }

    /** @param  int|array<int|string>  $ids */
    public static function detach(Model&Auditable $model, string $relation, int|array $ids): void
    {
        $alvo = self::normalizar(is_array($ids) ? $ids : [$ids]);

        if (array_intersect($alvo, self::atuais($model, $relation)) === []) {
            return;
        }

        self::gravar($model, $relation, 'detach', fn () => $model->{$relation}()->detach($alvo));
    }

    /**
     * Escreve o pivot e a audit do CONJUNTO na mesma transação.
     *
     * A releitura pós-escrita é o que vai para `new_values`: nenhuma das três
     * operações mexe em coluna de pivot, então conjunto igual depois da escrita
     * significa que nada mudou — e o D12 diz que aí não há o que auditar. É o
     * caso da corrida em que outra sessão já aplicou a mesma mudança entre a
     * comparação e a transação.
     */
    private static function gravar(Model&Auditable $model, string $relation, string $evento, callable $escrita): void
    {
        DB::transaction(function () use ($model, $relation, $evento, $escrita) {
            $antes = self::atuais($model, $relation);
            $escrita();
            $depois = self::atuais($model, $relation);

            if ($antes === $depois) {
                return;
            }

            $model->auditEvent = $evento;
            $model->isCustomEvent = true;
            $model->auditCustomOld = [$relation => $antes];
            $model->auditCustomNew = [$relation => $depois];

            Event::dispatch(new AuditCustom($model));

            $model->auditCustomOld = null;
            $model->auditCustomNew = null;
            $model->isCustomEvent = false;
            $model->auditEvent = null;
        });
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
