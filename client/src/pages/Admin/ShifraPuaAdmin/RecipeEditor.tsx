import { useState } from 'react';
import { categoryLabels, mealCategories, type Recipe } from '../../../types/shifraPlanning';
import styles from './ShifraPuaAdmin.module.scss';

export default function RecipeEditor({ recipe, catalog, busy, save, cancel }: { recipe: Recipe; catalog: Recipe[]; busy: boolean; save: (recipe: Recipe) => void; cancel: () => void }) {
    const [draft, setDraft] = useState<Recipe>(() => structuredClone(recipe));
    const [tasks, setTasks] = useState(recipe.tasks.join('\n'));
    return <form className={`${styles.editForm} ${styles.recipeForm}`} onSubmit={event => { event.preventDefault(); save({ ...draft, tasks: tasks.split('\n').map(value => value.trim()).filter(Boolean) }); }}>
        <fieldset disabled={busy}>
            <legend>עריכת מנה ומתכון</legend>
            <label>שם המנה<input required maxLength={120} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>קטגוריה<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Recipe['category'] })}>{mealCategories.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
            <label className={styles.check}><input type="checkbox" checked={draft.batchFriendly} onChange={event => setDraft({ ...draft, batchFriendly: event.target.checked })} />מתאים להכנה בכמות ולאריזה אישית</label>
            <label className={styles.check}><input type="checkbox" checked={draft.purchased} onChange={event => setDraft({ ...draft, purchased: event.target.checked })} />מנה קנויה מוכנה</label>
            <h3>מצרכים למנה אישית אחת</h3>
            <p className={styles.hint}>רצוי להשתמש בגרם ובמ״ל. המערכת מאחדת אותו מצרך באותה יחידה, וממירה ק״ג לגרם וליטר למ״ל. שמות שונים נשארים נפרדים.</p>
            {draft.ingredients.map((ingredient, index) => <div className={styles.ingredientEditor} key={index}>
                <label>מצרך<input required maxLength={120} value={ingredient.name} onChange={event => setDraft({ ...draft, ingredients: draft.ingredients.map((row, i) => i === index ? { ...row, name: event.target.value } : row) })} /></label>
                <div className={styles.amounts}><label>כמות למנה<input required type="number" min="0.001" max="10000" step="any" value={ingredient.quantity || ''} onChange={event => setDraft({ ...draft, ingredients: draft.ingredients.map((row, i) => i === index ? { ...row, quantity: Number(event.target.value) } : row) })} /></label><label>יחידה<input required maxLength={30} list="shifra-ingredient-units" value={ingredient.unit} onChange={event => setDraft({ ...draft, ingredients: draft.ingredients.map((row, i) => i === index ? { ...row, unit: event.target.value } : row) })} /></label></div>
                <button type="button" className={styles.secondary} disabled={draft.ingredients.length === 1} onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, i) => i !== index) })}>הסרת מצרך</button>
            </div>)}
            <datalist id="shifra-ingredient-units">{['גרם', 'מ״ל', 'יחידות', 'פרוסות', 'ק״ג', 'ליטר'].map(unit => <option key={unit} value={unit} />)}</datalist>
            <button type="button" className={styles.secondary} disabled={draft.ingredients.length >= 30} onClick={() => setDraft({ ...draft, ingredients: [...draft.ingredients, { name: '', quantity: 1, unit: 'גרם' }] })}>הוספת מצרך</button>
            <label>הוראות הכנה קצרות<textarea required rows={4} maxLength={2000} value={draft.instructions} onChange={event => setDraft({ ...draft, instructions: event.target.value })} /></label>
            <label>משימות הכנה ואריזה - משימה בכל שורה<textarea required rows={4} maxLength={2400} value={tasks} onChange={event => setTasks(event.target.value)} /></label>
            {draft.category === 'salad' && <div><h3>רטבים מתאימים להצעה אוטומטית</h3>{catalog.filter(item => item.category === 'dressing').map(dressing => <label key={dressing.id} className={styles.check}><input type="checkbox" checked={draft.dressingIds.includes(dressing.id)} onChange={event => setDraft({ ...draft, dressingIds: event.target.checked ? [...draft.dressingIds, dressing.id] : draft.dressingIds.filter(id => id !== dressing.id) })} />{dressing.name}</label>)}</div>}
            <div className={styles.actions}><button className={styles.primary} type="submit">שמירת המנה במאגר</button><button className={styles.secondary} type="button" onClick={cancel}>ביטול עריכה</button></div>
            <p className={styles.hint}>השמירה מעדכנת את המאגר בלבד. תפריטים שבועיים שאושרו נשמרים כפי שהיו.</p>
        </fieldset>
    </form>;
}
