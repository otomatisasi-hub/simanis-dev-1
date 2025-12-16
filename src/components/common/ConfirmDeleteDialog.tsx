// src/components/common/ConfirmDeleteDialog.tsx
"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"

interface TransferTarget {
  id: string
  full_name?: string
  nama?: string
  email?: string
}

interface TransferPreview {
  clients_created_by: number
  services_related: number
}

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // onConfirm menerima targetUserId yang dipilih
  onConfirm: (targetUserId: string) => void
  loading: boolean
  user: {
    id: string
    full_name?: string
    nama?: string
    email?: string
  } | null
  // Daftar user yang bisa dijadikan tujuan transfer
  transferTargets?: TransferTarget[]
  // Data preview dari parent (opsional)
  transferPreview?: TransferPreview | null
  previewLoading?: boolean
  // Callback opsional jika target user berubah (untuk trigger preview di parent)
  onTargetChange?: (targetUserId: string | undefined) => void
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  user,
  transferTargets = [],
  transferPreview,
  previewLoading = false,
  onTargetChange,
}: ConfirmDeleteDialogProps) {
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string | undefined>(
    undefined
  )

  const safeTargets = transferTargets ?? []

  // Reset & set default target setiap kali dialog dibuka
  useEffect(() => {
    if (open) {
      if (safeTargets.length > 0) {
        const firstId = safeTargets[0].id
        setSelectedTargetUserId(firstId)
        onTargetChange?.(firstId)
      } else {
        setSelectedTargetUserId(undefined)
        onTargetChange?.(undefined)
      }
    } else {
      // saat dialog ditutup, reset internal state
      setSelectedTargetUserId(undefined)
      onTargetChange?.(undefined)
    }
  }, [open, safeTargets, onTargetChange])

  const handleTargetChange = (value: string) => {
    setSelectedTargetUserId(value)
    onTargetChange?.(value)
  }

  const handleConfirm = () => {
    if (!selectedTargetUserId) return
    onConfirm(selectedTargetUserId)
  }

  const userLabel =
    user?.full_name || user?.nama || user?.email || "User tanpa nama"

  const getTargetLabel = (u: TransferTarget) =>
    u.full_name || u.nama || u.email || "User tanpa nama"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Data & Hapus User?</DialogTitle>

          {/* Hindari nested <p> di dalam <p> */}
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus user{" "}
                <span className="font-semibold text-destructive">{userLabel}</span>?
              </p>
              <p>
                Sebelum user dihapus, seluruh data klien, layanan, dan riwayat kerja
                akan dipindahkan terlebih dahulu ke user lain yang Anda pilih.
              </p>
              <p className="font-semibold text-amber-600">
                Aksi ini tidak dapat dibatalkan.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Pilih user tujuan transfer data
            </p>
            <Select
              value={selectedTargetUserId}
              onValueChange={handleTargetChange}
              disabled={loading || safeTargets.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    safeTargets.length === 0
                      ? "Tidak ada user tujuan tersedia"
                      : "Pilih user tujuan"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {safeTargets.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {getTargetLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Semua data yang sebelumnya dimiliki oleh user yang akan dihapus
              akan dialihkan ke user tujuan yang dipilih di atas.
            </p>
          </div>

          {/* Bagian preview ringkasan data yang akan dipindah */}
          {previewLoading ? (
            <p className="text-xs text-muted-foreground">
              <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />
              Menghitung data yang akan dipindah...
            </p>
          ) : transferPreview ? (
            <div className="text-xs text-muted-foreground space-y-1 border rounded-md p-2 bg-gray-50">
              <p className="font-semibold text-gray-700">
                Ringkasan data yang akan dipindah:
              </p>
              <p>
                • Klien yang dibuat oleh user ini:{" "}
                <span className="font-semibold">
                  {transferPreview.clients_created_by}
                </span>
              </p>
              <p>
                • Layanan terkait (dibuat atau di-assign):{" "}
                <span className="font-semibold">
                  {transferPreview.services_related}
                </span>
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            type="button"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={
              loading ||
              !selectedTargetUserId ||
              safeTargets.length === 0
            }
            type="button"
          >
            {loading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2 inline" />
            ) : null}
            Transfer & Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
