import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Container from "../../../components/Container/Container";
import DaycareDashboard from "./components/DaycareDashboard";
import DaycareExpansion from "./components/DaycareExpansion";
import DaycareFinance from "./components/DaycareFinance";
import DaycareRegistrations from "./components/DaycareRegistrations";
import DaycareTasks from "./components/DaycareTasks";
import DaycareAgreements from "./components/DaycareAgreements";
import { getDaycareOverview } from "./daycareAdminService";
import styles from "./DaycareAdmin.module.scss";
import type { DaycareOverview } from "./types";

type DaycareAdminTab = "tasks" | "registrations" | "finance" | "agreements";

const daycareAdminTabs: Array<{
    id: DaycareAdminTab;
    label: string;
}> = [
    { id: "tasks", label: "משימות" },
    { id: "registrations", label: "רישום" },
    { id: "finance", label: "כספים" },
    { id: "agreements", label: "הסכמים" },
];

const DaycareAdmin = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [overview, setOverview] = useState<DaycareOverview | null>(null);
    const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
    const requestedTab = searchParams.get("tab");
    const [activeTab, setActiveTab] = useState<DaycareAdminTab>(
        requestedTab === "registrations" || requestedTab === "finance" || requestedTab === "agreements"
            ? requestedTab
            : "tasks"
    );

    const selectTab = (tab: DaycareAdminTab) => {
        setActiveTab(tab);
        setSearchParams(tab === "tasks" ? {} : { tab });
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
                            מערכת מעקב פנימית לפתיחת מעון חב״ד יפו, מהיערכות
                            ראשונית ועד התרחבות במהלך השנה.
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
                            onChanged={handleDataChanged}
                            refreshKey={financeRefreshKey}
                        />
                    </div>
                )}

                {activeTab === "agreements" && (
                    <div className={styles.tabPanel}>
                        <DaycareAgreements />
                    </div>
                )}
            </Container>
        </main>
    );
};

export default DaycareAdmin;
