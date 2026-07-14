import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Container from "../../components/Container/Container";
import { logoutAdmin } from "../../services/adminAuthService";
import AdminDaycareRegistrationsTab from "./components/AdminDaycareRegistrationsTab/AdminDaycareRegistrationsTab";
import AdminFamiliesTab from "./components/AdminFamiliesTab/AdminFamiliesTab";
import AdminPaymentsTab from "./components/AdminPaymentsTab/AdminPaymentsTab";
import AdminRebbeLettersTab from "./components/AdminRebbeLettersTab/AdminRebbeLettersTab";
import AdminProjectsTab from "./components/AdminProjectsTab/AdminProjectsTab";
import styles from "./AdminDashboard.module.scss";

type AdminTab = "projects" | "families" | "daycareRegistrations" | "rebbeLetters" | "payments";

const AdminDashboard = () => {
    const [searchParams] = useSearchParams();
    const initialTab: AdminTab =
        searchParams.get("tab") === "projects"
            ? "projects"
            : searchParams.get("tab") === "daycareRegistrations"
            ? "daycareRegistrations"
            : searchParams.get("tab") === "payments"
              ? "payments"
            : "families";
    const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutAdmin();
        navigate("/admin/login", { replace: true });
    };

    return (
        <main className={styles.page}>
            <Container>
                <section className={styles.header}>
                    <div>
                        <h1 className={styles.title}>
                            ניהול האתר
                        </h1>

                        <p className={styles.description}>
                            צפייה וניהול פניות מהאתר של בית חב״ד יפו.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={styles.logoutButton}
                        onClick={handleLogout}
                    >
                        יציאה
                    </button>
                </section>

                <nav className={styles.tabs} aria-label="לשוניות ניהול">
                    <button
                        type="button"
                        className={activeTab === "projects" ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab("projects")}
                    >
                        פרויקטים
                    </button>
                    <button
                        type="button"
                        className={styles.tab}
                        onClick={() => navigate("/admin/daycare")}
                    >
                        ניהול מעון
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "families"
                                ? styles.tabActive
                                : styles.tab
                        }
                        onClick={() => setActiveTab("families")}
                    >
                        משפחות
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "daycareRegistrations"
                                ? styles.tabActive
                                : styles.tab
                        }
                        onClick={() => setActiveTab("daycareRegistrations")}
                    >
                        מעון צפון יפו
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "rebbeLetters"
                                ? styles.tabActive
                                : styles.tab
                        }
                        onClick={() => setActiveTab("rebbeLetters")}
                    >
                        מכתבים לרבי
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "payments"
                                ? styles.tabActive
                                : styles.tab
                        }
                        onClick={() => setActiveTab("payments")}
                    >
                        כספים
                    </button>
                </nav>

                {activeTab === "projects" && <AdminProjectsTab />}
                {activeTab === "families" && <AdminFamiliesTab />}
                {activeTab === "daycareRegistrations" && (
                    <AdminDaycareRegistrationsTab />
                )}
                {activeTab === "rebbeLetters" && <AdminRebbeLettersTab />}
                {activeTab === "payments" && <AdminPaymentsTab />}
            </Container>
        </main>
    );
};

export default AdminDashboard;
