import styles from "./OurService.module.scss";
import barIcon from "../../assets/services/13.png";
import babyIcon from "../../assets/services/baby.png";
import homeIcon from "../../assets/services/home.png";
import kashrutIcon from "../../assets/services/kashrut.png";
import menoraIcon from "../../assets/services/menora.png";
import mezuzahIcon from "../../assets/services/mezuza.png";
import { trackWhatsAppClick } from "../../services/googleAnalyticsService";
import Container from "../Container/Container";

type ServiceItem = {
  id: string;
  title: string;
  message: string;
  icon: string;
};

type OurServiceProps = {
  title?: string;
  items?: ServiceItem[];
};

const PHONE = "972537700339";

const buildWhatsAppLink = (message: string) => {
  const cleanPhone = PHONE.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${text}`;
};

const DEFAULT_ITEMS: ServiceItem[] = [
  {
    id: "judaica",
    title: "חנות יודאיקה",
    message: "שלום! אשמח לקבל פרטים על חנות היודאיקה. תודה",
    icon: menoraIcon,
  },
  {
    id: "mothers",
    title: "תמיכה ביולדות",
    message: "שלום! אשמח לשמוע על תמיכה ביולדות. תודה",
    icon: babyIcon,
  },
  {
    id: "home-store",
    title: "חנות הבית",
    message: "שלום! אשמח לקבל פרטים על חנות הבית. תודה",
    icon: homeIcon,
  },
  {
    id: "tefillin-mezuzot",
    title: "תפילין ומזוזות",
    message: "שלום! אשמח לתאם בדיקה או רכישה של תפילין ומזוזות. תודה",
    icon: mezuzahIcon,
  },
  {
    id: "kosher-kitchen",
    title: "הכשרת מטבח",
    message: "שלום! אשמח לקבל פרטים לגבי הכשרת מטבח. תודה",
    icon: kashrutIcon,
  },
  {
    id: "bar-mitzvah",
    title: "הכנה לבר מצווה",
    message: "שלום! אשמח לקבל פרטים על הכנה לבר מצווה. תודה",
    icon: barIcon,
  },
];

const OurService = ({
  title = "איך אפשר לעזור?",
  items = DEFAULT_ITEMS,
}: OurServiceProps) => {
  return (
    <section className={styles.section} aria-label={title}>
      <Container>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </header>

        <div className={styles.grid}>
          {items.map((item) => (
            <a
              key={item.id}
              className={styles.card}
              href={buildWhatsAppLink(item.message)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${item.title} - פתיחה בוואטסאפ`}
              onClick={() =>
                trackWhatsAppClick({
                  location: "services_grid",
                  service_id: item.id,
                })
              }
            >
              <span className={styles.circle} aria-hidden="true">
                <img className={styles.icon} src={item.icon} alt="" />
              </span>

              <span className={styles.label}>{item.title}</span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default OurService;
