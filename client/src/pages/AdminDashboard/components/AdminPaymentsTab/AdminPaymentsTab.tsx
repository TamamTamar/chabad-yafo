import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
    createFinanceEntry,
    getFinanceOverview,
} from "../../../../services/adminService";
import type {
    CreateFinanceEntryPayload,
    FinanceEntryAdmin,
    FinanceEntrySource,
    FinanceEntryType,
    FinanceOverview,
} from "../../../../types/chabad";
import styles from "./AdminPaymentsTab.module.scss";

const currencyFormatter = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
});

const sourceLabels: Record<FinanceEntrySource, string> = {
    website: "תרומה באתר",
    cash: "מזומן",
    bit: "ביט",
    credit: "אשראי",
    bank: "העברה בנקאית",
    check: "צ׳ק",
    nedarim: "נדרים פלוס",
    manual: "ידני",
    other: "אחר",
};

const sourceOptions: Record<
    FinanceEntryType,
    Array<{ value: CreateFinanceEntryPayload["source"]; label: string }>
> = {
    income: [
        { value: "cash", label: "מזומן" },
        { value: "bit", label: "ביט" },
    ],
    expense: [
        { value: "cash", label: "מזומן" },
        { value: "credit", label: "אשראי" },
        { value: "bank", label: "העברה בנקאית" },
        { value: "check", label: "צ׳ק" },
    ],
};

const categoryOptions = [
    "שבת וחגים",
    "שיעורים ופעילות",
    "עזרה למשפחות",
    "שכירות ואחזקה",
    "פרסום",
    "ציוד",
    "מעון",
    "תרומות מהאתר",
    "כללי",
];

const initialForm = {
    type: "expense" as FinanceEntryType,
    source: "cash" as CreateFinanceEntryPayload["source"],
    category: "כללי",
    title: "",
    amount: "",
    donorName: "",
    notes: "",
};

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

const getErrorMessage = (error: unknown, fallback: string) => {
    if (
        axios.isAxiosError<{ message?: string }>(error) &&
        error.response?.data?.message
    ) {
        return error.response.data.message;
    }

    return fallback;
};

