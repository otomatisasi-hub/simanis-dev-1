// src/components/finance/FinanceDetailDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { FinanceRecord } from '@/lib/api/finance'
import { TrendingUp, Receipt, Wallet, AlertCircle } from 'lucide-react'

interface FinanceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  finance: FinanceRecord | null
}

export function FinanceDetailDialog({ 
  open, 
  onOpenChange, 
  finance 
}: FinanceDetailDialogProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      completed: 'default',
      paid: 'default',
      partial: 'outline',
      unpaid: 'destructive',
    }

    const labels: Record<string, string> = {
      pending: 'Pending',
      completed: 'Completed',
      paid: 'Paid',
      partial: 'Partial',
      unpaid: 'Unpaid',
    }

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    )
  }

  if (!finance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Transaksi Keuangan</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-sm">
          {/* Jenis Transaksi & Status */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">Jenis Transaksi</p>
              <p className="font-semibold text-lg">{finance.follow_up_type}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              {getStatusBadge(finance.status_pembayaran)}
            </div>
          </div>

          <Separator />

          {/* Billing System Breakdown */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Ringkasan Keuangan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Total Biaya Layanan */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Total Biaya Layanan (Kontrak)
                </p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {formatCurrency(finance.total_biaya_layanan || finance.nominal)}
                </p>
              </div>

              {/* Total Bayar */}
              <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Total Terbayar
                </p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {formatCurrency(finance.total_bayar || 0)}
                </p>
              </div>

              {/* Total DP */}
              <div className="p-3 border rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total DP (PNBP & Proses)</p>
                </div>
                <p className="font-semibold">{formatCurrency(finance.total_dp || 0)}</p>
              </div>

              {/* Total Invoice */}
              <div className="p-3 border rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total Invoice (Pelunasan)</p>
                </div>
                <p className="font-semibold">{formatCurrency(finance.total_invoice || 0)}</p>
              </div>
            </div>

            {/* Sisa Bayar - Prominent */}
            <div className="mt-3 p-4 border-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Sisa Yang Belum Terbayar
                  </p>
                </div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {formatCurrency(finance.sisa_bayar > 0 ? finance.sisa_bayar : 0)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Informasi Layanan */}
          <div>
            <h3 className="font-semibold mb-3">Informasi Layanan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Modul</p>
                <p>{finance.modul || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice Number</p>
                <p className="font-mono text-xs">{finance.invoice_number || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Klien</p>
                <p className="font-medium">{finance.client_name}</p>
                {finance.client_phone && (
                  <p className="text-xs text-muted-foreground">{finance.client_phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email Klien</p>
                <p className="text-xs">{finance.client_email || '-'}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Layanan</p>
              <p className="font-medium">{finance.service_title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {finance.layanan} - {finance.sub_layanan}
              </p>
            </div>
          </div>

          <Separator />

          {/* Informasi Tambahan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
              <p>
                {finance.due_date 
                  ? new Date(finance.due_date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })
                  : '-'
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dibuat</p>
              <p className="text-xs">
                {new Date(finance.created_at).toLocaleString('id-ID')}
              </p>
              {finance.created_by_name && (
                <p className="text-xs text-muted-foreground">
                  oleh: {finance.created_by_name}
                </p>
              )}
            </div>
          </div>

          {/* Claimed By */}
          {finance.claimed_by_name && (
            <div className="p-3 border-2 rounded-lg bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                Status Penugasan
              </p>
              <p className="font-semibold">Dikerjakan oleh: {finance.claimed_by_name}</p>
              {finance.claimed_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sejak: {new Date(finance.claimed_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {finance.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Catatan</p>
              <div className="p-3 border rounded-lg bg-muted/30">
                <p className="text-sm">{finance.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
