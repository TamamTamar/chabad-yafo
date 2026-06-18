import {
    BookOpen,
    CalendarHeart,
    HandHeart,
    Home,
    MessageCircleHeart,
    UsersRound,
} from "lucide-react";

import Container from "../../../../components/Container/Container";

import styles from "./AboutActivities.module.scss";

const activities = [
    {
        icon: CalendarHeart,
        title: "שבתות וחגים",
        text: "סעודות שבת, אירועי חג, הדלקות וחוויות יהודיות לכל גיל.",
    },
    {
        icon: BookOpen,
        title: "שיעורים והתוועדויות",
        text: "מפגשי לימוד, עומק והשראה באווירה פתוחה ומקרבת.",
    },
    {
        icon: UsersRound,
        title: "משפחות וילדים",
        text: "פעילויות קהילתיות, חינוך לערכים וחיבור משפחתי סביב השנה.",
    },
    {
        icon: HandHeart,
        title: "חסד וסיוע",
        text: "עזרה למשפחות, תמיכה אישית ומענה לצרכים שעולים מהשטח.",
    },
    {
        icon: Home,
        title: "בית לכל יהודי",
        text: "מקום לבוא אליו, לשאול, להתחבר ולקבל מענה בגובה העיניים.",
    },
    {
        icon: MessageCircleHeart,
        title: "ליווי אישי",
        text: "קשר מתמשך עם אנשים ומשפחות ברגעים שמחים וגם מאתגרים.",
    },
];

const AboutActivities = () => {
    return (
        <section className={styles.section}>
            <Container>
                <header className={styles.header}>
                    <div className={styles.eyebrow}>מה אנחנו עושים</div>

                    <h2 className={styles.title}>
                        פעילות שנוגעת בחיים עצמם
                    </h2>

                    <p className={styles.subtitle}>
                        מרכז חב״ד יפו מחבר בין מסורת, שמחה ועשייה יומיומית -
                        ברחוב, בבית, בקהילה ובכל מקום שבו צריך אור.
                    </p>
                </header>

                <div className={styles.grid}>
                    {activities.map((activity) => {
                        const Icon = activity.icon;

                        return (
                            <article
                                key={activity.title}
                                className={styles.card}
                            >
                                <div className={styles.icon}>
                                    <Icon size={30} strokeWidth={2.3} />
                                </div>

                                <h3 className={styles.cardTitle}>
                                    {activity.title}
                                </h3>

                                <p className={styles.cardText}>
                                    {activity.text}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
};

export default AboutActivities;
