import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "notaris", label: "Notaris" },
  { value: "ppat", label: "PPAT" },
  { value: "syariah", label: "Syariah" },
  { value: "keuangan", label: "Keuangan" },
]

export function UserEditDialog({ open, onOpenChange, user, onSaveSuccess }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ full_name: "", phone: "", role: "", email: "", username: "", password: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || "",
        phone: user.phone || "",
        role: user.role || "",
        email: "",
        username: "",
        password: "",
      })
    }
  }, [user])

  const saveUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.user_id)
      if (profileError) throw profileError

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert([{
          user_id: user.user_id,
          role: form.role,
          assigned_at: new Date().toISOString(),
        }], { onConflict: "user_id,role" })
      if (roleError) throw roleError

      if (form.email || form.username || form.password) {
        const { error: fnError } = await supabase.functions.invoke("admin_update_user", {
          body: {
            user_id: user.user_id,
            email: form.email || undefined,
            username: form.username || undefined,
            password: form.password || undefined,
          }
        })
        if (fnError) throw fnError
      }

      toast({ title: "Berhasil", description: "Data user berhasil diperbarui" })
      if (onSaveSuccess) await onSaveSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Gagal memperbarui data user", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Data User</DialogTitle>
        </DialogHeader>
        <form onSubmit={saveUser} className="space-y-4">
          <div>
            <Label>Nama Lengkap</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div>
            <Label>No Telepon</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={role => setForm(f => ({ ...f, role }))}>
              <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Email (kosongkan jika tidak diubah)</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Username (kosongkan jika tidak diubah)</Label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Password (kosongkan jika tidak diubah)</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
