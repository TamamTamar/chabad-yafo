import { useCallback, useEffect, useMemo, useState } from "react";
import {
    clearAdminDaycareDonationDiagnostics,
    createManualDaycareDonation,
    getAdminDaycareDonationAudit,
    getAdminDaycareDonationAmbassadors,
    getAdminDaycareDonationCampaign,
    getAdminDaycareDonationDiagnostics,
    getAdminDaycareDonationRecords,
    getAdminDaycareExchangeRate,
    updateDaycareDonationCampaign,
    updateDaycareDonationItem,
    updateDaycareDonationRecord,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationCampaignData,
    DaycareDonationAmbassador,
    DaycareDonationAudit,
    DaycareDonationDiagnostics,
    DaycareDonationRecord,
    DonationItem,
} from "../../../DaycareDonations/types";
import {
    getDonationItemStatus,
    getProgressPercent,
} from "../../../DaycareDonations/daycareDonationsData";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

export type ManualCurrency = "ILS" | "USD" | "EUR";

const currencySymbol: Record<ManualCurrency, string> = {
    ILS: "₪",
    USD: "$",
    EUR: "€",
};

const currencyAmountLabel: Record<ManualCurrency, string> = {
    ILS: "בשקלים",
    USD: "בדולרים",
    EUR: "ביורו",
};

const currencyRateLabel: Record<Exclude<ManualCurrency, "ILS">, string> = {
    USD: "דולר",
    EUR: "אירו",
};

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

const formatShortDate = (value: string) =>
    new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(value));

const toLocalDateTimeInputValue = (date = new Date()) => {
    const localTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000
    );
    return localTime.toISOString().slice(0, 16);
};

const getItemRemaining = (item: DonationItem) =>
    Math.max(0, item.remaining ?? item.goal - item.raised);

const getInactiveRecommendationLabel = (item: DonationItem) => {
    const status = getDonationItemStatus(item);

    if (status === "complete" || getItemRemaining(item) <= 0) return "הושלם";
    if (!item.acceptingDonations || status === "closed") return "סגור";
    return null;
};

const sortItemsByNeed = (items: DonationItem[]) =>
    [...items].sort((first, second) => {
        const needDifference =
            getItemRemaining(second) - getItemRemaining(first);

        if (needDifference !== 0) return needDifference;

        return (first.openingPriority ?? 0) - (second.openingPriority ?? 0);
    });

const getAutomaticRecommendationIds = (items: DonationItem[]) => {
    const openItems = items.filter(
        (item) => !getInactiveRecommendationLabel(item)
    );
    const urgent = [...openItems].sort(
        (first, second) =>
            (first.openingPriority ?? 999) -
                (second.openingPriority ?? 999) ||
            getItemRemaining(first) - getItemRemaining(second)
    )[0];
    const quick = [...openItems]
        .filter((item) => item.id !== urgent?.id)
        .sort(
            (first, second) =>
                getItemRemaining(first) - getItemRemaining(second) ||
                getProgressPercent(second) - getProgressPercent(first)
        )[0];

    return [urgent?.id, quick?.id, "general"].filter(
        (value): value is string => Boolean(value)
    );
};

const getEffectiveRecommendationIds = (
    items: DonationItem[],
    configuredIds: string[]
) => {
    const openItems = items.filter(
        (item) => !getInactiveRecommendationLabel(item)
    );
    const validItemIds = new Set(openItems.map((item) => item.id));

    return [
        ...(configuredIds.length === 3 ? configuredIds : []),
        ...getAutomaticRecommendationIds(items),
        ...validItemIds,
    ]
        .filter(
            (choiceId, index, choices) =>
                (choiceId === "general" || validItemIds.has(choiceId)) &&
                choices.indexOf(choiceId) === index
        )
        .slice(0, 3);
};

const getRecommendationLabel = (items: DonationItem[], choiceId: string) =>
    choiceId === "general"
        ? "תרומה כללית למעון"
        : (items.find((item) => item.id === choiceId)?.title ?? choiceId);

const statusLabels: Record<DaycareDonationRecord["status"], string> = {
    confirmed: "מאושרת",
    refunded: "הוחזרה",
    cancelled: "בוטלה",
};

