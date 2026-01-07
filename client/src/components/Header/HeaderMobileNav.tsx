import { Link } from "react-router-dom";
import m from "./HeaderMobile.module.scss";

type Props = {
    open: boolean;
    onClose: () => void;
    onOpenInfo: () => void;
    whatsappLink: string;
    donateLink: string;
};

const HeaderMobileNav = ({ open, onClose, onOpenInfo, whatsappLink, donateLink }: Props) => {
    return (
        <>
            <nav className={`${m.drawer} ${open ? m.open : ""}`} aria-label="ניווט ראשי">
                <div className={m.drawerLinks}>
                    <button type="button" className={m.drawerItem} onClick={onOpenInfo}>
                        תפילין ומזוזות
                    </button>

                    <a
                        className={m.drawerItem}
                        href={whatsappLink}
                        onClick={onClose}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        צור קשר
                    </a>

                    <a
                        className={m.drawerItem}
                        href={donateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                    >
                        תרומה
                    </a>

                </div>

                <div className={m.drawerActions}>
                    <Link to="/shabbat" className={m.drawerCta} onClick={onClose}>
                        רישום לשבת
                    </Link>
                </div>
            </nav>

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
