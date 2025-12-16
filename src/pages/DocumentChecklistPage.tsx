// src/pages/DocumentChecklistPage.tsx
'use client'

import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, FileText } from 'lucide-react'

import { useDocumentChecklist } from '@/components/document-checklist/useDocumentChecklist'
import { DocumentChecklistHeader } from '@/components/document-checklist/DocumentChecklistHeader'
import { WorkflowStepNavigator } from '@/components/document-checklist/WorkflowStepNavigator'
import { CurrentStepDocuments } from '@/components/document-checklist/CurrentStepDocuments'
import { StorageLocationSection } from '@/components/document-checklist/StorageLocationSection'
import { UploadDocumentDialog } from '@/components/document-checklist/UploadDocumentDialog'
import { PaymentRequestCard, PaymentRequest } from '@/components/document-checklist/PaymentRequestCard'

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:3001'

export function DocumentChecklistPage() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const navigate = useNavigate()

  const checklist = useDocumentChecklist(serviceId)

const {
  serviceData,
  workflowSteps,
  loading,
  currentStep,
  currentStepIndex,
  setCurrentStepIndex,
  progressPercentage,
  allStepsCompleted,

  requiredDocuments,
  missingDocuments,
  documentCompleteness,
  isPnbpStep,
  isInvoiceStep,
  canProceedToNextStep,

  uploadDialogOpen,
  setUploadDialogOpen,
  selectedDocument,
  selectedStep,
  uploadFile,
  uploadNotes,
  setUploadNotes,
  handleUploadClick,
  handleFileChange,
  handleUploadSubmit,

  pnbpStatus,
  pnbpLoading,
  invoiceStatus,

  storageLocation,
  storageDialogOpen,
  setStorageDialogOpen,
  storageRack,
  setStorageRack,
  storageYear,
  setStorageYear,
  storageMonth,
  setStorageMonth,
  storageNomorBuku,          // <=== Pastikan ini ada
  setStorageNomorBuku,       // <=== Pastikan ini juga ada
  storageNomorLembar,
  setStorageNomorLembar,
  storageNotes,
  setStorageNotes,
  generateStorageLocationPreview,
  handleSubmitStorage,

  refetch,
} = checklist


 // ✅ Helper: Transform pnbpStatus ke format PaymentRequest
 // Di DocumentChecklistPage.tsx

// Di DocumentChecklistPage.tsx

