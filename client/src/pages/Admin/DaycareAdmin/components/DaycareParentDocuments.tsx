import axios from "axios";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import { adminParentDocumentPdfUrl, listAdminDaycareParentDocumentYears, saveAdminDaycareParentDocumentYear, unlockAdminDaycareParentDocumentYear, updateAdminDaycareParentDocumentSharing, type AdminDaycareParentDocumentYear, type DaycareParentDocumentBundle, type DaycareParentDocumentKey } from "../../../../services/daycareParentDocumentService";
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
    visibleDocument: "welcome" | "routine" | "holidays" | "menu" | "equipment";
};

const documentLabels = {
    welcome: { title: "ברוכים הבאים", save: "שמירת מסמך ברוכים הבאים" },
    routine: { title: "סדר יום", save: "שמירת סדר היום" },
    holidays: { title: "לוח חופשות", save: "שמירת לוח החופשות" },
    menu: { title: "תפריט", save: "שמירת התפריט" },
    equipment: { title: "ציוד אישי", save: "שמירת הציוד האישי" },
};

const DaycareParentDocuments = ({ visibleDocument }: DaycareParentDocumentsProps) => {
    const [years, setYears] = useState<AdminDaycareParentDocumentYear[]>([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [documents, setDocuments] = useState<DaycareParentDocumentBundle["documents"] | null>(null);
    const [routineRows, setRoutineRows] = useState("");
    const [holidayRows, setHolidayRows] = useState("");
    const [clarifications, setClarifications] = useState("");
    const [equipmentRows, setEquipmentRows] = useState("");
    const [lockedAt, setLockedAt] = useState<string>();
    const [isNewYear, setIsNewYear] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sharingBusy, setSharingBusy] = useState(false);
    const [sharedDocumentKeys, setSharedDocumentKeys] = useState<DaycareParentDocumentKey[]>([]);
    const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const apply = (item: AdminDaycareParentDocumentYear, creating = false) => {
        const nextDocuments = structuredClone(item.documents);
        setSelectedYear(creating ? nextSchoolYear(years) : item.schoolYear);
        setDocuments(nextDocuments);
        setRoutineRows(rowsToText(nextDocuments.routine.items, ["time", "activity"]));
        setHolidayRows(rowsToText(nextDocuments.holidays.items, ["occasion", "hebrewDate", "vacationDates"]));
        setClarifications(nextDocuments.holidays.clarifications.join("\n"));
        setEquipmentRows(nextDocuments.equipment.items.join("\n"));
        setLockedAt(creating ? undefined : item.lockedAt);
        setSharedDocumentKeys(creating ? [] : item.sharedDocumentKeys ?? []);
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
                setEquipmentRows(nextDocuments.equipment.items.join("\n"));
                setLockedAt(first.lockedAt);
                setSharedDocumentKeys(first.sharedDocumentKeys ?? []);
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
        const menu = documents.menu.items.map((item) => ({
            day: item.day.trim(),
            breakfast: item.breakfast.trim(),
            ...(item.lunch?.trim() ? { lunch: item.lunch.trim() } : {}),
            ...(item.afternoon?.trim() ? { afternoon: item.afternoon.trim() } : {}),
        }));
        const clarificationItems = clarifications.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const equipmentItems = equipmentRows.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (!/^\d{4}-\d{4}$/.test(selectedYear) || !routine.length || !holidays.length) {
            setError("יש להזין שנת לימודים תקינה ולפחות שורה אחת בסדר היום ובלוח החופשות.");
            return;
        }
        if (menu.some((item) => !item.day || !item.breakfast)) {
            setError("בכל יום בתפריט יש להזין שם יום וארוחת בוקר. צהריים ומנחה יכולים להישאר ריקים.");
            return;
        }
        if (!equipmentItems.length) {
            setError("יש להזין לפחות פריט ציוד אישי אחד.");
            return;
        }
        setBusy(true); setError(""); setNotice("");
        try {
            const saved = await saveAdminDaycareParentDocumentYear(selectedYear, {
                ...documents,
                routine: { ...documents.routine, items: routine.map(([time, activity]) => ({ time, activity })) },
                holidays: { ...documents.holidays, items: holidays.map(([occasion, hebrewDate, vacationDates]) => ({ occasion, hebrewDate, vacationDates })), clarifications: clarificationItems },
                menu: { ...documents.menu, items: menu },
                equipment: { ...documents.equipment, items: equipmentItems },
            });
            await load(saved.schoolYear);
            setIsNewYear(false);
            setNotice("המסמך נשמר. הגדרת השיתוף להורים לא השתנתה.");
        } catch (saveError) { setError(messageFromError(saveError)); }
        finally { setBusy(false); }
    };

    const toggleSharing = async () => {
        if (isNewYear || sharingBusy) return;
        const shared = !sharedDocumentKeys.includes(visibleDocument);
        setSharingBusy(true); setError(""); setNotice("");
        try {
            const updated = await updateAdminDaycareParentDocumentSharing(selectedYear, visibleDocument, shared);
            setSharedDocumentKeys(updated.sharedDocumentKeys);
            setYears((items) => items.map((item) => item.schoolYear === updated.schoolYear ? updated : item));
            setNotice(shared ? "המסמך נוסף לקישור האישי של ההורים." : "השיתוף הוסר. המסמך נשאר זמין רק לך ולהורדת PDF.");
        } catch (sharingError) { setError(messageFromError(sharingError)); }
        finally { setSharingBusy(false); }
    };

    const unlock = async () => {
        if (!lockedAt || busy) return;
        setBusy(true); setError(""); setNotice("");
        try {
            await unlockAdminDaycareParentDocumentYear(selectedYear);
            setUnlockDialogOpen(false);
            await load(selectedYear);
            setNotice("הנעילה שוחררה. אפשר לערוך ולשמור את מסמכי השנה.");
        } catch (unlockError) { setError(messageFromError(unlockError)); }
        finally { setBusy(false); }
    };

    const updateMenuItem = (index: number, field: "day" | "breakfast" | "lunch" | "afternoon", value: string) => {
        if (!documents) return;
        const items = documents.menu.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
        setDocuments({ ...documents, menu: { ...documents.menu, items } });
    };

    const addMenuItem = () => {
        if (!documents) return;
        setDocuments({
            ...documents,
            menu: {
                ...documents.menu,
                items: [...documents.menu.items, { day: "", breakfast: "", lunch: "", afternoon: "" }],
            },
        });
    };

    const removeMenuItem = (index: number) => {
        if (!documents) return;
        setDocuments({ ...documents, menu: { ...documents.menu, items: documents.menu.items.filter((_, itemIndex) => itemIndex !== index) } });
    };

    const moveMenuItem = (index: number, direction: -1 | 1) => {
        if (!documents) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= documents.menu.items.length) return;
        const items = [...documents.menu.items];
        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
        setDocuments({ ...documents, menu: { ...documents.menu, items } });
    };

    if (!documents) return <section className={styles.section}><p>{error || "טוען מידע להורים..."}</p></section>;

    return (
        <section className={styles.section} aria-labelledby="parent-documents-title">
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>מידע שנתי</span>
                    <h2 className={styles.title} id="parent-documents-title">{documentLabels[visibleDocument].title}</h2>
                    <p className={styles.intro}>עריכת המסמך אינה מפרסמת אותו. אפשר לשתף אותו בנפרד בקישור האישי של ההורים או להוריד PDF לשימוש פנימי.</p>
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
                {visibleDocument === "welcome" ? <article className={styles.card}>
                    <h3>ברוכים הבאים למעון חב״ד יפו</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.subtitle} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, subtitle: event.target.value } })} /></label>
                    <label className={styles.label}>פתיח - פסקה בכל שורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.welcome.intro.join("\n")} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, intro: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) } })} /></label>
                    <div className={styles.welcomeFieldGrid}>
                        <label className={styles.label}>שעות ימים א׳-ה׳<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.hours.weekdays} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, hours: { ...documents.welcome.hours, weekdays: event.target.value } } })} /></label>
                        <label className={styles.label}>שעות יום שישי<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.hours.friday} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, hours: { ...documents.welcome.hours, friday: event.target.value } } })} /></label>
                        <label className={styles.label}>כתובת<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.hours.address} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, hours: { ...documents.welcome.hours, address: event.target.value } } })} /></label>
                    </div>
                    <label className={styles.label}>היום שלנו - פסקה בכל שורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.welcome.day.join("\n")} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, day: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) } })} /></label>
                    <label className={styles.label}>קשר עם ההורים - פסקה בכל שורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.welcome.parents.join("\n")} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, parents: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) } })} /></label>
                    <label className={styles.label}>רוצים להצטרף - פסקה בכל שורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.welcome.join.join("\n")} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, join: event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) } })} /></label>
                    <div className={styles.welcomeFieldGrid}>
                        <label className={styles.label}>שם איש הקשר<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.contactName} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, contactName: event.target.value } })} /></label>
                        <label className={styles.label}>טלפון ליצירת קשר<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.welcome.contactPhone} onChange={(event) => setDocuments({ ...documents, welcome: { ...documents.welcome, contactPhone: event.target.value } })} /></label>
                    </div>
                </article> : null}

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
                    <label className={styles.label}>הבהרות - כל הבהרה בשורה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={clarifications} onChange={(event) => setClarifications(event.target.value)} /></label>
                </article> : null}

                {visibleDocument === "menu" ? <article className={styles.card}>
                    <h3>תפריט</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.menu.subtitle} onChange={(event) => setDocuments({ ...documents, menu: { ...documents.menu, subtitle: event.target.value } })} /></label>
                    <div className={styles.menuEditor} aria-label="עריכת ימי התפריט">
                        <div className={styles.menuEditorHeader}>
                            <div>
                                <h4>ימי התפריט</h4>
                                <p>אפשר להוסיף ימים, לערוך אותם ולשנות את הסדר. שדות ריקים של צהריים או מנחה לא יוצגו להורים.</p>
                            </div>
                            <button className={styles.addDayButton} type="button" disabled={Boolean(lockedAt)} onClick={addMenuItem}>
                                <Plus size={18} aria-hidden="true" /> הוספת יום
                            </button>
                        </div>
                        {documents.menu.items.length ? <div className={styles.menuDayList}>
                            {documents.menu.items.map((item, index) => <section className={styles.menuDayEditor} key={index}>
                                <header className={styles.menuDayHeader}>
                                    <span className={styles.menuDayNumber}>יום {index + 1}</span>
                                    <div className={styles.menuDayActions}>
                                        <button type="button" disabled={Boolean(lockedAt) || index === 0} onClick={() => moveMenuItem(index, -1)} aria-label={`העברת יום ${index + 1} למעלה`}><ArrowUp size={17} /></button>
                                        <button type="button" disabled={Boolean(lockedAt) || index === documents.menu.items.length - 1} onClick={() => moveMenuItem(index, 1)} aria-label={`העברת יום ${index + 1} למטה`}><ArrowDown size={17} /></button>
                                        <button type="button" disabled={Boolean(lockedAt)} onClick={() => removeMenuItem(index)} aria-label={`מחיקת יום ${index + 1}`}><Trash2 size={17} /></button>
                                    </div>
                                </header>
                                <div className={styles.menuDayFields}>
                                    <label className={styles.label}>יום<input className={styles.input} disabled={Boolean(lockedAt)} value={item.day} onChange={(event) => updateMenuItem(index, "day", event.target.value)} placeholder="שם היום" /></label>
                                    <label className={styles.label}>ארוחת בוקר<textarea className={styles.menuMealInput} disabled={Boolean(lockedAt)} value={item.breakfast} onChange={(event) => updateMenuItem(index, "breakfast", event.target.value)} /></label>
                                    <label className={styles.label}>ארוחת צהריים<textarea className={styles.menuMealInput} disabled={Boolean(lockedAt)} value={item.lunch ?? ""} onChange={(event) => updateMenuItem(index, "lunch", event.target.value)} /></label>
                                    <label className={styles.label}>ארוחת מנחה<textarea className={styles.menuMealInput} disabled={Boolean(lockedAt)} value={item.afternoon ?? ""} onChange={(event) => updateMenuItem(index, "afternoon", event.target.value)} /></label>
                                </div>
                            </section>)}
                        </div> : <p className={styles.emptyMenu}>עדיין לא נוספו ימים לתפריט.</p>}
                    </div>
                    <label className={styles.label}>הערה להורים<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.menu.note ?? ""} onChange={(event) => setDocuments({ ...documents, menu: { ...documents.menu, note: event.target.value } })} /></label>
                </article> : null}

                {visibleDocument === "equipment" ? <article className={styles.card}>
                    <h3>ציוד אישי - מה להביא למעון</h3>
                    <label className={styles.label}>כותרת משנה<input className={styles.input} disabled={Boolean(lockedAt)} value={documents.equipment.subtitle} onChange={(event) => setDocuments({ ...documents, equipment: { ...documents.equipment, subtitle: event.target.value } })} /></label>
                    <label className={styles.label}>רשימת הציוד - כל פריט בשורה<textarea className={styles.textarea} disabled={Boolean(lockedAt)} value={equipmentRows} onChange={(event) => setEquipmentRows(event.target.value)} /></label>
                    <label className={styles.label}>תיבת הדגשה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.equipment.important} onChange={(event) => setDocuments({ ...documents, equipment: { ...documents.equipment, important: event.target.value } })} /></label>
                    <label className={styles.label}>הערה תחתונה<textarea className={styles.smallTextarea} disabled={Boolean(lockedAt)} value={documents.equipment.note} onChange={(event) => setDocuments({ ...documents, equipment: { ...documents.equipment, note: event.target.value } })} /></label>
                </article> : null}
            </div>

            <div className={styles.actions}>
                {!lockedAt ? <button className={styles.primaryButton} type="button" disabled={busy} onClick={() => void save()}>{busy ? "שומר..." : documentLabels[visibleDocument].save}</button> : null}
                {lockedAt ? <button className={styles.secondaryButton} type="button" disabled={busy} onClick={() => setUnlockDialogOpen(true)}>בדיקה ושחרור נעילה</button> : null}
                {isNewYear ? <button className={styles.secondaryButton} type="button" onClick={() => apply(years[0])}>ביטול</button> : null}
                {!isNewYear ? <button className={sharedDocumentKeys.includes(visibleDocument) ? styles.sharedButton : styles.secondaryButton} type="button" disabled={sharingBusy} onClick={() => void toggleSharing()}>{sharingBusy ? "מעדכן שיתוף..." : sharedDocumentKeys.includes(visibleDocument) ? "משותף להורים · הסרת שיתוף" : "שיתוף להורים"}</button> : null}
                {!isNewYear ? <a className={styles.secondaryButton} href={adminParentDocumentPdfUrl(selectedYear, visibleDocument)} target="_blank" rel="noreferrer">הורדת PDF לשימוש פנימי</a> : null}
            </div>
            <div aria-live="polite">{notice ? <p className={styles.success}>{notice}</p> : null}{error ? <p className={styles.error}>{error}</p> : null}</div>
            <ConfirmDialog
                open={unlockDialogOpen}
                title="בדיקה ושחרור נעילת המסמכים"
                message="המערכת תשחרר את הנעילה רק אם לא נשאר אף הסכם חתום לשנת הלימודים הזו. אם זו הייתה חתימת ניסוי, יש למחוק תחילה את תיק הבדיקה מתוך מסך התיק."
                confirmLabel="בדיקה ושחרור"
                busy={busy}
                onConfirm={() => void unlock()}
                onClose={() => setUnlockDialogOpen(false)}
            />
        </section>
    );
};

export default DaycareParentDocuments;
