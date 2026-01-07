import { useEffect, useRef } from "react";
import styles from "./BaseDialog.module.scss";

type BaseDialogProps = {
    open: boolean;
    title?: string;
    children: React.ReactNode;
    onClose: () => void;
    className?: string;
    maxWidth?: number; // optional, default 520
};

const BaseDialog = ({
    open,
    title,
    children,
    onClose,
    className,
    maxWidth = 520,
}: BaseDialogProps) => {
    const ref = useRef<HTMLDialogElement | null>(null);

    // Sync prop -> native dialog open state
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;

        if (open && !dialog.open) {
            dialog.showModal();
            return;
        }

        if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className={`${styles.dialog} ${className ?? ""}`}
            // ESC
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
            // Backdrop click
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            // If user closes the dialog via native close(), sync outward
            onClose={onClose}
        >
            <div className={styles.card} style={{ maxWidth }}>
                <div className={styles.header}>
                    {title ? <h3 className={styles.title}>{title}</h3> : <span />}
                   
                </div>

                <div className={styles.body}>{children}</div>
            </div>
        </dialog>
    );
};

export default BaseDialog;
