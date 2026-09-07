import type { SaleContent } from '../types/arbaatHaminim';

const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('מבנה הנתונים אינו תקין');
    return value as Record<string, unknown>;
};
const text = (value: unknown, max = 2000) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('יש למלא את כל שדות התוכן, באורך המותר');
    return value.trim();
};
const id = (value: unknown) => {
    const result = text(value, 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new Error('מזהה פריט אינו תקין');
    return result;
};
const price = (value: unknown): number | null => {
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) throw new Error('מחיר חייב להיות חיובי או אפס, עם עד שתי ספרות אחרי הנקודה');
    return value;
};
const list = <T>(value: unknown, parse: (item: Record<string, unknown>) => T, min = 0): T[] => {
    if (!Array.isArray(value) || value.length < min || value.length > 50) throw new Error('מספר הפריטים אינו תקין (עד 50)');
    return value.map(item => parse(object(item)));
};
const unique = <T extends { id: string }>(items: T[]) => {
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('מזהי הפריטים חייבים להיות ייחודיים');
    return items;
};
export const parseSaleContent = (value: unknown): SaleContent => {
    const content = object(value);
    let heroImage: SaleContent['heroImage'] = null;
    if (content.heroImage !== null) {
        const image = object(content.heroImage);
        const src = text(image.src, 1000);
        if (src.startsWith('//') || !/^\/[a-zA-Z0-9/_\-.]+$/.test(src)) {
            let url: URL;
            try { url = new URL(src); } catch { throw new Error('יש להזין נתיב תמונה באתר או קישור HTTPS'); }
            if (url.protocol !== 'https:' || url.username || url.password) throw new Error('קישור התמונה חייב להשתמש ב־HTTPS');
        }
        heroImage = { src, alt: text(image.alt, 300) };
    }
    return {
        year: text(content.year, 30),
        heroSubtitle: text(content.heroSubtitle, 300),
        seoDescription: text(content.seoDescription, 500),
        catalogIntro: text(content.catalogIntro),
        extrasIntro: text(content.extrasIntro),
        visitIntro: text(content.visitIntro),
        heroImage,
        sets: unique(list(content.sets, item => ({ id: id(item.id), name: text(item.name, 120), price: price(item.price), description: text(item.description), included: text(item.included) }), 1)),
        extras: unique(list(content.extras, item => ({ id: id(item.id), name: text(item.name, 120), price: price(item.price) }))),
        fulfillmentOptions: unique(list(content.fulfillmentOptions, item => ({ id: id(item.id), name: text(item.name, 120), details: text(item.details) }), 1)),
        saleDetails: list(content.saleDetails, item => ({ label: text(item.label, 120), value: text(item.value) })),
        faq: list(content.faq, item => ({ question: text(item.question, 300), answer: text(item.answer) })),
    };
};
export const parseRevision = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('גרסת טיוטה אינה תקינה');
    return value;
};
