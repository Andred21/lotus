<?php

namespace App\Shared\Support;

/**
 * Onde a árvore do frontend está, visto de dentro do backend.
 *
 * Dois layouts reais, e o caminho é diferente em cada um:
 *
 * - **Container do compose:** `./frontend` é montado em `/frontend`, mount irmão de
 *   `/var/www` e não aninhado — `base_path('../frontend')` daria `/var/frontend`, que
 *   não existe.
 * - **CI (GitHub Actions):** não há container. O checkout é o repositório inteiro e o
 *   backend roda de `<workspace>/backend`, então o frontend é `base_path('../frontend')`.
 *
 * Medido em 2026-08-24: o path `/frontend` estava fixo no provider de tipos e no
 * `PermissionI18nParityTest`, e o job `backend` da CI reprovou nomeando o arquivo que
 * não existia. Quem resolve o caminho passa a ser este helper, um dono só.
 *
 * Não inventa fallback silencioso: se nenhuma das duas raízes existir, devolve a do
 * compose e deixa o chamador reprovar nomeando o path — um teste que passa porque não
 * conseguiu ler o arquivo é a lição 10 de novo.
 */
final class FrontendPath
{
    private const RAIZ_CONTAINER = '/frontend';

    public static function raiz(): string
    {
        if (is_dir(self::RAIZ_CONTAINER)) {
            return self::RAIZ_CONTAINER;
        }

        $irmao = base_path('../frontend');

        return is_dir($irmao) ? $irmao : self::RAIZ_CONTAINER;
    }

    public static function de(string $relativo): string
    {
        return self::raiz().'/'.ltrim($relativo, '/');
    }
}
