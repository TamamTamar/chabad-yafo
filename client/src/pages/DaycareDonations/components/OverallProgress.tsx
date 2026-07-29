import { CheckCircle2, HeartHandshake } from "lucide-react";
import styles from "../DaycareDonations.module.scss";
import ProgressBar from "./ProgressBar";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

type OverallProgressProps = {
    goal: number;
    raised: number;
    completedItemsCount: number;
};

const OverallProgress = ({
    goal,
    raised,
    completedItemsCount,
}: OverallProgressProps) => {
    const progress = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

    return (
        <section className={styles.overallProgress} aria-label="התקדמות הקמפיין">
            <div className={styles.overallNumbers}>
                <div>
                    <span className={styles.overallRaised}>
                        ₪{formatCurrency(raised)}
                    </span>
                    <span className={styles.overallGoal}>
                        מתוך ₪{formatCurrency(goal)}
                    </span>
                </div>
                <span className={styles.overallPercent}>{progress}%</span>
            </div>

            <ProgressBar
                value={progress}
                label={`גויסו ${progress}% מתוך היעד הכללי`}
                size="large"
            />

            <div className={styles.overallMeta}>
                <span>
                    <HeartHandshake aria-hidden="true" />
                    כל תרומה מקרבת אותנו לפתיחה
                </span>
                <span>
                    <CheckCircle2 aria-hidden="true" />
                    {completedItemsCount} חלקים כבר הושלמו
                </span>
            </div>
        </section>
    );
};

export default OverallProgress;
