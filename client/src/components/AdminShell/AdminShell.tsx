import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import AdminNavigation from '../AdminNavigation/AdminNavigation';
import styles from './AdminShell.module.scss';

export default function AdminShell({ children }: { children: ReactNode }) {
    const [mobile, setMobile] = useState(() => typeof window !== "undefined" && !window.matchMedia("(min-width: 1100px)").matches);
    const dialog = useRef<HTMLDialogElement>(null);
    const menu = useRef<HTMLButtonElement>(null);
    const previousOverflow = useRef('');
    const { pathname, search } = useLocation();
    function close() { dialog.current?.close(); }
    function restore() { document.body.style.overflow = previousOverflow.current; menu.current?.focus(); }
    function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node => node.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    function show() {
        if (dialog.current?.open) return;
        previousOverflow.current = document.body.style.overflow;
        dialog.current?.showModal(); document.body.style.overflow = 'hidden';
    }
    useEffect(() => { dialog.current?.close(); }, [pathname, search]);
    useEffect(() => {
        const dialogNode = dialog.current;
        const media = window.matchMedia('(min-width: 1100px)');
        const onChange = () => { setMobile(!media.matches); if (media.matches) dialog.current?.close(); };
        media.addEventListener('change', onChange);
        return () => { media.removeEventListener('change', onChange); if (dialogNode?.open) document.body.style.overflow = previousOverflow.current; };
    }, []);
    return <div className={styles.shell} dir="rtl">
        <aside className={styles.sidebar} aria-label="תפריט ניהול">{!mobile && <AdminNavigation />}</aside>
        <button ref={menu} className={styles.menu} type="button" aria-label="פתיחת תפריט ניהול" aria-haspopup="dialog" onClick={show}><Menu size={20} /></button>
        <dialog ref={dialog} className={styles.drawer} aria-label="תפריט ניהול" onClose={restore} onKeyDown={trapFocus}
            onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}>
            <button type="button" autoFocus className={styles.close} aria-label="סגירת תפריט ניהול" onClick={close}><X size={20} /></button>
            {mobile && <AdminNavigation onNavigate={close} />}
        </dialog>
        <div className={styles.workspace} id="admin-workspace" tabIndex={-1}>{children}</div>
    </div>;
}
