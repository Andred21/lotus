<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Models\Turma;
use App\Shared\Office\DocxToPdf;
use App\Shared\Office\OoxmlPackager;

/**
 * Libro de Control de Clases (RF-TUR-04). Blade única padronizada (D6)
 * renderizada com os dados ATUAIS — nada materializado (D7, mesmo racional do
 * certificado RF-CER-03).
 *
 * O nome deixou de ser `ManualPdfService` porque o documento deixou de ser só
 * PDF: `docx()` é a fonte de verdade e `pdf()` é uma SAÍDA dela. Quem quiser
 * mudar o manual muda um lugar, e os dois formatos acompanham.
 */
class ManualDocumentService
{
    public function __construct(
        private readonly OoxmlPackager $packager,
        private readonly DocxToPdf $converter,
    ) {}

    public function docx(Turma $turma): string
    {
        $turma->load([
            'course.modules', 'quote.budget.client.user', 'redatores.user',
            // As três grades numeram linha a linha e são ASSINADAS por linha.
            // Sem ORDER BY a relação vem na ordem que o banco quiser, e o PDF e
            // o DOCX — que são dois requests — podiam numerar a mesma turma de
            // dois jeitos. É o defeito que o `orderByStudentName` já documenta
            // para a tela, aqui com peso de documento.
            'enrollments' => fn ($q) => $q->orderByStudentName(),
            'enrollments.student.user',
            'enrollments.student.currentClient',
        ]);

        return $this->packager->package([
            '[Content_Types].xml' => view('operation.manual.content-types')->render(),
            '_rels/.rels' => view('operation.manual.rels')->render(),
            'word/document.xml' => view('operation.manual.document', ['turma' => $turma])->render(),
            'word/_rels/document.xml.rels' => view('operation.manual.document-rels')->render(),
            'word/media/lotus-logo.png' => (string) file_get_contents(
                resource_path('images/lotus-logo.png'),
            ),
        ]);
    }

    /**
     * O PDF sai do MESMO pacote que o download entrega. Não há segundo caminho
     * de montagem — é o que o DoD 9 do bloco cobra.
     */
    public function pdf(Turma $turma): string
    {
        return $this->converter->render($this->docx($turma));
    }
}
