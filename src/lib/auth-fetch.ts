import { supabase } from '@/integrations/supabase/client'

export async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Session tidak ditemukan, silakan login ulang')
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 401) {
    throw new Error('Unauthorized: Token expired, silakan login ulang')
  }

  return response
}
