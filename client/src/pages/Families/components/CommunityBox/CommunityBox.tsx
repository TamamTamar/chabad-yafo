import styles from "./CommunityBox.module.scss";
import levyTamam from "../../../../assets/levyTamam.png";

const CommunityBox = () => {
    return (
        <aside className={styles.box}>
            <div className={styles.content}>
                <h2>
                    חזון מרכז חב״ד יפו:
                    <br />
                    להרבות אור, יחד
                </h2>

                <p>
                    מרכז חב״ד יפו פועל לחיזוק החיים היהודיים בעיר באמצעות תורה,
                    חסד ואהבת ישראל.
                </p>

                <p>
                    אנו שואפים לבנות קהילה חמה ומשפחתית, שבה כל אדם מרגיש
                    רצוי, שייך ואהוב.
                </p>

                <ul className={styles.list}>
                    <li>פעילויות למשפחות וילדים</li>
                    <li>שיעורים, חגים ואירועים קהילתיים</li>
                    <li>מסגרות חינוך ויוזמות קהילתיות</li>
                    <li>הוספת אור ביפו — מתוך שליחות</li>
                </ul>

                <div className={styles.signature}>
                    <span>בברכה,</span>
                    <strong>הרב לוי יצחק תמם</strong>
                    <small>בית חב״ד יפו</small>
                </div>
            </div>

            <img
                src={levyTamam}
                alt="הרב לוי יצחק תמם"
                className={styles.rabbiImage}
            />
        </aside>
    );
};

export default CommunityBox;