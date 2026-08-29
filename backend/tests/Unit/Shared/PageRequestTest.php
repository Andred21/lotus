<?php

namespace Tests\Unit\Shared;

use App\Shared\Pagination\PageRequest;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Catraca do contrato de entrada (spec D3): teto de `per_page` recusa em vez
 * de clampar, `page` começa em 1 e `q` tem tamanho. A allowlist de `sort` é do
 * builder e é provada por HTTP em `StudentPaginationTest`.
 */
class PageRequestTest extends TestCase
{
    public function test_defaults_sao_pagina_um_e_vinte_e_cinco_por_pagina(): void
    {
        $request = PageRequest::validateAndCreate([]);

        $this->assertSame(1, $request->page);
        $this->assertSame(25, $request->per_page);
        $this->assertNull($request->q);
        $this->assertNull($request->sort);
    }

    public function test_query_string_e_coagida_para_inteiro(): void
    {
        $request = PageRequest::validateAndCreate(['page' => '3', 'per_page' => '10', 'q' => 'ana', 'sort' => '-name']);

        $this->assertSame(3, $request->page);
        $this->assertSame(10, $request->per_page);
        $this->assertSame('ana', $request->q);
        $this->assertSame('-name', $request->sort);
    }

    /** @return array<string, array{0: array<string, mixed>}> */
    public static function entradasRecusadas(): array
    {
        return [
            'per_page acima do teto' => [['per_page' => PageRequest::PER_PAGE_MAX + 1]],
            'per_page zero' => [['per_page' => 0]],
            'page zero' => [['page' => 0]],
            'page negativa' => [['page' => -1]],
            'page não numérica' => [['page' => 'abc']],
            'q acima do tamanho' => [['q' => str_repeat('a', PageRequest::Q_MAX + 1)]],
        ];
    }

    /**
     * @param  array<string, mixed>  $entrada
     */
    #[DataProvider('entradasRecusadas')]
    public function test_entrada_fora_do_contrato_e_recusada_por_validacao(array $entrada): void
    {
        $this->expectException(ValidationException::class);

        PageRequest::validateAndCreate($entrada);
    }

    public function test_per_page_no_teto_e_aceito(): void
    {
        $this->assertSame(PageRequest::PER_PAGE_MAX, PageRequest::validateAndCreate(['per_page' => PageRequest::PER_PAGE_MAX])->per_page);
    }
}
