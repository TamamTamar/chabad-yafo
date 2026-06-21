import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import styles from "./SurveyForm.module.scss";
import type { FormValues } from "../../../../types/family";
import { createFamily } from "../../../../services/familyService";
import SuccessModal from "./SuccessModal/SuccessModal";
import { ages, interests } from "../../data";
import CommunityBox from "../CommunityBox/CommunityBox";
import SurveyAdditionalFields from "./SurveyAdditionalFields";
import SurveyCheckboxGroup from "./SurveyCheckboxGroup";
import SurveyContactFields from "./SurveyContactFields";

const SurveyForm = () => {
    const [isSuccess, setIsSuccess] = useState(false);

    const closeModal = () => {
        setIsSuccess(false);
    };

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onChange",
        reValidateMode: "onChange",

        defaultValues: {
            ages: [],
            interests: [],
            updates: true,
        },
    });

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            await createFamily(data);

            reset();
            setIsSuccess(true);

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error: any) {
            if (error?.response?.status === 409) {
                setError("phone", {
                    type: "server",
                    message: "הטלפון הזה כבר רשום במערכת",
                });

                const phoneInput = document.getElementById("phone");

                phoneInput?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });

                (phoneInput as HTMLInputElement)?.focus();

                return;
            }

            console.error("Failed to submit form:", error);
        }
    };

    return (
        <section className={styles.formSection} id="form">
            {isSuccess && <SuccessModal onClose={closeModal} />}
            <div className={styles.formBox}>
                <h2 className={styles.formTitle}>ספרו לנו על המשפחה שלכם 💛</h2>

                <p className={styles.formIntro}>
                    כמה פרטים קצרים שיעזרו לנו לבנות פעילות מתאימה למשפחות ביפו.
                </p>



                <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                    <SurveyContactFields errors={errors} register={register} />

                    <SurveyCheckboxGroup
                        error={errors.ages}
                        fieldName="ages"
                        options={ages}
                        register={register}
                        title="באיזה גילאים הילדים?"
                        validationMessage="בחרו לפחות קבוצת גיל אחת"
                    />

                    <SurveyCheckboxGroup
                        error={errors.interests}
                        fieldName="interests"
                        options={interests}
                        register={register}
                        title="איזה פעילויות מעניינות אתכם?"
                        validationMessage="בחרו לפחות תחום עניין אחד"
                    />

                    <SurveyAdditionalFields
                        errors={errors}
                        isSubmitting={isSubmitting}
                        register={register}
                    />
                </form>
            </div>

            <CommunityBox />
        </section>
    );
};

export default SurveyForm;
