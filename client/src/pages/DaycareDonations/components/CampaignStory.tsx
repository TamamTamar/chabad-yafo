import { HeartHandshake } from "lucide-react";
import type { DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";
import GeneralDonationCard from "./GeneralDonationCard";

type CampaignStoryProps = {
    onDonate: (selection: DonationSelection) => void;
    generalRaised: number;
};

const CampaignStory = ({
    onDonate,
    generalRaised,
}: CampaignStoryProps) => (
    <section className={styles.storySection}>
        <div className={styles.storyContent}>
            <p className={styles.sectionEyebrow}>החזון מתחיל לקבל צורה</p>
            <h2>כל פינה כאן תהפוך לחלק מהיום־יום של הילדים</h2>
            <p>
                כל קיר שנצבע, כל פינה בטוחה וכל משחק שנכניס למעון
                יהפכו למקום שבו ילדי יפו ירגישו בבית.
            </p>
            <p>
                אפשר לבחור חלק מסוים בפרויקט, או לתת לנו להפנות את
                התרומה למקום שבו היא נחוצה ביותר.
            </p>
            <span className={styles.storySignature}>
                <HeartHandshake aria-hidden="true" />
                יחד פותחים את הדלת
            </span>
            <GeneralDonationCard
                onDonate={onDonate}
                generalRaised={generalRaised}
            />
        </div>
    </section>
);

export default CampaignStory;
