import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Hero.module.scss";

const Hero = () => {
    return (
        <section className={styles.hero} aria-label="פתיח בית חב״ד יפו">
            <div className={styles.bg} aria-hidden="true" />
            <div className={styles.overlay} aria-hidden="true" />

            <Container className={styles.inner}>
                <div className={styles.card}>
                    <h1 className={styles.title}>
                        בית חב״ד יפו
                        <br />
                        הכתובת שלך לכל עניין יהודי
                    </h1>

                    <div className={styles.actions}>
                        <Link to="/shabbat" className={styles.primary}>
                            רישום לסעודת שבת
                        </Link>

                        <Link to="/donate#donate-form"
                        className={styles.secondary}>
                            תרומה לפעילות
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default Hero;