// src/components/document-checklist/useDocumentChecklist.ts
'use client'

import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
} from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

// ====== Types ======

export interface Document {
  id: string
  document_name: string
  category: string
  is_required: boolean
  is_uploaded: boolean
  file_url?: string
  uploaded_at?: string
  notes?: string
  workflow_step_instance_id?: string
}

export interface WorkflowStep {
  id: string
  step_order: number
  step_name: string
  status: 'pending' | 'in-progress' | 'completed' | 'skipped'
  started_at?: string
  completed_at?: string
  documents?: Document[]
}

export interface ServiceData {
  id: string
  title: string
  status: string
  menu_layanan?: string
  layanan?: string
  sub_layanan?: string
  jenis_klien?: string
  deadline?: string
  clients?: {
    full_name: string
    client_type?: string
  }
}

export interface PnbpStatus {
  id: string
  service_id: string
  payment_type: 'pnbp' | 'invoice' | 'pelunasan' | 'dp' | 'lainnya'
  status: 'pending' | 'sent' | 'awaitingpayment' | 'completed' | 'hold'
  requested_at: string
  completed_at?: string
  hold_reason?: string
  notes?: string
  amount?: number
  due_date?: string
  
  // Field dari tabel invoice_requests
  sent_at?: string | null
  finance_file_url?: string | null
  finance_file_name?: string | null
  paid_at?: string | null
  payment_proof_url?: string | null
  payment_proof_name?: string | null
  validated_by?: string | null
}

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:3001'


  const getSupabaseToken = (): string | null => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ypjsfsfmwkksqfinenoc'
    const supabaseAuthKey = `sb-${projectId}-auth-token`
    
    const authDataStr = localStorage.getItem(supabaseAuthKey)
    
    if (!authDataStr) return null
    
    try {
      const authData = JSON.parse(authDataStr)
      return authData.access_token || null
    } catch (e) {
      console.error('Failed to parse Supabase auth data:', e)
      return null
    }
  }
  

// ====== Hook utama ======

export function useDocumentChecklist(serviceId: string | undefined) {
  const { toast } = useToast()

  // Data utama
  const [serviceData, setServiceData] = useState<ServiceData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(true)

  // Upload dokumen
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadNotes, setUploadNotes] = useState('')

  // Progress workflow
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // PNBP & Invoice
  const [pnbpStatus, setPnbpStatus] = useState<PnbpStatus | null>(null)
  const [pnbpLoading, setPnbpLoading] = useState(false)
  const pnbpRequestInProgress = useRef(false)
  const [invoiceStatus, setInvoiceStatus] = useState<PnbpStatus | null>(null)

  // Kelengkapan dokumen
  const [requiredDocuments, setRequiredDocuments] = useState<string[]>([])
  const [missingDocuments, setMissingDocuments] = useState<string[]>([])
  const [documentCompleteness, setDocumentCompleteness] = useState(0)

  // Lokasi simpan
  const [storageLocation, setStorageLocation] = useState<string | null>(null)
  const [storageDialogOpen, setStorageDialogOpen] = useState(false)
  const [storageRack, setStorageRack] = useState('')
  const [storageYear, setStorageYear] = useState('')
  const [storageMonth, setStorageMonth] = useState('')
  const [storageNomorBuku, setStorageNomorBuku] = useState('')  // ✅ TAMBAH STATE INI
  const [storageNomorLembar, setStorageNomorLembar] = useState('')
  const [storageNotes, setStorageNotes] = useState('')

  // PNBP form
  const [pnbpDialogOpen, setPnbpDialogOpen] = useState(false)
  const [pnbpAmount, setPnbpAmount] = useState('')
  const [pnbpPaidAt, setPnbpPaidAt] = useState('')
  const [pnbpNotesForm, setPnbpNotesForm] = useState('')
  const [pnbpFile, setPnbpFile] = useState<File | null>(null)
  const [pnbpSubmitting, setPnbpSubmitting] = useState(false)

  // Invoice form
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState('')
  const [invoiceNotesForm, setInvoiceNotesForm] = useState('')
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false)

  // Force update state untuk trigger re-render
  const [forceUpdate, setForceUpdate] = useState(0)

  // Derived
  const currentStep = workflowSteps[currentStepIndex]
  const isPnbpStep =
    currentStep?.step_name?.toLowerCase().includes('pnbp') || false
  const isInvoiceStep =
    currentStep?.step_name?.toLowerCase().includes('invoice') || false
  const allStepsCompleted =
    workflowSteps.length > 0 &&
    workflowSteps.every((s) => s.status === 'completed')

  // src/components/document-checklist/useDocumentChecklist.ts
