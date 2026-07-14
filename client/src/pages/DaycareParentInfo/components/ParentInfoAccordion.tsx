import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ParentInfoAccordionItem } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface ParentInfoAccordionProps {
    items: ParentInfoAccordionItem[];
    ariaLabel: string;
}

const ParentInfoAccordion = ({ items, ariaLabel }: ParentInfoAccordionProps) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const baseId = useId().replace(/:/g, "");

    return (
        <div className={styles.accordion} aria-label={ariaLabel}>
            {items.map((item, index) => {
                const isOpen = openIndex === index;
                const buttonId = `${baseId}-button-${index}`;
                const panelId = `${baseId}-panel-${index}`;

                return (
                    <div className={styles.accordionItem} key={item.title}>
                        <h3 className={styles.accordionHeading}>
                            <button
                                className={styles.accordionButton}
                                id={buttonId}
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={panelId}
                                onClick={() =>
                                    setOpenIndex((current) =>
                                        current === index ? null : index
                                    )
                                }
                            >
                                <span className={styles.accordionButtonText}>
                                    {item.title}
                                    {item.isPlaceholder && (
                                        <span className={styles.pendingLabel}>בעדכון</span>
                                    )}
                                </span>
                                <ChevronDown
                                    className={`${styles.accordionChevron} ${
                                        isOpen ? styles.accordionChevronOpen : ""
                                    }`}
                                    size={21}
                                    aria-hidden="true"
                                />
                            </button>
                        </h3>
                        <div
                            className={`${styles.accordionPanel} ${
                                isOpen ? styles.accordionPanelOpen : ""
                            }`}
                            id={panelId}
                            role="region"
                            aria-labelledby={buttonId}
                            aria-hidden={!isOpen}
                        >
                            <div className={styles.accordionPanelInner}>
                                <p className={styles.accordionText}>{item.content}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ParentInfoAccordion;
