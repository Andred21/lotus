<?php

use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Identity\Models\User;
use App\Shared\Support\Phone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

/**
 * Bloco 60: todo telefone gravado passa a ser E.164 válido ou `NULL`, ANTES de o
 * `ValidPhone` entrar nos DTOs (mesmo deploy). Sem isso a edição de um registro
 * antigo travaria por causa do telefone.
 *
 * Por MODEL e instância a instância, nunca `DB::table()->update()`: telefone é
 * dado pessoal de cadastro com trilha, e só o Eloquent o audita (ADR-08,
 * auditoria na aplicação; `config/audit.php` audita o console). O valor antigo
 * não se perde: fica no `old_values` do `audits` que a própria escrita gera. É
 * isso que torna aceitável zerar o que não valida. `withTrashed()` porque o
 * cadastro arquivado continua sendo cadastro.
 *
 * Idempotente: o telefone que já é E.164 não é escrito, então rodar de novo não
 * gera `UPDATE` nem audit. `down()` é no-op: o valor antigo vive no audit, e
 * desfazer exigiria adivinhar o formato de cada linha.
 *
 * O relatório vai ao log só em contagens e `id` dos zerados, nunca o número.
 */
return new class extends Migration
{
    public function up(): void
    {
        Log::info('telefones.e164', [
            'users' => $this->converter(User::withTrashed()),
            'client_contacts' => $this->converter(ClientContact::withTrashed()),
        ]);
    }

    public function down(): void
    {
        // no-op: ver o docblock.
    }

    /**
     * @param  Builder<Model>  $consulta
     * @return array{lidos: int, ja_e164: int, convertidos: int, limpos_e_convertidos: int, esvaziados: int, zerados: int, zerados_ids: list<int>}
     */
    private function converter($consulta): array
    {
        $relatorio = [
            'lidos' => 0,
            'ja_e164' => 0,
            'convertidos' => 0,
            'limpos_e_convertidos' => 0,
            'esvaziados' => 0,
            'zerados' => 0,
            'zerados_ids' => [],
        ];

        $consulta->whereNotNull('phone')->lazyById()->each(function (Model $linha) use (&$relatorio): void {
            $bruto = (string) $linha->phone;
            $relatorio['lidos']++;

            $novo = Phone::corrigirLegado($bruto);

            if ($novo === $bruto) {
                $relatorio['ja_e164']++;

                return;
            }

            if (trim($bruto) === '') {
                $relatorio['esvaziados']++;
            } elseif ($novo === null) {
                $relatorio['zerados']++;
                $relatorio['zerados_ids'][] = $linha->id;
            } elseif (Phone::isValid($bruto)) {
                $relatorio['convertidos']++;
            } else {
                $relatorio['limpos_e_convertidos']++;
            }

            $linha->phone = $novo;
            $linha->save();
        });

        return $relatorio;
    }
};
