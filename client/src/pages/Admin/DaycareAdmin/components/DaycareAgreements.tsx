import axios from "axios";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    createAdminAgreementDraft,
    downloadAdminAgreementReviewPdf,
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

const nextAgreementYear = (versions: DaycareAgreementVersion[]) => {
    if (!versions.length || versions.some((item) => item.status === "draft")) return null;
    const source = [...versions].sort((left, right) => right.schoolYear.localeCompare(left.schoolYear))[0];
    const match = source.schoolYear.match(/^(\d{4})-(\d{4})$/);
    if (!match) return null;
    const startYear = Number(match[1]) + 1;
    return {
        source,
        schoolYear: `${startYear}-${startYear + 1}`,
        version: `${startYear}.01`,
    };
};

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
    const [createConfirmationOpen, setCreateConfirmationOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const selected = versions.find((item) => item.id === selectedId);
    const isEditable = selected?.status === "draft";
    const nextAgreement = nextAgreementYear(versions);

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

    const downloadReviewCopy = async () => {
        if (!selected || (isEditable && !valid)) return;
        setIsBusy(true);
        setError("");
        setNotice("");
        try {
            let sourceVersion = selected;
            if (isEditable) {
                const nextDocument = documentFromText(document, agreementText);
                sourceVersion = await updateAdminAgreementDraft(selected.id, nextDocument);
                setDocument(nextDocument);
                setVersions((current) => current.map((item) => item.id === sourceVersion.id ? sourceVersion : item));
            }
            const blob = await downloadAdminAgreementReviewPdf(sourceVersion.id);
            const objectUrl = URL.createObjectURL(blob);
            const anchor = window.document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = `הסכם-התקשרות-לעיון-${sourceVersion.schoolYear}.pdf`;
            anchor.click();
            URL.revokeObjectURL(objectUrl);
            setNotice("עותק לעיון הופק מהנוסח העדכני.");
        } catch (actionError) {
            setError(errorMessage(actionError));
        } finally {
            setIsBusy(false);
        }
    };

    const createNextYearAgreement = async () => {
        if (!nextAgreement) return;
        setCreateConfirmationOpen(false);
        setIsBusy(true);
        setError("");
        setNotice("");
        try {
            const created = await createAdminAgreementDraft({
                version: nextAgreement.version,
                schoolYear: nextAgreement.schoolYear,
                document: fromVersion(nextAgreement.source),
            });
            await load(created.id);
            setNotice(`נוצרה טיוטת הסכם לשנת ${created.schoolYear}. אפשר לערוך ולאחר בדיקה לפרסם אותה.`);
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
                {nextAgreement ? (
                    <button className={styles.secondaryButton} type="button" disabled={isBusy} onClick={() => setCreateConfirmationOpen(true)}>
                        יצירת הסכם לשנה חדשה
                    </button>
                ) : null}
                <button className={styles.secondaryButton} type="button" disabled={isBusy || !selected || (isEditable && !valid)} onClick={() => void downloadReviewCopy()}>
                    {isBusy ? "מפיק..." : "הפקת עותק לעיון"}
                </button>
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
            <ConfirmDialog
                open={createConfirmationOpen}
                title="יצירת הסכם לשנה חדשה"
                message={nextAgreement
                    ? `ליצור טיוטת הסכם לשנת ${nextAgreement.schoolYear} על בסיס ההסכם האחרון? לאחר היצירה ניתן יהיה לערוך אותה לפני הפרסום.`
                    : "לא ניתן ליצור כרגע הסכם לשנה חדשה."}
                confirmLabel="יצירת טיוטה"
                onConfirm={() => void createNextYearAgreement()}
                onClose={() => setCreateConfirmationOpen(false)}
            />
        </section>
    );
};

export default DaycareAgreements;
