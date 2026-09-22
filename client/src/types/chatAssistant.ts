export interface SuggestedAction {
    type: "whatsapp" | "link" | "phone";
    label: string;
    url: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    suggestedActions?: SuggestedAction[];
}

export interface ChatAssistantResponse {
    success: boolean;
    reply: string;
    suggestedActions?: SuggestedAction[];
    provider?: "gemini" | "openai" | "local";
    message?: string;
}

