import AboutActivities from "./components/AboutActivities/AboutActivities";
import AboutCta from "./components/AboutCta/AboutCta";
import AboutHero from "./components/AboutHero/AboutHero";
import AboutStats from "./components/AboutStats/AboutStats";
import AboutStory from "./components/AboutStory/AboutStory";

import styles from "./AboutPage.module.scss";

const AboutPage = () => {
    return (
        <main className={styles.page}>
            <AboutHero />
            <div className={styles.content}>
                <AboutStats />
                <AboutStory />
                <AboutActivities />
                <AboutCta />
            </div>
        </main>
    );
};

export default AboutPage;
