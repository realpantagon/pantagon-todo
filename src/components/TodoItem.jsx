import { useState, useRef } from 'react'
import styles from './TodoItem.module.css'

const PRIORITY_COLOR = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--text3)' }

function formatDate(date) {
  if (!date) return null
  const today    = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (date === today)    return 'Today'
  if (date === tomorrow) return 'Tomorrow'
  const d = new Date(date)
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getDate()}`
}

export default function TodoItem({ todo, style, onToggle, onDelete, onEdit }) {
  const [swiped, setSwiped] = useState(false)
  const [checking, setChecking] = useState(false)
  const startX = useRef(null)

  const isOverdue = todo.due_date && !todo.completed && todo.due_date < new Date().toISOString().slice(0, 10)
  const catColor  = todo.todo_categories?.color || 'var(--border2)'

  async function handleCheck() {
    setChecking(true)
    await onToggle(todo.id, !todo.completed)
    setChecking(false)
  }

  const onTouchStart = e => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = e => {
    const dx = startX.current - e.changedTouches[0].clientX
    if (dx > 60) setSwiped(true)
    else if (dx < -20) setSwiped(false)
  }

  return (
    <div
      className={`${styles.wrapper} ${swiped ? styles.swiped : ''}`}
      style={style}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe actions */}
      <div className={styles.actions}>
        <button className={styles.editBtn} onClick={() => { setSwiped(false); onEdit(todo) }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Del
        </button>
      </div>

      {/* Card */}
      <div
        className={`${styles.card} ${todo.completed ? styles.done : ''}`}
        style={{ '--cat': catColor }}
        onClick={() => swiped && setSwiped(false)}
      >
        <button
          className={`${styles.check} ${todo.completed ? styles.checked : ''} ${checking ? styles.checking : ''}`}
          onClick={handleCheck}
          aria-label="toggle"
        >
          {todo.completed && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
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
                {isOverdue && '⚠ '}{formatDate(todo.due_date)}
              </span>
            )}
            <span className={styles.dot} style={{ color: PRIORITY_COLOR[todo.priority] }}>●</span>
          </div>
        </div>

        <button
          className={styles.cardEditBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(todo);
          }}
          aria-label="Edit task"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
