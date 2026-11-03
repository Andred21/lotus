<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\ArchiveRedatorAction;
use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\RestoreRedatorAction;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\ArchivedRedatorData;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Data\RedatorDocumentsData;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RedatorController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show', 'archived']),
            new Middleware('permission:identity.user.create', only: ['store']),
            new Middleware('permission:identity.user.update', only: ['update']),
            new Middleware('permission:identity.user.delete', only: ['destroy']),
            new Middleware('permission:identity.user.restore', only: ['restore']),
        ];
    }

    /** @return array<RedatorData> */
    public function index(): array
    {
        return Redator::query()->withListingData()->get()
            ->map(fn (Redator $r) => RedatorData::fromModel($r))
            ->all();
    }

    public function store(RedatorData $data, RedatorDocumentsData $documents, CreateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($data, $documents->documents));
    }

    public function show(Redator $redator): RedatorData
    {
        return RedatorData::fromModel($redator->loadListingData());
    }

    public function update(RedatorData $data, RedatorDocumentsData $documents, Redator $redator, UpdateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($redator, $data, $documents->documents));
    }

    public function destroy(Redator $redator, ArchiveRedatorAction $action): Response
    {
        $action->execute($redator);

        return response()->noContent();
    }

    /** @return array<ArchivedRedatorData> */
    public function archived(): array
    {
        return ArchivedListing::lista(
            Redator::onlyTrashed()->withArchivedListingData()->get(),
            Redator::class,
            fn (Redator $r, string $em, ?string $por) => new ArchivedRedatorData(
                redator: RedatorData::fromModel($r),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    public function restore(int $redator, RestoreRedatorAction $action): JsonResponse
    {
        $model = ArchivedListing::resolveArquivado(Redator::query(), $redator);

        return RespostaDeRecurso::ok(RedatorData::fromModel($action->execute($model)));
    }
}
