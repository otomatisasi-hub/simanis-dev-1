import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

export function CreateUserDialog({ open, onOpenChange, onCreated }: any) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    phone: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke("admin_create_user", {
        body: {
          email: form.email,
          username: form.username,
          password: form.password,
          full_name: form.full_name,
          phone: form.phone || null
        }
      })
      
      if (error) throw error
      
      toast({ title: "Berhasil", description: "User berhasil dibuat" })
      if (onCreated) await onCreated()
      onOpenChange(false)
      setForm({ email: "", username: "", password: "", full_name: "", phone: "" })
    } catch (err: any) {
      console.error("Create user error:", err)
      toast({ 
        title: "Error", 
        description: err.message || "Gagal membuat user", 
        variant: "destructive" 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input 
              type="email" 
              required 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <Label>Username</Label>
            <Input 
              required 
              value={form.username} 
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input 
              type="password" 
              required 
              value={form.password} 
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <Label>Nama Lengkap</Label>
            <Input 
              required 
              value={form.full_name} 
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <Label>No Telepon (opsional)</Label>
            <Input 
              value={form.phone} 
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
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
