import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { auctionDate, auctionMoney, auctionStatus, initializeAuction, israelDateInput, manageAuction, type AuctionState } from '../../../services/maftirYonaService';
import { useAuction } from '../../MaftirYona/useAuction';
import styles from '../../MaftirYona/MaftirYona.module.scss';

type SettingsProps = { data: AuctionState; busy: boolean; save: (values: Record<string, unknown>) => Promise<void> };
function Settings({ data, busy, save }: SettingsProps) {
    const [form, setForm] = useState({ openingPrice: String(data.openingPrice), minimumIncrement: String(data.minimumIncrement), endsAtIsrael: israelDateInput(data.endsAt) });
    const [revision] = useState(data.revision);
    function submit(event: FormEvent) { event.preventDefault(); void save({ action: 'settings', openingPrice: Number(form.openingPrice), minimumIncrement: Number(form.minimumIncrement), endsAtIsrael: form.endsAtIsrael, revision: revision }); }
    return <form className={styles.form} onSubmit={submit}>
        <div className={styles.fields}>{(['openingPrice', 'minimumIncrement', 'endsAtIsrael'] as const).map((key, index) => <label className={styles.field} key={key}><span className={styles.label}>{['מחיר פתיחה (₪)', 'תוספת מינימלית (₪)', 'מועד סיום לפי שעון ישראל'][index]}</span><input className={styles.input} required type={key === 'endsAtIsrael' ? 'datetime-local' : 'number'} min={key === 'endsAtIsrael' ? undefined : 1} max={key === 'endsAtIsrael' ? undefined : 1000000000} step={key === 'endsAtIsrael' ? 60 : 1} value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}</div>
        {revision !== data.revision && <p className={styles.error}>המכירה עודכנה. רעננו את שדות ההגדרות לפני שמירה כדי למנוע דריסת שינוי.</p>}
        <button className={styles.primary} disabled={busy || revision !== data.revision} type="submit">שמירת הגדרות</button>
    </form>;
}
export default function MaftirYonaAdmin() {
    const { data, accept, refresh, error } = useAuction(true);
    const [confirmation, setConfirmation] = useState<{ message: string; values: Record<string, unknown> } | null>(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [settingsKey, setSettingsKey] = useState(0);
    const [minutes, setMinutes] = useState('10');
    const lock = useRef(false);
    async function act(values: Record<string, unknown>) {
        if (!data || lock.current) return;
        lock.current = true; setBusy(true); setMessage('');
        try { accept(await manageAuction({ revision: data.revision, ...values })); setSettingsKey(key => key + 1); setMessage('הפעולה נשמרה בהצלחה.'); }
        catch (failure) { setMessage(axios.isAxiosError(failure) ? failure.response?.data?.message ?? 'לא ניתן לשמור כרגע.' : 'לא ניתן לשמור כרגע.'); try { await refresh(); } catch { /* polling retries */ } }
        finally { lock.current = false; setBusy(false); }
    }
    async function initialize() {
        if (lock.current) return; lock.current = true; setBusy(true);
        try { accept(await initializeAuction()); } catch { setMessage('יצירת המכירה נכשלה. בדקו את חיבור מסד הנתונים.'); }
        finally { lock.current = false; setBusy(false); }
    }
    async function copyWinner() {
        // Read again before copying; an invalidation may have changed the winner.
        try {
            const latest = await refresh();
            const winner = latest.winner;
            if (latest.status !== 'ended' || !winner) { setMessage('אין זוכה סופי להעתקה.'); return; }
            await navigator.clipboard.writeText(`מכירת זכות מפטיר יונה\nשם: ${winner.firstName} ${winner.lastName}\nטלפון: ${winner.phone}\nסכום לתשלום: ${auctionMoney(winner.amount)}`);
            setMessage('פרטי הזוכה והסכום הועתקו.');
        } catch { setMessage('ההעתקה נכשלה. אפשר להעתיק ידנית את הפרטים המוצגים.'); }
    }
    return <main className={`${styles.page} ${styles.adminPage}`} dir="rtl" lang="he">
        <Link className={styles.secondary} to="/admin/dashboard">חזרה לניהול האתר</Link>
        <h1 className={styles.title}>ניהול מכירת מפטיר יונה</h1>
        <Link className={styles.secondary} to="/maftir-yona">צפייה בעמוד הציבורי</Link>
        {(message || error) && <p className={styles.note} role="status">{message || error}</p>}
        {!data ? <p className={styles.note}>טוען…</p> : !data.initialized ? <section className={styles.card}><h2 className={styles.sectionTitle}>יצירת המכירה</h2><p className={styles.note}>מחיר פתיחה: 1,800 ₪. תוספת מינימלית: 180 ₪. סיום: {auctionDate(data.endsAt)} לפי שעון ישראל. לאחר היצירה יש לפתוח את המכירה בנפרד.</p><button className={styles.primary} disabled={busy} onClick={() => void initialize()}>יצירת מכירה נפרדת</button></section> : <>
            <section className={styles.card}>
                <h2 className={styles.sectionTitle}>{auctionStatus[data.status]}</h2>
                <p className={styles.note}>הסכום המוביל: {data.leadingBid ? auctionMoney(data.leadingBid.amount) : 'אין הצעות'} · {data.leadingBid?.name}</p>
                <p className={styles.note}>סיום: {auctionDate(data.endsAt)} · שעון ישראל</p>
                <div className={styles.actions}>
                    <button className={styles.primary} disabled={busy || data.status === 'ended' || data.status === 'open'} onClick={() => void act({ action: 'open' })}>פתיחת המכירה</button>
                    <button className={styles.secondary} disabled={busy || data.status !== 'open'} onClick={() => void act({ action: 'pause' })}>עצירה זמנית</button>
                    <button className={styles.secondary} disabled={busy || data.status === 'ended'} onClick={() => { setConfirmation({ message: 'לסגור את המכירה כעת ולקבוע זוכה? לא ניתן לפתוח מחדש.', values: { action: 'close', revision: data.revision } }); }}>סגירת המכירה</button>
                </div>
                <form className={styles.actions} onSubmit={event => { event.preventDefault(); void act({ action: 'extend', minutes: Number(minutes) }); }}><label className={styles.field}><span className={styles.label}>הארכה בדקות</span><input className={styles.input} type="number" min="1" max="525600" step="1" required value={minutes} onChange={event => setMinutes(event.target.value)} /></label><button className={styles.secondary} disabled={busy || data.status === 'ended'} type="submit">הארכת המכירה</button></form>
                <Settings key={settingsKey} data={data} busy={busy || data.status === 'ended'} save={act} />
                <button className={styles.secondary} type="button" disabled={busy} onClick={() => setSettingsKey(key => key + 1)}>רענון שדות ההגדרות</button>
            </section>
            {data.status === 'ended' && <section className={styles.card}>
                <h2 className={styles.sectionTitle}>פרטי הזוכה והתשלום</h2>
                {data.winner ? <><p className={styles.text}>{data.winner.firstName} {data.winner.lastName} · <bdi className={styles.phone} dir="ltr">{data.winner.phone}</bdi> · {auctionMoney(data.winner.amount)}</p><button className={styles.primary} onClick={() => void copyWinner()}>העתקת פרטי הזוכה והסכום לתשלום</button></> : <p className={styles.note}>המכירה הסתיימה ללא הצעות פעילות.</p>}
                <p className={styles.note}>הסליקה הקיימת בנדרים פלוס פועלת בטופס תשלום מוטמע ואינה יוצרת קישור אישי לשיתוף. ליצירת קישור אוטומטי נדרש חיבור מתועד של נדרים פלוס לקישור אישי. ניתן להעביר לזוכה את הפרטים ולהסדיר תשלום בנפרד. אין חיבור ל־Cardcom.</p>
            </section>}
            <section className={styles.card}>
                <h2 className={styles.sectionTitle}>כל ההצעות ({data.bids.length})</h2>
                <ul className={styles.bidList}>{data.bids.map(bid => <li className={styles.bid} key={bid.id}>
                    <div className={styles.bidHeading}><strong className={styles.bidAmount}>{auctionMoney(bid.amount)}</strong><span className={styles.status}>{bid.status === 'invalid' ? 'פסולה' : bid.id === data.leadingBid?.id ? 'הצעה מובילה' : 'פעילה'}</span></div>
                    <p className={styles.text}>{bid.firstName} {bid.lastName} · <bdi className={styles.phone} dir="ltr">{bid.phone}</bdi></p>
                    <time className={styles.note} dateTime={bid.receivedAt}>{auctionDate(bid.receivedAt)}</time>
                    <div className={styles.actions}><button className={styles.secondary} disabled={busy || bid.status === 'invalid'} onClick={() => { setConfirmation({ message: `לפסול את הצעת ${bid.firstName} ${bid.lastName} בסך ${auctionMoney(bid.amount)}? ההצעה המובילה והזוכה יחושבו מחדש.`, values: { action: 'invalidate', bidId: bid.id, revision: data.revision } }); }}>פסילת הצעה</button></div>
                </li>)}</ul>
            </section>
        </>}
        <ConfirmDialog open={Boolean(confirmation)} title="אישור פעולת ניהול" message={confirmation?.message ?? ''} tone="danger" busy={busy} onConfirm={() => { if (confirmation) void act(confirmation.values).then(() => setConfirmation(null)); }} onClose={() => { if (!busy) setConfirmation(null); }} />
    </main>;
}
