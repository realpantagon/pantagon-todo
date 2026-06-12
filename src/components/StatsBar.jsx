import styles from './StatsBar.module.css'

export default function StatsBar({ todos, todayCount }) {
  const total = todos.filter(t => !t.completed).length
  const done = todos.filter(t => t.completed).length
  const pct = todos.length > 0 ? Math.round((done / todos.length) * 100) : 0

  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <span className={styles.num}>{total}</span>
        <span className={styles.label}>รอทำ</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.num} ${styles.today}`}>{todayCount}</span>
        <span className={styles.label}>วันนี้</span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <span className={`${styles.num} ${styles.done}`}>{done}</span>
        <span className={styles.label}>เสร็จ</span>
      </div>
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.pct}>{pct}%</span>
      </div>
    </div>
  )
}