const auditLabels: Record<string, string> = {
    "campaign.updated": "הגדרות הקמפיין עודכנו",
    "category.updated": "יעד קטגוריה עודכן",
    "item.updated": "סעיף עודכן",
    "record.manualCreated": "תרומה ידנית נוספה",
    "record.updated": "רשומת תרומה עודכנה",
    "intent.created": "הוכן תשלום באתר",
    "intent.failed": "תשלום לא אושר",
    "payment.confirmed": "תשלום נדרים פלוס אושר",
    "diagnostic.intentCreated": "הוכנה עסקת בדיקה",
    "diagnostic.paymentObserved": "עסקת הבדיקה התקבלה",
    "diagnostics.cleared": "נתוני האבחון נמחקו",
    "ambassador.created": "שגריר נוסף",
    "ambassador.updated": "פרטי שגריר עודכנו",
    "ambassador.deleted": "שגריר נמחק",
    "fieldUpdate.created": "עדכון מהשטח נוסף",
    "fieldUpdate.updated": "עדכון מהשטח נערך",
    "fieldUpdate.deleted": "עדכון מהשטח נמחק",
    "lead.created": "פנייה לתורם נוספה",
    "lead.updated": "פנייה לתורם עודכנה",
};

type AdminView =
    | "overview"
    | "records"
    | "ambassadors"
    | "updates"
    | "manual"
    | "items"
    | "history";

type PendingRecordUpdate = {
    recordId: string;
    updates: {
        itemId?: string;
        allocations?: Array<{ itemId: string; amount: number }>;
        ambassadorId?: string;
        status?: DaycareDonationRecord["status"];
        displayDonorName?: boolean;
    };
    title: string;
    message: string;
};

const adminViews: Array<{
    id: AdminView;
    label: string;
    description: string;
}> = [
    { id: "overview", label: "סקירה", description: "מצב הקמפיין" },
    { id: "records", label: "תרומות", description: "רשומות ושיוכים" },
    { id: "ambassadors", label: "שגרירים", description: "לינקים ומעקב" },
    { id: "updates", label: "עדכונים", description: "חדשות מהשטח" },
    { id: "manual", label: "הזנה ידנית", description: "תרומה מחוץ לאתר" },
    { id: "items", label: "סעיפים ויעדים", description: "יעדים ומצבים" },
    { id: "history", label: "היסטוריה", description: "שינויים וכלים" },
];

const primaryAdminViews = adminViews.filter(
    (view) => view.id !== "history"
);

