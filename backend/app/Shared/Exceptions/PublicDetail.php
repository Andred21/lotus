<?php

namespace App\Shared\Exceptions;

/**
 * Marca a exceção cuja `getMessage()` foi **escrita para quem lê a resposta**,
 * e não para o log.
 *
 * O `ProblemDetails` troca o `detail` de todo 500 por um genérico quando
 * `app.debug` é falso — regra certa por padrão: mensagem de exceção interna
 * costuma carregar caminho de arquivo, SQL ou nome de classe. Mas ela também
 * apagava, em produção, a única recusa que o operador precisa ler por inteiro:
 * `CorruptedSnapshotException`, que nomeia o certificado e os campos que
 * faltam no documento congelado.
 *
 * Quem implementa esta interface assume duas obrigações:
 *
 * 1. a mensagem está no idioma do usuário (es-CL), não em PT-BR de docblock;
 * 2. a mensagem não vaza nada que a resposta já não pudesse dizer — nada de
 *    caminho de arquivo, credencial, SQL ou dado de terceiro. O `detail` de
 *    uma exceção marcada assim pode sair em rota **pública**, sem sessão.
 */
interface PublicDetail {}
