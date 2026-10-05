import styles from "./DaycareRegistrationHero.module.scss";
import {
    trackDaycareCtaClick,
    trackDaycareWhatsAppClick,
    trackWhatsAppClick,
} from "../../../../services/googleAnalyticsService";

const DAYCARE_WHATSAPP_PHONE = "972537700339";
const DAYCARE_WHATSAPP_TEXT =
    "שלום, אשמח לשמוע פרטים על מעון חב״ד יפו ולבדוק אם יש מקום פנוי לילד/ה שלי.";
const daycareWhatsAppLink = `https://wa.me/${DAYCARE_WHATSAPP_PHONE}?text=${encodeURIComponent(
    DAYCARE_WHATSAPP_TEXT
)}`;

const trackHeroCta = (ctaText: string, location: string) => {
    trackDaycareCtaClick({
        location,
        cta_text: ctaText,
    });
};

const DaycareRegistrationHero = () => (
    <section className={styles.hero}>
        <div className={styles.heroInner}>
            <div className={styles.heroContent}>
                <p className={styles.eyebrow}>נותרו מספר מקומות פנויים</p>
                <h1 className={styles.title}>
                    מצטרפים למעון חב״ד יפו
                </h1>
                <p className={styles.valueStatement}>
                    המעון פעיל באזור שוק הפשפשים, והרישום עדיין פתוח
                </p>

                <p className={styles.trustLine}>
                    מעון קטן וחם לילדי יפו, עם דגש על{" "}
                    <strong>ביטחון</strong>, <strong>צוות אוהב</strong>,{" "}
                    <strong>קצב רגוע</strong> וסביבה ערכית.
                </p>

                <div className={styles.heroHighlights} aria-label="עיקרי המעון">
                    <span className={styles.heroHighlight}>חצר וגינה</span>
                    <span className={styles.heroHighlight}>קבוצה קטנה</span>
                    <span className={styles.heroHighlight}>קשר קרוב עם ההורים</span>
                    <span className={styles.heroHighlight}>ערכים ומסורת</span>
                </div>

                <div className={styles.heroActions}>
                    <a
                        className={styles.heroCta}
                        href="#daycare-form"
                        onClick={() => trackHeroCta("השאירו פרטים", "hero_primary")}
                    >
                        השאירו פרטים עכשיו
                    </a>
                    <a
                        className={styles.secondaryCta}
                        href={daycareWhatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                            trackHeroCta(
                                "דברו איתנו בוואטסאפ",
                                "hero_secondary"
                            );
                            trackWhatsAppClick({
                                location: "daycare_hero_secondary",
                            });
                            trackDaycareWhatsAppClick({
                                location: "hero_secondary",
                            });
                        }}
                    >
                        דברו איתנו בוואטסאפ
                    </a>
                </div>

                <p className={styles.scarcityText}>
                    נותרו מספר מקומות פנויים, תוך שמירה על קבוצה קטנה ואווירה רגועה.
                </p>
            </div>
        </div>
    </section>
);

export default DaycareRegistrationHero;
