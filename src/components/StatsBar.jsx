import styles from './StatsBar.module.css'

export default function StatsBar({ todos, todayCount, overdueCount, onViewToggle, activeView }) {
  const pending = todos.filter(t => !t.completed).length
  const done    = todos.filter(t => t.completed).length
  const total   = todos.length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className={styles.wrap}>
      {/* Progress ring + main number */}
      <div className={styles.ringWrap}>
        <svg className={styles.ring} viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" className={styles.ringTrack}/>
          <circle cx="28" cy="28" r="22" className={styles.ringFill}
            style={{ strokeDashoffset: `${138.2 - (138.2 * pct / 100)}` }}/>
        </svg>
        <div className={styles.ringInner}>
          <span className={styles.ringPct}>{pct}<span className={styles.ringPctSign}>%</span></span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statRow}>
          <StatPill value={pending} label="pending"  color="var(--text2)" />
          <StatPill value={todayCount} label="today"  color="var(--accent2)" />
        </div>
        <div className={styles.statRow}>
          <StatPill value={overdueCount} label="overdue" color="var(--red)" dim={overdueCount > 0} />
          <StatPill value={done}    label="done"   color="var(--green)" />
        </div>
      </div>

      {/* Calendar toggle button */}
      <button 
        className={`${styles.calendarBtn} ${activeView === 'calendar' ? styles.calendarBtnActive : ''}`}
        onClick={onViewToggle}
        aria-label="Toggle View Mode"
        title={activeView === 'calendar' ? 'Switch to list view' : 'Switch to calendar view'}
      >
        {activeView === 'calendar' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )}
      </button>
    </div>
  )
}

function StatPill({ value, label, color, dim }) {
  return (
    <div className={`${styles.pill} ${dim ? styles.pillAlert : ''}`} style={{ '--c': color }}>
      <span className={styles.pillNum}>{value}</span>
      <span className={styles.pillLabel}>{label}</span>
    </div>
  )
}
