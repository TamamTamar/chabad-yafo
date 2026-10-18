import { AdminButton, AdminInput, AdminSelect, AdminCard, AdminBadge } from "../../../../components/AdminUI";
import styles from "./DaycareFinance.module.scss";
import type { useDaycareFinance } from "./useDaycareFinance";
import type { MonthlyField, MonthlyCashflowEditKey } from "./daycareFinanceUtils";

type Props = { model: ReturnType<typeof useDaycareFinance> };
const DaycareFinanceView = ({ model }: Props) => {
    const {
        settings, loading, saving, financeDirty,
        loadError, saveError, saveMessage, summary,
        selectedCashflow, selectedSetupMonth, selectedOngoingExpenses, selectedRenovationExpenses,
        selectedAvailableCashflow, selectedAfterRepayment, setSelectedMonth, updateMonthlyCashflow,
        updateMonthlyRenovationCashflow, handleSave, formatCurrency, formatMonth,
        monthlyFixedExpenseFields, monthlyIncomeFields, monthlyRenovationFields, monthlyRepaymentField,
        monthlyVariableExpenseFields, getMonthlyInputValue,
    } = model;

    if (loadError) return <AdminCard role="alert">{loadError}</AdminCard>;
    if (loading || !settings || !summary) return <AdminCard role="status">טוען תחזית כלכלית...</AdminCard>;

    const amount = (value: number) => <bdi className={styles.amount} dir="ltr">{formatCurrency(value)}</bdi>;
    const group = (title: string, fields: MonthlyField[], renovation = false) => selectedCashflow && (
        <fieldset className={styles.group}>
            <legend>{title}</legend>
            <div className={styles.fields}>
                {fields.map(field => <label className={styles.field} key={field.key}>
                    <span>{field.label}{field.key !== "children" && <span className={styles.unit}> · ₪</span>}</span>
                    <AdminInput aria-label={field.label} disabled={saving} inputMode="decimal" type="text" dir="ltr"
                        value={getMonthlyInputValue(selectedCashflow.month, field.key)}
                        aria-describedby={saveError ? "finance-feedback" : undefined}
                        onChange={event => renovation
                            ? updateMonthlyRenovationCashflow(selectedCashflow.month, field.key, event.target.value)
                            : updateMonthlyCashflow(selectedCashflow.month, field.key as MonthlyCashflowEditKey, event.target.value)} />
                </label>)}
            </div>
        </fieldset>
    );
    const row = (label: string, value: number) => <div className={styles.row}><span>{label}</span><strong>{amount(value)}</strong></div>;
    return <section className={styles.layout} aria-label="מצב כספי בפועל" aria-busy={saving}>
        <AdminCard className={styles.form}>
            <header className={styles.header}>
                <div><h2>מילוי חודש</h2><p>בוחרים חודש וממלאים סכומים בפועל. הנתונים הבסיסיים מגיעים אוטומטית, ואפשר לשנות אותם לכל חודש בנפרד.</p></div>
                <div className={styles.actions}>
                    <AdminButton variant="primary" disabled={!financeDirty || saving} onClick={() => void handleSave()}>
                        {saving ? "שומר..." : financeDirty ? "שמירת הנתונים הכספיים" : "הנתונים שמורים"}
                    </AdminButton>
                    <span id="finance-feedback" role={saveError ? "alert" : "status"} className={saveError ? styles.error : styles.feedback}>{saveError || saveMessage}</span>
                </div>
            </header>
            <label className={styles.picker}><span>בחירת חודש</span>
                <AdminSelect disabled={saving} value={selectedCashflow?.month || ""} onChange={event => setSelectedMonth(event.target.value)}>
                    {summary.cashflows.map(flow => <option key={flow.month} value={flow.month}>{formatMonth(flow.month)}</option>)}
                </AdminSelect>
            </label>
            {!selectedCashflow ? <p role="status">טוען את חודשי השנה...</p> : <>
                <div className={styles.month}><h3>{formatMonth(selectedCashflow.month)}</h3><AdminBadge tone={selectedSetupMonth ? "warning" : "info"}>{selectedSetupMonth ? "שוטף + שיפוץ" : "שוטף בלבד"}</AdminBadge></div>
                {group("הכנסות", monthlyIncomeFields)}
                {group("הוצאות קבועות", monthlyFixedExpenseFields)}
                {group("הוצאות משתנות", monthlyVariableExpenseFields)}
                {selectedSetupMonth && group("שיפוץ והקמה", monthlyRenovationFields, true)}
                {group("כיסוי שיפוץ", [monthlyRepaymentField])}
                <div className={styles.totals}>
                    {row("הוצאות שוטפות", selectedOngoingExpenses)}
                    {selectedSetupMonth && row("שיפוץ החודש", selectedRenovationExpenses)}
                    {row("תזרים פנוי", selectedAvailableCashflow)}
                    {row("אחרי כיסוי שיפוץ", selectedAfterRepayment)}
                </div>
            </>}
        </AdminCard>
        <aside className={styles.summary} aria-label="סיכום כספי">
            <AdminCard>
                <h2>מצב חודש נבחר</h2>
                <strong className={`${styles.balance} ${selectedAvailableCashflow < 0 ? styles.negative : styles.positive}`}>{amount(selectedAvailableCashflow)}</strong>
                <p className={styles.feedback}>תזרים פנוי לפני כיסוי שיפוץ</p>
                {row("הכנסות חודש נבחר", selectedCashflow ? selectedCashflow.income + selectedCashflow.extraIncome : 0)}
                {row("הוצאות שוטפות חודש נבחר", selectedOngoingExpenses)}
            </AdminCard>
            <AdminCard>
                <h2>השקעת פתיחה</h2>
                {row("מתתי־משימות", summary.taskActualCosts)}
                {row("מטבלת חודשים", summary.monthlyRenovationInvestment + summary.legacyRenovationInvestment)}
                {row("סה״כ השקעה", summary.renovationInvestment)}
                {row("כוסה בפועל", summary.totalRepayment)}
                {row("נותר לכיסוי", summary.remainingInvestment)}
                <div className={styles.row}><span>חודש כיסוי מלא</span><strong>{summary.coveredMonth ? formatMonth(summary.coveredMonth) : "עדיין לא כוסה"}</strong></div>
            </AdminCard>
        </aside>
    </section>;
};
export default DaycareFinanceView;
