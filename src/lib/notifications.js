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

export function checkAndNotify(todos) {
  if (Notification.permission !== 'granted') return
  const pending = todos.filter(t => !t.completed)
  pending.forEach((todo, i) => {
    setTimeout(() => {
      showLocalNotification(
        `📌 งานค้าง: ${todo.title}`,
        todo.due_date ? `กำหนด: ${todo.due_date}` : 'ยังไม่ได้กำหนดวัน',
        `todo-${todo.id}`
      )
    }, i * 1000)
  })
}
