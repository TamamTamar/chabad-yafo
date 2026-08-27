import { useEffect, useMemo, useState } from "react";
import {
    getDaycareFinance,
    updateDaycareFinance,
} from "../daycareAdminService";
import type { DaycareFinanceSettings } from "../types";

type DaycareFinanceProps = {
    onChanged: () => void;
    refreshKey?: number;
};

import {
    ensureCurrentYearCashflows,
    formatCurrency,
    formatMonth,
    getCurrentMonthValue,
    getDefaultMonthlyCashflow,
    getExpenses,
    getOngoingExpensesFromCashflow,
    getNumberValue,
    getRenovationFromCashflow,
    getRenovationInvestment,
    isSetupMonth,
    monthlyFixedExpenseFields,
    monthlyIncomeFields,
    monthlyRenovationFields,
    monthlyRepaymentField,
    monthlyVariableExpenseFields,
    type MonthlyCashflowEditKey,
    type MonthlyCashflowNumberKey,
} from "./daycareFinanceUtils";
export const useDaycareFinance = ({ onChanged, refreshKey = 0 }: DaycareFinanceProps) => {
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

    const selectedCashflow =
        summary?.cashflows.find((cashflow) => cashflow.month === selectedMonth) ||
        summary?.cashflows[0];
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

    return {
        settings, loading, saving, financeDirty, loadError, saveError,
        saveMessage, selectedMonth, summary, selectedCashflow,
        selectedSetupMonth, selectedOngoingExpenses, selectedRenovationExpenses,
        selectedAvailableCashflow, selectedAfterRepayment, setSelectedMonth,
        updateMonthlyCashflow, updateMonthlyRenovationCashflow, handleSave,
        formatCurrency, formatMonth, getDefaultMonthlyCashflow,
        monthlyFixedExpenseFields, monthlyIncomeFields, monthlyRenovationFields,
        monthlyRepaymentField, monthlyVariableExpenseFields,
    };
};
