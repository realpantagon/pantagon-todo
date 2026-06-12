import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchTodos, fetchCategories, createTodo, updateTodo, deleteTodo, toggleTodo } from './lib/todos'
import { requestPermission, checkAndNotify } from './lib/notifications'
import Header from './components/Header'
import TodoList from './components/TodoList'
import AddTodoSheet from './components/AddTodoSheet'
import FilterBar from './components/FilterBar'
import StatsBar from './components/StatsBar'
import Toast from './components/Toast'
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
  const [notifEnabled, setNotifEnabled] = useState(Notification?.permission === 'granted')
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
      showToast('โหลดข้อมูลไม่ได้', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  // Keep ref in sync so interval always has latest todos
  useEffect(() => { todosRef.current = todos }, [todos])

  // Notify when todos finish loading (and permission granted)
  useEffect(() => {
    if (!notifEnabled || loading || todos.length === 0) return
    checkAndNotify(todosRef.current)
  }, [loading, notifEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Interval every 3 min — restart when notifEnabled changes
  useEffect(() => {
    if (!notifEnabled) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => checkAndNotify(todosRef.current), 3 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [notifEnabled])

  // Re-notify when user comes back to the tab/app (handles mobile background throttle)
  useEffect(() => {
    if (!notifEnabled) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotify(todosRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [notifEnabled])

  const handleEnableNotif = useCallback(async () => {
    const granted = await requestPermission()
    setNotifEnabled(granted)
    if (!granted) showToast('ไม่ได้รับอนุญาตแจ้งเตือน', 'error')
    else showToast('เปิดการแจ้งเตือนแล้ว')
  }, [showToast])

  const handleToggle = useCallback(async (id, completed) => {
    setTodos(prev => prev.map(t => t.id === id
      ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
      : t
    ))
    try {
      await toggleTodo(id, completed)
      if (completed) showToast('✓ เสร็จแล้ว!')
    } catch {
      load()
      showToast('เกิดข้อผิดพลาด', 'error')
    }
  }, [load, showToast])

  const handleDelete = useCallback(async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    try {
      await deleteTodo(id)
      showToast('ลบแล้ว')
    } catch {
      load()
      showToast('เกิดข้อผิดพลาด', 'error')
    }
  }, [load, showToast])

  const handleSave = useCallback(async (data) => {
    try {
      if (editTodo) {
        const updated = await updateTodo(editTodo.id, data)
        setTodos(prev => prev.map(t => t.id === editTodo.id ? updated : t))
        showToast('อัปเดตแล้ว')
      } else {
        const created = await createTodo(data)
        setTodos(prev => [created, ...prev])
        showToast('เพิ่มงานแล้ว')
      }
      setShowAdd(false)
      setEditTodo(null)
    } catch {
      showToast('บันทึกไม่สำเร็จ', 'error')
    }
  }, [editTodo, showToast])

  const today = new Date().toISOString().slice(0, 10)

  const filteredTodos = todos.filter(t => {
    if (categoryFilter && t.category_id !== categoryFilter) return false
    if (filter === 'today') return t.due_date === today && !t.completed
    if (filter === 'done') return t.completed
    return !t.completed
  })

  const todayCount = todos.filter(t => t.due_date === today && !t.completed).length

  return (
    <div className="app">
      <Header notifEnabled={notifEnabled} onEnableNotif={handleEnableNotif} />
      <StatsBar todos={todos} todayCount={todayCount} />
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
      <button
        className="fab"
        onClick={() => { setEditTodo(null); setShowAdd(true) }}
        aria-label="เพิ่มงานใหม่"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      {showAdd && (
        <AddTodoSheet
          todo={editTodo}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditTodo(null) }}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}
