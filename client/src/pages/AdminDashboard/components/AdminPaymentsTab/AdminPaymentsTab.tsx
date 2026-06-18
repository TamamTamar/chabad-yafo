import { useEffect, useState } from "react";
import { getAllPayments } from "../../../../services/adminService";
import type { PaymentAdmin } from "../../../../types/chabad";
import styles from "./AdminPaymentsTab.module.scss";

const currencyFormatter = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
});

const AdminPaymentsTab = () => {
    const [payments, setPayments] = useState<PaymentAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const data = await getAllPayments();
                setPayments(data);
            } catch {
                setError("לא הצלחנו לטעון את התרומות");
            } finally {
                setLoading(false);
            }
        };

        fetchPayments();
    }, []);

    if (loading) {
        return <div className={styles.loading}>טוען...</div>;
    }

    if (error) {
        return <div className={styles.empty}>{error}</div>;
    }

    return (
        <section className={styles.card}>
            {payments.length === 0 ? (
                <div className={styles.empty}>עדיין אין תרומות</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>שם</th>
                                <th>טלפון</th>
                                <th>אימייל</th>
                                <th>סוג</th>
                                <th>סכום</th>
                                <th>תרומות</th>
                                <th>סה״כ מחושב</th>
                                <th>לזכות / הערה</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>

                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment._id}>
                                    <td>
                                        {[payment.FirstName, payment.LastName]
                                            .filter(Boolean)
                                            .join(" ") || "-"}
                                    </td>
                                    <td className={styles.phone}>
                                        {payment.Phone || "-"}
                                    </td>
                                    <td>{payment.Mail || "-"}</td>
                                    <td>
                                        {payment.PaymentType === "HK"
                                            ? "הוראת קבע"
                                            : "רגיל"}
                                    </td>
                                    <td className={styles.amount}>
                                        {currencyFormatter.format(payment.Amount)}
                                    </td>
                                    <td>{payment.Tashlumim}</td>
                                    <td className={styles.amount}>
                                        {currencyFormatter.format(payment.NormalizedTotal)}
                                    </td>
                                    <td>{payment.lizchut || "-"}</td>
                                    <td>
                                        {payment.createdAt
                                            ? new Date(payment.createdAt).toLocaleDateString("he-IL")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default AdminPaymentsTab;
