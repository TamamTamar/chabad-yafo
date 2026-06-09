import { benefits } from "../../data";

import styles from "./BenefitsSection.module.scss";

const BenefitsSection = () => {
    return (
        <section className={styles.vision}>
            <h2 className={styles.title}>
                בונים יחד עתיד טוב יותר למשפחות ביפו
            </h2>

            <div className={styles.cards}>
                {benefits.map((item) => (
                    <article className={styles.card} key={item.title}>
                        <span className={styles.icon} aria-hidden="true">
                            {item.icon}
                        </span>

                        <div className={styles.cardContent}>
                            <h3 className={styles.cardTitle}>
                                {item.title}
                            </h3>

                            <p className={styles.cardText}>
                                {item.text}
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default BenefitsSection;