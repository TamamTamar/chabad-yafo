import { Facebook, MessageCircle } from "lucide-react";
import styles from "./FloatingSocials.module.scss";

const FloatingSocials = () => {
    return (
        <div className={styles.wrapper} aria-label="קישורים מהירים">
            <a
                href="https://wa.me/972537700339"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.whatsapp}`}
                aria-label="שליחת הודעה בוואטסאפ"
            >
                <MessageCircle size={22} strokeWidth={1.8} />
            </a>

            <a
                href="https://facebook.com/PLACEHOLDER_PAGE"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.facebook}`}
                aria-label="מעבר לעמוד פייסבוק"
            >
                <Facebook size={22} strokeWidth={1.8} />
            </a>
        </div>
    );
};

export default FloatingSocials;
