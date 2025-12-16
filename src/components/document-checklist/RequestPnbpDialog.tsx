// src/components/document-checklist/RequestPnbpDialog.tsx
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

interface RequestPnbpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: string          // simpan string TERFORMAT di state hook
  paidAt: string
  notes: string
  submitting: boolean
  onChangeAmount: (value: string) => void
  onChangePaidAt: (value: string) => void
  onChangeNotes: (value: string) => void
  onSubmit: () => void
}

// helper sama konsepnya dengan yang dipakai di ReviewPaymentDialog
const formatRupiahInput = (value: string) => {
  const numeric = value.replace(/\D/g, '')
  if (!numeric) return ''
  return Number(numeric).toLocaleString('id-ID') // contoh: 1500000 -> "1.500.000"
}

export function RequestPnbpDialog({
  open,
  onOpenChange,
  amount,
  paidAt,
  notes,
  submitting,
  onChangeAmount,
  onChangePaidAt,
  onChangeNotes,
  onSubmit,
}: RequestPnbpDialogProps) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRupiahInput(e.target.value)
    onChangeAmount(formatted)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request PNBP ke Keuangan</DialogTitle>
          <DialogDescription>
            Isi nominal PNBP, tanggal bayar, dan upload bukti bayar untuk
            dikirim ke tim keuangan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nominal PNBP (Rp)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Contoh: 1.500.000"
            />
          </div>

          <div className="space-y-2">
            <Label>Tanggal Bayar</Label>
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => onChangePaidAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="Tambahkan catatan terkait pembayaran PNBP..."
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
            disabled={submitting || !amount || !paidAt}
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
