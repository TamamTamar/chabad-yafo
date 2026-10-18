import shared from "../../../../components/AdminUI/AdminPrimitives.module.scss";
import localStyles from "./DaycareTasks.module.scss";
const styles: Record<string, string> = { ...localStyles,
    section: [localStyles.section, shared.surface, shared.fields].filter(Boolean).join(' '),
    primaryButton: [localStyles.primaryButton, shared.primary].filter(Boolean).join(' '),
    secondaryButton: [localStyles.secondaryButton, shared.secondary].filter(Boolean).join(' '),
    linkButton: [localStyles.linkButton, shared.navigation].filter(Boolean).join(' '),
    taskEditorClose: [localStyles.taskEditorClose, shared.navigation].filter(Boolean).join(' '),
    dangerButton: [localStyles.dangerButton, shared.danger].filter(Boolean).join(' '),
    quickFilterButton: [localStyles.quickFilterButton, shared.navigation].filter(Boolean).join(' '),
    quickFilterActive: [localStyles.quickFilterActive, shared.navigation].filter(Boolean).join(' '),
    lockedStatus: [localStyles.lockedStatus, shared.badge].filter(Boolean).join(' '),
    priorityPill: [localStyles.priorityPill, shared.badge].filter(Boolean).join(' '),
    taskEditor: [localStyles.taskEditor, shared.fields].filter(Boolean).join(' '),
    statusBadge: [localStyles.statusBadge, shared.badge].filter(Boolean).join(' '),
    actionPopover: [localStyles.actionPopover, shared.surface].filter(Boolean).join(' '),
};
export default styles;
