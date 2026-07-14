import { Facebook, Instagram, MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { trackWhatsAppClick } from "../../services/googleAnalyticsService";
import styles from "./FloatingSocials.module.scss";

const FloatingSocials = () => {
    const { pathname } = useLocation();

    if (pathname === "/daycare-parent-info") {
        return null;
    }

    return (
        <div className={styles.wrapper} aria-label="קישורים מהירים">
            <a
                href="https://wa.me/972537700339"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.whatsapp}`}
                aria-label="שליחת הודעה בוואטסאפ"
                onClick={() => trackWhatsAppClick({ location: "floating_socials" })}
            >
                <MessageCircle size={20} strokeWidth={1.8} />
            </a>

            <a
                href="https://www.instagram.com/chabad_yaffo"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.instagram} ${styles.secondarySocial}`}
                aria-label="מעבר לעמוד אינסטגרם"
            >
                <Instagram size={20} strokeWidth={1.8} />
            </a>

            <a
                href="https://www.facebook.com/profile.php?id=61551949830199"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.facebook} ${styles.secondarySocial}`}
                aria-label="מעבר לעמוד פייסבוק"
            >
                <Facebook size={20} strokeWidth={1.8} />
            </a>
        </div>
    );
};

export default FloatingSocials;
