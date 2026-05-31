import BenefitsSection from "./components/BenefitsSection";
import HeroSection from "./components/HeroSection";
import SurveyForm from "./components/SurveyForm";
import styles from "./Families.module.scss";

const Families = () => {
    return (
        <main className={styles.page}>
            <HeroSection />
            <BenefitsSection />
            <SurveyForm />
        </main>
    );
};

export default Families;