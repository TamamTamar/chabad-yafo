import Container from "../../../../components/Container/Container";

import styles from "./AboutStory.module.scss";

const storyHighlights = [
    "בית פתוח לתושבי יפו, משפחות, צעירים, סטודנטים ומבקרים",
    "פעילות יהודית לאורך השנה: שבתות, חגים, שיעורים, חסד וליווי אישי",
    "חיבור חי בין מסורת, קהילה ואהבת ישראל בלב העיר",
];

const AboutStory = () => {
    return (
        <section className={styles.section}>
            <Container>
                <div className={styles.layout}>
                    <div className={styles.media}>
                        <div className={styles.image} />
                        <div className={styles.badge}>
                            <span className={styles.badgeValue}>מאז 1986</span>
                            <span className={styles.badgeText}>מוסיפים אור ביפו</span>
                        </div>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.eyebrow}>הסיפור שלנו</div>

                        <h2 className={styles.title}>
                            מקום של לב, יהדות וקהילה
                        </h2>

                        <p className={styles.text}>
                            מרכז חב״ד יפו פועל כבר עשרות שנים כדי להיות כתובת חמה
                            לכל יהודי ויהודייה בעיר. מהדלקת נרות שבת ועד אירועי
                            חגים גדולים, משיעורי תורה ועד עזרה למשפחה שצריכה יד
                            מושטת - הכל נעשה בגישה אישית, שמחה ומקרבת.
                        </p>

                        <p className={styles.text}>
                            הפעילות שלנו צומחת מתוך יפו עצמה: עיר צבעונית,
                            מגוונת ומלאת נשמה. אנחנו מאמינים שכל מפגש קטן יכול
                            לפתוח דלת גדולה יותר לחיבור, משמעות ושייכות.
                        </p>

                        <ul className={styles.list}>
                            {storyHighlights.map((highlight) => (
                                <li key={highlight}>{highlight}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default AboutStory;
