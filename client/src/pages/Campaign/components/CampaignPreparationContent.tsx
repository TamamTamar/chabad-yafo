import Container from "../../../components/Container/Container";
import type { DonationCampaignConfig } from "../types";
import campaignStyles from "../DonationCampaignPage.module.scss";
import styles from "./CampaignPreparationContent.module.scss";

type Props = {
    title: string;
    paragraphs: string[];
    preparation: NonNullable<DonationCampaignConfig["preparation"]>;
    onDonate: () => void;
};

const CampaignPreparationContent = ({ title, paragraphs, preparation, onDonate }: Props) => (
    <Container className={styles.container}>
        <section className={`${campaignStyles.headerInner} ${styles.hero}`} aria-labelledby="campaign-preparation-title">
            <h1 className={`${campaignStyles.mainTitle} ${styles.title}`} id="campaign-preparation-title">{title}</h1>
            {paragraphs.map((paragraph) => (
                <p className={styles.intro} key={paragraph}>{paragraph}</p>
            ))}
        </section>

        {preparation.sections.map((section, index) => (
            <section
                className={section.variant === "note" ? styles.before : styles.occasions}
                aria-labelledby={`campaign-preparation-${index}`}
                key={section.title}
            >
                <h2 className={styles.sectionTitle} id={`campaign-preparation-${index}`}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                    <p className={styles.text} key={paragraph}>{paragraph}</p>
                ))}
                {section.occasions && (
                    <ul className={styles.occasionList}>
                        {section.occasions.map((occasion) => (
                            <li className={styles.occasion} key={occasion}>{occasion}</li>
                        ))}
                    </ul>
                )}
            </section>
        ))}

        <section className={`${campaignStyles.sequentialDonationSection} ${styles.donation}`} aria-labelledby="campaign-preparation-donation">
            <div className={styles.donationContent}>
                <h2 className={styles.donationTitle} id="campaign-preparation-donation">{preparation.donation.title}</h2>
                {preparation.donation.paragraphs.map((paragraph) => (
                    <p className={styles.donationText} key={paragraph}>{paragraph}</p>
                ))}
            </div>
            <button className={`${campaignStyles.machatzitBtn} ${styles.donationButton}`} type="button" onClick={onDonate}>
                {preparation.donation.buttonLabel}
            </button>
        </section>
    </Container>
);

export default CampaignPreparationContent;
