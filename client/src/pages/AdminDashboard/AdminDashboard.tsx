import { useSearchParams } from "react-router-dom";
import AdminPageHeader from "../../components/AdminShell/AdminPageHeader";
import { resolveAdminLocation } from "../../components/AdminNavigation/adminNavigationConfig";
import AdminDaycareRegistrationsTab from "./components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab";
import AdminFamiliesTab from "./components/AdminFamiliesTab/AdminFamiliesTab";
import AdminPaymentsTab from "./components/AdminPaymentsTab/AdminPaymentsTab";
import AdminRebbeLettersTab from "./components/AdminRebbeLettersTab/AdminRebbeLettersTab";
import AdminProjectsTab from "./components/AdminProjectsTab/AdminProjectsTab";
import styles from "./AdminDashboard.module.scss";

type AdminTab = "projects" | "families" | "daycareRegistrations" | "rebbeLetters" | "payments";

const AdminDashboard = () => {
    const [searchParams] = useSearchParams();
    const activeTab: AdminTab =
        searchParams.get("tab") === "families"
            ? "families"
            : searchParams.get("tab") === "daycareRegistrations"
            ? "daycareRegistrations"
            : searchParams.get("tab") === "rebbeLetters"
            ? "rebbeLetters"
            : searchParams.get("tab") === "payments"
            ? "payments"
            : "projects";
    return (
        <main className={styles.page}>

                {activeTab !== "projects" && <AdminPageHeader title={resolveAdminLocation('/admin/dashboard', `?${searchParams}`).title} />}

                {activeTab === "projects" && <AdminProjectsTab />}
                {activeTab === "families" && <AdminFamiliesTab />}
                {activeTab === "daycareRegistrations" && (
                    <AdminDaycareRegistrationsTab />
                )}
                {activeTab === "rebbeLetters" && <AdminRebbeLettersTab />}
                {activeTab === "payments" && <AdminPaymentsTab />}

        </main>
    );
};

export default AdminDashboard;
