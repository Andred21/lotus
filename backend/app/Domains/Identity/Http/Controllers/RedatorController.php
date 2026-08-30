<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\ArchiveRedatorAction;
use App\Domains\Identity\Actions\CreateRedatorAction;
use App\Domains\Identity\Actions\RestoreRedatorAction;
use App\Domains\Identity\Actions\UpdateRedatorAction;
use App\Domains\Identity\Data\ArchivedRedatorData;
use App\Domains\Identity\Data\RedatorData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use App\Shared\Audit\ArchiveTrailQuery;
use App\Shared\Files\ContentClass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

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

    public function store(RedatorData $data, Request $request, CreateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($data, $this->documentsFromRequest($request)));
    }

    public function show(Redator $redator): RedatorData
    {
        return RedatorData::fromModel($redator->loadListingData());
    }

    public function update(RedatorData $data, Redator $redator, Request $request, UpdateRedatorAction $action): RedatorData
    {
        return RedatorData::fromModel($action->execute($redator, $data, $this->documentsFromRequest($request)));
    }

    public function destroy(Redator $redator, ArchiveRedatorAction $action): Response
    {
        $action->execute($redator);

        return response()->noContent();
    }

    /** @return array<ArchivedRedatorData> */
    public function archived(): array
    {
        $redatores = Redator::onlyTrashed()->withArchivedListingData()->get();

        $autores = ArchiveTrailQuery::archivedBy(Redator::class, $redatores->pluck('id')->all());

        return $redatores
            ->map(fn (Redator $r) => new ArchivedRedatorData(
                redator: RedatorData::fromModel($r),
                archived_at: $r->deleted_at->toIso8601String(),
                archived_by: $autores[$r->id] ?? null,
            ))
            ->all();
    }

    public function restore(int $redator, RestoreRedatorAction $action): JsonResponse
    {
        // Resolvido à mão, não por binding: o binding padrão aplica o global
        // scope de SoftDeletes e nunca acharia um arquivado. `onlyTrashed()`
        // também dá o 404 de graça sobre registro ATIVO (molde D5).
        $model = Redator::onlyTrashed()->whereKey($redator)->firstOrFail();

        // 200, não 201: restaurar devolve um registro que já existia.
        return RedatorData::fromModel($action->execute($model))
            ->toResponse(request())
            ->setStatusCode(Response::HTTP_OK);
    }

    /**
     * Lê os documentos tipados do multipart: `documents[<TIPO>] = arquivo`.
     * Entrada malformada é erro do cliente (422 com `errors.documents`), não 500 —
     * `$request->file('documents')` devolve um UploadedFile se o campo vier escalar.
     *
     * @return array<string,UploadedFile>
     */
    private function documentsFromRequest(Request $request): array
    {
        $files = $request->file('documents', []);

        if (! is_array($files)) {
            throw ValidationException::withMessages([
                'documents' => __('identity.errors.documents_shape'),
            ]);
        }

        foreach ($files as $type => $file) {
            if (RedatorDocumentType::tryFrom((string) $type) === null) {
                throw ValidationException::withMessages([
                    'documents' => __('identity.errors.document_type_invalid', ['tipo' => $type]),
                ]);
            }

            // Cada folha tem que ser UM arquivo. `documents[CV][]` passa pelo guard
            // externo e pela checagem de tipo, mas estoura TypeError no
            // StoreRedatorDocumentAction (parâmetro tipado UploadedFile) — 500 vazando
            // a mensagem da exceção no `detail` do RFC 7807.
            if (! $file instanceof UploadedFile) {
                throw ValidationException::withMessages([
                    'documents' => __('identity.errors.documents_shape'),
                ]);
            }
        }

        // Este é o único sítio que recebe VÁRIOS arquivos no mesmo corpo: quatro
        // documentos de 10 MB passariam um a um e somariam 40 MB contra os 12 MB
        // do `client_max_body_size`, e a recusa viria do nginx em HTML, fora do
        // RFC 7807 (achado Q-3 do review de 2026-08-25). O teto do conjunto mora
        // na mesma peça de política que o teto de cada arquivo.
        ContentClass::assertCabeNoTransporte($files, 'documents');

        foreach ($files as $type => $file) {
            // Até 2026-08-25 este sítio não tinha regra NENHUMA: aceitava
            // qualquer conteúdo em qualquer tamanho, contido só pelo transporte
            // (nginx 12m). É a mesma política dos outros documentos de redator —
            // a diferença era só ninguém a ter escrito aqui.
            //
            // O dado precisa ser array ANINHADO (`documents => [tipo => arquivo]`),
            // não uma chave plana com ponto literal: `Validator::parseData()`
            // escapa ponto de chave de topo (`__dot__<hash>`) bem para ele NÃO
            // colidir com a notação de ponto da regra — medido: com chave plana
            // o valor nunca resolve e o campo sai sempre "obrigatório".
            Validator::make(
                ['documents' => [$type => $file]],
                ["documents.{$type}" => ContentClass::Documento->regras()],
            )->validate();
        }

        return $files;
    }
}
