import { useEffect, useState } from "react";
import { getAllRebbeLetters, updateRebbeLetterStatus } from "../../../../services/adminService";
import type { RebbeLetterAdmin, RebbeLetterStatus } from "../../../../types/chabad";
import styles from "./AdminRebbeLettersTab.module.scss";


const AdminRebbeLettersTab = () => {
    const [letters, setLetters] = useState<RebbeLetterAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLetters = async () => {
            try {
                const data = await getAllRebbeLetters();
                setLetters(data);
            } finally {
                setLoading(false);
            }
        };

        fetchLetters();
    }, []);

    const handleStatusChange = async (
        id: string,
        status: RebbeLetterStatus
    ) => {
        const updatedLetter = await updateRebbeLetterStatus(id, status);

        setLetters((prev) =>
            prev.map((letter) =>
                letter._id === id ? updatedLetter : letter
            )
        );
    };

    if (loading) {
        return <div className={styles.loading}>טוען...</div>;
    }

    

    return (
        <section className={styles.card}>
            {letters.length === 0 ? (
                <div className={styles.empty}>עדיין אין מכתבים</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>שם מלא</th>
                                <th>שם האם</th>
                                <th>טלפון</th>
                                <th>אימייל</th>
                                <th>תוכן המכתב</th>
                                <th>עדכונים</th>
                                <th>סטטוס</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>

                        <tbody>
                            {letters.map((letter) => (
                                <tr key={letter._id}>
                                    <td>{letter.fullName}</td>
                                    <td>{letter.motherName}</td>
                                    <td className={styles.phone}>{letter.phone || "-"}</td>
                                    <td>{letter.email || "-"}</td>
                                    <td className={styles.letterText}>{letter.letter || "-"}</td>
                                    <td>{letter.wantsUpdates ? "כן" : "לא"}</td>
                                    <td>
                                        <select
                                            className={styles.statusSelect}
                                            value={letter.status}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    letter._id,
                                                    event.target.value as RebbeLetterStatus
                                                )
                                            }
                                        >
                                            <option value="new">חדש</option>
                                            <option value="printed">הודפס</option>
                                            <option value="sentToOhel">נשלח לאוהל</option>
                                            <option value="handled">טופל</option>
                                        </select>
                                    </td>
                                    <td>
                                        {letter.createdAt
                                            ? new Date(letter.createdAt).toLocaleDateString("he-IL")
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

export default AdminRebbeLettersTab;