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

type FinanceNumberKey = Exclude<
    keyof DaycareFinanceSettings,
    "_id" | "monthlyCashflows"
>;

type MonthlyCashflow =
    NonNullable<DaycareFinanceSettings["monthlyCashflows"]>[number];
type MonthlyCashflowNumberKey = Exclude<keyof MonthlyCashflow, "month">;
type MonthlyCashflowEditKey = Exclude<
    MonthlyCashflowNumberKey,
    keyof Pick<
        MonthlyCashflow,
        | "renovationKitchen"
        | "renovationYard"
        | "renovationConstruction"
        | "renovationSafety"
        | "renovationEquipment"
        | "renovationLabor"
        | "renovationOther"
    >
>;

type MonthlyField<K extends MonthlyCashflowNumberKey = MonthlyCashflowNumberKey> = {
    key: K;
    label: string;
};

const monthlyIncomeFields: Array<MonthlyField<MonthlyCashflowEditKey>> = [
    { key: "children", label: "ילדים" },
    { key: "pricePerChild", label: "מחיר לילד" },
    { key: "income", label: "תשלומי הורים בפועל" },
    { key: "extraIncome", label: "תרומות / הכנסות צד" },
];

const monthlyFixedExpenseFields: Array<MonthlyField<MonthlyCashflowEditKey>> = [
    { key: "rent", label: "שכירות" },
    { key: "directorSalary", label: "משכורת שלך / מנהלת" },
    { key: "staffSalaries", label: "מטפלת" },
];

const monthlyVariableExpenseFields: Array<
    MonthlyField<MonthlyCashflowEditKey>
> = [
    { key: "food", label: "אוכל" },
    { key: "supplies", label: "ציוד שוטף" },
    { key: "insuranceAndPermits", label: "ביטוחים / אישורים" },
    { key: "extraExpenses", label: "הוצאות נוספות" },
];

const monthlyRepaymentField: MonthlyField<MonthlyCashflowEditKey> = {
    key: "renovationRepayment",
    label: "כמה להחזיר החודש לשיפוץ",
};

const monthlyRenovationFields: Array<MonthlyField> = [
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
    key: FinanceNumberKey
) => {
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

const getOngoingExpensesFromCashflow = (cashflow: MonthlyCashflow) => {
    return (
        (cashflow.rent || 0) +
        (cashflow.directorSalary || 0) +
        (cashflow.staffSalaries || 0) +
        (cashflow.food || 0) +
        (cashflow.supplies || 0) +
        (cashflow.insuranceAndPermits || 0) +
        (cashflow.extraExpenses || 0)
    );
};

const getRenovationFromCashflow = (cashflow: MonthlyCashflow) => {
    return (
        (cashflow.renovationKitchen || 0) +
        (cashflow.renovationYard || 0) +
        (cashflow.renovationConstruction || 0) +
        (cashflow.renovationSafety || 0) +
        (cashflow.renovationEquipment || 0) +
        (cashflow.renovationLabor || 0) +
        (cashflow.renovationOther || 0)
    );
};

const isSetupMonth = (month: string) => {
    const monthNumber = Number(month.slice(5, 7));

    return monthNumber > 0 && monthNumber <= 9;
};

const getDefaultMonthlyCashflow = (
    settings: DaycareFinanceSettings,
    month: string
): MonthlyCashflow => {
    const income = settings.currentChildren * settings.pricePerChild;

    return {
        month,
        children: settings.currentChildren,
        pricePerChild: settings.pricePerChild,
        income,
        extraIncome: 0,
        rent: settings.rent,
        directorSalary: settings.directorSalary,
        staffSalaries: settings.staffSalaries,
        food: settings.food,
        supplies: settings.supplies,
        insuranceAndPermits: settings.insuranceAndPermits,
        extraExpenses: settings.extraExpenses,
        renovationKitchen: 0,
        renovationYard: 0,
        renovationConstruction: 0,
        renovationSafety: 0,
        renovationEquipment: 0,
        renovationLabor: 0,
        renovationOther: 0,
        renovationRepayment: 0,
    };
};

const getCurrentMonthValue = () => {
    return new Date().toISOString().slice(0, 7);
};

const getCurrentYearMonths = () => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 12 }, (_item, index) => {
        const monthNumber = String(index + 1).padStart(2, "0");

        return `${currentYear}-${monthNumber}`;
    });
};

const formatMonth = (month: string) => {
    if (!month) {
        return "-";
    }

    return new Intl.DateTimeFormat("he-IL", {
        month: "long",
        year: "numeric",
    }).format(new Date(`${month}-01T00:00:00`));
};

