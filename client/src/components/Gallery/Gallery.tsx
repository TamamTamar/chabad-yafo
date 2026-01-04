import styles from "./Gallery.module.scss";
import { galleryItems } from "../../data/galleryData";

const Gallery = () => {
    return (
        <section className={styles.section} aria-label="גלריה">
            <div className={styles.inner}>
                <div className={styles.header}>
                    <h2 className={styles.title}>פעילות וגלריית תמונות</h2>
                </div>

                <div className={styles.grid}>
                    {galleryItems.map((item) => (
                        <div
                            key={item.id}
                            className={styles.card}
                        >
                            <div
                                className={styles.media}
                                style={{ ["--bg" as any]: `url(${item.images[0]})` }}
                            >
                                <img
                                    className={styles.image}
                                    src={item.images[0]}
                                    alt={item.title}
                                    loading="lazy"
                                />
                            </div>

                            <div className={styles.cardBody}>
                                <p className={styles.cardTitle}>{item.title}</p>
                            </div>
                        </div>

                    ))}
                </div>
            </div>
        </section>
    );
};

export default Gallery;
