import daycareLogo from "../../assets/logo-maon.jpeg";
import styles from "./DaycareLogo.module.scss";

const DaycareLogo = () => (
    <img
        className={styles.logo}
        src={daycareLogo}
        alt="מעון חב״ד יפו — גדלים באהבה, בערכים ובשמחה"
        width="156"
        height="156"
        decoding="async"
    />
);

export default DaycareLogo;
