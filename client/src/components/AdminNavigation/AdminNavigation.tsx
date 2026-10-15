import { useEffect, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutAdmin } from '../../services/adminAuthService';
import { adminGroups, resolveAdminLocation } from './adminNavigationConfig';
import styles from './AdminNavigation.module.scss';

const storageKey = 'admin.navigation.groups';
export default function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const active = resolveAdminLocation(pathname, search);
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        try { return { website: true, daycare: true, internal: true, ...JSON.parse(sessionStorage.getItem(storageKey) ?? '{}'), [active.groupId]: true }; }
        catch { return { website: true, daycare: true, internal: true }; }
    });
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState('');
    const locationKey = `${pathname}${search}`;
    const [previousLocation, setPreviousLocation] = useState(locationKey);
    // Reopen the destination group on navigation; manual folding remains possible between navigations.
    if (previousLocation !== locationKey) {
        setPreviousLocation(locationKey);
        if (!open[active.groupId]) setOpen(current => ({ ...current, [active.groupId]: true }));
    }
    useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(open)); } catch { /* Storage may be unavailable. */ } }, [open]);
    async function logout() {
        setLoggingOut(true); setError('');
        try { await logoutAdmin(); onNavigate?.(); navigate('/admin/login', { replace: true }); }
        catch { setError('היציאה נכשלה. נסו שוב.'); setLoggingOut(false); }
    }
    return <div className={styles.navigation}>
        <div className={styles.brand}><strong>בית חב״ד יפו</strong><span>מערכת ניהול</span></div>
        <nav aria-label="ניווט מערכת הניהול" className={styles.groups}>
            {adminGroups.map(group => <section key={group.id}>
                <button className={active.groupId === group.id ? `${styles.group} ${styles.groupActive}` : styles.group} type="button" aria-expanded={open[group.id]} aria-controls={`admin-group-${group.id}`}
                    onClick={() => setOpen(current => ({ ...current, [group.id]: !current[group.id] }))}>
                    {group.label}<ChevronDown size={14} aria-hidden="true" className={open[group.id] ? undefined : styles.collapsed} />
                </button>
                <div id={`admin-group-${group.id}`} hidden={!open[group.id]}>
                    {group.items.map(item => <Link key={item.id} to={item.to} onClick={onNavigate}
                        className={active.groupId === group.id && active.itemId === item.id ? styles.active : styles.link}
                        aria-current={active.groupId === group.id && active.itemId === item.id ? 'page' : undefined}>
                        <item.icon size={18} aria-hidden="true" />{item.label}
                    </Link>)}
                </div>
            </section>)}
        </nav>
        <div className={styles.bottom}>{error && <p role="alert">{error}</p>}
            <button type="button" className={styles.link} onClick={logout} disabled={loggingOut}><LogOut size={18} aria-hidden="true" />{loggingOut ? 'יוצאים…' : 'יציאה'}</button>
        </div>
    </div>;
}
