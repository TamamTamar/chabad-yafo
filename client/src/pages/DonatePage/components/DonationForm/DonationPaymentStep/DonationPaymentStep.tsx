import type { RefObject } from "react";
import { useEffect, useState } from "react";
import type { PaymentData } from "../../../../../types/chabad";
import styles from "./DonationPaymentStep.module.scss";
import { logger } from "../../../../../utils/logger";

type DonationPaymentStepProps = {
    iframeRef: RefObject<HTMLIFrameElement | null>;
    paymentData: PaymentData;
    onBack: () => void;
    onPaymentSuccess: () => void;
};

const DonationPaymentStep = ({
    iframeRef,
    paymentData,
    onBack,
    onPaymentSuccess,
}: DonationPaymentStepProps) => {
    const [isFrameLoading, setIsFrameLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const postNedarim = (data: object) => {
        iframeRef.current?.contentWindow?.postMessage(data, "*");
    };

    const handlePayment = () => {
        if (
            !paymentData.Amount ||
            !paymentData.FirstName ||
            !paymentData.LastName ||
            !paymentData.Phone ||
            !paymentData.Mail
        ) {
            setErrorMessage("חסרים פרטים לביצוע התשלום");
            return;
        }

        setIsPaying(true);
        setErrorMessage("");

        logger.log("Sending to Nedarim:", paymentData);

        postNedarim({
            Name: "FinishTransaction2",
            Value: paymentData,
        });
    };

    const handleIframeLoad = () => {
        postNedarim({ Name: "GetHeight" });
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {

            logger.log("Nedarim message:", event.data);
            if (!event.data?.Name) return;

            if (event.data.Name === "Height") {
                const height = parseInt(event.data.Value, 10);

                if (iframeRef.current && !Number.isNaN(height)) {
                    iframeRef.current.style.height = `${height + 15}px`;
                }

                setIsFrameLoading(false);
            }

            if (event.data.Name === "TransactionResponse") {
                setIsPaying(false);

                if (event.data.Value?.Status === "Error") {
                    setErrorMessage(
                        event.data.Value?.Message || "אירעה שגיאה בביצוע התשלום"
                    );
                    return;
                }

                onPaymentSuccess();
            }
        };

        window.addEventListener("message", handleMessage);

        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [iframeRef, onPaymentSuccess]);

    return (
        <section className={styles.stepContent}>
            <header className={styles.paymentHeader}>
                <p className={styles.eyebrow}>תשלום</p>

                <h2 className={styles.paymentTitle}>תשלום מאובטח</h2>

                <p className={styles.paymentDescription}>
                    מלאו את פרטי האשראי בחלון המאובטח של נדרים פלוס.
                    בסיום התשלום הקבלה תישלח אליכם למייל.
                </p>
            </header>

            <section
                className={styles.paymentFrame}
                aria-label="חלון תשלום מאובטח"
            >
                {isFrameLoading && (
                    <p className={styles.frameLoader}>טוען חלון תשלום...</p>
                )}

                <iframe
                    ref={iframeRef}
                    title="תרומה מאובטחת בנדרים פלוס"
                    src="https://www.matara.pro/nedarimplus/iframe?language=he"
                    className={styles.iframe}
                    scrolling="no"
                    onLoad={handleIframeLoad}
                />
            </section>

            {errorMessage && (
                <p className={styles.errorMessage}>{errorMessage}</p>
            )}


            {isPaying && (
                <p className={styles.loadingMessage}>מעבד תשלום...</p>
            )}

            <footer className={styles.stepActions}>
                <button
                    type="button"
                    className={styles.backButton}
                    onClick={onBack}
                    disabled={isPaying}
                >
                    חזרה לפרטים
                </button>

                <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handlePayment}
                    disabled={isPaying}
                >
                    {isPaying ? "מעבד..." : "ביצוע תרומה מאובטחת"}
                </button>
            </footer>
        </section>
    );
};

export default DonationPaymentStep;