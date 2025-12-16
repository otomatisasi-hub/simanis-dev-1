// src/components/document-checklist/PnbpStatusSection.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, DollarSign, FileText, ExternalLink } from 'lucide-react'
import { RequestInvoiceDialog } from './RequestInvoiceDialog'
import type { PnbpStatus } from './useDocumentChecklist'

interface PnbpStatusSectionProps {
  isPnbpStep: boolean
  pnbpStatus: PnbpStatus | null
  loading: boolean
  requestInProgress: boolean
  onRequestPnbp: () => void
  // ✅ Props tambahan untuk dialog
  serviceId?: string
  stepInstanceId?: string
}

export function PnbpStatusSection({
  isPnbpStep,
  pnbpStatus,
  loading,
  requestInProgress,
  onRequestPnbp,
  serviceId,
  stepInstanceId,
}: PnbpStatusSectionProps) {
  // ✅ State untuk dialog
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!isPnbpStep) return null

  // ✅ Handler untuk membuka dialog
  const handleOpenDialog = () => {
    setDialogOpen(true)
  }

  // ✅ Handler setelah request berhasil
  const handleRequestSuccess = () => {
    setDialogOpen(false)
    onRequestPnbp() // Refresh data di parent
  }

  // ✅ Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // ✅ Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <div className="space-y-4">
        {pnbpStatus ? (
          // ✅ EXISTING REQUEST - Tampilkan card info
          <div
            className={`p-4 rounded-lg border ${
              pnbpStatus.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : pnbpStatus.status === 'hold'
                ? 'bg-orange-50 border-orange-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-sm">Request PNBP</h4>
              </div>
              <Badge
                variant={
                  pnbpStatus.status === 'completed'
                    ? 'default'
                    : pnbpStatus.status === 'hold'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {pnbpStatus.status === 'completed'
                  ? 'Selesai'
                  : pnbpStatus.status === 'hold'
                  ? 'Hold'
                  : pnbpStatus.status === 'paid'
                  ? 'Sudah Dibayar'
                  : 'Menunggu'}
              </Badge>
            </div>

            {/* Info detail PNBP */}
            <div className="space-y-2 text-sm">
              {/* Nominal */}
              {pnbpStatus.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Nominal PNBP:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(pnbpStatus.amount)}
                  </span>
                </div>
              )}

              {/* Tanggal Request */}
              {pnbpStatus.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal Request:</span>
                  <span className="text-gray-900">
                    {formatDate(pnbpStatus.created_at)}
                  </span>
                </div>
              )}

              {/* Due Date */}
              {pnbpStatus.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Jatuh Tempo:</span>
                  <span className="text-gray-900">
                    {new Date(pnbpStatus.due_date).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}

              {/* Invoice File (jika ada) */}
              {pnbpStatus.invoice_file_url && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => window.open(`http://localhost:3001${pnbpStatus.invoice_file_url}`, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                    Lihat Invoice dari Keuangan
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Payment Proof (jika ada) */}
              {pnbpStatus.payment_proof_url && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => window.open(`http://localhost:3001${pnbpStatus.payment_proof_url}`, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                    Lihat Bukti Pembayaran
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Completed Date */}
              {pnbpStatus.completed_at && (
                <div className="flex justify-between mt-2 pt-2 border-t border-green-200">
                  <span className="text-gray-600">Diselesaikan:</span>
                  <span className="text-green-700 font-medium">
                    {formatDate(pnbpStatus.completed_at)}
                  </span>
                </div>
              )}

              {/* Hold Reason */}
              {pnbpStatus.hold_reason && (
                <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-300">
                  <p className="text-xs text-orange-800">
                    <strong>Alasan Hold:</strong> {pnbpStatus.hold_reason}
                  </p>
                </div>
              )}

              {/* Notes */}
              {pnbpStatus.notes && (
                <div className="mt-2 p-3 bg-gray-100 rounded">
                  <p className="text-xs text-gray-700">
                    <strong>Catatan:</strong> {pnbpStatus.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Info untuk notaris */}
            {pnbpStatus.status === 'pending' && (
              <div className="mt-3 p-3 bg-blue-100 rounded">
                <p className="text-xs text-blue-800">
                  💡 <strong>Info:</strong> Request PNBP telah dikirim ke bagian keuangan. 
                  Anda dapat melanjutkan ke step berikutnya.
                </p>
              </div>
            )}
          </div>
        ) : (
          // ✅ NO REQUEST YET - Tampilkan tombol untuk create request
          <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-6">
            <div className="flex flex-col items-center gap-3">
              <DollarSign className="h-12 w-12 text-blue-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Belum ada Request PNBP
                </p>
                <p className="text-xs text-gray-600">
                  Klik tombol di bawah untuk mengirim request PNBP ke bagian keuangan
                </p>
              </div>
              <Button
                onClick={handleOpenDialog}
                disabled={loading || requestInProgress || !serviceId || !stepInstanceId}
                className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {loading || requestInProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim Request...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request PNBP ke Keuangan
                  </>
                )}
              </Button>
              
              {(!serviceId || !stepInstanceId) && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Service ID atau Step ID tidak ditemukan
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Request Invoice Dialog */}
      {serviceId && stepInstanceId && (
        <RequestInvoiceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serviceId={serviceId}
          type="pnbp"
          stepInstanceId={stepInstanceId}
          onSuccess={handleRequestSuccess}
        />
      )}
    </>
  )
}
