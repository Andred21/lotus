<?php

namespace Tests\Feature\Shared;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use ReflectionClass;
use ReflectionNamedType;
use ReflectionType;
use ReflectionUnionType;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Optional;
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
     *
     * As DUAS pastas entram na varredura, e é a mesma correção de novo. Esta
     * guarda nasceu varrendo só `database/` — migration e seeder são o caminho
     * provável, não o único —, e a lei §5.2 não tem escopo: um trigger criado
     * de dentro de `app/` (Action, Service, comando de console) viola igual e
     * passava verde. Provado por sonda no review de 2026-08-11 (Q-3), com a
     * §5.1 logo acima já varrendo `app/` inteiro.
     */
    public function test_nenhum_trigger_de_banco(): void
    {
        $encontrados = [];
        $arquivos = array_merge(
            $this->arquivosPhp(base_path('database')),
            $this->arquivosPhp(base_path('app')),
        );

        foreach ($arquivos as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);
            $local = str_replace(base_path().'/', '', $arquivo);

            if (preg_match('/CREATE\s+TRIGGER/i', $codigo) === 1) {
                $encontrados[] = "{$local}: CREATE TRIGGER";
            }

            if (preg_match('/(->|::)\s*unprepared\s*\(/', $codigo) === 1) {
                $encontrados[] = "{$local}: unprepared()";
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Lei §5.2 (ADR-08): auditoria so na camada de aplicacao, nunca em trigger.',
                'Trigger ve a conexao, nao quem agiu — owen-it/laravel-auditing e o unico caminho.',
                'Ocorrencias:',
            ],
            $encontrados,
        )));
    }

    /**
     * Escrita de pivot sem auditoria (spec `rastro-unicidade-e-gates`, D3).
     *
     * `turma_redator` e `course_redator` são portas de emissão de certificado,
     * e o pacote NÃO audita pivot sozinho: `sync`/`attach`/`detach` crus não
     * deixam rastro nenhum. A correção sem catraca volta na primeira Action
     * nova — a guarda é o que transforma a decisão em lei.
     *
     * Só a seta entra no regex, e é de propósito: `PivotAudit::sync(...)` é a
     * chamada LEGÍTIMA, e ela usa `::`. `->auditSync(` também fica fora, pelo
     * prefixo. A allowlist tem um arquivo — o helper —, que é onde a chamada
     * crua passa a ser o comportamento correto.
     *
     * A comparação é INSENSÍVEL A CAIXA porque o despacho de método em PHP é:
     * `$turma->redatores()->Sync([1,2])` executa o mesmo `sync` e passava verde
     * pela guarda. Provado por sonda no review de 2026-08-12 (Q-1), nos dois
     * sentidos — com `->Sync(` o caso passava, com `->sync(` reprovava. O
     * `syncWithoutDetaching` continua fora do padrão de `sync` pelo `\(`
     * obrigatório logo depois do nome, e `->auditDetach(` continua fora de
     * `detach` pelo `->` colado.
     *
     * As DUAS pastas entram na varredura, pelo mesmo motivo da guarda de
     * trigger logo acima: a lei não tem escopo. Seeder e migration escrevem
     * pivot com a mesma facilidade de uma Action, e hoje `database/` tem zero
     * ocorrência — a ampliação nasce verde e fecha a porta antes de ela abrir.
     *
     * Nasceu VERDE em 2026-08-12: as cinco ocorrências que existiam (as duas
     * Actions de designação, o controller de habilitação e as duas Actions de
     * redator) foram convertidas na task anterior deste mesmo bloco.
     */
    public function test_nenhuma_escrita_de_pivot_sem_auditoria(): void
    {
        $permitidos = ['app/Shared/Audit/PivotAudit.php'];
        $metodos = ['sync', 'syncWithoutDetaching', 'attach', 'detach', 'toggle', 'updateExistingPivot'];
        $encontrados = [];
        $arquivos = array_merge(
            $this->arquivosPhp(base_path('app')),
            $this->arquivosPhp(base_path('database')),
        );

        foreach ($arquivos as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (in_array($local, $permitidos, true)) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            foreach ($metodos as $metodo) {
                if (preg_match('/->\s*'.$metodo.'\s*\(/i', $codigo) === 1) {
                    $encontrados[] = "{$local}: ->{$metodo}()";
                }
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Escrita de pivot sem auditoria (ADR-08): o pacote nao audita pivot sozinho.',
                'Use App\Shared\Audit\PivotAudit — ele compara antes de gravar e audita o conjunto.',
                'Ocorrencias:',
            ],
            $encontrados,
        )));
    }

    /**
     * Coleção nested read-write nasce `Optional` (`der-fisico.md`, ADR-04).
     *
     * `array = []` faz o replace-total da Action apagar a coleção de quem só
     * OMITIU o campo — em silêncio, com peso legal. A lei existia desde o Bloco
     * 5 e o `ClientData` a violou mesmo assim, em duas propriedades: convenção
     * sem mecanismo depende de alguém lembrar.
     *
     * A varredura usa reflexão, e não regex, porque a pergunta é sobre o TIPO
     * ("admite Optional?"), que o texto do arquivo responde mal — o default e a
     * união podem estar em linhas diferentes do atributo.
     *
     * `#[ReadOnlyCollection]` é a única saída, e é declarada no sítio: o
     * atributo sozinho não sabe o sentido da coleção.
     *
     * A marca NÃO é palavra-de-honra, e é a correção do review de 2026-08-13
     * (Q-1). Escrita a primeira vez, ela dava `continue` antes de qualquer
     * checagem: bastava anotá-la para a guarda calar, com `array = []` intacto.
     * Provado por sonda nos dois sentidos — sem a marca a sonda reprovava, com a
     * marca passava. Isenção auto-declarada é o mesmo "alguém lembra" que a
     * guarda existe para substituir. Agora a marca é VERIFICADA nas duas pontas:
     *
     * - tem de haver `#[DataCollectionOf]`, senão a propriedade está fora da
     *   varredura de qualquer jeito e a marca só finge cobertura (Q-4);
     * - nenhum sítio em `app/` pode ler `$data-><campo>`, que é a leitura de
     *   ENTRADA que a marca nega. É a medição que a spec §1.5 fez à mão, uma
     *   vez, virando catraca.
     *
     * Nasce VERDE: as quatro read-write (`ClientData` ×2, `CourseData` ×2) são
     * `Optional`, e as marcadas (`BudgetData`/`QuoteData`) só se escrevem por
     * rota própria — `POST /budgets/{budget}/quotes`, upload de arquivo.
     */
    public function test_colecao_nested_read_write_nasce_optional(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (! str_contains($local, '/Data/')) {
                continue;
            }

            $classe = 'App\\'.str_replace('/', '\\', substr($local, strlen('app/'), -strlen('.php')));

            if (! class_exists($classe)) {
                continue;
            }

            $construtor = (new ReflectionClass($classe))->getConstructor();

            if ($construtor === null) {
                continue;
            }

            foreach ($construtor->getParameters() as $parametro) {
                $nome = $parametro->getName();
                $marcada = $parametro->getAttributes(ReadOnlyCollection::class) !== [];
                $colecao = $parametro->getAttributes(DataCollectionOf::class) !== [];

                if ($marcada && ! $colecao) {
                    $encontrados[] = "{$classe}::\${$nome}: #[ReadOnlyCollection] sem #[DataCollectionOf] — marca inerte, a guarda nao olha esta propriedade de nenhum jeito";

                    continue;
                }

                if (! $colecao) {
                    continue;
                }

                if ($marcada) {
                    foreach ($this->sitiosQueLeemDaEntrada($classe, $nome) as $sitio) {
                        $encontrados[] = "{$classe}::\${$nome}: marcada como SAIDA, mas lida da entrada em {$sitio}";
                    }

                    continue;
                }

                if ($this->admiteOptional($parametro->getType())
                    && $parametro->isDefaultValueAvailable()
                    && $parametro->getDefaultValue() instanceof Optional) {
                    continue;
                }

                $encontrados[] = "{$classe}::\${$nome}";
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Colecao nested read-write nasce Optional (ADR-04, der-fisico.md).',
                'Ausente = nao mexe; [] = apaga. Com `array = []`, o replace-total da Action',
                'apaga a colecao de quem so omitiu o campo — em silencio.',
                'Se a colecao so existe na SAIDA, marque com #[ReadOnlyCollection] — e a marca',
                'so vale enquanto NENHUMA Action ler o campo da entrada. Ocorrencias:',
            ],
            $encontrados,
        )));
    }

    /**
     * Os sítios de `app/` que leem `$data-><campo>` — a leitura de ENTRADA que
     * `#[ReadOnlyCollection]` nega.
     *
     * Só arquivos que CITAM a classe entram, e o próprio DTO fica de fora: o
     * nome do campo sozinho é ambíguo (`->files` também é relação de model em
     * meia dúzia de lugares), e a convenção do projeto é uniforme — Action
     * recebe `XData $data`. Falso positivo aqui é barulhento e some ao renomear
     * a variável; falso NEGATIVO é o defeito que a guarda existe para pegar.
     *
     * @return list<string>
     */
    private function sitiosQueLeemDaEntrada(string $classe, string $campo): array
    {
        $curto = class_basename($classe);
        $sitios = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (str_ends_with($local, "/{$curto}.php")) {
                continue;
            }

            $codigo = $this->codigoSemComentarios($arquivo);

            if (! str_contains($codigo, $curto)) {
                continue;
            }

            if (preg_match('/\$data\s*->\s*'.preg_quote($campo, '/').'\b/', $codigo) === 1) {
                $sitios[] = $local;
            }
        }

        return $sitios;
    }

    /** O tipo admite `Optional` — direto ou como parte de uma união. */
    private function admiteOptional(?ReflectionType $tipo): bool
    {
        if ($tipo instanceof ReflectionNamedType) {
            return $tipo->getName() === Optional::class;
        }

        if ($tipo instanceof ReflectionUnionType) {
            foreach ($tipo->getTypes() as $parte) {
                if ($parte instanceof ReflectionNamedType && $parte->getName() === Optional::class) {
                    return true;
                }
            }
        }

        return false;
    }
}
