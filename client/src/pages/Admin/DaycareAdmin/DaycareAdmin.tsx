import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../../../components/Container/Container";
import DaycareDashboard from "./components/DaycareDashboard";
import DaycareDocuments from "./components/DaycareDocuments";
import DaycareExpansion from "./components/DaycareExpansion";
import DaycareFinance from "./components/DaycareFinance";
import DaycareRegistrations from "./components/DaycareRegistrations";
import DaycareTasks from "./components/DaycareTasks";
import { getDaycareOverview } from "./daycareAdminService";
import styles from "./DaycareAdmin.module.scss";
import type { DaycareOverview } from "./types";

const DaycareAdmin = () => {
    const [overview, setOverview] = useState<DaycareOverview | null>(null);

    const loadOverview = async () => {
        const data = await getDaycareOverview();
        setOverview(data);
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

                <DaycareDashboard overview={overview} />
                <DaycareExpansion overview={overview} />
                <DaycareTasks onChanged={loadOverview} />
                <DaycareRegistrations onChanged={loadOverview} />
                <DaycareFinance onChanged={loadOverview} />
                <DaycareDocuments />
            </Container>
        </main>
    );
};

export default DaycareAdmin;
