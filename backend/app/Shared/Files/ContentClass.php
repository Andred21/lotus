<?php

namespace App\Shared\Files;

/**
 * Política de tipo e tamanho de upload — fonte única (spec D4). Os treze sítios
 * que recebem `UploadedFile` pedem a CLASSE de conteúdo; nenhum reescreve a
 * regra. Guarda viva: `UploadPolicyRatchetTest`.
 *
 * `mimes:` e `mimetypes:` juntos, com uma ressalva medida em 2026-08-25: no
 * Laravel os DOIS leem o conteúdo — `validateMimes()` compara
 * `guessExtension()`, que deriva de `getMimeType()`. Não são duas camadas, são
 * duas escritas do mesmo veredicto. `mimetypes:` fica por prender a string
 * exata do MIME, para que uma mudança futura no mapa mime→extensão do Symfony
 * não alargue a allowlist em silêncio.
 *
 * `bail` na frente NÃO é estilo: sem ele, um arquivo de tipo errado seguiria
 * até a regra de antivírus e mandaria 10 MB para o daemon só para ser recusado
 * pelo tipo depois.
 *
 * Os tetos são os números que já vigoravam. Mudá-los sem medição seria supor.
 */
enum ContentClass: string
{
    case Imagem = 'imagem';
    case Documento = 'documento';
    case DocumentoDeTurma = 'documento_de_turma';
    case Planilha = 'planilha';

    /**
     * Extensões aceitas. Documento aceita imagem (spec D7): documento
     * digitalizado e foto de documento é o que redator de rede não auditada
     * manda, e a lista fecha macro de Office e executável de uma vez.
     *
     * @return list<string>
     */
    public function extensoes(): array
    {
        return match ($this) {
            self::Imagem => ['jpg', 'jpeg', 'png', 'webp'],
            self::Documento => ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
            self::DocumentoDeTurma => ['pdf'],
            self::Planilha => ['xlsx', 'csv', 'txt'],
        };
    }

    /**
     * MIME de CONTEÚDO aceito. Todos medidos com arquivos reais no container em
     * 2026-08-25 — `text/plain` é o que o finfo devolve para um CSV de verdade,
     * e `text/csv` entra junto porque outras compilações do libmagic o devolvem.
     *
     * @return list<string>
     */
    public function mimes(): array
    {
        return match ($this) {
            self::Imagem => ['image/jpeg', 'image/png', 'image/webp'],
            self::Documento => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
            self::DocumentoDeTurma => ['application/pdf'],
            self::Planilha => [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv',
                'text/plain',
            ],
        };
    }

    /**
     * Teto em kilobytes. Fica ABAIXO do teto de transporte (nginx 12m, PHP 12M)
     * de propósito: quem rejeita é sempre esta regra, com envelope RFC 7807, e
     * nunca o nginx com um 413 que não passa pelo Laravel.
     */
    public function tetoEmKb(): int
    {
        return match ($this) {
            self::Imagem => 5120,
            self::Documento, self::DocumentoDeTurma, self::Planilha => 10240,
        };
    }

    /** @return list<string> */
    public function regras(bool $obrigatorio = true): array
    {
        return [
            'bail',
            $obrigatorio ? 'required' : 'nullable',
            'file',
            'mimes:'.implode(',', $this->extensoes()),
            'mimetypes:'.implode(',', $this->mimes()),
            'max:'.$this->tetoEmKb(),
        ];
    }
}
