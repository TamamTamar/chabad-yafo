// HeaderDesktopNav.tsx

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
            <button type="button" className={styles.textBtn} onClick={onOpenInfo}>
                תפילין ומזוזות
            </button>

            <a href={whatsappLink} onClick={onCloseMenu} target="_blank" rel="noopener noreferrer">
                צור קשר
            </a>

            <a
                href={donateLink}
                className={styles.donate}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onCloseMenu}
            >
                תרומה
            </a>

            <Link to="/shabbat" className={styles.cta} onClick={onCloseMenu}>
                רישום לשבת
            </Link>
        </nav>
    );
};

export default HeaderDesktopNav;
