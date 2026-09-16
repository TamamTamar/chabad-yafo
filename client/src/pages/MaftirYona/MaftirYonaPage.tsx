import { ArrowDown, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { auctionMoney, auctionStatus, sendAuctionBid, type BidInput } from '../../services/maftirYonaService';
import { useAuction } from './useAuction';
import styles from './MaftirYona.module.scss';

function auctionEndDate(value: string) {
    const date = new Date(value);
    const timeZone = 'Asia/Jerusalem';
    const weekday = new Intl.DateTimeFormat('he-IL', { timeZone, weekday: 'long' }).format(date);
    const calendarDate = new Intl.DateTimeFormat('he-IL', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('he-IL', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return `המכירה תסתיים ב${weekday}, ${calendarDate} בשעה ${time}`;
}

const recentBidTime = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

type BidFormValues = Omit<BidInput, 'amount' | 'revision' | 'requestId'> & { amount: string };

export default function MaftirYonaPage() {
    const { data, accept, refresh, error, remaining, fresh } = useAuction();
    const { register, handleSubmit, control, setValue, resetField, formState: { errors } } = useForm<BidFormValues>({
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: { firstName: '', lastName: '', phone: '', amount: '', accepted: false },
    });
    const selectedAmount = useWatch({ control, name: 'amount' });
    const [confirmation, setConfirmation] = useState<BidInput | null>(null);
    const [notice, setNotice] = useState('');
    const [acceptedId, setAcceptedId] = useState('');
    const [busy, setBusy] = useState(false);
    const sending = useRef(false);
    const offerSection = useRef<HTMLElement | null>(null);
    const [offerVisible, setOfferVisible] = useState(false);
    const hasData = Boolean(data);
    useEffect(() => {
        const section = offerSection.current;
        if (!section) return;
        const observer = new IntersectionObserver(([entry]) => setOfferVisible(entry.isIntersecting));
        observer.observe(section);
        return () => observer.disconnect();
    }, [hasData]);
    const [pending, setPending] = useState<BidInput | null>(null);
    const amountRevision = useRef<number | null>(null);
    const isOpen = data?.status === 'open' && remaining > 0 && fresh && Date.parse(data.serverTime) >= Date.parse(data.opensAt);
    const seconds = Math.ceil(remaining / 1000);
    const parts = [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60];
    const selectAmount = (value: string) => { amountRevision.current = data?.revision ?? null; setValue('amount', value, { shouldDirty: true, shouldValidate: true }); setNotice(''); };
    const submit: SubmitHandler<BidFormValues> = (form) => {
        if (!data || (!isOpen && !pending) || sending.current) return;
        const amount = pending?.amount ?? Number(form.amount || data.minimumBid);
        if (!pending && amountRevision.current !== null && amountRevision.current !== data.revision) {
            amountRevision.current = data.revision;
            setNotice(`המכירה עודכנה. המינימום החדש הוא ${auctionMoney(data.minimumBid)}. בדקו את הסכום והגישו שוב לאישור.`);
            return;
        }
        const input = pending ?? { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), amount, revision: data.revision, requestId: crypto.randomUUID() };
        setConfirmation(input);
    };
    async function sendConfirmed() {
        if (!confirmation || sending.current) return;
        const input = confirmation;
        sending.current = true; setBusy(true); setNotice(''); setPending(input);
        try {
            const result = await sendAuctionBid(input);
            accept(result.data); setAcceptedId(result.acceptedBidId); setPending(null); amountRevision.current = null;
            resetField('amount');
            resetField('accepted');
        } catch (failure) {
            if (axios.isAxiosError(failure) && failure.response && failure.response.status < 500) {
                setPending(null);
                setNotice(failure.response.data?.message ?? 'ההצעה לא התקבלה. נסו שוב.');
                try { const next = await refresh(); amountRevision.current = next.revision; setNotice(previous => `${previous} הסכום המינימלי כעת: ${auctionMoney(next.minimumBid)}.`); } catch { /* polling retries */ }
            } else { setNotice('לא התקבל אישור מהשרת. לחצו שוב כדי לבדוק ולשלוח את אותה ההצעה, ללא כפילות.'); }
        } finally { sending.current = false; setBusy(false); setConfirmation(null); }
    }
    return <main className={`${styles.page} ${styles.publicPage}`} dir="rtl" lang="he">
        <header className={styles.publicHero}>
            <div className={styles.heroInner}>
                <div className={styles.heroCopy}>
                    <h1 className={styles.publicTitle}><span className={styles.heroEyebrow}>הזכות של</span><span className={styles.goldTitle}>מפטיר יונה</span></h1>
                    <p className={styles.heroSegulah}>
                        <span className={styles.heroSegulahAttribution}>מובא בשם אדמו״ר הריי״צ:</span>
                        <strong className={styles.heroSegulahMessage}>העלייה למפטיר יונה נותנת כוח לתשובה, והיא גם סגולה לעשירות</strong>
                    </p>
                    <p className={styles.heroDescription}>השנה נפתחת הזכות לעלייה בבית חב״ד יפו.<br />הסכום שייאסף יוקדש לפעילות בית חב״ד.</p>
                </div>
                <section className={styles.heroArtwork} aria-label="תמצית המכירה">
                    <div className={styles.archOuter}><div className={styles.archInner}>
                        <h2 className={styles.heroBidHeading}>ההצעה המובילה</h2>
                        <p className={styles.heroBidAmount}>{auctionMoney(data?.leadingBid?.amount ?? data?.openingPrice ?? 1800)}</p>
                        <div className={styles.heroCountdown} aria-label="זמן שנותר לסיום" role="timer">
                            {parts.map((part, index) => <div className={styles.heroTimeBox} key={index}><span className={styles.heroTimeNumber}>{data ? String(part).padStart(2, '0') : '–'}</span><span className={styles.heroTimeLabel}>{['ימים', 'שעות', 'דקות', 'שניות'][index]}</span></div>)}
                        </div>
                        <p className={styles.heroBidCount}>{data ? `${data.bids.length === 5 ? 'לפחות ' : ''}${data.bids.length} הצעות` : 'טוען הצעות…'}</p>
                        <a className={styles.heroCta} href="#maftir-offer" onClick={event => {
                            if (!offerSection.current) return;
                            event.preventDefault();
                            offerSection.current.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
                        }}>להגשת הצעה</a>
                        <p className={styles.heroBidTerms}><span>מחיר פתיחה: <bdi>{auctionMoney(data?.openingPrice ?? 1800)}</bdi></span>{' • '}<span>העלאה מינימלית: <bdi>{auctionMoney(data?.minimumIncrement ?? 180)}</bdi></span></p>
                    </div></div>
                </section>
            </div>
        </header>
        <section className={styles.meritSection} aria-labelledby="maftir-merit-title">
            <div className={styles.meritHeading}>
                <BookOpen
                    className={styles.meritIcon}
                    size={28}
                    strokeWidth={1.5}
                    aria-hidden="true"
                />

                <h2 className={styles.meritTitle} id="maftir-merit-title">
                    מהו מפטיר יונה?
                </h2>
            </div>

            <p className={styles.meritText}>
                מפטיר יונה נקרא בתפילת מנחה של יום הכיפורים. ההפטרה מספרת את סיפורו של יונה הנביא ועוסקת בתשובה וביכולת האדם לשנות את דרכו.
            </p>
        </section>
        <div className={styles.auctionIntro} id="maftir-bid">
            <span className={styles.sectionEyebrow}>ההזדמנות שלכם לקחת חלק</span>
            <h2 className={styles.auctionTitle}>{data?.status === 'ended' ? 'המכירה הסתיימה. תודה לכל המשתתפים.' : 'הגישו את ההצעה שלכם'}</h2>
            <p className={styles.auctionDescription}>ההצעה הגבוהה ביותר במועד הסיום תזכה בעלייה למפטיר יונה בבית חב״ד יפו.</p>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!data ? <p className={styles.note} role="status">טוען את המכירה…</p> : <div className={styles.auctionGrid}>
            <section className={`${styles.card} ${styles.leading} ${styles.publicLeading}`} aria-label="מצב המכירה">
                <p className={styles.status} role="status"><span className={isOpen ? styles.liveDot : styles.quietDot} aria-hidden="true" />{auctionStatus[data.status]}</p>
                <p className={styles.note}>{data.status === 'ended' ? 'הסכום הזוכה' : data.leadingBid ? 'ההצעה המובילה כרגע' : 'מחיר הפתיחה'}</p>
                <p className={styles.amount}>{data.status === 'ended' && !data.leadingBid ? 'אין הצעות' : auctionMoney(data.leadingBid?.amount ?? data.openingPrice)}</p>
                <p className={styles.leader}>{data.leadingBid?.name ?? (data.status === 'ended' ? 'המכירה הסתיימה ללא זוכה' : 'היו הראשונים להציע')}</p>
                <p className={styles.countdownHeading}>{data.status === 'ended' ? 'הזכות הוכרעה' : 'הזמן שנותר להזדמנות שלכם'}</p>
                <div className={styles.countdown} dir="ltr" aria-label="זמן שנותר לסיום" role="timer">
                    {parts.map((part, index) => <div className={styles.timeBox} key={index}><span className={styles.timeNumber}>{String(part).padStart(2, '0')}</span><span className={styles.timeLabel}>{['ימים', 'שעות', 'דקות', 'שניות'][index]}</span></div>)}
                </div>
                <p className={styles.endDate}><time dateTime={data.endsAt}>{auctionEndDate(data.endsAt)}</time></p>
                {remaining === 0 && data.status !== 'ended' && <p className={styles.note}>ממתינים לאישור מצב הסיום מהשרת…</p>}
                <p className={styles.extensionNote}>{data.status === 'ended' ? 'פרטי התשלום יישלחו לזוכה בנפרד.' : 'הצעה שתתקבל בשתי הדקות האחרונות תאריך את המכירה בשתי דקות ממועד קבלתה.'}</p>
            </section>
            <div className={styles.publicColumns}>
                <section className={`${styles.card} ${styles.bidCard}`} id="maftir-offer" ref={offerSection} aria-labelledby="bid-title">
                    <div className={styles.formHeading}><Sparkles className={styles.formIcon} size={24} aria-hidden="true" /><h2 className={styles.sectionTitle} id="bid-title">בחרו את סכום ההצעה</h2></div>
                    <p className={styles.note}>אפשר לבחור סכום מוצע או להזין סכום אחר.</p>
                    {acceptedId && <p className={styles.success} role="status">{data.leadingBid?.id === acceptedId ? (data.status === 'ended' ? 'המכירה הסתיימה וההצעה שלכם זכתה. ניצור קשר בנפרד.' : 'ההצעה התקבלה בהצלחה והיא כרגע ההצעה המובילה.') : 'ההצעה התקבלה. מאז השתנתה ההצעה המובילה — הפרטים המעודכנים מוצגים למעלה.'}</p>}
                    {notice && <p className={styles.error} role="alert">{notice}</p>}
                    <form className={styles.form} onSubmit={event => void handleSubmit(submit)(event)} noValidate>
                        <fieldset className={styles.fieldset} disabled={!isOpen || busy || Boolean(pending)}>
                            <div className={styles.amountSelection}>
                                <div className={styles.offerChoices}>
                                    {[3600, 5400, 7700].map((suggestion, index) => {
                                        const amount = Math.max(suggestion, data.minimumBid + [1800, 3600, 5900][index]);
                                        return <button className={`${styles.offerChoice} ${Number(selectedAmount) === amount ? styles.offerSelected : ''}`} key={suggestion} type="button" disabled={amount > 1000000000} aria-pressed={Number(selectedAmount) === amount} onClick={() => selectAmount(String(amount))}>
                                            <span className={styles.offerTotal}>{auctionMoney(amount)}</span>
                                        </button>;
                                    })}
                                </div>
                                <label className={styles.field}><span className={styles.label}>סכום ההצעה בשקלים</span><span className={styles.amountInputWrap}><span className={styles.currency} aria-hidden="true">₪</span><input aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? "minimum-bid amount-error" : "minimum-bid"} className={`${styles.input} ${styles.offerInput}`} type="number" inputMode="numeric" min={data.minimumBid} max={1000000000} step="1" placeholder={String(data.minimumBid)} {...register('amount', {
                                    validate: value => {
                                        if (pending) return true;
                                        const amount = Number(value || data.minimumBid);
                                        return (Number.isSafeInteger(amount) && amount >= data.minimumBid && amount <= 1000000000)
                                            || `הסכום המינימלי כעת הוא ${auctionMoney(data.minimumBid)}. יש להזין סכום שלם.`;
                                    },
                                })} onChange={event => {
                                    void register('amount').onChange(event);
                                    amountRevision.current = data.revision;
                                    setNotice('');
                                }} /></span></label>
                                {errors.amount && <span className={styles.fieldError} id="amount-error" role="alert">{errors.amount.message}</span>}
                                <p className={styles.minimumNote} id="minimum-bid">הצעה מינימלית: {auctionMoney(data.minimumBid)}</p>
                                <div className={styles.incrementChoices}>{[180, 360, 770].map(increment => <button className={styles.incrementButton} key={increment} type="button" onClick={() => selectAmount(String(Math.max(data.minimumBid, (data.leadingBid?.amount ?? data.openingPrice) + increment)))}>+{increment} ₪ לסכום המוביל</button>)}</div>
                            </div>
                            <h3 className={styles.contactHeading}>פרטי קשר</h3>
                            <div className={styles.fields}>
                                {(['firstName', 'lastName', 'phone'] as const).map((key, index) => <label className={styles.field} key={key}>
                                    <span className={styles.label}>{['שם פרטי', 'שם משפחה', 'טלפון / WhatsApp'][index]}</span>
                                    <input className={styles.input} dir={key === 'phone' ? 'ltr' : undefined} type={key === 'phone' ? 'tel' : 'text'} autoComplete={['given-name', 'family-name', 'tel'][index]} required maxLength={key === 'phone' ? 30 : 50} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} {...register(key, {
                                        validate: value => {
                                            if (pending) return true;
                                            if (key === 'phone') {
                                                const phone = value.replace(/[\s()-]/g, '').replace(/^00972/, '+972');
                                                return (/^[+\d\s()-]{9,30}$/.test(value) && (/^[+][1-9]\d{7,14}$/.test(phone) || /^0(?:[23489]|[57]\d)\d{7}$/.test(phone)))
                                                    || 'יש להזין טלפון תקין; למספר בינלאומי הוסיפו + וקידומת מדינה.';
                                            }
                                            return (/^[\p{L}\p{M} '\u05f3\u05f4’־-]{1,50}$/u.test(value.trim()) && /\p{L}/u.test(value))
                                                || 'יש להזין שם תקין.';
                                        },
                                    })} />
                                    {errors[key] && <span className={styles.fieldError} id={`${key}-error`} role="alert">{errors[key]?.message}</span>}
                                </label>)}
                            </div>
                            <label className={styles.checkboxLabel}><input className={styles.checkbox} type="checkbox" required aria-invalid={Boolean(errors.accepted)} aria-describedby={errors.accepted ? 'accepted-error' : undefined} {...register('accepted', { required: 'יש לאשר את ההתחייבות לפני הגשת ההצעה.' })} /><span className={styles.text}>אני מאשר/ת שההצעה שהגשתי מחייבת אותי אם אזכה במכירה.</span></label>
                            {errors.accepted && <span className={styles.fieldError} id="accepted-error" role="alert">{errors.accepted.message}</span>}
                        </fieldset>
                        <button className={`${styles.primary} ${styles.bidSubmit}`} type="submit" disabled={(!isOpen && !pending) || busy}>{busy ? 'שולח הצעה…' : pending ? 'בדיקת ושליחת ההצעה הקודמת' : `הגש הצעה • ${Number(selectedAmount || data.minimumBid).toLocaleString('he-IL')} ₪`}</button>
                        <p className={styles.paymentReassurance}><ShieldCheck className={styles.reassuranceIcon} size={18} aria-hidden="true" />אין חיוב עכשיו. התשלום יתבצע רק במקרה של זכייה.</p>
                    </form>
                </section>
                <section className={styles.recentCard} aria-labelledby="recent-title">
                    <h2 className={styles.sectionTitle} id="recent-title">חמש ההצעות האחרונות</h2>
                    {!data.bids.length ? <p className={styles.recentEmpty}>עדיין אין הצעות. ההצעה הראשונה יכולה להיות שלכם.</p> : (
                        <ol className={styles.bidList}>
                            {data.bids.slice(0, 5).map(bid => <li className={styles.bid} key={bid.id}>
                                <bdi className={styles.recentName}>{bid.name}</bdi>
                                <strong className={styles.bidAmount}><bdi>{auctionMoney(bid.amount)}</bdi></strong>
                                <time className={styles.recentTime} dateTime={bid.receivedAt} dir="ltr">{recentBidTime.format(new Date(bid.receivedAt))}</time>
                            </li>)}
                        </ol>
                    )}
                </section>
            </div>
        </div>}
        <div className={styles.closingNote}><p className={styles.closingText}>שתהיה שנה של בשורות טובות.<br className={styles.lineBreak} />גמר חתימה טובה מבית חב״ד יפו.</p></div>
        {isOpen && !offerVisible && <a className={styles.mobileBidLink} href="#maftir-offer"><span className={styles.mobileBidText}>רוצה לזכות במפטיר יונה</span><ArrowDown className={styles.ctaIcon} size={18} aria-hidden="true" /></a>}
        <ConfirmDialog open={Boolean(confirmation)} title="אישור הגשת הצעה" message={confirmation ? `לאשר הצעה מחייבת בסך ${auctionMoney(confirmation.amount)} עבור זכות מפטיר יונה? התשלום יידרש רק במקרה של זכייה.` : ''} confirmLabel="אישור ושליחת ההצעה" busy={busy} onConfirm={() => void sendConfirmed()} onClose={() => { if (!busy) setConfirmation(null); }} />
    </main>;
}
