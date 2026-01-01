import styles from "./Synagogues.module.scss";

const synagogues = [
    {
        name: "בית חב״ד המרכזי – שוק הפשפשים",
        address: "עולי ציון 13, יפו",
    },
    {
        name: "בית חב״ד גבעת עלייה",
        address: "יפו",
    },
    {
        name: "בית חב״ד דרום יפו",
        address: "יפו",
    },
];

const Synagogues = () => {
    return (
        <section id="synagogues" className={styles.section}>
            <div className="container">
                <h2 className={styles.title}>בתי חב״ד הפועלים ביפו</h2>

                <div className={styles.grid}>
                    {synagogues.map((item) => (
                        <div key={item.name} className={styles.card}>
                            <h3>{item.name}</h3>
                            <p>{item.address}</p>
                            <a href="#" className={styles.link}>
                                לפרטים נוספים →
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Synagogues;
