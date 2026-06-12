export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function showNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [100, 50, 100],
        renotify: true,
        ...options
      })
    })
  } else {
    new Notification(title, { body })
  }
}

// -- normal logic (commented out for testing) --
// export function checkAndNotify(todos) {
//   const today = new Date().toISOString().slice(0, 10)
//   const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
//   const dueToday = todos.filter(t => !t.completed && t.due_date === today)
//   const pending = todos.filter(t => !t.completed)
//   if (overdue.length > 0) {
//     showNotification(`⚠️ เลยกำหนด ${overdue.length} งาน`, overdue.map(t => `• ${t.title}`).join('\n'), { tag: 'overdue' })
//     return
//   }
//   if (dueToday.length > 0) {
//     showNotification(`📋 วันนี้มี ${dueToday.length} งาน`, dueToday.map(t => `• ${t.title}`).join('\n'), { tag: 'today' })
//     return
//   }
//   if (pending.length > 0) {
//     showNotification(`✦ มี ${pending.length} งานรอทำ`, pending.map(t => `• ${t.title}`).join('\n'), { tag: 'pending' })
//   }
// }

// TEST MODE: notify each pending todo individually, every 3 minutes
// fires all at once with 1s gap between each
export function checkAndNotify(todos) {
  if (Notification.permission !== 'granted') return
  const pending = todos.filter(t => !t.completed)
  pending.forEach((todo, i) => {
    setTimeout(() => {
      showNotification(
        `📌 งานค้าง: ${todo.title}`,
        todo.due_date ? `กำหนด: ${todo.due_date}` : 'ยังไม่ได้กำหนดวัน',
        { tag: `todo-${todo.id}` }
      )
    }, i * 1000)
  })
}
