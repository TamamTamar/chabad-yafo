import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
    downloadAdminAgreementFile,
    getAdminAgreementByOnboarding,
    reviewAdminAgreement,
} from "../../../services/daycareAgreementService";
import {
    downloadAdminDaycareHealthDeclaration,
    getAdminDaycareHealthDeclaration,
    reviewAdminDaycareHealthDeclaration,
} from "../../../services/daycareHealthDeclarationService";
import {
    downloadAdminDaycarePickupAuthorization,
    getAdminDaycarePickupAuthorization,
    reviewAdminDaycarePickupAuthorization,
} from "../../../services/daycarePickupAuthorizationService";
import { getAdminDaycareOnboarding, updateAdminOnboardingStep } from "../../../services/daycareOnboardingService";
import type { AdminAgreementByOnboarding, DaycareCorrectionDisposition } from "../../../types/daycareAgreement";
import type { DaycareHealthDeclarationSubmission } from "../../../types/daycareHealthDeclaration";
import type { AdminDaycareOnboarding } from "../../../types/daycareOnboarding";
import type { DaycarePickupAuthorizationSubmission } from "../../../types/daycarePickupAuthorization";
import { createDraftMap, type StepDraft } from "./daycareOnboardingAdminUtils";

type Props = {
    id?: string;
    onboarding: AdminDaycareOnboarding | null;
    setOnboarding: Dispatch<SetStateAction<AdminDaycareOnboarding | null>>;
    setDrafts: Dispatch<SetStateAction<Record<string, StepDraft>>>;
    setError: Dispatch<SetStateAction<string>>;
    setNotice: Dispatch<SetStateAction<string>>;
};

