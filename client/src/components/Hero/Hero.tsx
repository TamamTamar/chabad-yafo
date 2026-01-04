import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Hero.module.scss";
import { useLang } from "../../hooks/useLang";

const Hero = () => {
    const { t } = useLang();

    return (
        <section className={styles.hero} aria-label={t.heroAria}>
            <div className={styles.bg} aria-hidden="true" />
            <div className={styles.overlay} aria-hidden="true" />

            <Container className={styles.inner}>
                <div className={styles.card}>
                    <h1 className={styles.title}>
                        {t.heroTitle}
                        <br />
                        {t.heroSubtitle}
                    </h1>

                    <div className={styles.actions}>
                        <Link to="/shabbat" className={styles.primary}>
                            {t.heroShabbat}
                        </Link>

                        <a
                            href="https://www.matara.pro/nedarimplus/online/?S=aVIw"
                            className={styles.secondary}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t.heroDonate}
                        </a>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default Hero;
