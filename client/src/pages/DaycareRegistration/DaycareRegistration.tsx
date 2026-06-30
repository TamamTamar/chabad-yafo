import { useEffect, useState } from "react";
import {
    trackDaycareCtaClick,
    trackDaycarePageView,
} from "../../services/googleAnalyticsService";
import styles from "./DaycareRegistration.module.scss";
import DaycarePrinciplesSection from "./components/DaycarePrinciplesSection/DaycarePrinciplesSection";
import DaycareRegistrationForm from "./components/DaycareRegistrationForm/DaycareRegistrationForm";
import DaycareRegistrationHero from "./components/DaycareRegistrationHero/DaycareRegistrationHero";
import DaycareSuccessModal from "./components/DaycareSuccessModal/DaycareSuccessModal";

const DaycareRegistration = () => {
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        trackDaycarePageView({
            page_path: "/daycare-registration",
            content_name: "daycare_registration",
        });
    }, []);

    const handleSuccess = () => {
        setShowSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleStickyClick = () => {
        trackDaycareCtaClick({
            location: "sticky_mobile",
            cta_text: "השאירו פרטים",
        });
    };

    return (
        <main className={styles.page} dir="rtl">
            {showSuccess && (
                <DaycareSuccessModal onClose={() => setShowSuccess(false)} />
            )}

            <DaycareRegistrationHero />
            <DaycarePrinciplesSection />
            <DaycareRegistrationForm onSuccess={handleSuccess} />

            <a
                className={styles.mobileStickyCta}
                href="#daycare-form"
                onClick={handleStickyClick}
            >
                השאירו פרטים
            </a>
        </main>
    );
};

export default DaycareRegistration;
