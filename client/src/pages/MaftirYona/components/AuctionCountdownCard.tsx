import shared from '../MaftirYona.module.scss';
import { auctionMoney, auctionStatus, type AuctionState } from '../../../services/maftirYonaService';
function auctionEndDate(value: string) {
    const date = new Date(value);
    const timeZone = 'Asia/Jerusalem';
    const weekday = new Intl.DateTimeFormat('he-IL', { timeZone, weekday: 'long' }).format(date);
    const calendarDate = new Intl.DateTimeFormat('he-IL', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).format(date);
    const time = new Intl.DateTimeFormat('he-IL', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
    return `המכירה תסתיים ב${weekday}, ${calendarDate} בשעה ${time}`;
}

import styles from './AuctionCountdownCard.module.scss';

type Props = { data: AuctionState; isOpen: boolean; parts: number[]; remaining: number };

export default function AuctionCountdownCard({ data, isOpen, parts, remaining }: Props) {
    return (
        <section className={`${shared.card} ${styles.leading} ${styles.publicLeading}`} aria-label="מצב המכירה">
            <p className={shared.status} role="status"><span className={isOpen ? styles.liveDot : styles.quietDot} aria-hidden="true" />{auctionStatus[data.status]}</p>
            <p className={shared.note}>{data.status === 'ended' ? 'הסכום הזוכה' : data.leadingBid ? 'ההצעה המובילה כרגע' : 'מחיר הפתיחה'}</p>
            <p className={styles.amount}>{data.status === 'ended' && !data.leadingBid ? 'אין הצעות' : auctionMoney(data.leadingBid?.amount ?? data.openingPrice)}</p>
            <p className={styles.leader}>{data.leadingBid?.name ?? (data.status === 'ended' ? 'המכירה הסתיימה ללא זוכה' : 'היו הראשונים להציע')}</p>
            <p className={styles.countdownHeading}>{data.status === 'ended' ? 'הזכות הוכרעה' : 'הזמן שנותר להזדמנות שלכם'}</p>
            <div className={styles.countdown} dir="ltr" aria-label="זמן שנותר לסיום" role="timer">
                {parts.map((part, index) => <div className={styles.timeBox} key={index}><span className={styles.timeNumber}>{String(part).padStart(2, '0')}</span><span className={styles.timeLabel}>{['ימים', 'שעות', 'דקות', 'שניות'][index]}</span></div>)}
            </div>
            <p className={styles.endDate}><time dateTime={data.endsAt}>{auctionEndDate(data.endsAt)}</time></p>
            {remaining === 0 && data.status !== 'ended' && <p className={shared.note}>ממתינים לאישור מצב הסיום מהשרת…</p>}
            <p className={styles.extensionNote}>{data.status === 'ended' ? 'פרטי התשלום יישלחו לזוכה בנפרד.' : 'הצעה שתתקבל בשתי הדקות האחרונות תאריך את המכירה בשתי דקות ממועד קבלתה.'}</p>
        </section>
    );
}
