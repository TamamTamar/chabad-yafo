import { BookOpen } from 'lucide-react';
import styles from './MaftirYonaIntro.module.scss';

export default function MaftirYonaIntro({ ended }: { ended: boolean }) {
    return (
        <>
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
                    <h2 className={styles.auctionTitle}>{ended ? 'המכירה הסתיימה. תודה לכל המשתתפים.' : 'הגישו את ההצעה שלכם'}</h2>
                    <p className={styles.auctionDescription}>ההצעה הגבוהה ביותר במועד הסיום תזכה בעלייה למפטיר יונה בבית חב״ד יפו.</p>
                </div>

        </>
    );
}
