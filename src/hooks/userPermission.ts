// src/hooks/usePermission.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function usePermission(resource: string, action: 'create' | 'read' | 'update' | 'delete') {
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPermission()
  }, [resource, action])

  const checkPermission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setAllowed(false)
        return
      }

      const response = await fetch(
        `http://localhost:3001/api/users/permissions/check?resource=${resource}&action=${action}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      const result = await response.json()
      setAllowed(result.allowed || false)
    } catch (error) {
      console.error('Permission check error:', error)
      setAllowed(false)
    } finally {
      setLoading(false)
    }
  }

  return { allowed, loading }
}
