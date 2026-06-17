import AboutHero from "./components/AboutHero/AboutHero";
import AboutStats from "./components/AboutStats/AboutStats";

import styles from "./AboutPage.module.scss";

const AboutPage = () => {
    return (
        <main className={styles.page}>
            <AboutHero />
            <AboutStats />
        </main>
    );
};

export default AboutPage;