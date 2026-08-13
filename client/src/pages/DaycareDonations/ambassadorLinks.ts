const validAmbassadorRef = /^[a-z0-9]{4,32}$/;
const validAmbassadorIdentifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeAmbassadorSlug = (value: string) =>
    value
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/g, "");

export const buildAmbassadorLink = (
    origin: string,
    linkSlug: string,
    refCode: string
) => {
    const slug = normalizeAmbassadorSlug(linkSlug);
    const identifier = slug || `ambassador-${refCode}`;
    return `${origin}/daycare-donations/${identifier}`;
};

export const extractAmbassadorRef = (ambassadorLink?: string) => {
    const normalized = ambassadorLink?.trim().toLowerCase();
    if (!normalized) return undefined;
    return normalized.length <= 100 && validAmbassadorIdentifier.test(normalized)
        ? normalized
        : undefined;
};

export const normalizeAmbassadorRef = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return normalized && validAmbassadorRef.test(normalized)
        ? normalized
        : undefined;
};
