<?php

namespace App\Shared\Alerts;

use App\Domains\Identity\Models\User;
use App\Shared\Alerts\Notifications\AcessoSuspeito;
use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\Logging\FalhaDeObservabilidade;
use Illuminate\Support\Facades\Cache;
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
 * **Nada daqui escapa (catraca 5).** Os três métodos públicos são chamados de
 * dentro do caminho de autenticação — `AuthController::login()`, o middleware
 * `EnsureAccountIsActive`, o `render()` global — onde a resposta certa é `422`,
 * `401` ou `403`, nunca `500`. Cada um roda dentro de `contido()`: se o balde
 * do limitador, o cache ou o canal de log estiverem fora do ar, o alerta se
 * perde e a resposta sai como deve. Conter aqui e não em cada chamador é o que
 * faz a garantia valer para os sítios que ainda não existem (lição 14).
 *
 * Dentro disso, o envio tem `try` PRÓPRIO: alerta que quebra não pode nem
 * derrubar a resposta nem apagar o registro. A linha do canal de segurança sai
 * ANTES do e-mail pelo mesmo motivo — ela é o registro que sobrevive a SES fora
 * do ar.
 */
class DetectorDeAcessoSuspeito
{
    public function loginFalho(string $chave, ?string $ip): void
    {
        $this->contido('login_falho_repetido', function () use ($chave, $ip) {
            $ocorrencias = RateLimiter::hit(
                'suspeito:login-falho:'.hash('sha256', $chave),
                AlertThresholds::LOGIN_FALHO_JANELA_SEGUNDOS,
            );

            if ($ocorrencias === AlertThresholds::LOGIN_FALHO_LIMIAR) {
                $this->alertar('login_falho_repetido', null, $ip, $ocorrencias);
            }
        });
    }

    public function sessaoDeContaDesativada(int $usuarioId, ?string $ip): void
    {
        $this->contido('sessao_de_conta_desativada', function () use ($usuarioId, $ip) {
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
        });
    }

    public function acessoNegado(int $usuarioId, ?string $ip): void
    {
        $this->contido('sequencia_de_403', function () use ($usuarioId, $ip) {
            $ocorrencias = RateLimiter::hit(
                'suspeito:403:'.$usuarioId,
                AlertThresholds::ACESSO_NEGADO_JANELA_SEGUNDOS,
            );

            if ($ocorrencias === AlertThresholds::ACESSO_NEGADO_LIMIAR) {
                $this->alertar('sequencia_de_403', $usuarioId, $ip, $ocorrencias);
            }
        });
    }

    /**
     * A contenção da catraca 5, num lugar só. O que roda aqui dentro é
     * observação — medir a janela, registrar, avisar —, e observação nenhuma
     * justifica trocar a resposta do chamador por um `500`.
     */
    private function contido(string $familia, callable $medicao): void
    {
        try {
            $medicao();
        } catch (Throwable $falha) {
            FalhaDeObservabilidade::registrar(
                'Falha ao avaliar acesso suspeito',
                $falha,
                ['familia' => $familia],
            );
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
        } catch (Throwable $falha) {
            // Sem `getMessage()`: a exceção de transporte do Symfony Mailer
            // carrega a resposta do SMTP, e nela vem o destinatário — o dado
            // que a catraca 4 mantém fora do log.
            FalhaDeObservabilidade::registrar(
                'Falha ao enviar alerta de acesso suspeito',
                $falha,
                ['familia' => $familia],
            );
        }
    }
}
