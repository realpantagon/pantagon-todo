import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = 'BCsoo1i4_kqB8Bg5QLp5DfRh4c8j0Azww5ZQ4ReapN9eAvVLZUwaNOHnKNLlN0sLaHGzhdDbpdvvBdt_6JzV0wI'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })
    const json = sub.toJSON()
    // Upsert subscription into Supabase
    await supabase.from('push_subscriptions').upsert({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth
    }, { onConflict: 'endpoint' })
    return true
  } catch (e) {
    console.error('Push subscribe error:', e)
    return false
  }
}

export async function enableNotifications() {
  const granted = await requestPermission()
  if (!granted) return false
  return subscribePush()
}

// -- normal logic (commented out for testing) --
// export function checkAndNotify(todos) {
//   const today = new Date().toISOString().slice(0, 10)
//   const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
//   const dueToday = todos.filter(t => !t.completed && t.due_date === today)
//   const pending = todos.filter(t => !t.completed)
//   if (overdue.length > 0) {
//     showLocalNotification(`⚠️ เลยกำหนด ${overdue.length} งาน`, overdue.map(t => `• ${t.title}`).join('\n'), 'overdue')
//     return
//   }
//   if (dueToday.length > 0) {
//     showLocalNotification(`📋 วันนี้มี ${dueToday.length} งาน`, dueToday.map(t => `• ${t.title}`).join('\n'), 'today')
//     return
//   }
//   if (pending.length > 0) {
//     showLocalNotification(`✦ มี ${pending.length} งานรอทำ`, pending.map(t => `• ${t.title}`).join('\n'), 'pending')
//   }
// }

// TEST MODE: local fallback when app is open (foreground)
// Real background push is handled by Edge Function cron → Web Push API
function showLocalNotification(title, body, tag) {
  if (Notification.permission !== 'granted') return
  navigator.serviceWorker.ready.then(reg => {
    reg.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      tag,
      renotify: true
    })
  })
}

export function checkAndNotify(todos, settings = {}) {
  if (Notification.permission !== 'granted') return
  if (settings.notificationsEnabled === false) return

  const today = new Date().toISOString().slice(0, 10)
  const scope = settings.notifScope || 'today_overdue'
  
  const overdue = todos.filter(t => !t.completed && t.due_date && t.due_date < today)
  const dueToday = todos.filter(t => !t.completed && t.due_date === today)
  const otherPending = todos.filter(t => !t.completed && (!t.due_date || t.due_date > today))
  
  let targetTodos
  if (scope === 'overdue') {
    targetTodos = overdue
  } else if (scope === 'today_overdue') {
    targetTodos = [...overdue, ...dueToday]
  } else {
    targetTodos = [...overdue, ...dueToday, ...otherPending]
  }
  
  if (targetTodos.length === 0) return

  const strategy = settings.notifStrategy || 'summary'
  
  if (strategy === 'summary') {
    // Consolidate into a single group notification
    let title
    let body
    
    const overdueCount = targetTodos.filter(t => t.due_date && t.due_date < today).length
    const todayCount = targetTodos.filter(t => t.due_date === today).length
    
    if (overdueCount > 0 && todayCount > 0) {
      title = `⚠️ มีงานค้าง: เลยกำหนด ${overdueCount} และของวันนี้ ${todayCount}`
      body = `เลยกำหนด:\n` + targetTodos.filter(t => t.due_date && t.due_date < today).slice(0, 2).map(t => `• ${t.title}`).join('\n') + 
             `\n\nงานวันนี้:\n` + targetTodos.filter(t => t.due_date === today).slice(0, 2).map(t => `• ${t.title}`).join('\n')
    } else if (overdueCount > 0) {
      title = `⚠️ งานเลยกำหนดส่ง! (${overdueCount} งาน)`
      body = targetTodos.slice(0, 4).map(t => `• ${t.title}`).join('\n')
    } else if (todayCount > 0) {
      title = `📋 วันนี้มีงานต้องทำ! (${todayCount} งาน)`
      body = targetTodos.slice(0, 4).map(t => `• ${t.title}`).join('\n')
    } else {
      title = `✦ มีงานรอทำอยู่ (${targetTodos.length} งาน)`
      body = targetTodos.slice(0, 4).map(t => `• ${t.title}`).join('\n')
    }
    
    if (targetTodos.length > 4) {
      body += `\n...และงานอื่นอีก ${targetTodos.length - 4} รายการ`
    }
    
    showLocalNotification(title, body, 'pantagon-summary')
  } else {
    // Individual alerts, but capped at 4 tasks to avoid annoying browser alerts
    targetTodos.slice(0, 4).forEach((todo, i) => {
      setTimeout(() => {
        showLocalNotification(
          `📌 งานค้าง: ${todo.title}`,
          todo.due_date ? `กำหนด: ${todo.due_date}` : 'ยังไม่ได้กำหนดวัน',
          `todo-${todo.id}`
        )
      }, i * 1000)
    })
  }
}
