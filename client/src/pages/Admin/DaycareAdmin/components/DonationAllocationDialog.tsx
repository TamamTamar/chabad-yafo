import { useMemo, useState, type FormEvent } from "react";
import BaseDialog from "../../../../components/BaseDialog/BaseDialog";
import dialogStyles from "../../../../components/BaseDialog/BaseDialog.module.scss";
import type {
    DaycareDonationRecord,
    DonationItem,
} from "../../../DaycareDonations/types";
import styles from "./DonationAllocationDialog.module.scss";

type Allocation = { itemId: string; amount: number };

type Props = {
    record: DaycareDonationRecord;
    items: DonationItem[];
    busy: boolean;
    onConfirm: (allocations: Allocation[], reason: string) => void;
    onClose: () => void;
};

const toAmountInput = (amount: number) => String(Math.round(amount * 100) / 100);

const getRemaining = (item: DonationItem) =>
    Math.max(0, item.remaining ?? item.goal - item.raised);

const getTargetLabel = (item: DonationItem) => {
    const remaining = getRemaining(item);
    return `${item.title} — ${remaining > 0 ? `חסרים ₪${remaining.toLocaleString("he-IL")}` : "היעד הושלם"}`;
};

const DonationAllocationDialog = ({
    record,
    items,
    busy,
    onConfirm,
    onClose,
}: Props) => {
    const initialAllocations = record.allocations?.length
        ? record.allocations
        : record.itemId
          ? [{ itemId: record.itemId, amount: record.amount }]
          : [];
    const [firstItemId, setFirstItemId] = useState(
        initialAllocations[0]?.itemId ?? ""
    );
    const [secondItemId, setSecondItemId] = useState(
        initialAllocations[1]?.itemId ?? ""
    );
    const [firstAmount, setFirstAmount] = useState(
        toAmountInput(initialAllocations[0]?.amount ?? record.amount)
    );
    const [secondAmount, setSecondAmount] = useState(
        toAmountInput(initialAllocations[1]?.amount ?? 0)
    );
    const [reason, setReason] = useState("");

    const splitActive = Boolean(secondItemId);
    const firstValue = Number(firstAmount);
    const secondValue = Number(secondAmount);
    const firstItem = items.find((item) => item.id === firstItemId);
    const secondItem = items.find((item) => item.id === secondItemId);
    const remainingCents =
        Math.round(record.amount * 100) -
        Math.round((Number.isFinite(firstValue) ? firstValue : 0) * 100) -
        Math.round((Number.isFinite(secondValue) ? secondValue : 0) * 100);

    const validationMessage = useMemo(() => {
        if (!splitActive) return "";
        if (!firstItemId) return "יש לבחור יעד ראשון כדי לפצל את התרומה.";
        if (firstItemId === secondItemId) return "יש לבחור שני יעדים שונים.";
        if (firstValue <= 0 || secondValue <= 0) return "כל חלק חייב להיות גדול מאפס.";
        if (remainingCents !== 0) return "סכומי החלוקה חייבים להיות שווים לסכום התרומה.";
        return "";
    }, [firstItemId, firstValue, remainingCents, secondItemId, secondValue, splitActive]);

    const targetCapacityWarning = useMemo(() => {
        const warnings: string[] = [];
        const effectiveFirstAmount = splitActive ? firstValue : record.amount;
        if (firstItem && effectiveFirstAmount > getRemaining(firstItem)) {
            warnings.push(
                `ב${firstItem.title} חסרים רק ₪${getRemaining(firstItem).toLocaleString("he-IL")}`
            );
        }
        if (secondItem && secondValue > getRemaining(secondItem)) {
            warnings.push(
                `ב${secondItem.title} חסרים רק ₪${getRemaining(secondItem).toLocaleString("he-IL")}`
            );
        }
        return warnings.join(" · ");
    }, [firstItem, firstValue, record.amount, secondItem, secondValue, splitActive]);

    const handleSecondTarget = (itemId: string) => {
        setSecondItemId(itemId);
        if (!itemId) {
            setFirstAmount(toAmountInput(record.amount));
            setSecondAmount("0");
            return;
        }
        if (!secondItemId) {
            const firstHalf = Math.floor(Math.round(record.amount * 100) / 2) / 100;
            setFirstAmount(toAmountInput(firstHalf));
            setSecondAmount(toAmountInput(record.amount - firstHalf));
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmedReason = reason.trim();
        if (busy || validationMessage || !trimmedReason) return;

        const allocations = splitActive
            ? [
                  { itemId: firstItemId, amount: firstValue },
                  { itemId: secondItemId, amount: secondValue },
              ]
            : firstItemId
              ? [{ itemId: firstItemId, amount: record.amount }]
              : [];
        onConfirm(allocations, trimmedReason);
    };

    return (
        <BaseDialog open title="חלוקת התרומה ליעדים" maxWidth={620} onClose={onClose}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.total}>
                    <span>סכום התרומה של {record.donorName || "תורם ללא שם"}</span>
                    <strong>₪{record.amount.toLocaleString("he-IL")}</strong>
                </div>

                <div className={styles.allocationGrid}>
                    <label>
                        <span>יעד ראשון</span>
                        <select
                            value={firstItemId}
                            disabled={busy}
                            onChange={(event) => setFirstItemId(event.target.value)}
                        >
                            <option value="">תרומה כללית</option>
                            {items.map((item) => (
                                <option key={item.id} value={item.id}>{getTargetLabel(item)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>סכום</span>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={splitActive ? firstAmount : record.amount}
                            disabled={busy || !splitActive}
                            onChange={(event) => setFirstAmount(event.target.value)}
                        />
                    </label>
                    <label>
                        <span>יעד שני</span>
                        <select
                            value={secondItemId}
                            disabled={busy}
                            onChange={(event) => handleSecondTarget(event.target.value)}
                        >
                            <option value="">ללא יעד נוסף</option>
                            {items.map((item) => (
                                <option key={item.id} value={item.id}>{getTargetLabel(item)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>סכום</span>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={secondAmount}
                            disabled={busy || !splitActive}
                            onChange={(event) => setSecondAmount(event.target.value)}
                        />
                    </label>
                </div>

                {splitActive && (
                    <p className={validationMessage ? styles.validationError : styles.validationOk}>
                        {validationMessage || "הסכום חולק במלואו בין שני היעדים."}
                    </p>
                )}

                {targetCapacityWarning && (
                    <p className={styles.capacityWarning}>
                        שימו לב: {targetCapacityWarning}. אפשר לשמור, אבל היעד יקבל יותר מהסכום החסר.
                    </p>
                )}

                <label className={styles.reasonField}>
                    <span>סיבת השינוי</span>
                    <textarea
                        required
                        rows={2}
                        value={reason}
                        disabled={busy}
                        placeholder="הסיבה תישמר בהיסטוריית הפעולות"
                        onChange={(event) => setReason(event.target.value)}
                    />
                </label>

                <div className={dialogStyles.actions}>
                    <button
                        type="submit"
                        className={dialogStyles.cta}
                        disabled={busy || Boolean(validationMessage) || !reason.trim()}
                    >
                        {busy ? "שומר..." : "שמירת החלוקה"}
                    </button>
                    <button
                        type="button"
                        className={dialogStyles.ghost}
                        disabled={busy}
                        onClick={onClose}
                    >
                        ביטול
                    </button>
                </div>
            </form>
        </BaseDialog>
    );
};

export default DonationAllocationDialog;
