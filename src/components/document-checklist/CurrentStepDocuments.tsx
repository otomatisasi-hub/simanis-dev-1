// src/components/document-checklist/CurrentStepDocuments.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Upload,
} from 'lucide-react'
import { RequestInvoiceDialog } from '@/components/document-checklist/RequestInvoiceDialog'

export interface StepDocument {
  id: string
  document_name: string
  is_required: boolean
  is_uploaded: boolean
  file_url?: string
  uploaded_at?: string
}

export interface CurrentWorkflowStep {
  id: string
  step_order: number
  step_name: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  documents?: StepDocument[]
}

interface CurrentStepDocumentsProps {
  currentStep: CurrentWorkflowStep
  currentStepIndex: number
  requiredDocuments: string[]
  missingDocuments: string[]
  documentCompleteness: number
  isPnbpStep: boolean
  isInvoiceStep: boolean
  onUploadClick: (doc: StepDocument, step: CurrentWorkflowStep) => void
  onPrevStep: () => void
  onNextStep: () => void
  canProceedToNextStep: boolean
  
  // Props untuk Payment Request
  serviceId?: string
  onPaymentRequestSent?: () => void
  onPaymentProofUploaded?: () => void
}

export function CurrentStepDocuments({
  currentStep,
  currentStepIndex,
  requiredDocuments,
  missingDocuments,
  documentCompleteness,
  isPnbpStep,
  isInvoiceStep,
  onUploadClick,
  onPrevStep,
  onNextStep,
  canProceedToNextStep,
  serviceId,
  onPaymentRequestSent,
  onPaymentProofUploaded,
}: CurrentStepDocumentsProps) {
  const docs = currentStep.documents || []
  const uploadedCount = docs.filter((d) => d.is_uploaded).length

  // ✅ State untuk dialog
  const [pnbpDialogOpen, setPnbpDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)

  // ✅ Handler untuk create dokumen on-the-fly jika belum ada
  const handleCreateAndUpload = () => {
    if (!currentStep) return

    // Create temporary document object
    const tempDoc: StepDocument = {
      id: `temp-${Date.now()}`, // Temporary ID, akan diganti di backend
      document_name: currentStep.step_name || `Step ${currentStep.step_order}`,
      is_required: true,
      is_uploaded: false,
    }

    // Trigger upload dialog dengan dokumen temporary
    onUploadClick(tempDoc, currentStep)
  }

  // ✅ Handler setelah request berhasil dikirim
  const handleRequestSuccess = () => {
    setPnbpDialogOpen(false)
    setInvoiceDialogOpen(false)
    onPaymentRequestSent?.()
  }

  return (
    <div className="space-y-6">
      {/* Progress Dokumen (hanya tampil di step pertama & bukan payment step) */}
      {currentStepIndex === 0 && requiredDocuments.length > 0 && !isPnbpStep && !isInvoiceStep && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-orange-800">
              Kelengkapan Dokumen
            </h3>
            <span className="text-2xl font-bold text-orange-600">
              {documentCompleteness}%
            </span>
          </div>
          <Progress value={documentCompleteness} className="h-2 mb-3" />

          {missingDocuments.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Dokumen yang belum diupload:
              </p>
              <ul className="list-disc list-inside text-xs text-orange-600 space-y-1">
                {missingDocuments.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ✅ PNBP Request Section */}
      {isPnbpStep && serviceId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              Request PNBP (Down Payment)
            </h4>
          </div>
          
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex flex-col items-center gap-4">
              <DollarSign className="h-16 w-16 text-blue-600" />
              <div className="text-center">
                <h5 className="text-base font-semibold text-blue-900 mb-2">
                  Request PNBP ke Bagian Keuangan
                </h5>
                <p className="text-sm text-blue-700 mb-1">
                  Klik tombol di bawah untuk mengirim request PNBP dengan nominal
                </p>
                <p className="text-xs text-blue-600">
                  Bagian keuangan akan memproses dan mengirimkan bukti pembayaran
                </p>
              </div>
              
              <Button 
                onClick={() => setPnbpDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                size="lg"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Request PNBP
              </Button>
            </div>
          </div>

          {/* Info untuk notaris */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Info:</strong> Anda dapat melanjutkan ke step berikutnya 
              setelah mengirim request PNBP. Bukti pembayaran akan diupload oleh keuangan.
            </p>
          </div>
        </div>
      )}

      {/* ✅ Invoice Request Section */}
      {isInvoiceStep && serviceId && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              Request Invoice (Pelunasan)
            </h4>
          </div>
          
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex flex-col items-center gap-4">
              <DollarSign className="h-16 w-16 text-green-600" />
              <div className="text-center">
                <h5 className="text-base font-semibold text-green-900 mb-2">
                  Request Invoice ke Bagian Keuangan
                </h5>
                <p className="text-sm text-green-700 mb-1">
                  Klik tombol di bawah untuk mengirim request invoice pelunasan
                </p>
                <p className="text-xs text-green-600">
                  Nominal akan dihitung otomatis dari sisa pembayaran
                </p>
              </div>
              
              <Button 
                onClick={() => setInvoiceDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white mt-2"
                size="lg"
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Request Invoice
              </Button>
            </div>
          </div>

          {/* Info untuk notaris */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              💡 <strong>Info:</strong> Anda dapat melanjutkan ke step berikutnya 
              setelah mengirim request invoice. Bukti pembayaran akan diupload oleh keuangan.
            </p>
          </div>
        </div>
      )}

      {/* Regular Documents - Untuk step NON-payment */}
      {!isPnbpStep && !isInvoiceStep && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dokumen Step Ini {docs.length > 0 && `(${uploadedCount} / ${docs.length})`}
          </h4>
          
          {docs.length > 0 ? (
            // Jika ada dokumen, render list seperti biasa
            <div className="grid gap-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {doc.is_uploaded ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.document_name}
                        {doc.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {doc.is_uploaded && doc.uploaded_at && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Uploaded:{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {doc.is_uploaded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          doc.file_url && window.open(`http://localhost:3001${doc.file_url}`, '_blank')
                        }
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onUploadClick(doc, currentStep)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Jika tidak ada dokumen, tampilkan tombol upload
            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6">
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-12 w-12 text-blue-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Silakan upload dokumen untuk step ini
                  </p>
                  <p className="text-xs text-blue-700">
                    Semua step workflow memerlukan upload dokumen
                  </p>
                </div>
                <Button 
                  onClick={handleCreateAndUpload}
                  className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dokumen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State untuk payment step yang belum ada serviceId */}
      {(isPnbpStep || isInvoiceStep) && !serviceId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">
            Service ID tidak ditemukan. Tidak dapat memuat payment request.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={onPrevStep}
          disabled={currentStepIndex === 0}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Step Sebelumnya
        </Button>
        
        <Button
          onClick={onNextStep}
          disabled={!canProceedToNextStep}
          className="w-full sm:w-auto"
        >
          Step Berikutnya
          <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
        </Button>
      </div>

      {/* ✅ PNBP Request Dialog */}
      {serviceId && (
        <RequestInvoiceDialog
          open={pnbpDialogOpen}
          onOpenChange={setPnbpDialogOpen}
          serviceId={serviceId}
          stepInstanceId={currentStep.id}
          type="pnbp"
          onSuccess={handleRequestSuccess}
        />
      )}

      {/* ✅ Invoice Request Dialog */}
      {serviceId && (
        <RequestInvoiceDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          serviceId={serviceId}
          stepInstanceId={currentStep.id}
          type="invoice"
          onSuccess={handleRequestSuccess}
        />
      )}
    </div>
  )
}
