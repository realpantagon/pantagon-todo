import { useState, useEffect, useRef } from 'react'
import styles from './AddTodoSheet.module.css'

const PRIORITIES = [
  { id: 'high',   label: '🔴 High' },
  { id: 'medium', label: '🟡 Medium' },
  { id: 'low',    label: '⚪ Low' },
]

export default function AddTodoSheet({ todo, categories, onSave, onClose }) {
  const [title,      setTitle]      = useState(todo?.title      || '')
  const [note,       setNote]       = useState(todo?.note       || '')
  const [priority,   setPriority]   = useState(todo?.priority   || 'medium')
  const [categoryId, setCategoryId] = useState(todo?.category_id || '')
  const [dueDate,    setDueDate]    = useState(todo?.due_date    || '')
  const [saving,     setSaving]     = useState(false)
  const titleRef = useRef(null)

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 350) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onSave({
      title:       title.trim(),
      note:        note.trim() || null,
      priority,
      category_id: categoryId || null,
      due_date:    dueDate    || null,
    })
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <h2 className={styles.sheetTitle}>{todo ? 'Edit Task' : 'New Task'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={titleRef}
            className={styles.titleInput}
            placeholder="Task name..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            required maxLength={200}
          />
          <textarea
            className={styles.noteInput}
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2} maxLength={500}
          />

          <div className={styles.section}>
            <label className={styles.label}>Priority</label>
            <div className={styles.pills}>
              {PRIORITIES.map(p => (
                <button key={p.id} type="button"
                  className={`${styles.pill} ${priority === p.id ? styles.pillActive : ''}`}
                  onClick={() => setPriority(p.id)}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Due date</label>
            <input type="date" className={styles.dateInput}
              value={dueDate} onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {categories.length > 0 && (
            <div className={styles.section}>
              <label className={styles.label}>Category</label>
              <div className={styles.catPills}>
                <button type="button"
                  className={`${styles.catPill} ${!categoryId ? styles.catActive : ''}`}
                  onClick={() => setCategoryId('')}
                >All</button>
                {categories.map(c => (
                  <button key={c.id} type="button"
                    className={`${styles.catPill} ${categoryId === c.id ? styles.catActive : ''}`}
                    style={categoryId === c.id ? { '--cc': c.color } : {}}
                    onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
                  >{c.icon} {c.name}</button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={!title.trim() || saving}>
            {saving ? <span className={styles.spinner}/> : (todo ? 'Save changes' : 'Add Task')}
          </button>
        </form>
      </div>
    </div>
  )
}
