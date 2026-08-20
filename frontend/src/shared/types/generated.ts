export type AdminDashboardData = {
view: 'admin',
kpis: AdminKpisData,
pendencias: PendingItemData[],
alertas: AlertData[],
pipeline: PipelineStageCountData[] | null,
agenda: AgendaData | null,
compliance_turmas: TurmaComplianceData[] | null,
redatores: RedatorLoadData[] | null,
series: SeriesData | null,
rankings: RankingsData | null,
period_start: string,
period_end: string,
};
export type AdminKpisData = {
turmas_em_andamento: number | null,
turmas_encerrando_em_breve: number | null,
turmas_atrasadas: number | null,
conclusoes_por_confirmar: number | null,
cotacoes: QuoteKpisData | null,
certificados_a_emitir: number | null,
};
export type AgendaData = {
starting_soon: AgendaTurmaData[],
ending_soon: AgendaTurmaData[],
in_progress: AgendaTurmaData[],
overdue: AgendaTurmaData[],
};
export type AgendaTurmaData = {
turma_id: number,
course_name: string,
client_name: string | null,
start_date: string,
end_date: string,
};
export type AlertData = {
type: DashboardAlertType,
severity: DashboardSeverity,
entity_id: number,
description: string,
date: string | null,
navigation: Record<string, number>,
};
export type ArchivedBudgetData = {
budget: BudgetData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedClientData = {
client: ClientData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedCourseData = {
course: CourseData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedEnrollmentData = {
enrollment: EnrollmentData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedQuoteData = {
quote: QuoteData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedRedatorData = {
redator: RedatorData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedTurmaData = {
turma: TurmaData,
archived_at: string,
archived_by: string | null,
};
export type ArchivedUserData = {
user: UserData,
archived_at: string,
archived_by: string | null,
};
export type BatchIssueData = {
enrollment_ids: number[],
redator_id: number,
};
export type BatchIssueItemResultData = {
enrollment_id: number,
ok: boolean,
codigo: string | null,
certificate_id: number | null,
error: string | null,
};
export type BudgetData = {
id: undefined | number,
client_id: number,
code: undefined | string,
status: QuoteStatus | undefined,
total_value_uf: undefined | string,
total_approved_uf: undefined | string,
total_rejected_uf: undefined | string,
total_students: undefined | number,
quotes: QuoteData[],
payment_terms: undefined | string | null,
files: FileData[],
};
export type CertificateData = {
id: number,
uuid: string,
codigo: string,
enrollment_id: number,
course_id: number,
redator_id: number,
status: CertificateStatus,
valido_ate: string | null,
revoked_at: string | null,
revocation_reason: string | null,
snapshot: CertificateSnapshotData,
snapshot_ok: boolean,
created_at: string,
aluno_photo_url: string | null,
};
export type CertificateSnapshotData = {
schema_version: number,
aluno: SnapshotPartyData,
curso: SnapshotCourseData,
turma: SnapshotTurmaData,
cliente: SnapshotPartyData,
emissor: SnapshotPartyData,
redator: SnapshotPartyData,
resultado: SnapshotResultData,
template: SnapshotTemplateData,
ciudad_emision: string | null,
emitido_em: string | null,
};
export type CertificateStatus = 'emitido' | 'revocado';
export type CertificateTemplateData = {
id: undefined | number,
version: undefined | number,
layout_config: Record<string, any>,
validity_months: undefined | number | null,
};
export type ClientAddressData = {
id: undefined | number,
line1: undefined | string | null,
line2: undefined | string | null,
number: undefined | string | null,
commune: undefined | string | null,
city: undefined | string | null,
region: undefined | string | null,
zip_code: undefined | string | null,
is_primary: undefined | boolean,
};
export type ClientContactData = {
id: undefined | number,
name: string,
email: undefined | string | null,
phone: undefined | string | null,
job_title: undefined | string | null,
is_primary: undefined | boolean,
};
export type ClientData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
legal_name: string,
type: string,
business_activity: undefined | string | null,
addresses: ClientAddressData[] | undefined,
contacts: ClientContactData[] | undefined,
photo_url: string | null,
};
export type CourseData = {
id: undefined | number,
name: string,
technical_name: undefined | string | null,
description: undefined | string | null,
workload_hours: number,
templates: CertificateTemplateData[] | undefined,
modules: CourseModuleData[] | undefined,
redator_ids: number[],
modules_total_hours: undefined | number,
};
export type CourseModuleData = {
id: undefined | number,
name: string,
learnings: undefined | string | null,
contents: undefined | string | null,
theory_hours: number,
practice_hours: number,
sort_order: undefined | number,
total_hours: undefined | number,
};
export type CourseRedatorData = {
redator_ids: number[],
};
export type DashboardAlertType = 'turma_overdue' | 'certificate_expiring_soon' | 'certificate_expired' | 'redator_document_expired' | 'redator_document_expiring_soon';
export type DashboardModule = 'commercial' | 'operation' | 'certification';
export type DashboardSeverity = 'high' | 'medium' | 'normal';
export type DocumentValidityStatus = 'vigente' | 'vence_em_breve' | 'vencido' | 'ausente';
export type EmissionBlockReason = 'sin_plantilla' | 'plantilla_sin_ciudad' | 'sin_redactor';
export type EmissionPanelCertificateData = {
id: number,
codigo: string,
status: CertificateStatus,
};
export type EmissionPanelEnrollmentData = {
enrollment_id: number,
student_name: string,
student_rut: string,
approval_status: EnrollmentApprovalStatus,
attendance_pct: string | null,
nota_final: string | null,
certificate: EmissionPanelCertificateData | null,
student_photo_url: string | null,
};
export type EmissionPanelRedatorData = {
redator_id: number,
name: string,
};
export type EmissionPanelTurmaData = {
turma_id: number,
course_name: string,
client_name: string,
end_date: string,
template_validity_months: number | null,
emission_blocked: EmissionBlockReason | null,
enrollments: EmissionPanelEnrollmentData[],
redatores: EmissionPanelRedatorData[],
};
export type EnrollPreviewData = {
exists: boolean,
name: string | null,
rut: string,
current_client: string | null,
will_move: boolean,
previous_client: string | null,
};
export type EnrollmentApprovalStatus = 'pendiente' | 'aprobado' | 'reprobado';
export type EnrollmentData = {
id: undefined | number,
turma_id: undefined | number,
student_id: undefined | number,
name: string,
rut: string,
email: string | null,
phone: string | null,
approval_status: EnrollmentApprovalStatus | undefined,
attendance_pct: undefined | string | null,
grades: undefined | Array<any> | null,
photo_url: string | null,
};
export type EnrollmentResultData = {
grades: Array<any> | null,
attendance_pct: string | null,
approval_status: EnrollmentApprovalStatus,
};
export type FileData = {
id: number,
type: string,
original_name: string,
mime: string | null,
size: number,
download_url: string,
created_at: string | null,
};
export type ForgotPasswordData = {
email: string,
};
export type ImportResultData = {
created: number,
relinked: number,
already_enrolled: number,
moved: MovedStudentData[],
errors: ImportRowErrorData[],
enrolled_total: number,
contracted_count: number,
};
export type ImportRowErrorData = {
row: number,
message: string,
};
export type IssueCertificateData = {
redator_id: number,
};
export type MonthlyAmountData = {
month: string,
total_uf: string,
};
export type MonthlyCountData = {
month: string,
count: number,
};
export type MovedStudentData = {
rut: string,
name: string,
previous_client: string | null,
client: string,
};
export type PendingItemData = {
module: DashboardModule,
type: PendingItemType,
severity: DashboardSeverity,
entity_id: number,
description: string,
date: string | null,
navigation: Record<string, number>,
};
export type PendingItemType = 'quote_awaiting_approval' | 'quote_approved_without_turma' | 'turma_without_redator' | 'turma_docs_incomplete' | 'turma_awaiting_conclusion' | 'enrollment_awaiting_certificate';
export type PendingQuoteData = {
quote_id: number,
quote_code: string | null,
budget_code: string | null,
client_name: string,
course_name: string,
student_count: number,
};
export type PermissionData = {
name: string,
description: string,
group: string,
segregated: boolean,
};
export type PipelineStage = 'quote_pending' | 'quote_approved_without_turma' | 'turma_in_progress' | 'turma_ready_for_conclusion' | 'concluded_pending_issuance' | 'fully_issued';
export type PipelineStageCountData = {
stage: PipelineStage,
count: number,
};
export type ProfileData = {
id: number,
uuid: string,
name: string,
email: string,
rut: string | null,
phone: string | null,
type: string,
role: string | null,
photo_url: string | null,
redator: RedatorProfileData | null,
};
export type ProfilePasswordData = {
current_password: string,
password: string,
password_confirmation: string,
};
export type ProfileUpdateData = {
name: string,
phone: undefined | string | null,
};
export type PublicCertificateData = {
codigo: string,
status: CertificateStatus,
valido_ate: string | null,
revoked_at: string | null,
aluno: {
name: string,
},
curso: {
name: string,
workload_hours: number,
},
turma: {
end_date: string | null,
},
cliente: {
name: string,
},
redator: {
name: string,
},
};
export type QuoteData = {
id: undefined | number,
budget_id: undefined | number,
seq_in_budget: undefined | number,
course_id: number,
student_count: number,
value_uf: string,
status: QuoteStatus | undefined,
approved_at: undefined | string | null,
code: undefined | string,
purchase_order: undefined | string | null,
planned_start_date: undefined | string | null,
planned_end_date: undefined | string | null,
files: FileData[],
};
export type QuoteKpisData = {
pending_count: number,
pending_value_uf: string,
};
export type QuoteStatus = 'pending' | 'approved' | 'rejected';
export type RankingRowData = {
id: number,
name: string,
turmas: number,
matriculas: number,
certificados: number,
uf_aprovada: string | null,
};
export type RankingsData = {
courses: RankingRowData[],
clients: RankingRowData[],
};
export type RedatorAgendaData = {
starting_soon: RedatorAgendaTurmaData[],
ending_soon: RedatorAgendaTurmaData[],
in_progress: RedatorAgendaTurmaData[],
overdue: RedatorAgendaTurmaData[],
};
export type RedatorAgendaTurmaData = {
turma_id: number,
course_name: string,
start_date: string,
end_date: string,
};
export type RedatorDashboardData = {
view: 'redator',
resumo: RedatorResumoData,
agenda: RedatorAgendaData,
pendencias_documentais: RedatorTurmaPendenciaData[],
alertas_documentos: AlertData[],
historico: RedatorHistoricoData,
};
export type RedatorData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
is_active: undefined | boolean,
course_ids: number[],
documents: RedatorDocumentData[],
photo_url: string | null,
last_login: string | null,
};
export type RedatorDocumentData = {
id: number,
type: string,
original_name: string,
mime: string | null,
size: number,
valid_until: string | null,
created_at: string | null,
download_url: string,
};
export type RedatorDocumentType = 'CV' | 'REUF' | 'TITULO' | 'POSTGRADO';
export type RedatorHistoricoData = {
turmas_concluidas: number,
certificados_emitidos: number,
};
export type RedatorLoadData = {
redator_id: number,
name: string,
current_turmas: number,
upcoming_turmas: number,
expired_documents: number,
expiring_documents: number,
};
export type RedatorProfileData = {
documentos: RedatorProfileDocumentData[],
cursos_habilitados: number,
cursos: string[],
};
export type RedatorProfileDocumentData = {
type: RedatorDocumentType,
status: DocumentValidityStatus,
self_service: boolean,
valid_until: string | null,
original_name: string | null,
size: number | null,
created_at: string | null,
download_url: string | null,
};
export type RedatorResumoData = {
turmas_em_andamento: number,
proximas_turmas: number,
pendencias_documentais: number,
documentos_vencendo: number,
};
export type RedatorTurmaPendenciaData = {
turma_id: number,
course_name: string,
end_date: string,
missing_types: string[],
};
export type ResetPasswordData = {
token: string,
email: string,
password: string,
password_confirmation: string,
};
export type RevokeCertificateData = {
reason: string,
};
export type RoleData = {
name: string,
permissions: string[],
id: undefined | number,
is_system: undefined | boolean,
};
export type SeriesData = {
turmas_iniciadas: MonthlyCountData[] | null,
turmas_concluidas: MonthlyCountData[] | null,
certificados_emitidos: MonthlyCountData[] | null,
matriculas: MonthlyCountData[] | null,
uf_aprovada: MonthlyAmountData[] | null,
};
export type SessionUserData = {
id: number,
uuid: string,
name: string,
email: string,
type: string,
is_active: boolean,
roles: string[],
permissions: string[],
photo_url: string | null,
};
export type SnapshotCourseData = {
name: string,
technical_name: string | null,
workload_hours: number,
description: string | null,
modules: SnapshotModuleData[],
};
export type SnapshotModuleData = {
sort_order: number,
name: string,
contents: string | null,
};
export type SnapshotPartyData = {
name: string,
rut: string | null,
};
export type SnapshotResultData = {
grades: Record<string, any> | null,
approval_status: string | null,
attendance_pct: string | null,
};
export type SnapshotTemplateData = {
version: number | null,
city: string | null,
};
export type SnapshotTurmaData = {
id: number | null,
start_date: string | null,
end_date: string | null,
modalidade: string | null,
};
export type StudentClientLogData = {
id: number,
client_id: number,
client_name: string,
started_on: string,
ended_on: string | null,
};
export type StudentData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
client_id: undefined | number | null,
current_client_id: number | null,
current_client_name: string | null,
enrollments_count: number,
photo_url: string | null,
};
export type StudentDetailData = {
id: number,
name: string,
rut: string,
email: string,
phone: string | null,
current_client_id: number | null,
current_client_name: string | null,
enrollments_count: number,
links: StudentClientLogData[],
turmas: StudentTurmaData[],
};
export type StudentTurmaData = {
turma_id: number,
quote_code: string | null,
course_name: string,
start_date: string,
approval_status: EnrollmentApprovalStatus,
};
export type TurmaComplianceData = {
turma_id: number,
course_name: string,
redatores: string[],
start_date: string,
end_date: string,
present_types: string[],
missing_types: string[],
habilitada: boolean,
};
export type TurmaData = {
id: undefined | number,
quote_id: undefined | number,
course_id: undefined | number,
modalidade: TurmaModalidade,
local_aplicacao: string | null,
start_date: string,
end_date: string,
status: TurmaStatus | undefined,
habilitada: undefined | boolean,
missing_document_types: string[],
concluded_at: undefined | string | null,
redatores: TurmaRedatorData[],
course_name: undefined | string,
client_name: undefined | string,
enrolled_count: undefined | number,
quote_code: undefined | string | null,
budget_code: undefined | string | null,
budget_id: undefined | number | null,
client_rut: undefined | string | null,
client_photo_url: string | null,
};
export type TurmaDocumentData = {
id: number,
type: string,
original_name: string,
mime: string | null,
size: number,
created_at: string,
download_url: string,
};
export type TurmaDocumentType = 'MANUAL' | 'PRUEBAS' | 'EVALUACION_REDATOR';
export type TurmaModalidade = 'presencial' | 'online';
export type TurmaRedatorData = {
id: number,
name: string,
email: string | null,
photo_url: string | null,
};
export type TurmaStatus = 'em_andamento' | 'concluida';
export type UserData = {
id: undefined | number,
uuid: undefined | string,
name: string,
email: string,
rut: undefined | string | null,
phone: undefined | string | null,
role: string,
is_active: boolean,
password: undefined | string,
type: undefined | string,
roles: string[],
photo_url: string | null,
last_login: string | null,
};
