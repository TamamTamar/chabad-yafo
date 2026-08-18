import {
    ArrowLeft,
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    Heart,
    LockKeyhole,
    MessageCircle,
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
import type {
    DaycareDonationIntentInput,
    DaycareDonationIntentResponse,
} from "../../../services/daycareDonationService";
import { buildNedarimPayload } from "../../../shared/donations/nedarimPayload";
import { useNedarimIframe } from "../../../shared/donations/useNedarimIframe";
import type { DonationItem, DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type DonationModalProps = {
    open: boolean;
    initialSelection: DonationSelection;
    donationItems: DonationItem[];
    paymentsEnabled: boolean;
    diagnosticMode?: boolean;
    successPreview?: boolean;
    refCode?: string;
    createIntent?: (
        input: DaycareDonationIntentInput
    ) => Promise<DaycareDonationIntentResponse>;
    onClose: () => void;
    onPaymentComplete?: () => void;
};

type AmountChoice = 1 | 5 | 180 | 360 | 770 | "complete" | "custom";
type DonationStep = 1 | 2 | 3 | 4;
type PaymentMode = "once" | "monthly";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(value);

const DonationModalPreview = ({
    open,
    initialSelection,
    donationItems,
    paymentsEnabled,
    diagnosticMode = false,
    successPreview = false,
    refCode,
    createIntent = createDaycareDonationIntent,
    onClose,
    onPaymentComplete,
}: DonationModalProps) => {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [step, setStep] = useState<DonationStep>(successPreview ? 4 : 1);
    const [selectedId, setSelectedId] = useState(initialSelection.id);
    const [amountChoice, setAmountChoice] = useState<AmountChoice>(
        diagnosticMode ? 1 : 360
    );
    const [customAmount, setCustomAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState<PaymentMode>("once");
    const [installments, setInstallments] = useState(1);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [dedication, setDedication] = useState("");
    const [displayDonorName, setDisplayDonorName] = useState(true);
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
    const isMonthly = paymentMode === "monthly";
    const campaignAmount = isMonthly ? amount * 12 : amount;
    const donorFirstName = fullName.trim().split(/\s+/)[0];
    const campaignShareUrl = `${window.location.origin}/daycare-donations`;
    const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
        `גם אני שותף בהקמת המעון החדש של בית חב״ד יפו. בואו לקחת חלק: ${campaignShareUrl}`
    )}`;

    const amountOptions: { value: AmountChoice; label: string }[] =
        diagnosticMode
            ? [
                  { value: 1, label: "₪1" },
                  { value: 5, label: "₪5" },
                  { value: "custom", label: "סכום אחר (עד ₪10)" },
              ]
            : [
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
            const intent = await createIntent({
                amount,
                paymentType: isMonthly ? "HK" : "Ragil",
                installments: isMonthly ? 12 : installments,
                itemId: selectedId === "general" ? undefined : selectedId,
                donorName: fullName.trim(),
                displayDonorName,
                phone: phone.trim(),
                email: email.trim(),
                dedication: dedication.trim() || undefined,
                refCode: diagnosticMode ? undefined : refCode,
            });
            const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);
            const lastName = lastNameParts.join(" ") || firstName;
            const campaignLabel = diagnosticMode
                ? "עסקת ניסיון — קמפיין המעון"
                : "תרומה — קמפיין המעון";
            const providerComment = [
                campaignLabel,
                `יעד: ${selectedTitle}`,
                isMonthly
                    ? `הו״ק: ₪${formatCurrency(amount)} לחודש ל־12 חודשים`
                    : installments > 1
                      ? `${installments} תשלומים`
                      : "תשלום אחד",
                dedication.trim()
                    ? `הקדשה: ${dedication.trim()}`
                    : "",
            ]
                .filter(Boolean)
                .join(" | ")
                .slice(0, 300);
            setPaymentPayload(
                buildNedarimPayload({
                    Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
                    ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
                    Amount: amount,
                    Tashlumim: isMonthly ? 12 : installments,
                    Currency: "1",
                    Description: diagnosticMode
                        ? `עסקת ניסיון למעון — ${selectedTitle}`
                        : `תרומה למעון — ${selectedTitle}`,
                    Groupe: "קמפיין המעון",
                    firstName,
                    lastName,
                    phone: phone.trim(),
                    email: email.trim(),
                    PaymentType: isMonthly ? "HK" : "Ragil",
                    Comment: providerComment,
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
                : "התרומה הושלמה";

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
            <div
                className={`${styles.donationModal} ${
                    step === 4 ? styles.donationModalSuccess : ""
                }`}
            >
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
                                    {amountOptions
                                        .filter(
                                            (option) =>
                                                (option.value !== "complete" ||
                                                    remaining !== null) &&
                                                (option.value !== "complete" ||
                                                    !isMonthly)
                                        )
                                        .map((option) => (
                                            <button
                                                type="button"
                                                key={String(option.value)}
                                                className={
                                                    amountChoice === option.value
                                                        ? styles.amountActive
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setAmountChoice(option.value)
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
                            {!diagnosticMode && (
                                <fieldset className={styles.paymentTypeFieldset}>
                                    <legend>איך תרצו לתרום?</legend>
                                    <div className={styles.paymentTypeGrid}>
                                        <button
                                            type="button"
                                            className={!isMonthly ? styles.amountActive : ""}
                                            onClick={() => setPaymentMode("once")}
                                        >
                                            תרומה רגילה
                                            <small>בתשלום אחד או בתשלומים</small>
                                        </button>
                                        <button
                                            type="button"
                                            className={isMonthly ? styles.amountActive : ""}
                                            onClick={() => {
                                                setPaymentMode("monthly");
                                                if (amountChoice === "complete") {
                                                    setAmountChoice(360);
                                                }
                                            }}
                                        >
                                            הו״ק ל־12 חודשים
                                            <small>חיוב חודשי קבוע</small>
                                        </button>
                                    </div>
                                    {!isMonthly && (
                                        <label className={styles.installmentsField}>
                                            מספר תשלומים
                                            <select
                                                value={installments}
                                                onChange={(event) =>
                                                    setInstallments(Number(event.target.value))
                                                }
                                            >
                                                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                                                    (count) => (
                                                        <option key={count} value={count}>
                                                            {count === 1
                                                                ? "תשלום אחד"
                                                                : `${count} תשלומים — כ־₪${formatCurrency(
                                                                      Math.ceil(amount / count)
                                                                  )} לתשלום`}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </label>
                                    )}
                                    {isMonthly && (
                                        <p className={styles.paymentPlanNote}>
                                            ₪{formatCurrency(amount)} בחודש למשך 12 חודשים
                                            {amount > 0 && (
                                                <> · סה״כ התחייבות ₪{formatCurrency(campaignAmount)}</>
                                            )}
                                        </p>
                                    )}
                                </fieldset>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className={styles.stepSummary}>
                                <span>התרומה שלכם</span>
                                <strong>
                                    ₪{formatCurrency(amount)}{isMonthly ? " לחודש" : ""}
                                </strong>
                                {isMonthly && (
                                    <small>
                                        12 חודשים · סה״כ ₪{formatCurrency(campaignAmount)}
                                    </small>
                                )}
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
                                {!diagnosticMode && (
                                    <label
                                        className={`${styles.publicNameChoice} ${
                                            displayDonorName
                                                ? styles.publicNameChoiceActive
                                                : ""
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={displayDonorName}
                                            onChange={(event) =>
                                                setDisplayDonorName(event.target.checked)
                                            }
                                        />
                                        <span className={styles.publicNameChoiceIcon}>
                                            {displayDonorName ? (
                                                <Eye aria-hidden="true" />
                                            ) : (
                                                <EyeOff aria-hidden="true" />
                                            )}
                                        </span>
                                        <span className={styles.publicNameChoiceCopy}>
                                            <small className={styles.publicNameChoiceEyebrow}>
                                                פרסום בעמוד הקמפיין
                                            </small>
                                            <strong>
                                                {displayDonorName
                                                    ? "השם, הסכום וההקדשה יוצגו"
                                                    : "התרומה תוצג בעילום שם"}
                                            </strong>
                                            <small>
                                                {displayDonorName
                                                    ? "כבו את המתג לתרומה אנונימית. טלפון ודוא״ל לא יוצגו."
                                                    : "הדליקו את המתג כדי להופיע ברשימת השותפים."}
                                            </small>
                                        </span>
                                        <span className={styles.publicNameSwitch} aria-hidden="true">
                                            <i />
                                        </span>
                                    </label>
                                )}
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
                                <strong>
                                    ₪{formatCurrency(amount)}{isMonthly ? " לחודש" : ""}
                                </strong>
                                {isMonthly && (
                                    <small>
                                        הו״ק ל־12 חודשים · סה״כ ₪{formatCurrency(campaignAmount)}
                                    </small>
                                )}
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
                            <div className={styles.successMark}>
                                <Check aria-hidden="true" />
                            </div>
                            <span className={styles.successEyebrow}>
                                {diagnosticMode
                                    ? "בדיקת החיבור הושלמה"
                                    : "התרומה התקבלה בהצלחה"}
                            </span>
                            <strong className={styles.successTitle}>
                                {diagnosticMode
                                    ? "עסקת הניסיון התקבלה"
                                    : donorFirstName
                                      ? `תודה רבה, ${donorFirstName}`
                                      : "תודה שלקחתם חלק"}
                            </strong>
                            <p>
                                {diagnosticMode
                                    ? "העסקה לא נוספה למדדי הקמפיין. עכשיו בודקים את ה־callback באדמין."
                                    : "תודה שאתם שותפים בהקמת מקום חם, בטוח ושמח לילדי המעון."}
                            </p>
                            {!diagnosticMode && !successPreview && (
                                <div className={styles.successReceipt}>
                                    <span>
                                        {isMonthly
                                            ? "התרומה החודשית שלכם"
                                            : "התרומה שלכם"}
                                    </span>
                                    <strong>
                                        ₪{formatCurrency(amount)}
                                        {isMonthly ? " לחודש" : ""}
                                    </strong>
                                    <small>{selectedTitle}</small>
                                </div>
                            )}
                            {!diagnosticMode && (
                                <div className={styles.successShareCard}>
                                    <div>
                                        <strong>עוזרים לנו להגיע לעוד שותפים</strong>
                                        <span>
                                            שיתוף קטן שלכם יכול לקרב אותנו עוד צעד
                                            לפתיחת המעון.
                                        </span>
                                    </div>
                                    <a
                                        className={styles.paymentShare}
                                        href={whatsappShareUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <MessageCircle aria-hidden="true" />
                                        שיתוף בוואטסאפ
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer
                    className={`${styles.modalFooter} ${
                        step === 4 ? styles.modalFooterSuccess : ""
                    }`}
                >
                    {step < 4 && (
                        <div>
                            <span>{isMonthly ? "חיוב חודשי" : "סכום התרומה"}</span>
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
                            חזרה לקמפיין
                        </button>
                    )}
                    {step < 4 && (
                        <p>
                            התשלום מתבצע בחלון המאובטח של נדרים פלוס. פרטי הכרטיס
                            אינם נשמרים באתר.
                        </p>
                    )}
                </footer>
            </div>
        </dialog>
    );
};

export default DonationModalPreview;
