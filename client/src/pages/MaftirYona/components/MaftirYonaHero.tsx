import type { MouseEventHandler } from 'react';
import { auctionMoney, type AuctionState } from '../../../services/maftirYonaService';
import styles from './MaftirYonaHero.module.scss';

type Props = {
    data: Pick<AuctionState, 'leadingBid' | 'openingPrice' | 'minimumIncrement' | 'bids'> | null;
    parts: number[];
    onOfferClick: MouseEventHandler<HTMLAnchorElement>;
};

export default function MaftirYonaHero({ data, parts, onOfferClick }: Props) {
    return (
        <header className={styles.publicHero}>
            <div className={styles.heroInner}>
                <div className={styles.heroCopy}>
                    <h1 className={styles.publicTitle}><span className={styles.heroEyebrow}>הזכות של</span><span className={styles.goldTitle}>מפטיר יונה</span></h1>
                    <p className={styles.heroSegulah}>
                        <span className={styles.heroSegulahAttribution}>מובא בשם אדמו״ר הריי״צ:</span>
                        <span className={styles.heroSegulahMessage}>העלייה למפטיר יונה נותנת כוח לתשובה,<br /><strong className={styles.heroSegulahEmphasis}>והיא גם סגולה לעשירות</strong></span>
                    </p>
                    <p className={styles.heroDescription}>השנה נפתחת הזכות לעלייה בבית חב״ד יפו.<br />הסכום שייאסף יוקדש לפעילות בית חב״ד.</p>
                </div>
                <section className={styles.heroArtwork} aria-label="תמצית המכירה">
                    <div className={styles.archOuter}><div className={styles.archInner}>
                        <h2 className={styles.heroBidHeading}>ההצעה המובילה</h2>
                        <p className={styles.heroBidAmount}>{auctionMoney(data?.leadingBid?.amount ?? data?.openingPrice ?? 1800)}</p>
                        <div className={styles.heroCountdown} dir="ltr" aria-label="זמן שנותר לסיום" role="timer">
                            {parts.map((part, index) => <div className={styles.heroTimeBox} key={index}><span className={styles.heroTimeNumber}>{data ? String(part).padStart(2, '0') : '–'}</span><span className={styles.heroTimeLabel}>{['ימים', 'שעות', 'דקות', 'שניות'][index]}</span></div>)}
                        </div>
                        <p className={styles.heroBidCount}>{data ? `${data.bids.length === 5 ? 'לפחות ' : ''}${data.bids.length} הצעות` : 'טוען הצעות…'}</p>
                        <a className={styles.heroCta} href="#maftir-offer" onClick={onOfferClick}>להגשת הצעה</a>
                        <p className={styles.heroBidTerms}><span>מחיר פתיחה: <bdi>{auctionMoney(data?.openingPrice ?? 1800)}</bdi></span>{' • '}<span>העלאה מינימלית: <bdi>{auctionMoney(data?.minimumIncrement ?? 180)}</bdi></span></p>
                    </div></div>
                </section>
            </div>
        </header>
    );
}
