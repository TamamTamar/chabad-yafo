import { createHash } from 'node:crypto';
import { categories, type Entry, type Generation, type Lists, type PlanningWeek, type Recipe } from './types';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').replace(/["״]/g, '״').toLowerCase();
const unitName = (value: string) => {
    const unit = normalize(value);
    return ({ 'ג': 'גרם', 'ג׳': 'גרם', 'גרמים': 'גרם', 'גרם': 'גרם', 'קג': 'ק״ג', 'ק״ג': 'ק״ג', 'קילוגרם': 'ק״ג', 'מל': 'מ״ל', 'מ״ל': 'מ״ל', 'מיליליטר': 'מ״ל', 'ליטרים': 'ליטר', 'יחידה': 'יחידות', 'יח׳': 'יחידות', 'פרוסה': 'פרוסות' } as Record<string, string>)[unit] ?? unit;
};
function amount(quantity: number, unit: string) {
    return String(['יחידות', 'פרוסות'].includes(unit) ? Math.ceil(quantity - 1e-9) : Math.round(quantity * 1000) / 1000);
}
function ingredientKey(name: string, unit: string) {
    const canonical = unitName(unit);
    return `${normalize(name)}|${canonical === 'ק״ג' ? 'גרם' : canonical === 'ליטר' ? 'מ״ל' : canonical}`;
}
export function calculate(recipes: Recipe[], mealCount: number): Lists {
    if (!Number.isSafeInteger(mealCount) || mealCount < 0 || mealCount > 10000) throw new Error('מספר הארוחות אינו תקין');
    if (!mealCount) return { shopping: [], tasks: [] };
    const ingredients = new Map<string, { name: string; unit: string; quantity: number }>();
    const add = (name: string, quantity: number, unit: string) => {
        let canonical = unitName(unit);
        if (canonical === 'ק״ג') { quantity *= 1000; canonical = 'גרם'; }
        if (canonical === 'ליטר') { quantity *= 1000; canonical = 'מ״ל'; }
        const key = ingredientKey(name, canonical);
        const old = ingredients.get(key);
        ingredients.set(key, { name, unit: canonical, quantity: (old?.quantity ?? 0) + quantity });
    };
    for (const recipe of recipes) for (const ingredient of recipe.ingredients) add(ingredient.name, ingredient.quantity, ingredient.unit);
    for (const name of ['מארז למנה חמה עם מכסה', 'קופסת סלט עם מכסה', 'גביע לרוטב עם מכסה', 'גביע לממרח עם מכסה', 'שקית ללחם', 'שקית נשיאה', 'ערכת סכו״ם ומפית', 'ברכה מודפסת']) add(name, 1, 'יחידות');
    const shopping = [...ingredients].map(([key, item]) => ({ id: `auto-${hash(key).slice(0, 24)}`, name: item.name, quantity: amount(item.quantity * mealCount, item.unit), unit: item.unit, done: false }));
    const tasks = new Map<string, Entry>();
    for (const recipe of recipes) for (const name of recipe.tasks) {
        const id = `task-${hash(normalize(name)).slice(0, 24)}`;
        tasks.set(id, { id, name, quantity: '', unit: '', done: false });
    }
    tasks.set('task-final-pack', { id: 'task-final-pack', name: 'הרכבת המארזים, צירוף רוטב בנפרד, קינוח וברכה', quantity: String(mealCount), unit: 'מארזים', done: false });
    return { shopping, tasks: [...tasks.values()] };
}
const same = (a: Entry, b: Entry) => a.name === b.name && a.quantity === b.quantity && a.unit === b.unit;
export type Change = { list: keyof Lists; action: 'add' | 'update' | 'remove' | 'keep'; before?: Entry; after?: Entry; reason?: string };
export function mergeLists(week: PlanningWeek, generated: Lists) {
    const changes: Change[] = [];
    const warnings: string[] = [];
    const generation: Generation = { ...generated, suppressedShopping: [], suppressedTasks: [] };
    const result = {} as Lists;
    for (const list of ['shopping', 'tasks'] as const) {
        const suppressionKey = list === 'shopping' ? 'suppressedShopping' : 'suppressedTasks';
        const protectionKey = list === 'shopping' ? 'protectedShopping' : 'protectedTasks';
        const protectedIds = new Set(week.generation?.[protectionKey] ?? []);
        const previous = new Map((week.generation?.[list] ?? []).map(item => [item.id, item]));
        const current = new Map(week[list].map(item => [item.id, item]));
        const desired = new Map(generated[list].map(item => [item.id, item]));
        const suppressed = new Set(week.generation?.[suppressionKey] ?? []);
        for (const id of previous.keys()) if (!current.has(id)) suppressed.add(id);
        generation[suppressionKey] = [...suppressed];
        const output: Entry[] = [];
        for (const item of week[list]) {
            const baseline = previous.get(item.id);
            const next = desired.get(item.id);
            if (baseline && !same(item, baseline)) protectedIds.add(item.id);
            const protectedReason = item.done ? 'כבר סומן כבוצע' : !baseline ? 'פריט ידני קיים' : protectedIds.has(item.id) ? 'נערך ידנית' : '';
            if (protectedReason) {
                output.push(item); desired.delete(item.id);
                if (baseline && (!next || !same(item, next))) {
                    const expected = next ? `הכמות המחושבת: ${next.quantity} ${next.unit}` : 'אינו נדרש בתפריט החדש';
                    changes.push({ list, action: 'keep', before: item, after: next, reason: `${protectedReason} · ${expected}` });
                    warnings.push(`${item.name}: נשמר ללא שינוי (${protectedReason}); ${expected}`);
                }
            } else if (!next) changes.push({ list, action: 'remove', before: item });
            else {
                const updated = { ...next, done: item.done };
                output.push(updated); desired.delete(item.id);
                if (!same(item, updated)) changes.push({ list, action: 'update', before: item, after: updated });
            }
        }
        for (const item of desired.values()) {
            if (suppressed.has(item.id)) {
                changes.push({ list, action: 'keep', after: item, reason: 'נמחק ידנית בעבר; לא יוחזר אוטומטית' });
                warnings.push(`${item.name}: נמחק ידנית ולא יוחזר`);
                continue;
            }
            const duplicate = output.find(row => list === 'shopping' ? ingredientKey(row.name, row.unit) === ingredientKey(item.name, item.unit) : normalize(row.name) === normalize(item.name));
            if (duplicate) {
                changes.push({ list, action: 'keep', before: duplicate, after: item, reason: 'קיים פריט ידני דומה; יש להשוות את הכמות ידנית' });
                warnings.push(`${item.name}: נשמר הפריט הידני הקיים; הכמות המחושבת ${item.quantity} ${item.unit}`);
                continue;
            }
            output.push(item); changes.push({ list, action: 'add', after: item });
        }
        if (output.length > 300) throw new Error('הרשימה לאחר ההחלה תחרוג מ־300 פריטים. יש לצמצם אותה תחילה.');
        generation[protectionKey] = [...protectedIds];
        result[list] = output;
    }
    return { ...result, generation, changes, warnings };
}
export function previewPlan(week: PlanningWeek, recipes: Recipe[], mealCount: number) {
    const merged = mergeLists(week, calculate(recipes, mealCount));
    const token = hash(JSON.stringify({ date: week.date, revision: week.revision, recipes, mealCount, merged }));
    return { ...merged, recipes, mealCount, revision: week.revision, token };
}
export function suggestMenu(catalog: Recipe[], date: string, history: { menu?: { recipes: Recipe[] } | null }[]): Recipe[] {
    const chosen: Recipe[] = [];
    for (const category of categories) {
        let candidates = catalog.filter(recipe => recipe.category === category);
        if (!candidates.length) return [];
        if (category === 'dessert' && candidates.some(recipe => recipe.purchased)) candidates = candidates.filter(recipe => recipe.purchased);
        const salad = chosen.find(recipe => recipe.category === 'salad');
        if (category === 'dressing' && salad?.dressingIds.some(id => candidates.some(recipe => recipe.id === id))) candidates = candidates.filter(recipe => salad.dressingIds.includes(recipe.id));
        const penalty = (recipe: Recipe) => history.reduce((score, week, index) => score + (week.menu?.recipes.some(previous => previous.id === recipe.id) ? Math.max(1, 10 - index * 3) : 0), 0) + (recipe.batchFriendly ? 0 : 20);
        candidates.sort((a, b) => penalty(a) - penalty(b) || hash(`${date}:${a.id}`).localeCompare(hash(`${date}:${b.id}`)));
        chosen.push(candidates[0]);
    }
    return chosen;
}
