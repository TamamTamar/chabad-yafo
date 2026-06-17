import styles from "./RebbeLetterInfo.module.scss";

const RebbeLetterInfo = () => {
    return (
        <aside className={styles.card}>
            <h2 className={styles.title}>
                למה כותבים לרבי?
            </h2>

            <p className={styles.description}>
                במשך עשרות שנים יהודים מכל העולם כתבו לרבי
                מליובאוויטש וביקשו ברכה, עצה ותפילה.
            </p>

            <ul className={styles.list}>
                <li className={styles.listItem}>
                    בקשה אישית
                </li>

                <li className={styles.listItem}>
                    שם לברכה
                </li>

                <li className={styles.listItem}>
                    הודיה
                </li>

                <li className={styles.listItem}>
                    תפילה לרפואה, פרנסה או הצלחה
                </li>
            </ul>

            <p className={styles.note}>
                ניתן לכתוב בכל שפה.
            </p>

            <p className={styles.footerText}>
                בעזרת ה׳ המכתבים נאספים ומועברים
                לאוהל הקדוש.
            </p>
        </aside>
    );
};

export default RebbeLetterInfo;