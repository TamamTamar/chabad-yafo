import { useState, type ReactNode } from "react";
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
    confirmationPhrase?: string;
    confirmationLabel?: string;
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
    confirmationPhrase,
    confirmationLabel,
    onConfirm,
    onClose,
}: ConfirmDialogProps) => {
    const [confirmationValue, setConfirmationValue] = useState("");

    const confirmationMatches =
        !confirmationPhrase || confirmationValue === confirmationPhrase;
    const closeDialog = () => {
        setConfirmationValue("");
        onClose();
    };

    return (
        <BaseDialog open={open} title={title} onClose={closeDialog}>
            <div className={dialogStyles.text}>{message}</div>
            {confirmationPhrase ? (
                <label className={styles.confirmationField}>
                    <span>
                        {confirmationLabel ?? `כדי להמשיך, יש להקליד: ${confirmationPhrase}`}
                    </span>
                    <input
                        autoComplete="off"
                        value={confirmationValue}
                        onChange={(event) => setConfirmationValue(event.target.value)}
                    />
                </label>
            ) : null}
            <div className={dialogStyles.actions}>
                <button
                    type="button"
                    className={`${dialogStyles.cta} ${styles.button} ${tone === "danger" ? styles.danger : ""}`}
                    disabled={busy || !confirmationMatches}
                    onClick={onConfirm}
                >
                    {busy ? "מבצע..." : confirmLabel}
                </button>
                <button
                    type="button"
                    className={`${dialogStyles.ghost} ${styles.button}`}
                    disabled={busy}
                    onClick={closeDialog}
                >
                    {cancelLabel}
                </button>
            </div>
        </BaseDialog>
    );
};

export default ConfirmDialog;
