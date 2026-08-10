<?php

namespace App\Providers;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use App\Shared\Office\DocxToPdf;
use App\Shared\Office\GotenbergDocxToPdf;
use App\Shared\Pdf\GotenbergHtmlToPdf;
use App\Shared\Pdf\HtmlToPdf;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Conversor de PDF (ADR-12): um adapter para os dois documentos. Nos
        // testes o binding troca pelo `FakeHtmlToPdf`, que guarda o HTML.
        $this->app->bind(HtmlToPdf::class, GotenbergHtmlToPdf::class);

        // Conversor DOCX→PDF (rota LibreOffice do mesmo Gotenberg). Nos testes
        // o binding troca pelo `FakeDocxToPdf`, que guarda o pacote.
        $this->app->bind(DocxToPdf::class, GotenbergDocxToPdf::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::enforceMorphMap([
            'user' => User::class,
            'client' => Client::class,
            'client_address' => ClientAddress::class,
            'client_contact' => ClientContact::class,
            'redator' => Redator::class,
            'student' => Student::class,
            'course' => Course::class,
            'course_certificate_template' => CourseCertificateTemplate::class,
            'course_module' => CourseModule::class,
            'certificate' => Certificate::class,
            'turma' => Turma::class,
            'enrollment' => Enrollment::class,
            'budget' => Budget::class,
            'quote' => Quote::class,
            'file' => File::class,
        ]);

        // Diretivas de escape do OOXML. Existem para que a Blade do manual não
        // tenha NENHUM `{{ }}` nem `{!! !!}`: o primeiro escapa para HTML e
        // deixa passar caractere de controle; o segundo não escapa nada e lê
        // como "conteúdo cru" para quem revisa. Guarda em ManualTurmaTest.
        Blade::directive('xml', fn (string $expression) => "<?php echo \App\Shared\Office\Xml::text({$expression}); ?>");
        Blade::directive('xmlLines', fn (string $expression) => "<?php echo \App\Shared\Office\Xml::lines({$expression}); ?>");

        /* `short_open_tag` está **On** neste PHP (medido no container em
           2026-08-10), então uma Blade que comece com a declaração XML literal
           é compilada num arquivo que o PHP tenta abrir como tag curta:
           `Parse error: syntax error, unexpected identifier "version"`. A
           declaração sai daqui, de dentro de uma string.

           O comentário é de BLOCO e não de linha pelo mesmo motivo em outra
           forma: num `//`, a sequência que fecha a tag PHP fecha de verdade,
           mesmo dentro de crase — visto reprovando aqui em 2026-08-10. */
        Blade::directive(
            'xmlDecl',
            fn () => '<?php echo \'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\'."\n"; ?>',
        );
    }
}
