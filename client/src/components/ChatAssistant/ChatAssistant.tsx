import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    MessageCircle,
    X,
    Send,
    RotateCcw,
    Sparkles,
    ExternalLink,
    ArrowRight,
    HelpCircle,
    Shield,
} from "lucide-react";
import type { ChatMessage, SuggestedAction } from "../../types/chatAssistant";
import { sendChatMessage, chatErrorMessage } from "../../services/chatAssistantService";
import { DEFAULT_SUGGESTIONS } from "./chatAssistantSuggestions";
import styles from "./ChatAssistant.module.scss";

const INITIAL_GREETING: ChatMessage = {
    id: "init-1",
    role: "assistant",
    content: "שלום! אפשר לשאול אותי על בית חב״ד יפו. במה אפשר לעזור?",
    timestamp: Date.now(),
    suggestedActions: [],
};

const ChatAssistant: React.FC = () => {
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fabTriggerRef = useRef<HTMLButtonElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const wasOpenRef = useRef(false);
    const conversationIdRef = useRef<number>(0);

    // Reserve space for existing fixed mobile action bars.
    const hasBottomCta = pathname.startsWith("/maftir-yona") || pathname === "/daycare-parent-info";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Scroll and manage focus on open/close
    useEffect(() => {
        if (isOpen) {
            wasOpenRef.current = true;
            scrollToBottom();
            const timer = setTimeout(() => inputRef.current?.focus(), 120);
            return () => clearTimeout(timer);
        } else if (wasOpenRef.current) {
            wasOpenRef.current = false;
            // Restore focus to the trigger button when closing
            fabTriggerRef.current?.focus();
        }
    }, [isOpen]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isLoading]);

    // Accessibility: Allow closing with Escape key even when input is disabled or unfocused
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    useEffect(() => () => {
        conversationIdRef.current += 1;
        abortControllerRef.current?.abort();
    }, []);

    const handleToggle = () => {
        setIsOpen((prev) => !prev);
    };

    const handleReset = () => {
        // Abort any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Invalidate current conversation so any in-flight response is discarded
        conversationIdRef.current += 1;

        setMessages([INITIAL_GREETING]);
        setInput("");
        setIsLoading(false);
    };

    const handleSend = async (textToSend?: string) => {
        const text = (textToSend ?? input).trim();
        if (!text || isLoading) return;

        // Abort any previous pending call
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const currentController = new AbortController();
        abortControllerRef.current = currentController;
        const currentConvId = conversationIdRef.current;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: text,
            timestamp: Date.now(),
        };

        // History to pass excludes the current message (avoiding duplicate sending)
        const historyForCall = [...messages];

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await sendChatMessage(text, historyForCall, currentController.signal);

            // If user reset conversation while request was pending, discard response
            if (conversationIdRef.current !== currentConvId) {
                return;
            }

            const assistantMsg: ChatMessage = {
                id: `asst-${Date.now()}`,
                role: "assistant",
                content: response.reply,
                timestamp: Date.now(),
                suggestedActions: response.suggestedActions,
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: unknown) {
            // Check if aborted/cancelled
            if (
                (err instanceof Error && err.name === "CanceledError") ||
                (err instanceof Error && err.name === "AbortError") ||
                conversationIdRef.current !== currentConvId
            ) {
                return;
            }

            // Safe client logging: do not log conversation content or full error object
            // sendChatMessage already emits a safe diagnostic event when applicable.

            const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                role: "assistant",
                content: chatErrorMessage(err),
                timestamp: Date.now(),

            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            if (conversationIdRef.current === currentConvId) {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderAction = (action: SuggestedAction, index: number) => {
        const isInternalLink = action.url.startsWith("/");

        if (isInternalLink) {
            return (
                <Link
                    key={`${action.url}-${index}`}
                    to={action.url}
                    className={styles.actionBtn}
                    onClick={() => setIsOpen(false)}
                >
                    <span>{action.label}</span>
                    <ArrowRight size={14} className={styles.actionIcon} />
                </Link>
            );
        }

        return (
            <a
                key={`${action.url}-${index}`}
                href={action.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.actionBtn} ${action.type === "whatsapp" ? styles.whatsappAction : ""}`}
            >
                <span>{action.label}</span>
                <ExternalLink size={14} className={styles.actionIcon} />
            </a>
        );
    };

    const wrapperClasses = [
        styles.wrapper,
        hasBottomCta ? styles.aboveBottomCta : "",
    ].filter(Boolean).join(" ");

    return (
        <div className={wrapperClasses} dir="rtl">
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    ref={fabTriggerRef}
                    type="button"
                    className={styles.fab}
                    onClick={handleToggle}
                    aria-label="פתיחת עוזר דיגיטלי בית חב״ד יפו"
                    aria-expanded={isOpen}
                >
                    <span className={styles.fabIcon}>
                        <MessageCircle size={24} />
                    </span>
                    <span className={styles.fabBadge}>
                        <Sparkles size={13} />
                    </span>
                    <span className={styles.fabText}>עוזר חב״ד</span>
                </button>
            )}

            {/* Chat Dialog Window */}
            {isOpen && (
                <div
                    className={styles.chatWindow}
                    role="dialog"
                    aria-label="עוזר דיגיטלי בית חב״ד יפו"
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerInfo}>
                            <div className={styles.headerAvatar}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className={styles.headerTitle}>עוזר בית חב״ד יפו</h3>
                                <p className={styles.headerStatus}>
                                    <span className={styles.onlineDot} /> אפשר לשאול אותי על בית חב״ד יפו
                                </p>
                            </div>
                        </div>

                        <div className={styles.headerActions}>
                            <button
                                type="button"
                                className={styles.headerBtn}
                                onClick={handleReset}
                                title="התחלת שיחה חדשה"
                                aria-label="התחלת שיחה חדשה"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                type="button"
                                className={styles.headerBtn}
                                onClick={handleToggle}
                                title="סגירת חלון הצ'אט (Escape)"
                                aria-label="סגירה"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body with Accessibility aria-live */}
                    <div
                        className={styles.messagesContainer}
                        aria-live="polite"
                        aria-atomic="false"
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.assistantRow
                                    }`}
                            >
                                {msg.role === "assistant" && (
                                    <div className={styles.msgAvatar} aria-hidden="true">
                                        <Sparkles size={14} />
                                    </div>
                                )}

                                <div className={styles.messageBubble}>
                                    <div className={styles.messageContent}>
                                        {msg.content.split("\n").map((line, idx) => (
                                            <React.Fragment key={idx}>
                                                {line}
                                                {idx !== msg.content.split("\n").length - 1 && <br />}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                        <div className={styles.actionsList}>
                                            {msg.suggestedActions.map(renderAction)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Typing Loader */}
                        {isLoading && (
                            <div
                                className={`${styles.messageRow} ${styles.assistantRow}`}
                                role="status"
                                aria-label="טוען תשובה"
                            >
                                <div className={styles.msgAvatar} aria-hidden="true">
                                    <Sparkles size={14} />
                                </div>
                                <div className={`${styles.messageBubble} ${styles.loadingBubble}`}>
                                    <span className={styles.dot} />
                                    <span className={styles.dot} />
                                    <span className={styles.dot} />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions Section (Visible when 1 message) */}
                    {messages.length <= 1 && !isLoading && (
                        <div className={styles.suggestionsContainer}>
                            <div className={styles.suggestionsTitle}>
                                <HelpCircle size={13} />
                                <span>שאלות נפוצות:</span>
                            </div>
                            <div className={styles.suggestionsList}>
                                {DEFAULT_SUGGESTIONS.map((sug) => (
                                    <button
                                        key={sug.id}
                                        type="button"
                                        className={styles.suggestionChip}
                                        onClick={() => handleSend(sug.text)}
                                    >
                                        {sug.iconLabel && <span className={styles.chipIcon}>{sug.iconLabel}</span>}
                                        <span>{sug.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className={styles.inputContainer}>
                        {/* Privacy text regarding personal information */}
                        <div className={styles.privacyNotice}>
                            <Shield size={12} className={styles.privacyIcon} />
                            <span>נא לא לשלוח פרטים אישיים, רפואיים או פרטי תשלום בצ׳אט.</span>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className={styles.inputForm}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                placeholder="שאלו שאלה על בית חב״ד..."
                                className={styles.textInput}
                                disabled={isLoading}
                                maxLength={500}
                                aria-label="הודעה לעוזר"
                            />
                            <button
                                type="submit"
                                className={styles.sendBtn}
                                disabled={!input.trim() || isLoading}
                                aria-label="שליחת הודעה"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                        <div className={styles.disclaimer}>
                            לפי פרסומי בית חב״ד יפו. בהלכה ובעניינים אישיים פנו לרב.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatAssistant;
