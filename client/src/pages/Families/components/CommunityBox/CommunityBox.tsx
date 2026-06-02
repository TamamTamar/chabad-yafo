import styles from "./CommunityBox.module.scss";
import levyTamam from "../../../../assets/levyTamam.webp";

const CommunityBox = () => {
    return (
        <aside className={styles.box}>
            <div className={styles.content}>
                <div className={styles.title}>
                    חזון מרכז חב״ד יפו:
                    <br />
                    להרבות אור, יחד
                </div>

                <div className={styles.text}>
                    מרכז חב״ד יפו מאחד את פעילות שלוחי חב״ד בעיר מתוך אהבת
                    ישראל, אחריות משותפת ושליחות.
                </div>

                <div className={styles.text}>
                    שאיפתנו היא לבנות ביפו קהילה יהודית חמה ותוססת, שבה כל אדם
                    מרגיש רצוי, שייך ואהוב.
                </div>

                <div className={styles.text}>
                    אנו פועלים להוסיף אור ביפו באמצעות תורה, חסד ואהבת ישראל,
                    מתוך אמונה שכל יהודי הוא עולם מלא ושכל מעשה טוב מקרב את
                    הגאולה.
                </div>

                <div className={styles.signature}>
                    <div className={styles.signatureGreeting}>
                        בברכה,
                    </div>

                    <div className={styles.signatureName}>
                        הרב לוי יצחק תמם
                    </div>

                    <div className={styles.signatureRole}>
                        בית חב״ד יפו
                    </div>
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