const AdminPaymentsTab = () => {
    const [finance, setFinance] = useState<FinanceOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState(initialForm);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);

    const entries = useMemo(() => finance?.entries ?? [], [finance]);

    const fetchFinance = async () => {
        try {
            setError("");
            const data = await getFinanceOverview(selectedMonth);
            setFinance(data);
        } catch {
            setError("לא הצלחנו לטעון את נתוני הכספים");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinance();
    }, [selectedMonth]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            await createFinanceEntry({
                ...form,
                amount: Number(form.amount),
            });
            setForm({
                ...initialForm,
                type: form.type,
                source: "cash",
            });
            await fetchFinance();
        } catch (caughtError) {
            setError(
                getErrorMessage(caughtError, "לא הצלחנו לשמור את התנועה")
            );
        } finally {
            setSaving(false);
        }
    };

    const updateForm = (field: keyof typeof form, value: string) => {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
    };

    const updateType = (type: FinanceEntryType) => {
        setForm((currentForm) => ({
            ...currentForm,
            type,
            source: "cash",
            category: "כללי",
        }));
    };

    if (loading) {
        return <div className={styles.loading}>טוען...</div>;
    }

    const summary = finance?.summary ?? {
        income: 0,
        expenses: 0,
        balance: 0,
    };

    return (
        <section className={styles.financePanel}>
            <div className={styles.toolbar}>
                <label>
                    חודש
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className={styles.filterButton}
                    onClick={() => setSelectedMonth("")}
                >
                    כל החודשים
                </button>
            </div>

            <div className={styles.summaryGrid}>
                <SummaryItem label="הכנסות" value={summary.income} />
                <SummaryItem label="הוצאות" value={summary.expenses} />
                <SummaryItem label="יתרה" value={summary.balance} emphasize />
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formHeader}>
                    <div>
                        <h2>הוספת תנועה</h2>
                        <p>הכנסה ידנית או הוצאה לניהול שוטף.</p>
                    </div>
                </div>

                <div className={styles.segmented} aria-label="סוג תנועה">
                    <button
                        type="button"
                        className={
                            form.type === "income"
                                ? styles.segmentActive
                                : styles.segment
                        }
                        onClick={() => updateType("income")}
                    >
                        הכנסה
                    </button>
                    <button
                        type="button"
                        className={
                            form.type === "expense"
                                ? styles.segmentActive
                                : styles.segment
                        }
                        onClick={() => updateType("expense")}
                    >
                        הוצאה
                    </button>
                </div>

                <div className={styles.formGrid}>
                    <label>
                        תיאור
                        <input
                            required
                            value={form.title}
                            onChange={(event) =>
                                updateForm("title", event.target.value)
                            }
                            placeholder="לדוגמה: תרומה במזומן / קניית ציוד"
                        />
                    </label>

                    <label>
                        סכום
                        <input
                            required
                            min="0"
                            step="1"
                            type="number"
                            value={form.amount}
                            onChange={(event) =>
                                updateForm("amount", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        אמצעי
                        <select
                            value={form.source}
                            onChange={(event) =>
                                updateForm("source", event.target.value)
                            }
                        >
                            {sourceOptions[form.type].map((option) => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        קטגוריה
                        <select
                            value={form.category}
                            onChange={(event) =>
                                updateForm("category", event.target.value)
                            }
                        >
                            {categoryOptions
                                .filter(
                                    (category) =>
                                        category !== "תרומות מהאתר" ||
                                        form.type === "income"
                                )
                                .map((category) => (
                                    <option value={category} key={category}>
                                        {category}
                                    </option>
                                ))}
                        </select>
                    </label>

                    <label>
                        שם תורם / ספק
                        <input
                            value={form.donorName}
                            onChange={(event) =>
                                updateForm("donorName", event.target.value)
                            }
                        />
                    </label>

                    <label className={styles.fullField}>
                        הערה
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(event) =>
                                updateForm("notes", event.target.value)
                            }
                        />
                    </label>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={saving}
                >
                    {saving ? "שומר..." : "שמירת תנועה"}
                </button>
            </form>

            {finance?.categorySummary && finance.categorySummary.length > 0 && (
                <section className={styles.card}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.categoryTable}>
                            <thead>
                                <tr>
                                    <th>קטגוריה</th>
                                    <th>הכנסות</th>
                                    <th>הוצאות</th>
                                    <th>יתרה</th>
                                </tr>
                            </thead>

                            <tbody>
                                {finance.categorySummary.map((category) => (
                                    <tr key={category.category}>
                                        <td>{category.category}</td>
                                        <td className={styles.incomeAmount}>
                                            {currencyFormatter.format(category.income)}
                                        </td>
                                        <td className={styles.expenseAmount}>
                                            {currencyFormatter.format(category.expenses)}
                                        </td>
                                        <td className={styles.amount}>
                                            {currencyFormatter.format(category.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className={styles.card}>
                {entries.length === 0 ? (
                    <div className={styles.empty}>
                        {selectedMonth
                            ? "אין תנועות בחודש הנבחר"
                            : "עדיין אין תנועות כספיות"}
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>סוג</th>
                                    <th>אמצעי</th>
                                    <th>קטגוריה</th>
                                    <th>תיאור</th>
                                    <th>שם</th>
                                    <th>סכום</th>
                                    <th>הערה</th>
                                </tr>
                            </thead>

                            <tbody>
                                {entries.map((entry) => (
                                    <FinanceRow entry={entry} key={entry._id} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </section>
    );
};

type SummaryItemProps = {
    label: string;
    value: number;
    emphasize?: boolean;
};

const SummaryItem = ({ label, value, emphasize = false }: SummaryItemProps) => (
    <div className={emphasize ? styles.summaryItemStrong : styles.summaryItem}>
        <span>{label}</span>
        <strong>{currencyFormatter.format(value)}</strong>
    </div>
);

type FinanceRowProps = {
    entry: FinanceEntryAdmin;
};

const FinanceRow = ({ entry }: FinanceRowProps) => (
    <tr>
        <td>{entry.type === "income" ? "הכנסה" : "הוצאה"}</td>
        <td>{sourceLabels[entry.source] ?? "אחר"}</td>
        <td>{entry.category || "כללי"}</td>
        <td>{entry.title}</td>
        <td>{entry.donorName || "-"}</td>
        <td
            className={
                entry.type === "income" ? styles.incomeAmount : styles.expenseAmount
            }
        >
            {currencyFormatter.format(entry.amount)}
        </td>
        <td>{entry.notes || "-"}</td>
    </tr>
);

export default AdminPaymentsTab;
