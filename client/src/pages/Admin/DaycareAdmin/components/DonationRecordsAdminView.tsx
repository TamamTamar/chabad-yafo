import type { DaycareDonationRecord } from "../../../DaycareDonations/types";
import styles from "./DaycareDonationsAdmin.module.scss";
import type { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

type Props = { model: ReturnType<typeof useDaycareDonationsAdmin> };

const DonationRecordsAdminView = ({ model }: Props) => {
    if (!model.campaign) return null;

    const {
        campaign, records, ambassadors, saving,
        activeView, recordQuery, recordStatus,
        filteredRecords, setRecordQuery, setRecordStatus, setPendingRecordUpdate,
        setAllocationRecord, formatCurrency, formatDate, statusLabels,
    } = model;

    return (
        <>
            {activeView === "records" && (
            <section className={styles.panel}>
                <header>
                    <h2>רשומות תרומה</h2>
                    <p>
                        אפשר לשייך תרומה כללית לסעיף או לשגריר, ולסמן
                        ביטול/החזר מבלי למחוק את הרשומה.
                    </p>
                </header>
                <div className={styles.recordFilters}>
                    <label>
                        חיפוש
                        <input
                            type="search"
                            value={recordQuery}
                            placeholder="שם, טלפון, דוא״ל או מספר עסקה"
                            onChange={(event) =>
                                setRecordQuery(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        מצב
                        <select
                            value={recordStatus}
                            onChange={(event) =>
                                setRecordStatus(
                                    event.target.value as
                                        | "all"
                                        | DaycareDonationRecord["status"]
                                )
                            }
                        >
                            <option value="all">כל המצבים</option>
                            {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                )
                            )}
                        </select>
                    </label>
                </div>
                {records.length === 0 ? (
                    <p className={styles.emptyState}>
                        עדיין לא הוזנו תרומות אמיתיות.
                    </p>
                ) : filteredRecords.length === 0 ? (
                    <p className={styles.emptyState}>
                        לא נמצאו תרומות שמתאימות לחיפוש.
                    </p>
                ) : (
                    <div className={styles.recordsTableWrap}>
                        <table className={styles.recordsTable}>
                            <thead>
                                <tr>
                                    <th>תאריך</th>
                                    <th>תורם</th>
                                    <th>מקור</th>
                                    <th>סכום</th>
                                    <th>שגריר</th>
                                    <th>פרסום</th>
                                    <th>שיוך</th>
                                    <th>מצב</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => (
                                    <tr className={styles.recordRow} key={record._id}>
                                        <td data-label="תאריך">
                                            {formatDate(record.receivedAt)}
                                        </td>
                                        <td data-label="תורם">
                                            <div className={styles.recordDonor}>
                                                <strong>
                                                    {record.donorName ||
                                                        "לא צוין"}
                                                </strong>
                                                <small>
                                                    {record.email ||
                                                        record.phone ||
                                                        ""}
                                                </small>
                                            </div>
                                        </td>
                                        <td data-label="מקור">
                                            {record.source === "nedarim"
                                                ? "נדרים פלוס"
                                                : "ידנית"}
                                        </td>
                                        <td data-label="סכום">
                                            <div className={styles.recordDonor}>
                                                <strong>
                                                    ₪{formatCurrency(record.amount)}
                                                </strong>
                                                {(record.originalCurrency === "USD" ||
                                                    record.originalCurrency === "EUR") &&
                                                    record.originalAmount !== undefined && (
                                                        <small>
                                                            {record.originalCurrency === "USD" ? "$" : "€"}{formatCurrency(record.originalAmount)} לפי שער {record.exchangeRate}
                                                        </small>
                                                    )}
                                                {record.paymentType === "HK" && (
                                                    <small>
                                                        הו״ק: ₪{formatCurrency(
                                                            record.amount /
                                                                (record.installments || 12)
                                                        )} × {record.installments || 12}
                                                    </small>
                                                )}
                                                {record.paymentType === "Ragil" &&
                                                    (record.installments || 1) > 1 && (
                                                        <small>
                                                            {record.installments} תשלומים
                                                        </small>
                                                    )}
                                            </div>
                                        </td>
                                        <td data-label="שגריר">
                                            <select
                                                aria-label={`שגריר לתרומה של ${record.donorName || "תורם"}`}
                                                value={record.ambassadorId?._id ?? ""}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const ambassadorId =
                                                        event.target.value;
                                                    const ambassadorName =
                                                        ambassadors.find(
                                                            (ambassador) =>
                                                                ambassador._id ===
                                                                ambassadorId
                                                        )?.name ??
                                                        "ללא שגריר";
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: {
                                                            ambassadorId,
                                                        },
                                                        title: "שינוי שגריר לתרומה",
                                                        message: ambassadorId
                                                            ? `התרומה של ${record.donorName || "תורם ללא שם"} תשויך לשגריר/ה ${ambassadorName}.`
                                                            : `השיוך של התרומה של ${record.donorName || "תורם ללא שם"} לשגריר יוסר והיא תיחשב כתרומה כללית.`,
                                                    });
                                                }}
                                            >
                                                <option value="">
                                                    ללא שגריר — תרומה כללית
                                                </option>
                                                {ambassadors.map((ambassador) => (
                                                    <option
                                                        key={ambassador._id}
                                                        value={ambassador._id}
                                                        disabled={
                                                            !ambassador.active &&
                                                            record.ambassadorId?._id !==
                                                                ambassador._id
                                                        }
                                                    >
                                                        {ambassador.name}
                                                        {!ambassador.active
                                                            ? " — לא פעיל"
                                                            : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td data-label="פרסום">
                                            <button
                                                type="button"
                                                className={`${styles.publicationToggle} ${
                                                    record.displayDonorName !== false
                                                        ? styles.publicationToggleActive
                                                        : ""
                                                }`}
                                                disabled={saving || !record.donorName}
                                                aria-pressed={record.displayDonorName !== false}
                                                title={record.donorName ? "שינוי הרשאה להצגת שם התורם באתר" : "אי אפשר לפרסם תרומה ללא שם"}
                                                onClick={() => {
                                                    const displayDonorName = record.displayDonorName === false;
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: { displayDonorName },
                                                        title: displayDonorName ? "אישור הצגת שם באתר" : "הסרת שם מהאתר",
                                                        message: displayDonorName
                                                            ? `יש לוודא שהתקבל אישור מ${record.donorName} להצגת השם והסכום בעמוד הקמפיין. כתבו בשדה הסיבה כיצד התקבל האישור.`
                                                            : `השם של ${record.donorName} יוסר מעמוד הקמפיין והתרומה תוצג כאנונימית.`,
                                                    });
                                                }}
                                            >
                                                <span aria-hidden="true" />
                                                {record.displayDonorName !== false ? "מוצג באתר" : "פרטי"}
                                            </button>
                                        </td>
                                        <td data-label="שיוך">
                                            <button
                                                type="button"
                                                className={styles.allocationButton}
                                                aria-label={`שיוך התרומה של ${record.donorName || "תורם"}`}
                                                disabled={saving}
                                                onClick={() => setAllocationRecord(record)}
                                            >
                                                {record.allocations && record.allocations.length > 1
                                                    ? `${record.allocations.length} יעדים · עריכה`
                                                    : campaign.items.find((item) => item.id === (record.allocations?.[0]?.itemId ?? record.itemId))?.title ?? "תרומה כללית"}
                                            </button>
                                        </td>
                                        <td data-label="מצב">
                                            <select
                                                aria-label={`מצב התרומה של ${record.donorName || "תורם"}`}
                                                value={record.status}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const status =
                                                        event.target
                                                            .value as DaycareDonationRecord["status"];
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: { status },
                                                        title: "שינוי מצב תרומה",
                                                        message: `מצב התרומה של ${record.donorName || "תורם ללא שם"} ישתנה ל"${statusLabels[status]}".`,
                                                    });
                                                }}
                                            >
                                                {Object.entries(
                                                    statusLabels
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            )}

        </>
    );
};

export default DonationRecordsAdminView;
