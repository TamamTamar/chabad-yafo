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
    const progress = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
    const roundedProgress = Math.round(progress);
    const progressLabel =
        raised > 0 && progress < 1 ? "פחות מ־1%" : `${roundedProgress}%`;
    const accessibleProgressLabel =
        raised > 0 && progress < 1
            ? "גויסו פחות מאחוז אחד מתוך היעד הכללי"
            : `גויסו ${roundedProgress}% מתוך היעד הכללי`;

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
                {raised > 0 && (
                    <span className={styles.overallPercent}>{progressLabel}</span>
                )}
            </div>

            <ProgressBar
                value={progress}
                label={accessibleProgressLabel}
                size="large"
            />

            <div className={styles.overallMeta}>
                <span>
                    <HeartHandshake aria-hidden="true" />
                    כל תרומה מקרבת אותנו לפתיחה
                </span>
                {completedItemsCount > 0 && (
                    <span>
                        <CheckCircle2 aria-hidden="true" />
                        {completedItemsCount === 1
                            ? "חלק אחד כבר הושלם"
                            : `${completedItemsCount} חלקים כבר הושלמו`}
                    </span>
                )}
            </div>
        </section>
    );
};

export default OverallProgress;
