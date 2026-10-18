import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import styles from './AdminDialog.module.scss';
import shared from './AdminPrimitives.module.scss';

// Opt-in native modal: focus containment, Escape, scroll lock and focus return.
export default function AdminDialog({children, labelledBy, onClose, className = ''}: {children: ReactNode; labelledBy: string; onClose: () => void; className?: string}) {
    const ref = useRef<HTMLDialogElement>(null);
    const close = useRef(onClose);
    useEffect(() => { close.current = onClose; }, [onClose]);
    useLayoutEffect(() => {
        const node = ref.current!;
        const trigger = document.activeElement as HTMLElement | null;
        const overflow = document.body.style.overflow;
        node.showModal();
        node.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
        document.body.style.overflow = 'hidden';
        return () => { node.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
    }, []);
    return <dialog ref={ref} aria-labelledby={labelledBy} className={`${shared.surface} ${styles.dialog} ${className}`} onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const nodes = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(node => node.getClientRects().length > 0);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onCancel={event => {event.preventDefault(); close.current();}} onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close.current();
    }}>{children}</dialog>;
}
