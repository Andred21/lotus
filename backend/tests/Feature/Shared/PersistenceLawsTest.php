<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * As leis §5.1 e §5.2 do `CLAUDE.md` eram parágrafo: valiam quando alguém
 * lembrava. A P-04 registrava exatamente isso desde 2026-08-04 — lei que
 * precisa valer sempre quer teste, não prosa (lição 14).
 *
 * As duas nasceram VERDES: em 2026-08-10 havia zero classe `Repository` em
 * `app/` e zero trigger em `database/`. O teste não corrige nada; ele impede
 * que a primeira violação entre sem ninguém ver.
 */
class PersistenceLawsTest extends TestCase
{
    use ScansPhpSource;

    /**
     * §5.1 — DDD-lite, SEM Repository sobre Eloquent (ADR-02).
     *
     * A varredura é sobre `app/` INTEIRO, não só `Domains/`: a lei não abre
     * exceção para `Shared/`, e foi assim que a superfície foi medida.
     *
     * `QueryBuilders/` fica fora de propósito. `TurmaQueryBuilder` e
     * `EnrollmentQueryBuilder` são o padrão APROVADO pelo ADR-02 — reprovar
     * por semelhança de nome mataria o que a lei manda usar. A diferença é a
     * razão de a lei dizer "Repository **sobre Eloquent**": query builder
     * estende o Eloquent, repository o esconde.
     */
    public function test_nenhuma_classe_repository_sobre_eloquent(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (str_contains($local, '/QueryBuilders/')) {
                continue;
            }

            if (str_ends_with(basename($arquivo, '.php'), 'Repository')) {
                $encontrados[] = $local;
            }
        }

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Lei §5.1 (ADR-02): DDD-lite, sem Repository sobre Eloquent.',
                'List/show/destroy sem regra vao direto ao Eloquent; regra de escrita mora em Action;',
                'consulta reaproveitada mora em QueryBuilders/. Classes encontradas:',
            ],
            $encontrados,
        )));
    }

    /**
     * §5.2 — auditoria só na aplicação, nunca em trigger de banco (ADR-08).
     *
     * Trigger não enxerga o usuário autenticado: vê a conexão, não quem agiu
     * (lição 2). Duas formas cobertas, porque em Laravel um trigger entra por
     * SQL cru, não pelo schema builder — `DB::unprepared` é a porta real, e
     * `CREATE TRIGGER` pega quem a abrir por outro caminho (`DB::statement`,
     * `Schema::connection(...)->getConnection()->unprepared`).
     *
     * As DUAS setas do PHP entram no regex. A primeira escrita desta guarda só
     * tinha `->`, e a sonda do plano — `DB::unprepared(...)`, que é a forma
     * idiomática e a que a §5.2 nomeia — produziu uma linha em vez de duas:
     * ela reprovou pelo texto `CREATE TRIGGER`, não pela chamada. Guarda que
     * promete cobrir uma forma e não cobre é o defeito que este bloco existe
     * para não repetir.
     */
    public function test_nenhum_trigger_de_banco(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('database')) as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);
            $local = str_replace(base_path().'/', '', $arquivo);

            if (preg_match('/CREATE\s+TRIGGER/i', $codigo) === 1) {
                $encontrados[] = "{$local}: CREATE TRIGGER";
            }

            if (preg_match('/(->|::)\s*unprepared\s*\(/', $codigo) === 1) {
                $encontrados[] = "{$local}: unprepared()";
            }
        }

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Lei §5.2 (ADR-08): auditoria so na camada de aplicacao, nunca em trigger.',
                'Trigger ve a conexao, nao quem agiu — owen-it/laravel-auditing e o unico caminho.',
                'Ocorrencias:',
            ],
            $encontrados,
        )));
    }
}
