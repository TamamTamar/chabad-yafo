import styles from "./ErrorPage.module.scss";

const ErrorPage = () => {
    return (
        <main className={styles.errorPage}>
            {/* שכבת הרקע העדינה */}
            <div className={styles.overlay} />

            <section className={styles.card}>
                <div className={styles.topLine} />

                <span className={styles.badge}>בקרוב ממש</span>

                <h1 className={styles.title}>עוד קצת סבלנות...</h1>

                <div className={styles.content}>
                    <p className={styles.text}>
                        אנחנו שוקדים על בניית הדף כדי להגיש לכם חוויה מדויקת, מאירה ושימושית.
                    </p>

                    <p className={styles.subText}>
                        בינתיים - אנחנו זמינים עבורכם לכל שאלה:
                    </p>
                </div>

                <a
                    href="https://wa.me/972537700339?text=שלום%20הרב%20לוי%20תמם,%20הגעתי%20דרך%20האתר%20של%20בית%20חב״ד%20יפו"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.whatsapp}
                >
                    <span>צריכים עזרה? דברו איתנו בוואטסאפ</span>
                </a>

                <footer className={styles.footer}>
                    <p className={styles.note}>
                        <strong>בית חב״ד יפו</strong> - הכתובת שלך לכל עניין יהודי
                    </p>
                </footer>
            </section>
        </main>
    );
};

export default ErrorPage;