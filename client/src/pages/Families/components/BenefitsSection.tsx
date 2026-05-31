import styles from "../Families.module.scss";
import { benefits } from "../data";

const BenefitsSection = () => {
    return (
        <section className={styles.vision}>
            <h2>בונים יחד עתיד טוב יותר למשפחות ביפו</h2>

            <div className={styles.cards}>
                {benefits.map((item) => (
                    <div className={styles.card} key={item.title}>
                        <span>{item.icon}</span>
                        <div>
                            <h3>{item.title}</h3>
                            <p>{item.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default BenefitsSection;