import axios from "axios";
import { gematriya, HDate } from "@hebcal/hdate";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import { deleteAdminDaycareAnnualPlan, listAdminDaycareAnnualPlans, previewAdminDaycareAnnualPlan, saveAdminDaycareAnnualPlan, syncAdminDaycareAnnualPlanHolidays, updateAdminDaycareAnnualPlanSharing, type DaycareAnnualPlan } from "../../../../services/daycareAnnualPlanService";
import styles from "./DaycareParentDocuments.module.scss";

const nextSchoolYear = (items: DaycareAnnualPlan[]) => {
    const latest = Math.max(...items.map((item) => Number(item.schoolYear.slice(0, 4))), new Date().getFullYear());
    return `${latest + 1}-${latest + 2}`;
};

const messageFromError = (error: unknown) => axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || "לא הצלחנו לשמור את התוכנית."
    : "לא הצלחנו לשמור את התוכנית.";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const dateFromIso = (value: string) => new Date(`${value}T12:00:00Z`);
const gregorianMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const hebrewMonth = (date: Date) => new HDate(date).render("he").replace(/[\u0591-\u05C7]/g, "").replace(/^\d+\s+/, "").replace(/,\s*\d+$/, "");
const monthLabel = (date: Date) => `${hebrewMonth(date)} · ${gregorianMonths[date.getUTCMonth()]}`;
const shiftedIsoDate = (value: string, years: number) => {
    const date = dateFromIso(value);
    date.setUTCFullYear(date.getUTCFullYear() + years);
    return isoDate(date);
};
const planForNextYear = (item: DaycareAnnualPlan, schoolYear: string) => {
    const years = Number(schoolYear.slice(0, 4)) - Number(item.schoolYear.slice(0, 4));
    const startDate = shiftedIsoDate(item.startDate, years);
    const hebrewYearDate = dateFromIso(startDate);
    hebrewYearDate.setUTCDate(hebrewYearDate.getUTCDate() + 45);
    return {
        ...structuredClone(item),
        schoolYear,
        startDate,
        endDate: shiftedIsoDate(item.endDate, years),
        schoolYearLabel: `שנת הלימודים ${gematriya(new HDate(hebrewYearDate).getFullYear())}`,
        calendar: {
            vacations: item.calendar.vacations.map((entry) => ({ ...entry, startDate: shiftedIsoDate(entry.startDate, years), endDate: shiftedIsoDate(entry.endDate, years) })),
            anchors: item.calendar.anchors.map((entry) => ({ ...entry, date: shiftedIsoDate(entry.date, years) })),
            specialEvents: item.calendar.specialEvents.map((entry) => ({ ...entry, date: shiftedIsoDate(entry.date, years) })),
        },
        sharedWithParents: false,
    };
};
const shortDate = (date: Date) => `${date.getUTCDate()}.${date.getUTCMonth() + 1}`;
const rangeLabel = (dates: Date[]) => dates.length === 1 ? shortDate(dates[0]) : `${shortDate(dates[0])}-${shortDate(dates.at(-1)!)}`;

const rowDuration = (dateRange: string, schoolYearStart: string) => {
    const start = dateFromIso(schoolYearStart);
    const tokens = dateRange.split("-");
    const endParts = tokens.at(-1)!.split(".").map(Number);
    const startParts = tokens.length > 1 ? tokens[0].split(".").map(Number) : endParts;
    const startMonth = startParts[1] ?? endParts[1];
    const makeDate = (day: number, month: number) => new Date(Date.UTC(month - 1 >= start.getUTCMonth() ? start.getUTCFullYear() : start.getUTCFullYear() + 1, month - 1, day, 12));
    const first = makeDate(startParts[0], startMonth), last = makeDate(endParts[0], endParts[1]);
    let count = 0;
    for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) if (cursor.getUTCDay() !== 6) count += 1;
    return Math.max(1, count);
};

const distributeDates = (dates: Date[], indices: number[], assignments: Date[][]) => {
    if (!indices.length) return;
    if (dates.length < indices.length) throw new Error("אין מספיק ימי פעילות בין החגים כדי לשבץ את כל הנושאים.");
    let cursor = 0;
    indices.forEach((rowIndex, index) => {
        const remainingRows = indices.length - index;
        const take = Math.max(1, Math.floor((dates.length - cursor) / remainingRows));
        assignments[rowIndex] = dates.slice(cursor, cursor + take);
        cursor += take;
    });
};

