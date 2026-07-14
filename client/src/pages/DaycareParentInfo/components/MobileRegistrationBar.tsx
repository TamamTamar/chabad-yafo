import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface MobileRegistrationBarProps {
    onRegistrationClick: (location: string) => void;
    onWhatsAppClick: (location: string) => void;
}

const MobileRegistrationBar = ({
    onRegistrationClick,
    onWhatsAppClick,
}: MobileRegistrationBarProps) => (
    <div className={styles.mobileBar} aria-label="פעולות הרשמה מהירות">
        <div className={styles.mobileBarInner}>
            <Link
                className={styles.mobilePrimaryButton}
                to="/daycare-registration#daycare-form"
                onClick={() => onRegistrationClick("mobile_bar")}
            >
                השארת פרטים
            </Link>
            <a
                className={styles.mobileWhatsAppButton}
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="פתיחת שיחה בוואטסאפ"
                onClick={() => onWhatsAppClick("mobile_bar")}
            >
                <MessageCircle size={23} aria-hidden="true" />
            </a>
        </div>
    </div>
);

export default MobileRegistrationBar;
