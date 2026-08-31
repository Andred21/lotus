<?php

namespace App\Shared\Files;

use App\Shared\Files\Rules\ScannedForMalware;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Spatie\TypeScriptTransformer\Attributes\Hidden;

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
 *
 * `#[Hidden]` porque o `EnumCollector` do typescript-transformer varre TODO enum
 * de `app/` e este vazou para o `generated.ts` sem nenhum consumidor do outro
 * lado (achado Q-7 do review de 2026-08-25): política de upload do backend não é
 * contrato do SPA.
 */
#[Hidden]
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
     * Teto do CORPO inteiro quando um sítio recebe VÁRIOS arquivos no mesmo
     * multipart. Sem ele a garantia do `tetoEmKb()` era falsa exatamente onde
     * este bloco estreou a política: `POST /api/redatores` aceita quatro
     * `documents[<TIPO>]`, e quatro documentos de 10 MB somam 40 MB contra os
     * 12 MB do `client_max_body_size` (achado Q-3 do review de 2026-08-25).
     * Abaixo do transporte pelo mesmo motivo do teto por arquivo.
     */
    public const TETO_AGREGADO_KB = 10240;

    /**
     * Teto por arquivo, em kilobytes. Fica ABAIXO do teto de transporte (nginx
     * 12m, PHP 12M) de propósito: tudo o que esta política ACEITA cabe no
     * transporte, então quem rejeita conteúdo aceitável é sempre esta regra,
     * com envelope RFC 7807, e nunca o nginx com um 413 que não passa pelo
     * Laravel. Num sítio de vários arquivos a garantia só vale junto com o
     * `TETO_AGREGADO_KB`.
     */
    public function tetoEmKb(): int
    {
        return match ($this) {
            self::Imagem => 5120,
            self::Documento, self::DocumentoDeTurma, self::Planilha => 10240,
        };
    }

    /**
     * Guarda do corpo inteiro num sítio que recebe vários arquivos. Vem ANTES
     * das regras por arquivo de propósito: escanear quatro binários no ClamAV
     * para só então recusar o conjunto seria mandar bytes ao daemon à toa.
     *
     * @param  array<array-key,UploadedFile>  $arquivos
     *
     * @throws ValidationException
     */
    public static function assertCabeNoTransporte(array $arquivos, string $campo): void
    {
        $somaEmKb = array_sum(array_map(
            fn (UploadedFile $arquivo) => (int) ceil(((int) $arquivo->getSize()) / 1024),
            $arquivos,
        ));

        $tetoEmMb = intdiv(self::TETO_AGREGADO_KB, 1024);

        if ($somaEmKb > self::TETO_AGREGADO_KB) {
            throw ValidationException::withMessages([
                $campo => __('shared.file.set_too_large', ['max' => $tetoEmMb]),
            ]);
        }
    }

    /** @return list<string|object> */
    public function regras(bool $obrigatorio = true): array
    {
        return [
            'bail',
            $obrigatorio ? 'required' : 'nullable',
            'file',
            'mimes:'.implode(',', $this->extensoes()),
            'mimetypes:'.implode(',', $this->mimes()),
            'max:'.$this->tetoEmKb(),
            // Por último de propósito: só vale mandar bytes ao daemon depois de
            // o tipo e o tamanho já terem passado.
            new ScannedForMalware,
        ];
    }
}
