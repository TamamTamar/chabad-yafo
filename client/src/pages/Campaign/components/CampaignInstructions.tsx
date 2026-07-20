import styles from "../DonationCampaignPage.module.scss";
import type { CampaignInstructionSection } from "../types";

type Props = {
  section: CampaignInstructionSection;
};

const CampaignInstructions = ({ section }: Props) => (
  <section className={styles.instructionsSection} aria-labelledby="campaign-instructions-title">
    <div className={styles.instructionsHeading}>
      <span className={styles.instructionsEyebrow}>המדריך המלא</span>
      <h2 id="campaign-instructions-title">{section.title}</h2>
      {section.intro ? <p>{section.intro}</p> : null}
    </div>

    <ol className={styles.instructionsList}>
      {section.items.map((item, index) => (
        <li className={styles.instructionCard} key={item.title}>
          <span className={styles.instructionNumber} aria-hidden="true">
            {index + 1}
          </span>
          <div>
            <h3>{item.title}</h3>
            <p dangerouslySetInnerHTML={{ __html: item.text }} />
            {item.cta ? (
              <a className={styles.instructionCta} href={item.cta.href}>
                {item.cta.label}
                <span aria-hidden="true">←</span>
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ol>

    {section.note ? (
      <p
        className={styles.instructionsNote}
        dangerouslySetInnerHTML={{ __html: section.note }}
      />
    ) : null}
  </section>
);

export default CampaignInstructions;
