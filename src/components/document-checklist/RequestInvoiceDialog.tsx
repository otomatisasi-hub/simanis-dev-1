// src/components/document-checklist/RequestInvoiceDialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface RequestInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: string
  dueDate: string
  notes: string
  submitting: boolean
  onChangeAmount: (value: string) => void
  onChangeDueDate: (value: string) => void
  onChangeNotes: (value: string) => void
  onSubmit: () => void
}

export function RequestInvoiceDialog({
  open,
  onOpenChange,
  amount,
  dueDate,
  notes,
  submitting,
  onChangeAmount,
  onChangeDueDate,
  onChangeNotes,
  onSubmit,
}: RequestInvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Invoice ke Keuangan</DialogTitle>
          <DialogDescription>
            Isi nominal dan jatuh tempo invoice yang diminta ke tim keuangan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nominal Invoice (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => onChangeAmount(e.target.value)}
              placeholder="Contoh: 5000000"
            />
          </div>

          <div className="space-y-2">
            <Label>Jatuh Tempo Invoice</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => onChangeDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="Tambahkan catatan untuk tim keuangan..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !amount || !dueDate}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim ke Keuangan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
