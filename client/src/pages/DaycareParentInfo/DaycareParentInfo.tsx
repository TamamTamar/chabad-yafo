import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Baby,
    BookHeart,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock,
    FileText,
    HeartHandshake,
    Home,
    MapPin,
    MessageCircle,
    PhoneCall,
    ShieldCheck,
    Sparkles,
    Sprout,
    Trees,
    UsersRound,
} from "lucide-react";
import {
    trackDaycareCtaClick,
    trackDaycarePageView,
    trackDaycareWhatsAppClick,
    trackWhatsAppClick,
} from "../../services/googleAnalyticsService";
import styles from "./DaycareParentInfo.module.scss";

const WHATSAPP_PHONE = "972537700339";
const WHATSAPP_TEXT =
    "שלום, בהמשך לרישום הראשוני למעון חב״ד יפו יש לי שאלה נוספת.";
const whatsappLink = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    WHATSAPP_TEXT
)}`;

const quickFacts = [
    { icon: Baby, label: "גילאים", value: "0-3" },
    { icon: MapPin, label: "מיקום", value: "מרכז שוק הפשפשים ביפו" },
    { icon: CalendarDays, label: "סטטוס", value: "לקראת פתיחה בספטמבר" },
    { icon: UsersRound, label: "אופי", value: "קבוצה קטנה, חמה ומשפחתית" },
    {
        icon: Clock,
        label: "שעות",
        value: "ייקבעו בהתאם לצרכי המשפחות הנרשמות",
    },
    {
        icon: FileText,
        label: "מסלולים ועלויות",
        value: "יימסרו בשיחת היכרות",
    },
];

const approachCards = [
    {
        icon: ShieldCheck,
        title: "ביטחון לפני הכל",
        text: "בגיל הרך תחושת ביטחון היא הבסיס להתפתחות. לכן הדגש הוא על קצב רגוע, פנים מוכרות וסביבה יציבה.",
    },
    {
        icon: HeartHandshake,
        title: "קשר אישי באמת",
        text: "מסגרת קטנה מאפשרת להכיר את הילד, את המשפחה ואת הצרכים האישיים שנוצרים לאורך הדרך.",
    },
    {
        icon: Sprout,
        title: "גדילה דרך חוויה",
        text: "משחק, תנועה, שירים, חצר, יצירה וסיפורים יוצרים למידה טבעית שמתאימה לגיל הרך.",
    },
];

const dailyRhythm = [
    "קבלת בוקר רגועה והיכרות מחדש עם המרחב",
    "משחק חופשי, קשר אישי וכניסה הדרגתית ליום",
    "ארוחה קלה ומפגש קצר המותאם לגיל הילדים",
    "פעילות חווייתית: שירים, סיפור, תנועה או יצירה",
    "זמן חצר ומשחק פתוח",
    "ארוחת צהריים ומנוחה",
    "התעוררות הדרגתית, משחק רגוע וסיום יום נעים",
];

const childExperiences = [
    { icon: Home, title: "מרחב מוכר", text: "תחושת בית וסביבה קטנה שקל להתרגל אליה." },
    { icon: Trees, title: "חצר ותנועה", text: "זמן משחק וגילוי במרחב פתוח כחלק מהיום." },
    { icon: BookHeart, title: "שירים וסיפורים", text: "מפגשים קצרים, נעימים ומותאמי גיל." },
    { icon: Sparkles, title: "מסורת חמה", text: "שבת, חגים, ברכות וערכים בגישה שמחה ולא מלחיצה." },
];

const parentBenefits = [
    "קשר אישי ושקוף עם הצוות",
    "מקום מסודר לשאלות אחרי השיחה הראשונה",
    "עדכונים אחראיים ככל שהפתיחה מתקדמת",
    "מידע על שעות, מסלולים ועלויות בשיחה אישית",
    "מסמכים מסודרים בהמשך: ציוד, תפריט, חופשות ונהלים",
];

const nextSteps = [
    "שיחת היכרות ראשונית",
    "השלמת שאלות וקבלת תמונה רחבה",
    "תיאום ביקור או שיחה נוספת במידת הצורך",
    "עדכון לגבי שעות פעילות, מסלולים ועלויות",
    "הרשמה והשלמת מסמכים",
    "הכנה רגועה לתהליך הסתגלות",
];

const pendingDetails = [
    "שעות פעילות סופיות",
    "מסלולים ועלויות",
    "פרטי צוות",
    "סדרי בטיחות ונהלים",
    "רשימת ציוד",
    "תפריט לדוגמה",
    "לוח חופשות",
    "מסמכי הרשמה",
];

const faqs = [
    {
        question: "למי מיועד העמוד הזה?",
        answer: "העמוד מיועד למשפחות שביצעו רישום ראשוני או שוחחו איתנו, ורוצות לקבל תמונה מסודרת יותר לפני המשך התהליך.",
    },
    {
        question: "מתי המעון צפוי להיפתח?",
        answer: "המעון נמצא בהיערכות לפתיחה בספטמבר הקרוב. פרטים סופיים יתעדכנו ככל שההיערכות תתקדם.",
    },
    {
        question: "האם המעון מתאים גם למשפחות שאינן חב״ד?",
        answer: "כן. המעון מיועד למשפחות מיפו והסביבה שמחפשות מסגרת חמה, בטוחה, ערכית ואישית לגיל הרך.",
    },
    {
        question: "מה צפויות להיות שעות הפעילות?",
        answer: "שעות הפעילות הסופיות ייקבעו בהתאם לצרכי המשפחות הנרשמות. בשיחה אישית נוכל להבין יחד איזה מסלול מתאים לכם.",
    },
    {
        question: "האם העלות מופיעה באתר?",
        answer: "בשלב זה פרטים מלאים על מסלולים ועלויות יימסרו בשיחת היכרות, ולא מוצגים בעמוד הראשי.",
    },
    {
        question: "כמה ילדים יהיו בקבוצה?",
        answer: "הכוונה היא לפתוח בקבוצה קטנה ומוגבלת במספר המקומות, כדי לשמור על יחס אישי ותחושת בית.",
    },
    {
        question: "איך תיראה ההסתגלות?",
        answer: "תהליך ההסתגלות יתוכנן בצורה מדורגת ורגועה, בהתאם לגיל הילדים ולצרכים של כל משפחה.",
    },
    {
        question: "מה תהיה הגישה היהודית במעון?",
        answer: "יהדות חמה ונעימה: שבת, חגים, ברכות, שירים וערכים טובים, הכל בגישה מותאמת לגיל הרך ולא מלחיצה.",
    },
    {
        question: "האם יהיו מסמכים מסודרים לפני הפתיחה?",
        answer: "כן. לקראת הפתיחה יתווספו מסמכים רלוונטיים כמו רשימת ציוד, תפריט לדוגמה, לוח חופשות ונהלים.",
    },
];

const sectionVariants = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
};

const trackCta = (ctaText: string, location: string) => {
    trackDaycareCtaClick({
        location,
        cta_text: ctaText,
        content_name: "daycare_parent_info",
    });
};

const useNoIndex = () => {
    useEffect(() => {
        const title = document.title;
        document.title = "מידע להורים | מעון חב״ד יפו";

        const existingMeta = document.querySelector<HTMLMetaElement>(
            'meta[name="robots"]'
        );
        const previousContent = existingMeta?.getAttribute("content");
        const meta = existingMeta ?? document.createElement("meta");

        meta.setAttribute("name", "robots");
        meta.setAttribute("content", "noindex, nofollow");

        if (!existingMeta) {
            document.head.appendChild(meta);
        }

        return () => {
            document.title = title;

            if (existingMeta && previousContent) {
                existingMeta.setAttribute("content", previousContent);
                return;
            }

            if (existingMeta && !previousContent) {
                existingMeta.removeAttribute("content");
                return;
            }

            meta.remove();
        };
    }, []);
};

const DaycareParentInfo = () => {
    const [openFaq, setOpenFaq] = useState(0);

    useNoIndex();

    useEffect(() => {
        trackDaycarePageView({
            page_path: "/daycare-parent-info",
            content_name: "daycare_parent_info",
            gated: false,
        });
    }, []);

    const reducedMotion = useMemo(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        []
    );

    const motionProps = {
        initial: reducedMotion ? undefined : "hidden",
        whileInView: reducedMotion ? undefined : "visible",
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.55, ease: "easeOut" },
        variants: sectionVariants,
    };

    const handleWhatsAppClick = (location: string) => {
        trackCta("שלחו שאלה בוואטסאפ", location);
        trackWhatsAppClick({ location: `daycare_parent_info_${location}` });
        trackDaycareWhatsAppClick({ location });
    };

    return (
        <main className={styles.page} dir="rtl">
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <motion.div className={styles.heroContent} {...motionProps}>
                        <p className={styles.eyebrow}>לאחר רישום ראשוני</p>
                        <h1>מידע להורים על מעון חב״ד יפו</h1>
                        <p className={styles.heroLead}>
                            כאן ריכזנו עבורכם את הדברים החשובים לקראת פתיחת
                            המעון: הגישה, אופי היום, מה הילד פוגש, מה עדיין
                            מתעדכן ומהם השלבים הבאים.
                        </p>
                        <p className={styles.heroNote}>
                            חלק מהפרטים עדיין מתגבשים לקראת הפתיחה בספטמבר,
                            ואנחנו מעדכנים אותם בצורה אחראית כשהם נסגרים.
                        </p>

                        <div className={styles.heroActions}>
                            <a
                                className={styles.primaryCta}
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleWhatsAppClick("hero_primary")}
                            >
                                <MessageCircle size={20} strokeWidth={2} />
                                שלחו שאלה בוואטסאפ
                            </a>
                            <Link
                                className={styles.secondaryCta}
                                to="/daycare-enrollment"
                                onClick={() =>
                                    trackCta("המשיכו לרישום מלא", "hero_secondary")
                                }
                            >
                                <PhoneCall size={20} strokeWidth={2} />
                                המשיכו לרישום מלא
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className={styles.quickFacts} aria-labelledby="quick-facts-title">
                <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>מה חשוב לדעת בקצרה</p>
                    <h2 id="quick-facts-title">תמונה מסודרת לפני שמתקדמים</h2>
                </div>
                <div className={styles.factGrid}>
                    {quickFacts.map((fact) => (
                        <motion.article
                            className={styles.factCard}
                            key={fact.label}
                            {...motionProps}
                        >
                            <fact.icon size={23} strokeWidth={1.8} aria-hidden="true" />
                            <span>{fact.label}</span>
                            <strong>{fact.value}</strong>
                        </motion.article>
                    ))}
                </div>
            </section>

            <motion.section
                className={styles.approachSection}
                aria-labelledby="approach-title"
                {...motionProps}
            >
                <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>הגישה שלנו</p>
                    <h2 id="approach-title">קודם כל ילד שמרגיש בטוח</h2>
                    <p>
                        מעון לגיל הרך צריך לתת הרבה מעבר למסגרת. הוא צריך להיות
                        מקום שבו הילד מכיר את המבוגרים, מרגיש שרואים אותו, וגדל
                        בתוך שגרה חמה, רגועה ומותאמת גיל.
                    </p>
                </div>
                <div className={styles.cardGrid}>
                    {approachCards.map((card) => (
                        <article className={styles.infoCard} key={card.title}>
                            <span className={styles.cardIcon} aria-hidden="true">
                                <card.icon size={24} strokeWidth={1.8} />
                            </span>
                            <h3>{card.title}</h3>
                            <p>{card.text}</p>
                        </article>
                    ))}
                </div>
            </motion.section>

            <motion.section
                className={styles.rhythmSection}
                aria-labelledby="rhythm-title"
                {...motionProps}
            >
                <div className={styles.rhythmIntro}>
                    <p className={styles.eyebrow}>סדר יום לדוגמה</p>
                    <h2 id="rhythm-title">איך יכול להיראות היום של הילד?</h2>
                    <p>
                        זהו מבנה כללי בלבד. סדר היום הסופי יותאם לגיל הילדים,
                        להרכב הקבוצה ולשעות הפעילות שייקבעו.
                    </p>
                </div>
                <ol className={styles.timeline}>
                    {dailyRhythm.map((item) => (
                        <li key={item}>
                            <span aria-hidden="true" />
                            <p>{item}</p>
                        </li>
                    ))}
                </ol>
            </motion.section>

            <motion.section
                className={styles.experienceSection}
                aria-labelledby="experience-title"
                {...motionProps}
            >
                <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>מה הילד פוגש אצלנו</p>
                    <h2 id="experience-title">יום קטן, עשיר וברור</h2>
                </div>
                <div className={styles.experienceGrid}>
                    {childExperiences.map((item) => (
                        <article className={styles.experienceItem} key={item.title}>
                            <item.icon size={24} strokeWidth={1.8} aria-hidden="true" />
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </div>
            </motion.section>

            <motion.section
                className={styles.parentsSection}
                aria-labelledby="parents-title"
                {...motionProps}
            >
                <div>
                    <p className={styles.eyebrow}>גם ההורים צריכים ביטחון</p>
                    <h2 id="parents-title">מה אתם מקבלים בהמשך התהליך?</h2>
                    <p>
                        המטרה היא שההתקדמות תהיה רגועה וברורה: בלי לחץ, בלי
                        הבטחות לא סופיות, ועם מקום פתוח לשאלות שלכם.
                    </p>
                </div>
                <ul className={styles.checkList}>
                    {parentBenefits.map((item) => (
                        <li key={item}>
                            <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </motion.section>

            <motion.section
                className={styles.stepsSection}
                aria-labelledby="steps-title"
                {...motionProps}
            >
                <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>המשך הדרך</p>
                    <h2 id="steps-title">כך נראה תהליך ההתקדמות</h2>
                </div>
                <ol className={styles.stepsGrid}>
                    {nextSteps.map((step, index) => (
                        <li key={step}>
                            <span>{index + 1}</span>
                            <p>{step}</p>
                        </li>
                    ))}
                </ol>
            </motion.section>

            <motion.section
                className={styles.pendingSection}
                aria-labelledby="pending-title"
                {...motionProps}
            >
                <div className={styles.pendingCopy}>
                    <p className={styles.eyebrow}>מתעדכן לקראת הפתיחה</p>
                    <h2 id="pending-title">פרטים שיתווספו בצורה מסודרת</h2>
                    <p>
                        במקום לפרסם מידע לא סופי, נעדכן את הפרטים הבאים כשהם
                        ייסגרו. כך ההורים מקבלים תמונה אחראית ומדויקת יותר.
                    </p>
                </div>
                <div className={styles.pendingGrid}>
                    {pendingDetails.map((item) => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
            </motion.section>

            <motion.section
                className={styles.faqSection}
                aria-labelledby="faq-title"
                {...motionProps}
            >
                <div className={styles.sectionHeader}>
                    <p className={styles.eyebrow}>שאלות נפוצות</p>
                    <h2 id="faq-title">שאלות נפוצות לקראת המשך התהליך</h2>
                </div>
                <div className={styles.faqList}>
                    {faqs.map((faq, index) => {
                        const isOpen = openFaq === index;

                        return (
                            <article className={styles.faqItem} key={faq.question}>
                                <button
                                    type="button"
                                    className={styles.faqButton}
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-answer-${index}`}
                                    onClick={() =>
                                        setOpenFaq((current) =>
                                            current === index ? -1 : index
                                        )
                                    }
                                >
                                    <span>{faq.question}</span>
                                    <ChevronDown
                                        className={isOpen ? styles.chevronOpen : ""}
                                        size={22}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    />
                                </button>
                                <div
                                    id={`faq-answer-${index}`}
                                    className={styles.faqAnswer}
                                    hidden={!isOpen}
                                >
                                    <p>{faq.answer}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </motion.section>

            <section className={styles.finalCta} aria-labelledby="final-cta-title">
                <p className={styles.eyebrow}>נשארה שאלה פתוחה?</p>
                <h2 id="final-cta-title">נשארה שאלה אחרי הרישום?</h2>
                <p>
                    נשמח לענות בצורה אישית, להסביר את השלבים הבאים ולעדכן
                    בפרטים שמתאימים למשפחה שלכם.
                </p>
                <div className={styles.heroActions}>
                    <a
                        className={styles.primaryCta}
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleWhatsAppClick("final_primary")}
                    >
                        <MessageCircle size={20} strokeWidth={2} />
                        שלחו שאלה בוואטסאפ
                    </a>
                    <Link
                        className={styles.secondaryCta}
                        to="/daycare-enrollment"
                        onClick={() =>
                            trackCta("מעבר לרישום מלא", "final_secondary")
                        }
                    >
                        מעבר לרישום מלא
                    </Link>
                </div>
            </section>
        </main>
    );
};

export default DaycareParentInfo;
