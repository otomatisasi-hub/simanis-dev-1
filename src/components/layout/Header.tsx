import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function Header() {
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        // Get session with token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.warn('User not authenticated')
          setCurrentUser(null)
          setUnreadCount(0)
          return
        }

        setCurrentUser(session.user)

        try {
          // Fetch with Authorization header
          const response = await fetch(
            `${API_URL}/api/notifications/${session.user.id}?unreadOnly=true`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,  // ← ADD TOKEN
              },
            }
          )

          if (!response.ok) {
            // If 401, session might be expired
            if (response.status === 401) {
              console.warn('Session expired, falling back to Supabase')
              await fetchFromSupabaseDirect(session.user.id)
              return
            }
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('Backend returned non-JSON response')
            await fetchFromSupabaseDirect(session.user.id)
            return
          }

          const result = await response.json()

          if (result.success) {
            setUnreadCount(result.data?.length || 0)
          } else {
            await fetchFromSupabaseDirect(session.user.id)
          }

        } catch (fetchError: any) {
          console.warn('Backend API not available:', fetchError.message)
          await fetchFromSupabaseDirect(session.user.id)
        }

      } catch (error) {
        console.error('Error in fetchUserAndNotifications:', error)
        setUnreadCount(0)
      }
    }

    const fetchFromSupabaseDirect = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('is_read', false)

        if (!error && data) {
          setUnreadCount(data.length)
        } else {
          setUnreadCount(0)
        }
      } catch (err) {
        console.error('Supabase fallback failed:', err)
        setUnreadCount(0)
      }
    }

    fetchUserAndNotifications()
    
    const interval = setInterval(fetchUserAndNotifications, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-white shadow-sm border-b">
      {/* Your header content here */}
      {unreadCount > 0 && (
        <button onClick={() => navigate('/notifications')} className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1" variant="destructive">
            {unreadCount}
          </Badge>
        </button>
      )}
    </header>
  )
}
