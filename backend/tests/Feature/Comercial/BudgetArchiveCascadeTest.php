<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\DeleteBudgetAction;
use App\Domains\Commercial\Actions\DeleteQuoteAction;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Shared\Files\Models\File;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * A cadeia de TRÊS níveis (spec §5.5): orçamento → cotações → anexos das
 * cotações. Ela encadeia sozinha — cada `$quote->delete()` do hook do orçamento
 * dispara o hook da cotação, que arquiva os anexos dela.
 */
class BudgetArchiveCascadeTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => '21.222.333-4']);

        return Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
    }

    private function makeQuote(Budget $budget, int $seq = 1): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'pending',
        ]);
    }

    private function makeFile(Quote|Budget $owner, string $name): File
    {
        return $owner->files()->create([
            'type' => 'invoice',
            'path' => "docs/{$name}.pdf",
            'original_name' => "{$name}.pdf",
            'mime' => 'application/pdf',
            'size' => 1024,
        ]);
    }

    public function test_arquivar_orcamento_desce_os_tres_niveis_com_a_marca(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexoDaCotacao = $this->makeFile($quote, 'cotacao');
        $anexoDoOrcamento = $this->makeFile($budget, 'orcamento');

        app(DeleteBudgetAction::class)->execute($budget);

        $this->assertSoftDeleted('budgets', ['id' => $budget->id]);
        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'archived_with_parent' => true]);
        $this->assertNotNull(Quote::withTrashed()->find($quote->id)->deleted_at);
        $this->assertDatabaseHas('files', ['id' => $anexoDaCotacao->id, 'archived_with_parent' => true]);
        $this->assertDatabaseHas('files', ['id' => $anexoDoOrcamento->id, 'archived_with_parent' => true]);
    }

    public function test_restaurar_orcamento_devolve_os_tres_niveis(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        app(DeleteBudgetAction::class)->execute($budget);
        $budget->restore();

        $this->assertDatabaseHas('quotes', [
            'id' => $quote->id, 'deleted_at' => null, 'archived_with_parent' => false,
        ]);
        $this->assertDatabaseHas('files', [
            'id' => $anexo->id, 'deleted_at' => null, 'archived_with_parent' => false,
        ]);
    }

    public function test_anexo_arquivado_antes_do_pai_nao_volta(): void
    {
        // A regra que a marca existe para sustentar (spec D2 do molde): quem
        // foi arquivado por vontade própria fica onde está.
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $antigo = $this->makeFile($quote, 'antigo');
        $vivo = $this->makeFile($quote, 'vivo');

        $antigo->delete();
        app(DeleteBudgetAction::class)->execute($budget);
        $budget->restore();

        $this->assertDatabaseHas('files', ['id' => $vivo->id, 'deleted_at' => null]);
        $this->assertNotNull(File::withTrashed()->find($antigo->id)->deleted_at, 'o anexo antigo voltou');
        $this->assertDatabaseHas('files', ['id' => $antigo->id, 'archived_with_parent' => false]);
    }

    public function test_arquivar_cotacao_sozinha_leva_os_anexos_dela(): void
    {
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        app(DeleteQuoteAction::class)->execute($quote);

        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
        $this->assertDatabaseHas('files', ['id' => $anexo->id, 'archived_with_parent' => true]);
        // A cotação foi arquivada por vontade própria: ela NÃO ganha a marca.
        $this->assertDatabaseHas('quotes', ['id' => $quote->id, 'archived_with_parent' => false]);
    }

    public function test_cascata_da_cotacao_roda_dentro_de_uma_transacao(): void
    {
        // D9: `DeleteQuoteAction` era escrita única e não tinha transação. A
        // cascata nova muda isso — enumerar-e-apagar sem transação é
        // check-then-act (nota de `Client::booted()`).
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $this->makeFile($quote, 'cotacao');

        $niveis = [];
        Event::listen('eloquent.deleting: '.File::class, function () use (&$niveis): void {
            $niveis[] = DB::transactionLevel();
        });

        app(DeleteQuoteAction::class)->execute($quote);

        $this->assertNotEmpty($niveis, 'a cascata não apagou o anexo');
        // 2, não 1: o `RefreshDatabase` já mantém uma transação aberta durante o
        // teste inteiro. Asserir `> 0` mediria o RefreshDatabase, não a Action.
        $this->assertSame(2, $niveis[0], 'a cascata rodou fora da transação da Action');
    }

    public function test_falha_no_meio_da_cascata_desfaz_tudo(): void
    {
        // Sem transação, cada `delete()` do hook autocommita e a falha deixa o
        // anexo arquivado sob uma cotação que continua ativa.
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $anexo = $this->makeFile($quote, 'cotacao');

        Event::listen('eloquent.deleting: '.File::class, function () {
            throw new RuntimeException('falha no meio da cascata');
        });

        try {
            app(DeleteQuoteAction::class)->execute($quote);
            $this->fail('a cascata deveria ter estourado');
        } catch (RuntimeException) {
            // esperado
        }

        $this->assertNull($quote->fresh()->deleted_at, 'a cotação ficou arquivada apesar da falha');
        $this->assertNull($anexo->fresh()->deleted_at);
    }
}
