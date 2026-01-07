import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../Container/Container";
import BaseDialog from "../BaseDialog/BaseDialog";
import styles from "./Header.module.scss";
import m from "./HeaderMobile.module.scss";
import dialogStyles from "../BaseDialog/BaseDialog.module.scss";
import HeaderMobileNav from "./HeaderMobileNav";
import HeaderDesktopNav from "./HeaderDesktopNav";

const WHATSAPP_PHONE = "972537700339";
const WHATSAPP_TEXT = "שלום, הגעתי מהאתר של בית חב״ד יפו ורציתי ליצור קשר.";
const DONATE_LINK = "https://www.matara.pro/nedarimplus/online/?S=aVIw";

const Header = () => {
    const [open, setOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);

    const whatsappLink = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_TEXT)}`;

    // lock scroll when menu open (mobile)
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const closeMenu = () => setOpen(false);

    const openInfo = () => {
        setInfoOpen(true);
        closeMenu();
    };

    return (
        <>
            <header className={styles.header}>
                <Container className={styles.inner}>
                    {/* Right: Brand */}
                    <div className={styles.right}>
                        <Link to="/" className={styles.brand} onClick={closeMenu}>
                            בית חב״ד יפו
                        </Link>
                    </div>

                    {/* Center: Desktop nav */}
                    <div className={styles.center}>
                        <HeaderDesktopNav
                            onOpenInfo={openInfo}
                            onCloseMenu={closeMenu}
                            whatsappLink={whatsappLink}
                            donateLink={DONATE_LINK}
                        />
                    </div>

                    {/* Left: Hamburger */}
                    <div className={styles.left}>
                        <button
                            type="button"
                            className={m.burger}
                            aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
                            aria-expanded={open}
                            onClick={() => setOpen((v) => !v)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </Container>

                <HeaderMobileNav
                    open={open}
                    onClose={closeMenu}
                    onOpenInfo={openInfo}
                    whatsappLink={whatsappLink}
                    donateLink={DONATE_LINK}
                />
            </header>

            <BaseDialog open={infoOpen} onClose={() => setInfoOpen(false)} title="תפילין ומזוזות">
                <p className={dialogStyles.text}>
                    צריכים עזרה בהנחת תפילין? בדיקת מזוזות או תפילין, או קביעת מזוזה בבית או בעסק — נשמח
                    לעזור באהבה. כתבו לנו ונחזור אליכם.
                </p>

                <div className={dialogStyles.actions}>
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={dialogStyles.cta}
                        onClick={() => setInfoOpen(false)}
                    >
                        צור קשר
                    </a>

                    <button type="button" className={dialogStyles.ghost} onClick={() => setInfoOpen(false)}>
                        סגירה
                    </button>
                </div>
            </BaseDialog>
        </>
    );
};

export default Header;
