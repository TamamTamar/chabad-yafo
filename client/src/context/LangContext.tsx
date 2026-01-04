import React, { createContext, useEffect, useMemo, useState } from "react";
import { isLang, translations, type Lang } from "../i18n/translations";

type LangContextValue = {
    lang: Lang;
    setLang: React.Dispatch<React.SetStateAction<Lang>>;
    toggleLang: () => void;
    t: (typeof translations)[Lang];
};

const STORAGE_KEY = "lang";

export const LangContext = createContext<LangContextValue | null>(null);

const getInitialLang = (): Lang => {
    // 1) אם המשתמש כבר בחר בעבר – זה מנצח
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isLang(saved)) return saved;

    // 2) אחרת – ניסיון לפי שפת דפדפן
    const browserLang = (navigator.language || "").toLowerCase();
    if (browserLang.startsWith("en")) return "en";
    if (browserLang.startsWith("he")) return "he";

    // 3) fallback
    return "he";
};

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<Lang>(getInitialLang);

    useEffect(() => {
        // ✅ שמירה לבחירה להבא (לא צריך removeItem, setItem פשוט דורס)
        localStorage.setItem(STORAGE_KEY, lang);

        // ✅ הצהרה למסמך
        document.documentElement.lang = lang;

        // ✅ קלאסים לשליטה ב-SCSS
        document.documentElement.classList.toggle("lang-en", lang === "en");
        document.documentElement.classList.toggle("lang-he", lang === "he");

        // אם את רוצה תמיד RTL גם באנגלית – השאירי כך:
        // document.documentElement.dir = "rtl";

        // אם את רוצה אנגלית LTR (מומלץ כשיש הרבה טקסט באנגלית):
        // document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    }, [lang]);

    const t = useMemo(() => translations[lang], [lang]);
    const toggleLang = () => setLang((prev) => (prev === "he" ? "en" : "he"));

    const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, t]);

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};
