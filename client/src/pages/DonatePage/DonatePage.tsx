import DonateHero from "./components/DonateHero/DonateHero";
import DonateImpact from "./components/DonateImpact/DonateImpact";
import DonationForm from "./components/DonationForm/DonationForm";
import styles from "./DonatePage.module.scss"

const DonatePage = () => {
    return (
        <main className={styles.page}>
            <DonateHero />
            <DonateImpact/>
            <DonationForm/>
        </main>
    );
};

export default DonatePage;
