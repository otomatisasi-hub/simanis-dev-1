// src/components/document-checklist/StepDocumentsPanel.tsx
'use client'

import { Button } from '@/components/ui/button'
import { FileText, CheckCircle2, Circle } from 'lucide-react'
import type { Document, WorkflowStep } from './useDocumentChecklist'

interface StepDocumentsPanelProps {
  currentStep: WorkflowStep
  isPnbpStep: boolean
  isInvoiceStep: boolean
  onUploadClick: (doc: Document, step: WorkflowStep) => void
}

export function StepDocumentsPanel({
  currentStep,
  isPnbpStep,
  isInvoiceStep,
  onUploadClick,
}: StepDocumentsPanelProps) {
  if (
    isPnbpStep ||
    isInvoiceStep ||
    !currentStep.documents ||
    currentStep.documents.length === 0
  ) {
    return null
  }

  const uploadedCount = currentStep.documents.filter((d) => d.is_uploaded).length

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Dokumen ({uploadedCount} / {currentStep.documents.length})
      </h4>
      <div className="grid gap-3">
        {currentStep.documents.map((doc) => (
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
                    {new Date(doc.uploaded_at).toLocaleDateString('id-ID')}
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
                    doc.file_url && window.open(doc.file_url, '_blank')
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
    </div>
  )
}
