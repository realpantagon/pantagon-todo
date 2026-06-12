import styles from './Header.module.css'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Header({ notifEnabled, onEnableNotif }) {
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
        <button
          className={`${styles.bell} ${notifEnabled ? styles.bellOn : ''}`}
          onClick={onEnableNotif}
          title={notifEnabled ? 'Notifications on · every 3 min' : 'Enable notifications'}
        >
          {notifEnabled ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.8"/>
            </svg>
          )}
        </button>
      </div>
      <h1 className={styles.title}>My Tasks</h1>
    </header>
  )
}
