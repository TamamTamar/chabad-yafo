import styles from "./Home.module.scss";
import Header from "../../components/Header/Header";
import Hero from "../../components/Hero/Hero";
import Synagogues from "../../components/Synagogues/Synagogues";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import Gallery from "../../components/Gallery/Gallery";

const Home = () => {
    return (
        <div className={styles.page}>
            <Header />
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
