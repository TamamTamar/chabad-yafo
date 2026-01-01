import styles from "./Gallery.module.scss";

const images = [
    { title: "סעודות שבת קהילתיות" },
    { title: "פעילות ילדים" },
    { title: "חגי ישראל ביפו" },
    { title: "הנחת תפילין" },
    { title: "פעילות לנוער" },
    { title: "אירועי קהילה" },
];

const Gallery = () => {
    return (
        <section id="activity" className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>פעילות קהילתית וחיי בית חב״ד</h2>

                <div className={styles.grid}>
                    {images.map((item, index) => (
                        <div key={index} className={styles.card}>
                            <div className={styles.image} />
                            <span className={styles.caption}>{item.title}</span>
                        </div>
                    ))}
                </div>

                <div className={styles.cta}>
                    <a href="#donate" className={styles.button}>
                        תרומה לפעילות
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Gallery;
