import { Link } from "react-router-dom";

import styles from "./DaycareRegistrationPromo.module.scss";

const DaycareRegistrationPromo = () => {
    return (
        <section className={styles.section}>
            <div className={styles.overlay} aria-hidden="true" />

            <div className={styles.content}>
                <span className={styles.eyebrow}>
                    רישום מוקדם
                </span>

                <h2 className={styles.title}>
                    מעון חדש בצפון יפו
                </h2>

                <p className={styles.description}>
                    מרכז חב״ד יפו נערך לפתיחת מעון לילדים בגילאי שנה עד שלוש.
                    מספר המקומות מוגבל והרישום המוקדם מתבצע לפי סדר הפנייה.
                </p>

                <Link
                    to="/daycare-registration"
                    className={styles.button}
                >
                    לרישום מוקדם למעון
                </Link>
            </div>
        </section>
    );
};

export default DaycareRegistrationPromo;