const ensureCurrentYearCashflows = (settings: DaycareFinanceSettings) => {
    const existingCashflows = settings.monthlyCashflows || [];
    const existingMonths = new Set(
        existingCashflows.map((cashflow) => cashflow.month)
    );
    const missingMonths = getCurrentYearMonths().filter(
        (month) => !existingMonths.has(month)
    );

    if (missingMonths.length === 0) {
        return { settings, changed: false };
    }

    return {
        settings: {
            ...settings,
            monthlyCashflows: [
                ...existingCashflows,
                ...missingMonths.map((month) =>
                    getDefaultMonthlyCashflow(settings, month)
                ),
            ].sort((a, b) => a.month.localeCompare(b.month)),
        },
        changed: true,
    };
};

const DaycareFinance = ({ onChanged, refreshKey = 0 }: DaycareFinanceProps) => {
    const [settings, setSettings] = useState<DaycareFinanceSettings | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [financeDirty, setFinanceDirty] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);

    useEffect(() => {
        let active = true;

        void getDaycareFinance()
            .then((financeSettings) => {
                if (!active) return;

                const normalized = ensureCurrentYearCashflows(financeSettings);
                setSettings(normalized.settings);
                setFinanceDirty(normalized.changed);
                setLoadError("");
                setSaveMessage(
                    normalized.changed
                        ? "נוספו חודשי השנה. יש לשמור את הנתונים."
                        : ""
                );
            })
            .catch((error) => {
                console.error("Failed to load finance:", error);
                if (active) {
                    setLoadError("לא הצלחנו לטעון את הנתונים הכספיים.");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [refreshKey]);

    const summary = useMemo(() => {
        if (!settings) {
            return null;
        }

        const taskActualCosts = settings.taskActualCosts ?? 0;
        const cashflows = [...(settings.monthlyCashflows || [])].sort((a, b) =>
            a.month.localeCompare(b.month)
        );
        const latestCashflow = cashflows[cashflows.length - 1];
        const latestIncome = latestCashflow
            ? latestCashflow.income + latestCashflow.extraIncome
            : getNumberValue(settings, "pricePerChild") *
              getNumberValue(settings, "currentChildren");
        const latestExpenses = latestCashflow
            ? getOngoingExpensesFromCashflow(latestCashflow)
            : getExpenses(settings);
        const latestBalance = latestIncome - latestExpenses;
        const monthlyRenovationInvestment = cashflows.reduce(
            (total, cashflow) =>
                isSetupMonth(cashflow.month)
                    ? total + getRenovationFromCashflow(cashflow)
                    : total,
            0
        );
        const legacyRenovationInvestment = getRenovationInvestment(settings);
        const renovationInvestment =
            monthlyRenovationInvestment +
            legacyRenovationInvestment +
            taskActualCosts;
        const totalRepayment = cashflows.reduce(
            (total, cashflow) => total + (cashflow.renovationRepayment || 0),
            0
        );
        const remainingInvestment = Math.max(
            renovationInvestment - totalRepayment,
            0
        );
        const coverage = cashflows.reduce<{
            total: number;
            month?: string;
        }>(
            (result, cashflow) => {
                if (result.month) return result;

                const total =
                    result.total + (cashflow.renovationRepayment || 0);

                return {
                    total,
                    month:
                        renovationInvestment > 0 &&
                        total >= renovationInvestment
                            ? cashflow.month
                            : undefined,
                };
            },
            { total: 0 }
        );

        return {
            latestIncome,
            latestExpenses,
            latestBalance,
            monthlyRenovationInvestment,
            legacyRenovationInvestment,
            taskActualCosts,
            renovationInvestment,
            cashflows,
            totalRepayment,
            remainingInvestment,
            coveredMonth: coverage.month,
        };
    }, [settings]);

    const updateMonthlyCashflow = (
        cashflowMonth: string,
        key: MonthlyCashflowEditKey,
        value: string
    ) => {
        if (!settings) {
            return;
        }

        const nextCashflows = [...(settings.monthlyCashflows || [])];
        const cashflowIndex = nextCashflows.findIndex(
            (cashflow) => cashflow.month === cashflowMonth
        );
        const currentCashflow = nextCashflows[cashflowIndex];

        if (!currentCashflow) {
            return;
        }

        const nextValue = Number(value.replace(/[^\d]/g, "")) || 0;
        const nextCashflow = {
            ...currentCashflow,
            [key]: nextValue,
        };

        if (key === "children" || key === "pricePerChild") {
            const nextChildren =
                key === "children" ? Number(nextValue) : nextCashflow.children;
            const nextPrice =
                key === "pricePerChild"
                    ? Number(nextValue)
                    : nextCashflow.pricePerChild;

            nextCashflow.income = nextChildren * nextPrice;
        }

        nextCashflows[cashflowIndex] = nextCashflow;

        setSettings({
            ...settings,
            monthlyCashflows: nextCashflows,
        });
        setFinanceDirty(true);
        setSaveError("");
        setSaveMessage("");
    };

    const updateMonthlyRenovationCashflow = (
        cashflowMonth: string,
        key: MonthlyCashflowNumberKey,
        value: string
    ) => {
        if (!settings) {
            return;
        }

        const nextCashflows = [...(settings.monthlyCashflows || [])];
        const cashflowIndex = nextCashflows.findIndex(
            (cashflow) => cashflow.month === cashflowMonth
        );
        const currentCashflow = nextCashflows[cashflowIndex];

        if (!currentCashflow || !isSetupMonth(currentCashflow.month)) {
            return;
        }

        nextCashflows[cashflowIndex] = {
            ...currentCashflow,
            [key]: Number(value.replace(/[^\d]/g, "")) || 0,
        };

        setSettings({
            ...settings,
            monthlyCashflows: nextCashflows,
        });
        setFinanceDirty(true);
        setSaveError("");
        setSaveMessage("");
    };

    const handleSave = async () => {
        if (!settings || !financeDirty || saving) return;

        setSaving(true);
        setSaveError("");
        setSaveMessage("");
        try {
            const updatedSettings = await updateDaycareFinance(settings);
            setSettings(updatedSettings);
            setFinanceDirty(false);
            setSaveMessage("הנתונים הכספיים נשמרו בהצלחה.");
            onChanged();
        } catch (error) {
            console.error("Failed to save finance settings:", error);
            setSaveError("שמירת הנתונים נכשלה. נסו שוב.");
        } finally {
            setSaving(false);
        }
    };

    if (loadError) {
        return <div className={styles.loading}>{loadError}</div>;
    }

    if (loading || !settings || !summary) {
        return <div className={styles.loading}>טוען תחזית כלכלית...</div>;
    }

    const selectedCashflow =
        summary.cashflows.find((cashflow) => cashflow.month === selectedMonth) ||
        summary.cashflows[0];
    const selectedSetupMonth = selectedCashflow
        ? isSetupMonth(selectedCashflow.month)
        : false;
    const selectedOngoingExpenses = selectedCashflow
        ? getOngoingExpensesFromCashflow(selectedCashflow)
        : 0;
    const selectedRenovationExpenses =
        selectedCashflow && selectedSetupMonth
            ? getRenovationFromCashflow(selectedCashflow)
            : 0;
    const selectedAvailableCashflow = selectedCashflow
        ? selectedCashflow.income +
          selectedCashflow.extraIncome -
          selectedOngoingExpenses
        : 0;
    const selectedAfterRepayment = selectedCashflow
        ? selectedAvailableCashflow - selectedCashflow.renovationRepayment
        : 0;

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
                        <div className={styles.financeMonthHeader}>
                            <div>
                                <h3 className={styles.formGroupTitle}>
                                    מילוי חודש
                                </h3>
                                <p className={styles.formGroupNote}>
                                    בוחרים חודש וממלאים סכומים בפועל. הנתונים
                                    הבסיסיים מגיעים אוטומטית, ואפשר לשנות אותם
                                    לכל חודש בנפרד.
                                </p>
                            </div>
                            <div className={styles.financeSaveActions}>
                                <button
                                    className={styles.primaryButton}
                                    type="button"
                                    disabled={!financeDirty || saving}
                                    onClick={() => void handleSave()}
                                >
                                    {saving
                                        ? "שומר..."
                                        : financeDirty
                                          ? "שמירת הנתונים הכספיים"
                                          : "הנתונים שמורים"}
                                </button>
                                {(saveError || saveMessage) && (
                                    <span
                                        className={
                                            saveError
                                                ? styles.financeSaveError
                                                : styles.financeSaveStatus
                                        }
                                    >
                                        {saveError || saveMessage}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className={styles.financeMonthPicker}>
                            <label className={styles.financeMonthSelectField}>
                                <span className={styles.fieldLabel}>
                                    בחירת חודש
                                </span>
                                <select
                                    className={styles.financeMonthSelect}
                                    disabled={saving}
                                    value={selectedCashflow?.month || ""}
                                    onChange={(event) =>
                                        setSelectedMonth(event.target.value)
                                    }
                                >
                                    {summary.cashflows.map((cashflow) => (
                                        <option
                                            key={cashflow.month}
                                            value={cashflow.month}
                                        >
                                            {formatMonth(cashflow.month)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className={styles.financeMonthList}>
                            {!selectedCashflow && (
                                <div className={styles.financeEmptyState}>
                                    טוען את חודשי השנה...
                                </div>
                            )}

                            {selectedCashflow && (
                                <div
                                    className={styles.financeMonthRow}
                                    key={selectedCashflow.month}
                                >
                                            <div className={styles.financeMonthTitle}>
                                                <div>
                                                    <span
                                                        className={
                                                            styles.fieldLabel
                                                        }
                                                    >
                                                        חודש נבחר
                                                    </span>
                                                    <strong
                                                        className={
                                                            styles.financeMonthName
                                                        }
                                                    >
                                                        {formatMonth(
                                                            selectedCashflow.month
                                                        )}
                                                    </strong>
                                                </div>
                                                <span
                                                    className={
                                                        selectedSetupMonth
                                                            ? styles.financeSetupBadge
                                                            : styles.financeOngoingBadge
                                                    }
                                                >
                                                    {selectedSetupMonth
                                                        ? "שוטף + שיפוץ"
                                                        : "שוטף בלבד"}
                                                </span>
                                            </div>

                                            <div className={styles.financeMonthGroup}>
                                                <h4
                                                    className={
                                                        styles.financeMonthGroupTitle
                                                    }
                                                >
                                                    הכנסות
                                                </h4>
                                                {monthlyIncomeFields.map((field) => (
                                                    <label
                                                        className={styles.field}
                                                        key={field.key}
                                                    >
                                                        <span
                                                            className={
                                                                styles.fieldLabel
                                                            }
                                                        >
                                                            {field.label}
                                                        </span>
                                                        <input
                                                            className={`${styles.input} ${styles.numberInput}`}
                                                            disabled={saving}
                                                            inputMode="numeric"
                                                            type="text"
                                                            value={
                                                                selectedCashflow[
                                                                    field.key
                                                                ] || ""
                                                            }
                                                            onChange={(event) =>
                                                                updateMonthlyCashflow(
                                                                    selectedCashflow.month,
                                                                    field.key,
                                                                    event.target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                ))}
                                            </div>

                                            <div className={styles.financeMonthGroup}>
                                                <h4
                                                    className={
                                                        styles.financeMonthGroupTitle
                                                    }
                                                >
                                                    הוצאות קבועות
                                                </h4>
                                                {monthlyFixedExpenseFields.map(
                                                    (field) => (
                                                        <label
                                                            className={
                                                                styles.field
                                                            }
                                                            key={field.key}
                                                        >
                                                            <span
                                                                className={
                                                                    styles.fieldLabel
                                                                }
                                                            >
                                                                {field.label}
                                                            </span>
                                                            <input
                                                                className={`${styles.input} ${styles.numberInput}`}
                                                                disabled={saving}
                                                                inputMode="numeric"
                                                                type="text"
                                                                value={
                                                                    selectedCashflow[
                                                                        field
                                                                            .key
                                                                    ] || ""
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    updateMonthlyCashflow(
                                                                        selectedCashflow.month,
                                                                        field.key,
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    )
                                                )}
                                            </div>

                                            <div className={styles.financeMonthGroup}>
                                                <h4
                                                    className={
                                                        styles.financeMonthGroupTitle
                                                    }
                                                >
                                                    הוצאות משתנות
                                                </h4>
                                                {monthlyVariableExpenseFields.map(
                                                    (field) => (
                                                        <label
                                                            className={
                                                                styles.field
                                                            }
                                                            key={field.key}
                                                        >
                                                            <span
                                                                className={
                                                                    styles.fieldLabel
                                                                }
                                                            >
                                                                {field.label}
                                                            </span>
                                                            <input
                                                                className={`${styles.input} ${styles.numberInput}`}
                                                                disabled={saving}
                                                                inputMode="numeric"
                                                                type="text"
                                                                value={
                                                                    selectedCashflow[
                                                                        field
                                                                            .key
                                                                    ] || ""
                                                                }
                                                                onChange={(
                                                                    event
                                                                ) =>
                                                                    updateMonthlyCashflow(
                                                                        selectedCashflow.month,
                                                                        field.key,
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    )
                                                )}
                                            </div>

                                            {selectedSetupMonth && (
                                                <div
                                                    className={
                                                        styles.financeMonthGroup
                                                    }
                                                >
                                                    <h4
                                                        className={
                                                            styles.financeMonthGroupTitle
                                                        }
                                                    >
                                                        שיפוץ והקמה
                                                    </h4>
                                                    {monthlyRenovationFields.map(
                                                        (field) => (
                                                            <label
                                                                className={
                                                                    styles.field
                                                                }
                                                                key={field.key}
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.fieldLabel
                                                                    }
                                                                >
                                                                    {field.label}
                                                                </span>
                                                                <input
                                                                    className={`${styles.input} ${styles.numberInput}`}
                                                                    disabled={saving}
                                                                    inputMode="numeric"
                                                                    type="text"
                                                                    value={
                                                                        selectedCashflow[
                                                                            field.key
                                                                        ] || ""
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateMonthlyRenovationCashflow(
                                                                            selectedCashflow.month,
                                                                            field.key,
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            <div className={styles.financeMonthGroup}>
                                                <h4
                                                    className={
                                                        styles.financeMonthGroupTitle
                                                    }
                                                >
                                                    החזר השקעה
                                                </h4>
                                                <label className={styles.field}>
                                                    <span
                                                        className={
                                                            styles.fieldLabel
                                                        }
                                                    >
                                                        {
                                                            monthlyRepaymentField.label
                                                        }
                                                    </span>
                                                    <input
                                                        className={`${styles.input} ${styles.numberInput}`}
                                                        disabled={saving}
                                                        inputMode="numeric"
                                                        type="text"
                                                        value={
                                                            selectedCashflow[
                                                                monthlyRepaymentField
                                                                    .key
                                                            ] || ""
                                                        }
                                                        onChange={(event) =>
                                                            updateMonthlyCashflow(
                                                                selectedCashflow.month,
                                                                monthlyRepaymentField.key,
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            <div className={styles.financeMonthTotals}>
                                                <div className={styles.financeMonthMeta}>
                                                    <span>הוצאות שוטפות</span>
                                                    <strong>
                                                        {formatCurrency(
                                                            selectedOngoingExpenses
                                                        )}
                                                    </strong>
                                                </div>
                                                {selectedSetupMonth && (
                                                    <div
                                                        className={
                                                            styles.financeMonthMeta
                                                        }
                                                    >
                                                        <span>שיפוץ החודש</span>
                                                        <strong>
                                                            {formatCurrency(
                                                                selectedRenovationExpenses
                                                            )}
                                                        </strong>
                                                    </div>
                                                )}
                                                <div className={styles.financeMonthMeta}>
                                                    <span>תזרים פנוי</span>
                                                    <strong>
                                                        {formatCurrency(
                                                            selectedAvailableCashflow
                                                        )}
                                                    </strong>
                                                </div>
                                                <div className={styles.financeMonthMeta}>
                                                    <span>אחרי כיסוי שיפוץ</span>
                                                    <strong>
                                                        {formatCurrency(
                                                            selectedAfterRepayment
                                                        )}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className={styles.financeSummaryPanel}>
                    <article className={styles.financeMainMetric}>
                        <span className={styles.financeMetricKicker}>
                            מצב חודש נבחר
                        </span>
                        <strong
                            className={`${styles.financeMainValue} ${
                                selectedAvailableCashflow >= 0
                                    ? styles.financeValuePositive
                                    : styles.financeValueNegative
                            }`}
                        >
                            {formatCurrency(selectedAvailableCashflow)}
                        </strong>
                    </article>

                    <div className={styles.financeDetailList}>
                        <div className={styles.financeDetailItem}>
                            <span>הכנסות חודש נבחר</span>
                            <strong>
                                {formatCurrency(
                                    selectedCashflow
                                        ? selectedCashflow.income +
                                              selectedCashflow.extraIncome
                                        : 0
                                )}
                            </strong>
                        </div>
                        <div className={styles.financeDetailItem}>
                            <span>הוצאות שוטפות חודש נבחר</span>
                            <strong>
                                {formatCurrency(selectedOngoingExpenses)}
                            </strong>
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
                            <span>מטבלת חודשים</span>
                            <strong>
                                {formatCurrency(
                                    summary.monthlyRenovationInvestment +
                                        summary.legacyRenovationInvestment
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
                            <span>כוסה בפועל</span>
                            <strong>
                                {formatCurrency(summary.totalRepayment)}
                            </strong>
                        </div>
                        <div className={styles.financePaybackRow}>
                            <span>נותר לכיסוי</span>
                            <strong>
                                {formatCurrency(summary.remainingInvestment)}
                            </strong>
                        </div>
                        <div className={styles.financePaybackRow}>
                            <span>חודש כיסוי מלא</span>
                            <strong>
                                {summary.coveredMonth
                                    ? formatMonth(summary.coveredMonth)
                                    : "עדיין לא כוסה"}
                            </strong>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
};

export default DaycareFinance;
