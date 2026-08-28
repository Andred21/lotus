<?php

namespace App\Shared\Logging;

use Illuminate\Support\Facades\Log;
use Psr\Log\LogLevel;
use Throwable;

/**
 * Único caminho de escrita de evento de segurança (spec §4.5). A centralização
 * que o `RNF-SEC-05` pede é ESTA — dentro do monólito, por decisão registrada
 * do João em 2026-08-26, com o requisito revisado formalmente no ADR-21.
 *
 * **Um método nomeado por evento, com parâmetros tipados, e nenhum array livre
 * de contexto.** É de propósito e é o mecanismo da catraca 4: não existe
 * assinatura por onde senha, token, e-mail ou `old_values` entrem, então o
 * não-vazamento não depende de ninguém lembrar da regra (lição 14).
 *
 * Pelo mesmo motivo o login recusado recebe a chave já em HASH: o balde do
 * limitador é `email|ip` (`RateLimits::chaveDeLogin`), e o e-mail em claro num
 * log de segurança é justamente o dado que não pode estar lá.
 */
final class EventoDeSeguranca
{
    public const CANAL = 'seguranca';

    public static function loginConcedido(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('login.concedido', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function loginRecusado(string $chaveHash, ?string $ip): void
    {
        self::info('login.recusado', [
            'chave_hash' => $chaveHash,
            'ip' => $ip,
        ]);
    }

    public static function logout(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('login.encerrado', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function sessaoRevogada(int $usuarioId, string $usuarioTipo, ?string $ip): void
    {
        self::info('sessao.revogada', [
            'usuario_id' => $usuarioId,
            'usuario_tipo' => $usuarioTipo,
            'ip' => $ip,
        ]);
    }

    public static function acessoNegado(?int $usuarioId, ?string $ip, string $rota): void
    {
        self::info('acesso.negado', [
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'rota' => $rota,
        ]);
    }

    public static function taxaExcedida(?int $usuarioId, ?string $ip, string $rota): void
    {
        self::info('taxa.excedida', [
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'rota' => $rota,
        ]);
    }

    public static function podaExecutada(string $tabela, string $fase, int $linhas): void
    {
        self::info('retencao.poda', [
            'tabela' => $tabela,
            'fase' => $fase,
            'linhas' => $linhas,
        ]);
    }

    public static function alertaDeAcessoSuspeito(string $familia, ?int $usuarioId, ?string $ip, int $ocorrencias): void
    {
        self::escrever(LogLevel::WARNING, 'acesso.suspeito', [
            'familia' => $familia,
            'usuario_id' => $usuarioId,
            'ip' => $ip,
            'ocorrencias' => $ocorrencias,
        ]);
    }

    /** @param array<string,scalar|null> $dados */
    private static function info(string $evento, array $dados): void
    {
        self::escrever(LogLevel::INFO, $evento, $dados);
    }

    /**
     * Ponto ÚNICO de escrita — e, por isso, ponto único de contenção.
     *
     * A catraca 5 da spec ("alerta que quebra não pode derrubar a resposta")
     * vale para o log tanto quanto para o e-mail: o canal `seguranca` escreve
     * em `php://stderr` e pode falhar, e cada chamador desta fachada está num
     * caminho que precisa terminar do jeito certo mesmo assim — o `422` de
     * senha errada, o `401` que revoga a sessão de conta desativada, o `403`
     * que sai pelo handler global. Conter aqui dentro cobre TODOS os sítios de
     * uma vez, inclusive os que ainda não existem; conter em cada chamador
     * dependeria de alguém lembrar (lição 14).
     *
     * A falha não some: vai para o canal default pela `FalhaDeObservabilidade`,
     * que registra classe/código/origem e nunca a mensagem crua.
     *
     * @param  array<string,scalar|null>  $dados
     */
    private static function escrever(string $nivel, string $evento, array $dados): void
    {
        try {
            Log::channel(self::CANAL)->log($nivel, 'lotus.seguranca', ['evento' => $evento] + $dados);
        } catch (Throwable $falha) {
            FalhaDeObservabilidade::registrar(
                'Falha ao gravar evento no canal de seguranca',
                $falha,
                ['evento' => $evento],
            );
        }
    }
}
