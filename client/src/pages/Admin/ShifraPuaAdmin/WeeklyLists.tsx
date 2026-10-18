import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import axios from 'axios';
import WeeklyMenu from './WeeklyMenu';
import type { MealWeek, PlanningData, WeeklyEntry } from '../../../types/shifraPlanning';
import { useEffect, useRef, useState } from 'react';
import http from '../../../services/http';
import { shifraError } from '../../../services/shifraPuaService';
import { defaultDeliveryDate, formatDate } from '../../../types/shifraPua';
import styles from './ShifraPuaAdmin.module.scss';

type Entry = WeeklyEntry;
type Week = MealWeek;
function Row({ item, shopping, disabled, change, remove }: { item: Entry; shopping: boolean; disabled: boolean; change: (item: Entry) => void; remove: () => void }) {
    const signature = JSON.stringify(item);
    const [edit, setEdit] = useState({ signature, value: item });
    const [editing, setEditing] = useState(false);
    const draft = edit.signature === signature ? edit.value : item;
    const field = (key: 'name' | 'quantity' | 'unit', label: string, maxLength: number) => <label>{label}<input aria-invalid={key === 'name' && !draft.name.trim() ? true : undefined} aria-describedby={key === 'name' && !draft.name.trim() ? `shifra-list-${item.id}-error` : undefined} maxLength={maxLength} value={draft[key]} onChange={event => setEdit({ signature, value: { ...draft, [key]: event.target.value } })} onBlur={() => { if (draft.name.trim() && JSON.stringify(draft) !== JSON.stringify(item)) change(draft); }} /></label>;
    return <fieldset className={styles.listRow} disabled={disabled}>
        <div className={styles.rowSummary}><label className={styles.check}><input type="checkbox" aria-label={`${shopping ? 'נקנה' : 'הוכן'}: ${item.name}`} checked={item.done} onChange={event => change({ ...item, done: event.target.checked })} /><span><strong>{item.name}</strong>{item.quantity && <small>{item.quantity} {item.unit}</small>}</span></label><button type="button" className={styles.secondary} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? 'סגירה' : 'עריכה'}</button></div>
        {editing && <>
            {field('name', shopping ? 'פריט' : 'משימה', 200)}
            {shopping && <div className={styles.amounts}>{field('quantity', 'כמות', 40)}{field('unit', 'יחידה', 40)}</div>}
            {!draft.name.trim() && <span id={`shifra-list-${item.id}-error`} role="alert">יש למלא שם</span>}
            <button type="button" className={styles.secondary} onClick={remove} aria-label={`מחיקת ${item.name}`}>מחיקה</button>
        </>}
    </fieldset>;
}

