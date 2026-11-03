import Container from "../../../../components/Container/Container";
import rebbeImage from "../../../../assets/rebbe-writing-letter.webp";

import styles from "./RebbeLetterHero.module.scss";
import type { WriteToRebbeConfig } from "../../writeToRebbeConfig";

const RebbeLetterHero = ({ config }: { config: WriteToRebbeConfig }) => {
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
                        {config.eyebrow}
                    </p>

                    <h1 className={styles.title}>
                        {config.title}
                    </h1>

                    <p className={styles.subtitle}>
                        {config.subtitle}
                    </p>
                </div>
            </Container>
        </section>
    );
};

export default RebbeLetterHero;