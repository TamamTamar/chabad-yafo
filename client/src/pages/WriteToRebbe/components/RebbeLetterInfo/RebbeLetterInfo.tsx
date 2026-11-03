import styles from "./RebbeLetterInfo.module.scss";

import type { WriteToRebbeConfig } from "../../writeToRebbeConfig";

const RebbeLetterInfo = ({ config }: { config: WriteToRebbeConfig }) => {
    return (
        <aside className={styles.card}>
            <h2 className={styles.title}>
                מקום למילים שלכם
            </h2>

            <p className={styles.description}>
                אין צורך בנוסח מיוחד. אפשר לספר בכמה מילים על מה שמעסיק
                אתכם, לבקש ברכה לעצמכם ולבני המשפחה, או לציין שמות
                לתפילה. כל בקשה היא אישית, וכל אחד ואחת מוזמנים לכתוב.
            </p>

            {config.eventTitle && (
                <>
                    <h2 className={styles.title}>{config.eventTitle}</h2>
                    <p className={styles.description}>{config.eventText}</p>
                </>
            )}

            <p className={styles.note}>
                לצד כל שם לתפילה, הוסיפו גם את שם האם.
                כתבו בשפה הנוחה לכם ובמילים שלכם.
            </p>

            <p className={styles.footerText}>
                הרב לוי תמם - בית חב״ד יפו
            </p>
        </aside>
    );
};

export default RebbeLetterInfo;