// ... (semua import dan type definitions tetap sama) ...

// ====== Core Data Functions ======
const fetchAllData = async (svcId: string) => {
  try {
    setLoading(true)
    
    // Service
    const { data: srvData, error: srvError } = await supabase
      .from('services')
      .select(
        `
        id,
        title,
        status,
        menu_layanan,
        layanan,
        sub_layanan,
        jenis_klien,
        deadline,
        clients (
          full_name,
          client_type
        )
      `,
      )
      .eq('id', svcId)
      .single()
    
    if (srvError) throw srvError
    setServiceData(srvData as ServiceData)

    // Workflow instance
    const { data: workflowInstance, error: instanceError } = await supabase
      .from('workflow_instances')
      .select('id, status, started_at')
      .eq('service_id', svcId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    
    if (instanceError || !workflowInstance) {
      setWorkflowSteps([])
      setDocuments([])
      calculateProgress([], [])
      return
    }

    // ✅ TAMBAHAN: Auto-initialize documents untuk setiap step
    console.log('📋 Checking if documents need initialization...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        const initRes = await fetch(`${API_URL}/api/workflow/init-documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workflowInstanceId: workflowInstance.id,
            serviceId: svcId
          })
        })

        if (initRes.ok) {
          const initData = await initRes.json()
          console.log('✅ Documents initialized:', initData.data?.length || 0)
        } else {
          console.warn('⚠️ Document initialization failed (non-critical)', await initRes.text())
        }
      }
    } catch (initError) {
      console.warn('⚠️ Document initialization error (non-critical):', initError)
      // Tidak throw error, karena ini optional enhancement
    }

    // Step instances
    const { data: workflowData, error: workflowError } = await supabase
      .from('workflow_step_instances')
      .select(
        `
        id,
        step_order,
        notes,
        status,
        started_at,
        completed_at,
        workflow_instance_id,
        workflow_template_steps (
          step_name
        )
      `,
      )
      .eq('workflow_instance_id', workflowInstance.id)
      .order('step_order', { ascending: true })
    
    if (workflowError) {
      setWorkflowSteps([])
      setDocuments([])
      calculateProgress([], [])
      return
    }

    const mappedSteps: WorkflowStep[] = Array.isArray(workflowData)
      ? workflowData.map((step: any) => ({
          id: step.id,
          step_order: step.step_order || 0,
          step_name:
            step.workflow_template_steps?.step_name ||
            step.notes ||
            `Step ${step.step_order || 0}`,
          status: (step.status as WorkflowStep['status']) || 'pending',
          started_at: step.started_at ?? undefined,
          completed_at: step.completed_at ?? undefined,
          documents: [],
        }))
      : []

    // Dokumen
    const { data: docsData } = await supabase
      .from('service_documents_unified')
      .select('*')
      .eq('service_id', svcId)
      .order('created_at', { ascending: true })

    const docs = Array.isArray(docsData)
      ? (docsData as any as Document[])
      : []

    const stepsWithDocs = mappedSteps.map((step) => ({
      ...step,
      documents: docs.filter(
        (d: any) => d.workflow_step_instance_id === step.id,
      ),
    }))

    setWorkflowSteps(stepsWithDocs)
    setDocuments(docs)

    const currentIndex = stepsWithDocs.findIndex(
      (s) => s.status === 'in-progress' || s.status === 'pending',
    )
    setCurrentStepIndex(currentIndex >= 0 ? currentIndex : 0)

    calculateProgress(docs, stepsWithDocs)
  } catch (err: any) {
    toast({
      title: 'Error',
      description: err?.message || 'Gagal memuat data',
      variant: 'destructive',
    })
  } finally {
    setLoading(false)
  }
}


  // Fetch PNBP dengan logging lengkap
  const fetchPnbpStatus = async () => {
    console.log('📡 [fetchPnbpStatus] Starting...')
  
    if (!serviceId) {
      console.warn('⚠️ [fetchPnbpStatus] No serviceId')
      return
    }
  
    try {
      setPnbpLoading(true)
  
      console.log('📡 [fetchPnbpStatus] Querying database for serviceId:', serviceId)
  
      const { data, error } = await supabase
        .from('invoice_requests')        // ✅ tabel sesuai schema
        .select('*')
        .eq('service_id', serviceId)     // ✅ kolom sesuai schema
        .eq('payment_type', 'pnbp')      // ✅ kolom + value sesuai schema
        .order('requested_at', { ascending: false }) // kalau ada requestedat
        .limit(1)
        .maybeSingle()
  
      if (error && error.code !== 'PGRST116') {
        throw error
      }
  
      console.log('✅ [fetchPnbpStatus] Raw data from DB:', data)
      console.log('🔍 [fetchPnbpStatus] Status:', data?.status)
  
      setPnbpStatus(data as PnbpStatus | null)
      console.log('✅ [fetchPnbpStatus] State updated')
    } catch (error) {
      console.error('❌ [fetchPnbpStatus] Error:', error)
      setPnbpStatus(null)
    } finally {
      setPnbpLoading(false)
    }
  }
  

  // Fetch Invoice dengan logging lengkap
  const fetchInvoiceStatus = async () => {
    console.log('📡 [fetchInvoiceStatus] Starting...')
    
    if (!serviceId) {
      console.warn('⚠️ [fetchInvoiceStatus] No serviceId')
      return
    }

    try {
      console.log('📡 [fetchInvoiceStatus] Querying database for serviceId:', serviceId)

      const { data, error } = await supabase
        .from('invoice_requests')
        .select('*')
        .eq('service_id', serviceId)
        .eq('payment_type', 'invoice')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      console.log('✅ [fetchInvoiceStatus] Raw data from DB:', data)
      console.log('🔍 [fetchInvoiceStatus] Status:', data?.status)

      setInvoiceStatus(data as PnbpStatus | null)
      
      console.log('✅ [fetchInvoiceStatus] State updated')

    } catch (error) {
      console.error('❌ [fetchInvoiceStatus] Error:', error)
      setInvoiceStatus(null)
    }
  }

  // ✅ Refetch function dengan logging lengkap
  const refetch = async () => {
    console.log('🔄 [REFETCH] Function called')
    console.log('🔍 [REFETCH] serviceId:', serviceId)
    
    if (serviceId) {
      console.log('🔄 [REFETCH] Starting fetch all data...')
      await fetchAllData(serviceId)
      
      console.log('🔄 [REFETCH] Starting fetch PNBP...')
      await fetchPnbpStatus()
      
      console.log('🔄 [REFETCH] Starting fetch Invoice...')
      await fetchInvoiceStatus()

      // Force re-render
      setForceUpdate(prev => prev + 1)
      console.log('🔄 [REFETCH] Force update triggered')
      console.log('✅ [REFETCH] All fetches completed')
    } else {
      console.warn('⚠️ [REFETCH] No serviceId, skipping refetch')
    }
  }

  // ====== Effects ======

  // Load awal
  useEffect(() => {
    if (!serviceId) {
      setLoading(false)
      toast({
        title: 'Error',
        description: 'Service ID tidak ditemukan',
        variant: 'destructive',
      })
      return
    }
    fetchAllData(serviceId)
  }, [serviceId])

  // Poll PNBP status saat step PNBP aktif
  useEffect(() => {
    if (!currentStep || !serviceId) return

    const isPnbp = currentStep.step_name?.toLowerCase().includes('pnbp')
    if (!isPnbp) {
      setPnbpStatus(null)
      pnbpRequestInProgress.current = false
      return
    }

    // Fetch pertama kali
    fetchPnbpStatus()

    // Poll setiap 10 detik
    const interval = setInterval(() => {
      fetchPnbpStatus()
    }, 10000)

    return () => clearInterval(interval)
  }, [currentStep?.id, serviceId])

  // Poll invoice status saat step invoice aktif
  useEffect(() => {
    if (!currentStep || !serviceId) return

    const isInvoice = currentStep.step_name?.toLowerCase().includes('invoice')
    if (!isInvoice) {
      setInvoiceStatus(null)
      return
    }

    // Fetch pertama kali
    fetchInvoiceStatus()

    // Poll setiap 10 detik
    const interval = setInterval(() => {
      fetchInvoiceStatus()
    }, 10000)

    return () => clearInterval(interval)
  }, [currentStep?.id, serviceId])

  // Dokumen wajib step pertama
  useEffect(() => {
    if (serviceData && currentStep) {
      fetchRequiredDocuments()
    }
  }, [serviceData, currentStep?.id])

  // Fetch lokasi simpan setelah workflow selesai
  // Fetch lokasi simpan setelah workflow selesai
