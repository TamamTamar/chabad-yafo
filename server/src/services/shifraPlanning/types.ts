export const categories = ['main', 'salad', 'dressing', 'bread', 'spread', 'dessert'] as const;
export type Category = typeof categories[number];
export type Ingredient = { name: string; quantity: number; unit: string };
export type Recipe = {
    id: string; revision: number; name: string; category: Category;
    ingredients: Ingredient[]; instructions: string; tasks: string[];
    purchased: boolean; batchFriendly: boolean; dressingIds: string[];
};
export type Entry = { id: string; name: string; quantity: string; unit: string; done: boolean };
export type Lists = { shopping: Entry[]; tasks: Entry[] };
export type Generation = Lists & { suppressedShopping: string[]; suppressedTasks: string[]; protectedShopping?: string[]; protectedTasks?: string[] };
export type Menu = { recipes: Recipe[]; mealCount: number; approvedAt: string; approvedBy: string };
export type PlanningWeek = Lists & { date: string; revision: number; menu?: Menu | null; generation?: Generation | null };
