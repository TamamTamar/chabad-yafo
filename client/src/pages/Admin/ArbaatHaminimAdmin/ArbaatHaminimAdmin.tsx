import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Container from '../../../components/Container/Container';
import { defaultSaleContent } from '../../ArbaatHaminim/arbaatHaminimData';
import { ArbaatHaminimContent } from '../../ArbaatHaminim/ArbaatHaminim';
import { getSaleSeasons, publishSaleSeason, saveSaleSeason } from '../../../services/arbaatHaminimService';
import type { SaleContent, SalePublication, SaleSeason } from '../../../types/arbaatHaminim';
import SaleCollectionEditor from './SaleCollectionEditor';
import styles from './ArbaatHaminimAdmin.module.scss';

const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message ?? 'הפעולה נכשלה. בדקו חיבור ונסו שוב.' : 'הפעולה נכשלה. נסו שוב.';
const newId = () => crypto.randomUUID();

export default function ArbaatHaminimAdmin() {
    const [seasons, setSeasons] = useState<SaleSeason[]>([]);
    const [publication, setPublication] = useState<SalePublication | null>(null);
    const [season, setSeason] = useState<SaleSeason>();
    const [content, setContent] = useState<SaleContent>(structuredClone(defaultSaleContent));
    const [busy, setBusy] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(false);
    const [newYear, setNewYear] = useState('');
    const dirty = !season || JSON.stringify(content) !== JSON.stringify(season.content);
    const update = <K extends keyof SaleContent>(key: K, value: SaleContent[K]) => { setContent(current => ({ ...current, [key]: value })); setMessage(''); };

    useEffect(() => {
        let active = true;
        getSaleSeasons().then(data => {
            if (!active) return;
            setSeasons(data.seasons); setPublication(data.publication); setLoaded(true);
            const first = data.seasons.find(item => item._id === data.publication?.seasonId) ?? data.seasons[0];
            if (first) { setSeason(first); setContent(structuredClone(first.content)); }
        }).catch(error => { if (active) setError(errorMessage(error)); }).finally(() => { if (active) setBusy(false); });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const save = async () => {
        setBusy(true); setError(''); setMessage('');
        try {
            const saved = await saveSaleSeason(content, season);
            setSeason(saved); setContent(structuredClone(saved.content));
            setSeasons(current => [saved, ...current.filter(item => item._id !== saved._id)]);
            setMessage('הטיוטה נשמרה. התוכן באתר לא השתנה.');
        } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
    };
    const publish = async () => {
        if (!season || dirty) return;
        setBusy(true); setError(''); setMessage('');
        try { setPublication(await publishSaleSeason(season)); setMessage(`עונת ${content.year} מוצגת כעת באתר. ההזמנות והתשלום עדיין מושבתים.`); }
        catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
    };
    const duplicate = () => {
        if (!newYear.trim()) return;
        const next = structuredClone(content);
        next.year = newYear.trim();
        next.sets = next.sets.map(item => ({ ...item, price: null }));
        next.extras = next.extras.map(item => ({ ...item, price: null }));
        next.saleDetails = defaultSaleContent.saleDetails.map(item => ({ ...item }));
        next.fulfillmentOptions = defaultSaleContent.fulfillmentOptions.map(item => ({ ...item }));
        next.faq = defaultSaleContent.faq.map(item => ({ ...item }));
        next.seoDescription = defaultSaleContent.seoDescription;
        setSeason(undefined); setContent(next); setNewYear(''); setPreview(false);
        setMessage('נוצרה טיוטה מקומית לעונה חדשה. המחירים, פרטי המכירה, האיסוף והשאלות אופסו. יש לבדוק גם את תיאורי הסטים והטקסטים שהועתקו לפני השמירה.');
    };
    return <main className={styles.page} dir="rtl"><Container>
        <Link className={styles.back} to="/admin/dashboard">חזרה לניהול האתר</Link>
        <h1 className={styles.title}>ניהול ארבעת המינים</h1>
        <p className={styles.intro}>שומרים טיוטה, בודקים תצוגה מקדימה ומפרסמים את העונה הרצויה. עונות קודמות נשמרות. פרסום תוכן אינו מפעיל הזמנות או סליקה.</p>
        <p className={styles.status}>באתר: {publication ? `עונת ${publication.content.year}` : 'עדיין לא פורסמה עונה'} · בעריכה: {content.year}{dirty ? ' · שינויים שלא נשמרו' : ' · הטיוטה שמורה'}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.status} role="status">{message}</p>}
        {!loaded ? <p className={styles.intro}>{busy ? 'טוענים עונות…' : 'לא ניתן לטעון עונות. יש לרענן כדי לנסות שוב.'}</p> : <>
            <div className={styles.toolbar}>
                <label className={styles.field}>בחירת עונה שמורה<select className={styles.input} disabled={busy || dirty} value={season?._id ?? ''} onChange={event => { const selected = seasons.find(item => item._id === event.target.value); if (selected) { setSeason(selected); setContent(structuredClone(selected.content)); setMessage(''); setError(''); } }}><option value="" disabled>עונה חדשה</option>{seasons.map(item => <option key={item._id} value={item._id}>{item.content.year}{publication?.seasonId === item._id ? ' — מוצגת באתר' : ''}</option>)}</select></label>
                {season && dirty && <button className={styles.secondary} type="button" disabled={busy} onClick={() => setContent(structuredClone(season.content))}>ביטול השינויים בטיוטה</button>}
                <label className={styles.field}>שנה לעונה חדשה<input className={styles.input} value={newYear} onChange={event => setNewYear(event.target.value)} maxLength={30} placeholder="הזינו את השנה הרצויה" /></label>
                <button className={styles.secondary} type="button" disabled={busy || !newYear.trim() || (Boolean(season) && dirty)} onClick={duplicate}>שכפול לעונה חדשה</button>
            </div>
            <form onSubmit={event => { event.preventDefault(); void save(); }}>
                <fieldset className={styles.editor} disabled={busy}>
                    <section className={styles.panel}><h2 className={styles.sectionTitle}>פתיח ותוכן כללי</h2>
                        {([
                            ['year', 'שנה / עונה'], ['heroSubtitle', 'כותרת משנה בפתיח'], ['seoDescription', 'תיאור למנועי חיפוש'],
                            ['catalogIntro', 'פתיח לסוגי הסטים'], ['extrasIntro', 'הסבר לתוספות'], ['visitIntro', 'טקסט למכירה במקום'],
                        ] as const).map(([key, label]) => <label className={styles.field} key={key}>{label}<textarea className={styles.input} rows={key === 'year' ? 1 : 2} value={content[key]} onChange={event => update(key, event.target.value)} maxLength={key === 'year' ? 30 : key === 'heroSubtitle' ? 300 : key === 'seoDescription' ? 500 : 2000} required /></label>)}
                    </section>
                    <section className={styles.panel}><h2 className={styles.sectionTitle}>תמונת Hero</h2><p className={styles.intro}>התמונה הייעודית כבר מוגדרת. ניתן להחליף בנתיב תמונה מהאתר או בקישור HTTPS לתמונה.</p><label className={styles.field}>נתיב / קישור תמונה<input className={styles.input} value={content.heroImage?.src ?? ''} maxLength={1000} onChange={event => update('heroImage', event.target.value ? { src: event.target.value, alt: content.heroImage?.alt ?? 'ארבעת המינים — תמונת המחשה' } : null)} /></label>{content.heroImage && <label className={styles.field}>תיאור נגיש לתמונה<input className={styles.input} value={content.heroImage.alt} maxLength={300} required onChange={event => update('heroImage', { ...content.heroImage!, alt: event.target.value })} /></label>}</section>
                    <SaleCollectionEditor title="סטים" rows={content.sets} min={1} onChange={rows => update('sets', rows)} createRow={() => ({ id: newId(), name: '', price: null, description: '', included: '' })} fields={[{ key: 'name', label: 'שם הסט' }, { key: 'price', label: 'מחיר בש״ח (אפשר להשאיר ריק)', type: 'price' }, { key: 'description', label: 'תיאור', type: 'textarea' }, { key: 'included', label: 'מה כלול בסט', type: 'textarea' }]} />
                    <SaleCollectionEditor title="תוספות" rows={content.extras} onChange={rows => update('extras', rows)} createRow={() => ({ id: newId(), name: '', price: null })} fields={[{ key: 'name', label: 'שם התוספת' }, { key: 'price', label: 'מחיר בש״ח (אפשר להשאיר ריק)', type: 'price' }]} />
                    <SaleCollectionEditor title="אפשרויות קבלה" rows={content.fulfillmentOptions} min={1} onChange={rows => update('fulfillmentOptions', rows)} createRow={() => ({ id: newId(), name: '', details: '' })} fields={[{ key: 'name', label: 'שם האפשרות' }, { key: 'details', label: 'פרטי איסוף / קבלה', type: 'textarea' }]} />
                    <SaleCollectionEditor title="פרטי מכירה במקום" rows={content.saleDetails} onChange={rows => update('saleDetails', rows)} createRow={() => ({ label: '', value: '' })} fields={[{ key: 'label', label: 'כותרת (למשל שעות)' }, { key: 'value', label: 'פרטים', type: 'textarea' }]} />
                    <SaleCollectionEditor title="שאלות נפוצות" rows={content.faq} onChange={rows => update('faq', rows)} createRow={() => ({ question: '', answer: '' })} fields={[{ key: 'question', label: 'שאלה' }, { key: 'answer', label: 'תשובה', type: 'textarea' }]} />
                    <div className={styles.actions}>
                        <button className={styles.primary} type="submit" disabled={!dirty}>שמירת טיוטה</button>
                        <button className={styles.secondary} type="button" onClick={() => setPreview(current => !current)}>{preview ? 'סגירת תצוגה מקדימה' : 'תצוגה מקדימה'}</button>
                        <button className={styles.primary} type="button" disabled={dirty || !season || (publication?.seasonId === season._id && publication.revision === season.revision)} onClick={() => void publish()}>פרסום עונה זו באתר</button>
                    </div>
                    <p className={styles.intro}>הפרסום מחליף את העונה שמוצגת ב־/arbaat-haminim. יש לשמור את הטיוטה לפני פרסום.</p>
                </fieldset>
            </form>
            {preview && <section className={styles.preview} aria-label="תצוגה מקדימה"><h2 className={styles.sectionTitle}>תצוגה מקדימה — {content.year}</h2><ArbaatHaminimContent key={JSON.stringify(content)} content={content} preview /></section>}
        </>}
    </Container></main>;
}
