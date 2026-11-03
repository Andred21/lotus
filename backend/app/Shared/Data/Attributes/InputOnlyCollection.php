<?php

namespace App\Shared\Data\Attributes;

use Attribute;

/**
 * Marca uma coleção nested que só existe na ENTRADA: uma Action a lê do corpo, e
 * nenhum `fromModel` a devolve. É a irmã de `#[ReadOnlyCollection]`.
 *
 * A lei "coleção nested read-write nasce `Optional`" (`der-fisico.md`, ADR-04)
 * existe porque `[]` apaga e a ausência não mexe. Numa coleção que só entra — o
 * corpo da confirmação da importação — não há o que apagar: a ausência é recusa,
 * não "não mexe", e o campo é obrigatório. Marcar a propriedade evita forçar
 * `Optional` onde ele mentiria sobre o contrato.
 *
 * A marca é VERIFICADA por `PersistenceLawsTest::test_colecao_nested_read_write_nasce_optional`,
 * não confiada: a guarda a aceita só se a propriedade tiver `#[DataCollectionOf]`,
 * se o tipo NÃO admitir `Optional` e não houver default (senão a ausência voltaria
 * a ser tolerada) e se a classe NÃO declarar `fromModel` (senão a coleção também
 * sai, e a lei read-write volta a valer). Cada violação é uma linha da mensagem.
 */
#[Attribute(Attribute::TARGET_PROPERTY | Attribute::TARGET_PARAMETER)]
class InputOnlyCollection {}