export const useDaycareDonationsAdmin = () => {
    const [campaign, setCampaign] =
        useState<DaycareDonationCampaignData | null>(null);
    const [records, setRecords] = useState<DaycareDonationRecord[]>([]);
    const [ambassadors, setAmbassadors] = useState<DaycareDonationAmbassador[]>([]);
    const [audit, setAudit] = useState<DaycareDonationAudit[]>([]);
    const [diagnostics, setDiagnostics] =
        useState<DaycareDonationDiagnostics | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clearDiagnosticsOpen, setClearDiagnosticsOpen] = useState(false);
    const [diagnosticPaymentOpen, setDiagnosticPaymentOpen] = useState(false);
    const [successPreviewOpen, setSuccessPreviewOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [activeView, setActiveView] = useState<AdminView>("overview");
    const [recordQuery, setRecordQuery] = useState("");
    const [recordStatus, setRecordStatus] = useState<
        "all" | DaycareDonationRecord["status"]
    >("all");
    const [manualCurrency, setManualCurrency] = useState<ManualCurrency>("ILS");
    const [manualAmount, setManualAmount] = useState("");
    const [manualExchangeRate, setManualExchangeRate] = useState("");
    const [manualRateUpdatedAt, setManualRateUpdatedAt] = useState("");
    const [manualRateLoading, setManualRateLoading] = useState(false);
    const [manualRateError, setManualRateError] = useState("");
    const [manualReceivedAt, setManualReceivedAt] = useState(() =>
        toLocalDateTimeInputValue()
    );
    const [pendingRecordUpdate, setPendingRecordUpdate] =
        useState<PendingRecordUpdate | null>(null);
    const [allocationRecord, setAllocationRecord] =
        useState<DaycareDonationRecord | null>(null);

    const loadData = useCallback(async () => {
        const [
            campaignData,
            recordData,
            ambassadorData,
            auditData,
            diagnosticData,
        ] =
            await Promise.all([
            getAdminDaycareDonationCampaign(),
            getAdminDaycareDonationRecords(),
            getAdminDaycareDonationAmbassadors(),
            getAdminDaycareDonationAudit(),
            getAdminDaycareDonationDiagnostics(),
        ]);
        setCampaign(campaignData);
        setRecords(recordData);
        setAmbassadors(ambassadorData);
        setAudit(auditData);
        setDiagnostics(diagnosticData);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData()
                .catch((loadError) => {
                    console.error("Failed to load donation admin:", loadError);
                    setError("לא הצלחנו לטעון את נתוני התרומות.");
                })
                .finally(() => setLoading(false));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadData]);

    const confirmedCount = useMemo(
        () => records.filter((record) => record.status === "confirmed").length,
        [records]
    );

    const filteredRecords = useMemo(() => {
        const normalizedQuery = recordQuery.trim().toLocaleLowerCase("he");
        return records.filter((record) => {
            const matchesStatus =
                recordStatus === "all" || record.status === recordStatus;
            const matchesQuery =
                !normalizedQuery ||
                [
                    record.donorName,
                    record.email,
                    record.phone,
                    record.externalTransactionId,
                    record.reference,
                    record.ambassadorId?.name,
                ].some((value) =>
                    String(value ?? "")
                        .toLocaleLowerCase("he")
                        .includes(normalizedQuery)
                );
            return matchesStatus && matchesQuery;
        });
    }, [recordQuery, recordStatus, records]);

    const loadAutomaticRate = async (
        currency: Exclude<ManualCurrency, "ILS"> = manualCurrency as Exclude<
            ManualCurrency,
            "ILS"
        >
    ) => {
        setManualRateLoading(true);
        setManualRateError("");
        try {
            const exchangeRate = await getAdminDaycareExchangeRate(
                currency,
                manualReceivedAt.slice(0, 10)
            );
            setManualExchangeRate(String(exchangeRate.rate));
            setManualRateUpdatedAt(exchangeRate.updatedAt);
        } catch (rateError) {
            console.error("Failed to load exchange rate:", rateError);
            setManualRateError(
                "לא הצלחנו לקבל שער אוטומטי. אפשר להזין את השער ידנית."
            );
        } finally {
            setManualRateLoading(false);
        }
    };

    const handleManualDonation = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const receivedAtValue = String(data.get("receivedAt") ?? "");
        const receivedAt = new Date(receivedAtValue);

        setSaving(true);
        setError("");
        setMessage("");

        try {
            await createManualDaycareDonation({
                amount: Number(data.get("amount")),
                currency: manualCurrency,
                exchangeRate:
                    manualCurrency !== "ILS"
                        ? Number(data.get("exchangeRate"))
                        : undefined,
                itemId: String(data.get("itemId") ?? "") || undefined,
                ambassadorId:
                    String(data.get("ambassadorId") ?? "") || undefined,
                donorName: String(data.get("donorName") ?? "") || undefined,
                displayDonorName: data.get("displayDonorName") === "on",
                phone: String(data.get("phone") ?? "") || undefined,
                email: String(data.get("email") ?? "") || undefined,
                dedication:
                    String(data.get("dedication") ?? "") || undefined,
                note: String(data.get("note") ?? "") || undefined,
                manualSource: String(data.get("manualSource")) as
                    | "bank_transfer"
                    | "cash"
                    | "check"
                    | "other",
                reference:
                    String(data.get("reference") ?? "") || undefined,
                receivedAt: Number.isNaN(receivedAt.getTime())
                    ? receivedAtValue
                    : receivedAt.toISOString(),
            });
            form.reset();
            setManualCurrency("ILS");
            setManualAmount("");
            setManualExchangeRate("");
            setManualRateUpdatedAt("");
            setManualRateError("");
            setManualReceivedAt(toLocalDateTimeInputValue());
            await loadData();
            setActiveView("records");
            setMessage("התרומה הידנית נשמרה והמדדים עודכנו.");
        } catch (saveError) {
            console.error("Failed to save manual donation:", saveError);
            setError("שמירת התרומה נכשלה. בדקו את הפרטים ונסו שוב.");
        } finally {
            setSaving(false);
        }
    };

    const handleItemUpdate = async (
        event: React.FormEvent<HTMLFormElement>,
        itemId: string
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const updatedCampaign = await updateDaycareDonationItem(itemId, {
                goal: Number(data.get("goal")),
                statusOverride: String(
                    data.get("statusOverride")
                ) as "auto" | "open" | "closed",
                reason: String(data.get("reason") ?? ""),
            });
            setCampaign(updatedCampaign);
            setMessage("הסעיף עודכן.");
        } catch (saveError) {
            console.error("Failed to update donation item:", saveError);
            setError("עדכון הסעיף נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const handleCampaignUpdate = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const updatedCampaign = await updateDaycareDonationCampaign({
                active: data.get("active") === "on",
            });
            setCampaign(updatedCampaign);
            setMessage("מצב הקמפיין עודכן.");
        } catch (saveError) {
            console.error("Failed to update donation campaign:", saveError);
            setError("עדכון הקמפיין נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const handleRecommendationsUpdate = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const recommendedChoiceIds = [1, 2, 3].map((position) =>
            String(data.get(`choice${position}`) ?? "")
        );
        if (
            recommendedChoiceIds.some((choiceId) => !choiceId) ||
            new Set(recommendedChoiceIds).size !== 3
        ) {
            setError("יש לבחור שלושה מסלולים שונים.");
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");
        try {
            const updatedCampaign = await updateDaycareDonationCampaign({
                recommendedChoiceIds,
            });
            setCampaign(updatedCampaign);
            setMessage("שלושת המסלולים המומלצים עודכנו.");
        } catch (saveError) {
            console.error("Failed to update recommended choices:", saveError);
            setError("עדכון המסלולים המומלצים נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const resetRecommendations = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const updatedCampaign = await updateDaycareDonationCampaign({
                recommendedChoiceIds: [],
            });
            setCampaign(updatedCampaign);
            setMessage("הבחירה האוטומטית הוחזרה.");
        } catch (saveError) {
            console.error("Failed to reset recommended choices:", saveError);
            setError("לא הצלחנו להחזיר את הבחירה האוטומטית.");
        } finally {
            setSaving(false);
        }
    };

    const handleRecordUpdate = async (
        recordId: string,
        updates: {
            itemId?: string;
            allocations?: Array<{ itemId: string; amount: number }>;
            ambassadorId?: string;
            status?: DaycareDonationRecord["status"];
            displayDonorName?: boolean;
        },
        reason: string
    ) => {
        setSaving(true);
        setError("");
        setMessage("");

        try {
            await updateDaycareDonationRecord(recordId, {
                ...updates,
                reason,
            });
            await loadData();
            setMessage("רשומת התרומה עודכנה.");
            return true;
        } catch (saveError) {
            console.error("Failed to update donation record:", saveError);
            setError("עדכון התרומה נכשל.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleClearDiagnostics = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const result = await clearAdminDaycareDonationDiagnostics();
            await loadData();
            setClearDiagnosticsOpen(false);
            setMessage(
                `נמחקו ${result.cleared} רשומות אבחון זמניות.`
            );
        } catch (clearError) {
            console.error("Failed to clear diagnostics:", clearError);
            setError("מחיקת נתוני האבחון נכשלה.");
        } finally {
            setSaving(false);
        }
    };

    const inactiveRecommendedItems = (campaign?.recommendedChoiceIds ?? [])
        .map((choiceId) =>
            campaign?.items ?? [].find((item) => item.id === choiceId)
        )
        .filter(
            (item): item is DonationItem =>
                item !== undefined &&
                Boolean(getInactiveRecommendationLabel(item))
        );
    const effectiveRecommendationIds = getEffectiveRecommendationIds(
        campaign?.items ?? [],
        campaign?.recommendedChoiceIds ?? []
    );

    return {
        campaign, records, ambassadors, audit, diagnostics, loading, saving,
        clearDiagnosticsOpen, diagnosticPaymentOpen, successPreviewOpen,
        message, error, activeView, recordQuery, recordStatus, manualCurrency,
        manualAmount, manualExchangeRate, manualRateUpdatedAt, manualRateLoading,
        manualRateError, manualReceivedAt, pendingRecordUpdate, allocationRecord,
        confirmedCount, filteredRecords, inactiveRecommendedItems,
        effectiveRecommendationIds, setClearDiagnosticsOpen,
        setDiagnosticPaymentOpen, setSuccessPreviewOpen, setMessage, setError,
        setActiveView, setRecordQuery, setRecordStatus, setManualCurrency,
        setManualAmount, setManualExchangeRate, setManualRateUpdatedAt,
        setManualRateError, setManualReceivedAt, setPendingRecordUpdate,
        setAllocationRecord, loadData, loadAutomaticRate, handleManualDonation,
        handleItemUpdate, handleCampaignUpdate, handleRecommendationsUpdate,
        resetRecommendations, handleRecordUpdate, handleClearDiagnostics,
        formatCurrency, formatDate, formatShortDate, currencySymbol,
        currencyAmountLabel, currencyRateLabel, getRecommendationLabel,
        getInactiveRecommendationLabel, sortItemsByNeed, statusLabels,
        auditLabels, adminViews, primaryAdminViews,
    };
};
