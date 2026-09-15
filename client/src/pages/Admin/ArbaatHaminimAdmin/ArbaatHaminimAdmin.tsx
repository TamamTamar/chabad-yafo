import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Container from '../../../components/Container/Container';
import { defaultSaleContent } from '../../ArbaatHaminim/arbaatHaminimData';
import { ArbaatHaminimContent } from '../../ArbaatHaminim/ArbaatHaminim';
import { getSaleSettings, saveSaleSettings } from '../../../services/arbaatHaminimService';
import type { SaleContent, SaleSettings } from '../../../types/arbaatHaminim';
import SaleCollectionEditor from './SaleCollectionEditor';
import styles from './ArbaatHaminimAdmin.module.scss';

const errorMessage = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message ?? 'הפעולה נכשלה. בדקו חיבור ונסו שוב.' : 'הפעולה נכשלה. נסו שוב.';
const newId = () => crypto.randomUUID();

export default function ArbaatHaminimAdmin() {
    const [savedSettings, setSavedSettings] = useState<SaleSettings | null>(null);
    const [content, setContent] = useState<SaleContent>(structuredClone(defaultSaleContent));
    const [busy, setBusy] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(false);
    const dirty = !savedSettings || JSON.stringify(content) !== JSON.stringify(savedSettings.content);
    const update = <K extends keyof SaleContent>(key: K, value: SaleContent[K]) => { setContent(current => ({ ...current, [key]: value })); setMessage(''); };

    useEffect(() => {
        let active = true;
        getSaleSettings().then(data => {
            if (!active) return;
            setSavedSettings(data); setLoaded(true);
            if (data) setContent(structuredClone(data.content));
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
            const saved = await saveSaleSettings(content, savedSettings?.revision ?? null);
            setSavedSettings(saved); setContent(structuredClone(saved.content));
            setMessage('פרטי המכירה נשמרו ועודכנו באתר.');
        } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
    };
    return <main className={styles.page} dir="rtl"><Container>
        <Link className={styles.back} to="/admin/dashboard">חזרה לניהול האתר</Link>
        <h1 className={styles.title}>ניהול מכירת ארבעת המינים</h1>
        <p className={styles.intro}>מכירת ארבעת המינים מתקיימת פעם בשנה, לקראת סוכות. כאן מעדכנים את השנה, הסטים, המחירים ומועדי המכירה והאיסוף. בשנה הבאה מעדכנים את אותם הפרטים במסך הזה.</p>
        <p className={styles.status}>{dirty ? 'יש שינויים שטרם נשמרו' : 'כל השינויים שמורים'}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.status} role="status">{message}</p>}
        {!loaded ? <p className={styles.intro}>{busy ? 'טוענים את פרטי המכירה…' : 'לא ניתן לטעון את פרטי המכירה. יש לרענן כדי לנסות שוב.'}</p> : <>
            <form onSubmit={event => { event.preventDefault(); void save(); }}>
                <fieldset className={styles.editor} disabled={busy}>
                    <section className={styles.panel}><h2 className={styles.sectionTitle}>פתיח ותוכן כללי</h2>
                        {([
                            ['year', 'שנת המכירה'], ['heroSubtitle', 'כותרת משנה בפתיח'], ['seoDescription', 'תיאור למנועי חיפוש'],
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
                        <button className={styles.primary} type="submit" disabled={!dirty}>שמירת שינויים באתר</button>
                        <button className={styles.secondary} type="button" onClick={() => setPreview(current => !current)}>{preview ? 'סגירת תצוגה מקדימה' : 'תצוגה מקדימה'}</button>
                    </div>
                    <p className={styles.intro}>השמירה מעדכנת את פרטי המכירה בעמוד האתר. הלקוחות שולחים את הבחירה ב־WhatsApp. מחירים אינם מוצגים בעמוד כרגע.</p>
                </fieldset>
            </form>
            {preview && <section className={styles.preview} aria-label="תצוגה מקדימה"><h2 className={styles.sectionTitle}>תצוגה מקדימה — {content.year}</h2><ArbaatHaminimContent key={JSON.stringify(content)} content={content} preview /></section>}
        </>}
    </Container></main>;
}
