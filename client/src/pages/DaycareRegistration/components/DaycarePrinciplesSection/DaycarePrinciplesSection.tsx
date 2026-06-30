import {
    BookHeart,
    Flower2,
    HeartHandshake,
    UsersRound,
} from "lucide-react";
import styles from "./DaycarePrinciplesSection.module.scss";

const principles = [
    {
        icon: UsersRound,
        title: "קבוצה קטנה ויחס אישי",
        text: "מסגרת אינטימית שמאפשרת להכיר כל ילד באמת ולתת לו מקום לאורך היום.",
    },
    {
        icon: Flower2,
        title: "חצר וגינה",
        text: "מרחב פתוח למשחק, תנועה ואוויר, כחלק טבעי ובריא מהיום של הילדים.",
    },
    {
        icon: BookHeart,
        title: "ערכים ומסורת יהודית",
        text: "שבת, חגים, סיפורים וערכים יהודיים בדרך נעימה, חווייתית ומותאמת לגיל הרך.",
    },
    {
        icon: HeartHandshake,
        title: "קשר אישי עם ההורים",
        text: "שיח פתוח ועדכונים שוטפים, כדי שגם ההורים ירגישו רגועים ובטוחים.",
    },
];

const DaycarePrinciplesSection = () => (
    <section className={styles.principlesSection}>
        <div className={styles.principlesHeader}>
            <span className={styles.sectionEyebrow}>
                למה לבחור במעון שלנו?
            </span>
            <h2 className={styles.principlesTitle}>
                מה הילדים יקבלו במעון?
            </h2>
            <p className={styles.principlesIntro}>
                המעון החדש נבנה עבור הורים שמחפשים מסגרת קטנה, חמה
                ומושקעת, שבה הילד מרגיש בטוח, נראה ואהוב.
            </p>
        </div>

        <div className={styles.principlesGrid}>
            {principles.map((principle) => (
                <article className={styles.principleCard} key={principle.title}>
                    <span className={styles.principleIcon} aria-hidden="true">
                        <principle.icon size={24} strokeWidth={1.8} />
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

        <p className={styles.trustText}>
            בית חב"ד יפו מקים את המעון מתוך רצון לתת למשפחות ביפו מסגרת
            קרובה, חמה ובטוחה לגיל הרך. השאירו פרטים ונחזור אליכם לשיחת
            היכרות קצרה, כדי לספר על המעון ולבדוק יחד אם זה מתאים לכם.
        </p>
    </section>
);

export default DaycarePrinciplesSection;
