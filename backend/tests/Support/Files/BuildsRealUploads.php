<?php

namespace Tests\Support\Files;

use Illuminate\Http\UploadedFile;

/**
 * `UploadedFile::fake()` não serve para provar regra de CONTEÚDO: o arquivo sai
 * vazio e `getMimeType()` devolve o que o teste declarou, nunca o que os bytes
 * são (medido em `Illuminate\Http\Testing\File`). Aqui os bytes são reais, e o
 * `finfo` que o Laravel usa vê o que veria em produção.
 */
trait BuildsRealUploads
{
    /** Assinatura de teste padrão da indústria — todo antivírus a reconhece, e ela não é maliciosa. */
    public const EICAR = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

    protected function pdfReal(): string
    {
        return "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
    }

    protected function pngReal(): string
    {
        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        );
    }

    protected function csvReal(): string
    {
        return "RUT,Nombre,Email,Telefono\n11.111.111-1,Ana,ana@lotus.cl,+56900000000\n";
    }

    /** Um ELF de verdade: o binário `sh` do próprio container. */
    protected function executavelReal(): string
    {
        return (string) file_get_contents('/bin/sh');
    }

    /**
     * Monta um `UploadedFile` REAL (não o fake do framework) sobre os bytes
     * dados. `$nome` é o que o cliente declara — é justamente o que precisa
     * poder mentir para as regras de conteúdo terem o que provar.
     */
    protected function uploadReal(string $bytes, string $nome, string $mimeDeclarado): UploadedFile
    {
        $caminho = tempnam(sys_get_temp_dir(), 'lotus-upload-');
        file_put_contents($caminho, $bytes);

        // `$test: true` faz o `UploadedFile` aceitar um arquivo que não veio de
        // um POST real; o `getMimeType()` continua lendo os bytes.
        return new UploadedFile($caminho, $nome, $mimeDeclarado, null, true);
    }
}
