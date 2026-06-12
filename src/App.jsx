import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchTodos, fetchCategories, createTodo, updateTodo, deleteTodo, toggleTodo } from './lib/todos'
import { checkAndNotify } from './lib/notifications'
import Header from './components/Header'
import TodoList from './components/TodoList'
import AddTodoSheet from './components/AddTodoSheet'
import FilterBar from './components/FilterBar'
import StatsBar from './components/StatsBar'
import Toast from './components/Toast'
import SettingsView from './components/SettingsView'
import { DEFAULT_SETTINGS, playCompletionSound } from './lib/settings'
import CalendarView from './components/CalendarView'
import './App.css'

export default function App() {
  const [todos, setTodos] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editTodo, setEditTodo] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState('tasks')
  const [showSettings, setShowSettings] = useState(false)
  
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pantagon_settings')
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  
  const todosRef = useRef([])
  const intervalRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([fetchTodos(), fetchCategories()])
      setTodos(t)
      setCategories(c)
    } catch {
      showToast('Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])
  useEffect(() => { todosRef.current = todos }, [todos])

  // Fire once after todos load or settings change
  useEffect(() => {
    if (!settings.notificationsEnabled || loading || todos.length === 0) return
    checkAndNotify(todosRef.current, settings)
  }, [loading, settings.notificationsEnabled, settings.dueSoonMinutes, settings.quietHoursEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Interval check - run every 1 minute to check time-sensitive boundaries (due soon, overdue, summaries)
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (!settings.notificationsEnabled) return

    intervalRef.current = setInterval(() => {
      checkAndNotify(todosRef.current, settings)
    }, 60000)

    return () => clearInterval(intervalRef.current)
  }, [settings.notificationsEnabled, settings.dueSoonMinutes, settings.quietHoursEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-notify on app focus
  useEffect(() => {
    if (!settings.notificationsEnabled) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAndNotify(todosRef.current, settings)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [settings.notificationsEnabled, settings.dueSoonMinutes, settings.quietHoursEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(async (id, completed) => {
    setTodos(prev => prev.map(t => t.id === id
      ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t))
    try {
      await toggleTodo(id, completed)
      if (completed) {
        showToast('Done!')
        if (settings.soundEnabled) {
          playCompletionSound()
        }
      }
    } catch { load() }
  }, [load, showToast, settings.soundEnabled])

  const handleDelete = useCallback(async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    try { await deleteTodo(id); showToast('Deleted') }
    catch { load() }
  }, [load, showToast])

  const handleSave = useCallback(async (data) => {
    try {
      if (editTodo && editTodo.id) {
        const updated = await updateTodo(editTodo.id, data)
        setTodos(prev => prev.map(t => t.id === editTodo.id ? updated : t))
        showToast('Updated')
      } else {
        const created = await createTodo(data)
        setTodos(prev => [created, ...prev])
        showToast('Task added')
      }
      setShowAdd(false); setEditTodo(null)
    } catch { showToast('Save failed', 'error') }
  }, [editTodo, showToast])

  const today = new Date().toISOString().slice(0, 10)

  const filteredTodos = todos.filter(t => {
    if (categoryFilter && t.category_id !== categoryFilter) return false
    if (filter === 'today') return t.due_date === today && !t.completed
    if (filter === 'done') return t.completed
    return !t.completed
  })

  const todayCount = todos.filter(t => t.due_date === today && !t.completed).length
  const overdueCount = todos.filter(t => !t.completed && t.due_date && t.due_date < today).length

  return (
    <div className="app">
      <Header onOpenSettings={() => setShowSettings(true)} />
      <StatsBar 
        todos={todos} 
        todayCount={todayCount} 
        overdueCount={overdueCount} 
        activeView={viewMode}
        onViewToggle={() => setViewMode(prev => prev === 'tasks' ? 'calendar' : 'tasks')}
      />

      {viewMode === 'tasks' ? (
        <>
          <FilterBar
            filter={filter} setFilter={setFilter}
            categories={categories}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />
          <TodoList
            todos={filteredTodos}
            loading={loading}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={t => { setEditTodo(t); setShowAdd(true) }}
          />
        </>
      ) : (
        <CalendarView
          todos={todos}
          loading={loading}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={t => { setEditTodo(t); setShowAdd(true) }}
          onAddTask={(dateStr) => {
            setEditTodo({ due_date: dateStr })
            setShowAdd(true)
          }}
        />
      )}

      <button className="fab" onClick={() => { setEditTodo(null); setShowAdd(true) }} aria-label="Add task">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showAdd && (
        <AddTodoSheet
          todo={editTodo}
          categories={categories}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setShowAdd(false); setEditTodo(null) }}
        />
      )}

      {showSettings && (
        <SettingsView
          onSettingsChange={setSettings}
          showToast={showToast}
          triggerTestNotification={() => {
            checkAndNotify(todosRef.current, { ...settings, notificationsEnabled: true }, true)
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}
