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
is_primary: boolean,
};
export type ClientContactData = {
id: undefined | number,
name: string,
email: undefined | string | null,
phone: undefined | string | null,
is_primary: boolean,
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
};
export type CourseData = {
id: undefined | number,
name: string,
technical_name: undefined | string | null,
description: undefined | string | null,
workload_hours: number,
templates: CertificateTemplateData[],
redator_ids: number[],
};
export type CourseRedatorData = {
redator_ids: number[],
};
export type RedatorData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
course_ids: number[],
documents: RedatorDocumentData[],
};
export type RedatorDocumentData = {
id: number,
type: string,
original_name: string,
valid_until: string | null,
download_url: string,
};
export type RedatorDocumentType = 'CV' | 'REUF' | 'TITULO' | 'POSTGRADO';
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
