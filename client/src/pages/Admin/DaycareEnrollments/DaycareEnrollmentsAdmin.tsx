import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Container from "../../../components/Container/Container";
import {
    getDaycareEnrollments,
    updateDaycareEnrollmentStatus,
} from "../../../services/daycareEnrollmentService";
import {
    daycareEnrollmentStatusLabels,
    type DaycareEnrollmentAdmin,
    type DaycareEnrollmentStatus,
} from "../../../types/daycareEnrollment";
import { enrollmentStatuses } from "../../DaycareEnrollment/daycareEnrollmentOptions";
import { getAgeLabel } from "../../DaycareEnrollment/daycareEnrollmentUtils";
import styles from "./DaycareEnrollmentsAdmin.module.scss";

const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString("he-IL") : "-";

const searchableText = (enrollment: DaycareEnrollmentAdmin) =>
    [
        enrollment.child.firstName,
        enrollment.child.lastName,
        enrollment.child.israeliId,
        enrollment.parents.motherName,
        enrollment.parents.motherPhone,
        enrollment.parents.fatherName,
        enrollment.parents.fatherPhone,
        enrollment.parents.motherEmail,
        enrollment.parents.fatherEmail,
    ]
        .join(" ")
        .toLowerCase();

const DaycareEnrollmentsAdmin = () => {
    const [enrollments, setEnrollments] = useState<DaycareEnrollmentAdmin[]>([]);
    const [selectedEnrollment, setSelectedEnrollment] =
        useState<DaycareEnrollmentAdmin | null>(null);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | DaycareEnrollmentStatus>(
        "all"
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        getDaycareEnrollments()
            .then(setEnrollments)
            .catch(() => setError("לא הצלחנו לטעון את ההרשמות הישנות"))
            .finally(() => setLoading(false));
    }, []);

    const filteredEnrollments = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return enrollments.filter((enrollment) => {
            const matchesQuery =
                !normalizedQuery || searchableText(enrollment).includes(normalizedQuery);
            const matchesStatus =
                statusFilter === "all" || enrollment.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [enrollments, query, statusFilter]);

    const handleStatusChange = async (
        enrollmentId: string,
        status: DaycareEnrollmentStatus
    ) => {
        setUpdatingId(enrollmentId);
        try {
            const updatedEnrollment = await updateDaycareEnrollmentStatus(
                enrollmentId,
                status
            );
            setEnrollments((current) =>
                current.map((enrollment) =>
                    enrollment._id === enrollmentId ? updatedEnrollment : enrollment
                )
            );
            setSelectedEnrollment((current) =>
                current?._id === enrollmentId ? updatedEnrollment : current
            );
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <main className={styles.page} dir="rtl">
            <Container>
                <section className={styles.header}>
                    <div>
                        <span className={styles.eyebrow}>ניהול מעון · Legacy</span>
                        <h1 className={styles.title}>הרשמות מלאות ישנות</h1>
                        <p className={styles.description}>
                            מסך זה מיועד לצפייה בטפסים הישנים בלבד. פתיחת תיק
                            הצטרפות חדש מתבצעת בטאב „רישום” במסך ניהול המעון.
                        </p>
                    </div>
                </section>

                <section className={styles.toolbar}>
                    <label>
                        חיפוש
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="שם ילד, הורה, טלפון או תעודת זהות"
                        />
                    </label>
                    <label>
                        סטטוס
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value as
                                        | "all"
                                        | DaycareEnrollmentStatus
                                )
                            }
                        >
                            <option value="all">כל הסטטוסים</option>
                            {enrollmentStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {daycareEnrollmentStatusLabels[status]}
                                </option>
                            ))}
                        </select>
                    </label>
                </section>

                {loading ? (
                    <div className={styles.empty}>טוען הרשמות...</div>
                ) : error ? (
                    <div className={styles.empty}>{error}</div>
                ) : filteredEnrollments.length === 0 ? (
                    <div className={styles.empty}>לא נמצאו הרשמות מתאימות</div>
                ) : (
                    <section className={styles.card}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>שם הילד/ה</th>
                                        <th>תעודת זהות</th>
                                        <th>גיל</th>
                                        <th>שם אם</th>
                                        <th>טלפון אם</th>
                                        <th>שם אב</th>
                                        <th>טלפון אב</th>
                                        <th>סטטוס</th>
                                        <th>תאריך שליחה</th>
                                        <th>כרטיס</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEnrollments.map((enrollment) => (
                                        <tr key={enrollment._id}>
                                            <td>
                                                {enrollment.child.firstName}{" "}
                                                {enrollment.child.lastName}
                                            </td>
                                            <td className={styles.ltr}>
                                                {enrollment.child.israeliId}
                                            </td>
                                            <td>{getAgeLabel(enrollment.child.birthDate)}</td>
                                            <td>{enrollment.parents.motherName}</td>
                                            <td className={styles.ltr}>
                                                {enrollment.parents.motherPhone}
                                            </td>
                                            <td>{enrollment.parents.fatherName}</td>
                                            <td className={styles.ltr}>
                                                {enrollment.parents.fatherPhone}
                                            </td>
                                            <td>
                                                <select
                                                    className={styles.statusSelect}
                                                    disabled={updatingId === enrollment._id}
                                                    value={enrollment.status}
                                                    onChange={(event) =>
                                                        handleStatusChange(
                                                            enrollment._id,
                                                            event.target
                                                                .value as DaycareEnrollmentStatus
                                                        )
                                                    }
                                                >
                                                    {enrollmentStatuses.map((status) => (
                                                        <option key={status} value={status}>
                                                            {
                                                                daycareEnrollmentStatusLabels[
                                                                    status
                                                                ]
                                                            }
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{formatDate(enrollment.createdAt)}</td>
                                            <td>
                                                <button
                                                    className={styles.openButton}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedEnrollment(enrollment)
                                                    }
                                                >
                                                    פתיחה
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </Container>

            {selectedEnrollment && (
                <div
                    className={styles.modalOverlay}
                    role="presentation"
                    onClick={() => setSelectedEnrollment(null)}
                >
                    <section
                        className={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="enrollment-card-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.modalHeader}>
                            <div>
                                <span className={styles.eyebrow}>כרטיס Legacy</span>
                                <h2 id="enrollment-card-title">
                                    {selectedEnrollment.child.firstName}{" "}
                                    {selectedEnrollment.child.lastName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                className={styles.closeButton}
                                onClick={() => setSelectedEnrollment(null)}
                            >
                                סגירה
                            </button>
                        </div>

                        <div className={styles.detailGrid}>
                            <Detail title="פרטי הילד/ה">
                                <p>ת.ז: {selectedEnrollment.child.israeliId}</p>
                                <p>
                                    תאריך לידה: {formatDate(selectedEnrollment.child.birthDate)}
                                </p>
                                <p>כתובת: {selectedEnrollment.child.address}</p>
                                <p>קופת חולים: {selectedEnrollment.medical.healthFund}</p>
                                <p>שפה בבית: {selectedEnrollment.child.homeLanguage}</p>
                            </Detail>

                            <Detail title="הורים">
                                <p>
                                    אם: {selectedEnrollment.parents.motherName},{" "}
                                    {selectedEnrollment.parents.motherPhone}
                                </p>
                                <p>{selectedEnrollment.parents.motherEmail}</p>
                                <p>
                                    אב: {selectedEnrollment.parents.fatherName},{" "}
                                    {selectedEnrollment.parents.fatherPhone}
                                </p>
                                <p>{selectedEnrollment.parents.fatherEmail}</p>
                                <p>
                                    כתובת אחרת:{" "}
                                    {selectedEnrollment.parents.differentParentAddress || "-"}
                                </p>
                            </Detail>

                            <Detail title="אנשי קשר לשעת חירום">
                                {selectedEnrollment.emergencyContacts.map((contact) => (
                                    <p key={`${contact.fullName}-${contact.phone}`}>
                                        {contact.fullName} | {contact.relation} | {contact.phone}
                                    </p>
                                ))}
                            </Detail>

                            <Detail title="מידע רפואי">
                                <p>אלרגיות: {selectedEnrollment.medical.allergies || "-"}</p>
                                <p>
                                    רגישויות מזון:{" "}
                                    {selectedEnrollment.medical.foodSensitivities || "-"}
                                </p>
                                <p>
                                    תרופות קבועות:{" "}
                                    {selectedEnrollment.medical.regularMedications || "-"}
                                </p>
                                <p>
                                    מגבלות:{" "}
                                    {selectedEnrollment.medical.medicalLimitations || "-"}
                                </p>
                                <p>
                                    רופא ילדים:{" "}
                                    {selectedEnrollment.medical.pediatricianName || "-"}
                                </p>
                                <p>
                                    הערות:{" "}
                                    {selectedEnrollment.medical.additionalNotes || "-"}
                                </p>
                            </Detail>

                            <Detail title="אישורים וחתימה">
                                <p>
                                    אישור מקדמת רישום:{" "}
                                    {selectedEnrollment.consents.registrationDeposit
                                        ? "כן"
                                        : "לא"}
                                </p>
                                <p>
                                    אישור עלות חודשית:{" "}
                                    {selectedEnrollment.consents.monthlyTuition ? "כן" : "לא"}
                                </p>
                                <p>
                                    צילום פנימי:{" "}
                                    {selectedEnrollment.consents.internalPhotos ? "כן" : "לא"}
                                </p>
                                <p>
                                    עדכוני וואטסאפ:{" "}
                                    {selectedEnrollment.consents.whatsappUpdates ? "כן" : "לא"}
                                </p>
                                <p>חותם/ת: {selectedEnrollment.signature.signerFullName}</p>
                                <p>
                                    תאריך חתימה:{" "}
                                    {formatDate(selectedEnrollment.signature.signedAt)}
                                </p>
                            </Detail>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
};

const Detail = ({
    children,
    title,
}: {
    children: React.ReactNode;
    title: string;
}) => (
    <section className={styles.detailCard}>
        <h3>{title}</h3>
        {children}
    </section>
);

export default DaycareEnrollmentsAdmin;
