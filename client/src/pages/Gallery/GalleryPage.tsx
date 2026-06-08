import { Link } from "react-router-dom";

import { galleryItems } from "../../data/galleryData";

import styles from "./GalleryPage.module.scss";

const GalleryPage = () => {

    return (
        <div className={styles.page}>
            <div className={styles.inner}>
                <div className={styles.header}>
                    <div className={styles.eyebrow}>גלריה</div>

                    <div className={styles.title}>רגעים מהפעילות שלנו</div>

                    <div className={styles.description}>
                        בחרו קטגוריה וצפו ברגעים מהחגים, הקהילה, הפעילות ברחבי יפו והשליחות שלנו.
                    </div>
                </div>

                <div className={styles.categories}>
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
                                <div className={styles.categoryTitle}>
                                    {item.title}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

               
            </div>
        </div>
    );
};

export default GalleryPage;