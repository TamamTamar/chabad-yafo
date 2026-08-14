import { DaycareDonationAmbassador } from "../models/DaycareDonationAmbassador";

const validAmbassadorIdentifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validAmbassadorRef = /^[a-z0-9]{4,32}$/;

export const normalizeDaycareAmbassadorSlug = (value: unknown) =>
    String(value ?? "")
        .trim()
        .slice(0, 60)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

export const createAvailableDaycareAmbassadorSlug = async (
    requestedSlug: unknown,
    excludeId?: unknown
) => {
    const baseSlug = normalizeDaycareAmbassadorSlug(requestedSlug);
    if (!baseSlug) return "";

    for (let suffix = 1; suffix <= 999; suffix += 1) {
        const suffixText = suffix === 1 ? "" : `-${suffix}`;
        const candidate = `${baseSlug.slice(0, 60 - suffixText.length)}${suffixText}`;
        const collision = await DaycareDonationAmbassador.exists({
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
            $or: [{ linkSlug: candidate }, { linkAliases: candidate }],
        });
        if (!collision) return candidate;
    }

    throw new Error("Could not create a unique ambassador link name");
};

export const findActiveDaycareDonationAmbassador = (value: unknown) => {
    const identifier = String(value ?? "").trim().toLowerCase();
    if (
        !identifier ||
        identifier.length > 100 ||
        !validAmbassadorIdentifier.test(identifier)
    ) {
        return null;
    }

    const legacyRefCode = identifier.match(/-([a-f0-9]{8})$/)?.[1];
    return DaycareDonationAmbassador.findOne({
        active: true,
        $or: [
            ...(validAmbassadorRef.test(identifier)
                ? [{ refCode: identifier }]
                : []),
            { linkSlug: identifier },
            { linkAliases: identifier },
            ...(legacyRefCode && validAmbassadorRef.test(legacyRefCode)
                ? [{ refCode: legacyRefCode }]
                : []),
        ],
    });
};
