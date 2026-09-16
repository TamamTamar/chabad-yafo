import shared from '../MaftirYona.module.scss';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { BidFormValues } from '../useBidForm';
import { auctionMoney, type AuctionState } from '../../../services/maftirYonaService';
import styles from './BidAmountSelector.module.scss';

type Props = {
    data: Pick<AuctionState, 'minimumBid' | 'leadingBid' | 'openingPrice'>;
    register: UseFormRegister<BidFormValues>;
    errors: Pick<FieldErrors<BidFormValues>, 'amount'>;
    pending: boolean;
    selectedAmount: string;
    selectAmount: (value: string) => void;
    onAmountChange: () => void;
};

export default function BidAmountSelector({ data, register, errors, pending, selectedAmount, selectAmount, onAmountChange }: Props) {
    return (
        <div className={styles.amountSelection}>
            <div className={styles.offerChoices}>
                {[3600, 5400, 7700].map((suggestion, index) => {
                    const amount = Math.max(suggestion, data.minimumBid + [1800, 3600, 5900][index]);
                    return <button className={`${styles.offerChoice} ${Number(selectedAmount) === amount ? styles.offerSelected : ''}`} key={suggestion} type="button" disabled={amount > 1000000000} aria-pressed={Number(selectedAmount) === amount} onClick={() => selectAmount(String(amount))}>
                        <span className={styles.offerTotal}>{auctionMoney(amount)}</span>
                    </button>;
                })}
            </div>
            <label className={shared.field}><span className={shared.label}>סכום ההצעה בשקלים</span><span className={styles.amountInputWrap}><span className={styles.currency} aria-hidden="true">₪</span><input aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? "minimum-bid amount-error" : "minimum-bid"} className={`${shared.input} ${styles.offerInput}`} type="number" inputMode="numeric" min={data.minimumBid} max={1000000000} step="1" placeholder={String(data.minimumBid)} {...register('amount', {
                validate: value => {
                    if (pending) return true;
                    const amount = Number(value || data.minimumBid);
                    return (Number.isSafeInteger(amount) && amount >= data.minimumBid && amount <= 1000000000)
                        || `הסכום המינימלי כעת הוא ${auctionMoney(data.minimumBid)}. יש להזין סכום שלם.`;
                },
            })} onChange={event => {
                void register('amount').onChange(event);
                onAmountChange();
            }} /></span></label>
            {errors.amount && <span className={shared.fieldError} id="amount-error" role="alert">{errors.amount.message}</span>}
            <p className={styles.minimumNote} id="minimum-bid">הצעה מינימלית: {auctionMoney(data.minimumBid)}</p>
            <div className={styles.incrementChoices}>{[180, 360, 770].map(increment => <button className={styles.incrementButton} key={increment} type="button" onClick={() => selectAmount(String(Math.max(data.minimumBid, (data.leadingBid?.amount ?? data.openingPrice) + increment)))}>+{increment} ₪ לסכום המוביל</button>)}</div>
        </div>
    );
}
