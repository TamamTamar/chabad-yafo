import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    trackDaycareCtaClick,
    trackDaycarePageView,
    trackDaycareWhatsAppClick,
    trackWhatsAppClick,
} from "../../services/googleAnalyticsService";
import MobileRegistrationBar from "./components/MobileRegistrationBar";
import ParentInfoContent from "./components/ParentInfoContent";
import ParentInfoCta from "./components/ParentInfoCta";
import ParentInfoHero from "./components/ParentInfoHero";
import ParentInfoSummary from "./components/ParentInfoSummary";
import ParentInfoTabs from "./components/ParentInfoTabs";
import {
    resolveParentInfoSection,
    type ParentInfoSectionId,
} from "./parentInfoConfig";
import styles from "./DaycareParentInfo.module.scss";
import { getCurrentDaycareParentDocuments, type DaycareParentDocumentBundle } from "../../services/daycareParentDocumentService";

const trackCta = (ctaText: string, location: string) => {
    trackDaycareCtaClick({
        location,
        cta_text: ctaText,
        content_name: "daycare_parent_info",
    });
};

const usePageMetadata = () => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = "מידע להורים | מעון חב״ד יפו";

        const existingMeta = document.querySelector<HTMLMetaElement>(
            'meta[name="robots"]'
        );
        const previousContent = existingMeta?.getAttribute("content");
        const meta = existingMeta ?? document.createElement("meta");

        meta.setAttribute("name", "robots");
        meta.setAttribute("content", "noindex, nofollow");

        if (!existingMeta) {
            document.head.appendChild(meta);
        }

        return () => {
            document.title = previousTitle;

            if (existingMeta && previousContent !== null) {
                existingMeta.setAttribute("content", previousContent);
            } else if (existingMeta) {
                existingMeta.removeAttribute("content");
            } else {
                meta.remove();
            }
        };
    }, []);
};

const DaycareParentInfo = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = resolveParentInfoSection(searchParams.get("section"));
    const [parentDocuments, setParentDocuments] = useState<DaycareParentDocumentBundle | null>();

    usePageMetadata();

    useEffect(() => {
        trackDaycarePageView({
            page_path: "/daycare-parent-info",
            content_name: "daycare_parent_info",
            gated: false,
        });
    }, []);

    useEffect(() => {
        let active = true;
        void getCurrentDaycareParentDocuments()
            .then((data) => { if (active) setParentDocuments(data); })
            .catch(() => { if (active) setParentDocuments(null); });
        return () => { active = false; };
    }, []);

    const handleTabChange = (section: ParentInfoSectionId) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("section", section);
        setSearchParams(nextParams, { replace: true });
    };

    const handleRegistrationClick = (location: string) => {
        trackCta("להמשך הרשמה", location);
    };

    const handleWhatsAppClick = (location: string) => {
        trackCta("לשיחה בוואטסאפ", location);
        trackWhatsAppClick({ location: `daycare_parent_info_${location}` });
        trackDaycareWhatsAppClick({ location });
    };

    return (
        <main className={styles.page} dir="rtl">
            <ParentInfoHero onRegistrationClick={handleRegistrationClick} parentDocuments={parentDocuments} />
            <div className={styles.mainContent}>
                <ParentInfoSummary />
            </div>
            <ParentInfoTabs activeTab={activeTab} onChange={handleTabChange} />
            <div className={styles.mainContent}>
                <ParentInfoContent activeTab={activeTab} parentDocuments={parentDocuments} />
                <ParentInfoCta
                    onRegistrationClick={handleRegistrationClick}
                    onWhatsAppClick={handleWhatsAppClick}
                />
            </div>
            <MobileRegistrationBar
                onRegistrationClick={handleRegistrationClick}
                onWhatsAppClick={handleWhatsAppClick}
            />
        </main>
    );
};

export default DaycareParentInfo;
