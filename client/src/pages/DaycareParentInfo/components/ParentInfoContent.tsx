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
import type { DaycareParentDocumentBundle } from "../../../services/daycareParentDocumentService";

interface ParentInfoContentProps {
    activeTab: ParentInfoSectionId;
    parentDocuments: DaycareParentDocumentBundle | null | undefined;
}

const ParentInfoContent = ({ activeTab, parentDocuments }: ParentInfoContentProps) => {
    const baseSection = sections[activeTab];
    const displayedDocuments = documents.map((document) => document.id === "menu" && parentDocuments
        ? { ...document, pdfAvailable: parentDocuments.documents.menu.items.length > 0 }
        : document);
    const section = activeTab === "routine" && parentDocuments
        ? {
            ...baseSection,
            title: parentDocuments.documents.routine.title,
            summary: parentDocuments.documents.routine.subtitle,
            details: parentDocuments.documents.routine.items.map((item) => `${item.time} · ${item.activity}`),
            note: parentDocuments.documents.routine.note,
        }
        : activeTab === "holidays" && parentDocuments
          ? {
              ...baseSection,
              title: parentDocuments.documents.holidays.title,
              summary: parentDocuments.documents.holidays.subtitle,
              details: parentDocuments.documents.holidays.items.map((item) => `${item.occasion} · ${item.hebrewDate} · ${item.vacationDates}`),
              accordionItems: [{ title: "הבהרות חשובות", content: parentDocuments.documents.holidays.clarifications.join("\n") }],
              note: undefined,
          }
          : activeTab === "menu" && parentDocuments
            ? {
                ...baseSection,
                title: parentDocuments.documents.menu.title,
                summary: parentDocuments.documents.menu.subtitle,
                details: parentDocuments.documents.menu.items.map((item) => `${item.meal} · ${item.description}`),
                note: parentDocuments.documents.menu.note ?? (parentDocuments.documents.menu.items.length ? undefined : "התפריט עדיין לא פורסם."),
            }
          : baseSection;

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
                            {displayedDocuments.map((document) => (
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
