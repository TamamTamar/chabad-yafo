import axios from "axios";
import { useEffect, useState } from "react";
import { listAdminDaycareParentDocumentYears, saveAdminDaycareParentDocumentYear, type AdminDaycareParentDocumentYear, type DaycareParentDocumentBundle } from "../../../../services/daycareParentDocumentService";
import styles from "./DaycareParentDocuments.module.scss";

const rowsToText = <T,>(items: T[], fields: Array<keyof T>) =>
    items.map((item) => fields.map((field) => String(item[field])).join(" | ")).join("\n");

const nextSchoolYear = (items: AdminDaycareParentDocumentYear[]) => {
    const latest = Math.max(...items.map((item) => Number(item.schoolYear.slice(0, 4))), new Date().getFullYear());
    return `${latest + 1}-${latest + 2}`;
};

const messageFromError = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || "לא הצלחנו לשמור את המידע."
    : "לא הצלחנו לשמור את המידע.";

type DaycareParentDocumentsProps = {
    visibleDocument: "routine" | "holidays" | "menu";
};

const documentLabels = {
    routine: { title: "סדר יום", save: "שמירת סדר היום" },
    holidays: { title: "לוח חופשות", save: "שמירת לוח החופשות" },
    menu: { title: "תפריט", save: "שמירת התפריט" },
};

