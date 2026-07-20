import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";

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
            {item.expandedContent ? (
              <details className={styles.instructionDetails}>
                <summary>
                  <span>{item.expandedContent.label}</span>
                  <ChevronDown aria-hidden="true" size={20} strokeWidth={2.4} />
                </summary>
                <div className={styles.instructionDetailsContent}>
                  <h4>{item.expandedContent.title}</h4>
                  {item.expandedContent.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {item.expandedContent.note ? (
                    <p className={styles.instructionDetailsNote}>
                      {item.expandedContent.note}
                    </p>
                  ) : null}
                </div>
              </details>
            ) : null}
            {item.cta ? (
              <a
                className={`${styles.instructionCta} ${
                  item.cta.variant === "secondary"
                    ? styles.instructionCtaSecondary
                    : ""
                }`}
                href={item.cta.href}
                target={item.cta.external ? "_blank" : undefined}
                rel={item.cta.external ? "noreferrer" : undefined}
              >
                {item.cta.label}
                {item.cta.external ? (
                  <ExternalLink aria-hidden="true" size={17} strokeWidth={2.25} />
                ) : (
                  <ArrowLeft aria-hidden="true" size={18} strokeWidth={2.4} />
                )}
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
