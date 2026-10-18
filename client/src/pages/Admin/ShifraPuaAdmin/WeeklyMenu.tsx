import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import { useRef, useState } from 'react';
import http from '../../../services/http';
import { shifraError } from '../../../services/shifraPuaService';
import { formatDate } from '../../../types/shifraPua';
import { categoryLabels, mealCategories, type MealCategory, type MealWeek, type MenuPreview, type PlanningData, type Recipe } from '../../../types/shifraPlanning';
import RecipeEditor from './RecipeEditor';
import styles from './ShifraPuaAdmin.module.scss';

export default function WeeklyMenu({ week, planning, disabled, onSaved, onCatalog, onBusy }: { week: MealWeek; planning: PlanningData; disabled: boolean; onSaved: (week: MealWeek) => void; onCatalog: (data: PlanningData) => void; onBusy: (busy: boolean) => void }) {
    const [selection, setSelection] = useState<Recipe[]>(() => week.menu?.recipes ?? planning.suggestion);
    const [proposal, setPreview] = useState<MenuPreview | null>(null);
    const preview = proposal?.revision === week.revision && proposal?.mealCount === week.mealCount ? proposal : null;
    const [confirmation, setConfirmation] = useState<{ message: string; action: () => void } | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [library, setLibrary] = useState(false);
    const [editing, setEditing] = useState<Recipe | null>(null);
    const [category, setCategory] = useState<MealCategory>('main');
    const [favoriteName, setFavoriteName] = useState('');
    const lock = useRef(false);
    // A preview belongs to one exact list revision and meal count.
    const run = async (action: () => Promise<void>) => {
        if (lock.current || disabled) return;
        lock.current = true; setBusy(true); onBusy(true); setError(''); setNotice('');
        try { await action(); } catch (error) { setError(shifraError(error)); }
        finally { lock.current = false; setBusy(false); onBusy(false); }
    };
    const reloadCatalog = async () => {
        const response = await http.get<{ data: PlanningData }>('/admin/shifra-pua/planning', { params: { date: week.date } });
        onCatalog(response.data.data);
        return response.data.data;
    };
    const replace = (recipe: Recipe) => {
        let next = mealCategories.map(category => category === recipe.category ? recipe : selection.find(item => item.category === category)).filter((item): item is Recipe => !!item);
        if (recipe.category === 'salad') {
            const dressing = planning.recipes.find(item => item.category === 'dressing' && recipe.dressingIds.includes(item.id));
            if (dressing) next = next.map(item => item.category === 'dressing' ? dressing : item);
        }
        setSelection(next); setPreview(null); setNotice('הבחירה טרם הוחלה. יש לבדוק ולאשר את השינויים ברשימות.');
    };
    const requestPreview = () => void run(async () => {
        const response = await http.post<{ data: MenuPreview }>(`/admin/shifra-pua/weeks/${week.date}/preview`, { revision: week.revision, recipes: selection });
        setPreview(response.data.data);
    });
    const approve = () => void run(async () => {
        if (!preview) return;
        const response = await http.post<{ data: MealWeek }>(`/admin/shifra-pua/weeks/${week.date}/approve`, { revision: preview.revision, recipes: preview.recipes, token: preview.token });
        onSaved(response.data.data); setSelection(response.data.data.menu!.recipes); setPreview(null); setNotice('התפריט והרשימות נשמרו');
    });
    const catalogSave = (recipe: Recipe) => void run(async () => {
        const response = await http.put<{ data: Recipe }>(`/admin/shifra-pua/recipes/${recipe.id}`, recipe);
        if (selection.some(item => item.id === recipe.id && item.category === recipe.category)) {
            setSelection(current => current.map(item => item.id === recipe.id ? response.data.data : item));
            setPreview(null);
        }
        setEditing(null); await reloadCatalog(); setNotice('המנה נשמרה במאגר. שינוי בתפריט השבועי דורש בדיקה ואישור לפני עדכון הרשימות.');
    });
    const staleCount = week.menu && week.menu.mealCount !== week.mealCount;
    const altered = JSON.stringify(selection) !== JSON.stringify(week.menu?.recipes);
    const controlsDisabled = busy || disabled;
    return <section className={styles.menuSection} aria-label="תפריט שבועי">
        <ConfirmDialog open={!!confirmation} title="אישור מחיקה" message={confirmation?.message ?? ''} tone="danger" busy={controlsDisabled} onConfirm={() => { const action = confirmation?.action; setConfirmation(null); action?.(); }} onClose={() => setConfirmation(null)} />
        <div className={styles.menuHeader}><h2>{week.menu ? altered ? 'שינויים מוצעים לתפריט השבועי' : 'התפריט השבועי המאושר' : 'התפריט המוצע לשבוע'}</h2><span className={styles.badge}>{week.menu ? altered ? 'טרם הוחלו' : 'מאושר' : 'ממתין לאישור'}</span></div>
        <p className={styles.menuIntro}>{week.menu ? `אושר להכנת ${week.menu.mealCount} מארזים. החלפות יישמרו רק לאחר בדיקה ואישור.` : 'הצעה מגוונת מתוך המאגר, עם קינוח קנוי כברירת מחדל. אפשר להחליף כל רכיב לפני האישור.'}</p>
        {staleCount && <p className={styles.dietary} role="status">מספר הארוחות השתנה מ־{week.menu!.mealCount} ל־{week.mealCount}. בדקו הצעה לעדכון הכמויות; הרשימות טרם שונו.</p>}
        <fieldset disabled={controlsDisabled} className={styles.menuFields}>
            {mealCategories.map(category => {
                const selected = selection.find(recipe => recipe.category === category);
                const options = planning.recipes.filter(recipe => recipe.category === category).map(recipe => recipe.id === selected?.id ? selected : recipe);
                if (selected && !options.some(recipe => recipe.id === selected.id)) options.unshift(selected);
                return <div className={styles.menuChoice} data-category={category} key={category}>
                    <label><span className={styles.menuCategory}>{categoryLabels[category]}</span><select value={selected?.id ?? ''} onChange={event => { const recipe = options.find(item => item.id === event.target.value); if (recipe) replace(recipe); }}><option value="" disabled>יש לבחור מנה</option>{options.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}{recipe.category === 'dessert' && recipe.purchased ? ' · קנוי' : ''}</option>)}</select></label>
                    {selected && <details className={styles.recipeDetails}><summary aria-label={`מתכון וכמויות: ${selected.name}`}>מתכון וכמויות<span aria-hidden="true">⌄</span></summary><div className={styles.recipeContent}><h3>{selected.name}</h3><p>{selected.instructions}</p><ul>{selected.ingredients.map((item, index) => <li key={index}>{item.name}: {item.quantity} {item.unit}</li>)}</ul><button type="button" className={styles.secondary} onClick={() => { const current = planning.recipes.find(recipe => recipe.id === selected.id); setEditing(current ?? { ...selected, id: crypto.randomUUID(), revision: 0 }); setLibrary(true); }}>עריכת המנה במאגר</button>{planning.recipes.some(recipe => recipe.id === selected.id && recipe.revision !== selected.revision) && <button type="button" className={styles.secondary} onClick={() => replace(planning.recipes.find(recipe => recipe.id === selected.id)!)}>בחירת הגרסה המעודכנת מהמאגר</button>}</div></details>}
                </div>;
            })}
        </fieldset>
        <div className={`${styles.actions} ${styles.menuActions}`}><button type="button" className={styles.primary} disabled={controlsDisabled || selection.length !== 6} onClick={requestPreview}>{week.menu ? staleCount && !altered ? 'בדיקת עדכון כמויות' : 'בדיקת השינויים בתפריט' : 'אישור התפריט · בדיקת הרשימות'}</button>{week.menu && altered && <button type="button" className={styles.secondary} disabled={controlsDisabled} onClick={() => { setSelection(week.menu!.recipes); setPreview(null); }}>חזרה לתפריט המאושר</button>}<button type="button" className={styles.secondary} disabled={controlsDisabled} onClick={() => setLibrary(!library)} aria-expanded={library}>{library ? 'סגירת המאגר' : 'מאגר מנות ותפריטים שמורים'}</button></div>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {preview && <section className={styles.preview} aria-label="הצעת שינויים לפני החלה">
            <h3>בדיקה לפני אישור · {preview.mealCount} מארזים</h3>
            <p>הכמויות הראשוניות במאגר הן הצעה למנה אישית. בדקו אותן; האישור יחיל את הכמויות המוצגות. יחידות שלמות מעוגלות כלפי מעלה.</p>
            <p>פריטים ידניים, שינויים ידניים וסימונים שבוצעו יישמרו. רק פריטים אוטומטיים שלא נערכו ולא סומנו יתעדכנו או יוסרו.</p>
            {preview.warnings.length > 0 && <div className={styles.dietary}><strong>נדרשת בדיקה ידנית</strong><ul>{preview.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
            <p>{preview.changes.filter(change => change.action === 'add').length} הוספות · {preview.changes.filter(change => change.action === 'update').length} עדכונים · {preview.changes.filter(change => change.action === 'remove').length} הסרות</p>
            <ul className={styles.changeList}>{preview.changes.filter(change => change.action !== 'keep').map((change, index) => <li key={index}><strong>{({ add: 'הוספה', update: 'עדכון', remove: 'הסרה', keep: 'שמירה' })[change.action]}: {(change.after ?? change.before)!.name}</strong><span>{change.before && `${change.before.quantity} ${change.before.unit}`}{change.action === 'update' && ' ← '}{change.after && `${change.after.quantity} ${change.after.unit}`}</span></li>)}</ul>
            {(['shopping', 'tasks'] as const).map(list => <details key={list}><summary>{list === 'shopping' ? 'רשימת הקניות לאחר ההחלה' : 'רשימת ההכנות לאחר ההחלה'} ({preview[list].length})</summary><ul>{preview[list].map(item => <li key={item.id}>{item.name} · {item.quantity} {item.unit}{item.done ? ' · כבר בוצע' : ''}</li>)}</ul></details>)}
            <div className={styles.actions}><button type="button" className={styles.primary} disabled={controlsDisabled} onClick={approve}>{busy ? 'שומר…' : week.menu ? 'אישור והחלת השינויים' : 'אישור התפריט ומילוי הרשימות'}</button><button type="button" className={styles.secondary} disabled={controlsDisabled} onClick={() => setPreview(null)}>ביטול</button></div>
        </section>}
        {library && <section className={styles.library} aria-label="מאגר מנות">
            <h3>מאגר מנות ומתכונים</h3>
            <p className={styles.hint}>מחיקה מהמאגר לא מוחקת מנה מתפריט שכבר אושר. תפריטים שמורים שומרים את המתכונים כפי שהיו בזמן השמירה.</p>
            {editing ? <RecipeEditor key={editing.id} recipe={editing} catalog={planning.recipes} busy={controlsDisabled} save={catalogSave} cancel={() => setEditing(null)} /> : <>
                <div className={styles.filters}><label>סוג מנה<select value={category} disabled={controlsDisabled} onChange={event => setCategory(event.target.value as MealCategory)}>{mealCategories.map(category => <option value={category} key={category}>{categoryLabels[category]}</option>)}</select></label><button className={styles.secondary} disabled={controlsDisabled} onClick={() => setEditing({ id: crypto.randomUUID(), revision: 0, name: '', category, ingredients: [{ name: '', quantity: 1, unit: 'גרם' }], instructions: '', tasks: [''], purchased: category === 'dessert' || category === 'bread', batchFriendly: true, dressingIds: [] })}>הוספת מנה</button></div>
                <ul className={styles.catalogList}>{planning.recipes.filter(recipe => recipe.category === category).map(recipe => <li key={recipe.id}><strong>{recipe.name}</strong><div className={styles.actions}><button className={styles.secondary} disabled={controlsDisabled} onClick={() => { replace(recipe); setLibrary(false); }}>בחירה לשבוע</button><button className={styles.secondary} disabled={controlsDisabled} onClick={() => setEditing(recipe)}>עריכה</button><button className={styles.secondary} disabled={controlsDisabled} onClick={() => setConfirmation({ message: `למחוק את ״${recipe.name}״ מהמאגר? תפריטים מאושרים לא ישתנו.`, action: () => { void run(async () => { await http.delete(`/admin/shifra-pua/recipes/${recipe.id}`, { data: { revision: recipe.revision } }); await reloadCatalog(); setNotice('המנה הוסרה מהמאגר'); }); } })}>מחיקה</button></div></li>)}</ul>
            </>}
            <h3>תפריטים מוצלחים לשימוש חוזר</h3>
            {week.menu && <form className={styles.favoriteForm} onSubmit={event => { event.preventDefault(); void run(async () => { await http.post(`/admin/shifra-pua/weeks/${week.date}/favorite`, { name: favoriteName, revision: week.revision }); setFavoriteName(''); await reloadCatalog(); setNotice('התפריט המאושר נשמר לשימוש חוזר'); }); }}><label>שם לתפריט המאושר<input required maxLength={120} disabled={controlsDisabled} value={favoriteName} onChange={event => setFavoriteName(event.target.value)} /></label><button className={styles.secondary} disabled={controlsDisabled} type="submit">שמירה לשימוש חוזר</button></form>}
            {!planning.favorites.length && <p>עדיין אין תפריטים שמורים.</p>}
            <ul className={styles.catalogList}>{planning.favorites.map(menu => <li key={menu._id}><strong>{menu.name}</strong><p>{menu.recipes.map(recipe => recipe.name).join(' · ')}</p><div className={styles.actions}><button className={styles.secondary} disabled={controlsDisabled} onClick={() => { setSelection(menu.recipes); setPreview(null); setLibrary(false); setNotice('התפריט השמור נבחר. יש לבדוק ולאשר לפני החלתו.'); }}>בחירה לשבוע</button><button className={styles.secondary} disabled={controlsDisabled} onClick={() => setConfirmation({ message: 'להסיר את התפריט מהמועדפים? ההיסטוריה תישמר.', action: () => { void run(async () => { await http.delete(`/admin/shifra-pua/saved-menus/${menu._id}`); await reloadCatalog(); }); } })}>הסרה מהמועדפים</button></div></li>)}</ul>
        </section>}
        {(week.menuHistory?.length ?? 0) > 0 && <details className={styles.history}><summary>היסטוריית אישורי התפריט לשבוע זה</summary>{[...week.menuHistory!].reverse().map((menu, index) => <div key={index}><strong>{formatDate(menu.approvedAt)} · {menu.mealCount} מארזים</strong><p>{menu.recipes.map(recipe => recipe.name).join(' · ')}</p></div>)}</details>}
        {planning.history.length > 0 && <details className={styles.history}><summary>תפריטים משבועות קודמים</summary>{planning.history.map(item => <div key={item.date}><strong>{formatDate(item.date)} · {item.menu.mealCount} מארזים</strong><p>{item.menu.recipes.map(recipe => recipe.name).join(' · ')}</p><button className={styles.secondary} disabled={controlsDisabled} onClick={() => { setSelection(item.menu.recipes); setPreview(null); setNotice('נבחר תפריט משבוע קודם לבדיקה ולאישור'); }}>שימוש בתפריט הזה</button></div>)}</details>}
    </section>;
}
