
import { Link } from "react-router-dom";

import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Container from "../../components/Container/Container";
import ActivityGallery from "../../components/Gallery/ActivityGallery";
import Hero from "../../components/Hero/Hero";
import OurService from "../../components/OurService/OurService";
import ShabbatTimesBadge from "../../components/ShabbatTimesBadge/ShabbatTimesBadge";
import { chabadCards } from "../../data/chabadCardsData";
import DaycareRegistrationPromo from "./components/DaycareRegistrationPromo/DaycareRegistrationPromo";
import styles from "./Home.module.scss";

const Home = () => {
    return (
        <div className={styles.page}>
            <main>
                <Hero />
                <div className={styles.shabbatWrapper}>
                    <ShabbatTimesBadge variant="card" />
                </div>
                <section className={styles.aboutBridge}>
                    <Container>
                        <div className={styles.aboutBridgeBox}>
                            <div className={styles.aboutBridgeContent}>
                                <span className={styles.aboutBridgeEyebrow}>
                                    מרכז חב״ד יפו
                                </span>

                                <h2 className={styles.aboutBridgeTitle}>
                                    כמעט ארבעה עשורים של בית פתוח, קהילה ואור
                                </h2>

                                <p className={styles.aboutBridgeText}>
                                    משבתות וחגים ועד שיעורים, חסד וליווי אישי -
                                    בית חב״ד יפו כאן בשביל כל יהודי בעיר.
                                </p>
                            </div>

                            <Link to="/about" className={styles.aboutBridgeButton}>
                                להכיר אותנו
                            </Link>
                        </div>
                    </Container>
                </section>
                <ActivityGallery />
                <DaycareRegistrationPromo />
                <OurService />
                <ChabadHousesCards cards={chabadCards} />
            </main>
        </div>
    );
};

export default Home;
