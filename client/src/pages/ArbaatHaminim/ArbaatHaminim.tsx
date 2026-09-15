import { useEffect, useState } from 'react';
import Container from '../../components/Container/Container';
import { defaultSaleContent } from './arbaatHaminimData';
import { getPublicSale } from '../../services/arbaatHaminimService';
import type { SaleContent } from '../../types/arbaatHaminim';
import styles from './ArbaatHaminim.module.scss';

export default function ArbaatHaminim() {
    const [content, setContent] = useState<SaleContent | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        getPublicSale().then(data => { if (active) setContent(data ?? defaultSaleContent); })
            .catch(() => { if (active) { setFailed(true); if (import.meta.env.DEV) setContent(defaultSaleContent); } });
        return () => { active = false; };
    }, []);
    if (!content) return <Container><p className={styles.notice} role="status">{failed ? 'פרטי המכירה אינם זמינים כרגע. נסו לרענן בהמשך.' : 'טוענים את פרטי המכירה…'}</p></Container>;
    return <>{failed && <Container><p className={styles.notice}>תצוגת פיתוח מקומית — אין חיבור לנתוני האדמין.</p></Container>}<ArbaatHaminimContent content={content} /></>;
}

export function ArbaatHaminimContent({ content, preview = false }: { content: SaleContent; preview?: boolean }) {
    const { sets, extras, heroImage } = content;
    useEffect(() => {
        if (preview) return;
        const previousTitle = document.title;
        const description = document.querySelector('meta[name="description"]');
        const previousDescription = description?.getAttribute('content');
        document.title = `ארבעת המינים ${content.year} | בית חב״ד יפו`;
        description?.setAttribute('content', content.seoDescription);
        return () => {
            document.title = previousTitle;
            if (previousDescription != null) description?.setAttribute('content', previousDescription);
        };
    }, [content.year, content.seoDescription, preview]);
    const [setId, setSetId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [extraIds, setExtraIds] = useState<string[]>([]);
    const [formError, setFormError] = useState('');
    const selectedSet = sets.find(item => item.id === setId);
    const selectedExtras = extras.filter(item => extraIds.includes(item.id));
    const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0;
    const toggleExtra = (id: string) => setExtraIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    const sendToWhatsApp = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedSet || !validQuantity) {
            setFormError('בחרו סט וכמות כדי להמשיך.');
            return;
        }
        setFormError('');
        const message = [
            `שלום לבית חב״ד יפו, אשמח להזמין ארבעת המינים ${content.year}:`,
            `סוג הסט: ${selectedSet.name}`,
            `כמות סטים: ${quantity}`,
            ...(selectedExtras.length ? [`תוספות (יחידה אחת מכל תוספת להזמנה): ${selectedExtras.map(item => item.name).join(', ')}`] : []),
            'אשמח לקבל פרטי מחיר וזמינות ולתאם איסוף.',
        ].join('\n');
        window.location.assign(`https://wa.me/972537700339?text=${encodeURIComponent(message)}`);
    };

    return (
        <main className={styles.page} dir="rtl">
            <Container>
                <div className={styles.saleLayout}>
                    <header className={styles.heroContent}>
                        <p className={styles.eyebrow}>בית חב״ד יפו</p>
                        <h1 className={styles.title}>ארבעת המינים {content.year}</h1>
                        <p className={styles.text}>בוחרים סט, וממשיכים איתנו ב־WhatsApp.</p>
                        {heroImage && <figure className={styles.heroFigure}>
                            <img className={styles.heroImage} src={heroImage.src} alt={heroImage.alt} fetchPriority="high" />
                            <figcaption className={styles.imageDisclaimer}>תמונת המחשה</figcaption>
                        </figure>}
                    </header>
                    <form id="order" className={styles.purchaseForm} onSubmit={sendToWhatsApp}>
                        <fieldset className={styles.setChoices}>
                            <legend className={styles.legend}>איזה סט תרצו?</legend>
                            {sets.map(item => <label key={item.id} className={`${styles.setChoice} ${setId === item.id ? styles.selected : ''}`}>
                                <input className={styles.checkbox} type="radio" name="set" value={item.id} checked={setId === item.id} onChange={() => setSetId(item.id)} required />
                                <span className={styles.choiceContent}>
                                    <span className={styles.choiceName}>{item.name}</span>
                                    {item.description && item.description !== 'תיאור הסט יעודכן בהמשך.' && <span className={styles.text}>{item.description}</span>}
                                    {item.included && item.included !== 'פירוט תכולת הסט יעודכן בהמשך.' && <span className={styles.text}>{item.included}</span>}
                                </span>
                            </label>)}
                        </fieldset>
                        <label className={styles.quantityRow}>כמה סטים?
                            <input className={styles.input} name="quantity" aria-label="כמות סטים" type="number" inputMode="numeric" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required aria-invalid={!validQuantity} />
                        </label>
                        {extras.length > 0 && <details className={styles.optionalExtras}>
                            <summary className={styles.question}>הוספת תוספות{selectedExtras.length > 0 ? ` (${selectedExtras.length} נבחרו)` : ' (לא חובה)'}</summary>
                            <div className={styles.extras}>
                                {extras.map(item => <label key={item.id} className={styles.extra}>
                                    <input className={styles.checkbox} type="checkbox" checked={extraIds.includes(item.id)} onChange={() => toggleExtra(item.id)} />
                                    <span className={styles.choiceName}>{item.name}</span>
                                </label>)}
                            </div>
                        </details>}
                        {formError && <p className={styles.error} role="alert">{formError}</p>}
                        <button className={styles.primary} type="submit" aria-describedby="whatsapp-notice">להמשך ב־WhatsApp</button>
                        <p id="whatsapp-notice" className={styles.hint}>תיפתח הודעה עם הבחירה שלכם. מחיר ואיסוף נתאם בשיחה.</p>
                    </form>
                </div>
            </Container>
        </main>
    );
}
