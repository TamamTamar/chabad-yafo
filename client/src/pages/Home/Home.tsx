import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Hero from "../../components/Hero/Hero";
import OurService from "../../components/OurService/OurService";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import ShabbatTimesBadge from "../../components/ShabbatTimesBadge/ShabbatTimesBadge";
import { chabadCards } from "../../data/chabadCardsData";
import CampaignCarousel from "../Campaign/components/CampaignCarousel";
import styles from "./Home.module.scss";

const Home = () => {
    return (
        <div className={styles.page}>
            <CampaignCarousel /> {/* שורה 12 - זהו! */}

            <div className={styles.shabbatTop}>
                <ShabbatTimesBadge variant="topbar" />
            </div>

            <main>
                <Hero />
                <OurService />
                <ChabadHousesCards cards={chabadCards} />
                <ShabbatCTA />
            </main>
        </div>
    );
};

export default Home;