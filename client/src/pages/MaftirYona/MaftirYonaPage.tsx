import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import { auctionMoney } from '../../services/maftirYonaService';
import { useAuction } from './useAuction';
import { useBidForm } from './useBidForm';
import MaftirYonaHero from './components/MaftirYonaHero';
import MaftirYonaIntro from './components/MaftirYonaIntro';
import AuctionCountdownCard from './components/AuctionCountdownCard';
import MaftirYonaBidSection from './components/MaftirYonaBidSection';
import RecentBids from './components/RecentBids';
import MaftirYonaClosing from './components/MaftirYonaClosing';
import styles from './MaftirYona.module.scss';

export default function MaftirYonaPage() {
    const { data, accept, refresh, error, remaining, fresh } = useAuction();
    const offerSection = useRef<HTMLElement | null>(null);
    const [offerVisible, setOfferVisible] = useState(false);
    const hasData = Boolean(data);
    useEffect(() => {
        const section = offerSection.current;
        if (!section) return;
        const observer = new IntersectionObserver(([entry]) => setOfferVisible(entry.isIntersecting));
        observer.observe(section);
        return () => observer.disconnect();
    }, [hasData]);
    const isOpen = data?.status === 'open' && remaining > 0 && fresh && Date.parse(data.serverTime) >= Date.parse(data.opensAt);
    const seconds = Math.ceil(remaining / 1000);
    const parts = [Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60];
    const bidForm = useBidForm({ data, isOpen, accept, refresh });
    const { confirmation, busy, sendConfirmed, setConfirmation } = bidForm;
    return <main className={`${styles.page} ${styles.publicPage}`} dir="rtl" lang="he">
        <MaftirYonaHero data={data} parts={parts} onOfferClick={event => {
            if (!offerSection.current) return;
            event.preventDefault();
            offerSection.current.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        }} />
        <MaftirYonaIntro ended={data?.status === 'ended'} />
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!data ? <p className={styles.note} role="status">טוען את המכירה…</p> : <div className={styles.auctionGrid}>
            <AuctionCountdownCard data={data} isOpen={isOpen} parts={parts} remaining={remaining} />
            <div className={styles.publicColumns}>
                <MaftirYonaBidSection data={data} isOpen={isOpen} offerSection={offerSection} bidForm={bidForm} />
                <RecentBids bids={data.bids} />
            </div>
        </div>}
        <MaftirYonaClosing showBidLink={isOpen && !offerVisible} />
        <ConfirmDialog open={Boolean(confirmation)} title="אישור הגשת הצעה" message={confirmation ? `לאשר הצעה מחייבת בסך ${auctionMoney(confirmation.amount)} עבור זכות מפטיר יונה? התשלום יידרש רק במקרה של זכייה.` : ''} confirmLabel="אישור ושליחת ההצעה" busy={busy} onConfirm={() => void sendConfirmed()} onClose={() => { if (!busy) setConfirmation(null); }} />
    </main>;
}
