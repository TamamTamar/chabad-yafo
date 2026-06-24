import { useState } from "react";
import styles from "./DaycareRegistration.module.scss";
import DaycarePrinciplesSection from "./components/DaycarePrinciplesSection/DaycarePrinciplesSection";
import DaycareRegistrationForm from "./components/DaycareRegistrationForm/DaycareRegistrationForm";
import DaycareRegistrationHero from "./components/DaycareRegistrationHero/DaycareRegistrationHero";
import DaycareSuccessModal from "./components/DaycareSuccessModal/DaycareSuccessModal";

const DaycareRegistration = () => {
    const [showSuccess, setShowSuccess] = useState(false);

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
