import type { UseFormRegister, UseFormSetValue } from "react-hook-form";

import type { DonationFormValues } from "../DonationForm";
import styles from "./PaymentsSelect.module.scss";

type PaymentsSelectProps = {
    amount: string;
    payments: string;
    register: UseFormRegister<DonationFormValues>;
    setValue: UseFormSetValue<DonationFormValues>;
};

const PaymentsSelect = ({
    amount,
    payments,
    register,
    setValue,
}: PaymentsSelectProps) => (
    <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>מספר תשלומים</legend>

        <select
            id="payments"
            className={styles.input}
            value={payments}
            {...register("payments", {
                required: "נא לבחור מספר תשלומים",
            })}
            onChange={(event) =>
                setValue("payments", event.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                })
            }
        >
            {Array.from({ length: 12 }, (_, index) => {
                const paymentsCount = index + 1;
                const totalAmount = Number(amount) || 0;
                const paymentAmount = totalAmount / paymentsCount;

                return (
                    <option key={paymentsCount} value={String(paymentsCount)}>
                        {paymentsCount === 1
                            ? `תשלום אחד - ₪${paymentAmount.toLocaleString()}`
                            : `${paymentsCount} תשלומים - ₪${paymentAmount.toLocaleString()} כל חודש`}
                    </option>
                );
            })}
        </select>
    </fieldset>
);

export default PaymentsSelect;
