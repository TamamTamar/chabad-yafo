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

  const dateLine = `${data.hebrewDate} · ${data.gregorianDate}`;

  return (
    <div className={cls} dir="rtl" aria-label="זמני שבת ביפו">
      <div className={styles.content}>
        <div className={styles.title}>{data.title}</div>
        <div className={styles.date}>{dateLine}</div>
      </div>

      <div className={styles.timesBox}>
        {data.events.map((event, index) => (
          <React.Fragment key={`${event.date}-${event.label}`}>
            {index > 0 && <div className={styles.divider} />}
            <div className={styles.timeItem}>
              <div className={styles.timeLabel}>{event.label}</div>
              <div className={styles.timeValue}>{event.time}</div>
              <div className={styles.date}>{event.date}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ShabbatTimesBadge;