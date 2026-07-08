import { useEffect, useMemo, useState } from "react";
import {
    getDaycareFinance,
    updateDaycareFinance,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareFinanceSettings } from "../types";

type DaycareFinanceProps = {
    onChanged: () => void;
    refreshKey?: number;
};

const monthlyFinanceFields: Array<{
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

const renovationFinanceFields: Array<{
    key: keyof DaycareFinanceSettings;
    label: string;
}> = [
    { key: "renovationKitchen", label: "מטבח" },
    { key: "renovationYard", label: "חצרות" },
    { key: "renovationConstruction", label: "גבס / צבע / קירות" },
    { key: "renovationSafety", label: "בטיחות והתאמות" },
    { key: "renovationEquipment", label: "ציוד פתיחה חד־פעמי" },
    { key: "renovationLabor", label: "שכר עובד / קבלן שיפוץ" },
    { key: "renovationOther", label: "שיפוץ - שונות" },
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
    }).format(value);
};

const getNumberValue = (
    settings: DaycareFinanceSettings,
    key: keyof DaycareFinanceSettings
) => {
    if (key === "_id") {
        return 0;
    }

    return settings[key] ?? 0;
};

const getExpenses = (settings: DaycareFinanceSettings) => {
    return (
        getNumberValue(settings, "rent") +
        getNumberValue(settings, "directorSalary") +
        getNumberValue(settings, "staffSalaries") +
        getNumberValue(settings, "food") +
        getNumberValue(settings, "supplies") +
        getNumberValue(settings, "insuranceAndPermits") +
        getNumberValue(settings, "extraExpenses")
    );
};

const getRenovationInvestment = (settings: DaycareFinanceSettings) => {
    return (
        getNumberValue(settings, "renovationKitchen") +
        getNumberValue(settings, "renovationYard") +
        getNumberValue(settings, "renovationConstruction") +
        getNumberValue(settings, "renovationSafety") +
        getNumberValue(settings, "renovationEquipment") +
        getNumberValue(settings, "renovationLabor") +
        getNumberValue(settings, "renovationOther")
    );
};

const formatPayback = (months: number | null) => {
    if (months === null) {
        return "אין החזר כרגע";
    }

    if (months === 1) {
        return "חודש אחד";
    }

    return `${months} חודשים`;
};

