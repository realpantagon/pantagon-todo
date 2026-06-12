import styles from './FilterBar.module.css'

const FILTERS = [
  { id: 'all',   label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'done',  label: 'Done' },
]

export default function FilterBar({ filter, setFilter, categories, categoryFilter, setCategoryFilter }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`${styles.tab} ${filter === f.id ? styles.tabActive : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {categories.length > 0 && (
        <div className={styles.cats}>
          <button
            className={`${styles.cat} ${!categoryFilter ? styles.catActive : ''}`}
            onClick={() => setCategoryFilter(null)}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={`${styles.cat} ${categoryFilter === c.id ? styles.catActive : ''}`}
              style={categoryFilter === c.id ? { '--cc': c.color } : {}}
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
