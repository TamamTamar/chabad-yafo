import {
    Facebook,
    Instagram,
    MessageCircle,
    MapPin,
    Phone,
    Mail,
} from "lucide-react";

import {
    trackPhoneClick,
    trackWhatsAppClick,
} from "../../services/googleAnalyticsService";
import Container from "../Container/Container";
import styles from "./Footer.module.scss";

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <Container>
                <div className={styles.inner}>
                    <div className={styles.brand}>
                        <h2 className={styles.title}>בית חב״ד יפו</h2>
                        <p className={styles.subtitle}>בית של יהדות בלב יפו</p>
                    </div>

                    <div className={styles.contacts}>
                        <a
                            href="tel:0537700339"
                            className={styles.contact}
                            onClick={() => trackPhoneClick({ location: "footer" })}
                        >
                            <Phone size={16} />
                            <span>053-770-0339</span>
                        </a>

                        <a href="mailto:LchabadYaffo@gmail.com" className={styles.contact}>
                            <Mail size={16} />
                            <span>LchabadYaffo@gmail.com</span>
                        </a>

                        <a
                            href="https://maps.google.com/?q=עולי+ציון+30+יפו"
                            target="_blank"
                            rel="noreferrer"
                            className={styles.contact}
                        >
                            <MapPin size={16} />
                            <span>עולי ציון 30, יפו</span>
                        </a>
                    </div>

                    <div className={styles.socials}>
                        <a
                            href="https://wa.me/972537700339"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="וואטסאפ"
                            className={styles.social}
                            onClick={() => trackWhatsAppClick({ location: "footer" })}
                        >
                            <MessageCircle size={18} />
                        </a>

                        <a href="https://www.instagram.com/chabad_yaffo" target="_blank" rel="noreferrer" aria-label="אינסטגרם" className={styles.social}>
                            <Instagram size={18} />
                        </a>

                        <a href="https://www.facebook.com/profile.php?id=615519498301" target="_blank" rel="noreferrer" aria-label="פייסבוק" className={styles.social}>
                            <Facebook size={18} />
                        </a>
                    </div>

                    <div className={styles.bottom}>
                        © {year} Tamar Tamam
                    </div>
                </div>
            </Container>
        </footer>
    );
};

export default Footer;
