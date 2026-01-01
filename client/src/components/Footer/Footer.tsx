import styles from "./Footer.module.scss";

const Footer = () => {
    return (
        <footer id="contact" className={styles.footer}>
            <div className="container">
                <div className={styles.top}>
                    <div className={styles.brand}>
                        <div className={styles.logo} aria-hidden="true">
                            חב״ד
                        </div>
                        <div>
                            <strong className={styles.title}>בית חב״ד יפו</strong>
                            <div className={styles.sub}>Chabad Jaffa</div>
                        </div>
                    </div>

                    <div className={styles.cols}>
                        <div className={styles.col}>
                            <h3>יצירת קשר</h3>
                            <p>
                                טלפון: <a href="tel:+972000000000">03-000-0000</a>
                            </p>
                            <p>
                                וואטסאפ:{" "}
                                <a href="https://wa.me/972000000000" target="_blank" rel="noreferrer">
                                    שליחת הודעה
                                </a>
                            </p>
                            <p>
                                אימייל: <a href="mailto:info@chabadyafo.org">info@chabadyafo.org</a>
                            </p>
                        </div>

                        <div className={styles.col}>
                            <h3>כתובת</h3>
                            <p>יפו, תל אביב</p>
                            <p>
                                <a href="https://maps.google.com" target="_blank" rel="noreferrer">
                                    ניווט ב-Google Maps
                                </a>
                            </p>
                        </div>

                        <div className={styles.col}>
                            <h3>קישורים</h3>
                            <p>
                                <a href="#synagogues">בתי כנסת</a>
                            </p>
                            <p>
                                <a href="#shabbat">רישום לשבת</a>
                            </p>
                            <p>
                                <a href="#activity">פעילות</a>
                            </p>
                            <p>
                                <a href="#about">אודות</a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <span>© {new Date().getFullYear()} Tamar Tamam</span>
                    <span className={styles.dot}>•</span>
                    <a href="#privacy">מדיניות פרטיות</a>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
