import axios from "axios";
import { CheckCircle2, CreditCard, LockKeyhole } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { createDaycarePaymentIntent } from "../../../services/daycareOnboardingService";
import { buildNedarimPayload } from "../../../shared/donations/nedarimPayload";
import { useNedarimIframe } from "../../../shared/donations/useNedarimIframe";
import type { PublicDaycareOnboarding } from "../../../types/daycareOnboarding";
import styles from "../DaycareOnboarding.module.scss";

type Props = {
    token: string;
    payment: NonNullable<PublicDaycareOnboarding["tuitionPayment"]>;
    onConfirmed: () => Promise<void>;
};

const formatAmount = (amount: number) =>
    new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 }).format(amount);

const TuitionPaymentSection = ({ token, payment, onConfirmed }: Props) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [opened, setOpened] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
    const [prepareError, setPrepareError] = useState("");
    const handleProviderSuccess = useCallback(() => {
        void onConfirmed();
    }, [onConfirmed]);
    const iframePayment = useNedarimIframe({
        enabled: opened,
        iframeRef,
        onSuccess: handleProviderSuccess,
        successDelay: 4000,
    });

    const active = payment.status === "active";
    const amountLabel = useMemo(() => formatAmount(payment.amount), [payment.amount]);

    const prepare = async () => {
        setPrepareError("");
        if (!import.meta.env.VITE_NEDARIM_MOSAD || !import.meta.env.VITE_NEDARIM_API_VALID) {
            setPrepareError("שירות התשלום אינו מוגדר כרגע. פנו לצוות המעון.");
            return;
        }
        setPreparing(true);
        try {
            const intent = await createDaycarePaymentIntent(token);
            const [firstName = "", ...lastNameParts] = intent.payer.name.split(/\s+/);
            setPayload(buildNedarimPayload({
                Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
                ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
                Amount: intent.amount,
                Tashlumim: 12,
                Currency: "1",
                Description: `הוראת קבע למעון חב״ד יפו — ${intent.childName}`,
                Groupe: "תשלומי מעון",
                firstName,
                lastName: lastNameParts.join(" "),
                phone: intent.payer.phone,
                email: intent.payer.email,
                PaymentType: "HK",
                Comment: `שכר לימוד חודשי עבור ${intent.childName} — 12 תשלומים`,
                CallBack: intent.callbackUrl,
                Param1: intent.param1,
                Param2: intent.param2,
            }));
            setOpened(true);
        } catch (error) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            setPrepareError(message || "לא הצלחנו להכין את התשלום. נסו שוב.");
        } finally {
            setPreparing(false);
        }
    };

    return (
        <section className={`${styles.tuitionCard} ${active ? styles.tuitionPaid : ""}`} aria-labelledby="tuition-title">
            <div className={styles.tuitionIcon} aria-hidden="true">
                {active ? <CheckCircle2 /> : <CreditCard />}
            </div>
            <div className={styles.tuitionHeader}>
                <span className={styles.tuitionEyebrow}>{active ? "הוראת הקבע פעילה" : "תשלום חודשי קבוע"}</span>
                <h2 id="tuition-title">הוראת קבע למעון חב״ד יפו</h2>
                <p>עבור: <strong>{payment.childName}</strong></p>
                <p>מסלול: <strong>12 חיובים חודשיים</strong></p>
            </div>
            <div className={styles.tuitionAmount}>
                <span>חיוב חודשי</span>
                <strong>₪{formatAmount(payment.amount)}</strong>
            </div>
            {!active && !opened ? (
                <button className={styles.securePaymentButton} type="button" disabled={preparing} onClick={() => void prepare()}>
                    <LockKeyhole size={19} aria-hidden="true" />
                    {preparing ? "מכינים הוראת קבע..." : "להקמת הוראת קבע מאובטחת"}
                </button>
            ) : null}
            {!active && opened ? (
                <div className={styles.paymentFrameArea}>
                    <div className={styles.paymentFrameWrap}>
                        {!iframePayment.isReady ? <p>טוענים חלון תשלום מאובטח...</p> : null}
                        <iframe
                            ref={iframeRef}
                            title="תשלום מאובטח למעון בנדרים פלוס"
                            src="https://www.matara.pro/nedarimplus/iframe?language=he"
                            scrolling="no"
                        />
                    </div>
                    <button
                        className={styles.securePaymentButton}
                        type="button"
                        disabled={!iframePayment.isReady || iframePayment.isPaying || !payload}
                        onClick={() => payload && iframePayment.startPayment(payload)}
                    >
                        <LockKeyhole size={19} aria-hidden="true" />
                        {iframePayment.isPaying ? "מקימים הוראת קבע..." : `הקמת הוראת קבע — ₪${amountLabel} לחודש`}
                    </button>
                </div>
            ) : null}
            {prepareError || iframePayment.errorText ? (
                <p className={styles.profileError} role="alert">{prepareError || iframePayment.errorText}</p>
            ) : null}
            {iframePayment.ok && !active ? (
                <p className={styles.profileSuccess} role="status">הוראת הקבע נקלטה. ממתינים לאישור השרת...</p>
            ) : null}
            <small className={styles.tuitionSecurityNote}>הסכום החודשי נקבע על ידי הנהלת המעון. ההקמה מתבצעת פעם אחת בלבד.</small>
        </section>
    );
};

export default TuitionPaymentSection;
