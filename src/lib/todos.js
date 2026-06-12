import { supabase } from './supabase'


const PREFERRED_ORDER = ['Aware', 'Adapt', 'Minnie', 'Personal', 'Shopping', 'Management']

function overrideCategoryColor(cat) {
  if (cat && (cat.name || '').trim().toLowerCase() === 'aware') {
    cat.color = '#f87171'
  }
  return cat
}

export async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*, todo_categories(id, name, color, icon)')
    .order('created_at', { ascending: false })
  if (error) throw error
  
  if (data) {
    data.forEach(todo => {
      if (todo.todo_categories) {
        overrideCategoryColor(todo.todo_categories)
      }
    })
  }
  
  return data
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('todo_categories')
    .select('*')
  if (error) throw error
  
  if (data) {
    data.forEach(overrideCategoryColor)
    data.sort((a, b) => {
      const nameA = (a.name || '').trim().toLowerCase()
      const nameB = (b.name || '').trim().toLowerCase()
      
      const idxA = PREFERRED_ORDER.findIndex(p => p.toLowerCase() === nameA)
      const idxB = PREFERRED_ORDER.findIndex(p => p.toLowerCase() === nameB)
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      
      return (a.name || '').localeCompare(b.name || '')
    })
  }
  
  return data
}

export async function createTodo(todo) {
  const { data, error } = await supabase
    .from('todos')
    .insert(todo)
    .select('*, todo_categories(id, name, color, icon)')
    .single()
  if (error) throw error
  
  if (data && data.todo_categories) {
    overrideCategoryColor(data.todo_categories)
  }
  
  return data
}

export async function updateTodo(id, updates) {
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select('*, todo_categories(id, name, color, icon)')
    .single()
  if (error) throw error
  
  if (data && data.todo_categories) {
    overrideCategoryColor(data.todo_categories)
  }
  
  return data
}

export async function deleteTodo(id) {
  const { error } = await supabase.from('todos').delete().eq('id', id)
  if (error) throw error
}

export async function toggleTodo(id, completed) {
  return updateTodo(id, {
    completed,
    completed_at: completed ? new Date().toISOString() : null
  })
}

export async function createCategory(cat) {
  const { data, error } = await supabase
    .from('todo_categories')
    .insert(cat)
    .select()
    .single()
  if (error) throw error
  return data
}
