import type { ReactNode } from "react";
import BaseDialog from "../BaseDialog/BaseDialog";
import dialogStyles from "../BaseDialog/BaseDialog.module.scss";
import styles from "./ConfirmDialog.module.scss";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: "default" | "danger";
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
};

const ConfirmDialog = ({
    open,
    title,
    message,
    confirmLabel = "אישור",
    cancelLabel = "ביטול",
    tone = "default",
    busy = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) => (
    <BaseDialog open={open} title={title} onClose={onClose}>
        <div className={dialogStyles.text}>{message}</div>
        <div className={dialogStyles.actions}>
            <button
                type="button"
                className={`${dialogStyles.cta} ${styles.button} ${tone === "danger" ? styles.danger : ""}`}
                disabled={busy}
                onClick={onConfirm}
            >
                {busy ? "מבצע..." : confirmLabel}
            </button>
            <button
                type="button"
                className={`${dialogStyles.ghost} ${styles.button}`}
                disabled={busy}
                onClick={onClose}
            >
                {cancelLabel}
            </button>
        </div>
    </BaseDialog>
);

export default ConfirmDialog;
