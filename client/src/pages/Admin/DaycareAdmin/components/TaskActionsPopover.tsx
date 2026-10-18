import { useId, useRef, useState } from 'react';
import { Ellipsis, Trash2 } from 'lucide-react';
import styles from "./DaycareTasks.styles";

export default function TaskActionsPopover({ title, onDelete }: { title: string; onDelete: () => void }) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    return <>
        <button ref={trigger} type="button" className={`${styles.linkButton} ${styles.iconActionButton} ${styles.mobileActions}`} aria-label={`פעולות עבור ${title}`} aria-expanded={open} aria-controls={id} popoverTarget={id}>
            <Ellipsis aria-hidden="true" size={18} />
        </button>
        <div id={id} popover="auto" role="group" aria-label={`פעולות עבור ${title}`} className={styles.actionPopover} onToggle={event => {
            const panel = event.currentTarget;
            const isOpen = panel.matches(':popover-open');
            setOpen(isOpen);
            if (!isOpen || !trigger.current) return;
            const anchor = trigger.current.getBoundingClientRect();
            const box = panel.getBoundingClientRect();
            // Native top layer avoids clipping by cards; clamp to the viewport in RTL.
            panel.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8))}px`;
            panel.style.top = `${Math.max(8, anchor.bottom + box.height + 12 <= window.innerHeight ? anchor.bottom + 4 : anchor.top - box.height - 4)}px`;
            panel.querySelector('button')?.focus();
        }}>
            <button type="button" className={styles.dangerButton} onClick={event => {
                event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover();
                trigger.current?.focus();
                onDelete();
            }}><Trash2 aria-hidden="true" size={16} /> מחיקת משימה</button>
        </div>
    </>;
}
