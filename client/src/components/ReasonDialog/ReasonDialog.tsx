import { useState, type FormEvent, type ReactNode } from "react";
import BaseDialog from "../BaseDialog/BaseDialog";
import dialogStyles from "../BaseDialog/BaseDialog.module.scss";
import styles from "./ReasonDialog.module.scss";

type ReasonDialogProps = {
    title: string;
    message: ReactNode;
    busy?: boolean;
    confirmLabel?: string;
    onConfirm: (reason: string) => void;
    onClose: () => void;
};

const ReasonDialog = ({
    title,
    message,
    busy = false,
    confirmLabel = "שמירת השינוי",
    onConfirm,
    onClose,
}: ReasonDialogProps) => {
    const [reason, setReason] = useState("");
    const trimmedReason = reason.trim();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!trimmedReason || busy) return;
        onConfirm(trimmedReason);
    };

    return (
        <BaseDialog open title={title} onClose={onClose}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={dialogStyles.text}>{message}</div>
                <label className={styles.field}>
                    <span>סיבת השינוי</span>
                    <textarea
                        autoFocus
                        required
                        rows={3}
                        value={reason}
                        disabled={busy}
                        placeholder="כתבו סיבה שתישמר בהיסטוריית הפעולות"
                        onChange={(event) => setReason(event.target.value)}
                    />
                </label>
                <div className={dialogStyles.actions}>
                    <button
                        type="submit"
                        className={dialogStyles.cta}
                        disabled={busy || !trimmedReason}
                    >
                        {busy ? "שומר..." : confirmLabel}
                    </button>
                    <button
                        type="button"
                        className={dialogStyles.ghost}
                        disabled={busy}
                        onClick={onClose}
                    >
                        ביטול
                    </button>
                </div>
            </form>
        </BaseDialog>
    );
};

export default ReasonDialog;
