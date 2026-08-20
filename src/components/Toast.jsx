import styles from './Toast.module.css'

export default function Toast({ msg, type, action }) {
  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <span className={styles.msg}>{msg}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  )
}
