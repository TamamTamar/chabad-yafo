import { Expand, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fieldGalleryItems } from "../daycareDonationsData";
import type { FieldGalleryItem } from "../types";
import styles from "../DaycareDonations.module.scss";
import VisualPlaceholder from "./VisualPlaceholder";

const FieldGallery = () => {
    const [selected, setSelected] = useState<FieldGalleryItem | null>(null);
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (selected && !dialog.open) dialog.showModal();
        if (!selected && dialog.open) dialog.close();
    }, [selected]);

    return (
        <section className={styles.gallerySection} aria-labelledby="field-gallery-title">
            <div className={styles.galleryHeading}>
                <p className={styles.sectionEyebrow}>מהשטח</p>
                <h2 id="field-gallery-title">כאן החלום מתחיל לקבל צורה</h2>
                <p>
                    הצצה למקום שאנו מקימים ולפינות שיהפכו בקרוב לבית
                    היומיומי של הילדים.
                </p>
            </div>

            <div className={styles.galleryGrid}>
                {fieldGalleryItems.map((item, index) => (
                    <button
                        type="button"
                        className={`${styles.galleryItem} ${
                            index === 0 || index === 4
                                ? styles.galleryItemWide
                                : ""
                        }`}
                        key={item.id}
                        onClick={() => setSelected(item)}
                        aria-label={`פתיחת תמונה: ${item.title}`}
                    >
                        <VisualPlaceholder
                            visual={item.visual}
                            className={styles.galleryVisual}
                        />
                        <span className={styles.galleryOverlay}>
                            <span>
                                <strong>{item.title}</strong>
                                <small>{item.caption}</small>
                            </span>
                            <Expand aria-hidden="true" />
                        </span>
                    </button>
                ))}
            </div>

            <dialog
                ref={dialogRef}
                className={styles.lightbox}
                aria-label={selected?.title ?? "תצוגת תמונה"}
                onCancel={(event) => {
                    event.preventDefault();
                    setSelected(null);
                }}
                onClose={() => setSelected(null)}
                onClick={(event) => {
                    if (event.target === event.currentTarget) setSelected(null);
                }}
            >
                {selected && (
                    <div className={styles.lightboxCard}>
                        <button
                            type="button"
                            className={styles.lightboxClose}
                            onClick={() => setSelected(null)}
                            aria-label="סגירת התמונה"
                        >
                            <X aria-hidden="true" />
                        </button>
                        <VisualPlaceholder
                            visual={selected.visual}
                            className={styles.lightboxVisual}
                        />
                        <div className={styles.lightboxCaption}>
                            <h3>{selected.title}</h3>
                            <p>{selected.caption}</p>
                        </div>
                    </div>
                )}
            </dialog>
        </section>
    );
};

export default FieldGallery;

