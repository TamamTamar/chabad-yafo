import { useEffect, useState } from "react";

import Container from "../../components/Container/Container";
import { getAllFamilies } from "../../services/adminService";
import type { FamilyAdmin } from "../../types/family";

import styles from "./AdminFamilies.module.scss";

const AdminFamilies = () => {
    const [families, setFamilies] = useState<FamilyAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFamilies = async () => {
            try {
                const data = await getAllFamilies();
                setFamilies(data);
            } finally {
                setLoading(false);
            }
        };

        fetchFamilies();
    }, []);

    if (loading) {
        return (
            <div className={styles.page}>
                טוען...
            </div>
        );
    }

    return (
        <main className={styles.page}>
            <Container>
                <section className={styles.header}>
                    <h1 className={styles.title}>
                        משפחות שנרשמו
                    </h1>

                    <p className={styles.description}>
                        רשימת משפחות שהתעניינו בפעילות, חוגים ומסגרות חינוך של בית חב״ד יפו.
                    </p>
                </section>

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
                                            <td>{family.parentName}</td>

                                            <td className={styles.phone}>
                                                {family.phone}
                                            </td>

                                            <td>{family.area}</td>

                                            <td>
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

                                            <td>
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

                                            <td>
                                                {family.missing || "-"}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        family.updates
                                                            ? styles.yes
                                                            : styles.no
                                                    }
                                                >
                                                    {family.updates
                                                        ? "כן"
                                                        : "לא"}
                                                </span>
                                            </td>

                                            <td>
                                                {family.createdAt
                                                    ? new Date(
                                                        family.createdAt
                                                    ).toLocaleDateString(
                                                        "he-IL"
                                                    )
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </Container>
        </main>
    );
};

export default AdminFamilies;