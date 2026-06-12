import { supabase } from './supabase'

export async function fetchTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*, todo_categories(id, name, color, icon)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('todo_categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createTodo(todo) {
  const { data, error } = await supabase
    .from('todos')
    .insert(todo)
    .select('*, todo_categories(id, name, color, icon)')
    .single()
  if (error) throw error
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
