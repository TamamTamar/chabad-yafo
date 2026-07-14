import { Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import type { ParentInfoDocument } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface DocumentCardProps {
    document: ParentInfoDocument;
}

const DocumentCard = ({ document }: DocumentCardProps) => (
    <article className={styles.documentCard}>
        <header className={styles.documentHeader}>
            <span className={styles.documentIcon} aria-hidden="true">
                <document.icon size={23} strokeWidth={1.8} />
            </span>
            <div className={styles.documentHeadingGroup}>
                <h3 className={styles.documentTitle}>{document.title}</h3>
                {document.updatedAt && (
                    <p className={styles.documentUpdated}>
                        עודכן לאחרונה: {document.updatedAt}
                    </p>
                )}
            </div>
        </header>

        <p className={styles.documentDescription}>{document.description}</p>

        <div className={styles.documentStatusRow}>
            <span
                className={`${styles.documentStatus} ${
                    document.pdfAvailable
                        ? styles.documentStatusAvailable
                        : styles.documentStatusPending
                }`}
            >
                {document.pdfAvailable ? "PDF זמין" : "PDF יתווסף בהמשך"}
            </span>
        </div>

        <div className={styles.documentActions}>
            {document.onlinePath && (
                <Link
                    className={styles.documentSecondaryAction}
                    to={document.onlinePath}
                >
                    <ExternalLink size={17} aria-hidden="true" />
                    {document.onlineLabel ?? "קריאה באתר"}
                </Link>
            )}
            {document.pdfAvailable && (
                <a
                    className={styles.documentPrimaryAction}
                    href={document.pdfPath}
                    download
                    aria-label={`הורדת ${document.title} כ־PDF`}
                >
                    <Download size={17} aria-hidden="true" />
                    הורדת PDF
                </a>
            )}
        </div>
    </article>
);

export default DocumentCard;
