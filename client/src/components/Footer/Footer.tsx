// client/src/components/Footer/Footer.tsx
import Container from "../Container/Container";
import styles from "./Footer.module.scss";

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer} role="contentinfo">
            <Container className={styles.inner}>
                <div className={styles.content}>
                    <h2 className={styles.title}>בית חב״ד יפו</h2>

                    <ul className={styles.details} aria-label="פרטי יצירת קשר">
                        <li className={styles.item}>
                            <span className={styles.label}>כתובת</span>
                            <span className={styles.value}>עולי ציון 30, יפו</span>
                        </li>

                        <li className={styles.item}>
                            <span className={styles.label}>טלפון / וואטסאפ</span>
                            <a className={styles.valueLink} href="tel:0537700339">
                                053-770-0339
                            </a>
                        </li>

                        <li className={styles.item}>
                            <span className={styles.label}>שעות פעילות</span>
                            <span className={styles.value}>
                                א׳–ה׳: 10:00–16:00 · ו׳: 9:00–14:00
                            </span>
                        </li>
                    </ul>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.credit}>© {year} Tamar Tamam</p>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;
