import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Hero from "../../components/Hero/Hero";
import OurService from "../../components/OurService/OurService";
import ShabbatTimesBadge from "../../components/ShabbatTimesBadge/ShabbatTimesBadge";
import { chabadCards } from "../../data/chabadCardsData";
import FamiliesPromo from "../Families/components/FamiliesPromo";
import styles from "./Home.module.scss";

const Home = () => {
    return (
        <div className={styles.page}>
            <main>
                <Hero />

                <div className={styles.shabbatWrapper}>
                    <ShabbatTimesBadge variant="card" />
                </div>

                <FamiliesPromo />
                <OurService />
                <ChabadHousesCards cards={chabadCards} />
            </main>
        </div>
    );
};

export default Home;