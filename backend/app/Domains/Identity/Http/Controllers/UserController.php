<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateStaffUserAction;
use App\Domains\Identity\Actions\DeleteStaffUserAction;
use App\Domains\Identity\Actions\RestoreStaffUserAction;
use App\Domains\Identity\Actions\UpdateStaffUserAction;
use App\Domains\Identity\Data\ArchivedUserData;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchivedListing;
use App\Shared\Http\RespostaDeRecurso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * CRUD de usuário staff (type=admin). Leitura para quem tem identity.user.view
 * (admin comum inclusive); escrita só para superadmin (identity.access.manage),
 * porque atribuir role é ação sensível. O binding de `{user}` só resolve type=admin
 * (`User::resolveRouteBinding`; redator tem controller próprio).
 */
class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show', 'archived']),
            // `restore` entra na MESMA linha do `destroy`, e não numa permissão
            // própria: `identity.access.manage` é SEGREGADA (ADR-07), e um
            // `identity.user.restore` normal deixaria restaurar mais frouxo que
            // arquivar — alguém devolveria um staff que nunca teria podido
            // arquivar (spec D7).
            new Middleware('permission:identity.access.manage', only: ['store', 'update', 'destroy', 'restore']),
        ];
    }

    /** @return array<UserData> */
    public function index(): array
    {
        return User::staff()->with(['roles', 'latestLogin'])->orderBy('name')->get()
            ->map(fn (User $u) => UserData::fromModel($u))
            ->all();
    }

    public function store(UserData $data, CreateStaffUserAction $action): UserData
    {
        return UserData::fromModel($action->execute($data));
    }

    public function show(User $user): UserData
    {
        return UserData::fromModel($user->load(['roles', 'latestLogin']));
    }

    public function update(UserData $data, User $user, UpdateStaffUserAction $action): UserData
    {
        return UserData::fromModel($action->execute($user, $data));
    }

    public function destroy(User $user, DeleteStaffUserAction $action): Response
    {
        $action->execute($user);

        return response()->noContent();
    }

    /** @return array<ArchivedUserData> */
    public function archived(): array
    {
        // `staff()` espelha o binding de `{user}`: a rota de staff só lida com
        // admin. Sem o filtro, os users de CLIENTE, REDATOR e ALUNO arquivados
        // pelas cascatas de `Client`, `Redator` e `Student` vazariam nesta
        // lista (spec D10).
        $users = User::onlyTrashed()
            ->staff()
            ->with(['roles', 'latestLogin'])
            ->orderBy('name')
            ->get();

        return ArchivedListing::lista(
            $users,
            User::class,
            fn (User $u, string $em, ?string $por) => new ArchivedUserData(
                user: UserData::fromModel($u),
                archived_at: $em,
                archived_by: $por,
            ),
        );
    }

    public function restore(int $user, RestoreStaffUserAction $action): JsonResponse
    {
        // `staff()` é o mesmo recorte do binding de `{user}` (aqui `int $user`,
        // porque o binding não enxerga trashed): user de cliente/redator/aluno
        // arquivado por cascata não é restaurável por esta rota.
        $model = ArchivedListing::resolveArquivado(User::staff(), $user);

        return RespostaDeRecurso::ok(UserData::fromModel($action->execute($model)));
    }
}
