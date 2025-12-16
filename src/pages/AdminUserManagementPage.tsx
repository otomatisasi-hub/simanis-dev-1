// src/pages/AdminUserManagementPage.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Pencil, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { UserEditDialog } from "@/components/user/UserEditDialog"
import { EditUserPermissionDialog } from "@/components/user/EditUserPermissionDialog"
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog"
import { CreateUserDialog } from "@/components/user/CreateUserDialog"


export function AdminUserManagementPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const [previewLoading, setPreviewLoading] = useState(false)
  const [transferPreview, setTransferPreview] = useState<{
    clients_created_by: number
    services_related: number
  } | null>(null)


  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .order("created_at", { ascending: false })

      if (error) throw error

      const userIds = profiles.map((p: any) => p.user_id)

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, assigned_at")
        .in("user_id", userIds)
        .order("assigned_at", { ascending: false })

      if (rolesError) throw rolesError

      const latestRoleMap = new Map<string, string>()
      for (const r of roles ?? []) {
        if (!latestRoleMap.has(r.user_id)) latestRoleMap.set(r.user_id, r.role)
      }

      const usersWithRole = profiles.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        role: latestRoleMap.get(p.user_id) || "-",
      }))

      setUsers(usersWithRole)
    } catch (err: any) {
      console.error("Error fetching users", err)
      toast({
        title: "Error",
        description: "Gagal memuat data user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function onEditUser(user: any) {
    setSelectedUser(user)
    setEditDialogOpen(true)
  }

  function onEditPermission(user: any) {
    setSelectedUser(user)
    setPermissionDialogOpen(true)
  }

  function onTriggerDelete(user: any) {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  // Daftar user tujuan transfer (semua user selain user yang mau dihapus)
  const transferTargets =
    userToDelete
      ? users
          .filter((u) => u.user_id !== userToDelete.user_id)
          .map((u) => ({
            id: u.user_id,
            full_name: u.full_name,
            email: undefined,
          }))
      : []

  // Handler hapus yang menerima targetUserId dari dialog
  const handleDeleteUser = async (targetUserId: string) => {
    if (!userToDelete) return

    setDeleting(true)
    try {
      // Ambil token session untuk otentikasi ke backend admin
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token
      if (!token) throw new Error("Session tidak ditemukan")

      const url = `http://localhost:3001/api/admin/users/${userToDelete.user_id}/transfer-and-delete`
      console.log("Calling transfer-and-delete:", url, "targetUserId:", targetUserId)

      // Panggil backend admin yang pakai service_role dan SQL function transfer_and_delete_user
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      })

      // Baca raw text dulu untuk debug kalau bukan JSON
      const rawText = await res.text()
      console.log("Transfer & delete raw response:", res.status, rawText)

      let result: any
      try {
        result = JSON.parse(rawText)
      } catch {
        throw new Error(
          `Server mengembalikan non-JSON (status ${res.status}). Cek apakah server 3001 & route /api/admin/users/:id/transfer-and-delete sudah jalan dan return res.json().`
        )
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal transfer & hapus user")
      }

      toast({
        title: "Berhasil",
        description: `Data user "${userToDelete.full_name}" berhasil dipindahkan dan user dihapus`,
      })

      setDeleteDialogOpen(false)
      setUserToDelete(null)
      await fetchUsers()
    } catch (error: any) {
      console.error("Gagal transfer & hapus user", error)
      toast({
        title: "Error",
        description: error.message || "Gagal transfer & hapus user",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tambah User
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 w-12">No</th>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3 w-80 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.user_id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.phone || "-"}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onEditUser(user)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit Data
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onEditPermission(user)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit Permission
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onTriggerDelete(user)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editDialogOpen && selectedUser && (
        <UserEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSaveSuccess={fetchUsers}
        />
      )}

      {permissionDialogOpen && selectedUser && (
        <EditUserPermissionDialog
          open={permissionDialogOpen}
          onOpenChange={setPermissionDialogOpen}
          userId={selectedUser.user_id}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setUserToDelete(null)
        }}
        onConfirm={handleDeleteUser}
        loading={deleting}
        user={
          userToDelete
            ? {
                id: userToDelete.user_id,
                full_name: userToDelete.full_name,
              }
            : null
        }
        transferTargets={transferTargets}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchUsers}
      />
    </div>
  )
}
