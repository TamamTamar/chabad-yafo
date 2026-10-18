import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Menu, X, CircleUserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AdminNavigation from '../AdminNavigation/AdminNavigation';
import { resolveAdminLocation } from '../AdminNavigation/adminNavigationConfig';
import styles from './AdminShell.module.scss';

export default function AdminShell({ children, adminLabel }: { children: ReactNode; adminLabel?: string }) {
    const [mobile, setMobile] = useState(() => typeof window !== "undefined" && !window.matchMedia("(min-width: 1100px)").matches);
    const dialog = useRef<HTMLDialogElement>(null);
    const menu = useRef<HTMLButtonElement>(null);
    const previousOverflow = useRef('');
    const { pathname, search } = useLocation();
    const itemId = resolveAdminLocation(pathname, search).itemId;
    const modernDark = pathname === '/admin/daycare' && ['registration', 'tasks', 'documents', 'finance', 'donations'].includes(itemId || '');
    const taskPage = itemId === 'tasks';
    const donationPage = itemId === 'donations';
    const financePage = itemId === 'finance';
    const documentPage = itemId === 'documents';
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
    return <div className={`${styles.shell} ${modernDark ? styles.modernDark : ""}`} dir="rtl" data-admin-theme={modernDark ? "modern-dark" : undefined}>
        <aside className={styles.sidebar} aria-label="תפריט ניהול">{!mobile && <AdminNavigation modernDark={modernDark} />}</aside>
        <button ref={menu} className={styles.menu} type="button" aria-label="פתיחת תפריט ניהול" aria-haspopup="dialog" onClick={show}><Menu size={20} /></button>
        <dialog ref={dialog} className={styles.drawer} aria-label="תפריט ניהול" onClose={restore} onKeyDown={trapFocus}
            onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close(); } }}>
            <button type="button" autoFocus className={styles.close} aria-label="סגירת תפריט ניהול" onClick={close}><X size={20} /></button>
            {mobile && <AdminNavigation onNavigate={close} modernDark={modernDark} />}
        </dialog>
        <div className={styles.workspace} id="admin-workspace" tabIndex={-1}>
            {modernDark && <header className={styles.topBar}>
                <div className={styles.pageIdentity}>
                    <h1 id="admin-page-title">{donationPage ? "תרומות ולידים" : financePage ? "כספי המעון" : documentPage ? "מסמכי המעון" : taskPage ? "משימות המעון" : "רישום למעון"}</h1>
                    <nav aria-label="מיקום במערכת" className={styles.breadcrumb}>
                        <Link to="/admin/dashboard">בית חב״ד יפו</Link><span aria-hidden="true">/</span><Link to="/admin/daycare">המעון</Link><span aria-hidden="true">/</span><span aria-current="page">{donationPage ? "תרומות" : financePage ? "כספים" : documentPage ? "מסמכים" : taskPage ? "משימות" : "רישום"}</span>
                    </nav>
                </div>
                <div className={styles.userArea} role="group" aria-label={adminLabel ? `חשבון ניהול: ${adminLabel}` : "חשבון ניהול"}>
                    <span className={styles.userAvatar} aria-hidden="true"><CircleUserRound size={28} strokeWidth={1.5} /></span>
                    <div className={styles.userText}><strong>{adminLabel || "חשבון ניהול"}</strong><span>מנהל מערכת</span></div>
                </div>
            </header>}
            {children}
        </div>
    </div>;
}
