import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../../../components/Container/Container";
import DaycareDashboard from "./components/DaycareDashboard";
import DaycareExpansion from "./components/DaycareExpansion";
import DaycareFinance from "./components/DaycareFinance";
import DaycareRegistrations from "./components/DaycareRegistrations";
import DaycareTasks from "./components/DaycareTasks";
import { getDaycareOverview } from "./daycareAdminService";
import styles from "./DaycareAdmin.module.scss";
import type { DaycareOverview } from "./types";

type DaycareAdminTab = "tasks" | "registrations" | "finance";

const daycareAdminTabs: Array<{
    id: DaycareAdminTab;
    label: string;
}> = [
    { id: "tasks", label: "משימות" },
    { id: "registrations", label: "רישום" },
    { id: "finance", label: "כספים" },
];

const DaycareAdmin = () => {
    const [overview, setOverview] = useState<DaycareOverview | null>(null);
    const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState<DaycareAdminTab>("tasks");

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
        loadOverview().catch((error) => {
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
                            onClick={() => setActiveTab(tab.id)}
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
                        <DaycareDashboard overview={overview} />
                        <DaycareExpansion overview={overview} />
                    </div>
                )}

                {activeTab === "registrations" && (
                    <div className={styles.tabPanel}>
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
            </Container>
        </main>
    );
};

export default DaycareAdmin;
