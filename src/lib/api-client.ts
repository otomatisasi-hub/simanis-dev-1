// src/lib/api-fetch.ts
import { supabase } from '@/integrations/supabase/client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Session tidak ditemukan, silakan login ulang')
  }
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (response.status === 401) {
    throw new Error('Session expired, silakan login ulang')
  }
  return response
}
