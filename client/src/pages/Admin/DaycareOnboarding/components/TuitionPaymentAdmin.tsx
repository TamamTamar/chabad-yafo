import { useEffect, useState } from "react";
import {
    getAdminTuitionPaymentHistory,
    updateAdminTuitionPayment,
    type DaycarePaymentHistoryItem,
} from "../../../../services/daycareOnboardingService";
import type { AdminDaycareOnboarding } from "../../../../types/daycareOnboarding";
import { formatDate } from "../daycareOnboardingAdminUtils";
import styles from "../DaycareOnboardingAdmin.module.scss";

type Props = {
    onboarding: AdminDaycareOnboarding;
    onUpdated: (value: AdminDaycareOnboarding) => void;
    onNotice: (value: string) => void;
    onError: (value: string) => void;
};

const TuitionPaymentAdmin = ({ onboarding, onUpdated, onNotice, onError }: Props) => {
    const [monthly, setMonthly] = useState(String(onboarding.tuitionPayment.monthlyTuitionAmount));
    const [busy, setBusy] = useState(false);
    const [history, setHistory] = useState<DaycarePaymentHistoryItem[]>([]);

    useEffect(() => {
        void getAdminTuitionPaymentHistory(onboarding.id)
            .then(setHistory)
            .catch(() => setHistory([]));
    }, [onboarding.id, onboarding.tuitionPayment.transactionId]);

    const save = async () => {
        setBusy(true);
        onError("");
        try {
            const updated = await updateAdminTuitionPayment(onboarding.id, {
                monthlyTuitionAmount: Number(monthly),
            });
            onUpdated(updated);
            onNotice("הגדרות שכר הלימוד נשמרו");
        } catch {
            onError("שמירת הגדרות שכר הלימוד נכשלה");
        } finally {
            setBusy(false);
        }
    };

    const payment = onboarding.tuitionPayment;
    return (
        <section className={styles.controlCard} id="tuition-payment-admin">
            <h2 className={styles.controlTitle}>שכר לימוד והוראת קבע</h2>
            <div className={styles.tuitionAdminGrid}>
                <label className={styles.fieldLabel}>
                    שכר לימוד חודשי (₪)
                    <input className={styles.linkInput} type="number" min="1" step="0.01" value={monthly} disabled={payment.status === "active"} onChange={(event) => setMonthly(event.target.value)} />
                </label>
            </div>
            <dl className={styles.identityDetails}>
                <div className={styles.identityDetailItem}><dt className={styles.identityDetailLabel}>סטטוס</dt><dd className={styles.identityDetailValue}>{payment.status === "active" ? "הוראת קבע פעילה" : "ממתין להקמת הוראת קבע"}</dd></div>
                <div className={styles.identityDetailItem}><dt className={styles.identityDetailLabel}>סכום חודשי</dt><dd className={styles.identityDetailValue}>₪{payment.monthlyTuitionAmount.toLocaleString("he-IL")}</dd></div>
                <div className={styles.identityDetailItem}><dt className={styles.identityDetailLabel}>מועד הקמה</dt><dd className={styles.identityDetailValue}>{formatDate(payment.establishedAt)}</dd></div>
                <div className={styles.identityDetailItem}><dt className={styles.identityDetailLabel}>מזהה עסקה</dt><dd className={styles.identityDetailValue}>{payment.transactionId ?? "—"}</dd></div>
            </dl>
            <div className={styles.linkActions}>
                <button className={styles.primaryButton} type="button" disabled={busy || payment.status === "active"} onClick={() => void save()}>שמירת שכר הלימוד</button>
            </div>
            <p className={styles.helperText}>ההורה מקים פעם אחת הוראת קבע ל־12 חיובים חודשיים. לאחר ההקמה לא ניתן לשנות כאן את הסכום של ההוראה הפעילה.</p>
            {history.length > 0 ? (
                <details className={styles.correctionPanel}>
                    <summary className={styles.correctionSummary}>היסטוריית עסקאות ({history.length})</summary>
                    <div className={styles.paymentHistoryList}>
                        {history.map((item) => (
                            <div className={styles.paymentHistoryItem} key={item._id}>
                                <strong>הוראת קבע — 12 חודשים</strong>
                                <span>סכום חודשי: ₪{item.requestedAmount.toLocaleString("he-IL")}</span>
                                <span>סטטוס: {item.status === "confirmed" ? "פעילה" : item.status === "failed" ? "נכשלה" : "ממתינה"}</span>
                                <span>תאריך: {formatDate(item.paidAt ?? item.createdAt)}</span>
                                <span>עסקה: {item.externalTransactionId ?? "—"}</span>
                            </div>
                        ))}
                    </div>
                </details>
            ) : null}
        </section>
    );
};

export default TuitionPaymentAdmin;
