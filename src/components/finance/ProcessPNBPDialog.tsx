import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ProcessPNBPDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  onSuccess?: () => void
}

export function ProcessPNBPDialog(props: ProcessPNBPDialogProps) {
  const { open, onOpenChange, item, onSuccess } = props

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: isi logic simpan PNBP (call API /api/finance/pnbp/process)
    // sementara langsung panggil onSuccess dan tutup dialog
    if (onSuccess) onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proses</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {/* Placeholder info layanan */}
            {item ? (
              <>
                <p>Layanan: {item.service_title}</p>
                <p>Klien: {item.client_name}</p>
              </>
            ) : (
              <p>Tidak ada data terpilih.</p>
            )}
          </div>

          {/* TODO: tambahkan field: nominal, tanggal bayar, upload bukti, dll */}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
