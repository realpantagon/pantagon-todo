import { useMemo, useState } from 'react'
import styles from './StatsBar.module.css'

const SCOPES = ['today', 'week', 'all']
const SCOPE_LABEL = { today: 'TODAY', week: '7 DAYS', all: 'ALL' }

/** YYYY-MM-DD in the device's local timezone (not UTC). */
function localDay(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The set of tasks a scope measures: everything still open (that is the workload you
 * are actually burning down) plus whatever you cleared inside the window. Old finished
 * tasks stay out of the denominator, so each completion moves the number by a real amount
 * instead of being diluted by months of history.
 */
function inScope(todos, scope, today, weekStart) {
  if (scope === 'all') return todos
  const from = scope === 'today' ? today : weekStart
  return todos.filter(t => {
    if (!t.completed) return true
    const day = t.completed_at ? localDay(t.completed_at) : null
    return !!day && day >= from && day <= today
  })
}

export default function StatsBar({ todos, todayCount, overdueCount, onViewToggle, activeView }) {
  const [scopeOverride, setScopeOverride] = useState(null)

  const pending = todos.filter(t => !t.completed).length
  const done    = todos.filter(t => t.completed).length

  const { scope, scopeDone, scopeTotal, pct } = useMemo(() => {
    const now = new Date()
    const today = localDay(now)
    const past = new Date(now)
    past.setDate(past.getDate() - 6)
    const weekStart = localDay(past)

    const buckets = {}
    for (const s of SCOPES) buckets[s] = inScope(todos, s, today, weekStart)

    // Default to today's burn-down; only fall back to the all-time ratio when there is
    // nothing left to burn down (no open tasks and nothing finished today).
    const auto = buckets.today.length > 0 ? 'today' : 'all'
    const active = scopeOverride && buckets[scopeOverride].length > 0 ? scopeOverride : auto

    const list = buckets[active]
    const d = list.filter(t => t.completed).length
    return {
      scope: active,
      scopeDone: d,
      scopeTotal: list.length,
      pct: list.length > 0 ? Math.round((d / list.length) * 100) : 0,
    }
  }, [todos, scopeOverride])

  function cycleScope() {
    const i = SCOPES.indexOf(scope)
    setScopeOverride(SCOPES[(i + 1) % SCOPES.length])
  }

  return (
    <div className={styles.wrap}>
      {/* Progress ring + main number — tap to change the window it measures */}
      <button
        type="button"
        className={styles.ringCol}
        onClick={cycleScope}
        title={`Progress for ${SCOPE_LABEL[scope]} — tap to change`}
        aria-label={`Progress ${pct}% for ${SCOPE_LABEL[scope]}, tap to change range`}
      >
        <span className={styles.ringWrap}>
          <svg className={styles.ring} viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" className={styles.ringTrack}/>
            <circle cx="28" cy="28" r="22" className={styles.ringFill}
              style={{ strokeDashoffset: `${138.2 - (138.2 * pct / 100)}` }}/>
          </svg>
          <span className={styles.ringInner}>
            <span className={styles.ringPct}>
              {scopeTotal > 0 ? pct : '—'}
              {scopeTotal > 0 && <span className={styles.ringPctSign}>%</span>}
            </span>
          </span>
        </span>
        <span className={styles.ringLabel}>
          {SCOPE_LABEL[scope]} {scopeDone}/{scopeTotal}
        </span>
      </button>

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
