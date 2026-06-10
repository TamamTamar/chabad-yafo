import styles from "./DonateHero.module.scss";

const DonateHero = () => {
    return (
        <div className={styles.hero}>

            <div className={styles.overlay} />

            <div className={styles.content}>
           
                <div className={styles.title}>
                    יחד מאירים את יפו
                </div>

                <div className={styles.description}>
                    התרומה שלכם מאפשרת לנו להמשיך בפעילות יהודית,
                    קהילתית וחינוכית בלב יפו לאורך כל השנה.
                </div>

                <a
                    href="#donate-form"
                    className={styles.button}
                >
                    לתרומה מאובטחת
                </a>
            </div>
        </div>
    );
};

export default DonateHero;