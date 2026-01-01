import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Header.module.scss";

const Header = () => {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    // נעילת גלילה כשהתפריט פתוח (מובייל)
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const onToggleLang = () => {
        // TODO: implement language switch
        close();
    };

    return (
        <header className={styles.header}>
            <Container className={styles.inner}>
                {/* Right */}
                <div className={styles.right}>
                    <Link to="/" className={styles.brand} onClick={close}>
                        בית חב״ד יפו
                    </Link>
                </div>

                {/* Center */}
                <nav className={`${styles.nav} ${open ? styles.open : ""}`} aria-label="ניווט ראשי">
                    <div className={styles.links}>
                        <a href="#activity" onClick={close}>פעילות</a>
                        <a href="#about" onClick={close}>אודות</a>
                        <a href="#contact" onClick={close}>צור קשר</a>
                        <Link to="/donate" className={styles.donateLink} onClick={close}>תרומה</Link>
                    </div>

                    <div className={styles.actions}>
                        <Link to="/shabbat" className={styles.cta} onClick={close}>
                            רישום לשבת
                        </Link>

                        {/* במובייל זה יופיע בתוך הפאנל */}
                        <button type="button" className={styles.langInMenu} onClick={onToggleLang}>
                            English
                        </button>
                    </div>
                </nav>

                {/* Left */}
                <div className={styles.left}>
                    <button type="button" className={styles.lang} onClick={onToggleLang}>
                        English
                    </button>
                </div>

                {/* Backdrop */}
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
    );
};

export default Header;
