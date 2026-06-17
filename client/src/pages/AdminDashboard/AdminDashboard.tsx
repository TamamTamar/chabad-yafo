import { useState } from "react";
import Container from "../../components/Container/Container";
import AdminFamiliesTab from "./components/AdminFamiliesTab/AdminFamiliesTab";
import AdminRebbeLettersTab from "./components/AdminRebbeLettersTab/AdminRebbeLettersTab";
import styles from "./AdminDashboard.module.scss";

type AdminTab = "families" | "rebbeLetters";

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>("families");

    return (
        <main className={styles.page}>
            <Container>
                <section className={styles.header}>
                    <h1 className={styles.title}>
                        ניהול האתר
                    </h1>

                    <p className={styles.description}>
                        צפייה וניהול פניות מהאתר של בית חב״ד יפו.
                    </p>
                </section>

                <nav className={styles.tabs} aria-label="לשוניות ניהול">
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
                            activeTab === "rebbeLetters"
                                ? styles.tabActive
                                : styles.tab
                        }
                        onClick={() => setActiveTab("rebbeLetters")}
                    >
                        מכתבים לרבי
                    </button>
                </nav>

                {activeTab === "families" && <AdminFamiliesTab />}
                {activeTab === "rebbeLetters" && <AdminRebbeLettersTab />}
            </Container>
        </main>
    );
};

export default AdminDashboard;