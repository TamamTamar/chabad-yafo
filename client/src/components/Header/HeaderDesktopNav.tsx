import { Link } from "react-router-dom";
import styles from "./Header.module.scss";

type Props = {
    onOpenInfo: () => void;
    onCloseMenu: () => void;
    whatsappLink: string;
};

const HeaderDesktopNav = ({ onOpenInfo, onCloseMenu, whatsappLink }: Props) => {
    return (
        <nav className={styles.navDesktop} aria-label="ניווט ראשי">
            {/* כפתור טקסט - תפילין ומזוזות */}
            <button type="button" className={styles.textBtn} onClick={onOpenInfo}>
                תפילין ומזוזות
            </button>

            <Link
                to="/write-to-rebbe"
                className={styles.navLink}
                onClick={onCloseMenu}
            >
                כתבו לרבי
            </Link>

            <Link
                to="/about"
                className={styles.navLink}
                onClick={onCloseMenu}
            >
                אודות
            </Link>

            <Link
                to="/gallery"
                className={styles.navLink}
                onClick={onCloseMenu}
            >
                גלריה
            </Link>

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

            {/* לינק שותפות - משלב navLink ועיצוב ספציפי */}
            <Link
                to="/donate"
                className={styles.cta}
                onClick={onCloseMenu}
            >
                לקחת חלק
            </Link>

        </nav>
    );
};

export default HeaderDesktopNav;
