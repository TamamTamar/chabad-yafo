import {
    Heart,
    BookOpen,
    Users,
    Utensils,
} from "lucide-react";

import Container from "../../../../components/Container/Container";

import styles from "./DonateImpact.module.scss";

const items = [
    {
        icon: Utensils,
        title: "שבתות ואירוח",
        description:
            "סעודות שבת, אירוח מטיילים, משפחות וצעירים מכל רחבי יפו.",
    },
    {
        icon: Users,
        title: "ילדים ומשפחות",
        description:
            "פעילויות לילדים, חגים, אירועים קהילתיים ותמיכה במשפחות.",
    },
    {
        icon: BookOpen,
        title: "שיעורים וקהילה",
        description:
            "שיעורי תורה, התוועדויות, מפגשים וחיזוק הזהות היהודית.",
    },
    {
        icon: Heart,
        title: "סיוע וחסד",
        description:
            "עזרה ליהודים הזקוקים לתמיכה, ליווי אישי ומענה לאורך השנה.",
    },
];

const DonateImpact = () => {
    return (
        <section className={styles.section}>
            <Container>
                <header className={styles.header}>
                    <div className={styles.eyebrow}>
                        לאן הולכת התרומה?
                    </div>

                    <h2 className={styles.title}>
                        יחד יוצרים השפעה אמיתית ביפו
                    </h2>
                </header>

                <div className={styles.grid}>
                    {items.map((item) => {
                        const Icon = item.icon;

                        return (
                            <article
                                key={item.title}
                                className={styles.card}
                            >
                                <div className={styles.icon}>
                                    <Icon size={34} />
                                </div>

                                <h3 className={styles.cardTitle}>
                                    {item.title}
                                </h3>

                                <p className={styles.cardDescription}>
                                    {item.description}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
};

export default DonateImpact;