useEffect(() => {
  if (!serviceId || !allStepsCompleted) return

  const fetchStorage = async () => {
    try {
      const { data, error } = await supabase
        .from("document_storage_locations")
        .select("*")
        .eq("service_id", serviceId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setStorageLocation(data)
        setStorageRack(data.racknumber ?? "")
        setStorageYear(data.year?.toString() ?? "")
        setStorageMonth(data.month?.toString() ?? "")
        setStorageNomorBuku(data.nomorbuku ?? "")        // <-- penting
        setStorageNomorLembar(data.nomorlembar ?? "")
        setStorageNotes(data.notes ?? "")
      }
    } catch (error) {
      console.error("Fetch storage location error:", error)
    }
  }

  fetchStorage()
}, [serviceId, allStepsCompleted])

  // ====== Document Completeness ======

  const generateStorageLocationPreview = () => {
    const parts = []
  
    if (storageRack) parts.push(`No. Rak ${storageRack}`)
  
    if (storageYear && storageMonth) {
      const monthNames = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ]
      const monthName = monthNames[parseInt(storageMonth)]
      parts.push(`Minuta Notaris ${monthName} ${storageYear}`)
    }
  
    if (storageNomorBuku) parts.push(`No. ${storageNomorBuku}`) // sesuai contoh '1-50'
  
    return parts.join(' ') || 'Belum lengkap'
  }
  

  const fetchRequiredDocuments = async () => {
    if (!serviceData) return

    try {

      console.log('Filter dokumen wajib:', {
        menu: 'notaris',
        layanan: serviceData.layanan,
        sub_layanan: serviceData.sub_layanan,
        jenis_klien: clientType,
      })
      
      const clientType =
        serviceData.clients?.client_type ||
        serviceData.jenis_klien ||
        'Individu'

      const { data, error } = await supabase
        .from('service_document_requirements')
        .select('mandatory_documents')
        .eq('menu', 'notaris')
        .eq('layanan', serviceData.layanan || '')
        .eq('sub_layanan', serviceData.sub_layanan || '')
        .eq('jenis_klien', clientType)
        .maybeSingle()

      if (error || !data) {
        setRequiredDocuments([])
        setMissingDocuments([])
        setDocumentCompleteness(0)
        return
      }

      const mandatory = Array.isArray(data.mandatory_documents)
        ? (data.mandatory_documents as string[])
        : []

      setRequiredDocuments(mandatory)
      checkMissingDocuments(mandatory)
    } catch {
      setRequiredDocuments([])
      setMissingDocuments([])
      setDocumentCompleteness(0)
    }
  }

  const checkMissingDocuments = (required: string[]) => {
    if (!currentStep?.documents) {
      setMissingDocuments(required)
      setDocumentCompleteness(0)
      return
    }

    const uploadedDocNames = currentStep.documents
      .filter((d) => d.is_uploaded)
      .map((d) => d.document_name)

    const missing = required.filter(
      (docName) =>
        !uploadedDocNames.some(
          (uploaded) =>
            uploaded.toLowerCase().includes(docName.toLowerCase()) ||
            docName.toLowerCase().includes(uploaded.toLowerCase()),
        ),
    )

    setMissingDocuments(missing)
    const completeness =
      required.length > 0
        ? ((required.length - missing.length) / required.length) * 100
        : 100
    setDocumentCompleteness(Math.round(completeness))
  }

  const calculateProgress = (_docs: any[], steps: WorkflowStep[]) => {
    const completedSteps = steps.filter((s) => s.status === 'completed').length
    const totalSteps = steps.length
    setProgressPercentage(
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    )
  }

  // ====== PNBP & Invoice Submission ======

  const submitPnbpRequest = async () => {
    if (!serviceId || !currentStep) return
  
    if (!pnbpAmount || !pnbpPaidAt) {
      toast({
        title: 'Error',
        description: 'Nominal dan tanggal bayar wajib diisi',
        variant: 'destructive',
      })
      return
    }
  
    if (pnbpRequestInProgress.current) {
      toast({
        title: 'Request sedang diproses',
        description: 'Mohon tunggu, request PNBP sedang dikirim',
        variant: 'destructive',
      })
      return
    }
  
    const numericAmountString = pnbpAmount.replace(/\D/g, '')
    const amountNumber = numericAmountString ? Number(numericAmountString) : 0
  
    if (!amountNumber || amountNumber <= 0) {
      toast({
        title: 'Error',
        description: 'Nominal harus lebih dari 0',
        variant: 'destructive',
      })
      return
    }
  
    try {
      setPnbpSubmitting(true)
      pnbpRequestInProgress.current = true
  
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('User tidak terautentikasi')
      }
  
      const requestBody = {
        service_id: serviceId,
        workflow_step_instance_id: currentStep.id,
        payment_type: 'pnbp',
        amount: amountNumber,
        notes: pnbpNotesForm || null,
      }
  
      const response = await fetch(`${API_URL}/api/invoice/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
  
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Gagal mengirim request PNBP')
      }
  
      toast({
        title: 'Berhasil',
        description: result.message || 'Request PNBP berhasil dikirim',
      })
  
      await fetchPnbpStatus()
  
      setPnbpDialogOpen(false)
      setPnbpAmount('')
      setPnbpPaidAt('')
      setPnbpNotesForm('')
      setPnbpFile(null)
    } catch (error: any) {
      console.error('submitPnbpRequest error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim request PNBP',
        variant: 'destructive',
      })
    } finally {
      pnbpRequestInProgress.current = false
      setPnbpSubmitting(false)
    }
  }

  const submitInvoiceRequest = async () => {
    if (!serviceId || !currentStep) return
  
    if (!invoiceAmount || !invoiceDueDate) {
      toast({
        title: 'Error',
        description: 'Nominal dan due date wajib diisi',
        variant: 'destructive',
      })
      return
    }
  
    const numericAmountString = invoiceAmount.replace(/\D/g, '')
    const amountNumber = numericAmountString ? Number(numericAmountString) : 0
  
    if (!amountNumber || amountNumber <= 0) {
      toast({
        title: 'Error',
        description: 'Nominal harus lebih dari 0',
        variant: 'destructive',
      })
      return
    }
  
    try {
      setInvoiceSubmitting(true)
  
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('User tidak terautentikasi')
      }
  
      const requestBody = {
        service_id: serviceId,
        workflow_step_instance_id: currentStep.id,
        payment_type: 'pelunasan',
        amount: amountNumber,
        notes: invoiceNotesForm || null,
      }
  
      const response = await fetch(`${API_URL}/api/invoice/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })
  
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Invoice response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
  
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Gagal mengirim request Invoice')
      }
  
      toast({
        title: 'Berhasil',
        description: result.message || 'Request Invoice berhasil dikirim',
      })
  
      await fetchInvoiceStatus()
  
      setInvoiceDialogOpen(false)
      setInvoiceAmount('')
      setInvoiceDueDate('')
      setInvoiceNotesForm('')
    } catch (error: any) {
      console.error('Request invoice error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengirim request Invoice',
        variant: 'destructive',
      })
    } finally {
      setInvoiceSubmitting(false)
    }
  }

  const canProceedToNextStep = () => {
    if (!isPnbpStep) return true
    if (!pnbpStatus) return false
    return pnbpStatus.status === 'completed' || pnbpStatus.status === 'hold'
  }

  // ====== Upload Dokumen ======

  const handleUploadClick = (document: Document, step: WorkflowStep) => {
    setSelectedDocument(document)
    setSelectedStep(step)
    setUploadDialogOpen(true)
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setUploadFile(e.target.files[0])
  }


