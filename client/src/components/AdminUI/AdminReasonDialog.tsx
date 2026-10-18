import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { AdminButton, AdminTextarea } from './AdminPrimitives';
import AdminDialog from './AdminDialog';
import styles from './AdminEditor.module.scss';

export default function AdminReasonDialog({ title, message, busy = false, confirmLabel = 'שמירת השינוי', onConfirm, onClose }: {
    title: string; message: ReactNode; busy?: boolean; confirmLabel?: string;
    onConfirm: (reason: string) => void; onClose: () => void;
}) {
    const id = useId();
    const [reason, setReason] = useState('');
    const submit = (event: FormEvent) => { event.preventDefault(); if (!busy && reason.trim()) onConfirm(reason.trim()); };
    return <AdminDialog labelledBy={id} onClose={onClose}>
        <form className={styles.dialogContent} onSubmit={submit}>
            <h2 id={id} className={styles.title}>{title}</h2>
            <div className={styles.intro}>{message}</div>
            <label>סיבת השינוי<AdminTextarea data-dialog-initial-focus required rows={3} value={reason} disabled={busy}
                placeholder="כתבו סיבה שתישמר בהיסטוריית הפעולות" onChange={event => setReason(event.target.value)} /></label>
            <div className={styles.actions}>
                <AdminButton variant="primary" type="submit" disabled={busy || !reason.trim()}>{busy ? 'שומר...' : confirmLabel}</AdminButton>
                <AdminButton disabled={busy} onClick={onClose}>ביטול</AdminButton>
            </div>
        </form>
    </AdminDialog>;
}
