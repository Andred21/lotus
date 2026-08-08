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
created_at: string,
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
version: number,
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
addresses: ClientAddressData[],
contacts: ClientContactData[],
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
export type MovedStudentData = {
rut: string,
name: string,
previous_client: string | null,
client: string,
};
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
export type QuoteStatus = 'pending' | 'approved' | 'rejected';
export type RedatorData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
course_ids: number[],
documents: RedatorDocumentData[],
photo_url: string | null,
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
export type RevokeCertificateData = {
reason: string,
};
export type RoleData = {
name: string,
permissions: string[],
id: undefined | number,
is_system: undefined | boolean,
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
};
