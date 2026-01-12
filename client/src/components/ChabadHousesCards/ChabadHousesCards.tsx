import type { ChabadHouseCard } from "../../types/chabad";
import styles from "./ChabadHousesCards.module.scss";

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
                    {cards.map(
                        ({
                            id,
                            imageSrc,
                            imageAlt,
                            title,
                            shaliach,
                            address,
                            phone,
                        }) => (
                            <li key={id} className={styles.card}>
                                <div className={styles.media}>
                                    <img
                                        className={styles.image}
                                        src={imageSrc}
                                        alt={imageAlt}
                                        loading="lazy"
                                    />
                                </div>

                                <div className={styles.cardBody}>
                                    <h3 className={styles.cardTitle}>{title}</h3>
                                    <p className={styles.shaliach}>{shaliach}</p>
                                    <p className={styles.address}>{address}</p>
                                    <p className={styles.phone}>{phone}</p>
                                </div>
                            </li>
                        )
                    )}
                </ul>
            </div>
        </section>
    );
};

export default ChabadHousesCards;
