import shared from "../../../../components/AdminUI/AdminPrimitives.module.scss";
import localStyles from "./DaycareRegistrations.module.scss";
const styles: Record<string, string> = { ...localStyles,
    registrationDesign: [localStyles.registrationDesign, shared.fields].filter(Boolean).join(' '),
    primaryButton: [localStyles.primaryButton, shared.primary].filter(Boolean).join(' '),
    secondaryButton: [localStyles.secondaryButton, shared.secondary].filter(Boolean).join(' '),
    registrationQuickButton: [localStyles.registrationQuickButton, shared.navigation].filter(Boolean).join(' '),
    registrationDetailsToggle: [localStyles.registrationDetailsToggle, shared.navigation].filter(Boolean).join(' '),
    callSummaryToggle: [localStyles.callSummaryToggle, shared.navigation].filter(Boolean).join(' '),
    modalCloseButton: [localStyles.modalCloseButton, shared.navigation].filter(Boolean).join(' '),
};
export default styles;
