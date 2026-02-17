import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Hero from "../../components/Hero/Hero";
import OurService from "../../components/OurService/OurService";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import { chabadCards } from "../../data/chabadCardsData";
import styles from "./Home.module.scss";

const Home = () => {
    
    return (
        <div className={styles.page}>
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
