import {
    ArrowLeft,
    ArrowRight,
    Check,
    Heart,
    LockKeyhole,
    X,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createDaycareDonationIntent } from "../../../services/daycareDonationService";
import { buildNedarimPayload } from "../../../shared/donations/nedarimPayload";
import { useNedarimIframe } from "../../../shared/donations/useNedarimIframe";
import type { DonationItem, DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type DonationModalProps = {
    open: boolean;
    initialSelection: DonationSelection;
    donationItems: DonationItem[];
    paymentsEnabled: boolean;
    onClose: () => void;
    onPaymentComplete?: () => void;
};

type AmountChoice = 180 | 360 | 770 | "complete" | "custom";
type DonationStep = 1 | 2 | 3 | 4;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const DonationModalPreview = ({
    open,
    initialSelection,
    donationItems,
    paymentsEnabled,
    onClose,
    onPaymentComplete,
}: DonationModalProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [step, setStep] = useState<DonationStep>(1);
    const [selectedId, setSelectedId] = useState(initialSelection.id);
    const [amountChoice, setAmountChoice] = useState<AmountChoice>(360);
    const [customAmount, setCustomAmount] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [dedication, setDedication] = useState("");
    const [preparing, setPreparing] = useState(false);
    const [formError, setFormError] = useState("");
    const [paymentPayload, setPaymentPayload] =
        useState<Record<string, unknown> | null>(null);

    const handlePaymentSuccess = useCallback(() => {
        setStep(4);
        onPaymentComplete?.();
    }, [onPaymentComplete]);

    const payment = useNedarimIframe({
        enabled: open && step === 3,
        iframeRef,
        onSuccess: handlePaymentSuccess,
        successDelay: 700,
    });

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const selectedItem = useMemo(
        () => donationItems.find((item) => item.id === selectedId),
        [donationItems, selectedId]
    );
    const remaining = selectedItem
        ? Math.max(0, selectedItem.goal - selectedItem.raised)
        : null;
    const selectedTitle =
        selectedId === "general"
            ? "למקום שבו התרומה נדרשת ביותר"
            : selectedItem?.title ?? initialSelection.title;

    const amount =
        amountChoice === "custom"
            ? Number(customAmount.replace(/[^\d]/g, "")) || 0
            : amountChoice === "complete"
              ? remaining ?? 0
              : amountChoice;

    const amountOptions: { value: AmountChoice; label: string }[] = [
        { value: 180, label: "₪180" },
        { value: 360, label: "₪360" },
        { value: 770, label: "₪770" },
        { value: "complete", label: "השלמת הסכום" },
        { value: "custom", label: "סכום אחר" },
    ];

    const preparePayment = async () => {
        setFormError("");
        if (!paymentsEnabled) {
            setFormError(
                "מערכת התשלום עדיין בבדיקת אבטחה. בשלב זה לא מתבצע חיוב."
            );
            return;
        }
        if (!fullName.trim() || !phone.trim() || !email.trim()) {
            setFormError("יש למלא שם, טלפון ודוא״ל לקבלה.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setFormError("כתובת הדוא״ל אינה תקינה.");
            return;
        }
        if (!import.meta.env.VITE_NEDARIM_MOSAD || !import.meta.env.VITE_NEDARIM_API_VALID) {
            setFormError("שירות התשלום אינו מוגדר כרגע. אפשר לפנות אלינו לתרומה.");
            return;
        }

        setPreparing(true);
        try {
            const intent = await createDaycareDonationIntent({
                amount,
                itemId: selectedId === "general" ? undefined : selectedId,
                donorName: fullName.trim(),
                phone: phone.trim(),
                email: email.trim(),
                dedication: dedication.trim() || undefined,
            });
            const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
            const lastName = lastNameParts.join(" ") || firstName;
            setPaymentPayload(
                buildNedarimPayload({
                    Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
                    ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
                    Amount: amount,
                    Tashlumim: 1,
                    Currency: "1",
                    Description: `תרומה למעון — ${selectedTitle}`,
                    firstName,
                    lastName,
                    phone: phone.trim(),
                    email: email.trim(),
                    PaymentType: "Ragil",
                    Comment: dedication.trim(),
                    CallBack: intent.callbackUrl,
                    Param1: intent.param1,
                    Param2: intent.param2,
                })
            );
            setStep(3);
        } catch (error) {
            console.error("Failed to prepare daycare donation:", error);
            setFormError(
                "לא הצלחנו להכין את התשלום. נסו שוב בעוד רגע או פנו אלינו."
            );
        } finally {
            setPreparing(false);
        }
    };

    const title =
        step === 1
            ? "בוחרים איך לקחת חלק"
            : step === 2
              ? "הפרטים שלכם"
              : step === 3
                ? "תשלום מאובטח"
                : "תודה שלקחתם חלק";

    return (
        <dialog
            ref={dialogRef}
            className={styles.donationDialog}
            aria-labelledby="donation-modal-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className={styles.donationModal}>
                <header className={styles.modalHeader}>
                    <div>
                        <p>
                            <Heart aria-hidden="true" />
                            שותפים בהקמת המעון
                        </p>
                        <h2 id="donation-modal-title">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגירת חלונית התרומה"
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                {step < 4 && (
                    <div className={styles.modalSteps} aria-label="שלבי התרומה">
                        <span className={styles.modalStepActive}>
                            <b>1</b> יעד וסכום
                        </span>
                        <i aria-hidden="true" />
                        <span className={step >= 2 ? styles.modalStepActive : ""}>
                            <b>2</b> פרטים ותשלום
                        </span>
                    </div>
                )}

                <div className={styles.modalBody}>
                    {step === 1 && (
                        <>
                            <label
                                className={styles.fieldLabel}
                                htmlFor="donation-target"
                            >
                                לאן תרצו לייעד את התרומה?
                            </label>
                            <div className={styles.selectWrap}>
                                <select
                                    id="donation-target"
                                    value={selectedId}
                                    onChange={(event) => {
                                        const nextId = event.target.value;
                                        setSelectedId(nextId);
                                        if (
                                            nextId === "general" &&
                                            amountChoice === "complete"
                                        ) {
                                            setAmountChoice(360);
                                        }
                                    }}
                                >
                                    <option value="general">
                                        למקום שבו התרומה נדרשת ביותר
                                    </option>
                                    {donationItems
                                        .filter((item) => item.acceptingDonations)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.title}
                                            </option>
                                        ))}
                                </select>
                                <Check aria-hidden="true" />
                            </div>
                            <div className={styles.selectedTarget}>
                                <span>התרומה תיועד עבור</span>
                                <strong>{selectedTitle}</strong>
                                {remaining !== null && (
                                    <small>
                                        נותרו ₪{formatCurrency(remaining)} להשלמת החלק
                                    </small>
                                )}
                            </div>
                            <fieldset className={styles.amountFieldset}>
                                <legend>בחרו סכום</legend>
                                <div className={styles.amountGrid}>
                                    {amountOptions.map((option) => (
                                        <button
                                            type="button"
                                            key={String(option.value)}
                                            className={
                                                amountChoice === option.value
                                                    ? styles.amountActive
                                                    : ""
                                            }
                                            onClick={() => setAmountChoice(option.value)}
                                            disabled={
                                                option.value === "complete" &&
                                                remaining === null
                                            }
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            {amountChoice === "custom" && (
                                <label className={styles.customAmountLabel}>
                                    סכום התרומה
                                    <span>
                                        <b>₪</b>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={customAmount}
                                            onChange={(event) =>
                                                setCustomAmount(
                                                    event.target.value.replace(/[^\d]/g, "")
                                                )
                                            }
                                            placeholder="הזינו סכום"
                                            autoFocus
                                        />
                                    </span>
                                </label>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className={styles.stepSummary}>
                                <span>התרומה שלכם</span>
                                <strong>₪{formatCurrency(amount)}</strong>
                                <small>{selectedTitle}</small>
                            </div>
                            <div className={styles.donorFields}>
                                <label>
                                    שם מלא
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        autoComplete="name"
                                        autoFocus
                                    />
                                </label>
                                <label>
                                    טלפון
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        autoComplete="tel"
                                    />
                                </label>
                                <label className={styles.fullField}>
                                    דוא״ל לקבלה
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        autoComplete="email"
                                    />
                                </label>
                                <label className={styles.fullField}>
                                    הקדשה או ברכה
                                    <textarea
                                        rows={3}
                                        value={dedication}
                                        onChange={(event) =>
                                            setDedication(event.target.value)
                                        }
                                        placeholder="אפשר להקדיש את התרומה..."
                                    />
                                </label>
                            </div>
                            {formError && (
                                <p className={styles.paymentError} role="alert">
                                    {formError}
                                </p>
                            )}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className={styles.stepSummary}>
                                <span>חיוב מאובטח באמצעות נדרים פלוס</span>
                                <strong>₪{formatCurrency(amount)}</strong>
                                <small>{selectedTitle}</small>
                            </div>
                            <div className={styles.nedarimFrameWrap}>
                                {!payment.isReady && (
                                    <p>טוען חלון תשלום מאובטח...</p>
                                )}
                                <iframe
                                    ref={iframeRef}
                                    title="תשלום מאובטח בנדרים פלוס"
                                    src="https://www.matara.pro/nedarimplus/iframe?language=he"
                                    scrolling="no"
                                />
                            </div>
                            {(payment.errorText || payment.statusText) && (
                                <p
                                    className={
                                        payment.errorText
                                            ? styles.paymentError
                                            : styles.paymentStatus
                                    }
                                    role="status"
                                >
                                    {payment.errorText || payment.statusText}
                                </p>
                            )}
                        </>
                    )}

                    {step === 4 && (
                        <div className={styles.paymentSuccess}>
                            <Check aria-hidden="true" />
                            <strong>התרומה בוצעה בהצלחה</strong>
                            <p>
                                תודה שאתם שותפים בהקמת מקום חם, בטוח ושמח לילדי
                                המעון.
                            </p>
                        </div>
                    )}
                </div>

                <footer className={styles.modalFooter}>
                    {step < 4 && (
                        <div>
                            <span>סכום התרומה</span>
                            <strong>₪{formatCurrency(amount)}</strong>
                        </div>
                    )}
                    {step === 1 && (
                        <button
                            type="button"
                            className={styles.modalContinue}
                            disabled={amount <= 0}
                            onClick={() => setStep(2)}
                        >
                            המשך לפרטים
                            <ArrowLeft aria-hidden="true" />
                        </button>
                    )}
                    {step === 2 && (
                        <div className={styles.modalFinalActions}>
                            <button
                                type="button"
                                className={styles.modalBack}
                                onClick={() => setStep(1)}
                                disabled={preparing}
                            >
                                <ArrowRight aria-hidden="true" />
                                חזרה
                            </button>
                            <button
                                type="button"
                                onClick={() => void preparePayment()}
                                disabled={preparing || !paymentsEnabled}
                            >
                                <LockKeyhole aria-hidden="true" />
                                {preparing
                                    ? "מכין תשלום..."
                                    : paymentsEnabled
                                      ? "מעבר לתשלום מאובטח"
                                      : "התשלום ייפתח לאחר הבדיקה"}
                            </button>
                        </div>
                    )}
                    {step === 3 && (
                        <div className={styles.modalFinalActions}>
                            <button
                                type="button"
                                className={styles.modalBack}
                                onClick={() => setStep(2)}
                                disabled={payment.isPaying}
                            >
                                <ArrowRight aria-hidden="true" />
                                חזרה
                            </button>
                            <button
                                type="button"
                                disabled={
                                    !payment.isReady ||
                                    payment.isPaying ||
                                    !paymentPayload
                                }
                                onClick={() =>
                                    paymentPayload &&
                                    payment.startPayment(paymentPayload)
                                }
                            >
                                <LockKeyhole aria-hidden="true" />
                                {payment.isPaying ? "מבצע חיוב..." : "ביצוע תרומה"}
                            </button>
                        </div>
                    )}
                    {step === 4 && (
                        <button type="button" onClick={onClose}>
                            סיום וחזרה לעמוד
                        </button>
                    )}
                    <p>
                        התשלום מתבצע בחלון המאובטח של נדרים פלוס. פרטי הכרטיס
                        אינם נשמרים באתר.
                    </p>
                </footer>
            </div>
        </dialog>
    );
};

export default DonationModalPreview;
