import { useState } from "react";
import styles from "./DaycareRegistration.module.scss";
import DaycareRegistrationForm from "./components/DaycareRegistrationForm";
import DaycareRegistrationHero from "./components/DaycareRegistrationHero";
import DaycareSuccessModal from "./components/DaycareSuccessModal";

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
            <DaycareRegistrationForm onSuccess={handleSuccess} />
        </main>
    );
};

export default DaycareRegistration;
