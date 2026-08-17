import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./DaycareDonations.module.scss";
import {
    CAMPAIGN_GOAL,
    categories as fallbackCategories,
    donationItems as fallbackItems,
    getDonationItemStatus,
} from "./daycareDonationsData";
import type {
    DaycareDonationCampaignData,
    DonationSelection,
} from "./types";
import {
    getDaycareDonationAmbassadorReference,
    getDaycareDonationCampaign,
} from "../../services/daycareDonationService";
import CampaignStory from "./components/CampaignStory";
import ClosingDonationSection from "./components/ClosingDonationSection";
import CompletedProjects from "./components/CompletedProjects";
import CategoryQuickNav from "./components/CategoryQuickNav";
import DaycareDonationsHero from "./components/DaycareDonationsHero";
import DonationCategorySection from "./components/DonationCategorySection";
import DonationModalPreview from "./components/DonationModalPreview";
import MobileDonationBar from "./components/MobileDonationBar";
import RecentDonors from "./components/RecentDonors";
import RecommendedDonationChoices from "./components/RecommendedDonationChoices";
import { ChevronDown } from "lucide-react";
import {
    extractAmbassadorRef,
    normalizeAmbassadorRef,
} from "./ambassadorLinks";

const defaultSelection: DonationSelection = {
    kind: "general",
    id: "general",
    title: "למקום שבו התרומה נדרשת ביותר",
};

const fallbackCampaign: DaycareDonationCampaignData = {
    slug: "daycare-2026",
    title: "מקימים יחד את מעון חב״ד יפו",
    goal: CAMPAIGN_GOAL,
    active: true,
    recommendedChoiceIds: [],
    // Keep the local preview usable when the API is temporarily unavailable.
    // Production still fails closed until the campaign is explicitly public.
    publicVisible: import.meta.env.DEV,
    paymentsEnabled: false,
    raised: 0,
    generalRaised: 0,
    donationCount: 0,
    recentDonations: [],
    categories: fallbackCategories,
    items: fallbackItems.map((item) => ({
        ...item,
        raised: 0,
        acceptingDonations: true,
        statusOverride: "auto",
    })),
    fieldUpdates: [
        {
            id: "kitchen-installed",
            title: "המטבח כבר במקום — עכשיו משלימים את התשתיות",
            description:
                "ארונות המטבח והמשטח כבר הותקנו. השלב הבא הוא להשלים את האינסטלציה והשירותים המותאמים לילדים, כדי שהחלל יהיה מוכן לשימוש יום־יומי.",
            itemId: "plumbing",
            published: true,
            publishedAt: "2026-08-17T00:00:00.000Z",
            imageUrl: "/daycare-donations/field-update-kitchen.jpg",
            imageAlt: "ארונות המטבח החדשים שהותקנו במעון",
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T00:00:00.000Z",
        },
    ],
};

const ambassadorStorageKey = "daycare-donations-ref";

const getAmbassadorCandidate = (ambassadorLink?: string) => {
    const pathValue = extractAmbassadorRef(ambassadorLink);
    const queryParameter = new URLSearchParams(window.location.search).get("ref");
    const queryValue = normalizeAmbassadorRef(queryParameter);
    return pathValue ?? queryValue;
};

