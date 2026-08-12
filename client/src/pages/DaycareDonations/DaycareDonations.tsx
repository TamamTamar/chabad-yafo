import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getDaycareDonationCampaign } from "../../services/daycareDonationService";
import CampaignStory from "./components/CampaignStory";
import ClosingDonationSection from "./components/ClosingDonationSection";
import CompletedProjects from "./components/CompletedProjects";
import CategoryQuickNav from "./components/CategoryQuickNav";
import DaycareDonationsHero from "./components/DaycareDonationsHero";
import DonationCategorySection from "./components/DonationCategorySection";
import DonationModalPreview from "./components/DonationModalPreview";
import MobileDonationBar from "./components/MobileDonationBar";

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
    publicVisible: false,
    paymentsEnabled: false,
    raised: 0,
    generalRaised: 0,
    categories: fallbackCategories,
    items: fallbackItems.map((item) => ({
        ...item,
        raised: 0,
        acceptingDonations: true,
        statusOverride: "auto",
    })),
};

const ambassadorStorageKey = "daycare-donations-ref";
const validAmbassadorRef = /^[a-z0-9]{4,32}$/;

const getPersistedAmbassadorRef = () => {
    const queryValue = new URLSearchParams(window.location.search)
        .get("ref")
        ?.trim()
        .toLowerCase();
    try {
        if (queryValue !== undefined) {
            if (queryValue && validAmbassadorRef.test(queryValue)) {
                window.sessionStorage.setItem(ambassadorStorageKey, queryValue);
                return queryValue;
            }
            window.sessionStorage.removeItem(ambassadorStorageKey);
            return undefined;
        }
        window.sessionStorage.removeItem(ambassadorStorageKey);
        return undefined;
    } catch {
        return queryValue && validAmbassadorRef.test(queryValue)
            ? queryValue
            : undefined;
    }
};

const DaycareDonations = () => {
    const [ambassadorRef] = useState(getPersistedAmbassadorRef);
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

    const completedItemsCount = useMemo(
        () =>
            campaign.items.filter(
                (item) => getDonationItemStatus(item) === "complete"
            ).length,
        [campaign.items]
    );

    const openDonation = (selection: DonationSelection) => {
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
                <CampaignStory
                    onDonate={openDonation}
                    generalRaised={campaign.generalRaised}
                />
                <CategoryQuickNav categories={campaign.categories} />

                <div id="campaign-parts" className={styles.categories}>
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
