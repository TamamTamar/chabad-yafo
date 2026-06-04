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
                <FamiliesPromo />
                <div className={styles.shabbatTop}>
                    <ShabbatTimesBadge variant="topbar" />
                </div>
                <OurService />
                <ChabadHousesCards cards={chabadCards} />
            </main>
        </div>
    );
};

export default Home;