import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface UserPermission {
  resource: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('userpermissions')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching permissions:', error)
        setPermissions([])
      } else {
        setPermissions(data || [])
      }
    } catch (error) {
      console.error('Fetch permissions error:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (resource: string, action: 'create' | 'read' | 'update' | 'delete') => {
    const permission = permissions.find(p => p.resource === resource)
    if (!permission) return false
    return permission[`can_${action}`] || false
  }

  const canAccessResource = (resource: string) => {
    const permission = permissions.find(p => p.resource === resource)
    if (!permission) return false
    return permission.can_read || permission.can_create || permission.can_update || permission.can_delete
  }

  return {
    permissions,
    loading,
    hasPermission,
    canAccessResource,
    refetch: fetchPermissions
  }
}
