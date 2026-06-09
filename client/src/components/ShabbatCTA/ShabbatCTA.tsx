import { Link } from "react-router-dom";
import styles from "./ShabbatCTA.module.scss";
import Container from "../Container/Container";

const ShabbatCTA = () => {
    return (
        <section
            id="shabbat"
            className={styles.section}
        >
            <Container>
                <div className={styles.box}>
                    <h2 className={styles.title}>
                        רישום לסעודות שבת וחג
                    </h2>

                    <p className={styles.description}>
                        סעודות שבת פתוחות, חמות ומשפחתיות –
                        בהרשמה מראש. נשמח לארח אתכם בבית חב״ד יפו.
                    </p>

                    <Link
                        to="/shabbat"
                        className={styles.button}
                    >
                        לרישום לסעודת שבת
                    </Link>
                </div>
            </Container>
        </section>
    );
};

export default ShabbatCTA;
