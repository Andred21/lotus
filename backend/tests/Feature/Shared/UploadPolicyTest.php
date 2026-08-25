<?php

namespace Tests\Feature\Shared;

use App\Domains\Identity\Services\UserPhotoService;
use App\Shared\Files\ContentClass;
use Illuminate\Support\Facades\Validator;
use Tests\Support\Files\BuildsRealUploads;
use Tests\TestCase;

/**
 * A política de arquivo passou a ser uma peça só (spec D4). Estes casos provam
 * o COMPORTAMENTO da peça com bytes reais — o que a suíte não conseguia provar
 * enquanto a regra estava copiada em sete controllers e o upload de teste era
 * um arquivo vazio.
 */
class UploadPolicyTest extends TestCase
{
    use BuildsRealUploads;

    private function passa(ContentClass $classe, string $bytes, string $nome, string $mimeDeclarado): bool
    {
        return Validator::make(
            ['arquivo' => $this->uploadReal($bytes, $nome, $mimeDeclarado)],
            ['arquivo' => $classe->regras()],
        )->passes();
    }

    public function test_documento_aceita_pdf_e_imagem(): void
    {
        $this->assertTrue($this->passa(ContentClass::Documento, $this->pdfReal(), 'cv.pdf', 'application/pdf'));
        $this->assertTrue($this->passa(ContentClass::Documento, $this->pngReal(), 'cedula.png', 'image/png'));
    }

    public function test_executavel_renomeado_para_pdf_e_recusado(): void
    {
        // O nome mente e o MIME declarado mente; quem decide é o conteúdo.
        $this->assertFalse($this->passa(
            ContentClass::Documento, $this->executavelReal(), 'contrato.pdf', 'application/pdf',
        ));
    }

    public function test_planilha_aceita_csv_real_e_recusa_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::Planilha, $this->csvReal(), 'alunos.csv', 'text/csv'));
        $this->assertFalse($this->passa(ContentClass::Planilha, $this->pdfReal(), 'alunos.csv', 'text/csv'));
    }

    public function test_documento_de_turma_so_aceita_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::DocumentoDeTurma, $this->pdfReal(), 'manual.pdf', 'application/pdf'));
        $this->assertFalse($this->passa(ContentClass::DocumentoDeTurma, $this->pngReal(), 'manual.pdf', 'application/pdf'));
    }

    public function test_imagem_recusa_pdf(): void
    {
        $this->assertTrue($this->passa(ContentClass::Imagem, $this->pngReal(), 'foto.png', 'image/png'));
        $this->assertFalse($this->passa(ContentClass::Imagem, $this->pdfReal(), 'foto.png', 'image/png'));
    }

    public function test_os_tetos_preservam_os_numeros_de_hoje(): void
    {
        // Mudar um teto é decisão, não efeito colateral de refatoração.
        $this->assertSame(5120, ContentClass::Imagem->tetoEmKb());
        $this->assertSame(10240, ContentClass::Documento->tetoEmKb());
        $this->assertSame(10240, ContentClass::DocumentoDeTurma->tetoEmKb());
        $this->assertSame(10240, ContentClass::Planilha->tetoEmKb());
    }

    public function test_a_foto_de_perfil_consome_a_peca_em_vez_de_reescrever(): void
    {
        // `assertEquals` e não `assertSame`: a partir da Task 9 a lista carrega
        // um `ScannedForMalware` novo a cada chamada, e identidade de objeto
        // reprovaria duas listas que são a mesma política.
        $this->assertEquals(
            ContentClass::Imagem->regras(),
            UserPhotoService::rules()['photo'],
            'O `UserPhotoService` voltou a escrever a própria regra em vez de pedir a classe.',
        );
    }
}
