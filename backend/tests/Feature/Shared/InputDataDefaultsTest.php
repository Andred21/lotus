<?php

namespace Tests\Feature\Shared;

use App\Domains\Catalog\Data\CourseData;
use App\Domains\Catalog\Data\CourseModuleData;
use App\Domains\Certification\Data\CertificatePageQueryData;
use App\Domains\Certification\Data\CertificateSettingsData;
use App\Domains\Certification\Data\EmissionPanelQueryData;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\ClientData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Identity\Data\ProfileDocumentUploadData;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Data\RedatorDocumentsData;
use App\Domains\Identity\Data\RedatorDocumentUploadData;
use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Data\StudentData;
use App\Domains\Identity\Data\UserData;
use App\Domains\Operation\Data\EnrollmentData;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Data\TurmaPageQueryData;
use App\Shared\Data\Attributes\ReadOnlyCollection;
use App\Shared\Pagination\PageQueryData;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionParameter;
use ReflectionType;
use ReflectionUnionType;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Catraca de default literal em Data de ENTRADA (bloco 51, D5).
 *
 * O `DefaultValuesDataPipe` do laravel-data preenche o default declarado
 * ANTES de qualquer `Optional`, e com default no construtor nem o `#[Required]`
 * segura a omissão: o PUT/POST sem a chave passa e grava o default (provado no
 * `CourseData::$workload_hours`, que gravava 0). Então `= 'client'` ou
 * `= null` transforma "o cliente não mandou" em "o cliente mandou o default" —
 * e o PUT parcial rebaixa ou apaga dado em silêncio. A varredura antiga
 * procurava o ternário `instanceof Optional ? null` e era cega a isso.
 *
 * Alcance, por reflexão e não por regex — um controller quebra a assinatura em
 * várias linhas e o texto do arquivo responde mal à pergunta "que tipo?":
 *
 * (a) tipos Data dos parâmetros dos métodos públicos dos controllers;
 * (b) classes citadas como `X::validateAndCreate(` ou `X::from($request…`;
 * (c) o fecho transitivo: propriedade tipada como Data ou com
 *     `#[DataCollectionOf]`, EXCETO as de SAÍDA (`#[Computed]` e
 *     `#[ReadOnlyCollection]`) — Data que só existe na saída fica fora do
 *     alcance sem precisar de isenção.
 *
 * Saídas de um default: `new Optional`, propriedade `#[Computed]`/
 * `#[ReadOnlyCollection]`, ou a classe inteira em `ISENTAS` com motivo.
 */
class InputDataDefaultsTest extends TestCase
{
    use ScansPhpSource;

    /**
     * Classes de entrada em que o default literal é a semântica legítima, com
     * o motivo ao lado — o idioma de `ListQueryBudgetTest::ISENTAS`.
     * `test_isentas_sao_alcancadas` reprova isenção cuja classe saiu do alcance.
     *
     * @var array<class-string, string>
     */
    private const ISENTAS = [
        PageQueryData::class => 'query string de lista paginada: GET nao tem corpo a preservar, e ausente vale a primeira pagina e o tamanho padrao',
        TurmaPageQueryData::class => 'query string de lista paginada de turmas: GET nao tem corpo a preservar, ausente vale o padrao da lista',
        CertificatePageQueryData::class => 'query string de lista paginada de certificados: GET nao tem corpo a preservar, ausente vale o padrao da lista',
        EmissionPanelQueryData::class => 'query string do painel de emissao: GET nao tem corpo a preservar, ausente vale o padrao do painel',
        DashboardFilterData::class => 'query string do filtro do painel: GET nao tem corpo a preservar, ausente vale o periodo padrao',
        RedatorDocumentsData::class => 'upload que so cria ou substitui o conjunto de documentos do relator: nao ha PUT parcial que um default possa rebaixar',
        RedatorDocumentUploadData::class => 'upload de UM documento do relator: so cria ou substitui o arquivo, nao ha valor anterior a preservar por omissao',
        ProfileDocumentUploadData::class => 'upload de UM documento do proprio perfil: so cria ou substitui o arquivo, nao ha valor anterior a preservar por omissao',
        CourseModuleData::class => 'item de colecao recriada por inteiro a cada PUT do curso: o default e semantica de criacao do modulo, nao rebaixa linha existente',
        ImportConfirmRowData::class => 'linha de importacao de matriculas: cada confirmacao e entrada completa, nao PUT parcial — o item 53 revisita',
    ];

