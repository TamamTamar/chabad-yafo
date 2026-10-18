import { AdminButton } from "../../../../components/AdminUI";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ChevronDown, NotebookPen, UsersRound, Search } from "lucide-react";
import type { DaycareInterestStatus } from "../../../../types/daycareRegistration";
import styles from "./DaycareRegistrations.styles";
import type { useDaycareRegistrations } from "./useDaycareRegistrations";

type DaycareRegistrationsViewProps = {
    openingSummary?: ReactNode;
    model: ReturnType<typeof useDaycareRegistrations>;
};

const statusTone = (status: DaycareInterestStatus) => {
    if (status === "נרשם" || status === "רוצה להירשם") return "success";
    if (status === "הגיע לראות") return "warning";
    if (status === "לא רלוונטי") return "neutral";
    return "info";
};

const DaycareRegistrationsView = ({ model, openingSummary }: DaycareRegistrationsViewProps) => {
    const {
        rows, filteredRows, activeCasesCount, loading, error, updatingKey,
        expandedTreatmentKeys, expandedDetailKeys, workflowDrafts, draft,
        createError, searchQuery, statusFilter, families, register, handleSubmit,
        createFormErrors, creating, setDraft, setSearchQuery, setStatusFilter,
        setExpandedTreatmentKeys, setExpandedDetailKeys, handleStatusChange,
        openCreateDialog, handleCreate, renderTreatmentPanel, navigate,
        daycareRegistrationStatuses, onboardingOverallStatusLabels,
        eligibleStatuses, nextStatusByStatus, registrationWorkflow,
        parseWorkflowDraft, familyMatchesPhone, familyOptionLabel, formatDate,
    } = model;

    const noteTriggers = useRef(new Map<string, HTMLButtonElement>());
    const previousTreatmentKeys = useRef(expandedTreatmentKeys);
    useEffect(() => {
        for (const key of previousTreatmentKeys.current) {
            if (!expandedTreatmentKeys.includes(key)) noteTriggers.current.get(key)?.focus();
        }
        for (const key of expandedTreatmentKeys) {
            if (!previousTreatmentKeys.current.includes(key)) {
                const panelId = noteTriggers.current.get(key)?.getAttribute("aria-controls");
                if (panelId) document.getElementById(panelId)?.querySelector("textarea")?.focus();
            }
        }
        previousTreatmentKeys.current = expandedTreatmentKeys;
    }, [expandedTreatmentKeys]);
    const toggleTreatment = (key: string, trigger: HTMLButtonElement) => {
        noteTriggers.current.set(key, trigger);
        setExpandedTreatmentKeys(keys => keys.includes(key) ? keys.filter(item => item !== key) : [...keys, key]);
    };

    const createDialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = createDialog.current;
        if (!draft || !dialog) return;
        const previousFocus = document.activeElement as HTMLElement | null;
        dialog.showModal();
        return () => { dialog.close(); previousFocus?.focus(); };
    }, [draft]);

    return (
        <section className={styles.registrationDesign} aria-labelledby="admin-page-title">
            <div className={styles.registrationToolbar}>
                <label className={styles.compactField}>
                    <span className={styles.fieldLabel}>חיפוש משפחה</span>
                    <span className={styles.searchControl}>
                        <Search data-input-icon aria-hidden="true" size={18} strokeWidth={1.6} />
                    <input

                        placeholder="שם הורה, ילד או טלפון"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                    </span>
                </label>
                <label className={styles.compactField}>
                    <span className={styles.fieldLabel}>סינון לפי סטטוס</span>
                    <select className={styles.statusSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DaycareInterestStatus | "all")}>
                        <option value="all">כל הסטטוסים</option>
                        {daycareRegistrationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <span className={styles.registrationResultCount} role="status" aria-live="polite">{filteredRows.length} תוצאות</span>
            </div>

            <div className={styles.registrationMeta}>
                <p className={styles.registrationCounts}>{loading ? "טוען פניות…" : `${rows.length} פניות · ${activeCasesCount} תיקי הצטרפות פתוחים · ${rows.filter(row => row.status === "נרשם").length} רשומים`}</p>
                {openingSummary}
            </div>

            <details className={styles.workflowHelp}>
                <summary>איך מטפלים בפנייה?</summary>
                <ol className={styles.registrationWorkflow} aria-label="שלבי הטיפול בפנייה">
                    {registrationWorkflow.map((step, index) => (
                        <li className={styles.registrationWorkflowStep} key={step.title}>
                            <span className={styles.registrationWorkflowNumber}>{index + 1}</span>
                            <div><strong>{step.title}</strong><p>{step.text}</p></div>
                        </li>
                    ))}
                </ol>
            </details>

            {error ? (
                <p className={styles.formErrorMessage} role="alert">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className={styles.loading} aria-live="polite">
                    טוען פניות...
                </div>
            ) : rows.length === 0 ? (
                <div className={styles.emptyState}>עדיין אין פניות ברישום.</div>
            ) : filteredRows.length === 0 ? (
                <div className={styles.emptyState}>לא נמצאו פניות שמתאימות לחיפוש.</div>
            ) : (
                <>
                <div className={styles.registrationDesktopTable} role="region" aria-label="רשימת פניות לרישום למעון" tabIndex={0}>
                    <table className={styles.tableCompact}>
                        <caption className={styles.srOnly}>פניות לרישום למעון ופעולות טיפול</caption>
                        <colgroup>{["19%", "10%", "13%", "16%", "16%", "18%", "8%"].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
                        <thead>
                            <tr>
                                <th scope="col" className={styles.tableHeader}>שם הורה</th>
                                <th scope="col" className={styles.tableHeader}>טלפון</th>
                                <th scope="col" className={styles.tableHeader}>ילד/ה</th>
                                <th scope="col" className={styles.tableHeader}>סטטוס</th>
                                <th scope="col" className={styles.tableHeader}>הערה</th>
                                <th scope="col" className={styles.tableHeader}>תיק ופעולות</th>
                                <th scope="col" className={styles.tableHeader}>תאריך פנייה</th>
                            </tr>
                        </thead>
                        {filteredRows.map((row) => {
                            const summary = row.onboardingSummary;
                            const canCreate = eligibleStatuses.includes(row.status);
                            const nextStatus = nextStatusByStatus[row.status];
                            const workflowDraft =
                                workflowDrafts[row.key] ??
                                parseWorkflowDraft(row.callNotes, row.status);
                            const isTreatmentExpanded =
                                expandedTreatmentKeys.includes(row.key);

                            return (
                                <tbody key={row.key}>
                                    <tr>
                                        <td className={styles.tableCell}>
                                            <div className={styles.familyIdentity}><span className={styles.familyIcon} aria-hidden="true"><UsersRound size={16} /></span><span className={styles.familyName} title={row.parentName}>{row.parentName}</span></div>
                                        </td>
                                        <td className={styles.tableCell}>
                                            <span className={styles.registrationDesktopPhone}>
                                                {row.phone}
                                            </span>
                                        </td>
                                        <td className={styles.tableCell}>
                                            <div className={styles.registrationDesktopChild}>
                                                <span title={row.childName || "שם טרם נמסר"}>
                                                    {row.childName || "שם טרם נמסר"}
                                                </span>
                                                <span className={styles.registrationDesktopChildAge}>
                                                    {row.childAge || "גיל טרם נמסר"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={styles.tableCell}>
                                            <div className={styles.statusControl} data-tone={statusTone(row.status)}>
                                            <select
                                                aria-label={`סטטוס רישום עבור ${row.parentName}`}
                                                className={styles.statusSelect}
                                                value={row.status}
                                                disabled={updatingKey === row.key}
                                                aria-busy={updatingKey === row.key}
                                                onChange={(event) =>
                                                    void handleStatusChange(
                                                        row,
                                                        event.target.value as DaycareInterestStatus
                                                    )
                                                }
                                            >
                                                {daycareRegistrationStatuses.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                            </div>
                                        </td>
                                        <td className={styles.tableCell}>
                                            <div className={styles.noteCellContent}>
                                            {!isTreatmentExpanded && workflowDraft.note ? (
                                                <p className={styles.callSummaryPreview}>
                                                    {workflowDraft.note}
                                                </p>
                                            ) : null}
                                            <button
                                                className={styles.callSummaryToggle}
                                                type="button"
                                                title={isTreatmentExpanded ? "סגירת הערה" : workflowDraft.note ? "צפייה ועריכה" : "הוספת הערה"}
                                                aria-expanded={isTreatmentExpanded}
                                                aria-controls={`${row.key}-note-desktop`}
                                                onClick={event => toggleTreatment(row.key, event.currentTarget)}
                                            >
                                                <NotebookPen size={16} aria-hidden="true" /><span className={styles.srOnly}>{isTreatmentExpanded ? "סגירת הערה" : workflowDraft.note ? "צפייה ועריכה" : "הוספת הערה"}</span>
                                            </button>
                                            </div>
                                        </td>
                                        <td className={styles.tableCell}>
                                            {summary ? (
                                                <div className={styles.onboardingSummary}>
                                                    <span className={styles.onboardingStatusLine} title={onboardingOverallStatusLabels[summary.overallStatus]}>
                                                        {onboardingOverallStatusLabels[summary.overallStatus]}
                                                    </span>
                                                    <span className={styles.registrationOnboardingMeta} title={`${summary.progress.percentage}% הושלם · ${summary.schoolYear}`}>
                                                        {summary.progress.percentage}% · {summary.schoolYear}
                                                    </span>
                                                    <AdminButton
                                                        className={styles.secondaryButton}
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(`/admin/daycare-onboarding/${summary.id}`)
                                                        }
                                                    >
                                                        פתיחת התיק
                                                    </AdminButton>
                                                </div>
                                            ) : canCreate ? (
                                                <AdminButton variant="primary"
                                                    className={styles.primaryButton}
                                                    type="button"
                                                    onClick={() => openCreateDialog(row)}
                                                >
                                                    פתיחת תיק
                                                </AdminButton>
                                            ) : nextStatus ? (
                                                <div>
                                                    <AdminButton className={styles.secondaryButton} type="button" disabled={updatingKey === row.key} aria-busy={updatingKey === row.key} onClick={() => void handleStatusChange(row, nextStatus)}>הבא: {nextStatus}</AdminButton>
                                                    <span className={styles.srOnly}>תיק הצטרפות זמין לאחר החלטה להתקדם</span>
                                                </div>
                                            ) : (
                                                <span className={styles.onboardingUnavailable}>
                                                    זמין לאחר החלטה להתקדם
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.tableCell}>
                                            {formatDate(row.createdAt)}
                                        </td>
                                    </tr>
                                    {isTreatmentExpanded ? (
                                        <tr>
                                            <td className={styles.registrationDesktopTreatmentCell} colSpan={7}>
                                                {renderTreatmentPanel(
                                                    row,
                                                    `${styles.registrationTreatmentPanel} ${styles.registrationDesktopTreatmentPanel}`,
                                                    `${row.key}-note-desktop`
                                                )}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            );
                        })}
                    </table>
                </div>
                <div className={styles.registrationMobileQueue}>
                    {filteredRows.map((row) => {
                        const summary = row.onboardingSummary;
                        const canCreate = eligibleStatuses.includes(row.status);
                        const workflowDraft =
                            workflowDrafts[row.key] ??
                            parseWorkflowDraft(row.callNotes, row.status);
                        const isTreatmentExpanded =
                            expandedTreatmentKeys.includes(row.key);
                        const isDetailsExpanded =
                            expandedDetailKeys.includes(row.key);

                        return (
                            <article className={styles.registrationCard} key={row.key}>
                                <div className={styles.registrationCardHeader}>
                                    <div className={styles.registrationIdentity}>
                                        <h3 className={styles.registrationParentName}>
                                            {row.parentName}
                                        </h3>
                                        <div className={styles.registrationChildSummary}>
                                            <span className={styles.registrationChildName}>
                                                {row.childName || "שם הילד/ה טרם נמסר"}
                                            </span>
                                            <span className={styles.registrationChildAge}>
                                                {row.childAge || "גיל טרם נמסר"}
                                            </span>
                                            <span className={styles.registrationPhone} dir="ltr">{row.phone}</span>
                                        </div>
                                    </div>

                                    <div className={styles.registrationMobileMeta}>
                                        <span className={styles.registrationMobileStatus} data-tone={statusTone(row.status)}>
                                            {row.status}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.registrationQuickActions} aria-label={`פעולות עבור ${row.parentName}`}>
                                    {summary ? <AdminButton className={styles.secondaryButton} type="button" onClick={() => navigate(`/admin/daycare-onboarding/${summary.id}`)}>פתיחת התיק</AdminButton>
                                        : canCreate ? <AdminButton variant="primary" className={styles.primaryButton} type="button" onClick={() => openCreateDialog(row)}>פתיחת תיק</AdminButton>
                                        : nextStatusByStatus[row.status] ? <AdminButton className={styles.secondaryButton} type="button" disabled={updatingKey === row.key} aria-busy={updatingKey === row.key} onClick={() => void handleStatusChange(row, nextStatusByStatus[row.status]!)}>הבא: {nextStatusByStatus[row.status]}</AdminButton> : null}
                                    <button className={styles.registrationQuickButton} title={workflowDraft.note ? "עריכת הערה" : "הוספת הערה"} type="button" aria-expanded={isTreatmentExpanded} aria-controls={`${row.key}-note-mobile`} onClick={event => toggleTreatment(row.key, event.currentTarget)}>
                                        <NotebookPen aria-hidden="true" size={16} /><span className={styles.actionLabel}>{workflowDraft.note ? "עריכת הערה" : "הוספת הערה"}</span>
                                    </button>
                                <button
                                    className={styles.registrationDetailsToggle}
                                    type="button"
                                    aria-expanded={isDetailsExpanded}
                                    onClick={() =>
                                        setExpandedDetailKeys((keys) =>
                                            keys.includes(row.key)
                                                ? keys.filter(
                                                    (key) => key !== row.key
                                                )
                                                : [...keys, row.key]
                                        )
                                    }
                                >
                                    {isDetailsExpanded
                                        ? "הסתרת פרטים"
                                        : "הצגת פרטים"}
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={
                                            isDetailsExpanded
                                                ? styles.registrationDetailsIconOpen
                                                : styles.registrationDetailsIcon
                                        }
                                        size={18}
                                    />
                                </button>

                                </div>
                                {isTreatmentExpanded
                                    ? renderTreatmentPanel(row, undefined, `${row.key}-note-mobile`)
                                    : null}

                                {isDetailsExpanded ? (
                                    <div className={styles.registrationDetails}>
                                        <label className={styles.compactField}><span>סטטוס רישום</span><select value={row.status} disabled={updatingKey === row.key} aria-busy={updatingKey === row.key} onChange={event => void handleStatusChange(row, event.target.value as DaycareInterestStatus)}>{daycareRegistrationStatuses.map(status => <option key={status}>{status}</option>)}</select></label>
                                        <dl className={styles.registrationDetailsGrid}>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    טלפון
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.phone}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    שעות מבוקשות
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.requiredHours || "לא צוין"}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    תאריך פנייה
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {formatDate(row.createdAt)}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    דוא״ל
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.email || "לא צוין"}
                                                </dd>
                                            </div>
                                        </dl>

                                        {workflowDraft.note ? (
                                            <div>
                                                <span
                                                    className={
                                                        styles.registrationSavedNoteLabel
                                                    }
                                                >
                                                    הערה אחרונה
                                                </span>
                                                <p
                                                    className={
                                                        styles.registrationSavedNoteText
                                                    }
                                                >
                                                    {workflowDraft.note}
                                                </p>
                                            </div>
                                        ) : null}

                                        <div className={styles.registrationOnboarding}>
                                            {summary ? (
                                                <div className={styles.onboardingSummary}>
                                                    <span
                                                        className={
                                                            styles.onboardingStatusLine
                                                        }
                                                    >
                                                        {
                                                            onboardingOverallStatusLabels[
                                                            summary.overallStatus
                                                            ]
                                                        }
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.registrationOnboardingMeta
                                                        }
                                                    >
                                                        {summary.progress.percentage}%
                                                        הושלם · {summary.schoolYear}
                                                    </span>
                                                    <strong
                                                        className={
                                                            styles.onboardingNextAction
                                                        }
                                                    >
                                                        הפעולה הבאה:{" "}
                                                        {summary.missingStepTitle ??
                                                            "התיק הושלם"}
                                                    </strong>

                                                </div>
                                            ) : !canCreate ? (
                                                <span
                                                    className={
                                                        styles.onboardingUnavailable
                                                    }
                                                >
                                                    תיק הצטרפות יהיה זמין לאחר
                                                    החלטה להתקדם
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
                </>
            )}

            {draft ? (
                <dialog ref={createDialog} className={styles.modalBackdrop} aria-labelledby="create-onboarding-title" onCancel={() => setDraft(null)}>
                    <section
                        aria-labelledby="create-onboarding-title"
                        className={styles.onboardingModal}
                    >
                        <div className={styles.modalHeader}>
                            <div>
                                <span className={styles.eyebrow}>{draft.sourceLabel}</span>
                                <h3 className={styles.modalTitle} id="create-onboarding-title">
                                    פתיחת תיק הצטרפות
                                </h3>
                            </div>
                            <button
                                aria-label="סגירת חלון פתיחת תיק"
                                className={styles.modalCloseButton}
                                type="button"
                                onClick={() => setDraft(null)}
                            >
                                ×
                            </button>
                        </div>

                        <form className={styles.onboardingForm} noValidate onSubmit={handleSubmit(handleCreate)}>
                            <label className={styles.compactField}>
                                <span>שם ההורה</span>
                                <input

                                    readOnly
                                    value={draft.parentName}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>טלפון</span>
                                <input

                                    readOnly
                                    value={draft.phone}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>גיל הילד/ה כפי שנמסר</span>
                                <input

                                    readOnly
                                    value={draft.childAge || "לא צוין"}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>שנת לימודים</span>
                                <input

                                    aria-invalid={Boolean(createFormErrors.schoolYear)}
                                    aria-describedby={createFormErrors.schoolYear ? "school-year-error" : undefined}
                                    pattern="[0-9]{4}-[0-9]{4}"
                                    placeholder="2026-2027"
                                    {...register("schoolYear", {
                                        required: "יש להזין שנת לימודים",
                                        pattern: { value: /^[0-9]{4}-[0-9]{4}$/, message: "יש להזין שנה בפורמט 2026-2027" },
                                    })}
                                />
                                {createFormErrors.schoolYear ? <span id="school-year-error" role="alert" className={styles.formErrorMessage}>{createFormErrors.schoolYear.message}</span> : null}
                            </label>
                            <label className={styles.compactField}>
                                <span>הערה פנימית - אופציונלית</span>
                                <textarea

                                    maxLength={2000}
                                    {...register("internalNote")}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>קישור למשפחה קיימת - אם זה אח/ות</span>
                                <select {...register("existingFamilyId")}>
                                    <option value="">ילד/ה ראשון/ה במשפחה</option>
                                    {[...families]
                                        .sort((left, right) => Number(familyMatchesPhone(right, draft.phone)) - Number(familyMatchesPhone(left, draft.phone)))
                                        .map((family) => (
                                            <option value={family.id} key={family.id}>
                                                {familyMatchesPhone(family, draft.phone) ? "התאמה לפי טלפון · " : ""}{familyOptionLabel(family)}
                                            </option>
                                        ))}
                                </select>
                            </label>
                            <p className={styles.modalHint}>
                                פרטי הילד וההורים יושלמו בהמשך. אם נבחרה משפחה קיימת,
                                הילד/ה החדש/ה יקושר/תקושר אליה כאח/ות לאחר שמירת הפרטים.
                            </p>
                            {createError ? (
                                <p className={styles.formErrorMessage} role="alert">
                                    {createError}
                                </p>
                            ) : null}
                            <div className={styles.modalActions}>
                                <AdminButton
                                    className={styles.secondaryButton}
                                    type="button"
                                    onClick={() => setDraft(null)}
                                >
                                    ביטול
                                </AdminButton>
                                <AdminButton variant="primary"
                                    className={styles.primaryButton}
                                    aria-busy={creating}
                                    disabled={creating}
                                    type="submit"
                                >
                                    {creating
                                        ? "יוצר תיק וקישור..."
                                        : "יצירת תיק וקישור להורה"}
                                </AdminButton>
                            </div>
                        </form>
                    </section>
                </dialog>
            ) : null}
        </section>
    );
};

export default DaycareRegistrationsView;
