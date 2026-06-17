import Container from "../../../../components/Container/Container";
import styles from "./AboutStats.module.scss";

const stats = [
    {
        value: "38+",
        label: "שנות פעילות",
    },
    {
        value: "500+",
        label: "משפחות בקשר",
    },
    {
        value: "50+",
        label: "אירועים בשנה",
    },
    {
        value: "1,000+",
        label: "משתתפים לאורך השנה",
    },
];

const AboutStats = () => {
    return (
        <section className={styles.section}>
            <Container>
                <div className={styles.header}>
                    <div className={styles.eyebrow}>במספרים</div>

                    <h2 className={styles.title}>
                        עשייה שממשיכה לצמוח
                    </h2>

                    <p className={styles.subtitle}>
                        עשרות שנים של קהילה, פעילות וחיבור ביפו.
                    </p>
                </div>

                <div className={styles.grid}>
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className={styles.card}
                        >
                            <div className={styles.value}>
                                {stat.value}
                            </div>

                            <div className={styles.label}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
};

export default AboutStats;