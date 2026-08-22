<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * P-49: `lockRow` de um lado só é meio mutex. `ArchiveRedatorAction` e
 * `DeleteTurmaAction` abrem transação e travam o pai antes da cascata; os
 * escritores de filho não travavam nada, e um filho criado na janela sobrevivia
 * ATIVO sob pai arquivado — o modo de falha que a cascata existe para impedir.
 *
 * A suíte roda em sqlite e `SQLiteGrammar::compileLock()` devolve string vazia:
 * NENHUM teste deste repositório prova lock. Este aqui não tenta — ele lê
 * CÓDIGO. A corrida real é prova de DoD, uma vez, no MySQL de dev.
 *
 * O universo é medido, não escolhido: toda Action sob `app/Domains/*\/Actions/`
 * cujo código sem comentários recebe `Turma $` ou `Redator $`. Cada uma está em
 * `TOMAM_LOCK` ou em `ISENTAS`, e **silêncio reprova** — mesmo idioma do
 * `NestedRouteOwnershipTest`. Action nova entra por escrita explícita, e o
 * motivo da isenção fica onde alguém o lê ao editar a Action.
 *
 * O lock é `lockForWrite()` e não `lockRow()`: `lockRow` SERIALIZA (B espera A
 * commitar) e depois deixa B pousar o filho sob o pai recém-arquivado. Quem
 * RECUSA é o `trashed()` de dentro do `lockForWrite`. Molde: `Client`, cujos
 * seis escritores de filho chamam `Client::lockForWrite()`.
 */
class ParentLockOnChildWriteTest extends TestCase
{
    use ScansPhpSource;

    /** Action => classe do pai cujo `lockForWrite()` ela deve tomar. */
    private const TOMAM_LOCK = [
        'Identity/Actions/StoreRedatorDocumentAction.php' => 'Redator',
        'Identity/Actions/UpdateRedatorAction.php' => 'Redator',
        'Operation/Actions/DesignateRedatorAction.php' => 'Redator',
        'Operation/Actions/EnrollStudentAction.php' => 'Turma',
        'Operation/Actions/StoreTurmaDocumentAction.php' => 'Turma',
    ];

    /** Action => por que ela NÃO toma o lock do pai. */
    private const ISENTAS = [
        'Identity/Actions/ArchiveRedatorAction.php' => 'É o lado que ARQUIVA: toma `Redator::lockRow()` cru, sobre linha em vias de ser arquivada.',
        'Identity/Actions/RestoreRedatorAction.php' => 'É o lado que RESTAURA: toma `Redator::lockRow()` cru, sobre linha arquivada — `lockForWrite` a recusaria.',
        'Operation/Actions/DeleteTurmaAction.php' => 'É o lado que ARQUIVA: toma `Turma::lockRow()` cru, sobre linha em vias de ser arquivada.',
        'Operation/Actions/RestoreTurmaAction.php' => 'É o lado que RESTAURA: toma `Turma::lockRow()` cru, sobre linha arquivada — `lockForWrite` a recusaria.',
        'Operation/Actions/ImportStudentsAction.php' => 'Não abre transação: a transação do import é POR LINHA e mora no `EnrollStudentAction`, que toma o lock. '.
            '`lockForUpdate()` fora de transação é solto no autocommit da própria consulta — o lock aqui seria teatro.',
        'Operation/Actions/UpdateTurmaAction.php' => 'Escreve o PRÓPRIO pai (`$turma->update`), não filho. A corrida pai-vs-pai é outra e está fora do escopo da P-49.',
        'Operation/Actions/ConcludeTurmaAction.php' => 'Escreve o PRÓPRIO pai (`status`/`concluded_at`), não filho. Mesmo motivo do `UpdateTurmaAction`.',
        'Operation/Actions/RemoveRedatorAction.php' => 'O `detach` REDUZ vínculo. A janela da P-49 é pousar filho ATIVO sob pai arquivado; remover não pousa nada.',
        'Operation/Actions/DeleteTurmaDocumentAction.php' => 'O `delete()` REDUZ. Mesmo motivo do `RemoveRedatorAction`.',
        'Certification/Actions/IssueCertificateAction.php' => 'Certificado não é filho de nenhuma das duas cascatas: `Turma::booted` varre `enrollments` e `files`, '.
            '`Redator::booted` varre `documents` e `user`. O `Redator` aqui é LIDO pelas seis portas, não escrito.',
        'Certification/Actions/BatchIssueCertificatesAction.php' => 'Não escreve: delega item a item ao `IssueCertificateAction`, que já está declarado acima.',
    ];

