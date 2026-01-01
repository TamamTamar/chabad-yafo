import styles from "./ChabadHousesCards.module.scss";

export type ChabadHouseCard = {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    imageSrc: string;
    imageAlt: string;
    featured?: boolean; // לוגי בלבד, לא משפיע על העיצוב כרגע
};

type Props = {
    title?: string;
    cards: ChabadHouseCard[];
};

const ChabadHousesCards = ({ title = "בתי חב״ד ביפו", cards }: Props) => {
    return (
        <section className={styles.section} aria-label={title}>
            <div className={styles.inner}>
                <header className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                </header>

                <ul className={styles.grid}>
                    {cards.map((card) => (
                        <li key={card.id} className={styles.card}>
                            <a className={styles.cardLink} href={card.href}>
                                <div className={styles.media}>
                                    <img
                                        className={styles.image}
                                        src={card.imageSrc}
                                        alt={card.imageAlt}
                                        loading="lazy"
                                    />
                                </div>

                                <div className={styles.body}>
                                    <h3 className={styles.cardTitle}>
                                        {card.title}
                                    </h3>

                                    {card.subtitle && (
                                        <p className={styles.subtitle}>
                                            {card.subtitle}
                                        </p>
                                    )}

                                    <div className={styles.cta}>
                                        <span>פרטים</span>
                                        <span
                                            className={styles.arrow}
                                            aria-hidden="true"
                                        >
                                            ›
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default ChabadHousesCards;
