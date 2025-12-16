import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/custom-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, User, Mail, Phone, Save } from "lucide-react"

interface ProfileData {
  full_name: string
  email: string
  phone: string
}

interface ProfileEditFormProps {
  user_id: string
  onSaveSuccess?: () => void
}

export function ProfileEditForm({ user_id, onSaveSuccess }: ProfileEditFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    if (!user_id) return
    fetchProfile()
  }, [user_id])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user_id)
        .single()

      if (profileError) throw profileError

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      setProfile({
        full_name: profileData.full_name || "",
        email: user?.email || "",
        phone: profileData.phone || "",
      })
    } catch (error: any) {
      console.error("Fetch profile error:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data profil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile.full_name) {
      toast({
        title: "Error",
        description: "Nama lengkap harus diisi",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          updatedat: new Date().toISOString(),
        })
        .eq("user_id", user_id)

      if (profileError) throw profileError

      toast({
        title: "Berhasil",
        description: "Profil berhasil diperbarui",
      })

      if (onSaveSuccess) onSaveSuccess()
    } catch (error: any) {
      console.error("Update profile error:", error)
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui profil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-teal rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle>Edit Profil</CardTitle>
            <CardDescription>Perbarui informasi profil Anda</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                className="pl-10"
                placeholder="Masukkan nama lengkap"
                required
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={profile.email}
                className="pl-10 bg-gray-50"
                disabled
                readOnly
              />
            </div>
            <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">No. Telepon</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="pl-10"
                placeholder="08xxxxxxxxxx"
                disabled={saving}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
