import styles from "./CommunityBox.module.scss";
import rabbiTamam from "../../../../assets/chabad-houses/center.jpeg";

const CommunityBox = () => {
    return (
        <aside className={styles.box}>
            <img
                src={rabbiTamam}
                alt="הרב לוי יצחק תמם"
                className={styles.image}
            />

            <div className={styles.content}>
                <h2>חזון מרכז חב״ד יפו: להרבות אור, יחד</h2>

                <p>
                    מרכז חב״ד יפו מאחד את פעילות שלוחי חב״ד בעיר מתוך אהבת
                    ישראל, אחריות משותפת ושליחות.
                </p>

                <p>
                    שאיפתנו היא לבנות ביפו קהילה יהודית חמה ותוססת, שבה כל
                    אדם מרגיש רצוי, שייך ואהוב.
                </p>

                <p>
                    אנו פועלים להוסיף אור ביפו באמצעות תורה, חסד ואהבת ישראל,
                    מתוך אמונה שכל יהודי הוא עולם מלא ושכל מעשה טוב מקרב את
                    הגאולה.
                </p>
            </div>
        </aside>
    );
};

export default CommunityBox;