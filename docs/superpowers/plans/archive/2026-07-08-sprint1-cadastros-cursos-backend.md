# Sprint 1 Cadastros — Cursos (Backend) Implementation Plan

> **Execução:** inline nesta sessão (working tree tem WIP do João; espelha padrão Client/Redator). Steps com checkbox p/ tracking.

**Goal:** Backend do módulo Cursos — `courses`, `course_certificate_templates`, `course_redator` (N:N habilitação redator↔curso), com CRUD, endpoint de templates e habilitação nas duas pontas.

**Architecture:** Domínio `Catalog`. Mesmo padrão de entidade da última execução: migration inglês + `softDeletes()` + FK `cascadeOnDelete()`; Model `Auditable`+`SoftDeletes`+`booted()` cascade; DTO `#[TypeScript]`+`fromModel`; controller fino → `Data::fromModel` → Action; nested via controller próprio; rota por domínio (`app/Domains/Catalog/routes.php` via glob).

**Tech Stack:** Laravel 13, spatie/laravel-data, owen-it/laravel-auditing, spatie/typescript-transformer. Testes sqlite `:memory:` via `docker compose exec app php artisan test`. Pint.

## Global Constraints (decisões fechadas com o João)
- **Schema inglês.** Curso: `name` (req), `technical_name` (nullable), `description` (text nullable), `workload_hours` (unsignedSmallInteger, req). SEM valor (preço vive em quotes).
- **Template = JSON versionado, NÃO `files`.** `layout_config` json; `version` int; `validity_months` smallint nullable. `Auditable`+`SoftDeletes` (peso legal do certificado).
- **`course_redator` = pivot puro** (`belongsToMany`): `id` próprio + `unique(course_id, redator_id)` + timestamps; SEM soft-delete no pivot. FK `cascadeOnDelete` limpa em hard-delete; soft-delete deixa link inerte (filtrado no join).
- **Habilitação nas 2 pontas** (bundle aprovado): lado-curso `PUT /courses/{course}/redatores`; lado-redator via Redator update (`course_ids` sync).
- Morph map ganha `course_certificate_template` (Auditable exige alias sob enforceMorphMap). `course` já pré-declarado.
- Preservar WIP não-commitado do João; commitar só arquivos criados/alterados por esta execução.
- Cross-domain OK no backend: `Redator` (Identity) referencia `Course` (Catalog). Só features do FRONT não cruzam.

---

## T1: Migration (3 tabelas)
**Files:** Create `backend/database/migrations/2026_07_08_XXXXXX_courses.php`; Test: extend `backend/tests/Feature/Cadastros/SchemaTest.php`
- courses: id, name, technical_name nullable, description text nullable, workload_hours unsignedSmallInteger, timestamps, softDeletes
- course_certificate_templates: id, course_id FK cascade, version unsignedInteger, layout_config json, validity_months unsignedSmallInteger nullable, timestamps, softDeletes
- course_redator: id, course_id FK cascade, redator_id FK cascade, unique(course_id,redator_id), timestamps
- Teste: as 3 tabelas existem + colunas-chave (`Schema::hasTable`/`hasColumns`). Commit.

## T2: Models + morph alias + Redator.courses()
**Files:** Create `Catalog/Models/Course.php`, `Catalog/Models/CourseCertificateTemplate.php`; Modify `Providers/AppServiceProvider.php` (alias), `Identity/Models/Redator.php` (courses()); Test: `CourseModelTest.php`
- Course: Auditable+SoftDeletes; fillable/auditInclude name,technical_name,description,workload_hours; `certificateTemplates()` hasMany; `redatores()` belongsToMany(Redator,'course_redator')->withTimestamps(); booted deleting !isForceDeleting → certificateTemplates()->delete()
- CourseCertificateTemplate: Auditable+SoftDeletes; table course_certificate_templates; fillable course_id,version,layout_config,validity_months; cast layout_config=>array; belongsTo course
- Redator: add `courses()` belongsToMany(Course,'course_redator')->withTimestamps() (preservar edit `!` do João)
- morph alias 'course_certificate_template'
- Teste: course navega templates + redatores (N:N navega, critério 5.1.2). Commit.

## T3: DTOs
**Files:** Create `Catalog/Data/CourseData.php`, `Catalog/Data/CertificateTemplateData.php`
- CertificateTemplateData: id int|Optional, version int, layout_config array (@var array<string,mixed>), validity_months int|Optional|null
- CourseData: id int|Optional, name Required, technical_name string|Optional|null, description string|Optional|null, workload_hours Required int, templates[] DataCollectionOf(CertificateTemplateData)=[], redator_ids array<int>=[] (read-only, fromModel pluck); fromModel(Course)
- Commit.

## T4: Course CRUD
**Files:** Create `Catalog/Actions/CreateCourseAction.php`, `Catalog/Actions/UpdateCourseAction.php`, `Catalog/Http/Controllers/CourseController.php`, `Catalog/routes.php`; Test: `CourseCrudTest.php`
- CreateCourseAction: DB::transaction create course + loop templates create; load certificateTemplates,redatores
- UpdateCourseAction: update course; replace templates (delete+recreate); fresh load
- CourseController: index/store/show/update/destroy thin (fromModel)
- routes: apiResource('courses') sob auth:sanctum
- Teste: cria/lista/mostra/edita/remove (soft-delete). Commit.

## T5: Template nested endpoint
**Files:** Create `Catalog/Http/Controllers/CourseTemplateController.php`; Modify `Catalog/routes.php`; Test: `CourseTemplateTest.php`
- store(CertificateTemplateData,Course), update(CertificateTemplateData,CourseCertificateTemplate), destroy — mirror ClientAddressController
- routes: POST courses/{course}/templates; PUT templates/{template}; DELETE templates/{template}
- Commit.

## T6: Habilitação (2 pontas)
**Files:** Create `Catalog/Http/Controllers/CourseRedatorController.php`, `Identity/Actions/UpdateRedatorAction.php`; Modify `Identity/Data/RedatorData.php` (+course_ids), `Identity/Http/Controllers/RedatorController.php` (+update), `Identity/routes.php`, `Catalog/routes.php`; Test: `HabilitacaoTest.php`
- CourseRedatorController@update(Request,Course): valida redator_ids array exists; sync; return CourseData::fromModel
- RedatorData: +course_ids array<int>=[] (fromModel pluck)
- UpdateRedatorAction: update user fields (withTrashed rut check exclui próprio) + append novos documents + sync courses(course_ids)
- RedatorController@update; enable 'update' + PUT courses sync route
- routes: PUT courses/{course}/redatores; enable redatores update
- Teste: sync lado-curso reflete lado-redator e vice-versa. Commit.

## T7: TS regen + suíte + pint
- `docker compose exec app php artisan typescript:transform` → CourseData, CertificateTemplateData, RedatorData(course_ids) em generated.ts
- `docker compose exec app php artisan test` (suíte verde) + `./vendor/bin/pint`
- Commit.
