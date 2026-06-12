import TodoItem from './TodoItem'
import styles from './TodoList.module.css'

export default function TodoList({ todos, loading, onToggle, onDelete, onEdit }) {
  if (loading) {
    return (
      <div className={styles.list}>
        {[1,2,3].map(i => <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />)}
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>✦</div>
        <p className={styles.emptyText}>ไม่มีงาน</p>
        <p className={styles.emptyHint}>กด + เพื่อเพิ่มงานใหม่</p>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {todos.map((todo, i) => (
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
  )
}
