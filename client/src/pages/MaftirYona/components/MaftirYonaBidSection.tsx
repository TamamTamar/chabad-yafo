import shared from '../MaftirYona.module.scss';
import type { Ref } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import type { AuctionState } from '../../../services/maftirYonaService';
import type { useBidForm } from '../useBidForm';
import BidAmountSelector from './BidAmountSelector';
import BidderDetailsForm from './BidderDetailsForm';
import styles from './MaftirYonaBidSection.module.scss';

type Props = {
    data: AuctionState;
    isOpen: boolean;
    offerSection: Ref<HTMLElement>;
    bidForm: ReturnType<typeof useBidForm>;
};

export default function MaftirYonaBidSection({ data, isOpen, offerSection, bidForm }: Props) {
    const { register, errors, acceptedId, notice, handleSubmit, submit, busy, pending, selectedAmount, selectAmount, onAmountChange } = bidForm;
    return (
        <section className={`${shared.card} ${styles.bidCard}`} id="maftir-offer" ref={offerSection} aria-labelledby="bid-title">
            <div className={styles.formHeading}><Sparkles className={styles.formIcon} size={24} aria-hidden="true" /><h2 className={shared.sectionTitle} id="bid-title">בחרו את סכום ההצעה</h2></div>
            <p className={shared.note}>אפשר לבחור סכום מוצע או להזין סכום אחר.</p>
            {acceptedId && <p className={styles.success} role="status">{data.leadingBid?.id === acceptedId ? (data.status === 'ended' ? 'המכירה הסתיימה וההצעה שלכם זכתה. ניצור קשר בנפרד.' : 'ההצעה התקבלה בהצלחה והיא כרגע ההצעה המובילה.') : 'ההצעה התקבלה. מאז השתנתה ההצעה המובילה — הפרטים המעודכנים מוצגים למעלה.'}</p>}
            {notice && <p className={shared.error} role="alert">{notice}</p>}
            <form className={shared.form} onSubmit={event => void handleSubmit(submit)(event)} noValidate>
                <fieldset className={styles.fieldset} disabled={!isOpen || busy || Boolean(pending)}>
                    <BidAmountSelector data={data} register={register} errors={errors} pending={Boolean(pending)} selectedAmount={selectedAmount} selectAmount={selectAmount} onAmountChange={onAmountChange} />
                    <BidderDetailsForm register={register} errors={errors} pending={Boolean(pending)} />
                </fieldset>
                <button className={`${shared.primary} ${styles.bidSubmit}`} type="submit" disabled={(!isOpen && !pending) || busy}>{busy ? 'שולח הצעה…' : pending ? 'בדיקת ושליחת ההצעה הקודמת' : `הגש הצעה • ${Number(selectedAmount || data.minimumBid).toLocaleString('he-IL')} ₪`}</button>
                <p className={styles.paymentReassurance}><ShieldCheck className={styles.reassuranceIcon} size={18} aria-hidden="true" />אין חיוב עכשיו. התשלום יתבצע רק במקרה של זכייה.</p>
            </form>
        </section>
    );
}
