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

export const LangProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<Lang>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved && isLang(saved) ? saved : "he";
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    }, [lang]);

    const t = useMemo(() => translations[lang], [lang]);
    const toggleLang = () => setLang((prev) => (prev === "he" ? "en" : "he"));

    const value = useMemo(
        () => ({ lang, setLang, toggleLang, t }),
        [lang, t]
    );

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};


