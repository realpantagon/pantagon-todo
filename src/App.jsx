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
import AnalyticsView from './components/AnalyticsView'
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
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [settings.theme])
  
  const todosRef = useRef([])

  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'success', action = null) => {
    setToast({ msg, type, action })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), action ? 5000 : 2800)
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


  // Puts a task back to pending — used by the Undo action on the "Done!" toast,
  // so a mis-tapped checkbox is always one tap away from being reversed.
  const undoToggle = useCallback(async (id) => {
    clearTimeout(toastTimer.current)
    setToast(null)
    setTodos(prev => prev.map(t => t.id === id
      ? { ...t, completed: false, completed_at: null } : t))
    try { await toggleTodo(id, false) } catch { load() }
  }, [load])

  const handleToggle = useCallback(async (id, completed) => {
    setTodos(prev => prev.map(t => t.id === id
      ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null } : t))
    try {
      await toggleTodo(id, completed)
      if (completed) {
        showToast('Done!', 'success', { label: 'Undo', run: () => undoToggle(id) })
        if (settings.soundEnabled) {
          playCompletionSound()
        }
      }
    } catch { load() }
  }, [load, showToast, undoToggle, settings.soundEnabled])

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
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onToggleAnalytics={() => setViewMode(prev => prev === 'analytics' ? 'tasks' : 'analytics')}
        analyticsActive={viewMode === 'analytics'}
      />
      <StatsBar 
        todos={todos} 
        todayCount={todayCount} 
        overdueCount={overdueCount} 
        activeView={viewMode}
        onViewToggle={() => setViewMode(prev => prev === 'calendar' ? 'tasks' : 'calendar')}
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
      ) : viewMode === 'analytics' ? (
        <AnalyticsView todos={todos} loading={loading} />
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span className="fabLabel">New Task</span>
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

      {toast && <Toast msg={toast.msg} type={toast.type} action={toast.action} />}
    </div>
  )
}
