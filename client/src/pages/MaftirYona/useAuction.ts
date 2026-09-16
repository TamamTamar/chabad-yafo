import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAuction, type AuctionState } from '../../services/maftirYonaService';

export function useAuction(admin = false) {
    const [data, setData] = useState<AuctionState | null>(null);
    const [error, setError] = useState('');
    const [remaining, setRemaining] = useState(0);
    const [fresh, setFresh] = useState(false);
    const snapshot = useRef<{ data: AuctionState; at: number } | null>(null);
    const accept = useCallback((next: AuctionState) => {
        const previous = snapshot.current;
        if (previous && (next.revision < previous.data.revision || (next.revision === previous.data.revision && next.serverTime < previous.data.serverTime))) return;
        snapshot.current = { data: next, at: performance.now() };
        setData(next);
        setRemaining(next.status === 'ended' ? 0 : Math.max(0, Date.parse(next.endsAt) - Date.parse(next.serverTime)));
        setFresh(true);
        setError('');
    }, []);
    const refresh = useCallback(async () => {
        const next = await fetchAuction(admin);
        accept(next);
        return next;
    }, [admin, accept]);
    useEffect(() => {
        let active = true;
        let timeout: number;
        const poll = async () => {
            try { const next = await fetchAuction(admin); if (active) accept(next); }
            catch { if (active) setError('לא ניתן לעדכן את המכירה כרגע. מנסה להתחבר מחדש…'); }
            finally { if (active) timeout = window.setTimeout(poll, 4000); }
        };
        void poll();
        const timer = window.setInterval(() => {
            const current = snapshot.current;
            if (!current) return;
            const elapsed = performance.now() - current.at;
            setFresh(elapsed < 15000);
            setRemaining(current.data.status === 'ended' ? 0 : Math.max(0, Date.parse(current.data.endsAt) - Date.parse(current.data.serverTime) - elapsed));
        }, 250);
        return () => { active = false; clearTimeout(timeout); clearInterval(timer); };
    }, [admin, accept]);
    return { data, accept, refresh, error, remaining, fresh };
}
