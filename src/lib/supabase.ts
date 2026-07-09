import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Em desenvolvimento sem as variáveis de ambiente definidas, cria um client "falso"
// apontando para um host inválido em vez de derrubar o app inteiro — App.tsx detecta
// `isSupabaseConfigured` e mostra uma tela explicando o que falta configurar.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
