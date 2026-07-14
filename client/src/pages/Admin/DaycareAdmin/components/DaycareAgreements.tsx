import axios from "axios";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    listAdminAgreementVersions,
    publishAdminAgreementDraft,
    updateAdminAgreementDraft,
} from "../../../../services/daycareAgreementService";
import type {
    DaycareAgreementVersion,
    DaycareDocumentBlock,
    DaycareStructuredDocument,
} from "../../../../types/daycareAgreement";
import styles from "./DaycareAgreements.module.scss";

const emptyDocument = (): DaycareStructuredDocument => ({
    format: "structured-v1",
    title: "",
    subtitle: "",
    intro: [],
    sections: [],
});

const fromVersion = (value: DaycareAgreementVersion): DaycareStructuredDocument => structuredClone({
    format: value.format,
    title: value.title,
    subtitle: value.subtitle,
    intro: value.intro,
    sections: value.sections,
});

const blockToText = (block: DaycareDocumentBlock) => {
    if (block.type === "paragraph") return block.text;
    return block.items
        .map((item, index) => `${block.type === "numberedList" ? `${index + 1}.` : "•"} ${item.text}`)
        .join("\n");
};

const documentToText = (document: DaycareStructuredDocument) => [
    ...document.intro.map(blockToText),
    ...document.sections.flatMap((section, index) => section.id === "agreement-content"
        ? section.blocks.map(blockToText)
        : [`${index + 1}. ${section.title}`, ...section.blocks.map(blockToText)]),
].filter((part) => part.trim()).join("\n\n");

const documentFromText = (
    document: DaycareStructuredDocument,
    agreementText: string
): DaycareStructuredDocument => {
    const intro: DaycareDocumentBlock[] = [];
    const sections: DaycareStructuredDocument["sections"] = [];
    let currentSection: DaycareStructuredDocument["sections"][number] | undefined;

    agreementText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
        const heading = line.match(/^\d+\.\s+(.+)$/);
        if (heading) {
            currentSection = {
                id: `section-${sections.length + 1}`,
                title: heading[1].trim(),
                blocks: [],
            };
            sections.push(currentSection);
            return;
        }

        const target = currentSection?.blocks ?? intro;
        target.push({
            id: currentSection
                ? `${currentSection.id}-paragraph-${currentSection.blocks.length + 1}`
                : `intro-paragraph-${intro.length + 1}`,
            type: "paragraph",
            text: line,
        });
    });

    if (!sections.length) {
        return {
            ...document,
            intro: [],
            sections: [{
                id: "agreement-content",
                title: "נוסח ההסכם",
                blocks: [{ id: "agreement-text", type: "paragraph", text: agreementText.trim() }],
            }],
        };
    }

    return { ...document, intro, sections };
};

const errorMessage = (error: unknown) =>
    axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message || "לא הצלחנו לשמור את ההסכם."
        : "לא הצלחנו לשמור את ההסכם.";

