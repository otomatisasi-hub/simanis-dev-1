import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type ProcessInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  onSuccess?: () => void
}

export function ProcessInvoiceDialog(props: ProcessInvoiceDialogProps) {
  const { open, onOpenChange, item, onSuccess } = props

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: isi logic simpan Invoice (call API /api/finance/invoice/process)
    if (onSuccess) onSuccess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proses Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {item ? (
              <>
                <p>Layanan: {item.service_title}</p>
                <p>Klien: {item.client_name}</p>
              </>
            ) : (
              <p>Tidak ada data terpilih.</p>
            )}
          </div>

          {/* TODO: tambahkan field: nominal, nomor invoice, due date, upload bukti, dll */}

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
