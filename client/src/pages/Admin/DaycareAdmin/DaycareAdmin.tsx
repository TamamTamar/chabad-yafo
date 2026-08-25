import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Container from "../../../components/Container/Container";
import DaycareDashboard from "./components/DaycareDashboard";
import DaycareExpansion from "./components/DaycareExpansion";
import DaycareFinance from "./components/DaycareFinance";
import DaycareRegistrations from "./components/DaycareRegistrations";
import DaycareTasks from "./components/DaycareTasks";
import DaycareAgreements from "./components/DaycareAgreements";
import DaycareParentDocuments from "./components/DaycareParentDocuments";
import DaycareDonationsAdmin from "./components/DaycareDonationsAdmin";
import { getDaycareOverview } from "./daycareAdminService";
import styles from "./DaycareAdmin.module.scss";
import type { DaycareOverview } from "./types";

type DaycareAdminTab =
    | "tasks"
    | "registrations"
    | "finance"
    | "donations"
    | "parent-info";
type ParentInfoTab = "welcome" | "routine" | "holidays" | "menu" | "equipment" | "agreements";

const parentInfoTabs: Array<{ id: ParentInfoTab; label: string }> = [
    { id: "welcome", label: "ברוכים הבאים" },
    { id: "routine", label: "סדר יום" },
    { id: "holidays", label: "לוח חופשות" },
    { id: "menu", label: "תפריט" },
    { id: "equipment", label: "ציוד אישי" },
    { id: "agreements", label: "הסכם התקשרות" },
];

const daycareAdminTabs: Array<{
    id: DaycareAdminTab;
    label: string;
}> = [
    { id: "tasks", label: "משימות" },
    { id: "registrations", label: "רישום" },
    { id: "finance", label: "כספים" },
    { id: "donations", label: "תרומות" },
    { id: "parent-info", label: "מידע להורים" },
];

const DaycareAdmin = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [overview, setOverview] = useState<DaycareOverview | null>(null);
    const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
    const requestedTab = searchParams.get("tab");
    const requestedParentInfoTab = searchParams.get("section");
    const [activeTab, setActiveTab] = useState<DaycareAdminTab>(
        requestedTab === "registrations" ||
        requestedTab === "finance" ||
        requestedTab === "donations" ||
        requestedTab === "parent-info"
            ? requestedTab
            : requestedTab === "agreements"
                ? "parent-info"
            : "registrations"
    );
    const [parentInfoTab, setParentInfoTab] = useState<ParentInfoTab>(
        requestedTab === "agreements" || requestedParentInfoTab === "agreements"
            ? "agreements"
            : requestedParentInfoTab === "welcome" || requestedParentInfoTab === "routine" || requestedParentInfoTab === "holidays" || requestedParentInfoTab === "menu" || requestedParentInfoTab === "equipment"
                ? requestedParentInfoTab
                : "welcome"
    );

    const selectTab = (tab: DaycareAdminTab) => {
        setActiveTab(tab);
        setSearchParams(tab === "registrations" ? {} : tab === "parent-info" ? { tab, section: parentInfoTab } : { tab });
    };

    const selectParentInfoTab = (tab: ParentInfoTab) => {
        setParentInfoTab(tab);
        setSearchParams({ tab: "parent-info", section: tab });
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
            <Container>
                <header className={styles.hero}>
                    <div>
                        <span className={styles.eyebrow}>Admin</span>
                        <h1 className={styles.title}>ניהול מעון</h1>
                        <p className={styles.description}>
                            רישום משפחות, תיקי הצטרפות, תשלומים ומידע להורים במקום אחד.
                        </p>
                    </div>

                    <Link className={styles.secondaryLink} to="/admin/dashboard">
                        חזרה לניהול האתר
                    </Link>
                </header>

                <nav className={styles.tabBar} aria-label="ניווט ניהול מעון">
                    {daycareAdminTabs.map((tab) => (
                        <button
                            aria-pressed={activeTab === tab.id}
                            className={
                                activeTab === tab.id
                                    ? styles.tabButtonActive
                                    : styles.tabButton
                            }
                            key={tab.id}
                            type="button"
                            onClick={() => selectTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <label className={styles.tabSelect}>
                    אזור ניהול במעון
                    <select
                        value={activeTab}
                        onChange={(event) =>
                            selectTab(event.target.value as DaycareAdminTab)
                        }
                    >
                        {daycareAdminTabs.map((tab) => (
                            <option key={tab.id} value={tab.id}>
                                {tab.label}
                            </option>
                        ))}
                    </select>
                </label>

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
                        <DaycareDashboard overview={overview} />
                        <DaycareRegistrations onChanged={handleDataChanged} />
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

                {activeTab === "parent-info" && (
                    <div className={styles.tabPanel}>
                        <nav className={styles.innerTabBar} aria-label="ניהול מידע והסכמים להורים">
                            {parentInfoTabs.map((tab) => (
                                <button
                                    aria-pressed={parentInfoTab === tab.id}
                                    className={parentInfoTab === tab.id ? styles.innerTabButtonActive : styles.innerTabButton}
                                    key={tab.id}
                                    type="button"
                                    onClick={() => selectParentInfoTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                        {parentInfoTab === "agreements"
                            ? <DaycareAgreements />
                            : <DaycareParentDocuments visibleDocument={parentInfoTab} />}
                    </div>
                )}
            </Container>
        </main>
    );
};

export default DaycareAdmin;
