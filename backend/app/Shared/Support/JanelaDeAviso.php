<?php

namespace App\Shared\Support;

/**
 * Dono único da janela de aviso de vencimento (D-15, spec D13 do bloco
 * `hardening-performance-e-dados`).
 *
 * Três domínios avisam "vence em breve" — documento de redator (Identity),
 * alertas do Dashboard (documento E certificado) e estado de exibição do
 * certificado (Certification) — e cada um carregava o próprio `30`. Os três
 * tinham o mesmo valor por coincidência de escrita, não por mecanismo; um deles
 * mudar sozinho faria o Dashboard alertar sobre um certificado que a listagem
 * ainda chama de vigente.
 *
 * Mora em Shared porque é o único lugar que não abre aresta na matriz do
 * `DomainDependencyTest`. Se certificado e documento um dia precisarem de
 * janelas diferentes, a separação nasce AQUI, com duas constantes nomeadas e a
 * regra escrita — não voltando a três literais.
 */
final class JanelaDeAviso
{
    /** Dias antes do vencimento a partir dos quais se avisa. */
    public const DIAS = 30;
}
