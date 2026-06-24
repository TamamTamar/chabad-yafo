import styles from "./DaycareRegistrationHero.module.scss";

const DaycareRegistrationHero = () => (
    <section className={styles.hero}>
        <div className={styles.heroInner}>
            <div className={styles.heroContent}>
                <p className={styles.eyebrow}>מרכז חב"ד יפו</p>
                <h1 className={styles.title}>
                    מעון חדש בצפון יפו - רישום מוקדם
                </h1>

                <div className={styles.introText}>
                    <p className={styles.noticeParagraph}>
                        מילוי הטופס אינו מחייב את מרכז חב"ד יפו ואינו מהווה
                        רישום סופי.
                    </p>
                    <p className={styles.introParagraph}>
                        מרכז חב"ד יפו פועל לקראת פתיחת מעון חדש בצפון יפו
                        לילדים בגילאי שנה עד שלוש.
                    </p>
                    <p className={styles.introParagraph}>
                        אנו מתחילים ברישום מוקדם לצורך היערכות ושריון מקומות.
                    </p>
                    <p className={styles.introParagraph}>
                        מספר המקומות מוגבל והרישום מתבצע לפי סדר הפנייה.
                    </p>
                    <p className={styles.priceText}>
                        עלות משוערת: 5,500 ₪ לחודש.
                    </p>
                </div>

                <div className={styles.heroHighlights} aria-label="עיקרי המעון">
                    <span className={styles.heroHighlight}>גילאי שנה עד שלוש</span>
                    <span className={styles.heroHighlight}>קבוצה קטנה</span>
                    <span className={styles.heroHighlight}>גינה</span>
                    <span className={styles.heroHighlight}>אווירה משפחתית</span>
                    <span className={styles.heroHighlight}>צפון יפו</span>
                </div>

                <a className={styles.heroCta} href="#daycare-form">
                    למילוי טופס רישום מוקדם
                </a>
            </div>
        </div>
    </section>
);

export default DaycareRegistrationHero;
