import type { DonationCategory } from "../types";
import styles from "../DaycareDonations.module.scss";

const categoryLabels: Record<string, string> = {
    renovation: "שיפוץ ותשתיות",
    kitchen: "מטבח",
    yard: "חצר",
    equipment: "ריהוט",
    completion: "השלמות",
};

type CategoryQuickNavProps = {
    categories: DonationCategory[];
};

const CategoryQuickNav = ({ categories }: CategoryQuickNavProps) => (
    <nav className={styles.categoryQuickNav} aria-label="מעבר מהיר בין קטגוריות">
        <span>קפיצה מהירה:</span>
        <div>
            {categories.map((category) => (
                <a key={category.id} href={`#category-${category.id}`}>
                    {category.shortTitle ??
                        categoryLabels[category.id] ??
                        category.title}
                </a>
            ))}
        </div>
    </nav>
);

export default CategoryQuickNav;
