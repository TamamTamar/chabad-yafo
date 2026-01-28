import type { ChabadHouseCard } from "../../types/chabad";
import styles from "./ChabadHousesCards.module.scss";

type Props = {
    cards: ChabadHouseCard[];
};

const ChabadHousesCards = ({ cards }: Props) => {
    const getGoogleMapsLink = (query: string) =>
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    const getWazeDeepLink = (query: string) =>
        `waze://?q=${encodeURIComponent(query)}&navigate=yes`;

    const isMobile = () =>
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const openNavigation = (query: string) => {
        const gmaps = getGoogleMapsLink(query);

        // Desktop: open Google Maps in new tab
        if (!isMobile()) {
            window.open(gmaps, "_blank", "noopener,noreferrer");
            return;
        }

        // Mobile: try Waze first
        window.location.href = getWazeDeepLink(query);

        // Fallback to Google Maps if Waze isn't installed / blocked
        window.setTimeout(() => {
            window.location.href = gmaps;
        }, 700);
    };

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
                                <a
                                    href={getGoogleMapsLink(address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.cardLink}
                                    aria-label={`ניווט אל ${title}`}
                                    onClick={(e) => {
                                        // We handle navigation ourselves for "Waze on mobile" behavior
                                        e.preventDefault();
                                        openNavigation(address);
                                    }}
                                >
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
                                </a>
                            </li>
                        )
                    )}
                </ul>
            </div>
        </section>
    );
};

export default ChabadHousesCards;
