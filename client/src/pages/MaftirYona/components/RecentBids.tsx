import shared from '../MaftirYona.module.scss';
import { auctionMoney, type AuctionBid } from '../../../services/maftirYonaService';
const recentBidTime = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

import styles from './RecentBids.module.scss';

export default function RecentBids({ bids }: { bids: AuctionBid[] }) {
    return (
        <section className={styles.recentCard} aria-labelledby="recent-title">
            <h2 className={shared.sectionTitle} id="recent-title">חמש ההצעות האחרונות</h2>
            {!bids.length ? <p className={styles.recentEmpty}>עדיין אין הצעות. ההצעה הראשונה יכולה להיות שלכם.</p> : (
                <ol className={shared.bidList}>
                    {bids.slice(0, 5).map(bid => <li className={shared.bid} key={bid.id}>
                        <bdi className={styles.recentName}>{bid.name}</bdi>
                        <strong className={shared.bidAmount}><bdi>{auctionMoney(bid.amount)}</bdi></strong>
                        <time className={styles.recentTime} dateTime={bid.receivedAt} dir="ltr">{recentBidTime.format(new Date(bid.receivedAt))}</time>
                    </li>)}
                </ol>
            )}
        </section>
    );
}
