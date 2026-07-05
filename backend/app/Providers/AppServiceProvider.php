<?php

namespace App\Providers;

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
            'user'    => \App\Domains\Identity\Models\User::class,
            'client'  => \App\Domains\Commercial\Models\Client::class,
            'redator' => \App\Domains\Identity\Models\Redator::class,
            'course'  => \App\Domains\Catalog\Models\Course::class,
            'turma'   => \App\Domains\Operation\Models\Turma::class,
            'budget'  => \App\Domains\Commercial\Models\Budget::class,
            'quote'   => \App\Domains\Commercial\Models\Quote::class,
        ]);
    }
}
