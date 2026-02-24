import { Facebook, MessageCircle, Instagram } from "lucide-react"; // הוספנו את Instagram
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

            {/* כפתור אינסטגרם חדש */}
            <a
                href="https://www.instagram.com/chabad_yaffo" // שנה ליוזר שלך
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.fab} ${styles.instagram}`}
                aria-label="מעבר לעמוד אינסטגרם"
            >
                <Instagram size={22} strokeWidth={1.8} />
            </a>

            <a
                href="https://www.facebook.com/profile.php?id=61551949830199" target="_blank"
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