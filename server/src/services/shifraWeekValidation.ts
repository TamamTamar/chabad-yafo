import { parseDate } from './shifraPuaValidation';
export function weekDate(value: unknown) {
    const date = parseDate(value);
    if (new Date(`${date}T12:00:00Z`).getUTCDay() !== 3) throw new Error('יש לבחור יום רביעי');
    return date;
}
export function parseWeek(value: any) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error('גרסת הרשימה אינה תקינה');
    const entries = (list: any) => {
        if (!Array.isArray(list) || list.length > 300) throw new Error('הרשימה מוגבלת ל־300 פריטים');
        const ids = new Set<string>();
        return list.map(item => {
            if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id) || ids.has(item.id)) throw new Error('מזהה פריט אינו תקין');
            ids.add(item.id);
            if (typeof item.done !== 'boolean') throw new Error('סימון אינו תקין');
            const text = (key: string, max: number, required = false) => {
                if (typeof item[key] !== 'string' || item[key].length > max || (required && !item[key].trim())) throw new Error('פרטי הפריט אינם תקינים');
                return item[key].trim();
            };
            return { id: item.id, name: text('name', 200, true), quantity: text('quantity', 40), unit: text('unit', 40), done: item.done };
        });
    };
    return { revision: value.revision, shopping: entries(value.shopping), tasks: entries(value.tasks) };
}
