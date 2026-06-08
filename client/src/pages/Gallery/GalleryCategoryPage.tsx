import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { galleryItems } from "../../data/galleryData";
import styles from "./GalleryCategoryPage.module.scss";

const GalleryCategoryPage = () => {
    
    const { categoryId } = useParams();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const category = useMemo(() => {
        
        return galleryItems.find((item) => item.id === categoryId);
    }, [categoryId]);

    if (!category) {
        return (
            <main className={styles.page}>
                <div className={styles.inner}>
                    <div className={styles.notFound}>
                        <h1 className={styles.title}>הקטגוריה לא נמצאה</h1>

                        <Link to="/gallery" className={styles.backLink}>
                            חזרה לגלריה
                        </Link>
                    </div>
                </div>
            </main>
        );
    }


    const openImage = (image: string) => {
        setSelectedImage(image);
    };
    

    return (
        <main className={styles.page}>
            <div className={styles.inner}>
                <section className={styles.header}>
                    <Link to="/gallery" className={styles.backLink}>
                        ← חזרה לגלריה
                    </Link>

                    <div className={styles.eyebrow}>גלריה</div>
                    <h1 className={styles.title}>{category.title}</h1>

                    <p className={styles.description}>
                        {category.images.length} תמונות מהפעילות
                    </p>
                </section>

                <section className={styles.cloud}>
                    {category.images.map((image, index) => (
                        <button
                            type="button"
                            key={`${image}-${index}`}
                            className={styles.cloudBubble}
                            onClick={() => openImage(image)}
                        >
                            <img
                                src={image}
                                alt="פעילות בית חב״ד יפו"
                                loading="lazy"
                            />

                        </button>
                    ))}
                </section>
            </div>

            {selectedImage && (
                <div
                    className={styles.modal}
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        type="button"
                        className={styles.close}
                        onClick={() => setSelectedImage(null)}
                        aria-label="סגירת תמונה"
                    >
                        ×
                    </button>

                    <img
                        src={selectedImage}
                        alt="פעילות בית חב״ד יפו"
                        className={styles.modalImage}
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            )}
        </main>
    );
};

export default GalleryCategoryPage;