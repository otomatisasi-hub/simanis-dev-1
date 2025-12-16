import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

const RESOURCES = [
    { key: "dashboard", label: "Dashboard" },
    { key: "layanan_notaril", label: "Layanan Notaril" },
    { key: "layanan_syariah", label: "Layanan Syariah" },
    { key: "layanan_ppat", label: "Layanan PPAT" },
    { key: "layanan_keuangan_notaril", label: "Keuangan Notaril" },
    { key: "layanan_keuangan_syariah", label: "Keuangan Syariah" },
    { key: "layanan_keuangan_ppat", label: "Keuangan PPAT" },
    { key: "administrator", label: "Administrator" },
    { key: "lokasi_simpan", label: "Lokasi Simpan" },
    { key: "notifikasi", label: "Notifikasi" },
    { key: "audit_log", label: "Audit Log" }
  ]
  

export function EditUserPermissionDialog({ open, onOpenChange, userId }) {
  const toast = useToast()
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchPermissions() {
      if (!open || !userId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("userpermissions")
          .select("id, resource, can_create, can_read, can_update, can_delete")
          .eq("user_id", userId)

        if (error) throw error

        const mapped = RESOURCES.map(resource => {
          const found = data.find(p => p.resource === resource.key)
          return (
            found || {
              resource: resource.key,
              can_create: false,
              can_read: false,
              can_update: false,
              can_delete: false,
            }
          )
        })

        setPermissions(mapped)
      } catch {
        toast.toast({
          title: "Error",
          description: "Gagal load permission",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPermissions()
  }, [open, userId])

  const togglePermission = (resource, prop) => {
    setPermissions(prev =>
      prev.map(p => (p.resource === resource ? { ...p, [prop]: !p[prop] } : p))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const perm of permissions) {
        const { error } = await supabase.from("userpermissions").upsert(
          {
            user_id: userId,
            resource: perm.resource,
            can_create: perm.can_create,
            can_read: perm.can_read,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,resource" }
        )
        if (error) throw error
      }
      toast.toast({ title: "Berhasil", description: "Permission berhasil diupdate" })
      onOpenChange(false)
    } catch (error) {
      toast.toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading Permission...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-10">
            <Loader2 className="animate-spin h-8 w-8" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permission User</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 text-left">Resource</th>
                <th className="px-3 py-2 text-center">Create</th>
                <th className="px-3 py-2 text-center">Read</th>
                <th className="px-3 py-2 text-center">Update</th>
                <th className="px-3 py-2 text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => (
                <tr key={perm.resource} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{RESOURCES.find(r => r.key === perm.resource)?.label || perm.resource}</td>
                  <td className="text-center">
                    <Checkbox checked={perm.can_create} onCheckedChange={() => togglePermission(perm.resource, "can_create")} />
                  </td>
                  <td className="text-center">
                    <Checkbox checked={perm.can_read} onCheckedChange={() => togglePermission(perm.resource, "can_read")} />
                  </td>
                  <td className="text-center">
                    <Checkbox checked={perm.can_update} onCheckedChange={() => togglePermission(perm.resource, "can_update")} />
                  </td>
                  <td className="text-center">
                    <Checkbox checked={perm.can_delete} onCheckedChange={() => togglePermission(perm.resource, "can_delete")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin h-4 w-4 mr-2 inline" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
