<?php

namespace App\Shared\Alerts;

/**
 * Fonte única dos limiares de acesso suspeito (spec §4.6). Mesmo idioma do
 * `Shared/RateLimiting/RateLimits` e do `Shared/Retention/RetentionPolicy`:
 * quem quer saber quando o alerta dispara lê ESTE arquivo.
 *
 * É o "parâmetro de identificação definido" que o `RNF-SEC-07` pede
 * nominalmente — a fonte canônica exige que exista e NÃO diz qual é.
 *
 * Os números saem do desenho de contenção que já está no ar, não de palpite:
 * o limitador `login` é 5 por minuto na chave `email|ip`
 * (`RateLimits::LOGIN`), então 15 falhas em 15 minutos é alguém que continuou
 * tentando depois de tomar 429 — persistência, e não dedo errado. O teto
 * autenticado é 240 por minuto (`RateLimits::API_AUTENTICADO`), então 20
 * negações de autorização em 10 minutos é varredura de permissão, e não a
 * pessoa clicando num botão que não devia estar visível.
 *
 * Sessão de conta desativada não tem limiar de contagem: a primeira já é o
 * evento. A janela existe só para não repetir o mesmo alerta enquanto a aba
 * aberta da pessoa segue tentando.
 */
final class AlertThresholds
{
    /** Falhas na MESMA chave `email|ip` que disparam o alerta. */
    public const LOGIN_FALHO_LIMIAR = 15;

    /** 15 minutos. */
    public const LOGIN_FALHO_JANELA_SEGUNDOS = 900;

    /** 24 horas: um alerta por conta por dia, não um por request da aba aberta. */
    public const SESSAO_REVOGADA_JANELA_SEGUNDOS = 86400;

    /** Negações de autorização do mesmo usuário que disparam o alerta. */
    public const ACESSO_NEGADO_LIMIAR = 20;

    /** 10 minutos. */
    public const ACESSO_NEGADO_JANELA_SEGUNDOS = 600;
}