const DaycareParentDocuments = ({ visibleDocument }: DaycareParentDocumentsProps) => {
    const [years, setYears] = useState<AdminDaycareParentDocumentYear[]>([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [documents, setDocuments] = useState<DaycareParentDocumentBundle["documents"] | null>(null);
    const [routineRows, setRoutineRows] = useState("");
    const [holidayRows, setHolidayRows] = useState("");
    const [clarifications, setClarifications] = useState("");
    const [menuRows, setMenuRows] = useState("");
    const [lockedAt, setLockedAt] = useState<string>();
    const [isNewYear, setIsNewYear] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const apply = (item: AdminDaycareParentDocumentYear, creating = false) => {
        const nextDocuments = structuredClone(item.documents);
        setSelectedYear(creating ? nextSchoolYear(years) : item.schoolYear);
        setDocuments(nextDocuments);
        setRoutineRows(rowsToText(nextDocuments.routine.items, ["time", "activity"]));
        setHolidayRows(rowsToText(nextDocuments.holidays.items, ["occasion", "hebrewDate", "vacationDates"]));
        setClarifications(nextDocuments.holidays.clarifications.join("\n"));
        setMenuRows(rowsToText(nextDocuments.menu.items, ["meal", "description"]));
        setLockedAt(creating ? undefined : item.lockedAt);
        setIsNewYear(creating);
        setNotice("");
        setError("");
    };

    const load = async (preferredYear?: string) => {
        const items = await listAdminDaycareParentDocumentYears();
        setYears(items);
        const selected = items.find((item) => item.schoolYear === preferredYear) ?? items[0];
        if (selected) apply(selected);
    };

    useEffect(() => {
        let active = true;
        void listAdminDaycareParentDocumentYears().then((items) => {
            if (!active) return;
            setYears(items);
            const first = items[0];
            if (first) {
                const nextDocuments = structuredClone(first.documents);
                setSelectedYear(first.schoolYear);
                setDocuments(nextDocuments);
                setRoutineRows(rowsToText(nextDocuments.routine.items, ["time", "activity"]));
                setHolidayRows(rowsToText(nextDocuments.holidays.items, ["occasion", "hebrewDate", "vacationDates"]));
                setClarifications(nextDocuments.holidays.clarifications.join("\n"));
                setMenuRows(rowsToText(nextDocuments.menu.items, ["meal", "description"]));
                setLockedAt(first.lockedAt);
            }
        }).catch((loadError) => { if (active) setError(messageFromError(loadError)); });
        return () => { active = false; };
    }, []);

    const parseRows = (value: string, columns: number) => value.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split("|").map((part) => part.trim()))
        .filter((parts) => parts.length === columns && parts.every(Boolean));

    const save = async () => {
        if (!documents || lockedAt) return;
        const routine = parseRows(routineRows, 2);
        const holidays = parseRows(holidayRows, 3);
        const menu = parseRows(menuRows, 2);
        const clarificationItems = clarifications.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!/^\d{4}-\d{4}$/.test(selectedYear) || !routine.length || !holidays.length) {
            setError("יש להזין שנת לימודים תקינה ולפחות שורה אחת בסדר היום ובלוח החופשות.");
            return;
        }
        setBusy(true); setError(""); setNotice("");
        try {
            const saved = await saveAdminDaycareParentDocumentYear(selectedYear, {
                ...documents,
                routine: { ...documents.routine, items: routine.map(([time, activity]) => ({ time, activity })) },
                holidays: { ...documents.holidays, items: holidays.map(([occasion, hebrewDate, vacationDates]) => ({ occasion, hebrewDate, vacationDates })), clarifications: clarificationItems },
                menu: { ...documents.menu, items: menu.map(([meal, description]) => ({ meal, description })) },
            });
            await load(saved.schoolYear);
            setIsNewYear(false);
            setNotice("המידע נשמר ומוצג להורים.");
        } catch (saveError) { setError(messageFromError(saveError)); }
        finally { setBusy(false); }
    };

    if (!documents) return <section className={styles.section}><p>{error || "טוען מידע להורים..."}</p></section>;

    return (
        <section className={styles.section} aria-labelledby="parent-documents-title">
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>מידע שנתי</span>
                    <h2 className={styles.title} id="parent-documents-title">{documentLabels[visibleDocument].title}</h2>
                    <p className={styles.intro}>שומרים ישירות. בחתימה הראשונה של הורה המסמכים לשנה הזו ננעלים אוטומטית.</p>
                </div>
                <button className={styles.secondaryButton} type="button" disabled={!years.length || isNewYear} onClick={() => apply(years[0], true)}>פתיחת שנת לימודים חדשה</button>
            </header>

            <div className={styles.yearRow}>
                <label className={styles.label}>שנת לימודים
                    {isNewYear ? (
                        <input className={styles.input} value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} placeholder="2027-2028" />
                    ) : (
                        <select className={styles.input} value={selectedYear} onChange={(event) => { const item = years.find((year) => year.schoolYear === event.target.value); if (item) apply(item); }}>
                            {years.map((year) => <option value={year.schoolYear} key={year.schoolYear}>{year.schoolYear}{year.lockedAt ? " · נעול" : " · ניתן לעריכה"}</option>)}
                        </select>
                    )}
                </label>
                <div className={lockedAt ? styles.locked : styles.editable}>{lockedAt ? "נעול לאחר חתימת הורה" : "ניתן לעריכה"}</div>
            </div>

            <div className={styles.cards}>
                {visibleDocument === "routine" ? <article className={styles.card}>
                    <h3>סדר יום</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.routine.subtitle} onChange={(event) => setDocuments({ ...documents, routine: { ...documents.routine, subtitle: event.target.value } })} /></label>
                    <label className={styles.label}>כל פעילות בשורה: שעה | פעילות<textarea className={styles.textarea} disabled={Boolean(lockedAt)} value={routineRows} onChange={(event) => setRoutineRows(event.target.value)} /></label>
                    <label className={styles.label}>הערה להורים<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.routine.note} onChange={(event) => setDocuments({ ...documents, routine: { ...documents.routine, note: event.target.value } })} /></label>
                </article> : null}

                {visibleDocument === "holidays" ? <article className={styles.card}>
                    <h3>לוח חופשות</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.holidays.subtitle} onChange={(event) => setDocuments({ ...documents, holidays: { ...documents.holidays, subtitle: event.target.value } })} /></label>
                    <label className={styles.label}>כל מועד בשורה: מועד | תאריך עברי | תאריכי חופשה<textarea className={styles.textarea} disabled={Boolean(lockedAt)} value={holidayRows} onChange={(event) => setHolidayRows(event.target.value)} /></label>
                    <label className={styles.label}>הבהרות — כל הבהרה בשורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={clarifications} onChange={(event) => setClarifications(event.target.value)} /></label>
                </article> : null}

                {visibleDocument === "menu" ? <article className={styles.card}>
                    <h3>תפריט</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.menu.subtitle} onChange={(event) => setDocuments({ ...documents, menu: { ...documents.menu, subtitle: event.target.value } })} /></label>
                    <label className={styles.label}>כל ארוחה בשורה: ארוחה | תיאור<textarea className={styles.textarea} disabled={Boolean(lockedAt)} value={menuRows} onChange={(event) => setMenuRows(event.target.value)} placeholder="ארוחת בוקר | ירקות, לחם, גבינה וביצה" /></label>
                    <label className={styles.label}>הערה להורים<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.menu.note ?? ""} onChange={(event) => setDocuments({ ...documents, menu: { ...documents.menu, note: event.target.value } })} /></label>
                </article> : null}
            </div>

            <div className={styles.actions}>
                {!lockedAt ? <button className={styles.primaryButton} type="button" disabled={busy} onClick={() => void save()}>{busy ? "שומר..." : documentLabels[visibleDocument].save}</button> : null}
                {isNewYear ? <button className={styles.secondaryButton} type="button" onClick={() => apply(years[0])}>ביטול</button> : null}
            </div>
            <div aria-live="polite">{notice ? <p className={styles.success}>{notice}</p> : null}{error ? <p className={styles.error}>{error}</p> : null}</div>
        </section>
    );
};

export default DaycareParentDocuments;
