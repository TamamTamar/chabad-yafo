import { useRef, useState } from 'react';
import axios from 'axios';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import { auctionMoney, sendAuctionBid, type BidInput, type AuctionState } from '../../services/maftirYonaService';

export type BidFormValues = Omit<BidInput, 'amount' | 'revision' | 'requestId'> & { amount: string };

type Options = {
    data: AuctionState | null;
    isOpen: boolean;
    accept: (data: AuctionState) => void;
    refresh: () => Promise<AuctionState>;
};

export function useBidForm({ data, isOpen, accept, refresh }: Options) {
    const { register, handleSubmit, control, setValue, resetField, formState: { errors } } = useForm<BidFormValues>({
        mode: 'onChange',
        reValidateMode: 'onChange',
        defaultValues: { firstName: '', lastName: '', phone: '', amount: '', accepted: false },
    });
    const selectedAmount = useWatch({ control, name: 'amount' });
    const [confirmation, setConfirmation] = useState<BidInput | null>(null);
    const [notice, setNotice] = useState('');
    const [acceptedId, setAcceptedId] = useState('');
    const [busy, setBusy] = useState(false);
    const sending = useRef(false);
    const [pending, setPending] = useState<BidInput | null>(null);
    const amountRevision = useRef<number | null>(null);
    const selectAmount = (value: string) => { amountRevision.current = data?.revision ?? null; setValue('amount', value, { shouldDirty: true, shouldValidate: true }); setNotice(''); };
    const submit: SubmitHandler<BidFormValues> = (form) => {
        if (!data || (!isOpen && !pending) || sending.current) return;
        const amount = pending?.amount ?? Number(form.amount || data.minimumBid);
        if (!pending && amountRevision.current !== null && amountRevision.current !== data.revision) {
            amountRevision.current = data.revision;
            setNotice(`המכירה עודכנה. המינימום החדש הוא ${auctionMoney(data.minimumBid)}. בדקו את הסכום והגישו שוב לאישור.`);
            return;
        }
        const input = pending ?? { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), amount, revision: data.revision, requestId: crypto.randomUUID() };
        setConfirmation(input);
    };
    async function sendConfirmed() {
        if (!confirmation || sending.current) return;
        const input = confirmation;
        sending.current = true; setBusy(true); setNotice(''); setPending(input);
        try {
            const result = await sendAuctionBid(input);
            accept(result.data); setAcceptedId(result.acceptedBidId); setPending(null); amountRevision.current = null;
            resetField('amount');
            resetField('accepted');
        } catch (failure) {
            if (axios.isAxiosError(failure) && failure.response && failure.response.status < 500) {
                setPending(null);
                setNotice(failure.response.data?.message ?? 'ההצעה לא התקבלה. נסו שוב.');
                try { const next = await refresh(); amountRevision.current = next.revision; setNotice(previous => `${previous} הסכום המינימלי כעת: ${auctionMoney(next.minimumBid)}.`); } catch { /* polling retries */ }
            } else { setNotice('לא התקבל אישור מהשרת. לחצו שוב כדי לבדוק ולשלוח את אותה ההצעה, ללא כפילות.'); }
        } finally { sending.current = false; setBusy(false); setConfirmation(null); }
    }
    const onAmountChange = () => {
        if (!data) return;
        amountRevision.current = data.revision;
        setNotice('');
    };
    return { register, errors, selectedAmount, confirmation, setConfirmation, notice, acceptedId, busy, pending, selectAmount, submit, handleSubmit, sendConfirmed, onAmountChange };
}
