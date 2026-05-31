import styles from "../Families.module.scss";

const HeroSection = () => {
    return (
        <section className={styles.hero} aria-label="משפחות צעירות ביפו">
            <div className={styles.bg} aria-hidden="true" />
            <div className={styles.overlay} aria-hidden="true" />

            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>
                    משפחות צעירות
                    <br />
                    ביפו 💛
                </h1>

                <p className={styles.heroDescription}>
                    בית חב״ד יפו מרחיב את הפעילות למשפחות וילדים בעיר —
                    חוגים, קייטנות, פעילויות קהילתיות ומסגרות חינוך עתידיות.
                </p>

                <a href="#form" className={styles.heroButton}>
                    למילוי הפרטים
                </a>
            </div>
        </section>
    );
};

export default HeroSection;