/**
 * Pure analytics helpers for the todos table.
 *
 * The table has no explicit "start" field, so `created_at` is treated as the start of a
 * task and `completed_at` as its end — every duration in here is therefore a *lead time*
 * (how long a task sat on the list), not hands-on working time.
 *
 * All date math runs in the device's local timezone: bucketing on `toISOString()` would
 * push anything finished after 17:00 ICT into the previous day.
 */

const DAY_MS = 86400000

const pad = n => String(n).padStart(2, '0')

/** YYYY-MM-DD in local time, or null for missing/invalid input. */
export function localDay(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local Date at midnight for a YYYY-MM-DD string. */
export function dayToDate(day) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(day, n) {
  const d = dayToDate(day)
  d.setDate(d.getDate() + n)
  return localDay(d)
}

/** Whole calendar days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a, b) {
  return Math.round((dayToDate(b) - dayToDate(a)) / DAY_MS)
}

export function formatDay(day, opts = { month: 'short', day: 'numeric' }) {
  if (!day) return '—'
  return dayToDate(day).toLocaleDateString('en-US', opts)
}

/** Human duration for a calendar-day count. */
export function formatDuration(days) {
  if (days == null) return '—'
  if (days <= 0) return 'same day'
  if (days === 1) return '1 day'
  if (days < 14) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  return `${Math.round(days / 30)} months`
}

/**
 * Start/end/length of one task. Open tasks run up to `today`, so an unfinished task
 * shows how long it has already been waiting rather than disappearing from the timeline.
 */
export function taskSpan(todo, today) {
  const start = localDay(todo.created_at)
  if (!start) return null
  const end = todo.completed ? (localDay(todo.completed_at) || start) : today
  const safeEnd = end < start ? start : end
  return {
    start,
    end: safeEnd,
    days: daysBetween(start, safeEnd),   // 0 = finished the same day
    open: !todo.completed,
  }
}

/** Exact lead time in fractional days — used for averages, not for bar lengths. */
function leadDays(todo) {
  if (!todo.completed || !todo.completed_at || !todo.created_at) return null
  const v = (new Date(todo.completed_at) - new Date(todo.created_at)) / DAY_MS
  return v >= 0 ? v : 0
}

function median(nums) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function mean(nums) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round(n, digits = 1) {
  if (n == null) return null
  const f = 10 ** digits
  return Math.round(n * f) / f
}

const DURATION_BUCKETS = [
  { label: 'Same day', test: d => d < 1 },
  { label: '1-2 days', test: d => d < 3 },
  { label: '3-7 days', test: d => d < 8 },
  { label: '1-2 weeks', test: d => d < 15 },
  { label: '2-4 weeks', test: d => d < 31 },
  { label: 'Over a month', test: () => true },
]

const AGE_BUCKETS = [
  { label: 'Under a week', test: d => d < 7 },
  { label: '1-2 weeks', test: d => d < 14 },
  { label: '2-4 weeks', test: d => d < 30 },
  { label: 'Over a month', test: () => true },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITIES = ['high', 'medium', 'low']

/** Sunday of the week containing `day`. */
function weekStartOf(day) {
  return addDays(day, -dayToDate(day).getDay())
}

/**
 * Everything the analytics view renders, computed in one pass.
 * `rangeDays` limits the time-based sections; null means all time.
 */
export function buildAnalytics(todos, rangeDays) {
  const today = localDay(new Date())
  const from = rangeDays ? addDays(today, -(rangeDays - 1)) : null

  const withSpan = todos
    .map(t => ({ todo: t, span: taskSpan(t, today) }))
    .filter(x => x.span)

  // A task counts for the selected range if it was created in it or finished in it.
  const scoped = from
    ? withSpan.filter(({ span }) => span.start >= from || (!span.open && span.end >= from))
    : withSpan

  const done = scoped.filter(x => !x.span.open)
  const open = withSpan.filter(x => x.span.open)   // open work is always shown in full
  const leads = done.map(x => leadDays(x.todo)).filter(v => v != null)

  /* ---- summary ---------------------------------------------------------- */
  const firstDay = withSpan.reduce((min, x) => (x.span.start < min ? x.span.start : min), today)
  const summary = {
    total: scoped.length,
    done: done.length,
    open: open.length,
    completionRate: scoped.length ? Math.round((done.length / scoped.length) * 100) : 0,
    avgLead: round(mean(leads)),
    medianLead: round(median(leads)),
    firstDay,
    trackedDays: withSpan.length ? daysBetween(firstDay, today) + 1 : 0,
  }

  /* ---- how long tasks take ---------------------------------------------- */
  const durations = DURATION_BUCKETS.map(b => ({ label: b.label, count: 0 }))
  for (const lead of leads) {
    durations[DURATION_BUCKETS.findIndex(b => b.test(lead))].count++
  }

  /* ---- weekly created vs completed, and the backlog it leaves ----------- */
  const weekMap = new Map()
  const touchWeek = day => {
    const w = weekStartOf(day)
    if (!weekMap.has(w)) weekMap.set(w, { week: w, created: 0, completed: 0 })
    return weekMap.get(w)
  }
  for (const { span } of scoped) {
    touchWeek(span.start).created++
    if (!span.open) touchWeek(span.end).completed++
  }
  const weekly = [...weekMap.values()].sort((a, b) => a.week.localeCompare(b.week))
  let running = 0
  for (const w of weekly) {
    w.net = w.created - w.completed          // > 0 means the backlog grew that week
    running += w.net
    w.backlog = running
  }

  /* ---- completion heatmap + streaks ------------------------------------- */
  const perDay = new Map()
  for (const { span } of done) perDay.set(span.end, (perDay.get(span.end) || 0) + 1)

  const heatWeeks = rangeDays ? Math.ceil(rangeDays / 7) : 14
  const heatStart = weekStartOf(addDays(today, -(heatWeeks * 7 - 1)))
  const heatmap = []
  for (let day = heatStart; day <= today; day = addDays(day, 1)) {
    heatmap.push({ day, count: perDay.get(day) || 0 })
  }
  const heatMax = heatmap.reduce((m, d) => Math.max(m, d.count), 0)

  // Today being empty does not break a streak yet — the day is not over.
  let current = 0
  for (let day = perDay.get(today) ? today : addDays(today, -1); perDay.get(day); day = addDays(day, -1)) {
    current++
  }
  let best = 0, run = 0, prev = null
  for (const day of [...perDay.keys()].sort()) {
    run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  const streaks = { current, best, activeDays: perDay.size }

  /* ---- rhythm: weekday + hour of day ------------------------------------ */
  const weekday = WEEKDAYS.map(name => ({ name, count: 0 }))
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  for (const { todo } of done) {
    const d = new Date(todo.completed_at)
    if (Number.isNaN(d.getTime())) continue
    weekday[d.getDay()].count++
    hourly[d.getHours()].count++
  }
  const peakHour = hourly.reduce((b, h) => (h.count > b.count ? h : b), hourly[0])
  const peakDay = weekday.reduce((b, d) => (d.count > b.count ? d : b), weekday[0])

  /* ---- by category ------------------------------------------------------ */
  const catMap = new Map()
  for (const { todo, span } of scoped) {
    const cat = todo.todo_categories
    const key = cat?.id || 'none'
    if (!catMap.has(key)) {
      catMap.set(key, {
        key,
        name: cat?.name || 'Uncategorized',
        color: cat?.color || 'var(--text3)',
        icon: cat?.icon || '·',
        total: 0, done: 0, leads: [],
      })
    }
    const row = catMap.get(key)
    row.total++
    if (!span.open) {
      row.done++
      const l = leadDays(todo)
      if (l != null) row.leads.push(l)
    }
  }
  const byCategory = [...catMap.values()]
    .map(r => ({
      ...r,
      open: r.total - r.done,
      rate: r.total ? Math.round((r.done / r.total) * 100) : 0,
      avgLead: round(mean(r.leads)),
    }))
    .sort((a, b) => b.total - a.total)

  /* ---- by priority ------------------------------------------------------ */
  const byPriority = PRIORITIES.map(p => {
    const rows = scoped.filter(x => (x.todo.priority || 'medium') === p)
    const d = rows.filter(x => !x.span.open)
    const ls = d.map(x => leadDays(x.todo)).filter(v => v != null)
    return {
      priority: p,
      total: rows.length,
      done: d.length,
      open: rows.length - d.length,
      rate: rows.length ? Math.round((d.length / rows.length) * 100) : 0,
      avgLead: round(mean(ls)),
    }
  }).filter(r => r.total > 0)

  /* ---- deadline discipline ---------------------------------------------- */
  const withDue = scoped.filter(x => x.todo.due_date)
  let onTime = 0, late = 0, lateDaysTotal = 0
  for (const { todo, span } of withDue) {
    if (span.open) continue
    if (span.end <= todo.due_date) onTime++
    else { late++; lateDaysTotal += daysBetween(todo.due_date, span.end) }
  }
  const dueStats = {
    withDue: withDue.length,
    noDue: scoped.length - withDue.length,
    onTime,
    late,
    onTimeRate: onTime + late ? Math.round((onTime / (onTime + late)) * 100) : null,
    avgLateDays: late ? round(lateDaysTotal / late) : null,
    overdueOpen: open.filter(x => x.todo.due_date && x.todo.due_date < today).length,
  }

  /* ---- the backlog that is still sitting there -------------------------- */
  const aging = AGE_BUCKETS.map(b => ({ label: b.label, count: 0 }))
  for (const { span } of open) {
    aging[AGE_BUCKETS.findIndex(b => b.test(span.days))].count++
  }
  const oldestOpen = [...open].sort((a, b) => b.span.days - a.span.days).slice(0, 5)

  /* ---- records ----------------------------------------------------------- */
  const sortedDone = [...done].sort((a, b) => (leadDays(a.todo) ?? 0) - (leadDays(b.todo) ?? 0))
  let busiestDay = null
  for (const [day, count] of perDay) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { day, count }
  }
  const bestWeek = weekly.reduce((b, w) => (!b || w.completed > b.completed ? w : b), null)
  const records = {
    fastest: sortedDone[0] || null,
    slowest: sortedDone[sortedDone.length - 1] || null,
    busiestDay,
    bestWeek: bestWeek && bestWeek.completed > 0 ? bestWeek : null,
    perActiveDay: perDay.size ? round(done.length / perDay.size) : null,
    perWeek: weekly.length ? round(done.length / weekly.length) : null,
  }

  return {
    today, from,
    summary, durations, weekly, heatmap, heatMax, streaks,
    weekday, hourly, peakHour, peakDay,
    byCategory, byPriority, dueStats, aging, oldestOpen, records,
  }
}

/**
 * Month grid for the timeline: six week rows, each carrying the task bars that overlap it.
 * Bars are packed into lanes so two tasks never share a row inside the same week.
 */
export function buildTimeline(todos, year, month, today, maxLanes = 4) {
  const gridStart = weekStartOf(localDay(new Date(year, month, 1)))

  // A task is named once per month view — on its first visible segment. Later segments are
  // drawn as a thin thread, which is what keeps a month of long-running tasks readable.
  const labelled = new Set()

  const spans = todos
    .map(t => ({ todo: t, span: taskSpan(t, today) }))
    .filter(x => x.span)

  const weeks = []
  for (let w = 0; w < 6; w++) {
    const weekStart = addDays(gridStart, w * 7)
    const weekEnd = addDays(weekStart, 6)
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const d = dayToDate(day)
      return { day, dayNum: d.getDate(), inMonth: d.getMonth() === month, isToday: day === today }
    })

    // A task that starts or ends inside this week is the news of the week, so it claims a
    // lane first; months-long tasks merely passing through fill whatever is left over.
    const candidates = spans
      .filter(({ span }) => span.end >= weekStart && span.start <= weekEnd)
      .map(x => ({
        ...x,
        // An open task's end is just "today", which is not a real event.
        event: x.span.start >= weekStart || (!x.span.open && x.span.end <= weekEnd) ? 0 : 1,
      }))
      .sort((a, b) =>
        a.event - b.event ||
        a.span.start.localeCompare(b.span.start) ||
        b.span.days - a.span.days)

    const laneEnds = []       // last column occupied in each lane
    const bars = []
    let hidden = 0

    for (const { todo, span } of candidates) {
      const startCol = span.start <= weekStart ? 0 : daysBetween(weekStart, span.start)
      const endCol   = span.end   >= weekEnd   ? 6 : daysBetween(weekStart, span.end)

      let lane = laneEnds.findIndex(end => end < startCol)
      if (lane === -1) lane = laneEnds.length
      if (lane >= maxLanes) { hidden++; continue }
      laneEnds[lane] = endCol

      const label = !labelled.has(todo.id)
      labelled.add(todo.id)
      const ends = !span.open && span.end <= weekEnd

      bars.push({
        todo,
        span,
        lane,
        startCol,
        cols: endCol - startCol + 1,
        clipLeft: span.start < weekStart,
        clipRight: span.end > weekEnd,
        label,                       // carries the title
        ends,                        // carries the duration badge
        thread: !label && !ends,     // just passing through this week
      })
    }

    weeks.push({ weekStart, days, bars, lanes: laneEnds.length, hidden })
  }

  return weeks
}
