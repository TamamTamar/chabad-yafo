import { useEffect, useState } from "react";
import {
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

    return (
        <main className={styles.page} dir="rtl">
            {showSuccess && (
                <DaycareSuccessModal onClose={() => setShowSuccess(false)} />
            )}

            <DaycareRegistrationHero />
            <DaycarePrinciplesSection />
            <DaycareRegistrationForm onSuccess={handleSuccess} />
        </main>
    );
};

export default DaycareRegistration;
