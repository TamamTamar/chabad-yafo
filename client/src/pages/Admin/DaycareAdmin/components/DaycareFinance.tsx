import { useEffect, useMemo, useState } from "react";
import { financeScenarioChildren } from "../daycareAdminConfig";
import {
    getDaycareFinance,
    updateDaycareFinance,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareFinanceSettings } from "../types";

type DaycareFinanceProps = {
    onChanged: () => void;
};

const financeFields: Array<{
    key: keyof DaycareFinanceSettings;
    label: string;
}> = [
    { key: "pricePerChild", label: "מחיר לילד לחודש" },
    { key: "currentChildren", label: "מספר ילדים נוכחי" },
    { key: "targetChildren", label: "יעד ילדים בהמשך" },
    { key: "rent", label: "שכירות חודשית" },
    { key: "directorSalary", label: "משכורת מנהלת" },
    { key: "staffSalaries", label: "משכורת מטפלות" },
    { key: "food", label: "אוכל" },
    { key: "supplies", label: "ציוד שוטף" },
    { key: "insuranceAndPermits", label: "ביטוחים / אישורים" },
    { key: "extraExpenses", label: "הוצאות נוספות" },
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
    }).format(value);
};

const getExpenses = (settings: DaycareFinanceSettings) => {
    return (
        settings.rent +
        settings.directorSalary +
        settings.staffSalaries +
        settings.food +
        settings.supplies +
        settings.insuranceAndPermits +
        settings.extraExpenses
    );
};

const DaycareFinance = ({ onChanged }: DaycareFinanceProps) => {
    const [settings, setSettings] = useState<DaycareFinanceSettings | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [emptyFocusedFields, setEmptyFocusedFields] = useState<
        Array<keyof DaycareFinanceSettings>
    >([]);

    useEffect(() => {
        getDaycareFinance()
            .then(setSettings)
            .catch((error) => console.error("Failed to load finance:", error))
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        if (!settings) {
            return null;
        }

        const income = settings.pricePerChild * settings.currentChildren;
        const expenses = getExpenses(settings);
        const balance = income - expenses;
        const breakEven = settings.pricePerChild
            ? Math.ceil(expenses / settings.pricePerChild)
            : 0;

        return { income, expenses, balance, breakEven };
    }, [settings]);

    const handleNumberChange = (
        key: keyof DaycareFinanceSettings,
        value: string
    ) => {
        if (!settings || key === "_id") {
            return;
        }

        setSaveMessage(null);
        setSaveError(null);
        setEmptyFocusedFields((currentFields) =>
            currentFields.filter((fieldKey) => fieldKey !== key)
        );
        const normalizedValue = value
            .replace(/[^\d]/g, "")
            .replace(/^0+(?=\d)/, "");

        setSettings({
            ...settings,
            [key]: normalizedValue === "" ? 0 : Number(normalizedValue),
        });
    };

    const handleNumberFocus = (key: keyof DaycareFinanceSettings) => {
        if (!settings || key === "_id" || settings[key] !== 0) {
            return;
        }

        setEmptyFocusedFields((currentFields) =>
            currentFields.includes(key) ? currentFields : [...currentFields, key]
        );
    };

    const handleNumberBlur = (key: keyof DaycareFinanceSettings) => {
        setEmptyFocusedFields((currentFields) =>
            currentFields.filter((fieldKey) => fieldKey !== key)
        );
    };

    const handleSave = async () => {
        if (!settings) {
            return;
        }

        try {
            setSaving(true);
            setSaveMessage(null);
            setSaveError(null);
            const updatedSettings = await updateDaycareFinance(settings);
            setSettings(updatedSettings);
            setSaveMessage("התכנון התקציבי נשמר");
            onChanged();
        } catch (error) {
            console.error("Failed to save finance settings:", error);
            setSaveError("השמירה נכשלה. כדאי לבדוק חיבור לשרת ולנסות שוב.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !settings || !summary) {
        return <div className={styles.loading}>טוען תחזית כלכלית...</div>;
    }

    return (
        <section className={styles.section} aria-labelledby="daycare-finance">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-finance">
                        תחזית כלכלית פשוטה
                    </h2>
                    <p className={styles.sectionDescription}>
                        מחשבון פנימי להכנסות, הוצאות ונקודת איזון.
                    </p>
                </div>
                <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "שומר..." : "שמירת תחזית"}
                </button>
            </div>

            {(saveMessage || saveError) && (
                <div
                    className={
                        saveError ? styles.formErrorMessage : styles.formSaveMessage
                    }
                >
                    {saveError ?? saveMessage}
                </div>
            )}

            <div className={styles.financeGrid}>
                <div className={styles.financeForm}>
                    {financeFields.map((field) => (
                        <label className={styles.field} key={field.key}>
                            <span className={styles.fieldLabel}>{field.label}</span>
                            <input
                                className={`${styles.input} ${styles.numberInput}`}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                type="text"
                                value={
                                    emptyFocusedFields.includes(field.key)
                                        ? ""
                                        : settings[field.key] ?? 0
                                }
                                onChange={(event) =>
                                    handleNumberChange(field.key, event.target.value)
                                }
                                onBlur={() => handleNumberBlur(field.key)}
                                onFocus={() => handleNumberFocus(field.key)}
                            />
                        </label>
                    ))}
                </div>

                <div className={styles.summaryGrid}>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>הכנסה חודשית</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.income)}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>הוצאות חודשיות</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.expenses)}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>רווח / הפסד חודשי</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.balance)}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>נקודת איזון</span>
                        <strong className={styles.metricValue}>
                            {summary.breakEven} ילדים
                        </strong>
                    </article>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.tableCompact}>
                    <thead>
                        <tr>
                            <th className={styles.tableHeader}>תרחיש ילדים</th>
                            <th className={styles.tableHeader}>הכנסה</th>
                            <th className={styles.tableHeader}>הוצאות</th>
                            <th className={styles.tableHeader}>תוצאה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {financeScenarioChildren.map((children) => {
                            const income = children * settings.pricePerChild;
                            const result = income - summary.expenses;

                            return (
                                <tr className={styles.tableRow} key={children}>
                                    <td className={styles.tableCell}>{children}</td>
                                    <td className={styles.tableCell}>
                                        {formatCurrency(income)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatCurrency(summary.expenses)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatCurrency(result)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default DaycareFinance;
