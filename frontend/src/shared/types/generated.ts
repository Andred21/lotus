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
export type RedatorData = {
id: undefined | number,
name: string,
rut: string,
email: string,
phone: undefined | string | null,
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
export type UserData = {
id: number,
name: string,
email: string,
};
