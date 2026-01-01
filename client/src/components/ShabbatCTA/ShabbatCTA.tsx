import styles from "./ShabbatCTA.module.scss";

const ShabbatCTA = () => {
    return (
        <section id="shabbat" className={styles.section}>
            <div className="container">
                <div className={styles.box}>
                    <h2>רישום לסעודות שבת וחג</h2>
                    <p>
                        סעודות שבת פתוחות, חמות ומשפחתיות – בהרשמה מראש.
                        נשמח לארח אתכם בבית חב״ד יפו.
                    </p>

                    <a href="#register" className={styles.button}>
                        לרישום לסעודת שבת
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ShabbatCTA;
