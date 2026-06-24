import styles from "./DaycarePrinciplesSection.module.scss";

const principles = [
    {
        title: "קבוצה קטנה ויחס אישי",
        text:
            "אנו שואפים ליצור מסגרת נעימה ומשפחתית שבה כל ילד וילדה יקבלו יחס אישי, תשומת לב והיכרות אמיתית.",
    },
    {
        title: "גינה וחוויית חוץ",
        text:
            "לרשות הילדים עומדת גינה נעימה שתאפשר משחק, תנועה, פעילות באוויר הפתוח וחיבור לטבע כחלק משגרת היום.",
    },
    {
        title: "אווירה חמה ומשפחתית",
        text:
            "סביבה בטוחה, רגועה ומכילה, המעניקה לילדים תחושת שייכות וביטחון.",
    },
    {
        title: "ערכים ומסורת יהודית",
        text:
            "היכרות עם שבת, חגים, סיפורים, שירים וערכים יהודיים בדרך חווייתית, מכבדת ומותאמת לגיל הרך.",
    },
    {
        title: "קשר אישי עם ההורים",
        text:
            "תקשורת פתוחה ושיתוף פעולה מתוך אמונה שהצלחת הילד מתחילה בעבודה משותפת של הצוות והמשפחה.",
    },
    {
        title: "מיקום מרכזי בצפון יפו",
        text:
            "מיקום נגיש בלב צפון יפו, סמוך לשוק הפשפשים ולמוקדי המגורים של משפחות רבות באזור.",
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
                המעון מתוכנן כמסגרת פרטית, נעימה ומוקפדת, המשלבת יחס אישי,
                סדר יום רגוע וחיבור טבעי לערכי הבית והקהילה.
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
