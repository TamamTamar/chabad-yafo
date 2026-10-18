import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { ShifraPuaRecipe, ShifraPuaSavedMenu } from '../models/ShifraPuaRecipe';
import { ShifraPuaWeek } from '../models/ShifraPuaWeek';
import { ShifraPuaRegistration } from '../models/ShifraPuaRegistration';
import { initialRecipes } from '../services/shifraPlanning/catalog';
import { parseRecipe, parseSelection, text, identifier, revision } from '../services/shifraPlanning/validation';
import { previewPlan, suggestMenu } from '../services/shifraPlanning/planner';
import { type PlanningWeek, type Recipe } from '../services/shifraPlanning/types';
import { weekDate } from '../services/shifraWeekValidation';

// Mounted after the existing admin/auth/origin middleware; errors reach its private error handler.
export const shifraPlanningRoutes = Router();
class InputError extends Error {}
const parse = <T>(fn: () => T) => { try { return fn(); } catch (error) { throw new InputError(error instanceof Error ? error.message : 'פרטים אינם תקינים'); } };
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(error => {
        if (error instanceof InputError) { res.status(400).json({ message: error.message }); return; }
        if ((error as { code?: number }).code === 11000) { res.status(409).json({ message: 'הנתונים השתנו במכשיר אחר. טענו מחדש לפני שמירה.' }); return; }
        next(error);
    });
};
const conflict = (res: Response) => res.status(409).json({ message: 'הרשימה או מספר הארוחות השתנו. טענו מחדש ובדקו הצעה מעודכנת לפני אישור.' });
export async function recipeCatalog(): Promise<Recipe[]> {
    const overrides = await ShifraPuaRecipe.find().lean();
    const recipes = new Map(initialRecipes.map(recipe => [recipe.id, recipe]));
    for (const override of overrides) {
        if (override.active) recipes.set(override._id, { ...override.recipe, id: override._id, revision: override.revision });
        else recipes.delete(override._id);
    }
    return [...recipes.values()];
}
shifraPlanningRoutes.get('/planning', handle(async (req, res) => {
    const date = parse(() => weekDate(req.query.date));
    const [recipes, history, favorites] = await Promise.all([
        recipeCatalog(), ShifraPuaWeek.find({ date: { $lt: date }, menu: { $ne: null } }).sort({ date: -1 }).limit(8).select('date menu').lean(),
        ShifraPuaSavedMenu.find().sort({ createdAt: -1 }).lean(),
    ]);
    return res.json({ data: { recipes, suggestion: suggestMenu(recipes, date, history), history, favorites } });
}));
shifraPlanningRoutes.put('/recipes/:id', handle(async (req, res) => {
    const id = parse(() => identifier(req.params.id));
    const recipe = parse(() => parseRecipe(req.body));
    if (recipe.id !== id) throw new InputError('מזהה המנה אינו תואם');
    const saved = await ShifraPuaRecipe.findOneAndUpdate({ _id: id, revision: recipe.revision }, {
        $set: { recipe, active: true }, $inc: { revision: 1 },
    }, { upsert: recipe.revision === 0, returnDocument: 'after', runValidators: true });
    if (!saved) return conflict(res);
    return res.json({ data: { ...saved.recipe, revision: saved.revision } });
}));
shifraPlanningRoutes.delete('/recipes/:id', handle(async (req, res) => {
    const id = parse(() => identifier(req.params.id));
    const version = parse(() => revision(req.body?.revision));
    const recipe = (await recipeCatalog()).find(item => item.id === id);
    if (!recipe) return res.status(404).json({ message: 'המנה לא נמצאה' });
    const saved = await ShifraPuaRecipe.findOneAndUpdate({ _id: id, revision: version }, {
        $set: { active: false, recipe }, $inc: { revision: 1 },
    }, { upsert: version === 0, returnDocument: 'after', runValidators: true });
    if (!saved) return conflict(res);
    return res.json({ success: true });
}));
async function proposal(req: Request) {
    const date = parse(() => weekDate(req.params.date));
    const recipes = parse(() => parseSelection(req.body?.recipes));
    const version = parse(() => revision(req.body?.revision));
    const [stored, mealCount] = await Promise.all([
        ShifraPuaWeek.findOne({ date }).lean(), ShifraPuaRegistration.countDocuments({ deliveryDate: date, status: 'coordinated' }),
    ]);
    const week = (stored ?? { date, revision: 0, shopping: [], tasks: [] }) as unknown as PlanningWeek;
    if (week.revision !== version) return null;
    return { date, plan: parse(() => previewPlan(week, recipes, mealCount)) };
}
shifraPlanningRoutes.post('/weeks/:date/preview', handle(async (req, res) => {
    const result = await proposal(req);
    if (!result) return conflict(res);
    return res.json({ data: result.plan });
}));
shifraPlanningRoutes.post('/weeks/:date/approve', handle(async (req, res) => {
    const result = await proposal(req);
    if (!result || typeof req.body?.token !== 'string' || result.plan.token !== req.body.token) return conflict(res);
    const { date, plan } = result;
    const menu = { recipes: plan.recipes, mealCount: plan.mealCount, approvedAt: new Date().toISOString(), approvedBy: res.locals.adminActor.id };
    const saved = await ShifraPuaWeek.findOneAndUpdate({ date, revision: plan.revision }, {
        $set: { shopping: plan.shopping, tasks: plan.tasks, generation: plan.generation, menu },
        $inc: { revision: 1 }, $push: { menuHistory: menu },
    }, { upsert: plan.revision === 0, returnDocument: 'after', runValidators: true });
    if (!saved) return conflict(res);
    return res.json({ data: { ...saved.toObject(), mealCount: plan.mealCount } });
}));
shifraPlanningRoutes.post('/weeks/:date/favorite', handle(async (req, res) => {
    const date = parse(() => weekDate(req.params.date));
    const name = parse(() => text(req.body?.name, 120));
    const version = parse(() => revision(req.body?.revision));
    const week = await ShifraPuaWeek.findOne({ date, revision: version }).lean();
    if (!week) return conflict(res);
    if (!week.menu) throw new InputError('יש לאשר תפריט שבועי לפני שמירה למועדפים');
    const saved = await ShifraPuaSavedMenu.create({ _id: randomUUID(), name, recipes: week.menu.recipes });
    return res.json({ data: saved });
}));
shifraPlanningRoutes.delete('/saved-menus/:id', handle(async (req, res) => {
    const id = parse(() => identifier(req.params.id));
    const result = await ShifraPuaSavedMenu.deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ message: 'התפריט השמור לא נמצא' });
    return res.json({ success: true });
}));
