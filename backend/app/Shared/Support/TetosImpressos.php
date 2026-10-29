<?php

namespace App\Shared\Support;

/**
 * Tetos de caracteres dos campos que o certificado imprime (spec D10, D15). O PDF
 * nunca corta texto, então o que não cabe na página 1 é recusado na ENTRADA, e
 * estes são os números dessa recusa: as Tasks 7 (backend) e 11 (front) os aplicam.
 *
 * **Medição** (bloco 40, Task 6; Gotenberg `8.36.0`, Chromium 151; layout v5, A4):
 * texto realista em espanhol, nomes em MAIÚSCULAS, a pior caixa mista possível.
 *
 * - Cada NOME recebe o maior comprimento de `TextoRealista::nome()` em que ele,
 *   sozinho, ocupa no máximo 2 linhas da própria caixa (busca binária, arredondada
 *   para baixo à dezena). No técnico a caixa inclui o " · 32 horas cronológicas"
 *   que a segue na mesma linha; nas assinaturas, a coluna de 66 mm.
 * - A DESCRIÇÃO recebe o maior comprimento de `TextoRealista::prosa()` em que, com
 *   TODOS os nomes no teto, mais nota, asistencia e vigência, as assinaturas
 *   continuam na página 1 e o documento fecha em 2 páginas.
 *
 * | campo           | maior de produção | teto | linhas no teto | máximo medido (antes de arredondar) |
 * |-----------------|-------------------|------|----------------|-------------------------------------|
 * | NOME_ALUNO      | pendente          |  70  | 2              | 79                                  |
 * | NOME_CURSO      | pendente          | 110  | 2              | 110                                 |
 * | NOME_TECNICO    | pendente          | 160  | 2              | 169                                 |
 * | RAZAO_SOCIAL    | pendente          | 150  | 2              | 152                                 |
 * | NOME_ASSINANTE  | pendente          |  60  | 2              | 65                                  |
 * | CARGO_ASSINANTE | pendente          |  70  | 2              | 75                                  |
 * | DESCRICAO_CURSO | pendente          | 620  | 7 (com nota)   | 627                                 |
 *
 * "Maior de produção" é a conferência da folga (nomes: teto >= 1,5x; descrição:
 * teto >= o maior valor): leitura só-leitura em produção, a cargo do João, e o
 * resultado entra em `docs/superpowers/blocos/40-certificado-refinamento-e-validade/matriz.md`.
 *
 * O teto da descrição vale para PROSA: a mesma área comporta bem menos caracteres
 * de palavras longas e uniformes (D15 e §2 da spec), então ele não é garantia
 * para texto adversário. Esse apenas nunca perde texto, e pode levar as
 * assinaturas para a página 2.
 *
 * **Mexer num valor, no layout ou na tag do Gotenberg (D17) obriga a rodar
 * `CertificadoMatrizGotenbergTest` de novo** e atualizar a tabela acima.
 */
final class TetosImpressos
{
    public const NOME_ALUNO = 70;

    public const NOME_CURSO = 110;

    public const NOME_TECNICO = 160;

    public const DESCRICAO_CURSO = 620;

    public const RAZAO_SOCIAL = 150;

    /** Nome da gerente e do instrutor: a mesma coluna das assinaturas. */
    public const NOME_ASSINANTE = 60;

    public const CARGO_ASSINANTE = 70;
}