    /** @return array<string,string> caminho relativo a `app/Domains` => código sem comentários */
    private function universo(): array
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(app_path('Domains')) as $arquivo) {
            if (! str_contains($arquivo, '/Actions/')) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/(Turma|Redator) \$/', $codigo) !== 1) {
                continue;
            }

            $encontrados[str_replace(app_path('Domains').'/', '', $arquivo)] = $codigo;
        }

        return $encontrados;
    }

    public function test_toda_action_que_recebe_turma_ou_redator_esta_declarada(): void
    {
        $declaradas = array_merge(array_keys(self::TOMAM_LOCK), array_keys(self::ISENTAS));
        $indefinidas = array_values(array_diff(array_keys($this->universo()), $declaradas));
        sort($indefinidas);

        $this->assertSame([], $indefinidas, implode("\n", array_merge(
            [
                'P-49: Action que recebe `Turma $` ou `Redator $` sem declarar o que faz com o lock do pai.',
                'Declare em TOMAM_LOCK (e chame `<Pai>::lockForWrite()` dentro da transação) ou',
                'em ISENTAS, com o motivo escrito ao lado. Silêncio reprova de propósito.',
                'Actions:',
            ],
            $indefinidas,
        )));
    }

    public function test_nenhuma_declaracao_aponta_para_arquivo_que_sumiu(): void
    {
        $universo = array_keys($this->universo());
        $orfas = array_values(array_diff(
            array_merge(array_keys(self::TOMAM_LOCK), array_keys(self::ISENTAS)),
            $universo,
        ));
        sort($orfas);

        // Sem isto a lista envelhece em silêncio: Action renomeada some do
        // universo e a declaração dela vira decoração.
        $this->assertSame([], $orfas, 'Declaração aponta para Action inexistente: '.implode(', ', $orfas));
    }

    public function test_quem_toma_lock_chama_lockforwrite_dentro_de_transacao(): void
    {
        $faltando = [];
        $universo = $this->universo();

        foreach (self::TOMAM_LOCK as $arquivo => $pai) {
            $codigo = $universo[$arquivo] ?? null;

            if ($codigo === null) {
                $faltando[] = "{$arquivo}: saiu do universo (renomeada ou assinatura mudou)";

                continue;
            }

            if (! str_contains($codigo, "{$pai}::lockForWrite(")) {
                $faltando[] = "{$arquivo}: não chama `{$pai}::lockForWrite(`";
            }

            if (! str_contains($codigo, 'DB::transaction')) {
                $faltando[] = "{$arquivo}: não abre `DB::transaction` — lock fora de transação é solto no autocommit";
            }
        }

        sort($faltando);

        $this->assertSame([], $faltando, implode("\n", array_merge(
            [
                'P-49: escritor de filho sem o lock do pai, ou com o lock fora de transação.',
                'Um lock de linha só fecha janela se os DOIS lados o tomarem, e só RECUSA',
                'se for `lockForWrite()` — `lockRow()` cru serializa e deixa passar. Achados:',
            ],
            $faltando,
        )));
    }

    public function test_todo_motivo_de_isencao_esta_escrito(): void
    {
        foreach (self::ISENTAS as $arquivo => $motivo) {
            $this->assertNotSame('', trim($motivo), "Isenção de {$arquivo} sem motivo.");
            $this->assertGreaterThan(
                40,
                strlen(trim($motivo)),
                "Isenção de {$arquivo} com motivo curto demais para ser um motivo.",
            );
        }
    }
}
