import React, { useEffect, useMemo, useState } from "react";
import styles from "../DonationCampaignPage.module.scss";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getCountdownParts = (targetMs: number) => {
  const now = Date.now();
  const diff = Math.max(0, targetMs - now);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, done: diff === 0 };
};

type Props = { targetSunsetIso: string };

const CampaignCountdownBar: React.FC<Props> = ({ targetSunsetIso }) => {
  const targetMs = useMemo(() => new Date(targetSunsetIso).getTime(), [targetSunsetIso]);
  const [countdown, setCountdown] = useState(() => getCountdownParts(targetMs));

  useEffect(() => {
    const id = window.setInterval(() => setCountdown(getCountdownParts(targetMs)), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  return (
    <section className={styles.countdownWrap} aria-label="ספירה לאחור">
      <div className={styles.countdownInner}>
        <div className={styles.countdownTitle}>תרמו עכשיו <br /> ובעוד...
        </div>

        <div className={styles.countdownGrid}>
          
          <div className={styles.timeBox}>
            <div className={styles.timeNum}>{pad2(countdown.seconds)}</div>
            <div className={styles.timeLbl}>שניות</div>
          </div>

          <div className={styles.timeBox}>
            <div className={styles.timeNum}>{pad2(countdown.minutes)}</div>
            <div className={styles.timeLbl}>דקות</div>
          </div>


          <div className={styles.timeBox}>
            <div className={styles.timeNum}>{pad2(countdown.hours)}</div>
            <div className={styles.timeLbl}>שעות</div>
          </div>

          <div className={styles.timeBox}>
            <div className={styles.timeNum}>{pad2(countdown.days)}</div>
            <div className={styles.timeLbl}>ימים</div>
          </div>
        </div>
        <div className={styles.countdownTitle}>תרומתכם תועבר למשפחות נזקקות</div>


        {countdown.done && <div className={styles.countdownDone}>הזמן הגיע</div>}
      </div>
    </section>
  );
};

export default CampaignCountdownBar;