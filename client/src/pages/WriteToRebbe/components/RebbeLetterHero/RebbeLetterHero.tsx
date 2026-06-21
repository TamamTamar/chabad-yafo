import Container from "../../../../components/Container/Container";
import rebbeImage from "../../../../assets/rebbe.png";

import styles from "./RebbeLetterHero.module.scss";
import { writeToRebbeConfigs } from "../../writeToRebbeConfig";

const RebbeLetterHero = () => {
    return (
        <section className={styles.hero}>
            <img
                src={rebbeImage}
                alt="הרבי מליובאוויטש"
                className={styles.backgroundImage}
            />

            <div className={styles.overlay} />

            <Container>
                <div className={styles.content}>
                    <p className={styles.eyebrow}>
                        {writeToRebbeConfigs.general.eyebrow}
                    </p>

                    <h1 className={styles.title}>
                        {writeToRebbeConfigs.general.title}
                    </h1>

                    <p className={styles.subtitle}>
                        {writeToRebbeConfigs.general.subtitle}
                    </p>
                </div>
            </Container>
        </section>
    );
};

export default RebbeLetterHero;