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

const DaycareAdmin = () => {
    const [overview, setOverview] = useState<DaycareOverview | null>(null);
    const [financeRefreshKey, setFinanceRefreshKey] = useState(0);

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

                <DaycareTasks
                    onChanged={handleDataChanged}
                    onFinanceChanged={handleFinanceChanged}
                />
                <DaycareDashboard overview={overview} />
                <DaycareExpansion overview={overview} />
                <DaycareRegistrations onChanged={handleDataChanged} />
                <DaycareFinance
                    onChanged={handleDataChanged}
                    refreshKey={financeRefreshKey}
                />
            </Container>
        </main>
    );
};

export default DaycareAdmin;
