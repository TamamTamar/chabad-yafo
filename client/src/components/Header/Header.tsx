import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Header.module.scss";

const Header = () => {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    const WHATSAPP_PHONE = "972537700339"; // בלי + ובלי 0 בהתחלה
    const WHATSAPP_TEXT = "שלום, הגעתי מהאתר של בית חב״ד יפו ורציתי ליצור קשר.";

    const WHATSAPP_LINK = useMemo(() => {
        const text = encodeURIComponent(WHATSAPP_TEXT);
        return `https://wa.me/${WHATSAPP_PHONE}?text=${text}`;
    }, []);

    // Modal for "תפילין ומזוזות"
    const infoDialogRef = useRef<HTMLDialogElement | null>(null);

    const openInfo = () => {
        infoDialogRef.current?.showModal();
        close();
    };

    const closeInfo = () => {
        infoDialogRef.current?.close();
    };

    // Close dialog on backdrop click
    useEffect(() => {
        const dialog = infoDialogRef.current;
        if (!dialog) return;

        const onClick = (e: MouseEvent) => {
            const rect = dialog.getBoundingClientRect();
            const isInDialog =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (!isInDialog) dialog.close();
        };

        dialog.addEventListener("click", onClick);
        return () => dialog.removeEventListener("click", onClick);
    }, []);

    // Mobile: lock scroll when menu open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    return (
        <>
            <header className={styles.header}>
                <Container className={styles.inner}>
                    {/* Right: Brand */}
                    <div className={styles.right}>
                        <Link to="/" className={styles.brand} onClick={close}>
                            בית חב״ד יפו
                        </Link>
                    </div>

                    {/* Center nav */}
                    <nav
                        className={`${styles.nav} ${open ? styles.open : ""}`}
                        aria-label="ניווט ראשי"
                    >
                        <div className={styles.links}>
                            {/* תפילין ומזוזות - opens modal */}
                            <button type="button" className={styles.textBtn} onClick={openInfo}>
                                תפילין ומזוזות
                            </button>

                            {/* צור קשר - WhatsApp */}
                            <a
                                href={WHATSAPP_LINK}
                                onClick={close}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                צור קשר
                            </a>

                            {/* תרומה */}
                            <a
                                href="https://www.matara.pro/nedarimplus/online/?S=aVIw"
                                className={styles.donate}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={close}
                            >
                                תרומה
                            </a>
                        </div>

                        <div className={styles.actions}>
                            {/* רישום לשבת - CTA */}
                            <Link to="/shabbat" className={styles.cta} onClick={close}>
                                רישום לשבת
                            </Link>
                        </div>
                    </nav>

                    {/* Backdrop for mobile menu */}
                    <button
                        type="button"
                        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
                        aria-hidden={!open}
                        tabIndex={open ? 0 : -1}
                        onClick={close}
                    />

                    {/* Burger */}
                    <button
                        type="button"
                        className={`${styles.burger} ${open ? styles.burgerOpen : ""}`}
                        aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </Container>
            </header>

            {/* Modal: תפילין ומזוזות */}
            <dialog ref={infoDialogRef} className={styles.dialog}>
                <div className={styles.dialogCard}>
                    <div className={styles.dialogHeader}>
                        <h3 className={styles.dialogTitle}>תפילין ומזוזות</h3>
                        <button type="button" className={styles.dialogClose} onClick={closeInfo}>
                            ✕
                        </button>
                    </div>

                    <div className={styles.dialogBody}>
                        <p className={styles.dialogText}>
                            צריכים עזרה בהנחת תפילין? בדיקת מזוזות או תפילין, או קביעת מזוזה בבית או
                            בעסק — נשמח לעזור באהבה. כתבו לנו ונחזור אליכם.
                        </p>

                        <div className={styles.dialogActions}>
                            <a
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.dialogCta}
                                onClick={closeInfo}
                            >
                                צור קשר
                            </a>

                            <button type="button" className={styles.dialogGhost} onClick={closeInfo}>
                                סגירה
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default Header;