const getPnbpRequest = (): PaymentRequest | undefined => {
  if (!pnbpStatus) {
    console.log('getPnbpRequest No pnbpStatus data')
    return undefined
  }

  console.log('📋 Raw pnbpStatus from database:', pnbpStatus)
  console.log('⚠️ Available fields:', Object.keys(pnbpStatus))

  const mapped: PaymentRequest = {
    id: pnbpStatus.id,
    serviceid: pnbpStatus.service_id,
    paymenttype: 'pnbp',
    status: pnbpStatus.status as PaymentRequest['status'],
    amount: pnbpStatus.amount,
    duedate: pnbpStatus.due_date,
    notes: pnbpStatus.notes,

    // File dari keuangan
    sentat: pnbpStatus.sent_at ?? pnbpStatus.invoice_sent_at,
    financefileurl: pnbpStatus.finance_file_url ?? pnbpStatus.invoice_file_url,
    financefilename: pnbpStatus.finance_file_name,

    // Bukti bayar dari notaris
    paidat: pnbpStatus.paid_at,
    paymentproofurl: pnbpStatus.payment_proof_url,
    paymentproofname: pnbpStatus.payment_proof_name,

    // Validasi & hold
    completedat: pnbpStatus.completed_at,
    validatedby: pnbpStatus.validated_by,
    holdreason: pnbpStatus.hold_reason,
  }

  console.log('✅ Mapped PaymentRequest:', mapped)
  console.log('📁 financefileurl after mapping:', mapped.financefileurl)

  if (mapped.status === 'sent' && !mapped.financefileurl) {
    console.warn('⚠️ Status is "sent" but financefileurl is missing!')
  }

  return mapped
}





  // ✅ Helper: Transform invoiceStatus ke format PaymentRequest
  const getInvoiceRequest = (): PaymentRequest | undefined => {
    if (!invoiceStatus) return undefined
  
    return {
      id: invoiceStatus.id,
      serviceid: serviceId!,
      paymenttype: 'invoice',
      status: invoiceStatus.status as 'pending' | 'sent' | 'awaitingpayment' | 'completed' | 'hold',
  
      amount: invoiceStatus.amount,
      duedate: invoiceStatus.duedate,
      notes: invoiceStatus.notes,
  
      sentat: invoiceStatus.sentat || invoiceStatus.invoice_sent_at,
      financefileurl:
        invoiceStatus.financefileurl ||
        invoiceStatus.invoicefileurl ||
        invoiceStatus.fileurl,
      financefilename:
        invoiceStatus.financefilename ||
        invoiceStatus.invoicefilename ||
        invoiceStatus.filename,
  
      paidat: invoiceStatus.paidat,
      paymentproofurl: invoiceStatus.paymentproofurl,
      paymentproofname: invoiceStatus.paymentproofname,
  
      completedat: invoiceStatus.completedat,
      validatedby: invoiceStatus.validatedby,
      holdreason: invoiceStatus.holdreason,
    }
  }
  

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!workflowSteps || workflowSteps.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8E1]">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/services/notaris')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Notaris
          </Button>
          <Card className="bg-white shadow-lg">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">Belum Ada Workflow</h3>
              <p className="text-gray-600">
                Workflow untuk layanan ini belum dibuat.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8E1]">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <DocumentChecklistHeader
          serviceData={serviceData}
          workflowSteps={workflowSteps}
          progressPercentage={progressPercentage}
          onBack={() => navigate('/services/notaris')}
        />

        <WorkflowStepNavigator
          steps={workflowSteps}
          currentStepIndex={currentStepIndex}
          onChangeStepIndex={setCurrentStepIndex}
        />

        {currentStep && (
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                {currentStep.step_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* ✅ PNBP Payment Request Card */}
              {isPnbpStep && (
                <PaymentRequestCard
                  type="pnbp"
                  serviceId={serviceId!}
                  stepInstanceId={currentStep.id}
                  existingRequest={getPnbpRequest()}
                  onRequestSent={refetch}
                  onFileUploaded={refetch}
                  onRefresh={refetch}
                />
              )}


              {/* ✅ Invoice Payment Request Card */}
              {isInvoiceStep && (
                <PaymentRequestCard
                  type="invoice"
                  serviceId={serviceId!}
                  stepInstanceId={currentStep.id}
                  existingRequest={getInvoiceRequest()}
                  onRefresh={() => {
                    console.log('🔄 Refreshing Invoice data...')
                    refetch?.()
                  }}
                />
              )}

              {/* ✅ Checklist Dokumen Biasa - Hanya muncul di step NON-PNBP dan NON-Invoice */}
              {!isPnbpStep && !isInvoiceStep && (
                <CurrentStepDocuments
                  currentStep={currentStep}
                  currentStepIndex={currentStepIndex}
                  requiredDocuments={requiredDocuments}
                  missingDocuments={missingDocuments}
                  documentCompleteness={documentCompleteness}
                  isPnbpStep={isPnbpStep}
                  isInvoiceStep={isInvoiceStep}
                  onUploadClick={handleUploadClick}
                  onPrevStep={() =>
                    setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
                  }
                  onNextStep={() =>
                    setCurrentStepIndex(
                      Math.min(
                        workflowSteps.length - 1,
                        currentStepIndex + 1,
                      ),
                    )
                  }
                  canProceedToNextStep={
                    currentStepIndex < workflowSteps.length - 1 &&
                    canProceedToNextStep()
                  }
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* ✅ Storage Location - Hanya muncul jika semua step selesai */}
        <StorageLocationSection
          allStepsCompleted={allStepsCompleted}
          storageLocation={storageLocation}
          serviceData={serviceData}
          storageDialogOpen={storageDialogOpen}
          onOpenChange={setStorageDialogOpen}
          storageRack={storageRack}
          storageYear={storageYear}
          storageMonth={storageMonth}
          storageNomorBuku={storageNomorBuku}          // ✅ PASS PROP BARU
          storageNomorLembar={storageNomorLembar}
          storageNotes={storageNotes}
          onChangeRack={setStorageRack}
          onChangeYear={setStorageYear}
          onChangeMonth={setStorageMonth}
          onChangeNomorBuku={setStorageNomorBuku}       // ✅ PASS HANDLER BARU
          onChangeNomorLembar={setStorageNomorLembar}
          onChangeNotes={setStorageNotes}
          generateStorageLocationPreview={generateStorageLocationPreview}
          onSubmit={handleSubmitStorage}
        />

        {/* Upload Dialog untuk dokumen biasa */}
        <UploadDocumentDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          selectedDocument={selectedDocument}
          selectedStep={selectedStep}
          uploadNotes={uploadNotes}
          loading={loading}
          onChangeNotes={setUploadNotes}
          onFileChange={handleFileChange}
          onSubmit={handleUploadSubmit}
          onReset={() => {
            setUploadDialogOpen(false)
            setUploadNotes('')
          }}
          hasFile={!!uploadFile}
        />
      </main>
    </div>
  )
}

export default DocumentChecklistPage
