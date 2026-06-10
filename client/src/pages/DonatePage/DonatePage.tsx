import DonateHero from "./components/DonateHero/DonateHero";
import DonateImpact from "./components/DonateImpact/DonateImpact";
import DonationForm from "./components/DonationForm/DonationForm";
import styles from "./DonatePage.module.scss"

const DonatePage = () => {
    return (
        <div className={styles.page}>
            <DonateHero />
            <DonateImpact/>
            <DonationForm/>
        </div>
    );
};

export default DonatePage;