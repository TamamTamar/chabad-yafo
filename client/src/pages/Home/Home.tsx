import Gallery from "../../components/Gallery/Gallery";
import Hero from "../../components/Hero/Hero";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import Synagogues from "../../components/Synagogues/Synagogues";
import styles from "./Home.module.scss";

const Home = () => {
    return (
        <div className={styles.page}>
            <main>
                <Hero />
                <Synagogues />
                <ShabbatCTA />
                <Gallery />

            </main>
        </div>
    );
};

export default Home;