const DaycareFinance = ({ onChanged, refreshKey = 0 }: DaycareFinanceProps) => {
    const [settings, setSettings] = useState<DaycareFinanceSettings | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [financeDirty, setFinanceDirty] = useState(false);
    const [emptyFocusedFields, setEmptyFocusedFields] = useState<
        Array<keyof DaycareFinanceSettings>
    >([]);

    useEffect(() => {
        if (!settings) {
            setLoading(true);
        }

        getDaycareFinance()
            .then((financeSettings) => {
                setSettings(financeSettings);
                setFinanceDirty(false);
            })
            .catch((error) => console.error("Failed to load finance:", error))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    useEffect(() => {
        if (!settings || !financeDirty) {
            return;
        }

        const saveTimer = window.setTimeout(() => {
            handleSave(settings);
        }, 700);

        return () => window.clearTimeout(saveTimer);
    }, [financeDirty, settings]);

    const summary = useMemo(() => {
        if (!settings) {
            return null;
        }

        const income =
            getNumberValue(settings, "pricePerChild") *
            getNumberValue(settings, "currentChildren");
        const expenses = getExpenses(settings);
        const balance = income - expenses;
        const manualRenovationInvestment = getRenovationInvestment(settings);
        const taskActualCosts = settings.taskActualCosts ?? 0;
        const renovationInvestment =
            manualRenovationInvestment + taskActualCosts;
        const paybackMonths =
            renovationInvestment > 0 && balance > 0
                ? Math.ceil(renovationInvestment / balance)
                : null;

        return {
            income,
            expenses,
            balance,
            manualRenovationInvestment,
            taskActualCosts,
            renovationInvestment,
            paybackMonths,
        };
    }, [settings]);

    const handleNumberChange = (
        key: keyof DaycareFinanceSettings,
        value: string
    ) => {
        if (!settings || key === "_id") {
            return;
        }

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
        setFinanceDirty(true);
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

    const handleSave = async (
        settingsToSave: DaycareFinanceSettings | null = settings
    ) => {
        if (!settingsToSave) {
            return;
        }

        try {
            const updatedSettings = await updateDaycareFinance(settingsToSave);
            setSettings(updatedSettings);
            setFinanceDirty(false);
            onChanged();
        } catch (error) {
            console.error("Failed to save finance settings:", error);
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
                        מעקב פשוט אחרי הכנסות והוצאות חודשיות, כולל השקעת
                        שיפוץ והחזר השקעה משוער.
                    </p>
                </div>
            </div>

            <div className={styles.financeGrid}>
                <div className={styles.financeFormsStack}>
                    <div className={styles.financeForm}>
                        <h3 className={styles.formGroupTitle}>חודשי בפועל</h3>
                        {monthlyFinanceFields.map((field) => (
                            <label className={styles.field} key={field.key}>
                                <span className={styles.fieldLabel}>
                                    {field.label}
                                </span>
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
                                        handleNumberChange(
                                            field.key,
                                            event.target.value
                                        )
                                    }
                                    onBlur={() => handleNumberBlur(field.key)}
                                    onFocus={() => handleNumberFocus(field.key)}
                                />
                            </label>
                        ))}
                    </div>

                    <div className={styles.financeForm}>
                        <h3 className={styles.formGroupTitle}>
                            השקעת שיפוץ ידנית / נוספת
                        </h3>
                        <p className={styles.formGroupNote}>
                            כאן מוסיפים רק הוצאות שלא הכנסת כבר בתתי־המשימות.
                        </p>
                        {renovationFinanceFields.map((field) => (
                            <label className={styles.field} key={field.key}>
                                <span className={styles.fieldLabel}>
                                    {field.label}
                                </span>
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
                                        handleNumberChange(
                                            field.key,
                                            event.target.value
                                        )
                                    }
                                    onBlur={() => handleNumberBlur(field.key)}
                                    onFocus={() => handleNumberFocus(field.key)}
                                />
                            </label>
                        ))}
                    </div>
                </div>

                <aside className={styles.financeSummaryPanel}>
                    <article className={styles.financeMainMetric}>
                        <span className={styles.financeMetricKicker}>
                            מצב חודשי בפועל
                        </span>
                        <strong
                            className={`${styles.financeMainValue} ${
                                summary.balance >= 0
                                    ? styles.financeValuePositive
                                    : styles.financeValueNegative
                            }`}
                        >
                            {formatCurrency(summary.balance)}
                        </strong>
                    </article>

                    <div className={styles.financeDetailList}>
                        <div className={styles.financeDetailItem}>
                            <span>ילדים בפועל</span>
                            <strong>{settings.currentChildren}</strong>
                        </div>
                        <div className={styles.financeDetailItem}>
                            <span>הכנסה חודשית</span>
                            <strong>{formatCurrency(summary.income)}</strong>
                        </div>
                        <div className={styles.financeDetailItem}>
                            <span>הוצאות חודשיות</span>
                            <strong>{formatCurrency(summary.expenses)}</strong>
                        </div>
                    </div>

                    <article className={styles.financeInvestCard}>
                        <h3 className={styles.financeInvestTitle}>
                            השקעת פתיחה
                        </h3>
                        <div className={styles.financeDetailItem}>
                            <span>מתתי־משימות</span>
                            <strong>
                                {formatCurrency(summary.taskActualCosts)}
                            </strong>
                        </div>
                        <div className={styles.financeDetailItem}>
                            <span>ידני / נוסף</span>
                            <strong>
                                {formatCurrency(
                                    summary.manualRenovationInvestment
                                )}
                            </strong>
                        </div>
                        <div
                            className={`${styles.financeDetailItem} ${styles.financeInvestTotal}`}
                        >
                            <span>סה״כ השקעה</span>
                            <strong>
                                {formatCurrency(summary.renovationInvestment)}
                            </strong>
                        </div>
                        <div className={styles.financePaybackRow}>
                            <span>החזר משוער</span>
                            <strong>{formatPayback(summary.paybackMonths)}</strong>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
};

export default DaycareFinance;
