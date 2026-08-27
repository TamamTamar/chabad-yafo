import styles from "../DaycareAdmin.module.scss";
import type { useDaycareFinance } from "./useDaycareFinance";

type Props = { model: ReturnType<typeof useDaycareFinance> };

const DaycareFinanceView = ({ model }: Props) => {
    const {
        settings, loading, saving, financeDirty,
        loadError, saveError, saveMessage, summary,
        selectedCashflow, selectedSetupMonth, selectedOngoingExpenses, selectedRenovationExpenses,
        selectedAvailableCashflow, selectedAfterRepayment, setSelectedMonth, updateMonthlyCashflow,
        updateMonthlyRenovationCashflow, handleSave, formatCurrency, formatMonth,
        monthlyFixedExpenseFields, monthlyIncomeFields, monthlyRenovationFields, monthlyRepaymentField,
        monthlyVariableExpenseFields,
    } = model;

    if (loadError) {
        return <div className={styles.loading}>{loadError}</div>;
    }

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

export default DaycareFinanceView;
