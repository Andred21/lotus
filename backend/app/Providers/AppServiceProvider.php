<?php

namespace App\Providers;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Catalog\Models\CourseModule;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\ClientAddress;
use App\Domains\Commercial\Models\ClientContact;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
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
            'turma' => Turma::class,
            'budget' => Budget::class,
            'quote' => Quote::class,
            'file' => File::class,
        ]);
    }
}