export default function WeeklyLists() {
    const [date, setDate] = useState(defaultDeliveryDate);
    const [week, setWeek] = useState<Week | null>(null);
    const [error, setError] = useState('');
    const [planning, setPlanning] = useState<PlanningData | null>(null);
    const [menuBusy, setMenuBusy] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [names, setNames] = useState({ shopping: '', tasks: '' });
    const lock = useRef(false);
    const [confirmation, setConfirmation] = useState<{ message: string; action: () => void } | null>(null);
    const clear = () => { setWeek(null); setPlanning(null); setError(''); setConflict(false); setNotice(''); };
    const reload = () => { clear(); setRefresh(value => value + 1); };
    useEffect(() => {
        const controller = new AbortController();
        void Promise.all([
            http.get<{ data: Week }>(`/admin/shifra-pua/weeks/${date}`, { signal: controller.signal }),
            http.get<{ data: PlanningData }>('/admin/shifra-pua/planning', { params: { date }, signal: controller.signal }),
        ]).then(([response, catalog]) => {
            if (!controller.signal.aborted) { setWeek(response.data.data); setPlanning(catalog.data.data); }
        }).catch(error => { if (!controller.signal.aborted) setError(shifraError(error)); });
        return () => controller.abort();
    }, [date, refresh]);
    const save = async (next: Week) => {
        if (lock.current || menuBusy) return;
        lock.current = true; setBusy(true); setError(''); setNotice('שומר…');
        // Keep the proposed edit visible on failure; retry uses the original revision.
        setWeek(next);
        try {
            const response = await http.put<{ data: Week }>(`/admin/shifra-pua/weeks/${date}`, next);
            setWeek({ ...response.data.data, mealCount: next.mealCount }); setNotice('כל השינויים נשמרו');
        } catch (error) { setError(shifraError(error)); setConflict(axios.isAxiosError(error) && error.response?.status === 409); setNotice('השינויים האחרונים לא נשמרו'); }
        finally { lock.current = false; setBusy(false); }
    };
    return <section aria-label="קניות והכנות שבועיות">
        <ConfirmDialog open={!!confirmation} title="אישור פעולה" message={confirmation?.message ?? ''} busy={busy || menuBusy} onConfirm={() => { const action = confirmation?.action; setConfirmation(null); action?.(); }} onClose={() => setConfirmation(null)} />
        <div className={styles.filters}><label>יום רביעי של השבוע<input type="date" value={date} disabled={busy || menuBusy || !!error && !!week} onChange={event => {
            const value = event.target.value;
            if (value && new Date(`${value}T12:00:00Z`).getUTCDay() === 3) { clear(); setDate(value); setNames({ shopping: '', tasks: '' }); }
            else setNotice('יש לבחור יום רביעי בלוח השנה');
        }} /></label><button type="button" className={styles.secondary} disabled={busy || menuBusy} onClick={() => { if (!error || !week) reload(); else setConfirmation({ message: 'טעינה מחדש תחליף את השינויים שלא נשמרו. להמשיך?', action: reload }); }}>טעינה מחדש</button></div>
        <p className={styles.hint}>אפשר לבחור גם שבוע קודם לצפייה בהיסטוריה. עריכת שדה נשמרת אוטומטית ביציאה ממנו; סימון, הוספה ומחיקה נשמרים מיד.</p>
        <p role="status" aria-live="polite">{notice}</p>
        {error && <div role="alert" className={styles.error}><p>{error}</p>{week && !conflict && <button className={styles.secondary} disabled={busy || menuBusy} onClick={() => void save(week)}>ניסיון שמירה נוסף</button>}</div>}
        {!week && !error && <p role="status">טוען רשימות…</p>}
        {week && <><div className={styles.preparation}><h2>{formatDate(date)}</h2><p><strong>{week.mealCount} ארוחות מתוכננות</strong> · הרשמות שתואמו לתאריך זה</p><p className={styles.hint}>הספירה מתעדכנת בטעינה מחדש. שינוי בתפריט או במספר הארוחות יוצג לבדיקה לפני עדכון הרשימות.</p></div>
            {planning && <WeeklyMenu key={`${date}-${refresh}`} week={week} planning={planning} disabled={busy || !!error} onBusy={setMenuBusy} onCatalog={setPlanning} onSaved={value => { setWeek(value); setNotice('התפריט והרשימות נשמרו'); }} />}
            <div className={styles.weekLists}>{(['shopping', 'tasks'] as const).map(kind => <section key={kind} className={styles.card}>
                <h2>{kind === 'shopping' ? 'רשימת קניות' : 'רשימת הכנות'}</h2>
                <p>{week[kind].filter(item => item.done).length} מתוך {week[kind].length} {kind === 'shopping' ? 'נקנו' : 'הוכנו'}</p>
                {week[kind].map(item => <Row key={item.id} item={item} shopping={kind === 'shopping'} disabled={busy || menuBusy || !!error} change={entry => void save({ ...week, [kind]: week[kind].map(row => row.id === entry.id ? entry : row) })} remove={() => setConfirmation({ message: `למחוק את ״${item.name}״?`, action: () => { void save({ ...week, [kind]: week[kind].filter(row => row.id !== item.id) }); } })} />)}
                {!week[kind].length && <p>הרשימה עדיין ריקה.</p>}
                <form onSubmit={event => { event.preventDefault(); if (names[kind].trim() && !lock.current && !menuBusy) { void save({ ...week, [kind]: [...week[kind], { id: crypto.randomUUID(), name: names[kind].trim(), quantity: '', unit: '', done: false }] }); setNames(current => ({ ...current, [kind]: '' })); } }}>
                    <fieldset className={`${styles.listRow} ${styles.listAdd}`} disabled={busy || menuBusy || !!error || week[kind].length >= 300}><label>{kind === 'shopping' ? 'פריט חדש' : 'משימה חדשה'}<input required maxLength={200} value={names[kind]} onChange={event => setNames({ ...names, [kind]: event.target.value })} /></label><button className={styles.primary} type="submit">הוספה</button></fieldset>
                </form>
            </section>)}</div>
        </>}
    </section>;
}
