import { useEffect, useMemo, useState } from "react";
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
    { key: "currentChildren", label: "ילדים בפועל" },
    { key: "pricePerChild", label: "תשלום חודשי לילד" },
    { key: "rent", label: "שכירות חודשית" },
    { key: "directorSalary", label: "משכורת שלך / מנהלת" },
    { key: "staffSalaries", label: "מטפלת" },
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

        return { income, expenses, balance };
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
            setSaveMessage("המצב הכספי נשמר");
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
                        מצב כספי בפועל
                    </h2>
                    <p className={styles.sectionDescription}>
                        מעקב פשוט אחרי מה שקורה עכשיו: ילדים, הכנסות, הוצאות ותוצאה חודשית.
                    </p>
                </div>
                <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? "שומר..." : "שמירת מצב כספי"}
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
                        <span className={styles.metricLabel}>ילדים בפועל</span>
                        <strong className={styles.metricValue}>
                            {settings.currentChildren}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>הכנסה בפועל</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.income)}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>הוצאות בפועל</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.expenses)}
                        </strong>
                    </article>
                    <article className={styles.metricCard}>
                        <span className={styles.metricLabel}>מצב חודשי</span>
                        <strong className={styles.metricValue}>
                            {formatCurrency(summary.balance)}
                        </strong>
                    </article>
                </div>
            </div>
        </section>
    );
};

export default DaycareFinance;
