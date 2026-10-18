import WeeklyLists from './WeeklyLists';
import { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { getShifraHistory, listShifraPua, shifraError, updateShifraPua } from '../../../services/shifraPuaService';
import { defaultDeliveryDate, formatDate, shifraStatuses, validPhone, type BirthHistory, type RegistrationList, type ShifraRegistration, type ShifraStatus } from '../../../types/shifraPua';
import styles from './ShifraPuaAdmin.module.scss';

function RegistrationCard({ item, onSaved }: { item: ShifraRegistration; onSaved: () => void }) {
    const [draft, setDraft] = useState(item);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState<BirthHistory[] | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyBusy, setHistoryBusy] = useState(false);
    const change = <K extends keyof ShifraRegistration>(key: K, value: ShifraRegistration[K]) => setDraft(current => ({ ...current, [key]: value }));
    const save = async (value = draft) => {
        if (busy) return;
        setBusy(true); setError('');
        try { await updateShifraPua(value); onSaved(); } catch (error) { setError(shifraError(error)); } finally { setBusy(false); }
    };
    const loadHistory = async () => {
        setHistoryOpen(true); setHistoryBusy(true); setError('');
        try { setHistory(await getShifraHistory(item._id)); } catch (error) { setError(shifraError(error)); } finally { setHistoryBusy(false); }
    };
    return <article className={styles.card} aria-busy={busy}>
        <div className={styles.cardHeader}><h2>{item.motherName}</h2><span className={styles.badge} data-status={item.status}>{shifraStatuses[item.status]}</span></div>
        {(item.previousMeals > 0 || item.mealHistory.length > 0) && <p className={styles.returning}>כבר קיבלה מאיתנו ארוחה · {item.previousMeals + item.mealHistory.length} מסירות מתועדות</p>}
        <p className={styles.address}>{item.address}</p>
        <div className={styles.actions}><a className={styles.secondary} href={`tel:${item.phone}`} aria-label={`חיוג ליולדת ${item.motherName}`}><bdi>{item.phone}</bdi> · חיוג ליולדת</a>{item.filledBy === 'other' && <a className={styles.secondary} href={`tel:${item.contactPhone}`}>חיוג לפונה: {item.contactName}</a>}</div>
        <dl className={styles.details}><div><dt>תאריך לידה</dt><dd>{formatDate(item.birthDate)}</dd></div><div><dt>נרשמה בתאריך</dt><dd>{formatDate(item.createdAt)}</dd></div><div><dt>חלוקה מתוכננת</dt><dd>{formatDate(item.deliveryDate)}</dd></div></dl>
        {item.dietaryNotes && <p className={styles.dietary}><strong>רגישויות ובקשות: </strong>{item.dietaryNotes}</p>}
        {item.adminNotes && <p className={styles.notes}><strong>הערות צוות: </strong>{item.adminNotes}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy} onClick={() => setEditing(!editing)} aria-expanded={editing}>{editing ? 'סגירת עריכה' : 'תיאום ועדכון'}</button>
            {item.status === 'coordinated' && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void save({ ...item, status: 'delivered' })}>{busy ? 'שומר…' : 'סימון: הארוחה נמסרה'}</button>}
            <button type="button" className={styles.secondary} disabled={historyBusy} onClick={() => historyOpen ? setHistoryOpen(false) : void loadHistory()} aria-expanded={historyOpen}>{historyBusy ? 'טוען היסטוריה…' : historyOpen ? 'סגירת היסטוריה' : 'היסטוריית לידות וארוחות'}</button>
        </div>
        {editing && <form className={styles.editForm} onSubmit={event => { event.preventDefault(); void save(); }}><fieldset disabled={busy}>
            <legend>עדכון הרשמה</legend>
            <label>סטטוס<select value={draft.status} onChange={event => change('status', event.target.value as ShifraStatus)}>{Object.entries(shifraStatuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
            <label>תאריך חלוקה<input type="date" required value={draft.deliveryDate} onChange={event => change('deliveryDate', event.target.value)} /></label>
            <p className={styles.hint}>ברירת המחדל היא יום רביעי. אפשר לבחור כל תאריך בתיאום עם היולדת.</p>
            <label>הערות צוות<textarea rows={3} maxLength={3000} value={draft.adminNotes} onChange={event => change('adminNotes', event.target.value)} /></label>
            <details><summary>תיקון פרטים וטיפול בהרשמה חוזרת</summary><p className={styles.hint}>אפשר לפתוח מחדש את אותה הרשמה באמצעות שינוי סטטוס. מסירות שכבר תועדו נשמרות בהיסטוריה; סימון נוסף כ״נמסרה״ יתעד ארוחה נוספת. לידה חדשה נרשמת בטופס הציבורי עם תאריך הלידה החדש.</p>
                <label>שם היולדת<input required maxLength={120} value={draft.motherName} onChange={event => change('motherName', event.target.value)} /></label>
                <label>טלפון היולדת<input type="tel" required dir="ltr" maxLength={30} value={draft.phone} onChange={event => { change('phone', event.target.value); event.target.setCustomValidity(validPhone(event.target.value) ? '' : 'מספר טלפון אינו תקין'); }} /></label>
                <label>כתובת ביפו<input required maxLength={300} value={draft.address} onChange={event => change('address', event.target.value)} /></label>
                <label>תאריך הלידה<input type="date" required value={draft.birthDate} onChange={event => change('birthDate', event.target.value)} /></label>
                <label>רגישויות ובקשות<textarea rows={3} maxLength={2000} value={draft.dietaryNotes} onChange={event => change('dietaryNotes', event.target.value)} /></label>
                {draft.filledBy === 'other' && <><label>שם הפונה<input required maxLength={120} value={draft.contactName} onChange={event => change('contactName', event.target.value)} /></label><label>טלפון הפונה<input type="tel" required dir="ltr" maxLength={30} value={draft.contactPhone} onChange={event => change('contactPhone', event.target.value)} /></label><p className={styles.hint}>בעת ההרשמה התקבל אישור להסכמת היולדת למסירת פרטיה.</p></>}
            </details>
            <button className={styles.primary} type="submit">{busy ? 'שומר…' : 'שמירת עדכון'}</button>
        </fieldset></form>}
        {historyOpen && history && <section className={styles.history} aria-label="היסטוריית לידות וארוחות">{history.map(birth => <div key={birth._id}><h3>לידה: {formatDate(birth.birthDate)} · {shifraStatuses[birth.status]}</h3>{birth.mealHistory.length ? <ul>{birth.mealHistory.map((meal, index) => <li key={index}>ארוחה נמסרה בתאריך {formatDate(meal.deliveryDate)} · {meal.address}</li>)}</ul> : <p>אין מסירות מתועדות ללידה זו.</p>}</div>)}</section>}
    </article>;
}

function RegistrationsAdmin() {
    const [view, setView] = useState<'registrations' | 'preparation'>('registrations');
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<{ key: string; data: RegistrationList | null; error: string } | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [notice, setNotice] = useState('');
    const requestKey = JSON.stringify([view, search, status, from, to, deliveryDate, page, refresh]);
    const busy = result?.key !== requestKey;
    const data = !busy ? result?.data : null;
    const error = !busy ? result?.error : '';
    useEffect(() => { const timer = setTimeout(() => { setSearch(query); setPage(1); }, 300); return () => clearTimeout(timer); }, [query]);
    useEffect(() => {
        const abort = new AbortController();
        const params = { view, q: search, page, ...(view === 'preparation' ? { deliveryDate } : { status, from, to }) };
        void listShifraPua(params, abort.signal).then(value => { if (!abort.signal.aborted) { if (value.items.length === 0 && page > 1) setPage(page - 1); else setResult({ key: requestKey, data: value, error: '' }); } }).catch(error => { if (!abort.signal.aborted) setResult({ key: requestKey, data: null, error: shifraError(error) }); });
        return () => abort.abort();
    }, [view, search, status, from, to, deliveryDate, page, refresh, requestKey]);
    const saved = () => { setNotice('העדכון נשמר'); setRefresh(value => value + 1); };
    return <section aria-label="הרשמות וחלוקה">
        <div className={styles.summary} aria-label="סיכום הרשמות" aria-busy={busy}>
            <div className={styles.summaryCard} data-tone="blue"><span>הרשמות בתצוגה</span><strong>{data?.total ?? '…'}</strong><small>בהתאם לחיפוש ולסינון הנוכחיים</small></div>
            <div className={styles.summaryCard} data-tone="peach"><span>ממתינות לטיפול</span><strong>{data?.pending ?? '…'}</strong><small>כל ההרשמות בסטטוס ״חדשה״</small></div>
            {view === 'preparation' && <div className={styles.summaryCard} data-tone="mint"><span>ארוחות להכנה</span><strong>{data?.mealCount ?? '…'}</strong><small>תואמו לתאריך החלוקה הנבחר</small></div>}
        </div>
        <div className={styles.toolbar}><div className={styles.views} role="group" aria-label="תצוגת ניהול"><button type="button" className={view === 'registrations' ? styles.primary : styles.secondary} aria-pressed={view === 'registrations'} onClick={() => { setView('registrations'); setPage(1); }}>כל ההרשמות</button><button type="button" className={view === 'preparation' ? styles.primary : styles.secondary} aria-pressed={view === 'preparation'} onClick={() => { setView('preparation'); setPage(1); }}>הכנות וחלוקה</button></div></div>
        <section className={styles.filters} aria-label="חיפוש וסינון">
            <label className={styles.searchField}>חיפוש שם, טלפון או כתובת<span className={styles.searchInput}><Search size={17} aria-hidden="true" /><input type="search" placeholder="חיפוש הרשמות…" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} /></span></label>
            {view === 'registrations' ? <><label>סטטוס<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">כל הסטטוסים</option>{Object.entries(shifraStatuses).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>נרשמה מתאריך<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label><label>נרשמה עד תאריך<input type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} /></label></> : <label>תאריך חלוקה<input type="date" required value={deliveryDate} onChange={event => { setDeliveryDate(event.target.value); setPage(1); }} /></label>}
            <button type="button" className={styles.secondary} onClick={() => { setNotice(''); setRefresh(value => value + 1); }} disabled={busy}><RefreshCw size={16} aria-hidden="true" />רענון</button>
        </section>
        {view === 'preparation' && <section className={styles.preparation}><h2>{deliveryDate ? `הכנות ל־${formatDate(deliveryDate)}` : 'בחרו תאריך חלוקה'}</h2><p>הספירה כוללת הרשמות בסטטוס ״תואמה״ לתאריך הנבחר.</p><p className={styles.hint}>הכתובות והרגישויות מופיעות בכרטיסים למטה. חיפוש מצמצם את הכרטיסים, ללא שינוי בסך הארוחות לתאריך.</p></section>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {busy && <p className={styles.loading} role="status">טוען הרשמות…</p>}
        {data && <><div className={styles.resultsHeader}><h2>{view === 'registrations' ? 'רשימת הרשמות' : 'הרשמות לחלוקה'}</h2><span aria-live="polite">{data.total} הרשמות בתצוגה</span></div>{data.total === 0 && <div className={styles.empty}><span className={styles.emptyIcon}><ClipboardList size={30} aria-hidden="true" /></span><h3>אין הרשמות להצגה</h3><p>לא נמצאו הרשמות המתאימות לבחירה.</p><p className={styles.hint}>אפשר לשנות את החיפוש או הסינון כדי להציג הרשמות נוספות.</p></div>}<div className={styles.cards}>{data.items.map(item => <RegistrationCard key={`${item._id}-${item.revision}`} item={item} onSaved={saved} />)}</div>
            {data.total > data.pageSize && <nav className={styles.pagination} aria-label="עמודי הרשמות"><button type="button" className={styles.secondary} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>הקודם</button><span>עמוד {page} מתוך {Math.ceil(data.total / data.pageSize)}</span><button type="button" className={styles.secondary} disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>הבא</button></nav>}
        </>}
    </section>;
}

export default function ShifraPuaAdmin() {
    const [lists, setLists] = useState(false);
    return <main className={styles.page} dir="rtl">
        <header className={styles.pageHeader}>
            <span className={styles.headerIcon}><ClipboardList size={30} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><span className={styles.eyebrow}>ניהול הפעילות · יפו</span>
                <h1>שפרה ופועה</h1>
                <p>הרשמות, תיאום וחלוקת ארוחות בוקר ליולדות ביפו</p>
            </div>
        </header>
        <div className={styles.sectionNav} role="group" aria-label="אזור ניהול שפרה ופועה">
            <button type="button" aria-pressed={!lists} onClick={() => setLists(false)}>הרשמות וחלוקה</button>
            <button type="button" aria-pressed={lists} onClick={() => setLists(true)}>קניות והכנות</button>
        </div>
        <section hidden={!lists} aria-label="קניות והכנות"><div className={styles.sectionHeading}><h2>קניות והכנות</h2><p>ניהול שבועי · תפריט, קניות ומשימות הכנה</p></div><WeeklyLists /></section>
        <div hidden={lists}><RegistrationsAdmin /></div>
    </main>;
}