    /**
     * A §2.1 da spec do bloco 51: todo Data que recebe request e tem default
     * literal alcançável, pelo destino que a spec lhe deu. O alcance NÃO pode
     * ser menor que isto — um Data de entrada que a catraca não enxergue é o
     * furo que a D-13 já teve.
     *
     * @var list<class-string>
     */
    private const PRE_CLASSIFICADAS_2_1 = [
        ClientData::class,
        BudgetData::class,
        CourseData::class,
        RoleData::class,
        TurmaData::class,
        EnrollmentData::class,
        UserData::class,
        RedatorData::class,
        StudentData::class,
        CertificateSettingsData::class,
        QuoteData::class,
        CourseModuleData::class,
        ImportConfirmRowData::class,
        RedatorDocumentsData::class,
        RedatorDocumentUploadData::class,
        ProfileDocumentUploadData::class,
        DashboardFilterData::class,
        PageQueryData::class,
        TurmaPageQueryData::class,
        CertificatePageQueryData::class,
        EmissionPanelQueryData::class,
    ];

    /** @var list<class-string<Data>>|null */
    private ?array $alcance = null;

    public function test_data_de_entrada_nao_tem_default_literal(): void
    {
        $encontrados = [];

        foreach ($this->alcance() as $classe) {
            if (array_key_exists($classe, self::ISENTAS)) {
                continue;
            }

            foreach ($this->parametros($classe) as $parametro) {
                if (! $parametro->isDefaultValueAvailable()) {
                    continue;
                }

                if ($parametro->getDefaultValue() instanceof Optional || $this->eSaida($parametro)) {
                    continue;
                }

                $nome = $parametro->getName();
                $encontrados[] = "{$classe}::\${$nome} tem default literal — use X|Optional sem default (ausente nao e o default), marque #[Computed]/#[ReadOnlyCollection] se e saida, ou isente a classe com motivo";
            }
        }

        sort($encontrados);

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            ['Default literal em Data de entrada rebaixa/apaga dado no PUT parcial (bloco 51, D5). Ocorrencias:'],
            $encontrados,
        )));
    }

    /**
     * Isenção vencida: a classe saiu do alcance (renomeada, apagada, ou deixou
     * de ser entrada) e a linha ficou. Sem isto a `ISENTAS` só cresce.
     */
    public function test_isentas_sao_alcancadas(): void
    {
        $alcance = $this->alcance();
        $vencidas = [];

        foreach (self::ISENTAS as $classe => $motivo) {
            if (! in_array($classe, $alcance, true)) {
                $vencidas[] = $classe;
            }

            $this->assertGreaterThan(30, strlen(trim($motivo)), "Motivo curto demais para {$classe}.");
        }

        $this->assertSame([], $vencidas, implode("\n", array_merge(
            ['Isencao vencida: a classe nao pertence mais ao conjunto de entrada — tire a linha da ISENTAS:'],
            $vencidas,
        )));
    }

    /** O alcance cobre, no mínimo, toda classe da §2.1 que não é "fora do alcance". */
    public function test_alcance_cobre_a_classificacao_da_spec(): void
    {
        $ausentes = array_values(array_diff(self::PRE_CLASSIFICADAS_2_1, $this->alcance()));

        $this->assertSame([], $ausentes, implode("\n", array_merge(
            ['A catraca nao enxerga Data de entrada que a spec do bloco 51 (§2.1) classificou:'],
            $ausentes,
        )));
    }

    // ------------------------------------------------------------------ alcance

    /** @return list<class-string<Data>> */
    private function alcance(): array
    {
        if ($this->alcance !== null) {
            return $this->alcance;
        }

        $conjunto = [];
        $fila = array_merge($this->dataDosControllers(), $this->dataCriadosPorRequest());

        while ($fila !== []) {
            $classe = array_shift($fila);

            if (isset($conjunto[$classe])) {
                continue;
            }

            $conjunto[$classe] = true;

            foreach ($this->parametros($classe) as $parametro) {
                if ($this->eSaida($parametro)) {
                    continue;
                }

                foreach ($this->dataAninhados($parametro) as $aninhado) {
                    $fila[] = $aninhado;
                }
            }
        }

        $classes = array_keys($conjunto);
        sort($classes);

        return $this->alcance = $classes;
    }

    /**
     * (a) tipos Data dos parâmetros dos métodos públicos declarados nos
     * controllers de `app/Domains/*\/Http/Controllers/`.
     *
     * @return list<class-string<Data>>
     */
    private function dataDosControllers(): array
    {
        $classes = [];

        foreach ($this->arquivosPhp(base_path('app/Domains')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (! str_contains($local, '/Http/Controllers/')) {
                continue;
            }

            $controller = $this->classeDe($local);

            if (! class_exists($controller)) {
                continue;
            }

            foreach ((new ReflectionClass($controller))->getMethods(ReflectionMethod::IS_PUBLIC) as $metodo) {
                if ($metodo->getDeclaringClass()->getName() !== $controller) {
                    continue;
                }

                foreach ($metodo->getParameters() as $parametro) {
                    foreach ($this->tiposNomeados($parametro->getType()) as $tipo) {
                        if ($this->eData($tipo)) {
                            $classes[] = $tipo;
                        }
                    }
                }
            }
        }

        return $classes;
    }

    /**
     * (b) `X::validateAndCreate(` e `X::from($request…` em qualquer arquivo de
     * `app/`, com `X` resolvido pelos `use` do próprio arquivo (ou pelo
     * namespace dele).
     *
     * @return list<class-string<Data>>
     */
    private function dataCriadosPorRequest(): array
    {
        $classes = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match_all('/\b([A-Z]\w*)\s*::\s*(?:validateAndCreate\s*\(|from\s*\(\s*\$request)/', $codigo, $achados) < 1) {
                continue;
            }

            foreach (array_unique($achados[1]) as $curto) {
                $classe = $this->resolverCurto($codigo, $curto);

                if ($classe !== null && $this->eData($classe)) {
                    $classes[] = $classe;
                }
            }
        }

        return $classes;
    }

    /** @return class-string|null */
    private function resolverCurto(string $codigo, string $curto): ?string
    {
        if (preg_match('/^\s*use\s+([\w\\\\]+\\\\'.preg_quote($curto, '/').')\s*;/m', $codigo, $uso) === 1) {
            return class_exists($uso[1]) ? $uso[1] : null;
        }

        if (preg_match('/^\s*namespace\s+([\w\\\\]+)\s*;/m', $codigo, $ns) === 1) {
            $mesmoNamespace = $ns[1].'\\'.$curto;

            return class_exists($mesmoNamespace) ? $mesmoNamespace : null;
        }

        return null;
    }

    // --------------------------------------------------------------- reflexão

    /** @return list<ReflectionParameter> */
    private function parametros(string $classe): array
    {
        $construtor = (new ReflectionClass($classe))->getConstructor();

        return $construtor === null ? [] : $construtor->getParameters();
    }

    /** A propriedade é saída declarada — fora do alcance da regra. */
    private function eSaida(ReflectionParameter $parametro): bool
    {
        return $parametro->getAttributes(Computed::class) !== []
            || $parametro->getAttributes(ReadOnlyCollection::class) !== [];
    }

    /**
     * Data aninhado por tipo ou por `#[DataCollectionOf]`.
     *
     * @return list<class-string<Data>>
     */
    private function dataAninhados(ReflectionParameter $parametro): array
    {
        $classes = [];

        foreach ($this->tiposNomeados($parametro->getType()) as $tipo) {
            if ($this->eData($tipo)) {
                $classes[] = $tipo;
            }
        }

        foreach ($parametro->getAttributes(DataCollectionOf::class) as $atributo) {
            $item = $atributo->getArguments()[0] ?? null;

            if (is_string($item) && $this->eData($item)) {
                $classes[] = $item;
            }
        }

        return $classes;
    }

    /** @return list<string> */
    private function tiposNomeados(?ReflectionType $tipo): array
    {
        if ($tipo instanceof ReflectionNamedType) {
            return [$tipo->getName()];
        }

        if ($tipo instanceof ReflectionUnionType) {
            $nomes = [];

            foreach ($tipo->getTypes() as $parte) {
                if ($parte instanceof ReflectionNamedType) {
                    $nomes[] = $parte->getName();
                }
            }

            return $nomes;
        }

        return [];
    }

    private function eData(string $classe): bool
    {
        return class_exists($classe) && is_subclass_of($classe, Data::class);
    }

    private function classeDe(string $local): string
    {
        return 'App\\'.str_replace('/', '\\', substr($local, strlen('app/'), -strlen('.php')));
    }
}
