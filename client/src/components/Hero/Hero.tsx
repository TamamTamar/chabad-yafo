import styles from "./Hero.module.scss";

const Hero = () => {
    return (
        <section className={styles.hero}>
            <div className="container">
                <div className={styles.inner}>
                    <h1 className={styles.h1}>בית חב״ד יפו — בית יהודי פתוח, פעיל וחי</h1>
                    <p className={styles.p}>
                        תפילות • סעודות שבת • חגים • פעילות קהילתית — מקום מסודר, מזמין ורשמי בלב יפו.
                    </p>

                    <div className={styles.cta}>
                        <a className={styles.primary} href="#shabbat">
                            רישום לסעודת שבת
                        </a>
                        <a className={styles.secondary} href="#donate">
                            תרומה לפעילות
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
