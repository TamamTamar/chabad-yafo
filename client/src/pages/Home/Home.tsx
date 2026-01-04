import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Gallery from "../../components/Gallery/Gallery";
import Hero from "../../components/Hero/Hero";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import { chabadCards } from "../../data/chabadCardsData";
import styles from "./Home.module.scss";

const Home = () => {
    return (
        <div className={styles.page}>
            <main>
                <Hero />
                <ChabadHousesCards cards={chabadCards} />
                <ShabbatCTA />
                <Gallery />

            </main>
        </div>
    );
};

export default Home;
