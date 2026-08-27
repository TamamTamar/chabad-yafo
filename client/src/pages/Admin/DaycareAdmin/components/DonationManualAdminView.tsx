import type { ManualCurrency } from "./useDaycareDonationsAdmin";
import styles from "./DaycareDonationsAdmin.module.scss";
import type { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

type Props = { model: ReturnType<typeof useDaycareDonationsAdmin> };

const DonationManualAdminView = ({ model }: Props) => {
    if (!model.campaign) return null;

    const {
        campaign, ambassadors, saving, activeView,
        manualCurrency, manualAmount, manualExchangeRate, manualRateUpdatedAt,
        manualRateLoading, manualRateError, manualReceivedAt, setManualCurrency,
        setManualAmount, setManualExchangeRate, setManualRateUpdatedAt, setManualRateError,
        setManualReceivedAt, loadAutomaticRate, handleManualDonation, formatCurrency,
        formatShortDate, currencySymbol, currencyAmountLabel, currencyRateLabel,
        sortItemsByNeed,
    } = model;

    return (
        <>
            {activeView === "manual" && (
            <section className={styles.panel}>
                <header>
                    <h2>הזנת תרומה ידנית</h2>
                    <p>
                        עבור העברה בנקאית, מזומן, צ׳ק או תרומה שהתקבלה מחוץ
                        לאתר.
                    </p>
                </header>
                <form
                    className={styles.manualForm}
                    onSubmit={handleManualDonation}
                >
                    <label>
                        מטבע
                        <select
                            name="currency"
                            value={manualCurrency}
                            onChange={(event) => {
                                const currency = event.target.value as ManualCurrency;
                                setManualCurrency(currency);
                                if (currency !== "ILS") {
                                    void loadAutomaticRate(currency);
                                } else {
                                    setManualRateError("");
                                    setManualRateUpdatedAt("");
                                }
                            }}
                        >
                            <option value="ILS">שקל חדש (₪)</option>
                            <option value="USD">דולר ארה״ב ($)</option>
                            <option value="EUR">אירו (€)</option>
                        </select>
                    </label>
                    <label>
                        סכום {currencyAmountLabel[manualCurrency]}
                        <input
                            name="amount"
                            type="number"
                            min="1"
                            step="0.01"
                            value={manualAmount}
                            onChange={(event) =>
                                setManualAmount(event.target.value)
                            }
                            required
                        />
                    </label>
                    {manualCurrency !== "ILS" && (
                        <>
                            <label>
                                שער {currencyRateLabel[manualCurrency]} לשקל
                                <input
                                    name="exchangeRate"
                                    type="number"
                                    min="0.0001"
                                    max="100"
                                    step="0.0001"
                                    value={manualExchangeRate}
                                    onChange={(event) => {
                                        setManualExchangeRate(event.target.value);
                                        setManualRateUpdatedAt("");
                                    }}
                                    placeholder="לדוגמה: 3.72"
                                    required
                                    disabled={manualRateLoading}
                                />
                            </label>
                            <div className={`${styles.conversionPreview} ${styles.fullField}`}>
                                <span>הסכום שייכנס ליעדים ולסיכומים</span>
                                <strong>
                                    ₪{formatCurrency(
                                        Math.round(
                                            Number(manualAmount || 0) *
                                                Number(manualExchangeRate || 0)
                                        )
                                    )}
                                </strong>
                                <small>
                                    {currencySymbol[manualCurrency]}{formatCurrency(Number(manualAmount || 0))} × {manualExchangeRate || "שער"}
                                </small>
                                <div className={styles.rateStatus}>
                                    <span>
                                        {manualRateLoading
                                            ? "טוען שער יציג מבנק ישראל..."
                                            : manualRateUpdatedAt
                                              ? `שער יציג של בנק ישראל לתאריך ${formatShortDate(manualRateUpdatedAt)}`
                                              : manualRateError || "אפשר לערוך את השער ידנית"}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={manualRateLoading}
                                        onClick={() => void loadAutomaticRate(manualCurrency)}
                                    >
                                        רענון שער
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <label>
                        שיוך
                        <select name="itemId" defaultValue="">
                            <option value="">
                                למקום שבו התרומה נדרשת ביותר
                            </option>
                            {sortItemsByNeed(campaign.items).map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title} — {getItemRemaining(item) > 0
                                        ? `חסרים ₪${formatCurrency(getItemRemaining(item))}`
                                        : "היעד הושלם"}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        שגריר
                        <select name="ambassadorId" defaultValue="">
                            <option value="">ללא שגריר — תרומה כללית</option>
                            {ambassadors
                                .filter((ambassador) => ambassador.active)
                                .map((ambassador) => (
                                    <option
                                        key={ambassador._id}
                                        value={ambassador._id}
                                    >
                                        {ambassador.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <label>
                        מקור התרומה
                        <select
                            name="manualSource"
                            defaultValue="bank_transfer"
                            required
                        >
                            <option value="bank_transfer">
                                העברה בנקאית
                            </option>
                            <option value="cash">מזומן</option>
                            <option value="check">צ׳ק</option>
                            <option value="other">אחר</option>
                        </select>
                    </label>
                    <label>
                        שם התורם
                        <input name="donorName" type="text" />
                    </label>
                    <label className={`${styles.manualPrivacyChoice} ${styles.fullField}`}>
                        <input
                            name="displayDonorName"
                            type="checkbox"
                            defaultChecked
                        />
                        <span>
                            <strong>להציג את שם התורם בעמוד הקמפיין</strong>
                            <small>
                                בטלו את הסימון כדי שהתרומה תוצג כאנונימית, בלי למחוק את השם מהאדמין.
                            </small>
                        </span>
                    </label>
                    <label>
                        תאריך ושעת קבלה
                        <input
                            name="receivedAt"
                            type="datetime-local"
                            value={manualReceivedAt}
                            onChange={(event) =>
                                setManualReceivedAt(event.target.value)
                            }
                            onBlur={() => {
                                if (manualCurrency !== "ILS") {
                                    void loadAutomaticRate(manualCurrency);
                                }
                            }}
                            step="60"
                            required
                        />
                    </label>
                    <label>
                        טלפון
                        <input name="phone" type="tel" />
                    </label>
                    <label>
                        דוא״ל
                        <input name="email" type="email" />
                    </label>
                    <label className={styles.fullField}>
                        הקדשה
                        <input name="dedication" type="text" />
                    </label>
                    <label className={styles.fullField}>
                        אסמכתא
                        <input
                            name="reference"
                            type="text"
                            placeholder="מספר העברה / מספר צ׳ק / אסמכתא"
                        />
                    </label>
                    <label className={styles.fullField}>
                        הערה פנימית (חובה אם אין אסמכתא)
                        <textarea name="note" rows={2} />
                    </label>
                    <button type="submit" disabled={saving}>
                        {saving ? "שומר..." : "שמירת תרומה ועדכון המדדים"}
                    </button>
                </form>
            </section>
            )}

        </>
    );
};

export default DonationManualAdminView;
