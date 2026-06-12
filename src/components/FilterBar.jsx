import styles from './FilterBar.module.css'

const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'today', label: 'วันนี้' },
  { id: 'done', label: 'เสร็จแล้ว' },
]

export default function FilterBar({ filter, setFilter, categories, categoryFilter, setCategoryFilter }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`${styles.chip} ${filter === f.id ? styles.active : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {categories.length > 0 && (
        <div className={styles.cats}>
          <button
            className={`${styles.catChip} ${!categoryFilter ? styles.catActive : ''}`}
            onClick={() => setCategoryFilter(null)}
          >
            ทุกหมวด
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={`${styles.catChip} ${categoryFilter === c.id ? styles.catActive : ''}`}
              style={categoryFilter === c.id ? { '--cat-color': c.color } : {}}
              onClick={() => setCategoryFilter(categoryFilter === c.id ? null : c.id)}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
