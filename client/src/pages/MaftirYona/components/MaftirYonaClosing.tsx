import { ArrowDown } from 'lucide-react';
import styles from './MaftirYonaClosing.module.scss';

export default function MaftirYonaClosing({ showBidLink }: { showBidLink: boolean }) {
    return (
        <>
                <div className={styles.closingNote}><p className={styles.closingText}>שתהיה שנה של בשורות טובות.<br />גמר חתימה טובה מבית חב״ד יפו.</p></div>
                {showBidLink && <a className={styles.mobileBidLink} href="#maftir-offer"><span className={styles.mobileBidText}>רוצה לזכות במפטיר יונה</span><ArrowDown className={styles.ctaIcon} size={18} aria-hidden="true" /></a>}

        </>
    );
}
