import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface Profile {
  full_name: string | null
  phone: string | null
  employee_id: string | null
}

export function useUserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, employee_id')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      } else {
        setProfile(profileData)
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (roleError) {
        console.error('Role fetch error:', roleError)
      } else if (roleData) {
        setRoles([roleData.role])
        const normalizedRole = roleData.role.toLowerCase().replace(/_/g, '')
        setIsAdmin(normalizedRole === 'admin' || normalizedRole === 'super_admin')
      }
    } catch (error) {
      console.error('Fetch profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    roles,
    isAdmin,
    loading,
    refetch: fetchProfile
  }
}
