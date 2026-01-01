import styles from "./Header.module.scss";

const Header = () => {
    return (
        <header className={styles.header}>
            <div className="container">
                <div className={styles.inner}>
                    <div className={styles.brand}>
                        <div className={styles.logo} aria-hidden="true">
                            חב״ד
                        </div>
                        <div className={styles.brandText}>
                            <strong className={styles.title}>בית חב״ד יפו</strong>
                            <span className={styles.sub}>Chabad Jaffa</span>
                        </div>
                    </div>

                    <nav className={styles.nav} aria-label="ניווט ראשי">
                        <a href="#synagogues">בתי כנסת</a>
                        <a href="#shabbat">רישום לשבת</a>
                        <a href="#activity">פעילות</a>
                        <a href="#about">אודות</a>
                        <a href="#contact">צור קשר</a>
                    </nav>

                    <div className={styles.actions}>
                        <button className={styles.lang} type="button">
                            English
                        </button>
                        <a className={styles.donate} href="#donate">
                            תרומה
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
