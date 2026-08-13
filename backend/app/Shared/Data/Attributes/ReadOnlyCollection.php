<?php

namespace App\Shared\Data\Attributes;

use Attribute;

/**
 * Marca uma coleção nested que só existe na SAÍDA: o `fromModel` a preenche, e
 * nenhuma Action a lê da entrada.
 *
 * A lei "coleção nested read-write nasce `Optional`" (`der-fisico.md`, ADR-04)
 * fala de coleção que a escrita consome — o `#[DataCollectionOf]` sozinho não
 * distingue os dois sentidos. Sem este marcador, a guarda de
 * `PersistenceLawsTest` reprovaria projeções que não violam lei nenhuma; com
 * ele, a exceção fica onde quem lê o DTO a vê, em vez de numa lista dentro do
 * teste.
 */
#[Attribute(Attribute::TARGET_PROPERTY | Attribute::TARGET_PARAMETER)]
class ReadOnlyCollection {}
