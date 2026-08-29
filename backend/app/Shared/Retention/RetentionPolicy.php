<?php

namespace App\Shared\Retention;

use Carbon\CarbonImmutable;

/**
 * Fonte única da política de retenção (spec §4.1). Nenhum prazo mora no
 * comando, na migration ou no `routes/console.php`: quem quer saber a política
 * lê ESTE arquivo. Mesmo idioma do `Shared/RateLimiting/RateLimits`.
 *
 * As janelas foram decididas pelo João em 2026-08-26 e NÃO saem de requisito
 * escrito: nenhum RNF-SEC fixa prazo (Context Packet, key fact 2). Trocar um
 * número aqui é decisão de negócio com peso legal, não refatoração.
 *
 * `audits` tem DUAS janelas porque guarda duas coisas com valores diferentes:
 * a trilha de quem/o quê/valor antigo/novo, que o RNF-SEC-04 exige e que
 * acompanha o peso legal do certificado (5 anos), e `ip_address`/`user_agent`/
 * `url`, que são PII pura e saem na mesma janela do `login_logs` (12 meses).
 * Sem a primeira janela, o IP sobreviveria 5 anos pela porta da auditoria —
 * era exatamente o buraco que a P-33 apontava no `login_logs`.
 */
final class RetentionPolicy
{
    /** Fase 1 da `audits`: apaga `ip_address`, `user_agent` e `url`, preserva o resto. */
    public const AUDITS_ANONIMIZAR_MESES = 12;

    /** Fase 2 da `audits`: apaga a linha. 5 anos, acompanhando o peso legal do certificado. */
    public const AUDITS_DESCARTAR_MESES = 60;

    /** `login_logs` é PII pura e não tem trilha a preservar: descarte direto. */
    public const LOGIN_LOGS_DESCARTAR_MESES = 12;

    /**
     * Linhas por passada. Existe para que a poda não segure a tabela numa
     * sentença só — a `audits` cresceu 5513 linhas em 15 dias de DESENVOLVIMENTO
     * (medição da spec §1), e produção roda com usuários acordados de manhã.
     */
    public const CHUNK = 1000;

    public static function limiteDeAnonimizacaoDeAudits(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::AUDITS_ANONIMIZAR_MESES);
    }

    public static function limiteDeDescarteDeAudits(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::AUDITS_DESCARTAR_MESES);
    }

    public static function limiteDeDescarteDeLoginLogs(): CarbonImmutable
    {
        return CarbonImmutable::now()->subMonths(self::LOGIN_LOGS_DESCARTAR_MESES);
    }
}
