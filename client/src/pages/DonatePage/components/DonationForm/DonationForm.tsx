import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import Container from "../../../../components/Container/Container";
import {
    trackDonationComplete,
    trackDonationPaymentStart,
    trackDonationStart,
} from "../../../../services/googleAnalyticsService";
import { getNedarimCallbackUrl } from "../../../../shared/donations/nedarimPayload";
import DonationSummary from "../DonationSummary/DonationSummary";
import DonationAmountStep from "./DonationAmountStep/DonationAmountStep";
import DonationDetailsStep from "./DonationDetailsStep/DonationDetailsStep";
import DonationPaymentStep from "./DonationPaymentStep/DonationPaymentStep";

import type { PaymentData } from "../../../../types/chabad";

import styles from "./DonationForm.module.scss";
import DonationSuccessStep from "./DonationSuccessStep/DonationSuccessStep";

export type DonationType = "once" | "monthly";
export type DonationStep = 1 | 2 | 3 | 4;

export type DonationFormValues = {
    amount: string;
    donationType: DonationType;
    payments: string;
    fullName: string;
    phone: string;
    email: string;
    dedication: string;
};

const DonationForm = () => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const [step, setStep] = useState<DonationStep>(1);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

    const {
        control,
        register,
        handleSubmit,
        setValue,
        trigger,
        getValues,
        formState: { errors },
    } = useForm<DonationFormValues>({
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            amount: "180",
            donationType: "monthly",
            payments: "1",
            fullName: "",
            phone: "",
            email: "",
            dedication: "",
        },
    });

    const stepTitle =
        step === 1
            ? "בחרו את סכום התרומה"
            : step === 2
                ? "כמה פרטים אחרונים"
                : step === 3
                    ? "תשלום מאובטח"
                    : "התרומה התקבלה";

    const [amount, donationType, payments] = useWatch({
        control,
        name: ["amount", "donationType", "payments"],
    });

    const amountNumber = useMemo(() => Number(amount) || 0, [amount]);
    const isMonthly = donationType === "monthly";


    const buildPaymentData = (data: DonationFormValues): PaymentData => {
        const cleanFullName = data.fullName.trim();
        const [firstName = "", ...lastNameParts] = cleanFullName.split(" ");
        const lastName = lastNameParts.join(" ") || firstName;

        const amountValue = Number(data.amount) || 0;
        const paymentsValue = Number(data.payments) || 1;
        const isHK = data.donationType === "monthly";

        return {
            Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
            ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
            Zeout: "",
            FirstName: firstName,
            LastName: lastName,
            Street: "",
            City: "",
            Phone: data.phone,
            Mail: data.email,
            PaymentType: isHK ? "HK" : "Ragil",
            Amount: amountValue,
            Tashlumim: isHK ? 12 : paymentsValue,
            Currency: 1,
            Groupe: "",
            Comment: data.dedication || "",
            CallBack: getNedarimCallbackUrl(),
            CallBackMailError: "lchabadyaffo@gmail.com",
        };
    };

    const goToDetails = async () => {
        const isValid = await trigger(["amount", "donationType", "payments"]);

        if (!isValid) return;

        trackDonationStart({
            value: amountNumber,
            currency: "ILS",
            donation_type: donationType,
        });
        setStep(2);
    };

    const goToPayment = async () => {
        const isValid = await trigger(["fullName", "phone", "email"]);

        if (!isValid) return;

        const data = getValues();
        const nextPaymentData = buildPaymentData(data);


        setPaymentData(nextPaymentData);
        trackDonationPaymentStart({
            value: Number(data.amount) || 0,
            currency: "ILS",
            donation_type: data.donationType,
            payments: Number(data.payments) || 1,
        });
        setStep(3);
    };

    useEffect(() => {
        if (step !== 3) return;

        const scrollTimer = window.setTimeout(() => {
            iframeRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 150);

        return () => window.clearTimeout(scrollTimer);
    }, [step]);

    const onSubmit = () => {
        if (step === 1) {
            goToDetails();
            return;
        }

        if (step === 2) {
            goToPayment();
        }
    };

    return (
        <section className={styles.section} id="donate-form">
            <Container>
                <div className={styles.grid}>
                    <article className={styles.formCard}>
                        <div className={styles.formInner}>
                            <header className={styles.header}>
                                <p className={styles.eyebrow}>
                                    תרומה מאובטחת
                                </p>

                                <h2 className={styles.title}>
                                    {stepTitle}
                                </h2>

                                <p className={styles.description}>
                                    כמה רגעים ואתם שותפים בהפצת אור, חסד ויהדות בלב יפו.
                                </p>
                            </header>

                            <div className={styles.steps} aria-label="שלבי התרומה">
                                <span className={step === 1 ? styles.stepActive : styles.step}>
                                    סכום
                                </span>

                                <span className={styles.stepLine} aria-hidden="true" />

                                <span className={step === 2 ? styles.stepActive : styles.step}>
                                    פרטים
                                </span>

                                <span className={styles.stepLine} aria-hidden="true" />

                                <span className={step === 3 ? styles.stepActive : styles.step}>
                                    תשלום
                                </span>
                            </div>

                            <form
                                className={styles.form}
                                onSubmit={handleSubmit(onSubmit)}
                            >
                                {step === 1 && (
                                    <DonationAmountStep
                                        register={register}
                                        setValue={setValue}
                                        amount={amount}
                                        donationType={donationType}
                                        payments={payments}
                                        errors={errors}
                                        onNext={goToDetails}
                                    />
                                )}

                                {step === 2 && (
                                    <DonationDetailsStep
                                        register={register}
                                        errors={errors}
                                        onBack={() => setStep(1)}
                                        onNext={goToPayment}
                                    />
                                )}

                                {step === 3 && paymentData && (
                                    <DonationPaymentStep
                                        iframeRef={iframeRef}
                                        paymentData={paymentData}
                                        onBack={() => setStep(2)}
                                        onPaymentSuccess={() => {
                                            trackDonationComplete({
                                                value: Number(amount) || 0,
                                                currency: "ILS",
                                                donation_type: donationType,
                                            });
                                            setStep(4);
                                        }}
                                    />
                                )}
                                {step === 4 && <DonationSuccessStep
                                    amount={Number(amount)}
                                    monthly={donationType === "monthly"}
                                />}
                            </form>
                        </div>
                    </article>

                    <aside className={styles.summarySide}>
                        <DonationSummary
                            amount={amountNumber}
                            monthly={isMonthly}
                        />
                    </aside>
                </div>
            </Container>
        </section>
    );
};

export default DonationForm;
