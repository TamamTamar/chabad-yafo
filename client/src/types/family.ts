export type FormValues = {
    parentName: string;
    phone: string;
    area: string;
    ages: string[];
    interests: string[];
    missing: string;
    updates: boolean;
};

export type FamilyAdmin = FormValues & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
};