const generateSchedule = (plan: DaycareAnnualPlan) => {
    const first = dateFromIso(plan.startDate), last = dateFromIso(plan.endDate);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || first > last) throw new Error("תאריכי תחילת וסיום השנה אינם תקינים.");
    const vacationDays = new Set<string>();
    plan.calendar.vacations.forEach((vacation) => {
        const vacationStart = dateFromIso(vacation.startDate), vacationEnd = dateFromIso(vacation.endDate);
        if (vacationStart > vacationEnd) throw new Error(`טווח החופשה „${vacation.name}” אינו תקין.`);
        for (const cursor = new Date(vacationStart); cursor <= vacationEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) vacationDays.add(isoDate(cursor));
    });
    const available: Date[] = [];
    for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        if (cursor.getUTCDay() !== 6 && !vacationDays.has(isoDate(cursor))) available.push(new Date(cursor));
    }
    const assignments: Date[][] = plan.items.map(() => []);
    const vacationByName = new Map(plan.calendar.vacations.map((vacation) => [vacation.name, vacation.startDate]));
    const anchors = plan.calendar.anchors.map((anchor) => ({ ...anchor, date: vacationByName.get(anchor.name) ?? anchor.date, indices: anchor.topics.map((topic) => plan.items.findIndex((item) => item.topic === topic)) }))
        .filter((anchor) => anchor.indices.length && anchor.indices.every((index) => index >= 0))
        .sort((a, b) => a.indices[0] - b.indices[0]);
    let rowCursor = 0, dayCursor = 0;
    anchors.forEach((anchor) => {
        const firstIndex = Math.min(...anchor.indices), lastIndex = Math.max(...anchor.indices);
        if (firstIndex < rowCursor) return;
        const anchorDate = dateFromIso(anchor.date);
        const endPosition = available.findIndex((date) => date >= anchorDate);
        const anchorEnd = endPosition < 0 ? available.length : endPosition;
        const durations = anchor.indices.map((index) => rowDuration(plan.items[index].dateRange, plan.startDate));
        const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
        const anchorStart = Math.max(dayCursor, anchorEnd - totalDuration);
        distributeDates(available.slice(dayCursor, anchorStart), Array.from({ length: firstIndex - rowCursor }, (_, index) => rowCursor + index), assignments);
        let position = anchorStart;
        anchor.indices.forEach((rowIndex, index) => {
            assignments[rowIndex] = available.slice(position, position + durations[index]);
            position += durations[index];
        });
        rowCursor = lastIndex + 1;
        dayCursor = Math.max(anchorEnd, position);
    });
    distributeDates(available.slice(dayCursor), Array.from({ length: plan.items.length - rowCursor }, (_, index) => rowCursor + index), assignments);
    const items = plan.items.map((item, index) => assignments[index].length ? { ...item, month: monthLabel(assignments[index][0]), dateRange: rangeLabel(assignments[index]), specialEvent: undefined } : item);
    plan.calendar.specialEvents.forEach((event) => {
        const eventDate = dateFromIso(event.date).getTime();
        let bestIndex = -1, bestDistance = Number.POSITIVE_INFINITY;
        assignments.forEach((dates, index) => {
            if (!dates.length) return;
            const startTime = dates[0].getTime(), endTime = dates.at(-1)!.getTime();
            const distance = eventDate < startTime ? startTime - eventDate : eventDate > endTime ? eventDate - endTime : 0;
            if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
        });
        if (bestIndex >= 0) items[bestIndex] = { ...items[bestIndex], specialEvent: items[bestIndex].specialEvent ? `${items[bestIndex].specialEvent} · ${event.name}` : event.name };
    });
    return { ...plan, items };
};