// ✅ PERBAIKAN: handleUploadSubmit - tambahkan serviceId
const handleUploadSubmit = async () => {
  if (!selectedDocument || !uploadFile || !selectedStep) {
    toast({
      title: 'Error',
      description: 'Pilih file dan pastikan step aktif',
      variant: 'destructive',
    })
    return
  }

  try {
    setLoading(true)
    
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('User tidak terautentikasi')
    }

    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('stepId', selectedStep.id)
    formData.append('docId', selectedDocument.id || '') // ✅ Bisa kosong atau temp
    formData.append('serviceId', serviceId || '') // ✅ TAMBAHKAN INI
    formData.append('documentName', selectedDocument.document_name || selectedStep.step_name || '') // ✅ TAMBAHKAN INI

    console.log('📤 Uploading with data:', {
      stepId: selectedStep.id,
      docId: selectedDocument.id,
      serviceId: serviceId,
      documentName: selectedDocument.document_name,
      fileName: uploadFile.name
    })

    const uploadResponse = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        // ⚠️ JANGAN tambahkan Content-Type untuk FormData!
        // Browser akan set otomatis dengan boundary
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Upload response error:', errorText)
      throw new Error(`Upload gagal: ${uploadResponse.status}`)
    }

    const uploadResult = await uploadResponse.json()

    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'Upload gagal')
    }

    console.log('✅ Upload success:', uploadResult)

    toast({
      title: 'Berhasil',
      description: 'Dokumen berhasil diupload',
    })

    // Reset & close dialog
    setUploadDialogOpen(false)
    setUploadFile(null)
    setUploadNotes('')
    setSelectedDocument(null)

    // Refresh data
    if (serviceId) {
      await fetchAllData(serviceId)
    }

  } catch (error: any) {
    console.error('Upload error:', error)
    toast({
      title: 'Error',
      description: error.message || 'Gagal upload dokumen',
      variant: 'destructive',
    })
  } finally {
    setLoading(false)
  }
}


  const handleCompleteStep = async () => {
    if (!currentStep) return

    try {
      const { error } = await supabase
        .from('workflow_step_instances')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', currentStep.id)

      if (error) throw error

      toast({
        title: 'Berhasil',
        description: 'Step berhasil diselesaikan',
      })

      if (serviceId) {
        await fetchAllData(serviceId)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyelesaikan step',
        variant: 'destructive',
      })
    }
  }

  // ====== Storage ======
  
  const handleSubmitStorage = async () => {
    if (!serviceId) return
  
    if (!storageRack || !storageYear || !storageMonth || !storageNomorBuku || !storageNomorLembar) {
      toast({
        title: 'Error',
        description: 'Semua field wajib diisi',
        variant: 'destructive',
      })
      return
    }
  
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user) throw new Error('User tidak terautentikasi')
  
      // Pakai value dari preview
      const locationText = generateStorageLocationPreview()
      if (locationText === 'Belum lengkap') {
        toast({
          title: 'Error',
          description: 'Lokasi simpan belum lengkap',
          variant: 'destructive',
        })
        return
      }
  
      const { data: existing, error: existingError } = await supabase
        .from('document_storage_locations')
        .select('id')
        .eq('service_id', serviceId)
        .maybeSingle()
  
      if (existingError) throw existingError
  
      const payload: any = {
        service_id: serviceId,
        title: serviceData?.title,
        client_name: serviceData?.clients?.full_name,
        service_type: serviceData?.menu_layanan ?? 'Notaris',
        rack_number: storageRack.trim(),
        year: parseInt(storageYear, 10),
        month: parseInt(storageMonth, 10),
        nomor_buku: storageNomorBuku.trim(),       // pastikan kolom ini ada
        nomor_lembar: storageNomorLembar.trim(),
        storage_location: locationText,            // ⬅️ ini isi dari preview
        notes: storageNotes?.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }
  
      let result
      if (existing) {
        const { data, error } = await supabase
          .from('document_storage_locations')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        payload.createdby = user.id
        const { data, error } = await supabase
          .from('document_storage_locations')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        result = data
      }
  
      setStorageLocation(result)
      setStorageDialogOpen(false)
      toast({
        title: 'Berhasil',
        description: 'Lokasi simpan berhasil disimpan',
      })
    } catch (error: any) {
      console.error('Submit storage error', error)
      toast({
        title: 'Error',
        description: error.message ?? 'Gagal menyimpan lokasi simpan',
        variant: 'destructive',
      })
    }
  }
  


  // ====== Return ======

  return {
    // data utama
    serviceData,
    documents,
    workflowSteps,
    loading,

    // step & progress
    currentStep,
    currentStepIndex,
    setCurrentStepIndex,
    progressPercentage,
    isPnbpStep,
    isInvoiceStep,
    allStepsCompleted,

    // upload dokumen
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
    handleCompleteStep,

    // PNBP
    pnbpStatus,
    pnbpLoading,
    canProceedToNextStep,

    // Invoice
    invoiceStatus,

    // dokumen wajib
    requiredDocuments,
    missingDocuments,
    documentCompleteness,

    // storage
    storageLocation,
    storageDialogOpen,
    setStorageDialogOpen,
    storageRack,
    setStorageRack,
    storageYear,
    setStorageYear,
    storageMonth,
    setStorageMonth,
    storageNomorLembar,
    setStorageNomorLembar,
    storageNotes,
    setStorageNotes,
    generateStorageLocationPreview,
    handleSubmitStorage,
    storageNomorBuku,        // ✅ TAMBAHKAN
    setStorageNomorBuku, 

    // PNBP form
    pnbpDialogOpen,
    setPnbpDialogOpen,
    pnbpAmount,
    setPnbpAmount,
    pnbpPaidAt,
    setPnbpPaidAt,
    pnbpNotesForm,
    setPnbpNotesForm,
    pnbpFile,
    setPnbpFile,
    pnbpSubmitting,
    submitPnbpRequest,

    // Invoice form
    invoiceDialogOpen,
    setInvoiceDialogOpen,
    invoiceAmount,
    setInvoiceAmount,
    invoiceDueDate,
    setInvoiceDueDate,
    invoiceNotesForm,
    setInvoiceNotesForm,
    invoiceSubmitting,
    submitInvoiceRequest,

    // ✅ Refetch untuk dipanggil dari PaymentRequestCard
    refetch,
    
    // ✅ Force update counter (optional, untuk debug)
    forceUpdate,
  }
}
