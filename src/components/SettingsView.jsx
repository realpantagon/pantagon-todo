import { useState, useEffect } from 'react'
import { enableNotifications } from '../lib/notifications'
import { DEFAULT_SETTINGS, playCompletionSound } from '../lib/settings'
import styles from './SettingsView.module.css'

export default function SettingsView({ onSettingsChange, showToast, triggerTestNotification, onClose }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pantagon_settings')
      const parsed = saved ? JSON.parse(saved) : {}
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Sync permission status
        notificationsEnabled: parsed.notificationsEnabled && Notification?.permission === 'granted'
      }
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  useEffect(() => {
    localStorage.setItem('pantagon_settings', JSON.stringify(settings))
    if (onSettingsChange) onSettingsChange(settings)
  }, [settings, onSettingsChange])

  async function handleNotifToggle() {
    if (settings.notificationsEnabled) {
      // Disable
      setSettings(prev => ({ ...prev, notificationsEnabled: false }))
      showToast('Notifications disabled in app settings')
    } else {
      // Enable
      const ok = await enableNotifications()
      if (ok) {
        setSettings(prev => ({ ...prev, notificationsEnabled: true }))
        showToast('Notifications enabled successfully!')
      } else {
        showToast('Permission denied by browser', 'error')
      }
    }
  }

  function handleSelectChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    showToast('Preference saved')
  }

  function handleSoundToggle() {
    const newVal = !settings.soundEnabled
    setSettings(prev => ({ ...prev, soundEnabled: newVal }))
    if (newVal) {
      setTimeout(() => playCompletionSound(), 100)
    }
    showToast(newVal ? 'Chime sound enabled' : 'Chime sound muted')
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <h2 className={styles.sheetTitle}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.container}>
          <div className={styles.section}>
            <h3 className={styles.sectionHeader}>🔔 Notifications</h3>
            
            <div className={styles.card}>
              <div className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.label}>Enable System Notifications</span>
                  <span className={styles.sublabel}>Allows Pantagon Tasks to send alerts</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${settings.notificationsEnabled ? styles.toggleOn : ''}`}
                  onClick={handleNotifToggle}
                  aria-label="Toggle notifications"
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>

              {settings.notificationsEnabled && (
                <div className={styles.settingsSubgroup}>
                  <div className={styles.field}>
                    <label className={styles.selectLabel}>Delivery Mode</label>
                    <select
                      className={styles.select}
                      value={settings.notifStrategy}
                      onChange={e => handleSelectChange('notifStrategy', e.target.value)}
                    >
                      <option value="summary">📝 Grouped Summary (Recommended)</option>
                      <option value="individual">🚨 Individual Alerts</option>
                    </select>
                    <span className={styles.help}>
                      {settings.notifStrategy === 'summary' 
                        ? 'Consolidates multiple tasks into a single summary notification.' 
                        : 'Sends a separate system notification for each matching task.'}
                    </span>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.selectLabel}>Include Tasks</label>
                    <select
                      className={styles.select}
                      value={settings.notifScope}
                      onChange={e => handleSelectChange('notifScope', e.target.value)}
                    >
                      <option value="overdue">⚠️ Overdue tasks only</option>
                      <option value="today_overdue">📋 Due today or overdue</option>
                      <option value="all">📅 All pending tasks</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.selectLabel}>Check Frequency</label>
                    <select
                      className={styles.select}
                      value={settings.notifInterval}
                      onChange={e => handleSelectChange('notifInterval', Number(e.target.value))}
                    >
                      <option value={3}>⏱️ Every 3 minutes (Testing)</option>
                      <option value={15}>⏱️ Every 15 minutes</option>
                      <option value={60}>⏱️ Every 1 hour</option>
                      <option value={0}>⏹️ Manual (Only when app opens)</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.selectLabel}>Due Soon Alerts</label>
                    <select
                      className={styles.select}
                      value={settings.dueSoonMinutes}
                      onChange={e => handleSelectChange('dueSoonMinutes', Number(e.target.value))}
                    >
                      <option value={15}>⏱️ 15 minutes before due</option>
                      <option value={30}>⏱️ 30 minutes before due</option>
                      <option value={60}>⏱️ 1 hour before due</option>
                      <option value={0}>⏹️ Off</option>
                    </select>
                  </div>

                  <div className={styles.rowField}>
                    <div className={styles.info}>
                      <span className={styles.labelSmall}>Quiet Hours Protection</span>
                      <span className={styles.sublabel}>Silence repeating overdue alerts (10 PM - 8 AM)</span>
                    </div>
                    <button
                      type="button"
                      className={`${styles.toggle} ${settings.quietHoursEnabled ? styles.toggleOn : ''}`}
                      onClick={() => handleSelectChange('quietHoursEnabled', !settings.quietHoursEnabled)}
                      aria-label="Toggle quiet hours protection"
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.testBtn}
                    onClick={triggerTestNotification}
                  >
                    ⚡ Test Notification
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionHeader}>✨ App Preferences</h3>
            
            <div className={styles.card}>
              <div className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.label}>Completion Chime</span>
                  <span className={styles.sublabel}>Play a cute chime when completing a task</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${settings.soundEnabled ? styles.toggleOn : ''}`}
                  onClick={handleSoundToggle}
                  aria-label="Toggle completion sound"
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>

              <div className={styles.field} style={{ borderTop: '1px dashed var(--border)', paddingTop: '14px', marginTop: '4px' }}>
                <label className={styles.selectLabel}>App Theme</label>
                <select
                  className={styles.select}
                  value={settings.theme}
                  onChange={e => handleSelectChange('theme', e.target.value)}
                >
                  <option value="dark">🌑 Sleek Dark</option>
                  <option value="light">☀️ Pristine Light</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>Pantagon Tasks v1.1.0 · local client</p>
          </div>
        </div>
      </div>
    </div>
  )
}
