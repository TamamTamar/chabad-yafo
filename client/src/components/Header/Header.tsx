import { useState } from "react";
import { Link } from "react-router-dom";
import Container from "../Container/Container";
import styles from "./Header.module.scss";

const Header = () => {
    const [open, setOpen] = useState(false);

    const close = () => setOpen(false);

    return (
        <header className={styles.header}>
            <a className={styles.skip} href="#main">
                דילוג לתוכן
            </a>

            <Container className={styles.inner}>
                <div className={styles.brand}>
                    <div className={styles.logo} aria-hidden="true">
                        חב״ד
                    </div>
                    <div className={styles.brandText}>
                        <strong>בית חב״ד יפו</strong>
                        <span>Chabad Jaffa</span>
                    </div>
                </div>

                <nav className={`${styles.nav} ${open ? styles.open : ""}`} aria-label="ניווט ראשי">
                    <a href="#synagogues" onClick={close}>בתי כנסת</a>
                    <a href="#activity" onClick={close}>פעילות</a>
                    <a href="#about" onClick={close}>אודות</a>
                    <a href="#contact" onClick={close}>צור קשר</a>

                    <Link to="/shabbat" className={styles.cta} onClick={close}>
                        רישום לשבת
                    </Link>
                </nav>

                <button
                    type="button"
                    className={styles.burger}
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
