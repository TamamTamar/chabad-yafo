import Container from "../../../../components/Container/Container";
import styles from "./AboutHero.module.scss";

const AboutHero = () => {
    return (
        <section className={styles.hero}>
            <div className={styles.imageOverlay} />

            <Container>
                <div className={styles.content}>
                    <div className={styles.eyebrow}>
                        אודות מרכז חב״ד יפו
                    </div>

                    <h1 className={styles.title}>
                        להרבות אור, יחד
                    </h1>

                    <p className={styles.subtitle}>
                        כמעט ארבעה עשורים של פעילות יהודית, קהילתית וחינוכית
                        בלב יפו.
                    </p>
                </div>
            </Container>
        </section>
    );
};

export default AboutHero;