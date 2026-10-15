import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Container from '../../components/Container/Container';
import { registerShifraPua, shifraError } from '../../services/shifraPuaService';
import { israelToday, validPhone, type RegistrationInput } from '../../types/shifraPua';
import styles from './ShifraPua.module.scss';

const volunteerWhatsAppLink = `https://wa.me/972542193770?text=${encodeURIComponent('היי תמר, אשמח להצטרף להתנדבות בשפרה ופועה ולעזור בהכנת ארוחות הבוקר ליולדות ביפו ❤️')}`;

export default function ShifraPua() {
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const submitting = useRef(false);
    const successRef = useRef<HTMLDivElement>(null);
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RegistrationInput>({
        defaultValues: { filledBy: 'mother', consent: false, contactName: '', contactPhone: '', dietaryNotes: '' }, shouldUnregister: true,
    });
    const filledBy = useWatch({ control, name: 'filledBy' });
    useEffect(() => {
        const oldTitle = document.title;
        const description = 'ארוחת בוקר טרייה ליולדות ביפו, בכל יום רביעי וללא עלות. הרשמה לשפרה ופועה של בית חב״ד יפו והצטרפות להתנדבות.';
        const changes = [
            ['meta[name="description"]', 'content', description],
            ['link[rel="canonical"]', 'href', 'https://chabadyafo.org/shifra-pua'],
            ['meta[property="og:title"]', 'content', 'שפרה ופועה | בית חב״ד יפו'],
            ['meta[property="og:description"]', 'content', description],
            ['meta[property="og:url"]', 'content', 'https://chabadyafo.org/shifra-pua'],
        ].map(([selector, attribute, value]) => {
            const element = document.querySelector(selector);
            const previous = element?.getAttribute(attribute);
            element?.setAttribute(attribute, value);
            return () => { if (previous != null) element?.setAttribute(attribute, previous); };
        });
        document.title = 'שפרה ופועה — ארוחת בוקר ליולדת | בית חב״ד יפו';
        return () => { document.title = oldTitle; changes.forEach(restore => restore()); };
    }, []);
    useEffect(() => { if (success) successRef.current?.focus(); }, [success]);
    const submit = async (data: RegistrationInput) => {
        if (submitting.current || success) return;
        submitting.current = true; setError('');
        try {
            await registerShifraPua({ ...data, contactName: data.filledBy === 'other' ? data.contactName : '', contactPhone: data.filledBy === 'other' ? data.contactPhone : '', consent: data.filledBy === 'other' && data.consent });
            setSuccess(true);
        } catch (error) { setError(shifraError(error)); } finally { submitting.current = false; }
    };
    const fieldError = (name: keyof RegistrationInput) => errors[name] ? <span id={`${name}-error`} className={styles.error} role="alert">{errors[name]?.message}</span> : null;
    const accessibility = (name: keyof RegistrationInput) => ({ 'aria-required': name !== 'dietaryNotes', 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });
    return <main className={styles.page} dir="rtl"><Container>
        <section className={styles.hero}>
            <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>שפרה ופועה · בית חב״ד יפו</p>
            <h1>מזל טוב! ארוחת בוקר מפנקת בדרך <span className={styles.keepTogether}>אלייך ❤️</span></h1>
            <p>ילדת לאחרונה? בשפרה ופועה של בית חב״ד יפו נשמח לפנק אותך בארוחת בוקר טרייה וטעימה, שתגיע אלייך הביתה באהבה וללא עלות.</p>
            <div className={styles.heroActions}>
                <a className={styles.primary} href="#registration">לקבלת ארוחת בוקר</a>
                <a className={styles.secondary} href={volunteerWhatsAppLink} target="_blank" rel="noopener noreferrer">אני רוצה להתנדב</a>
            </div>
            <p className={styles.hint}>בכל יום רביעי בבוקר · ליולדות ביפו · ללא עלות</p>
            </div>
            <figure className={styles.heroVisual}>
                <img src="/shifra-pua/breakfast-hero.webp" srcSet="/shifra-pua/breakfast-hero-768.webp 768w, /shifra-pua/breakfast-hero.webp 1536w" sizes="(max-width: 800px) calc(100vw - 32px), (max-width: 1200px) 46vw, 540px" width={1536} height={1024} fetchPriority="high" alt="מארז ארוחת בוקר עם לחמניות, סלט ירקות, גבינה, ביצה ופירות — להמחשה" />
            </figure>
        </section>
        <div className={styles.actionCards}>
        <section className={styles.card} id="registration" aria-labelledby="registration-title">
            <h2 id="registration-title">נשמח לפנק אותך! <span className={styles.formTitleDetail}>נשאר רק למלא כמה פרטים</span></h2>
            {success ? <div ref={successRef} tabIndex={-1} className={styles.success} role="status">קיבלנו את הפרטים! ניצור איתך קשר לתיאום ארוחת הבוקר. בשעה טובה והמון מזל טוב! ❤️</div> : <>
                <p className={styles.formIntro}>השדות המסומנים בכוכבית הם חובה. הפרטים ישמשו לתיאום הפעילות ויהיו זמינים לצוות הניהול המורשה בלבד.</p>
                <form onSubmit={event => { void handleSubmit(submit)(event); }} noValidate aria-busy={isSubmitting}>
                    <fieldset disabled={isSubmitting} className={styles.fields}>
                        <legend className={styles.srOnly}>פרטי ההרשמה</legend>
                        <label>שם היולדת *<input autoComplete="name" maxLength={120} {...register('motherName', { required: 'הזיני את שם היולדת', validate: value => Boolean(value.trim()) || 'הזיני את שם היולדת', maxLength: 120 })} {...accessibility('motherName')} />{fieldError('motherName')}</label>
                        <label>מספר טלפון *<input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={30} {...register('phone', { required: 'הזיני מספר טלפון', validate: value => validPhone(value) || 'הזיני מספר טלפון ישראלי תקין' })} {...accessibility('phone')} />{fieldError('phone')}</label>
                        <label className={styles.full}>כתובת ביפו *<input autoComplete="street-address" maxLength={300} placeholder="רחוב, מספר בית, דירה וקומה" {...register('address', { required: 'הזיני כתובת ביפו', validate: value => Boolean(value.trim()) || 'הזיני כתובת ביפו', maxLength: 300 })} {...accessibility('address')} />{fieldError('address')}</label>
                        <label>תאריך הלידה *<input type="date" min="1900-01-01" max={israelToday()} {...register('birthDate', { required: 'בחרי תאריך לידה', validate: value => (value >= '1900-01-01' && value <= israelToday()) || 'בחרי תאריך לידה תקין שאינו בעתיד' })} {...accessibility('birthDate')} />{fieldError('birthDate')}</label>
                        <label>מי ממלאת את הטופס? *<select aria-required="true" {...register('filledBy', { required: true })}><option value="mother">היולדת עצמה</option><option value="other">חברה או בת משפחה</option></select></label>
                        {filledBy === 'other' && <>
                            <label>שם הפונה *<input maxLength={120} autoComplete="off" {...register('contactName', { required: 'הזיני את שמך', validate: value => Boolean(value.trim()) || 'הזיני את שמך', maxLength: 120 })} {...accessibility('contactName')} />{fieldError('contactName')}</label>
                            <label>טלפון הפונה *<input type="tel" inputMode="tel" dir="ltr" maxLength={30} autoComplete="off" {...register('contactPhone', { required: 'הזיני את הטלפון שלך', validate: value => validPhone(value) || 'הזיני מספר טלפון ישראלי תקין' })} {...accessibility('contactPhone')} />{fieldError('contactPhone')}</label>
                            <div className={styles.full}><p>יש לקבל את הסכמת היולדת לפני מסירת פרטיה.</p><label className={styles.consent}><input type="checkbox" {...register('consent', { required: 'נדרש אישור להסכמת היולדת' })} {...accessibility('consent')} />קיבלתי את הסכמת היולדת למסירת פרטיה לצורך תיאום ארוחת הבוקר *</label>{fieldError('consent')}</div>
                        </>}
                        <label className={styles.full}><span>רגישויות למזון או בקשות מיוחדות <span className={`${styles.hint} ${styles.keepTogether}`}>(לא חובה)</span></span><textarea rows={3} maxLength={2000} {...register('dietaryNotes', { maxLength: 2000 })} {...accessibility('dietaryNotes')} />{fieldError('dietaryNotes')}</label>
                        {error && <p className={`${styles.error} ${styles.full}`} role="alert">{error}</p>}
                        <button className={`${styles.primary} ${styles.full}`} type="submit">{isSubmitting ? 'שולחות את הפרטים…' : 'הרשמה לקבלת ארוחה'}</button>
                    </fieldset>
                    <p className={styles.privacy}>הפרטים ישמשו לתיאום ארוחת הבוקר בלבד ולא יפורסמו.</p>
                </form>
            </>}
        </section>
        <section className={styles.volunteer} id="volunteer" aria-labelledby="volunteer-title"><h2 id="volunteer-title">רוצה להצטרף להכנות?</h2><p>בכל יום רביעי בבוקר אנחנו נפגשות להכין ולארוז ארוחות בוקר ליולדות ביפו. נשמח לעוד ידיים עוזרות, גם אם את פנויה רק מדי פעם.</p><a className={styles.secondary} href={volunteerWhatsAppLink} target="_blank" rel="noopener noreferrer">אני רוצה להתנדב</a><p className={styles.hint}>תיפתח הודעת וואטסאפ מוכנה לשליחה</p></section>
        </div>
    </Container></main>;
}
