import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { whatsappLink } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface ParentInfoCtaProps {
    onRegistrationClick: (location: string) => void;
    onWhatsAppClick: (location: string) => void;
}

const ParentInfoCta = ({
    onRegistrationClick,
    onWhatsAppClick,
}: ParentInfoCtaProps) => (
    <section className={styles.ctaSection} aria-labelledby="parent-cta-title">
        <div className={styles.ctaCopy}>
            <p className={styles.ctaEyebrow}>הצעד הבא שלכם</p>
            <h2 className={styles.ctaTitle} id="parent-cta-title">
                מרגיש לכם מתאים?
            </h2>
            <p className={styles.ctaText}>
                נשמח להכיר, לענות על שאלות ולבדוק יחד התאמה לקבוצה.
            </p>
        </div>
        <div className={styles.ctaActions}>
            <Link
                className={styles.primaryButton}
                to="/daycare-registration#daycare-form"
                onClick={() => onRegistrationClick("final_cta")}
            >
                השארת פרטים לשיחת היכרות
                <ArrowLeft size={19} aria-hidden="true" />
            </Link>
            <a
                className={styles.secondaryButton}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onWhatsAppClick("final_cta")}
            >
                <MessageCircle size={19} aria-hidden="true" />
                לשיחה בוואטסאפ
            </a>
        </div>
    </section>
);

export default ParentInfoCta;
