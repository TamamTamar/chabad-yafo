export interface QuickSuggestion {
    id: string;
    text: string;
    iconLabel?: string;
}

export const DEFAULT_SUGGESTIONS: QuickSuggestion[] = [
    {
        id: "shabbat",
        text: "מתי נכנסת שבת ביפו?",
        iconLabel: "🕯️",
    },
    {
        id: "branches",
        text: "איפה נמצא בית חב״ד ומי השלוחים?",
        iconLabel: "📍",
    },
    {
        id: "tefillin",
        text: "איך ניתן לבדוק תפילין ומזוזות?",
        iconLabel: "📜",
    },
    {
        id: "daycare",
        text: "איך נרשמים למעון חב״ד?",
        iconLabel: "👶",
    },
    {
        id: "donate",
        text: "איך אפשר לתרום לפעילות?",
        iconLabel: "❤️",
    },
    {
        id: "whatsapp",
        text: "איך אפשר לפנות ישירות בוואטסאפ?",
        iconLabel: "💬",
    },
];