const useOnboardingDocumentReview = ({
    id, onboarding, setOnboarding, setDrafts, setError, setNotice,
}: Props) => {
const [agreementData, setAgreementData] =
        useState<AdminAgreementByOnboarding | null>(null);
    const [agreementMessage, setAgreementMessage] = useState("");
    const [agreementCorrectionDisposition, setAgreementCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingAgreement, setReviewingAgreement] = useState(false);
const [healthDeclaration, setHealthDeclaration] = useState<DaycareHealthDeclarationSubmission | null>(null);
    const [healthMessage, setHealthMessage] = useState("");
    const [healthCorrectionDisposition, setHealthCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingHealth, setReviewingHealth] = useState(false);
    const [pickupAuthorization, setPickupAuthorization] = useState<DaycarePickupAuthorizationSubmission | null>(null);
    const [pickupMessage, setPickupMessage] = useState("");
    const [pickupCorrectionDisposition, setPickupCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingPickup, setReviewingPickup] = useState(false);
    const [reviewingAllDocuments, setReviewingAllDocuments] = useState(false);

    useEffect(() => {
        if (!id) return;
        void getAdminAgreementByOnboarding(id).then(setAgreementData).catch(() => setAgreementData(null));
        void getAdminDaycareHealthDeclaration(id).then(setHealthDeclaration).catch(() => setHealthDeclaration(null));
        void getAdminDaycarePickupAuthorization(id).then(setPickupAuthorization).catch(() => setPickupAuthorization(null));
    }, [id]);

const handleAgreementReview = async (
        status: "completed" | "requiresCorrection"
    ) => {
        if (!id || !agreementData?.agreement) return;
        setReviewingAgreement(true);
        setError("");
        try {
            await reviewAdminAgreement(
                agreementData.agreement.id,
                status,
                agreementMessage,
                status === "requiresCorrection"
                    ? agreementData.agreement.signingMethod === "uploadedPdf"
                        ? agreementCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedAgreement] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminAgreementByOnboarding(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setAgreementData(updatedAgreement);
            setAgreementMessage("");
            setAgreementCorrectionDisposition("");
            setNotice(
                status === "completed"
                    ? "ההסכם אושר והשלב הושלם."
                    : "ההסכם הוחזר לתיקון וההודעה מוצגת להורה."
            );
        } catch {
            setError("לא הצלחנו לעדכן את בדיקת ההסכם");
        } finally {
            setReviewingAgreement(false);
        }
    };

const handleAgreementDownload = async (kind: "signature" | "signedPdf") => {
        if (!agreementData?.agreement) return;
        setError("");
        try {
            const blob = await downloadAdminAgreementFile(
                agreementData.agreement.id,
                kind
            );
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = kind === "signature" ? "חתימה.png" : "הסכם-חתום.pdf";
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch {
            setError("לא הצלחנו להוריד את קובץ ההסכם");
        }
    };

    const handleHealthReview = async (status: "completed" | "requiresCorrection") => {
        if (!id || !healthDeclaration) return;
        setReviewingHealth(true); setError("");
        try {
            await reviewAdminDaycareHealthDeclaration(
                healthDeclaration.id,
                status,
                healthMessage,
                status === "requiresCorrection"
                    ? healthDeclaration.signingMethod === "uploadedFile"
                        ? healthCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedHealth] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminDaycareHealthDeclaration(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setHealthDeclaration(updatedHealth);
            setHealthMessage("");
            setHealthCorrectionDisposition("");
            setNotice(status === "completed" ? "הצהרת הבריאות אושרה." : "הצהרת הבריאות הוחזרה לתיקון.");
        } catch {
            setError("לא הצלחנו לעדכן את בדיקת הצהרת הבריאות");
        } finally { setReviewingHealth(false); }
    };

    const handleHealthDownload = async () => {
        if (!healthDeclaration) return;
        setError("");
        try {
            const blob = await downloadAdminDaycareHealthDeclaration(healthDeclaration.id);
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "הצהרת-בריאות-חתומה.pdf";
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch { setError("לא הצלחנו להוריד את הצהרת הבריאות"); }
    };

    const handlePickupReview = async (status: "completed" | "requiresCorrection") => {
        if (!id || !pickupAuthorization) return;
        setReviewingPickup(true); setError("");
        try {
            await reviewAdminDaycarePickupAuthorization(
                pickupAuthorization.id,
                status,
                pickupMessage,
                status === "requiresCorrection"
                    ? pickupAuthorization.signingMethod === "uploadedFile"
                        ? pickupCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedPickup] = await Promise.all([getAdminDaycareOnboarding(id), getAdminDaycarePickupAuthorization(id)]);
            setOnboarding(updatedOnboarding); setDrafts(createDraftMap(updatedOnboarding.steps)); setPickupAuthorization(updatedPickup); setPickupMessage(""); setPickupCorrectionDisposition("");
            setNotice(status === "completed" ? "מורשי האיסוף אושרו." : "מורשי האיסוף הוחזרו לתיקון.");
        } catch { setError("לא הצלחנו לעדכן את בדיקת מורשי האיסוף"); }
        finally { setReviewingPickup(false); }
    };

    const handlePickupDownload = async () => {
        if (!pickupAuthorization) return; setError("");
        try { const blob = await downloadAdminDaycarePickupAuthorization(pickupAuthorization.id); const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = "מורשי-איסוף-חתום.pdf"; anchor.click(); URL.revokeObjectURL(objectUrl); }
        catch { setError("לא הצלחנו להוריד את מורשי האיסוף"); }
    };

    const handleApproveAllDocuments = async () => {
        if (!id || !agreementData?.agreement || !healthDeclaration || !pickupAuthorization) return;
        setReviewingAllDocuments(true);
        setError("");
        setNotice("");
        try {
            const profileStep = onboarding?.steps.find(
                (step) => step.key === "childAndGuardianDetails"
            );
            if (profileStep?.status !== "completed" && profileStep?.status !== "notRequired") {
                await updateAdminOnboardingStep(id, "childAndGuardianDetails", {
                    status: "completed",
                });
            }
            if (agreementData.agreement.status !== "completed") {
                await reviewAdminAgreement(agreementData.agreement.id, "completed");
            }
            if (healthDeclaration.status !== "completed") {
                await reviewAdminDaycareHealthDeclaration(
                    healthDeclaration.id,
                    "completed",
                    ""
                );
            }
            if (pickupAuthorization.status !== "completed") {
                await reviewAdminDaycarePickupAuthorization(
                    pickupAuthorization.id,
                    "completed",
                    ""
                );
            }

            const [updatedOnboarding, updatedAgreement, updatedHealth, updatedPickup] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminAgreementByOnboarding(id),
                getAdminDaycareHealthDeclaration(id),
                getAdminDaycarePickupAuthorization(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setAgreementData(updatedAgreement);
            setHealthDeclaration(updatedHealth);
            setPickupAuthorization(updatedPickup);
            setNotice("כל הפרטים והמסמכים אושרו. התיק ממתין כעת להסדרת תשלום.");
        } catch {
            setError("לא הצלחנו לאשר את כל הפרטים והמסמכים");
        } finally {
            setReviewingAllDocuments(false);
        }
    };

    return {
        agreementData, agreementMessage, setAgreementMessage, agreementCorrectionDisposition,
        setAgreementCorrectionDisposition, reviewingAgreement, handleAgreementReview,
        handleAgreementDownload, healthDeclaration, healthMessage, setHealthMessage,
        healthCorrectionDisposition, setHealthCorrectionDisposition, reviewingHealth,
        handleHealthReview, handleHealthDownload, pickupAuthorization, pickupMessage,
        setPickupMessage, pickupCorrectionDisposition, setPickupCorrectionDisposition,
        reviewingPickup, handlePickupReview, handlePickupDownload, reviewingAllDocuments,
        handleApproveAllDocuments,
    };
};

export default useOnboardingDocumentReview;
