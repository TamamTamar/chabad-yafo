import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info } from "lucide-react";
import {
    documents,
    faqItems,
    sections,
    type ParentInfoSectionId,
} from "../parentInfoConfig";
import DocumentCard from "./DocumentCard";
import ParentInfoAccordion from "./ParentInfoAccordion";
import styles from "../DaycareParentInfo.module.scss";

interface ParentInfoContentProps {
    activeTab: ParentInfoSectionId;
}

const ParentInfoContent = ({ activeTab }: ParentInfoContentProps) => {
    const section = sections[activeTab];

    return (
        <section className={styles.contentSection} aria-label="המידע שבחרתם">
            <AnimatePresence mode="wait" initial={false}>
                <motion.article
                    className={styles.contentCard}
                    id={`parent-panel-${section.id}`}
                    key={section.id}
                    role="tabpanel"
                    aria-labelledby={`parent-tab-${section.id}`}
                    tabIndex={0}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <header className={styles.contentHeader}>
                        <span className={styles.contentIcon} aria-hidden="true">
                            <section.icon size={26} strokeWidth={1.8} />
                        </span>
                        <div className={styles.contentIntro}>
                            <p className={styles.contentEyebrow}>מידע להורים</p>
                            <h2 className={styles.contentTitle}>{section.title}</h2>
                            <p className={styles.contentSummary}>{section.summary}</p>
                        </div>
                    </header>

                    {section.kind === "faq" && (
                        <div className={styles.tabContentWide}>
                            <ParentInfoAccordion
                                key={section.id}
                                items={faqItems}
                                ariaLabel="שאלות נפוצות על המעון"
                            />
                        </div>
                    )}

                    {section.kind === "documents" && (
                        <div className={styles.documentsGrid}>
                            {documents.map((document) => (
                                <DocumentCard
                                    document={document}
                                    key={document.id}
                                />
                            ))}
                        </div>
                    )}

                    {!section.kind && section.details.length > 0 && (
                        <ul className={styles.detailsList}>
                            {section.details.map((detail) => (
                                <li className={styles.detailItem} key={detail}>
                                    <CheckCircle2
                                        className={styles.detailIcon}
                                        size={20}
                                        aria-hidden="true"
                                    />
                                    <span className={styles.detailText}>{detail}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!section.kind && section.accordionItems && (
                        <ParentInfoAccordion
                            key={section.id}
                            items={section.accordionItems}
                            ariaLabel={`מידע נוסף בנושא ${section.title}`}
                        />
                    )}

                    {!section.kind && section.note && (
                        <aside className={styles.importantNote} aria-label="חשוב לדעת">
                            <Info size={20} aria-hidden="true" />
                            <div className={styles.importantCopy}>
                                <h3 className={styles.importantTitle}>חשוב לדעת</h3>
                                <p className={styles.importantText}>{section.note}</p>
                            </div>
                        </aside>
                    )}
                </motion.article>
            </AnimatePresence>
        </section>
    );
};

export default ParentInfoContent;
