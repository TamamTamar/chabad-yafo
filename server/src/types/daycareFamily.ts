export interface IDaycareGuardian {
    fullName: string;
    role: string;
    roleDetails?: string;
    phone: string;
    email?: string;
}

export interface IDaycareFamilyAddress {
    city: string;
    street: string;
    houseNumber: string;
    apartment?: string;
}

export interface IDaycareFamily {
    guardians: IDaycareGuardian[];
    address?: IDaycareFamilyAddress;
    createdAt: Date;
    updatedAt: Date;
}
