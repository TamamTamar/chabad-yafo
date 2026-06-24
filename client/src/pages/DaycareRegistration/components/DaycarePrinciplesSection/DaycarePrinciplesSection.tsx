import styles from "./DaycarePrinciplesSection.module.scss";

const principles = [
    {
        title: "קבוצה קטנה ויחס אישי",
        text:
            "קבוצה קטנה מאפשרת לצוות להכיר כל ילד באמת, לשים לב לקצב שלו ולתת מענה אישי לאורך היום.",
    },
    {
        title: "גינה וחוויית חוץ",
        text:
            "גינה נעימה מאפשרת משחק, תנועה וזמן באוויר הפתוח כחלק טבעי משגרת היום.",
    },
    {
        title: "אווירה חמה ומשפחתית",
        text:
            "מקום שבו הילד מרגיש שרואים אותו, מכירים אותו ומלווים אותו ברוגע ובביטחון.",
    },
    {
        title: "ערכים ומסורת יהודית",
        text:
            "שבת, חגים, סיפורים וערכים יהודיים מועברים בדרך נעימה, חווייתית ומותאמת לגיל הרך.",
    },
    {
        title: "קשר אישי עם ההורים",
        text:
            "עדכונים שוטפים ושיח פתוח, כדי שגם ההורים ירגישו רגועים ובטוחים לאורך היום.",
    },
    {
        title: "מיקום מרכזי בצפון יפו",
        text:
            "מיקום נגיש בלב צפון יפו, סמוך לשוק הפשפשים ולשכונות המגורים של משפחות רבות.",
    },
];

const DaycarePrinciplesSection = () => (
    <section className={styles.principlesSection}>
        <div className={styles.principlesHeader}>
            <span className={styles.sectionEyebrow}>
                העקרונות שעליהם יוקם המעון
            </span>
            <h2 className={styles.principlesTitle}>
                מה חשוב לנו במעון?
            </h2>
            <p className={styles.principlesIntro}>
                אנחנו בונים מעון קטן ומוקפד, שבו כל ילד מקבל יחס אישי,
                סדר יום רגוע ומסודר, גינה נעימה ותוכן ערכי שמותאם לגיל הרך.
            </p>
        </div>

        <div className={styles.principlesGrid}>
            {principles.map((principle, index) => (
                <article className={styles.principleCard} key={principle.title}>
                    <span className={styles.principleNumber}>
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className={styles.principleTitle}>
                        {principle.title}
                    </h3>
                    <p className={styles.principleText}>
                        {principle.text}
                    </p>
                </article>
            ))}
        </div>

        <div className={styles.trustBox}>
            <span className={styles.trustAccent} aria-hidden="true" />
            <p className={styles.trustText}>
                המעון מוקם על ידי מרכז חב"ד יפו, הפועל למעלה מ-35 שנה למען
                משפחות, ילדים וקהילת יפו.
            </p>
        </div>
    </section>
);

export default DaycarePrinciplesSection;
