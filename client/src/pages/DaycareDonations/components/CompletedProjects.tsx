import { CheckCircle2 } from "lucide-react";
import { getDonationItemStatus } from "../daycareDonationsData";
import type { DonationCategory, DonationItem } from "../types";
import styles from "../DaycareDonations.module.scss";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

type CompletedProjectsProps = {
    categories: DonationCategory[];
    donationItems: DonationItem[];
};

const CompletedProjects = ({
    categories,
    donationItems,
}: CompletedProjectsProps) => {
    const completedItems = donationItems.filter(
        (item) => getDonationItemStatus(item) === "complete"
    );

    if (completedItems.length === 0) return null;

    return (
        <section
            className={styles.completedSection}
            aria-labelledby="completed-projects-title"
        >
            <div className={styles.completedHeading}>
                <p className={styles.sectionEyebrow}>השותפות כבר פועלת</p>
                <h2 id="completed-projects-title">הושלם בזכותכם</h2>
                <p>
                    החלקים שכבר הושלמו מזכירים לנו כמה רחוק אפשר להגיע
                    כשבונים יחד.
                </p>
            </div>
            <div className={styles.completedGrid}>
                {completedItems.map((item) => {
                    const category = categories.find(
                        (entry) => entry.id === item.categoryId
                    );

                    return (
                        <article className={styles.completedItem} key={item.id}>
                            <div>
                                <span>{category?.title}</span>
                                <h3>{item.title}</h3>
                                <strong>
                                    <CheckCircle2 aria-hidden="true" />
                                    ₪{formatCurrency(item.goal)} הושלמו
                                </strong>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default CompletedProjects;
