export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function showNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [100, 50, 100],
        tag: options.tag || 'mytodo',
        renotify: true,
        ...options
      })
    })
  } else {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
  }
}

export function checkAndNotify(todos) {
  if (Notification.permission !== 'granted') return

  const today = new Date().toISOString().slice(0, 10)
  const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
  const dueToday = todos.filter(t => !t.completed && t.due_date === today)
  const pending = todos.filter(t => !t.completed && !t.due_date)

  if (overdue.length > 0) {
    showNotification(
      `⚠️ เลยกำหนด ${overdue.length} งาน`,
      overdue.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
      { tag: 'overdue' }
    )
    return
  }

  if (dueToday.length > 0) {
    showNotification(
      `📋 วันนี้มี ${dueToday.length} งานรอทำ`,
      dueToday.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
      { tag: 'today' }
    )
    return
  }

  if (pending.length > 0) {
    showNotification(
      `✦ มี ${pending.length} งานรอทำ`,
      pending.slice(0, 3).map(t => `• ${t.title}`).join('\n'),
      { tag: 'pending' }
    )
  }
}
