<?php

namespace App\Shared\Alerts;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\Notifications\AcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * As três famílias de acesso suspeito do `RNF-SEC-07` (spec §4.6), cada uma
 * com condição mensurável, destino e expectativa temporal.
 *
 * Conta nos MESMOS baldes de cache que o throttle já usa: nenhuma infra nova
 * sobe, e a contagem morre sozinha no fim da janela. `RateLimiter::hit()`
 * devolve a contagem depois do incremento, e o alerta dispara na IGUALDADE ao
 * limiar — não em `>=` —, o que dá exatamente um alerta por janela em vez de um
 * por request a partir do limiar.
 *
 * **Síncrono, no request que cruza o limiar (D7).** Produção não tem worker de
 * fila; assíncrono exigiria subir um, e isso é outro bloco. Cruzar limiar é
 * raro por construção e o caminho já é resposta de erro.
 *
 * O envio vai dentro de `try`: alerta que quebra NÃO pode derrubar a resposta.
 * A linha do canal de segurança sai ANTES do e-mail pelo mesmo motivo — ela é
 * o registro que sobrevive a SES fora do ar.
 */
class DetectorDeAcessoSuspeito
{
    public function loginFalho(string $chave, ?string $ip): void
    {
        $ocorrencias = RateLimiter::hit(
            'suspeito:login-falho:'.hash('sha256', $chave),
            AlertThresholds::LOGIN_FALHO_JANELA_SEGUNDOS,
        );

        if ($ocorrencias === AlertThresholds::LOGIN_FALHO_LIMIAR) {
            $this->alertar('login_falho_repetido', null, $ip, $ocorrencias);
        }
    }

    public function sessaoDeContaDesativada(int $usuarioId, ?string $ip): void
    {
        // Sem contagem: a primeira ocorrência JÁ é o evento. O `Cache::add`
        // devolve `true` só para quem chegou primeiro na janela, e é isso que
        // impede uma aba aberta de gerar um alerta por request.
        $primeira = Cache::add(
            'suspeito:sessao-revogada:'.$usuarioId,
            true,
            AlertThresholds::SESSAO_REVOGADA_JANELA_SEGUNDOS,
        );

        if ($primeira) {
            $this->alertar('sessao_de_conta_desativada', $usuarioId, $ip, 1);
        }
    }

    public function acessoNegado(int $usuarioId, ?string $ip): void
    {
        $ocorrencias = RateLimiter::hit(
            'suspeito:403:'.$usuarioId,
            AlertThresholds::ACESSO_NEGADO_JANELA_SEGUNDOS,
        );

        if ($ocorrencias === AlertThresholds::ACESSO_NEGADO_LIMIAR) {
            $this->alertar('sequencia_de_403', $usuarioId, $ip, $ocorrencias);
        }
    }

    private function alertar(string $familia, ?int $usuarioId, ?string $ip, int $ocorrencias): void
    {
        EventoDeSeguranca::alertaDeAcessoSuspeito($familia, $usuarioId, $ip, $ocorrencias);

        try {
            $admins = User::query()
                ->where('type', 'admin')
                ->where('is_active', true)
                ->get();

            if ($admins->isEmpty()) {
                return;
            }

            Notification::send(
                $admins,
                (new AcessoSuspeito($familia, $usuarioId, $ip, $ocorrencias))->locale('es_CL'),
            );
        } catch (Throwable $e) {
            Log::error('Falha ao enviar alerta de acesso suspeito', [
                'familia' => $familia,
                'erro' => $e->getMessage(),
            ]);
        }
    }
}
