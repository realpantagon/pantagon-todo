import { useState } from 'react'
import TodoItem from './TodoItem'
import styles from './CalendarView.module.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarView({ todos, loading, onToggle, onDelete, onEdit, onAddTask }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().slice(0, 10))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of the month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Previous month days for padding
  const prevMonthDays = new Date(year, month, 0).getDate()

  // Generate grid cells (42 cells to cover 6 weeks)
  const cells = []
  
  // Add padding days from the previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dayNum: d, dateStr, isCurrentMonth: false })
  }

  // Add days of the current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dayNum: d, dateStr, isCurrentMonth: true })
  }

  // Add padding days from the next month to reach 42 cells
  let nextMonthDay = 1
  while (cells.length < 42) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`
    cells.push({ dayNum: nextMonthDay, dateStr, isCurrentMonth: false })
    nextMonthDay++
  }

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function handleToday() {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDateStr(today.toISOString().slice(0, 10))
  }

  // Find tasks for the selected date
  const selectedDayTodos = todos.filter(t => t.due_date === selectedDateStr)

  // Format the header date for tasks view (e.g. "Friday, June 12")
  const formattedSelectedDate = () => {
    const parts = selectedDateStr.split('-')
    if (parts.length !== 3) return ''
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  const PRIORITY_COLORS = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--text3)' }

  return (
    <div className={styles.container}>
      {/* Calendar Header */}
      <div className={styles.header}>
        <div className={styles.monthTitle}>
          <span className={styles.monthLabel}>{MONTH_NAMES[month]}</span>
          <span className={styles.yearLabel}>{year}</span>
        </div>
        <div className={styles.controls}>
          <button className={styles.iconBtn} onClick={handlePrevMonth} aria-label="Previous Month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button className={styles.todayBtn} onClick={handleToday}>Today</button>
          <button className={styles.iconBtn} onClick={handleNextMonth} aria-label="Next Month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className={styles.weekdays}>
        {WEEKDAYS.map((day, idx) => (
          <span key={idx} className={styles.weekday}>{day}</span>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {cells.map((cell, idx) => {
          const dayTasks = todos.filter(t => t.due_date === cell.dateStr)
          const isSelected = selectedDateStr === cell.dateStr
          const isToday = new Date().toISOString().slice(0, 10) === cell.dateStr

          return (
            <button
              key={idx}
              className={`${styles.cell} ${!cell.isCurrentMonth ? styles.otherMonth : ''} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
              onClick={() => setSelectedDateStr(cell.dateStr)}
            >
              <span className={styles.cellDayNum}>{cell.dayNum}</span>
              
              {/* Task indicators */}
              {dayTasks.length > 0 && (
                <div className={styles.dots}>
                  {dayTasks.slice(0, 3).map((task, tIdx) => {
                    const color = task.completed 
                      ? 'var(--green)' 
                      : (PRIORITY_COLORS[task.priority] || 'var(--text3)')
                    return (
                      <span
                        key={tIdx}
                        className={styles.dot}
                        style={{ backgroundColor: color }}
                      />
                    )
                  })}
                  {dayTasks.length > 3 && <span className={styles.moreCount}>+{dayTasks.length - 3}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Day's Tasks */}
      <div className={styles.taskSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.dateLabelGroup}>
            <span className={styles.sectionTitle}>Tasks</span>
            <span className={styles.dateDetail}>{formattedSelectedDate()}</span>
          </div>
          <button 
            className={styles.addBtn}
            onClick={() => onAddTask(selectedDateStr)}
            title="Add task for this day"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Task
          </button>
        </div>

        {loading ? (
          <div className={styles.loader}>Loading...</div>
        ) : selectedDayTodos.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>No tasks due on this day</p>
          </div>
        ) : (
          <div className={styles.list}>
            {selectedDayTodos.map((todo, i) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                style={{ animationDelay: `${i * 0.04}s` }}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
