import styles from './Header.module.css'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Header() {
  const now = new Date()
  const day = DAYS[now.getDay()]
  const date = now.getDate()
  const month = MONTHS[now.getMonth()]

  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <div className={styles.dateBlock}>
          <span className={styles.dayLabel}>{day}</span>
          <span className={styles.dateLabel}>{month} {date}</span>
        </div>
      </div>
      <h1 className={styles.title}>Pantagon Tasks</h1>
    </header>
  )
}
