import { Link } from "react-router-dom";
import styles from "./Header.module.scss";

type Props = {
    onOpenInfo: () => void;
    onCloseMenu: () => void;
    whatsappLink: string;
    donateLink: string;
};

const HeaderDesktopNav = ({ onOpenInfo, onCloseMenu, whatsappLink, donateLink }: Props) => {
    return (
        <nav className={styles.navDesktop} aria-label="ניווט ראשי">
            {/* כפתור טקסט - תפילין ומזוזות */}
            <button type="button" className={styles.textBtn} onClick={onOpenInfo}>
                תפילין ומזוזות
            </button>

            {/* לינק רגיל - צור קשר */}
            <a 
                href={whatsappLink} 
                className={styles.navLink} 
                onClick={onCloseMenu} 
                target="_blank" 
                rel="noopener noreferrer"
            >
                צור קשר
            </a>

            {/* לינק תרומה - משלב navLink ועיצוב ספציפי */}
            <a
                href={donateLink}
                className={`${styles.navLink} ${styles.donate}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onCloseMenu}
            >
                תרומה
            </a>

            {/* כפתור ה-CTA - רישום לשבת */}
            <Link to="/shabbat" className={styles.cta} onClick={onCloseMenu}>
                רישום לשבת
            </Link>
        </nav>
    );
};

export default HeaderDesktopNav;