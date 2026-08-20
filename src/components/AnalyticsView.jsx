import { useMemo, useState } from 'react'
import styles from './AnalyticsView.module.css'
import {
  buildAnalytics, buildTimeline, localDay, formatDay, formatDuration, daysBetween,
} from '../lib/analytics'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const RANGES = [
  { id: 30, label: '30D' },
  { id: 90, label: '90D' },
  { id: null, label: 'ALL' },
]
const TL_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'done', label: 'Done' },
  { id: 'open', label: 'Open' },
]
const PRIORITY_COLOR = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--text3)' }

export default function AnalyticsView({ todos, loading }) {
  const [rangeDays, setRangeDays] = useState(null)
  const [cursor, setCursor] = useState(() => new Date())
  const [picked, setPicked] = useState(null)
  const [tlFilter, setTlFilter] = useState('all')
  const [tlExpanded, setTlExpanded] = useState(false)

  const today = localDay(new Date())
  const a = useMemo(() => buildAnalytics(todos, rangeDays), [todos, rangeDays])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const weeks = useMemo(() => {
    const rows = tlFilter === 'all'
      ? todos
      : todos.filter(t => (tlFilter === 'open' ? !t.completed : t.completed))
    return buildTimeline(rows, year, month, today, tlExpanded ? 16 : 6)
  }, [todos, year, month, today, tlFilter, tlExpanded])

  const tlHidden = weeks.reduce((n, w) => n + w.hidden, 0)

  // Everything that was running at some point during the month on screen.
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const seen = new Map()
    for (const w of weeks) {
      for (const b of w.bars) {
        if (b.span.start <= `${prefix}-31` && b.span.end >= `${prefix}-01`) seen.set(b.todo.id, b)
      }
    }
    const bars = [...seen.values()]
    return {
      running: bars.length,
      finished: bars.filter(b => !b.span.open && b.span.end.startsWith(prefix)).length,
    }
  }, [weeks, year, month])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (!todos.length) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◇</div>
          <p>No data to analyse yet</p>
        </div>
      </div>
    )
  }

  const { summary, records, streaks, dueStats } = a

  return (
    <div className={styles.container}>
      {/* ── Range ─────────────────────────────────────────────── */}
      <div className={styles.rangeRow}>
        <div>
          <h2 className={styles.pageTitle}>Analytics</h2>
          <p className={styles.pageSub}>
            {summary.trackedDays} days tracked · since {formatDay(summary.firstDay)}
          </p>
        </div>
        <div className={styles.rangeChips}>
          {RANGES.map(r => (
            <button
              key={r.label}
              className={`${styles.chip} ${rangeDays === r.id ? styles.chipOn : ''}`}
              onClick={() => setRangeDays(r.id)}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      <Section title="Overview" hint={rangeDays ? `last ${rangeDays} days` : 'all time'}>
        <div className={styles.tiles}>
          <Tile label="tasks" value={summary.total} />
          <Tile label="done" value={summary.done} color="var(--green)" />
          <Tile label="open" value={summary.open} color="var(--amber)" />
          <Tile label="completion" value={`${summary.completionRate}%`} color="var(--accent2)" />
          <Tile label="avg time to done" value={fmtDays(summary.avgLead)} />
          <Tile label="median" value={fmtDays(summary.medianLead)} sub="half finish faster" />
        </div>
      </Section>

      {/* ── Timeline (the calendar gantt) ─────────────────────── */}
      <Section
        title="Timeline"
        hint="each bar spans created → done"
      >
        <div className={styles.tlHead}>
          <button className={styles.navBtn} onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
          <div className={styles.tlMonth}>
            <span className={styles.tlMonthName}>{MONTH_NAMES[month]}</span>
            <span className={styles.tlYear}>{year}</span>
          </div>
          <button className={styles.navBtn} onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
          <button className={styles.todayBtn} onClick={() => setCursor(new Date())}>Today</button>
        </div>

        <div className={styles.tlFilterRow}>
          <p className={styles.tlSummary}>
            {monthStats.running} tasks running · {monthStats.finished} finished this month
          </p>
          <div className={styles.rangeChips}>
            {TL_FILTERS.map(f => (
              <button
                key={f.id}
                className={`${styles.chip} ${tlFilter === f.id ? styles.chipOn : ''}`}
                onClick={() => { setTlFilter(f.id); setPicked(null) }}
              >{f.label}</button>
            ))}
          </div>
        </div>

        <div className={styles.tlGrid}>
          <div className={styles.tlWeekdays}>
            {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
          </div>

          {weeks.map(week => (
            <div key={week.weekStart} className={styles.tlWeek}>
              <div className={styles.tlDays}>
                {week.days.map(d => (
                  <div
                    key={d.day}
                    className={`${styles.tlDay} ${d.inMonth ? '' : styles.tlDayOut} ${d.isToday ? styles.tlDayToday : ''}`}
                  >{d.dayNum}</div>
                ))}
              </div>

              <div
                className={styles.tlLanes}
                // auto rows let lanes holding nothing but threads collapse to a hairline
                style={{ gridTemplateRows: `repeat(${Math.max(week.lanes, 1)}, auto)` }}
              >
                {week.bars.map(b => (
                  <button
                    key={b.todo.id}
                    className={[
                      styles.tlBar,
                      b.thread ? styles.tlBarThread : '',
                      b.span.open ? styles.tlBarOpen : '',
                      b.clipLeft ? styles.clipL : '',
                      b.clipRight ? styles.clipR : '',
                      picked?.todo.id === b.todo.id ? styles.tlBarPicked : '',
                    ].join(' ')}
                    style={{
                      gridColumn: `${b.startCol + 1} / span ${b.cols}`,
                      gridRow: b.lane + 1,
                      '--c': b.todo.todo_categories?.color || 'var(--border2)',
                    }}
                    onClick={() => setPicked(picked?.todo.id === b.todo.id ? null : b)}
                    title={`${b.todo.title} · ${formatDuration(b.span.days)}`}
                  >
                    {(b.label || b.ends) && <span className={styles.tlBarText}>{b.todo.title}</span>}
                    {b.ends && b.cols >= 2 && (
                      <span className={styles.tlBarDays}>{b.span.days === 0 ? '<1d' : `${b.span.days}d`}</span>
                    )}
                  </button>
                ))}
                {week.hidden > 0 && (
                  <span className={styles.tlHidden} style={{ gridColumn: '1 / -1' }}>
                    +{week.hidden}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {(tlHidden > 0 || tlExpanded) && (
          <button className={styles.expandBtn} onClick={() => setTlExpanded(v => !v)}>
            {tlExpanded ? 'Show less' : 'Show every task'}
          </button>
        )}

        <div className={styles.legend}>
          <span><i className={styles.legendSolid} /> finished</span>
          <span><i className={styles.legendOpen} /> still open (runs to today)</span>
          <span><i className={styles.legendThread} /> continues from an earlier week</span>
        </div>

        {picked && <PickedTask bar={picked} today={today} />}
      </Section>

      {/* ── Duration distribution ─────────────────────────────── */}
      <Section title="How long tasks take" hint={`${summary.done} finished tasks`}>
        <BarList
          rows={a.durations.map(d => ({ label: d.label, value: d.count }))}
          total={summary.done}
          color="var(--accent)"
        />
      </Section>

      {/* ── Momentum ──────────────────────────────────────────── */}
      <Section title="Momentum" hint="created vs completed, by week">
        <WeeklyChart weekly={a.weekly} />
        <div className={styles.legend}>
          <span><i className={styles.legendCreated} /> created</span>
          <span><i className={styles.legendDone} /> completed</span>
        </div>
        <p className={styles.note}>
          {a.weekly.length > 0 && (() => {
            const last = a.weekly[a.weekly.length - 1]
            if (last.net > 0) return `Backlog grew by ${last.net} this week — you are adding faster than you finish.`
            if (last.net < 0) return `Backlog shrank by ${-last.net} this week — you are catching up.`
            return 'Created and completed balanced out this week.'
          })()}
        </p>
      </Section>

      {/* ── Activity heatmap + streaks ────────────────────────── */}
      <Section title="Activity" hint="completions per day">
        <Heatmap heatmap={a.heatmap} max={a.heatMax} />
        <div className={styles.tiles}>
          <Tile label="current streak" value={`${streaks.current}d`} color="var(--accent2)" />
          <Tile label="best streak" value={`${streaks.best}d`} />
          <Tile label="active days" value={streaks.activeDays} />
          <Tile label="per active day" value={records.perActiveDay ?? '—'} sub="tasks" />
        </div>
      </Section>

      {/* ── Rhythm ────────────────────────────────────────────── */}
      <Section title="Your rhythm" hint={`peak: ${a.peakDay.name} · ${fmtHour(a.peakHour.hour)}`}>
        <p className={styles.subLabel}>By weekday</p>
        <BarList
          rows={a.weekday.map(d => ({ label: d.name, value: d.count }))}
          total={summary.done}
          color="var(--accent2)"
        />
        <p className={styles.subLabel}>By hour of day</p>
        <HourChart hourly={a.hourly} />
      </Section>

      {/* ── Categories ────────────────────────────────────────── */}
      <Section title="Categories" hint="volume, completion, speed">
        <div className={styles.table}>
          {a.byCategory.map(c => (
            <div key={c.key} className={styles.tableRow}>
              <div className={styles.tableName}>
                <span className={styles.catDot} style={{ background: c.color }} />
                <span className={styles.catIcon}>{c.icon}</span>
                <span className={styles.catName}>{c.name}</span>
              </div>
              <div className={styles.tableBar}>
                <div
                  className={styles.tableFill}
                  style={{ width: `${c.rate}%`, background: c.color }}
                />
              </div>
              <div className={styles.tableNums}>
                <span className={styles.tableMain}>{c.done}/{c.total}</span>
                <span className={styles.tableSub}>{fmtDays(c.avgLead)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Priority ──────────────────────────────────────────── */}
      <Section title="Priority" hint="does urgent actually move faster?">
        <div className={styles.table}>
          {a.byPriority.map(p => (
            <div key={p.priority} className={styles.tableRow}>
              <div className={styles.tableName}>
                <span className={styles.catDot} style={{ background: PRIORITY_COLOR[p.priority] }} />
                <span className={styles.catName}>{p.priority}</span>
              </div>
              <div className={styles.tableBar}>
                <div
                  className={styles.tableFill}
                  style={{ width: `${p.rate}%`, background: PRIORITY_COLOR[p.priority] }}
                />
              </div>
              <div className={styles.tableNums}>
                <span className={styles.tableMain}>{p.done}/{p.total}</span>
                <span className={styles.tableSub}>{fmtDays(p.avgLead)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Deadlines ─────────────────────────────────────────── */}
      <Section title="Deadlines" hint={`${dueStats.withDue} of ${summary.total} tasks have a due date`}>
        <div className={styles.tiles}>
          <Tile label="on time" value={dueStats.onTime} color="var(--green)" />
          <Tile label="late" value={dueStats.late} color="var(--red)" />
          <Tile
            label="hit rate"
            value={dueStats.onTimeRate == null ? '—' : `${dueStats.onTimeRate}%`}
            color="var(--accent2)"
          />
          <Tile label="avg days late" value={dueStats.avgLateDays ?? '—'} />
          <Tile label="overdue now" value={dueStats.overdueOpen} color={dueStats.overdueOpen ? 'var(--red)' : undefined} />
          <Tile label="no due date" value={dueStats.noDue} sub="unscheduled" />
        </div>
      </Section>

      {/* ── Open backlog ──────────────────────────────────────── */}
      <Section title="Open backlog" hint={`${summary.open} tasks waiting`}>
        <BarList
          rows={a.aging.map(b => ({ label: b.label, value: b.count }))}
          total={summary.open}
          color="var(--amber)"
        />
        <p className={styles.subLabel}>Longest waiting</p>
        <div className={styles.list}>
          {a.oldestOpen.map(({ todo, span }) => (
            <div key={todo.id} className={styles.listRow}>
              <span
                className={styles.listDot}
                style={{ background: todo.todo_categories?.color || 'var(--text3)' }}
              />
              <span className={styles.listTitle}>{todo.title}</span>
              <span className={styles.listValue}>{formatDuration(span.days)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Records ───────────────────────────────────────────── */}
      <Section title="Records">
        <div className={styles.list}>
          {records.fastest && (
            <Record
              label="Fastest"
              title={records.fastest.todo.title}
              value={formatDuration(records.fastest.span.days)}
            />
          )}
          {records.slowest && (
            <Record
              label="Longest"
              title={records.slowest.todo.title}
              value={formatDuration(records.slowest.span.days)}
            />
          )}
          {records.busiestDay && (
            <Record
              label="Busiest day"
              title={formatDay(records.busiestDay.day, { weekday: 'long', month: 'short', day: 'numeric' })}
              value={`${records.busiestDay.count} done`}
            />
          )}
          {records.bestWeek && (
            <Record
              label="Best week"
              title={`Week of ${formatDay(records.bestWeek.week)}`}
              value={`${records.bestWeek.completed} done`}
            />
          )}
          <Record label="Average" title="Tasks completed per week" value={records.perWeek ?? '—'} />
        </div>
      </Section>

      <p className={styles.footnote}>
        Durations are measured from when a task was added to when it was ticked off —
        the table has no separate start field, so this is waiting time plus working time.
      </p>
    </div>
  )
}

/* ── small pieces ─────────────────────────────────────────────── */

function Section({ title, hint, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {hint && <span className={styles.sectionHint}>{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value, sub, color }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileValue} style={color ? { color } : undefined}>{value}</span>
      <span className={styles.tileLabel}>{label}</span>
      {sub && <span className={styles.tileSub}>{sub}</span>}
    </div>
  )
}

function BarList({ rows, total, color }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1
  return (
    <div className={styles.barList}>
      {rows.map(r => (
        <div key={r.label} className={styles.barRow}>
          <span className={styles.barLabel}>{r.label}</span>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
          <span className={styles.barValue}>
            {r.value}
            {total > 0 && <em className={styles.barPct}>{Math.round((r.value / total) * 100)}%</em>}
          </span>
        </div>
      ))}
    </div>
  )
}

function WeeklyChart({ weekly }) {
  const max = weekly.reduce((m, w) => Math.max(m, w.created, w.completed), 0) || 1
  return (
    <div className={styles.weekChart}>
      {weekly.map(w => (
        <div key={w.week} className={styles.weekCol} title={`${formatDay(w.week)} — created ${w.created}, completed ${w.completed}`}>
          <div className={styles.weekBars}>
            <div className={styles.weekBarCreated} style={{ height: `${(w.created / max) * 100}%` }} />
            <div className={styles.weekBarDone} style={{ height: `${(w.completed / max) * 100}%` }} />
          </div>
          <span className={styles.weekLabel}>{formatDay(w.week, { day: 'numeric' })}</span>
          <span className={styles.weekMonth}>{formatDay(w.week, { month: 'short' })}</span>
        </div>
      ))}
    </div>
  )
}

function Heatmap({ heatmap, max }) {
  const cols = []
  for (let i = 0; i < heatmap.length; i += 7) cols.push(heatmap.slice(i, i + 7))
  const level = c => (c === 0 ? 0 : Math.min(4, Math.ceil((c / (max || 1)) * 4)))
  return (
    <div className={styles.heatWrap}>
      <div className={styles.heatGrid}>
        {cols.map((col, i) => (
          <div key={i} className={styles.heatCol}>
            {col.map(d => (
              <span
                key={d.day}
                className={`${styles.heatCell} ${styles['heat' + level(d.count)]}`}
                title={`${formatDay(d.day)} — ${d.count} done`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={styles.heatLegend}>
        <span>less</span>
        {[0, 1, 2, 3, 4].map(l => <i key={l} className={`${styles.heatCell} ${styles['heat' + l]}`} />)}
        <span>more</span>
      </div>
    </div>
  )
}

function HourChart({ hourly }) {
  const max = hourly.reduce((m, h) => Math.max(m, h.count), 0) || 1
  return (
    <div className={styles.hourChart}>
      {hourly.map(h => (
        <div key={h.hour} className={styles.hourCol} title={`${fmtHour(h.hour)} — ${h.count} done`}>
          <div className={styles.hourBar} style={{ height: `${(h.count / max) * 100}%` }} />
          {h.hour % 6 === 0 && <span className={styles.hourLabel}>{h.hour}</span>}
        </div>
      ))}
    </div>
  )
}

function Record({ label, title, value }) {
  return (
    <div className={styles.listRow}>
      <span className={styles.recordLabel}>{label}</span>
      <span className={styles.listTitle}>{title}</span>
      <span className={styles.listValue}>{value}</span>
    </div>
  )
}

function PickedTask({ bar, today }) {
  const { todo, span } = bar
  const lateBy = todo.due_date && !span.open ? daysBetween(todo.due_date, span.end) : null
  return (
    <div className={styles.picked}>
      <div className={styles.pickedTop}>
        <span className={styles.catDot} style={{ background: todo.todo_categories?.color || 'var(--text3)' }} />
        <span className={styles.pickedTitle}>{todo.title}</span>
        <span className={styles.dot} style={{ color: PRIORITY_COLOR[todo.priority] }}>●</span>
      </div>
      <div className={styles.pickedRow}>
        <span>{formatDay(span.start)}</span>
        <span className={styles.pickedArrow}>→</span>
        <span>{span.open ? 'still open' : formatDay(span.end)}</span>
        <span className={styles.pickedDuration}>{formatDuration(span.days)}</span>
      </div>
      {todo.due_date && (
        <div className={styles.pickedRow}>
          <span className={styles.pickedMuted}>due {formatDay(todo.due_date)}</span>
          {span.open
            ? (todo.due_date < today
              ? <span className={styles.late}>overdue {daysBetween(todo.due_date, today)}d</span>
              : <span className={styles.pickedMuted}>upcoming</span>)
            : (lateBy > 0
              ? <span className={styles.late}>{lateBy}d late</span>
              : <span className={styles.onTime}>on time</span>)}
        </div>
      )}
    </div>
  )
}

function fmtDays(v) {
  if (v == null) return '—'
  if (v < 1) return `${Math.round(v * 24)}h`
  return `${v}d`
}

function fmtHour(h) {
  const ampm = h < 12 ? 'am' : 'pm'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${ampm}`
}
