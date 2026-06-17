export interface RebbeLetter {
    fullName: string;
    motherName: string;
    phone?: string;
    email?: string;
    letter?: string;
    occasion: string;
    wantsUpdates: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: "new" | "printed" | "sentToOhel" | "handled";
    updatedStatusAt?: Date;
}