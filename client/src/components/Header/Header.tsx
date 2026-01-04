import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Header.module.scss";
import { useLang } from "../../hooks/useLang";

const Header = () => {
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    const { lang, toggleLang, t } = useLang();

    const WHATSAPP_PHONE = "972537700339"; // בלי + ובלי 0 בהתחלה

    const WHATSAPP_LINK = useMemo(() => {
        const text = encodeURIComponent(t.whatsappText);
        return `https://wa.me/${WHATSAPP_PHONE}?text=${text}`;
    }, [t.whatsappText]);

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
        toggleLang();
        close();
    };

    const langButtonLabel = lang === "he" ? "EN" : "HE";


    return (
        <header className={styles.header}>
            <Container className={styles.inner}>
                {/* Right */}
                <div className={styles.right}>
                    <Link to="/" className={styles.brand} onClick={close}>
                        {t.brand}
                    </Link>
                </div>

                {/* Center */}
                <nav
                    className={`${styles.nav} ${open ? styles.open : ""}`}
                    aria-label={t.navLabel}
                >
                    <div className={styles.links}>
                        <a href="#activity" onClick={close}>
                            {t.activity}
                        </a>
                        <a href="#about" onClick={close}>
                            {t.about}
                        </a>

                        <a
                            href={WHATSAPP_LINK}
                            onClick={close}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t.contact}
                        </a>

                        <a
                            href="https://www.matara.pro/nedarimplus/online/?S=aVIw"
                            className={styles.secondary}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t.heroDonate}
                        </a>
                    </div>

                    <div className={styles.actions}>
                        <Link to="/shabbat" className={styles.cta} onClick={close}>
                            {t.shabbat}
                        </Link>

                        {/* במובייל זה יופיע בתוך הפאנל */}
                        <button
                            type="button"
                            className={styles.langInMenu}
                            onClick={onToggleLang}
                            aria-label={`Switch language to ${lang === "he" ? "English" : "Hebrew"}`}
                        >
                            {langButtonLabel}
                        </button>
                    </div>
                </nav>

                {/* Left */}
                <div className={styles.left}>
                    <button
                        type="button"
                        className={styles.lang}
                        onClick={onToggleLang}
                        aria-label={`Switch language to ${lang === "he" ? "English" : "Hebrew"}`}
                    >
                        {langButtonLabel}
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
                    aria-label={open ? t.closeMenu : t.openMenu}
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
