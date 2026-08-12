import { useEffect, useState } from "react";
import { getAllFamilies } from "../../../../services/adminService";
import type { FamilyAdmin } from "../../../../types/family";
import styles from "./AdminFamiliesTab.module.scss";

const AdminFamiliesTab = () => {
    const [families, setFamilies] = useState<FamilyAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFamilies = async () => {
            try {
                const data = await getAllFamilies();

                setFamilies(data);
            } catch (error) {
                console.error("Failed to fetch families:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFamilies();
    }, []);

    if (loading) {
        return <div className={styles.loading}>טוען...</div>;
    }

    return (
        <section className={styles.card}>
            {families.length === 0 ? (
                <div className={styles.empty}>
                    עדיין אין משפחות רשומות
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>שם הורה</th>
                                <th>טלפון</th>
                                <th>אזור</th>
                                <th>גילאי ילדים</th>
                                <th>תחומי עניין</th>
                                <th>מה חסר באזור</th>
                                <th>עדכונים</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>

                        <tbody>
                            {families.map((family) => (
                                <tr key={family._id}>
                                    <td data-label="שם הורה">{family.parentName}</td>

                                    <td className={styles.phone} data-label="טלפון">
                                        <span dir="ltr">{family.phone}</span>
                                    </td>

                                    <td data-label="אזור">{family.area}</td>

                                    <td data-label="גילאי ילדים">
                                        <div className={styles.tagList}>
                                            {family.ages.map((age) => (
                                                <span
                                                    key={age}
                                                    className={styles.tag}
                                                >
                                                    {age}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    <td data-label="תחומי עניין">
                                        <div className={styles.tagList}>
                                            {family.interests.map((interest) => (
                                                <span
                                                    key={interest}
                                                    className={styles.tag}
                                                >
                                                    {interest}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    <td data-label="מה חסר באזור">{family.missing || "-"}</td>

                                    <td data-label="עדכונים">
                                        <span
                                            className={
                                                family.updates
                                                    ? styles.yes
                                                    : styles.no
                                            }
                                        >
                                            {family.updates ? "כן" : "לא"}
                                        </span>
                                    </td>

                                    <td data-label="תאריך">
                                        {family.createdAt
                                            ? new Date(
                                                family.createdAt
                                            ).toLocaleDateString("he-IL")
                                            : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default AdminFamiliesTab;
