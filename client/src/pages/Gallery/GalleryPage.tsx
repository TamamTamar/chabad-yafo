import { Link } from "react-router-dom";

import Container from "../../components/Container/Container";
import { galleryItems } from "../../data/galleryData";

import styles from "./GalleryPage.module.scss";

const GalleryPage = () => {
    return (
        <main className={styles.page}>
            <Container>
                <header className={styles.header}>
                    <div className={styles.eyebrow}>גלריה</div>

                    <h1 className={styles.title}>רגעים מהפעילות שלנו</h1>

                    <p className={styles.description}>
                        בחרו קטגוריה וצפו ברגעים מהחגים, הקהילה, הפעילות ברחבי יפו והשליחות שלנו.
                    </p>
                </header>

                <section className={styles.categories} aria-label="קטגוריות גלריה">
                    {galleryItems.map((item) => (
                        <Link
                            key={item.id}
                            to={`/gallery/${item.id}`}
                            className={styles.categoryCard}
                        >
                            <img
                                src={item.coverImage ?? item.images[0]}
                                alt=""
                                className={styles.categoryImage}
                            />

                            <div className={styles.categoryOverlay} />

                            <div className={styles.badge}>
                                {item.images.length} תמונות
                            </div>

                            <div className={styles.categoryContent}>
                                <h2 className={styles.categoryTitle}>
                                    {item.title}
                                </h2>
                            </div>
                        </Link>
                    ))}
                </section>
            </Container>
        </main>
    );
};

export default GalleryPage;