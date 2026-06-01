import { Link } from "react-router-dom";
import styles from "./FamiliesPromo.module.scss";

const FamiliesPromo = () => {
    return (
        <section className={styles.section}>
            <div className={styles.overlay} />

            <div className={styles.content}>
           
                <h2>
                    משפחות צעירות ביפו?
                </h2>

                <p>
                    בית חב״ד יפו מקדם פעילויות, חוגים ומסגרות חינוך לילדים.
                    נשמח להכיר את המשפחה שלכם ולבנות יחד קהילה משפחתית חמה ביפו.
                </p>

                <Link
                    to="/families"
                    className={styles.button}
                >
                    ספרו לנו על המשפחה שלכם 
                </Link>
            </div>
        </section>
    );
};

export default FamiliesPromo;