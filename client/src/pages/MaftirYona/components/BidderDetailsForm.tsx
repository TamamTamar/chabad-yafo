import shared from '../MaftirYona.module.scss';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { BidFormValues } from '../useBidForm';
import styles from './BidderDetailsForm.module.scss';

type Props = {
    register: UseFormRegister<BidFormValues>;
    errors: Omit<FieldErrors<BidFormValues>, 'amount'>;
    pending: boolean;
};

export default function BidderDetailsForm({ register, errors, pending }: Props) {
    return (
        <>
                                    <h3 className={styles.contactHeading}>פרטי קשר</h3>
                                    <div className={shared.fields}>
                                        {(['firstName', 'lastName', 'phone'] as const).map((key, index) => <label className={shared.field} key={key}>
                                            <span className={shared.label}>{['שם פרטי', 'שם משפחה', 'טלפון / WhatsApp'][index]}</span>
                                            <input className={shared.input} dir={key === 'phone' ? 'ltr' : undefined} type={key === 'phone' ? 'tel' : 'text'} autoComplete={['given-name', 'family-name', 'tel'][index]} required maxLength={key === 'phone' ? 30 : 50} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} {...register(key, {
                                                validate: value => {
                                                    if (pending) return true;
                                                    if (key === 'phone') {
                                                        const phone = value.replace(/[\s()-]/g, '').replace(/^00972/, '+972');
                                                        return (/^[+\d\s()-]{9,30}$/.test(value) && (/^[+][1-9]\d{7,14}$/.test(phone) || /^0(?:[23489]|[57]\d)\d{7}$/.test(phone)))
                                                            || 'יש להזין טלפון תקין; למספר בינלאומי הוסיפו + וקידומת מדינה.';
                                                    }
                                                    return (/^[\p{L}\p{M} '\u05f3\u05f4’־-]{1,50}$/u.test(value.trim()) && /\p{L}/u.test(value))
                                                        || 'יש להזין שם תקין.';
                                                },
                                            })} />
                                            {errors[key] && <span className={shared.fieldError} id={`${key}-error`} role="alert">{errors[key]?.message}</span>}
                                        </label>)}
                                    </div>
                                    <label className={styles.checkboxLabel}><input className={styles.checkbox} type="checkbox" required aria-invalid={Boolean(errors.accepted)} aria-describedby={errors.accepted ? 'accepted-error' : undefined} {...register('accepted', { required: 'יש לאשר את ההתחייבות לפני הגשת ההצעה.' })} /><span className={shared.text}>אני מאשר/ת שההצעה שהגשתי מחייבת אותי אם אזכה במכירה.</span></label>
                                    {errors.accepted && <span className={shared.fieldError} id="accepted-error" role="alert">{errors.accepted.message}</span>}

        </>
    );
}
