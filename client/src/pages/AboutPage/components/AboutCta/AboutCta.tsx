import { Link } from "react-router-dom";

import Container from "../../../../components/Container/Container";

import styles from "./AboutCta.module.scss";

const AboutCta = () => {
    return (
        <section className={styles.section}>
            <Container>
                <div className={styles.box}>
                    <div className={styles.content}>
                        <div className={styles.eyebrow}>רוצים לקחת חלק?</div>

                        <h2 className={styles.title}>
                            בואו להיות שותפים באור של יפו
                        </h2>

                        <p className={styles.text}>
                            אפשר להגיע לפעילות, להכיר מקרוב, להתנדב או לתמוך
                            בעשייה שמגיעה לעוד ועוד משפחות.
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <Link to="/donate" className={styles.primaryButton}>
                            לקחת חלק
                        </Link>

                        <Link to="/gallery" className={styles.secondaryButton}>
                            לצפייה בגלריה
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default AboutCta;