const DaycareAgreements = () => {
    const [versions, setVersions] = useState<DaycareAgreementVersion[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [document, setDocument] = useState<DaycareStructuredDocument>(emptyDocument);
    const [agreementText, setAgreementText] = useState("");
    const [version, setVersion] = useState("");
    const [schoolYear, setSchoolYear] = useState("");
    const [legalReviewConfirmed, setLegalReviewConfirmed] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const selected = versions.find((item) => item.id === selectedId);
    const isEditable = selected?.status === "draft";

    const applyVersion = (item: DaycareAgreementVersion) => {
        const nextDocument = fromVersion(item);
        setSelectedId(item.id);
        setDocument(nextDocument);
        setAgreementText(documentToText(nextDocument));
        setVersion(item.version);
        setSchoolYear(item.schoolYear);
    };

    const load = async (preferredId?: string) => {
        const items = await listAdminAgreementVersions();
        setVersions(items);
        const item = items.find((candidate) => candidate.id === preferredId) ?? items[0];
        if (item) applyVersion(item);
    };

    useEffect(() => {
        let active = true;
        void listAdminAgreementVersions().then((items) => {
            if (!active) return;
            setVersions(items);
            if (items[0]) applyVersion(items[0]);
        }).catch((loadError) => {
            if (active) setError(errorMessage(loadError));
        });
        return () => { active = false; };
    }, []);

    const selectVersion = (id: string) => {
        const item = versions.find((candidate) => candidate.id === id);
        setLegalReviewConfirmed(false);
        if (item) applyVersion(item);
    };

    const valid = Boolean(document.title.trim())
        && Boolean(agreementText.trim())
        && agreementText.trim().length <= 50000;

    const approveAndPublish = async () => {
        if (!selected || selected.status !== "draft" || !legalReviewConfirmed || !valid) return;
        setPublishConfirmationOpen(false);
        setIsBusy(true);
        setError("");
        setNotice("");
        try {
            const nextDocument = documentFromText(document, agreementText);
            const draft = await updateAdminAgreementDraft(selected.id, nextDocument);
            const published = await publishAdminAgreementDraft(draft.id);
            await load(published.id);
            setNotice("הנוסח אושר ופורסם להורים.");
        } catch (actionError) {
            setError(errorMessage(actionError));
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <section className={styles.section} aria-labelledby="agreements-title">
            <div className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>מסמכי הרשמה</span>
                    <h2 id="agreements-title" className={styles.title}>הסכם התקשרות</h2>
                    <p className={styles.intro}>לכל שנת לימודים יש הסכם אחד: עורכים אותו כטיוטה, מפרסמים פעם אחת, ולאחר מכן הוא ננעל.</p>
                </div>
            </div>

            {versions.length ? (
                <label className={styles.label}>
                    גרסה קיימת
                    <select className={styles.input} value={selectedId} onChange={(event) => selectVersion(event.target.value)}>
                        {versions.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.schoolYear} · {item.version} · {item.status === "draft" ? "טיוטה" : item.status === "published" ? "פורסם" : "ארכיון"}
                            </option>
                        ))}
                    </select>
                </label>
            ) : null}

            <div className={styles.metaGrid}>
                <label className={styles.label}>
                    שנת לימודים
                    <input className={styles.input} value={schoolYear} disabled />
                </label>
                <label className={styles.label}>
                    מזהה גרסה
                    <input className={styles.input} value={version} disabled />
                </label>
            </div>

            <label className={styles.label}>
                כותרת
                <input className={styles.input} value={document.title} disabled={!isEditable} onChange={(event) => setDocument((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className={styles.label}>
                כותרת משנה
                <input className={styles.input} value={document.subtitle ?? ""} disabled={!isEditable} onChange={(event) => setDocument((current) => ({ ...current, subtitle: event.target.value }))} />
            </label>
            <label className={styles.label}>
                נוסח ההסכם
                <textarea
                    className={styles.textarea}
                    value={agreementText}
                    disabled={!isEditable}
                    maxLength={50000}
                    onChange={(event) => setAgreementText(event.target.value)}
                    placeholder="הדביקי כאן את כל נוסח ההסכם..."
                />
                <span className={styles.helperText}>אפשר להדביק את כל הטקסט בבת אחת. ירידות שורה ורווחים בין פסקאות יישמרו.</span>
            </label>

            <div className={styles.feedback} aria-live="polite">
                {notice ? <p className={styles.success}>{notice}</p> : null}
                {error ? <p className={styles.error}>{error}</p> : null}
            </div>
            {isEditable ? (
                <label className={styles.confirmLabel}>
                    <input type="checkbox" checked={legalReviewConfirmed} onChange={(event) => setLegalReviewConfirmed(event.target.checked)} />
                    בדקתי את הנוסח וזה ההסכם שאני רוצה לפרסם להורים.
                </label>
            ) : null}
            <div className={styles.actions}>
                {isEditable ? (
                    <button className={styles.publishButton} type="button" disabled={isBusy || !legalReviewConfirmed || !valid || !version || !schoolYear} onClick={() => setPublishConfirmationOpen(true)}>
                        {isBusy ? "מפרסם..." : "אישור ופרסום להורים"}
                    </button>
                ) : null}
            </div>

            <ConfirmDialog
                open={publishConfirmationOpen}
                title="פרסום ההסכם להורים"
                message="לאחר הפרסום לא ניתן יהיה לערוך גרסה זו. לפרסם עכשיו?"
                confirmLabel="פרסום ההסכם"
                tone="danger"
                onConfirm={() => void approveAndPublish()}
                onClose={() => setPublishConfirmationOpen(false)}
            />
        </section>
    );
};

export default DaycareAgreements;
