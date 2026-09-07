import { useEffect, useState } from 'react';
import { Check, ImageIcon, MapPin, ShoppingBag } from 'lucide-react';
import Container from '../../components/Container/Container';
import { defaultSaleContent, formatPrice } from './arbaatHaminimData';
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
    const { sets, extras, fulfillmentOptions, heroImage, saleDetails, faq } = content;
    useEffect(() => {
        if (preview) return;
        const previousTitle = document.title;
        const description = document.querySelector('meta[name="description"]');
        const previousDescription = description?.getAttribute('content');
        document.title = `ארבעת המינים ${content.year} | בית חב״ד יפו`;
        description?.setAttribute('content', content.seoDescription);
        return () => {
            document.title = previousTitle;
            if (previousDescription !== null && previousDescription !== undefined) description?.setAttribute('content', previousDescription);
        };
    }, [content.year, content.seoDescription, preview]);
    const [setId, setSetId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [extraIds, setExtraIds] = useState<string[]>([]);
    const [fulfillment, setFulfillment] = useState(fulfillmentOptions[0].id);
    const selectedSet = sets.find(item => item.id === setId);
    const selectedExtras = extras.filter(item => extraIds.includes(item.id));
    const validQuantity = Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0;
    const subtotal = selectedSet?.price != null && validQuantity ? selectedSet.price * Number(quantity) : null;
    const total = subtotal !== null && selectedExtras.every(item => item.price !== null)
        ? subtotal + selectedExtras.reduce((sum, item) => sum + (item.price ?? 0), 0) : null;
    const toggleExtra = (id: string) => setExtraIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

    return (
        <main className={styles.page} dir="rtl">
            <Container>
                <section className={styles.hero} aria-labelledby="sale-title">
                    <div className={styles.heroContent}>
                        <p className={styles.eyebrow}>בית חב״ד יפו · סוכות {content.year}</p>
                        <h1 id="sale-title" className={styles.title}>ארבעת המינים {content.year}</h1>
                        <p className={styles.lead}>{content.heroSubtitle}</p>
                        <p className={styles.text}>מזמינים סט מראש או מגיעים ובוחרים בעצמכם במקום.</p>
                        <div className={styles.actions}>
                            <a className={styles.primary} href="#order">להזמנה מראש</a>
                            <a className={styles.secondary} href="#in-person">לפרטי המכירה במקום</a>
                        </div>
                    </div>
                    {heroImage ? <figure className={styles.heroFigure}><img className={styles.heroImage} src={heroImage.src} alt={heroImage.alt} fetchPriority="high" /><figcaption className={styles.imageDisclaimer}>תמונת המחשה</figcaption></figure> : <div className={styles.imagePlaceholder}><ImageIcon size={40} aria-hidden="true" /><span className={styles.imageCaption}>כאן תופיע תמונת ארבעת המינים</span></div>}
                </section>
                <p className={styles.notice}>ההזמנות והתשלום עדיין אינם פעילים. אפשר לעיין בפרטים ולהתנסות בבחירה.</p>
                <section className={styles.section} aria-labelledby="purchase-title">
                    <h2 id="purchase-title" className={styles.sectionTitle}>איך תרצו לרכוש?</h2>
                    <div className={styles.twoColumns}>
                        <article className={styles.card}><ShoppingBag aria-hidden="true" /><h3 className={styles.cardTitle}>הזמנה מראש</h3><p className={styles.text}>בוחרים את סוג הסט, משלימים הזמנה ומגיעים לאסוף.</p><a className={styles.primary} href="#sets">להזמנת סט</a></article>
                        <article className={styles.card}><MapPin aria-hidden="true" /><h3 className={styles.cardTitle}>מעדיפים לבחור בעצמכם?</h3><p className={styles.text}>מגיעים לבית חב״ד בשעות המכירה ובוחרים את ארבעת המינים במקום.</p><a className={styles.secondary} href="#in-person">לפרטי המכירה</a></article>
                    </div>
                </section>
                <section id="sets" className={styles.section} aria-labelledby="sets-title">
                    <h2 id="sets-title" className={styles.sectionTitle}>בוחרים את הסט שלכם</h2>
                    <p className={styles.intro}>{content.catalogIntro}</p>
                    <div className={styles.products}>{sets.map(item => <article key={item.id} className={`${styles.card} ${setId === item.id ? styles.selected : ''}`}>
                        <h3 className={styles.cardTitle}>{item.name}</h3><p className={styles.price}>{formatPrice(item.price)}</p><p className={styles.text}>{item.description}</p><p className={styles.text}>מה כלול בסט: {item.included}</p>
                        <button type="button" className={setId === item.id ? styles.primary : styles.secondary} aria-pressed={setId === item.id} onClick={() => setSetId(item.id)}>{setId === item.id && <Check size={18} aria-hidden="true" />}{setId === item.id ? `${item.name} נבחר` : `בחירת ${item.name}`}</button>
                    </article>)}</div>
                </section>
                <section className={styles.section} aria-labelledby="extras-title"><h2 id="extras-title" className={styles.sectionTitle}>תוספות להזמנה</h2><p className={styles.intro}>{content.extrasIntro}</p><div className={styles.extras}>{extras.map(item => <label key={item.id} className={`${styles.extra} ${extraIds.includes(item.id) ? styles.selected : ''}`}><input className={styles.checkbox} type="checkbox" checked={extraIds.includes(item.id)} onChange={() => toggleExtra(item.id)} /><span className={styles.extraName}>{item.name}</span><span className={styles.muted}>{formatPrice(item.price)}</span></label>)}</div></section>
                <section id="in-person" className={`${styles.section} ${styles.inPerson}`} aria-labelledby="visit-title"><p className={styles.eyebrow}>בוחרים במקום</p><h2 id="visit-title" className={styles.sectionTitle}>בואו לבחור את ארבעת המינים בעצמכם</h2><p className={styles.intro}>{content.visitIntro}</p><dl className={styles.details}>{saleDetails.map(detail => <div key={detail.label} className={styles.detail}><dt className={styles.detailLabel}>{detail.label}</dt><dd className={styles.detailValue}>{detail.value}</dd></div>)}</dl></section>
                <section id="order" className={styles.section} aria-labelledby="order-title"><h2 id="order-title" className={styles.sectionTitle}>הזמנה מראש</h2><p className={styles.intro}>אפשר להתנסות בבחירה ובמילוי הטופס. הפרטים אינם נשלחים ולא נשמרת הזמנה בשלב זה.</p>
                    <form className={styles.orderLayout} onSubmit={event => event.preventDefault()}>
                        <div className={styles.formFields}>
                            <label className={styles.field}>שם מלא<input className={styles.input} name="fullName" autoComplete="name" required /></label>
                            <label className={styles.field}>טלפון<input className={styles.input} name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required /></label>
                            <label className={styles.field}>סוג הסט<select className={styles.input} name="set" value={setId} onChange={event => setSetId(event.target.value)} required><option value="">בחרו סוג סט</option>{sets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                            <label className={styles.field}>כמות<input className={styles.input} name="quantity" type="number" inputMode="numeric" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required aria-describedby={!validQuantity ? 'quantity-error' : undefined} aria-invalid={!validQuantity} /></label>
                            {!validQuantity && <p id="quantity-error" className={styles.error}>יש להזין מספר שלם של סטים, לפחות 1.</p>}
                            <fieldset className={styles.fieldset}><legend className={styles.legend}>תוספות (לא חובה)</legend>{extras.map(item => <label key={item.id} className={styles.checkLabel}><input className={styles.checkbox} type="checkbox" name="extras" value={item.id} checked={extraIds.includes(item.id)} onChange={() => toggleExtra(item.id)} />{item.name}</label>)}</fieldset>
                            <label className={styles.field}>אופן קבלה<select className={styles.input} name="fulfillment" value={fulfillment} onChange={event => setFulfillment(event.target.value)}>{fulfillmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
                            <p className={styles.muted}>{fulfillmentOptions.find(option => option.id === fulfillment)?.details}</p>
                            <label className={styles.field}>הערה (לא חובה)<textarea className={styles.textarea} name="note" rows={3} /></label>
                        </div>
                        <aside className={styles.summary} aria-labelledby="summary-title"><h3 id="summary-title" className={styles.cardTitle}>סיכום ההזמנה</h3><dl className={styles.summaryDetails} aria-live="polite"><div className={styles.summaryRow}><dt className={styles.detailLabel}>סוג הסט</dt><dd className={styles.detailValue}>{selectedSet?.name ?? 'טרם נבחר סט'}</dd></div><div className={styles.summaryRow}><dt className={styles.detailLabel}>כמות</dt><dd className={styles.detailValue}>{validQuantity ? quantity : 'יש לעדכן כמות'}</dd></div><div className={styles.summaryRow}><dt className={styles.detailLabel}>תוספות</dt><dd className={styles.detailValue}>{selectedExtras.map(item => item.name).join(', ') || 'ללא תוספות'}</dd></div><div className={styles.summaryRow}><dt className={styles.detailLabel}>מחיר ביניים</dt><dd className={styles.detailValue}>{formatPrice(subtotal)}</dd></div><div className={`${styles.summaryRow} ${styles.total}`}><dt className={styles.detailLabel}>סה״כ</dt><dd className={styles.detailValue}>{formatPrice(total)}</dd></div></dl><p id="payment-notice" className={styles.notice}>התשלום ייפתח לאחר עדכון המחירים ופרטי המכירה. מילוי הטופס אינו שומר סט.</p><button className={styles.primary} type="submit" disabled aria-describedby="payment-notice">לתשלום והשלמת ההזמנה</button></aside>
                    </form>
                </section>
                <section className={styles.section} aria-labelledby="faq-title"><h2 id="faq-title" className={styles.sectionTitle}>שאלות נפוצות</h2><div className={styles.faq}>{faq.map(item => <details className={styles.faqItem} key={item.question}><summary className={styles.question}>{item.question}</summary><p className={styles.answer}>{item.answer}</p></details>)}</div></section>
            </Container>
        </main>
    );
}
