import React, { useEffect, useState } from "react";
import styles from "./ShabbatTimesBadge.module.scss";
import { fetchShabbatTimes } from "../../services/shabbatTimesService";
import type { ShabbatTimes } from "../../types/chabad";

type Props = {
  variant?: "topbar" | "card";
};

const ShabbatTimesBadge: React.FC<Props> = ({ variant = "topbar" }) => {
  const [data, setData] = useState<ShabbatTimes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const res = await fetchShabbatTimes();
        if (mounted) setData(res);
      } catch (e: unknown) {
        console.error("Shabbat times error:", e);
        const message =
          e instanceof Error ? e.message : "שגיאה בטעינת זמני שבת";

        if (mounted) setError(message);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const cls =
    variant === "card"
      ? `${styles.wrap} ${styles.card}`
      : `${styles.wrap} ${styles.topbar}`;

  if (error) {
    return (
      <div className={cls} dir="rtl" aria-label="זמני שבת ביפו">
        <span className={styles.error}>שבת: {error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cls} dir="rtl" aria-label="זמני שבת ביפו">
        <span className={styles.loading}>טוען זמני שבת…</span>
      </div>
    );
  }

  const parashaClean = data.parasha?.replace(/^פרשת\s+/, "") ?? "";
  const dateLine = `${data.hebrewDate} · ${data.gregorianDate}`;
  const titleText = parashaClean
    ? `שבת פרשת ${parashaClean} ביפו`
    : "זמני שבת וחג ביפו";

  return (
    <div className={cls} dir="rtl" aria-label="זמני שבת ביפו">
      <div className={styles.content}>
        <div className={styles.title}>{titleText}</div>
        <div className={styles.date}>{dateLine}</div>
      </div>

      <div className={styles.timesBox}>
        <div className={styles.timeItem}>
          <div className={styles.timeLabel}>כניסה</div>
          <div className={styles.timeValue}>{data.candles}</div>
        </div>

        <div className={styles.divider} />

        <div className={styles.timeItem}>
          <div className={styles.timeLabel}>יציאה</div>
          <div className={styles.timeValue}>{data.havdalah}</div>
        </div>
      </div>
    </div>
  );
};

export default ShabbatTimesBadge;