import styles from "./ChabadHousesCards.module.scss";
import type { ChabadHouseCard } from "../../types/chabad";

type Props = {
    cards: ChabadHouseCard[];
};

const ChabadHousesCards = ({ cards }: Props) => {
    return (
        <section className={styles.section} aria-label="חב״ד ביפו">
            <div className={styles.inner}>
                <header className={styles.header}>
                    <h2 className={styles.title}>חב״ד ביפו</h2>
                </header>

                <ul className={styles.grid}>
                    {cards.map((card) => (
                        <li key={card.id} className={styles.card}>
                            <div className={styles.media}>
                                <img
                                    className={styles.image}
                                    src={card.imageSrc}
                                    alt={card.imageAlt}
                                    loading="lazy"
                                />
                            </div>

                            <div className={styles.cardBody}>
                                <h3 className={styles.cardTitle}>{card.title}</h3>
                                <p className={styles.shaliach}>{card.shaliach}</p>
                                <p className={styles.address}>{card.address}</p>
                                <p className={styles.phone}>{card.phone}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
};

export default ChabadHousesCards;
