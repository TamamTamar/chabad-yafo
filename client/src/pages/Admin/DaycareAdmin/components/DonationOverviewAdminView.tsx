import { AdminButton, AdminCard } from "../../../../components/AdminUI";
import styles from "./DaycareDonationsAdmin.module.scss";
import type { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

type Props = { model: ReturnType<typeof useDaycareDonationsAdmin> };

const DonationOverviewAdminView = ({ model }: Props) => {
    if (!model.campaign) return null;

    const {
        campaign, records, saving, activeView,
        setActiveView, handleCampaignUpdate, formatCurrency, formatDate,
        statusLabels,
    } = model;

    return (
        <>
            {activeView === "overview" && (
            <>
            <section className={styles.panel}><AdminCard>
                <header>
                    <h2>הגדרות ויעדים</h2>
                    <p>
                        יעד הקמפיין ויעדי הקטגוריות מחושבים אוטומטית
                        מסכום יעדי הסעיפים.
                    </p>
                </header>
                <form
                    className={styles.campaignForm}
                    onSubmit={handleCampaignUpdate}
                >
                    <p>
                        יעד מחושב:{" "}
                        <strong>₪{formatCurrency(campaign.goal)}</strong>
                    </p>
                    <label className={styles.checkboxLabel}>
                        <input
                            name="active"
                            type="checkbox"
                            defaultChecked={campaign.active}
                        />
                        הקמפיין פתוח לתרומות
                    </label>
                    <AdminButton variant="primary" type="submit" disabled={saving}>
                        שמירת מצב הקמפיין
                    </AdminButton>
                </form>
                <div className={styles.categoryList}>
                    {campaign.categories.map((category) => (
                        <div
                            className={styles.categoryRow}
                            key={category.id}
                        >
                            <div>
                                <strong>{category.title}</strong>
                                <span>
                                    גויסו ₪
                                    {formatCurrency(
                                        campaign.items
                                            .filter(
                                                (item) =>
                                                    item.categoryId ===
                                                    category.id
                                            )
                                            .reduce(
                                                (sum, item) =>
                                                    sum + item.raised,
                                                0
                                            )
                                    )}
                                </span>
                            </div>
                            <strong>
                                יעד מחושב ₪
                                {formatCurrency(category.goal)}
                            </strong>
                        </div>
                    ))}
                </div>
            </AdminCard></section>
            <section className={styles.panel}><AdminCard>
                <header>
                    <h2>עבודה שוטפת</h2>
                    <p>הפעולות הנפוצות נמצאות במרחק לחיצה אחת.</p>
                </header>
                <div className={styles.quickActions}>
                    <AdminButton
                        type="button"
                        onClick={() => setActiveView("records")}
                    >
                        <strong>צפייה בתרומות</strong>
                        <small>{records.length} רשומות</small>
                    </AdminButton>
                    <AdminButton
                        type="button"
                        onClick={() => setActiveView("manual")}
                    >
                        <strong>הוספת תרומה ידנית</strong>
                        <small>מזומן, צ׳ק או העברה</small>
                    </AdminButton>
                    <AdminButton
                        type="button"
                        onClick={() => setActiveView("items")}
                    >
                        <strong>עריכת סעיפים</strong>
                        <small>{campaign.items.length} סעיפים</small>
                    </AdminButton>
                </div>
                <div className={styles.recentRecords}>
                    <div>
                        <h3>תרומות אחרונות</h3>
                        {records.length > 5 && (
                            <AdminButton
                                type="button"
                                onClick={() => setActiveView("records")}
                            >
                                לכל התרומות
                            </AdminButton>
                        )}
                    </div>
                    {records.length === 0 ? (
                        <p className={styles.emptyState}>
                            התרומה הראשונה שתתקבל תופיע כאן.
                        </p>
                    ) : (
                        <ul>
                            {records.slice(0, 5).map((record) => (
                                <li key={record._id}>
                                    <div>
                                        <strong>
                                            {record.donorName ||
                                                "תורם אנונימי"}
                                        </strong>
                                        <span>
                                            {formatDate(record.receivedAt)}
                                        </span>
                                    </div>
                                    <strong>
                                        ₪{formatCurrency(record.amount)}
                                    </strong>
                                    <span>{statusLabels[record.status]}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </AdminCard></section>
            </>
            )}

        </>
    );
};

export default DonationOverviewAdminView;
