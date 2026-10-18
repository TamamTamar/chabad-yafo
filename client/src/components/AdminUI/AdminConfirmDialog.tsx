import { useId, type ReactNode } from 'react';
import AdminDialog from './AdminDialog';
import { AdminButton } from './AdminPrimitives';
import styles from './AdminEditor.module.scss';

// Confirmation semantics shared by document editors; no additional workflow.
export default function AdminConfirmDialog({ open, title, message, confirmLabel = 'אישור', tone = 'default', busy = false, onConfirm, onClose }: {
    open: boolean; title: string; message: ReactNode; confirmLabel?: string;
    tone?: 'default' | 'danger'; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
    const titleId = useId();
    if (!open) return null;
    return <AdminDialog labelledBy={titleId} onClose={() => { if (!busy) onClose(); }}>
        <div className={styles.dialogContent}><h2 id={titleId} className={styles.title}>{title}</h2>
        <p className={styles.intro}>{message}</p>
        <div className={styles.actions}>
            <AdminButton variant={tone === 'danger' ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>{busy ? 'מבצע...' : confirmLabel}</AdminButton>
            <AdminButton data-dialog-initial-focus disabled={busy} onClick={onClose}>ביטול</AdminButton>
        </div>
    </div></AdminDialog>;
}
