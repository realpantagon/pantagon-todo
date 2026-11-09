import styles from './Toast.module.css'

export default function Toast({ msg, type, action, placement = 'dock' }) {
  return (
    <div className={`${styles.toast} ${styles[placement]} ${styles[type]}`}>
      <span className={styles.msg}>{msg}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  )
}
