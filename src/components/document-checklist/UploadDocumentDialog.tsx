// src/components/document-checklist/UploadDocumentDialog.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import type { Document, WorkflowStep } from './useDocumentChecklist'

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDocument: Document | null
  selectedStep: WorkflowStep | null
  uploadNotes: string
  loading: boolean
  onChangeNotes: (value: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  onReset: () => void
  hasFile: boolean
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  selectedDocument,
  selectedStep,
  uploadNotes,
  loading,
  onChangeNotes,
  onFileChange,
  onSubmit,
  onReset,
  hasFile,
}: UploadDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Dokumen</DialogTitle>
          <DialogDescription>
            Step: {selectedStep?.step_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-base">Nama Dokumen</Label>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              {selectedDocument?.document_name}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Pilih File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={onFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <p className="text-xs text-muted-foreground">
              Format: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Input
              id="notes"
              value={uploadNotes}
              onChange={(e) => onChangeNotes(e.target.value)}
              placeholder="Tambahkan catatan..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onReset}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!hasFile || loading}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