const DaycareAnnualPlanEditor = () => {
    const [plans, setPlans] = useState<DaycareAnnualPlan[]>([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [plan, setPlan] = useState<DaycareAnnualPlan | null>(null);
    const [isNewYear, setIsNewYear] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [sharingBusy, setSharingBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");

    const apply = (item: DaycareAnnualPlan, creating = false, sourcePlans = plans) => {
        const targetYear = creating ? nextSchoolYear(sourcePlans) : item.schoolYear;
        setSelectedYear(targetYear);
        setPlan(creating ? planForNextYear(item, targetYear) : structuredClone(item));
        setIsNewYear(creating);
        setDirty(creating);
        setNotice("");
        setError("");
    };

    const load = async (preferredYear?: string) => {
        const items = await listAdminDaycareAnnualPlans();
        setPlans(items);
        const selected = items.find((item) => item.schoolYear === preferredYear) ?? items[0];
        if (selected) apply(selected, false, items);
    };

    useEffect(() => {
        let active = true;
        void listAdminDaycareAnnualPlans().then((items) => {
            if (!active) return;
            setPlans(items);
            if (items[0]) {
                setSelectedYear(items[0].schoolYear);
                setPlan(structuredClone(items[0]));
                setIsNewYear(false);
                setDirty(false);
                setNotice("");
                setError("");
            }
        }).catch((loadError) => { if (active) setError(messageFromError(loadError)); });
        return () => { active = false; };
    }, []);

    const changePlan = (next: DaycareAnnualPlan) => { setPlan(next); setDirty(true); setNotice(""); };

    const updateItem = (index: number, field: "month" | "dateRange" | "topic" | "specialEvent", value: string) => {
        if (!plan) return;
        changePlan({ ...plan, items: plan.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) });
    };

    const addItem = () => {
        if (!plan) return;
        changePlan({ ...plan, items: [...plan.items, { month: plan.items.at(-1)?.month ?? "ספטמבר", dateRange: "", topic: "", specialEvent: "" }] });
    };

    const removeItem = (index: number) => {
        if (!plan) return;
        changePlan({ ...plan, items: plan.items.filter((_, itemIndex) => itemIndex !== index) });
    };

    const moveItem = (index: number, direction: -1 | 1) => {
        if (!plan) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= plan.items.length) return;
        const items = [...plan.items];
        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
        changePlan({ ...plan, items });
    };

    const updateVacation = (index: number, field: "name" | "startDate" | "endDate", value: string) => {
        const previousName = plan?.calendar.vacations[index]?.name;
        if (!plan) return;
        const vacations = plan.calendar.vacations.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
        const anchors = plan.calendar.anchors.map((anchor) => anchor.name === previousName ? { ...anchor, ...(field === "name" ? { name: value } : {}), ...(field === "startDate" ? { date: value } : {}) } : anchor);
        changePlan({ ...plan, calendar: { ...plan.calendar, vacations, anchors } });
    };

    const updateSpecialEvent = (index: number, field: "name" | "date", value: string) => {
        if (!plan) return;
        changePlan({ ...plan, calendar: { ...plan.calendar, specialEvents: plan.calendar.specialEvents.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) } });
    };

    const autoGenerate = () => {
        if (!plan) return;
        setError("");
        try {
            changePlan(generateSchedule(plan));
            setNotice("התאריכים והחודשים העבריים נוצרו מחדש. מומלץ לעבור על התוצאה לפני השמירה.");
        } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "לא הצלחנו ליצור את התאריכים."); }
    };

    const removePlan = async () => {
        if (busy || isNewYear) return;
        setBusy(true); setError("");
        try {
            await deleteAdminDaycareAnnualPlan(selectedYear);
            setDeleteDialogOpen(false);
            await load();
            setNotice("תוכנית שנת הלימודים נמחקה.");
        } catch (deleteError) { setError(messageFromError(deleteError)); }
        finally { setBusy(false); }
    };

    const syncHolidays = async () => {
        if (!plan || isNewYear || syncing) return;
        setSyncing(true); setError(""); setNotice("");
        try {
            const synced = await syncAdminDaycareAnnualPlanHolidays(selectedYear);
            changePlan(generateSchedule({ ...plan, calendar: synced.calendar }));
            setNotice("החגים, החופשות, התאריכים והחודשים סונכרנו ונוצרו מחדש. מומלץ לעבור על התוצאה לפני השמירה.");
        } catch (syncError) { setError(messageFromError(syncError)); }
        finally { setSyncing(false); }
    };

    const save = async () => {
        if (!plan || busy) return;
        const items = plan.items.map((item) => ({ month: item.month.trim(), dateRange: item.dateRange.trim(), topic: item.topic.trim(), ...(item.specialEvent?.trim() ? { specialEvent: item.specialEvent.trim() } : {}) }));
        if (!/^\d{4}-\d{4}$/.test(selectedYear) || !plan.schoolYearLabel.trim() || !plan.startDate.trim() || !plan.endDate.trim() || !items.length || items.some((item) => !item.month || !item.dateRange || !item.topic)) {
            setError("יש להזין שנת לימודים תקינה, תאריכי התחלה וסיום ולפחות שורה מלאה אחת.");
            return;
        }
        setBusy(true); setError(""); setNotice("");
        try {
            const saved = await saveAdminDaycareAnnualPlan(selectedYear, { key: "annualPlan", title: plan.title, schoolYearLabel: plan.schoolYearLabel.trim(), startDate: plan.startDate.trim(), endDate: plan.endDate.trim(), filename: plan.filename, calendar: plan.calendar, items, sharedWithParents: plan.sharedWithParents });
            await load(saved.schoolYear);
            setIsNewYear(false);
            setDirty(false);
            setNotice("התוכנית נשמרה. ה-PDF המעודכן מוכן לתצוגה ולהדפסה.");
        } catch (saveError) { setError(messageFromError(saveError)); }
        finally { setBusy(false); }
    };

    const toggleSharing = async () => {
        if (!plan || isNewYear || dirty || sharingBusy) return;
        const shared = !plan.sharedWithParents;
        setSharingBusy(true); setError(""); setNotice("");
        try {
            const updated = await updateAdminDaycareAnnualPlanSharing(selectedYear, shared);
            setPlan(updated);
            setPlans((items) => items.map((item) => item.schoolYear === updated.schoolYear ? updated : item));
            setNotice(shared ? "התוכנית נוספה לקישור האישי של ההורים." : "השיתוף הוסר. התוכנית נשארה זמינה רק לך ולהורדת PDF.");
        } catch (sharingError) { setError(messageFromError(sharingError)); }
        finally { setSharingBusy(false); }
    };

    const preview = async () => {
        if (!plan || previewing) return;
        const items = plan.items.map((item) => ({ month: item.month.trim(), dateRange: item.dateRange.trim(), topic: item.topic.trim(), ...(item.specialEvent?.trim() ? { specialEvent: item.specialEvent.trim() } : {}) }));
        if (!plan.schoolYearLabel.trim() || !plan.startDate.trim() || !plan.endDate.trim() || !items.length || items.some((item) => !item.month || !item.dateRange || !item.topic)) {
            setError("כדי להציג PDF יש להשלים את פרטי השנה ואת כל שדות החובה בשורות.");
            return;
        }
        setPreviewing(true); setError("");
        try {
            const blob = await previewAdminDaycareAnnualPlan({ key: "annualPlan", title: plan.title, schoolYearLabel: plan.schoolYearLabel.trim(), startDate: plan.startDate.trim(), endDate: plan.endDate.trim(), filename: plan.filename, calendar: plan.calendar, items });
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.target = "_blank";
            anchor.rel = "noreferrer";
            anchor.click();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (previewError) { setError(messageFromError(previewError)); }
        finally { setPreviewing(false); }
    };

    if (!plan) return <section className={styles.section}><p>{error || "טוען את מחולל המסמכים..."}</p></section>;

    return <section className={styles.section} aria-labelledby="annual-plan-title">
        <header className={styles.header}>
            <div>
                <span className={styles.eyebrow}>לאדמין בלבד · מחולל מסמכים</span>
                <h2 className={styles.title} id="annual-plan-title">תוכנית נושאי לימוד שנתית</h2>
                <p className={styles.intro}>אפשר לשמור ולהוריד את המסמך לשימוש פנימי, או לשתף אותו בנפרד בקישור האישי של ההורים. השיתוף אינו מופעל אוטומטית.</p>
            </div>
            <button className={styles.secondaryButton} type="button" disabled={!plans.length || isNewYear} onClick={() => apply(plans[0], true)}>יצירת שנה חדשה מהתבנית</button>
        </header>

        <div className={styles.yearRow}>
            <label className={styles.label}>שנת לימודים
                {isNewYear
                    ? <input className={styles.input} value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setDirty(true); }} placeholder="2027-2028" />
                    : <select className={styles.input} value={selectedYear} onChange={(event) => { const item = plans.find((entry) => entry.schoolYear === event.target.value); if (item) apply(item); }}>{plans.map((entry) => <option key={entry.schoolYear} value={entry.schoolYear}>{entry.schoolYear}</option>)}</select>}
            </label>
            <div className={dirty ? styles.locked : styles.editable}>{dirty ? "יש שינויים שלא נשמרו" : "כל השינויים נשמרו"}</div>
        </div>

        <article className={styles.card}>
            <div className={styles.planHeader}><p>לפני שמירת שנה חדשה, עדכנו את תאריכי החגים והחופשות ושבצו נושאי חג לפני החג או החופשה.</p></div>
            <div className={styles.planMetaGrid}>
                <label className={styles.label}>שנת הלימודים בכותרת<input className={styles.input} value={plan.schoolYearLabel} onChange={(event) => changePlan({ ...plan, schoolYearLabel: event.target.value })} /></label>
                <label className={styles.label}>תאריך תחילת השנה<input className={styles.input} type="date" value={plan.startDate} onChange={(event) => changePlan({ ...plan, startDate: event.target.value })} /></label>
                <label className={styles.label}>תאריך סיום השנה<input className={styles.input} type="date" value={plan.endDate} onChange={(event) => changePlan({ ...plan, endDate: event.target.value })} /></label>
            </div>
            <div className={styles.calendarEditor}>
                <div className={styles.menuEditorHeader}>
                    <div><h4>חגים וחופשות</h4><p>הרשימה מתעדכנת אוטומטית בכל שמירה של לוח החופשות. אפשר גם לסנכרן עכשיו או לבצע תיקון נקודתי כאן.</p></div>
                    <div className={styles.inlineButtons}>
                        <button className={styles.secondaryButton} type="button" disabled={isNewYear || syncing} onClick={() => void syncHolidays()}>{syncing ? "מסנכרן..." : "סנכרון ויצירת תאריכים"}</button>
                        <button className={styles.addDayButton} type="button" onClick={() => changePlan({ ...plan, calendar: { ...plan.calendar, vacations: [...plan.calendar.vacations, { name: "", startDate: plan.startDate, endDate: plan.startDate }] } })}><Plus size={18} /> הוספת חופשה</button>
                    </div>
                </div>
                <div className={styles.calendarList}>{plan.calendar.vacations.map((vacation, index) => <div className={styles.calendarRow} key={`${vacation.name}-${index}`}>
                    <label className={styles.label}>שם החג / החופשה<input className={styles.input} value={vacation.name} onChange={(event) => updateVacation(index, "name", event.target.value)} /></label>
                    <label className={styles.label}>מתאריך<input className={styles.input} type="date" value={vacation.startDate} onChange={(event) => updateVacation(index, "startDate", event.target.value)} /></label>
                    <label className={styles.label}>עד תאריך<input className={styles.input} type="date" value={vacation.endDate} onChange={(event) => updateVacation(index, "endDate", event.target.value)} /></label>
                    <button className={styles.iconDeleteButton} type="button" onClick={() => changePlan({ ...plan, calendar: { ...plan.calendar, vacations: plan.calendar.vacations.filter((_, itemIndex) => itemIndex !== index), anchors: plan.calendar.anchors.filter((anchor) => anchor.name !== vacation.name) } })} aria-label={`מחיקת ${vacation.name}`}><Trash2 size={18} /></button>
                </div>)}</div>
                <div className={styles.menuEditorHeader}>
                    <div><h4>מועדים מיוחדים</h4><p>המועד יצורף אוטומטית לשורה הקרובה ביותר, בלי להפוך לנושא השבוע.</p></div>
                    <button className={styles.addDayButton} type="button" onClick={() => changePlan({ ...plan, calendar: { ...plan.calendar, specialEvents: [...plan.calendar.specialEvents, { name: "", date: plan.startDate }] } })}><Plus size={18} /> הוספת מועד</button>
                </div>
                <div className={styles.calendarList}>{plan.calendar.specialEvents.map((event, index) => <div className={styles.specialEventRow} key={`${event.name}-${index}`}>
                    <label className={styles.label}>שם המועד<input className={styles.input} value={event.name} onChange={(changeEvent) => updateSpecialEvent(index, "name", changeEvent.target.value)} /></label>
                    <label className={styles.label}>תאריך<input className={styles.input} type="date" value={event.date} onChange={(changeEvent) => updateSpecialEvent(index, "date", changeEvent.target.value)} /></label>
                    <button className={styles.iconDeleteButton} type="button" onClick={() => changePlan({ ...plan, calendar: { ...plan.calendar, specialEvents: plan.calendar.specialEvents.filter((_, itemIndex) => itemIndex !== index) } })} aria-label={`מחיקת ${event.name}`}><Trash2 size={18} /></button>
                </div>)}</div>
                <button className={styles.generateButton} type="button" onClick={autoGenerate}>יצירת כל התאריכים והחודשים מחדש</button>
            </div>
            <div className={styles.planEditor}>
                <div className={styles.menuEditorHeader}>
                    <div><h4>שבועות ונושאים</h4><p>החודש משמש לחלוקה ב-PDF. אירוע מיוחד הוא אופציונלי ומוצג בנפרד מנושא השבוע.</p></div>
                    <button className={styles.addDayButton} type="button" onClick={addItem}><Plus size={18} /> הוספת שורה</button>
                </div>
                <div className={styles.planRowList}>{plan.items.map((item, index) => <section className={styles.planRowEditor} key={index}>
                    <header className={styles.menuDayHeader}>
                        <span className={styles.menuDayNumber}>שורה {index + 1}</span>
                        <div className={styles.menuDayActions}>
                            <button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)} aria-label={`העברת שורה ${index + 1} למעלה`}><ArrowUp size={17} /></button>
                            <button type="button" disabled={index === plan.items.length - 1} onClick={() => moveItem(index, 1)} aria-label={`העברת שורה ${index + 1} למטה`}><ArrowDown size={17} /></button>
                            <button type="button" onClick={() => removeItem(index)} aria-label={`מחיקת שורה ${index + 1}`}><Trash2 size={17} /></button>
                        </div>
                    </header>
                    <div className={styles.planRowFields}>
                        <label className={styles.label}>חודש<input className={styles.input} value={item.month} onChange={(event) => updateItem(index, "month", event.target.value)} /></label>
                        <label className={styles.label}>תאריך / טווח תאריכים<input className={styles.input} dir="ltr" value={item.dateRange} onChange={(event) => updateItem(index, "dateRange", event.target.value)} /></label>
                        <label className={styles.label}>נושא השבוע<input className={styles.input} value={item.topic} onChange={(event) => updateItem(index, "topic", event.target.value)} /></label>
                        <label className={styles.label}>אירוע / מועד מיוחד - אופציונלי<input className={styles.input} value={item.specialEvent ?? ""} onChange={(event) => updateItem(index, "specialEvent", event.target.value)} /></label>
                    </div>
                </section>)}</div>
            </div>
        </article>

        <div className={styles.actions}>
            <button className={styles.primaryButton} type="button" disabled={busy || !dirty} onClick={() => void save()}>{busy ? "שומר..." : "שמירת התוכנית"}</button>
            {isNewYear ? <button className={styles.secondaryButton} type="button" onClick={() => apply(plans[0])}>ביטול</button> : null}
            <button className={styles.secondaryButton} type="button" disabled={previewing} onClick={() => void preview()}>{previewing ? "מפיק PDF..." : "תצוגה מקדימה והפקת PDF"}</button>
            {!isNewYear ? <button className={plan.sharedWithParents ? styles.sharedButton : styles.secondaryButton} type="button" disabled={sharingBusy || dirty} onClick={() => void toggleSharing()}>{sharingBusy ? "מעדכן שיתוף..." : plan.sharedWithParents ? "משותף להורים · הסרת שיתוף" : "שיתוף להורים"}</button> : null}
            {!isNewYear ? <button className={styles.dangerButton} type="button" disabled={plans.length <= 1 || busy} onClick={() => setDeleteDialogOpen(true)}>מחיקת שנת התוכנית</button> : null}
        </div>
        <div aria-live="polite">{notice ? <p className={styles.success}>{notice}</p> : null}{error ? <p className={styles.error}>{error}</p> : null}</div>
        <ConfirmDialog open={deleteDialogOpen} title="מחיקת תוכנית שנתית" message={`למחוק את תוכנית שנת ${selectedYear}? לא ניתן לשחזר אותה לאחר המחיקה.`} confirmLabel="מחיקה" busy={busy} onConfirm={() => void removePlan()} onClose={() => setDeleteDialogOpen(false)} />
    </section>;
};

export default DaycareAnnualPlanEditor;