const DaycareDonations = () => {
    const { ambassadorLink } = useParams<{ ambassadorLink?: string }>();
    const [ambassadorRef, setAmbassadorRef] = useState<string>();
    const [ambassadorLinkInvalid, setAmbassadorLinkInvalid] = useState(false);
    const [ambassadorLinkChecking, setAmbassadorLinkChecking] = useState(() =>
        Boolean(getAmbassadorCandidate(ambassadorLink))
    );
    const [selectedDonation, setSelectedDonation] =
        useState<DonationSelection>(defaultSelection);
    const [donationModalOpen, setDonationModalOpen] = useState(false);
    const [campaign, setCampaign] =
        useState<DaycareDonationCampaignData>(fallbackCampaign);
    const [campaignLoadFailed, setCampaignLoadFailed] = useState(false);

    const refreshCampaign = useCallback(() =>
        getDaycareDonationCampaign()
            .then((data) => {
                setCampaign(data);
                setCampaignLoadFailed(false);
            })
            .catch((error) => {
                console.error("Failed to load donation campaign:", error);
                setCampaignLoadFailed(true);
            }), []);

    useEffect(() => {
        void refreshCampaign();
    }, [refreshCampaign]);

    useEffect(() => {
        const candidate = getAmbassadorCandidate(ambassadorLink);
        if (!candidate) {
            let active = true;
            queueMicrotask(() => {
                if (!active) return;
                setAmbassadorRef(undefined);
                setAmbassadorLinkInvalid(ambassadorLink !== undefined);
                setAmbassadorLinkChecking(false);
            });
            try {
                window.sessionStorage.removeItem(ambassadorStorageKey);
            } catch {
                // Attribution still works without session storage.
            }
            return () => {
                active = false;
            };
        }

        let active = true;
        void getDaycareDonationAmbassadorReference(candidate)
            .then((reference) => {
                if (!active) return;
                setAmbassadorRef(reference.refCode);
                setAmbassadorLinkInvalid(false);
                setAmbassadorLinkChecking(false);
                try {
                    window.sessionStorage.setItem(
                        ambassadorStorageKey,
                        reference.refCode
                    );
                } catch {
                    // Attribution still works without session storage.
                }
                if (
                    ambassadorLink &&
                    reference.linkSlug &&
                    ambassadorLink !== reference.linkSlug
                ) {
                    window.history.replaceState(
                        null,
                        "",
                        `/daycare-donations/${reference.linkSlug}`
                    );
                }
            })
            .catch(() => {
                if (!active) return;
                setAmbassadorRef(undefined);
                setAmbassadorLinkInvalid(true);
                setAmbassadorLinkChecking(false);
                try {
                    window.sessionStorage.removeItem(ambassadorStorageKey);
                } catch {
                    // Nothing to clear.
                }
            });

        return () => {
            active = false;
        };
    }, [ambassadorLink]);

    const completedItemsCount = useMemo(
        () =>
            campaign.items.filter(
                (item) => getDonationItemStatus(item) === "complete"
            ).length,
        [campaign.items]
    );

    const openDonation = (selection: DonationSelection) => {
        if (ambassadorLinkChecking) return;
        setSelectedDonation(selection);
        setDonationModalOpen(true);
    };

    if (!campaign.publicVisible) {
        return (
            <main className={styles.page}>
                <div className={styles.contentShell}>
                    <p className={styles.campaignDataNotice} role="status">
                        קמפיין התרומות למעון נמצא כעת בהכנה ובבדיקות
                        אבטחה. הוא ייפתח לציבור רק לאחר אישור סופי.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <DaycareDonationsHero
                onDonate={openDonation}
                goal={campaign.goal}
                raised={campaign.raised}
                completedItemsCount={completedItemsCount}
            />

            <div className={styles.contentShell}>
                {campaignLoadFailed && (
                    <p className={styles.campaignDataNotice} role="status">
                        נתוני הקמפיין אינם זמינים כרגע. מוצגים היעדים ללא
                        סכומי תרומות.
                    </p>
                )}
                {ambassadorLinkChecking && (
                    <p className={styles.campaignDataNotice} role="status">
                        בודקים את הקישור האישי…
                    </p>
                )}
                <RecentDonors
                    donationCount={campaign.donationCount ?? 0}
                    donations={campaign.recentDonations ?? []}
                />
                {ambassadorLinkInvalid && (
                    <p className={styles.ambassadorStatus} role="status">
                        הקישור האישי לא זוהה; אפשר להמשיך בתרומה רגילה.
                    </p>
                )}
                <RecommendedDonationChoices
                    donationItems={campaign.items}
                    generalRaised={campaign.generalRaised}
                    recommendedChoiceIds={campaign.recommendedChoiceIds}
                    onDonate={openDonation}
                />
                <CampaignStory
                    onDonate={openDonation}
                    donationItems={campaign.items}
                    fieldUpdates={campaign.fieldUpdates}
                />

                <details className={styles.fullCatalog}>
                    <summary>
                        <span>
                            <strong>רוצים לבחור חלק מסוים במעון?</strong>
                            <small>
                                הצגת כל {campaign.items.length} הפרויקטים לפי
                                תחום
                            </small>
                        </span>
                        <ChevronDown aria-hidden="true" />
                    </summary>
                    <div className={styles.fullCatalogContent}>
                        <CategoryQuickNav categories={campaign.categories} />
                        <div className={styles.categories}>
                            {campaign.categories.map((category, index) => (
                                <DonationCategorySection
                                    key={category.id}
                                    category={category}
                                    donationItems={campaign.items}
                                    index={index}
                                    onDonate={openDonation}
                                />
                            ))}
                        </div>
                    </div>
                </details>

                <CompletedProjects
                    categories={campaign.categories}
                    donationItems={campaign.items}
                />
            </div>

            <ClosingDonationSection onDonate={openDonation} />

            {donationModalOpen && (
                <DonationModalPreview
                    open
                    initialSelection={selectedDonation}
                    donationItems={campaign.items}
                    paymentsEnabled={campaign.paymentsEnabled}
                    refCode={ambassadorRef}
                    onClose={() => setDonationModalOpen(false)}
                    onPaymentComplete={() => {
                        window.setTimeout(() => void refreshCampaign(), 1200);
                    }}
                />
            )}
            <MobileDonationBar onDonate={openDonation} />
        </main>
    );
};

export default DaycareDonations;
