import styles from "./RebbeLetterInfo.module.scss";

const RebbeLetterInfo = () => {
    return (
        <aside className={styles.card}>
            <h2 className={styles.title}>
                תפילה וברכה בציון הרבי
            </h2>

            <p className={styles.description}>
                במסגרת כינוס השלוחים העולמי אעביר את בקשותיכם לציון
                הקדוש של הרבי, ואתפלל עבורכם ועבור יקיריכם לרפואה,
                לפרנסה, להצלחה ולבשורות טובות.
            </p>

            <p className={styles.note}>
                אנא ציינו שם מלא ושם האם של כל אדם שעבורו אתם מבקשים ברכה.
                ניתן לכתוב בכל שפה.
            </p>

            <p className={styles.footerText}>
                הרב לוי תמם — בית חב״ד יפו
            </p>
        </aside>
    );
};

export default RebbeLetterInfo;
