import styles from './Header.module.css'

const DAYS_TH = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์']
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

export default function Header({ notifEnabled, onEnableNotif }) {
  const now = new Date()
  const day = DAYS_TH[now.getDay()]
  const date = now.getDate()
  const month = MONTHS_TH[now.getMonth()]
  const year = now.getFullYear() + 543

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div className={styles.dateRow}>
          <span className={styles.dayName}>{day}</span>
          <span className={styles.datePill}>{date} {month} {year}</span>
        </div>
        <button
          className={`${styles.bellBtn} ${notifEnabled ? styles.bellOn : ''}`}
          onClick={onEnableNotif}
          title={notifEnabled ? 'แจ้งเตือนเปิดอยู่ (ทุก 5 นาที)' : 'เปิดการแจ้งเตือน'}
        >
          {notifEnabled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5"/>
            </svg>
          )}
        </button>
      </div>
      <h1 className={styles.title}>My To-Do</h1>
    </header>
  )
}
