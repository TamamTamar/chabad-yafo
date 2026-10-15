import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminPageHeader from "../../../components/AdminShell/AdminPageHeader";
import { resolveAdminLocation } from "../../../components/AdminNavigation/adminNavigationConfig";
import DaycareDashboard from "./components/DaycareDashboard";
import DaycareExpansion from "./components/DaycareExpansion";
import DaycareFinance from "./components/DaycareFinance";
import DaycareRegistrations from "./components/DaycareRegistrations";
import DaycareTasks from "./components/DaycareTasks";
import DaycareAgreements from "./components/DaycareAgreements";
import DaycareParentDocuments from "./components/DaycareParentDocuments";
import DaycareAnnualPlanEditor from "./components/DaycareAnnualPlan";
import DaycareDonationsAdmin from "./components/DaycareDonationsAdmin";
import { getDaycareOverview } from "./daycareAdminService";
import styles from "./DaycareAdmin.module.scss";
import type { DaycareOverview } from "./types";

type DaycareAdminTab =
    | "tasks"
    | "registrations"
    | "finance"
    | "donations"
    | "documents";
type DocumentTab = "welcome" | "routine" | "holidays" | "menu" | "equipment" | "annual-plan" | "agreements";

const documentTabs: Array<{ id: DocumentTab; label: string }> = [
    { id: "welcome", label: "ברוכים הבאים" },
    { id: "routine", label: "סדר יום" },
    { id: "holidays", label: "לוח חופשות" },
    { id: "menu", label: "תפריט" },
    { id: "equipment", label: "ציוד אישי" },
    { id: "annual-plan", label: "תוכנית לימודים שנתית" },
    { id: "agreements", label: "הסכם התקשרות" },
];

const DaycareAdmin = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [overview, setOverview] = useState<DaycareOverview | null>(null);
    const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
    const requestedTab = searchParams.get("tab");
    const requestedParentInfoTab = searchParams.get("section");
    const activeTab: DaycareAdminTab =
        requestedTab === "tasks" ||
        requestedTab === "registrations" ||
        requestedTab === "finance" ||
        requestedTab === "donations" ||
        requestedTab === "documents"
            ? requestedTab
            : requestedTab === "agreements"
                ? "documents"
            : "registrations";
    const documentTab: DocumentTab =
        requestedTab === "agreements" || requestedParentInfoTab === "agreements"
            ? "agreements"
            : requestedParentInfoTab === "welcome" || requestedParentInfoTab === "routine" || requestedParentInfoTab === "holidays" || requestedParentInfoTab === "menu" || requestedParentInfoTab === "equipment" || requestedParentInfoTab === "annual-plan"
                ? requestedParentInfoTab
                : "annual-plan";

    const selectDocumentTab = (tab: DocumentTab) => {
        setSearchParams({ tab: "documents", section: tab });
    };

    const loadOverview = async () => {
        const data = await getDaycareOverview();
        setOverview(data);
    };

    const handleDataChanged = () => {
        setFinanceRefreshKey((currentKey) => currentKey + 1);
        return loadOverview();
    };

    const handleFinanceChanged = () => {
        setFinanceRefreshKey((currentKey) => currentKey + 1);
    };

    const handleFinanceSaved = () => {
        void loadOverview();
    };

    useEffect(() => {
        void getDaycareOverview()
            .then(setOverview)
            .catch((error) => {
                console.error("Failed to load daycare overview:", error);
            });
    }, []);

    return (
        <main className={styles.page}>

                {activeTab !== "registrations" && activeTab !== "tasks" && <AdminPageHeader title={resolveAdminLocation('/admin/daycare', `?${searchParams}`).title} />}

                {activeTab === "tasks" && (
                    <div className={styles.tabPanel}>
                        <DaycareTasks
                            onChanged={handleDataChanged}
                            onFinanceChanged={handleFinanceChanged}
                        />
                        <DaycareExpansion overview={overview} />
                    </div>
                )}

                {activeTab === "registrations" && (
                    <div className={styles.tabPanel}>
                        <DaycareRegistrations onChanged={handleDataChanged} openingSummary={<DaycareDashboard overview={overview} compact />} />
                        <DaycareDashboard overview={overview} secondary />
                    </div>
                )}

                {activeTab === "finance" && (
                    <div className={styles.tabPanel}>
                        <DaycareFinance
                            onChanged={handleFinanceSaved}
                            refreshKey={financeRefreshKey}
                        />
                    </div>
                )}

                {activeTab === "donations" && (
                    <div className={styles.tabPanel}>
                        <DaycareDonationsAdmin />
                    </div>
                )}

                {activeTab === "documents" && (
                    <div className={styles.tabPanel}>
                        <nav className={styles.innerTabBar} aria-label="בחירת מסמך לעריכה">
                            {documentTabs.map((tab) => (
                                <button
                                    aria-pressed={documentTab === tab.id}
                                    className={documentTab === tab.id ? styles.innerTabButtonActive : styles.innerTabButton}
                                    key={tab.id}
                                    type="button"
                                    onClick={() => selectDocumentTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        {documentTab === "agreements"
                            ? <DaycareAgreements />
                            : documentTab === "annual-plan"
                                ? <DaycareAnnualPlanEditor />
                                : <DaycareParentDocuments visibleDocument={documentTab} />}
                    </div>
                )}

        </main>
    );
};

export default DaycareAdmin;
