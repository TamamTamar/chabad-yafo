
import BenefitsSection from "./components/BenefitsSection/BenefitsSection";
import FamiliesHero from "./components/FamiliesHero/FamiliesHero";
import SurveyForm from "./components/SurveyForm/SurveyForm";
import styles from "./Families.module.scss";

const Families = () => {
    return (
        <main className={styles.page}>
            <FamiliesHero />
            <BenefitsSection />
            <SurveyForm />
        </main>
    );
};

export default Families;