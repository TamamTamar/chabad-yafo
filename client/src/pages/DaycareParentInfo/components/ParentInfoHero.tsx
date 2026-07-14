import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { documents } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface ParentInfoHeroProps {
    onRegistrationClick: (location: string) => void;
}

const ParentInfoHero = ({ onRegistrationClick }: ParentInfoHeroProps) => (
    <section className={styles.hero} aria-labelledby="parent-info-title">
        <div className={styles.heroInner}>
            <p className={styles.eyebrow}>מרכז מידע להורים</p>
            <h1 className={styles.heroTitle} id="parent-info-title">
                מידע להורים – מעון חב״ד יפו
            </h1>
            <p className={styles.heroText}>
                כל המידע החשוב לקראת ההצטרפות למעון מרוכז כאן בצורה ברורה
                ונוחה. ניתן לקרוא באתר או להוריד את המסמכים כ־PDF.
            </p>
            <div className={styles.quickActions} aria-label="פעולות מהירות">
                <Link
                    className={styles.quickPrimaryAction}
                    to="/daycare-registration#daycare-form"
                    onClick={() => onRegistrationClick("hero_quick_actions")}
                >
                    השארת פרטים לשיחת היכרות
                    <ArrowLeft size={18} aria-hidden="true" />
                </Link>
                {documents
                    .filter((document) => document.pdfAvailable)
                    .map((document) => (
                        <a
                            className={styles.quickDocumentAction}
                            href={document.pdfPath}
                            download
                            key={document.id}
                            aria-label={`הורדת ${document.title} כ־PDF`}
                        >
                            <Download size={18} aria-hidden="true" />
                            הורדת {document.title}
                        </a>
                    ))}
            </div>
        </div>
    </section>
);

export default ParentInfoHero;
