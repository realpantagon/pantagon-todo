import { useState, useRef } from 'react'
import styles from './TodoItem.module.css'

const PRIORITY_COLOR = { high: 'var(--red)', medium: 'var(--accent)', low: 'var(--text3)' }
const PRIORITY_LABEL = { high: 'สูง', medium: 'กลาง', low: 'ต่ำ' }

function formatDate(date) {
  if (!date) return null
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (date === today) return 'วันนี้'
  if (date === tomorrow) return 'พรุ่งนี้'
  const d = new Date(date)
  return `${d.getDate()} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()]}`
}

export default function TodoItem({ todo, style, onToggle, onDelete, onEdit }) {
  const [swiped, setSwiped] = useState(false)
  const [checking, setChecking] = useState(false)
  const startX = useRef(null)

  const isOverdue = todo.due_date && !todo.completed && todo.due_date < new Date().toISOString().slice(0, 10)

  async function handleCheck() {
    setChecking(true)
    await onToggle(todo.id, !todo.completed)
    setChecking(false)
  }

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    const dx = startX.current - e.changedTouches[0].clientX
    if (dx > 60) setSwiped(true)
    else if (dx < -20) setSwiped(false)
  }

  const catColor = todo.todo_categories?.color || 'var(--border2)'

  return (
    <div
      className={`${styles.wrapper} ${swiped ? styles.swiped : ''}`}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe action */}
      <div className={styles.actions}>
        <button className={styles.editBtn} onClick={() => { setSwiped(false); onEdit(todo) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </div>

      {/* Main card */}
      <div
        className={`${styles.card} ${todo.completed ? styles.done : ''} animate-fadeUp`}
        style={{ '--cat': catColor }}
        onClick={() => swiped ? setSwiped(false) : null}
      >
        <button
          className={`${styles.check} ${todo.completed ? styles.checked : ''} ${checking ? styles.checking : ''}`}
          onClick={handleCheck}
          aria-label="toggle complete"
        >
          {todo.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        <div className={styles.content} onDoubleClick={() => onEdit(todo)}>
          <span className={`${styles.title} ${todo.completed ? styles.titleDone : ''}`}>
            {todo.title}
          </span>
          {todo.note && <span className={styles.note}>{todo.note}</span>}
          <div className={styles.meta}>
            {todo.todo_categories && (
              <span className={styles.cat} style={{ '--c': todo.todo_categories.color }}>
                {todo.todo_categories.icon} {todo.todo_categories.name}
              </span>
            )}
            {todo.due_date && (
              <span className={`${styles.date} ${isOverdue ? styles.overdue : ''}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(todo.due_date)}
              </span>
            )}
            <span className={styles.priority} style={{ color: PRIORITY_COLOR[todo.priority] }}>
              ● {PRIORITY_LABEL[todo.priority]}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
