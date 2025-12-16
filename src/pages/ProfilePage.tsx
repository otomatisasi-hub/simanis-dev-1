import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import { Loader2 } from "lucide-react"

export function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!error && user) setUserId(user.id)
      setLoading(false)
    }
    getCurrentUser()
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (!userId) return (
    <div className="flex justify-center items-center py-12 text-red-600">
      User tidak ditemukan, silakan login ulang.
    </div>
  )

  return <ProfileEditForm user_id={userId} />
}
