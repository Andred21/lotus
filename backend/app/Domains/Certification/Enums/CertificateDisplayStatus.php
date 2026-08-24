<?php

namespace App\Domains\Certification\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * O estado de EXIBIÇÃO do certificado — dono único da regra (spec D4).
 *
 * `CertificateStatus` tem dois valores porque é o que o banco guarda; esta é a
 * pergunta que a tela faz, e ela combina o estado persistido com a data. A
 * regra vivia em `frontend/src/features/certification/lib/certStatus.ts`, e o
 * DoD proíbe regra de domínio reconstruída no React — duas implementações de
 * "vigente" num documento de peso legal é o que o docblock do
 * `CertificateVigenciaResolver` chama de "respostas esperando para divergir".
 *
 * Quatro valores, e vigência indeterminada NÃO ganha um quinto (spec D5): o
 * sinal de "tem prazo" já existe e é `valido_ate !== null`. Valor novo aqui
 * contamina o filtro e os quatro contadores do rodapé do Historial.
 */
enum CertificateDisplayStatus: string
{
    case Vigente = 'vigente';
    case PorVencer = 'por_vencer';
    case Vencido = 'vencido';
    case Revocado = 'revocado';

    /** Janela de aviso antes do vencimento. Chave i18n: `certificate.status.<valor>`. */
    public const POR_VENCER_DIAS = 30;

    /**
     * D10: `config/app.php` fixa `'timezone' => 'UTC'` LITERAL, sem `env()`, e
     * o `APP_TIMEZONE=America/Santiago` do `.env.example` é ignorado. Corrigir
     * o config muda comportamento global e não cabe neste bloco — então a
     * derivação declara o fuso em vez de herdar o errado.
     */
    public const TIMEZONE = 'America/Santiago';

    /** "Hoje" no fuso do cliente, à meia-noite. Comparação é por data pura. */
    public static function hoje(): CarbonImmutable
    {
        return CarbonImmutable::instance(Carbon::now(self::TIMEZONE))->startOfDay();
    }

    /**
     * A ordem das quatro regras É a regra:
     *
     * 1. revogado, ANTES de olhar data alguma;
     * 2. sem `valido_ate` é vigente — o caso comum;
     * 3. anterior a hoje é vencido (vencer HOJE ainda é vigente);
     * 4. faltando de 1 a 30 dias avisa; vencendo hoje (0) ou faltando 31 dias
     *    ou mais é vigente.
     */
    public static function for(
        CertificateStatus $status,
        ?CarbonInterface $validoAte,
        CarbonInterface $hoje,
    ): self {
        if ($status === CertificateStatus::Revocado) {
            return self::Revocado;
        }

        if ($validoAte === null) {
            return self::Vigente;
        }

        // D10: comparação é por DATA pura, não por instante. O cast Eloquent
        // grava `valido_ate` em meia-noite UTC (`config/app.php` fixa UTC) e
        // `hoje()` devolve meia-noite em Santiago — mesma data de calendário,
        // instantes diferentes. `startOfDay()` não resolve isso: ele zera a
        // hora no fuso que o Carbon JÁ carrega, então compararia instantes,
        // não dias. Reconstruir os dois a partir dos componentes de data, no
        // MESMO fuso, é o que torna a subtração de dias um inteiro de verdade.
        $limite = CarbonImmutable::create($validoAte->year, $validoAte->month, $validoAte->day, 0, 0, 0, self::TIMEZONE);
        $inicio = CarbonImmutable::create($hoje->year, $hoje->month, $hoje->day, 0, 0, 0, self::TIMEZONE);

        if ($limite->lessThan($inicio)) {
            return self::Vencido;
        }

        $daysRemaining = $inicio->diffInDays($limite);

        return $daysRemaining > 0 && $daysRemaining <= self::POR_VENCER_DIAS
            ? self::PorVencer
            : self::Vigente;
    }
}
