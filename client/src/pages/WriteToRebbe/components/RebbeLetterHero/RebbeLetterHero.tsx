import Container from "../../../../components/Container/Container";
import rebbeImage from "../../../../assets/rebbe.png";
import { writeToRebbeConfig } from "../../writeToRebbeConfig";
import styles from "./RebbeLetterHero.module.scss";

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
                        {writeToRebbeConfig.eyebrow}
                    </p>

                    <h1 className={styles.title}>
                        {writeToRebbeConfig.title}
                    </h1>

                    <p className={styles.subtitle}>
                        {writeToRebbeConfig.subtitle}
                    </p>
                </div>
            </Container>
        </section>
    );
};

export default RebbeLetterHero;