import { categories, type Category, type Recipe } from './types';
export function text(value: unknown, max: number) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('יש למלא טקסט באורך תקין');
    return value.trim();
}
export function revision(value: unknown): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('גרסה אינה תקינה');
    return value;
}
export function identifier(value: unknown) {
    const id = text(value, 80);
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('מזהה אינו תקין');
    return id;
}
export function parseRecipe(raw: any): Recipe {
    if (!raw || !categories.includes(raw.category)) throw new Error('סוג מנה אינו תקין');
    if (!Array.isArray(raw.ingredients) || !raw.ingredients.length || raw.ingredients.length > 30) throw new Error('יש למלא בין מצרך אחד ל־30 מצרכים');
    if (!Array.isArray(raw.tasks) || !raw.tasks.length || raw.tasks.length > 12) throw new Error('יש למלא בין משימה אחת ל־12 משימות');
    if (typeof raw.purchased !== 'boolean' || typeof raw.batchFriendly !== 'boolean') throw new Error('מאפייני המנה אינם תקינים');
    if (!Array.isArray(raw.dressingIds) || raw.dressingIds.length > 30) throw new Error('רטבים אינם תקינים');
    return {
        id: identifier(raw.id), revision: revision(raw.revision), name: text(raw.name, 120), category: raw.category as Category,
        ingredients: raw.ingredients.map((item: any) => {
            if (!item || typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity < 0.001 || item.quantity > 10000) throw new Error('כמות מצרך חייבת להיות מספר בין 0.001 ל־10,000');
            return { name: text(item.name, 120), quantity: item.quantity, unit: text(item.unit, 30) };
        }),
        instructions: text(raw.instructions, 2000), tasks: raw.tasks.map((task: unknown) => text(task, 200)),
        purchased: raw.purchased, batchFriendly: raw.batchFriendly,
        dressingIds: raw.dressingIds.map(identifier),
    };
}
export function parseSelection(raw: unknown) {
    if (!Array.isArray(raw) || raw.length !== categories.length) throw new Error('יש לבחור מנה אחת מכל קטגוריה');
    const recipes = raw.map(parseRecipe);
    if (new Set(recipes.map(recipe => recipe.category)).size !== categories.length || new Set(recipes.map(recipe => recipe.id)).size !== categories.length) throw new Error('יש לבחור מנה אחת מכל קטגוריה');
    return categories.map(category => recipes.find(recipe => recipe.category === category)!);
}
