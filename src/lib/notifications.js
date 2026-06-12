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

export function checkAndNotify(todos, settings = {}, isTest = false) {
  if (Notification.permission !== 'granted') return

  if (isTest) {
    showLocalNotification(
      '⚡ Pantagon Test Notification',
      'If you see this, notifications are configured and working properly!',
      'test-notification'
    )
    return
  }

  if (settings.notificationsEnabled === false) return

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const hour = now.getHours()
  const mins = now.getMinutes()

  // 1. Quiet Hours check: silence all alerts between 10 PM and 8 AM
  const isQuietHours = settings.quietHoursEnabled && (hour < 8 || hour >= 22)
  if (isQuietHours) {
    return
  }

  // Load local state
  const getStorageJSON = (key, defaultVal) => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : defaultVal
    } catch {
      return defaultVal
    }
  }

  let notifiedDueSoon = getStorageJSON('pantagon_notified_due_soon', [])
  let notifiedImmediateOverdue = getStorageJSON('pantagon_notified_immediate_overdue', [])
  let lastMorningDate = localStorage.getItem('pantagon_last_morning_date') || ''
  let lastEveningDate = localStorage.getItem('pantagon_last_evening_date') || ''
  let lastOverdueReminderTime = Number(localStorage.getItem('pantagon_last_overdue_time') || '0')

  // Prevent infinite storage growth by keeping only active/existing todo IDs
  const activeIds = todos.map(t => t.id)
  notifiedDueSoon = notifiedDueSoon.filter(id => activeIds.includes(id))
  notifiedImmediateOverdue = notifiedImmediateOverdue.filter(id => activeIds.includes(id))

  const dueToday = todos.filter(t => !t.completed && t.due_date === todayStr)

  // Find overdue tasks (due date is in the past, or due date is today and due time has passed)
  const overdue = todos.filter(t => {
    if (t.completed) return false
    if (!t.due_date) return false
    if (t.due_date < todayStr) return true
    if (t.due_date === todayStr && t.due_time) {
      const [dueH, dueM] = t.due_time.split(':').map(Number)
      const dueTimeVal = dueH * 60 + dueM
      const nowTimeVal = hour * 60 + mins
      return nowTimeVal > dueTimeVal
    }
    return false
  })

  // 2. Immediate Overdue Check:
  // Trigger immediately if a task due today just crossed its due time
  const immediateOverdueTasks = overdue.filter(
    t => t.due_date === todayStr && t.due_time && !notifiedImmediateOverdue.includes(t.id)
  )

  if (immediateOverdueTasks.length > 0) {
    immediateOverdueTasks.forEach(todo => {
      showLocalNotification(
        `🚨 Task Overdue: ${todo.title}`,
        `This task has passed its due time of ${todo.due_time.slice(0, 5)}!`,
        `overdue-immediate-${todo.id}`
      )
      notifiedImmediateOverdue.push(todo.id)
    })
    localStorage.setItem('pantagon_notified_immediate_overdue', JSON.stringify(notifiedImmediateOverdue))
    // Update last overdue reminder time so we don't double-notify with the 2-hour repeating alert immediately
    lastOverdueReminderTime = now.getTime()
    localStorage.setItem('pantagon_last_overdue_time', lastOverdueReminderTime.toString())
  }

  // 3. Due Soon Alerts (15m, 30m, 1h before):
  if (settings.dueSoonMinutes > 0) {
    const dueSoonTasks = dueToday.filter(t => {
      if (!t.due_time) return false
      if (notifiedDueSoon.includes(t.id)) return false

      const [dueH, dueM] = t.due_time.split(':').map(Number)
      const dueTimeVal = dueH * 60 + dueM
      const nowTimeVal = hour * 60 + mins
      const diffMins = dueTimeVal - nowTimeVal

      return diffMins > 0 && diffMins <= settings.dueSoonMinutes
    })

    if (dueSoonTasks.length > 0) {
      dueSoonTasks.forEach(todo => {
        showLocalNotification(
          `⏱️ Due Soon: ${todo.title}`,
          `Due in ${settings.dueSoonMinutes} minutes (at ${todo.due_time.slice(0, 5)})`,
          `due-soon-${todo.id}`
        )
        notifiedDueSoon.push(todo.id)
      })
      localStorage.setItem('pantagon_notified_due_soon', JSON.stringify(notifiedDueSoon))
    }
  }

  // 4. Daily Scheduled Summaries:
  // Morning Briefing: at 10 AM (10:00 - 10:59)
  if (hour === 10 && lastMorningDate !== todayStr) {
    const pendingTodayCount = dueToday.length
    const overdueCount = overdue.length
    if (pendingTodayCount > 0 || overdueCount > 0) {
      const title = `🌅 Morning Briefing: ${pendingTodayCount + overdueCount} tasks pending`
      let body = ''
      if (overdueCount > 0) {
        body += `⚠️ Overdue (${overdueCount}):\n` + overdue.slice(0, 2).map(t => `• ${t.title}`).join('\n') + '\n'
      }
      if (pendingTodayCount > 0) {
        body += `📋 Due Today (${pendingTodayCount}):\n` + dueToday.slice(0, 2).map(t => `• ${t.title}`).join('\n')
      }
      showLocalNotification(title, body, 'summary-morning')
    } else {
      showLocalNotification(`🌅 Morning Briefing`, `You are all caught up for today! Have a great day!`, 'summary-morning')
    }
    localStorage.setItem('pantagon_last_morning_date', todayStr)
  }

  // Evening Wrap-up: at 6 PM (18:00 - 18:59)
  if (hour === 18 && lastEveningDate !== todayStr) {
    const remainingCount = dueToday.length + overdue.length
    if (remainingCount > 0) {
      const title = `🌆 Evening Wrap-up: ${remainingCount} tasks left`
      const body = `Here's what is left to do:\n` + [...overdue, ...dueToday].slice(0, 4).map(t => `• ${t.title}`).join('\n')
      showLocalNotification(title, body, 'summary-evening')
    } else {
      showLocalNotification(`🌆 Evening Wrap-up`, `Fantastic job! You've completed all tasks for today.`, 'summary-evening')
    }
    localStorage.setItem('pantagon_last_evening_date', todayStr)
  }

  // 5. Repeating Overdue Reminders (Every 2 hours):
  if (overdue.length > 0) {
    const twoHoursMs = 2 * 60 * 60 * 1000
    const timeSinceLast = now.getTime() - lastOverdueReminderTime
    if (timeSinceLast >= twoHoursMs) {
      showLocalNotification(
        `🚨 Overdue Reminder: ${overdue.length} tasks need attention`,
        overdue.slice(0, 3).map(t => `• ${t.title}`).join('\n') + (overdue.length > 3 ? `\n...and ${overdue.length - 3} more` : ''),
        'overdue-repeating'
      )
      localStorage.setItem('pantagon_last_overdue_time', now.getTime().toString())
    }
  } else {
    // If no overdue tasks, reset last overdue time so if a task becomes overdue later, it can trigger immediately
    if (lastOverdueReminderTime !== 0) {
      localStorage.setItem('pantagon_last_overdue_time', '0')
    }
  }
}
