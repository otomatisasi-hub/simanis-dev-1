// src/components/document-checklist/InvoiceStatusSection.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink } from 'lucide-react'

interface InvoiceStatusSectionProps {
  isInvoiceStep: boolean
  invoiceStatus: any
  serviceId: string | undefined
  apiUrl: string
  onRequestInvoice: () => void
}

export function InvoiceStatusSection({
  isInvoiceStep,
  invoiceStatus,
  serviceId,
  apiUrl,
  onRequestInvoice,
}: InvoiceStatusSectionProps) {
  if (!isInvoiceStep) return null

  if (invoiceStatus && invoiceStatus.status === 'completed') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Status Invoice</h4>
            <Badge className="bg-green-600 text-white">Selesai</Badge>
          </div>

          {invoiceStatus.invoice_number && (
            <p className="text-sm text-gray-700">
              <strong>No. Invoice:</strong> {invoiceStatus.invoice_number}
            </p>
          )}

          {invoiceStatus.amount && (
            <p className="text-sm text-gray-700">
              <strong>Nominal:</strong> Rp{' '}
              {Number(invoiceStatus.amount).toLocaleString('id-ID')}
            </p>
          )}

          {invoiceStatus.service_fee_payments &&
            invoiceStatus.service_fee_payments.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  File Invoice:
                </p>
                {invoiceStatus.service_fee_payments.map((payment: any) => (
                  <Button
                    key={payment.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`${apiUrl}${payment.file_url}`, '_blank')
                    }
                    className="w-full md:w-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {payment.file_name || 'Lihat Invoice'}
                  </Button>
                ))}
              </div>
            )}
        </div>
      </div>
    )
  }

  if (invoiceStatus && invoiceStatus.status === 'pending') {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Status Invoice</h4>
            <Badge variant="secondary">Pending</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Invoice sedang diproses oleh Keuangan.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-3">
          Pembuatan dan upload Invoice dilakukan oleh bagian Keuangan. Gunakan
          tombol di bawah untuk mengirim permintaan Invoice dan/atau membuka
          modul Keuangan.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="w-full sm:w-auto" onClick={onRequestInvoice}>
            Request Invoice ke Keuangan
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() =>
              serviceId &&
              window.open(`/keuangan/invoice?serviceId=${serviceId}`, '_blank')
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Buka Modul Keuangan
          </Button>
        </div>
      </div>
    </div>
  )
}
