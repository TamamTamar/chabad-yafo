import type { UseFormRegister } from "react-hook-form";

import type { DonationFormValues, DonationType } from "../DonationForm";
import styles from "./DonationTypeToggle.module.scss";

type DonationTypeToggleProps = {
    donationType: DonationType;
    onSelectDonationType: (type: DonationType) => void;
    register: UseFormRegister<DonationFormValues>;
};

const DonationTypeToggle = ({
    donationType,
    onSelectDonationType,
    register,
}: DonationTypeToggleProps) => (
    <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>סוג התרומה</legend>

        <div className={styles.typeToggle}>
            <button
                type="button"
                className={
                    donationType === "once" ? styles.typeActive : styles.typeButton
                }
                onClick={() => onSelectDonationType("once")}
            >
                חד־פעמי
            </button>

            <button
                type="button"
                className={
                    donationType === "monthly"
                        ? styles.typeActive
                        : styles.typeButton
                }
                onClick={() => onSelectDonationType("monthly")}
            >
                הו״ק ל־12 חודשים
            </button>
        </div>

        <input
            type="hidden"
            {...register("donationType", {
                required: "נא לבחור סוג תרומה",
            })}
        />
    </fieldset>
);

export default DonationTypeToggle;
