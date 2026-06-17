import { Link } from "react-router-dom";
import m from "./HeaderMobile.module.scss";

type Props = {
    open: boolean;
    onClose: () => void;
    onOpenInfo: () => void;
    whatsappLink: string;
};

const HeaderMobileNav = ({ open, onClose, onOpenInfo, whatsappLink }: Props) => {
    return (
        <>
            <nav className={`${m.drawer} ${open ? m.open : ""}`} aria-label="ניווט ראשי">
                <div className={m.drawerLinks}>
                    {/* כפתור לפעולת UI (פתיחת מידע) */}
                    <button type="button" className={m.drawerItem} onClick={onOpenInfo}>
                        תפילין ומזוזות
                    </button>

                    <Link
                        to="/write-to-rebbe"
                        className={m.drawerItem}
                        onClick={onClose}
                    >
                        כתבו לרבי
                    </Link>
                    {/* קישור חיצוני לוואטסאפ - מעולה ל-SEO */}
                    <a
                        href={whatsappLink}
                        className={m.drawerItem}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                    >
                        צור קשר
                    </a>

                    {/* קישור חיצוני לתרומה */}
                    <Link
                        to="/donate"
                        className={m.drawerItem}
                        onClick={onClose}
                    >
                        תרומה
                    </Link>
                </div>

                <div className={m.drawerActions}>
                    {/* Link של React Router - הכי טוב ל-SEO לניווט בתוך האתר */}
                    <Link to="/shabbat" className={m.drawerCta} onClick={onClose}>
                        רישום לשבת
                    </Link>
                </div>
            </nav>

            {/* רקע כהה לסגירה */}
            <button
                type="button"
                className={`${m.backdrop} ${open ? m.backdropOpen : ""}`}
                aria-hidden={!open}
                tabIndex={open ? 0 : -1}
                onClick={onClose}
            />
        </>
    );
};

export default HeaderMobileNav;