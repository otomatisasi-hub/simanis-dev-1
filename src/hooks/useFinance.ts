// src/hooks/useFinance.ts
import { useToast } from '@/hooks/use-toast'
import { useState, useEffect, useCallback } from 'react'
import { financeApi, type FinanceRecord, type FinanceStatistics } from '@/lib/api/finance'

// ============================================
// TYPES & INTERFACES
// ============================================

/**
 * Statistics interface - match dengan backend response
 */
 export interface FinanceStatistics {
  total: number
  totalAmount: number
  biayaLayanan: number
  invoice: number
  pnbp: number
  totalDp: number
  totalInvoice: number
  availableToClaim: number
  claimed: number
  completed: number
  byStatus: Record<string, number>
  byClaimStatus: Record<string, number>
}

/**
 * Workload item interface - match dengan RPC function response
 */
export interface FinanceWorkloadItem {
  finance_id: string
  service_id: string
  follow_up_type: 'Biaya_Layanan' | 'Invoice'
  payment_type: string | null // 'pnbp' | 'invoice' | 'pelunasan' | 'dp'
  payment_request_id: string | null
  status: string
  claimed_at: string | null
  service_title: string
  client_name: string
  client_phone?: string | null
  sublayanan?: string | null
  nominal?: number
  due_date?: string | null
}

/**
 * Dashboard item interface
 */
export interface FinanceDashboardItem {
  finance_id: string
  service_id: string
  follow_up_type: string
  finance_status: string
  claimed_by: string | null
  claimed_at: string | null
  amount: number | null
  due_date: string | null
  created_at: string
  payment_request_id: string | null
  payment_type: string | null
  payment_status: string | null
  requested_at: string | null
  sent_at: string | null
  completed_at: string | null
  invoice_number: string | null
  invoice_payer_type: string | null
  finance_file_url: string | null
  invoice_file_url: string | null
  payment_proof_url: string | null
  service_title: string
  service_deadline: string | null
  service_status: string
  client_id: string
  client_name: string
  client_phone: string | null
  client_email: string | null
  claimed_by_name: string | null
  claimed_by_email: string | null
}

// ============================================
// HOOK: useFinanceDashboard
// ============================================

export function useFinanceDashboard() {
  const [data, setData] = useState<FinanceRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDashboard = useCallback(async () => {
    console.log('[useFinanceDashboard] Fetching dashboard...')
    try {
      setLoading(true)
      setError(null)

      const result = await financeApi.getDashboard()

      console.log('[useFinanceDashboard] Response:', {
        success: result.success,
        dataLength: result.data?.length,
        total: result.total,
      })

      if (result.success) {
        const list = result.data ?? []
        setData(list)
        setTotal(result.total ?? list.length)
        console.log(
          '[useFinanceDashboard] Dashboard loaded:',
          list.length,
          'items',
        )
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard')
      }
    } catch (err: any) {
      console.error('Error fetching dashboard:', err)
      const msg = err?.message || 'Gagal memuat data dashboard'
      setError(msg)
      // pakai closure pertama, jangan dijadikan dependency supaya tidak loop
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  // penting: kosongkan dependency array untuk mencegah callback berubah tiap render
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // efek ini jalan sekali saat mount (kecuali double-run di StrictMode dev, wajar 2x)
    fetchDashboard()
  }, [fetchDashboard])

  return {
    data,
    total,
    loading,
    error,
    refresh: fetchDashboard,
  }
}


// ============================================
// HOOK: useFinanceWorkload
// ============================================

export function useFinanceWorkload() {
  const [workload, setWorkload] = useState<FinanceWorkloadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchWorkload = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📡 [useFinanceWorkload] Fetching workload...')

      const result = await financeApi.getWorkload()
      
      console.log('📥 [useFinanceWorkload] API Response:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        total: result.total
      })

      if (result.success && Array.isArray(result.data)) {
        // ✅ Type assertion untuk memastikan data match dengan interface
        const typedData = result.data as FinanceWorkloadItem[]
        
        setWorkload(typedData)
        
        console.log('✅ [useFinanceWorkload] Workload loaded:', typedData.length, 'items')
        
        if (typedData.length > 0) {
          console.log('📄 [useFinanceWorkload] First item:', {
            finance_id: typedData[0].finance_id,
            payment_type: typedData[0].payment_type,
            payment_request_id: typedData[0].payment_request_id,
            service_title: typedData[0].service_title
          })
        }
      } else {
        console.warn('⚠️ [useFinanceWorkload] Invalid response or no data')
        setWorkload([])
      }
    } catch (err: any) {
      console.error('❌ [useFinanceWorkload] Error:', err)
      
      const msg = err?.message || 'Gagal memuat workload'
      setError(msg)
      
      // Only show toast for non-auth errors
      if (!msg.includes('401') && !msg.includes('Unauthorized')) {
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        })
      }
      
      setWorkload([])
    } finally {
      setLoading(false)
      console.log('🏁 [useFinanceWorkload] Fetch completed')
    }
  }, [toast])

  useEffect(() => {
    console.log('🚀 [useFinanceWorkload] useEffect triggered')
    fetchWorkload()
  }, [fetchWorkload])

  console.log('🎯 [useFinanceWorkload] Hook state:', {
    workloadLength: workload.length,
    loading,
    error
  })

  return {
    data: workload,
    workload,
    loading,
    error,
    refresh: fetchWorkload,
  }
}

// ============================================
// HOOK: useFinanceStatistics
// ============================================

export function useFinanceStatistics() {
  const [data, setData] = useState<FinanceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast() // kalau tidak dipakai, boleh dihapus

  const fetchStatistics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('📊 [useFinanceStatistics] Fetching statistics...')

      const result = await financeApi.getStatistics()

      console.log('📥 [useFinanceStatistics] Response:', result)

      if (result.success && result.data) {
        // data bisa berupa object atau array[0]
        const raw = Array.isArray(result.data) ? result.data[0] : result.data

        const stats: FinanceStatistics = {
          pending_count: raw?.pending_count ?? 0,
          in_progress_count: raw?.in_progress_count ?? 0,
          completed_today: raw?.completed_today ?? 0,
          completed_this_week: raw?.completed_this_week ?? 0,
          completed_this_month: raw?.completed_this_month ?? 0,
          total_amount_pending: raw?.total_amount_pending ?? 0,
          total_amount_completed_month: raw?.total_amount_completed_month ?? 0,
          pnbp_pending: raw?.pnbp_pending ?? 0,
          invoice_pending: raw?.invoice_pending ?? 0,
          awaiting_validation: raw?.awaiting_validation ?? 0,
          hold_count: raw?.hold_count ?? 0,
        }

        setData(stats)
        console.log('✅ [useFinanceStatistics] Statistics loaded:', stats)
      } else {
        throw new Error('Invalid statistics response')
      }
    } catch (err: any) {
      console.error('❌ [useFinanceStatistics] Error:', err)
      const msg = err?.message || 'Gagal memuat statistik'
      setError(msg)

      // fallback nilai nol
      setData({
        pending_count: 0,
        in_progress_count: 0,
        completed_today: 0,
        completed_this_week: 0,
        completed_this_month: 0,
        total_amount_pending: 0,
        total_amount_completed_month: 0,
        pnbp_pending: 0,
        invoice_pending: 0,
        awaiting_validation: 0,
        hold_count: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    data,
    loading,
    error,
    refresh: fetchStatistics,
  }
}


// ============================================
// HOOK: useClaimTask
// ============================================

export function useClaimTask() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const claimTask = useCallback(async (financeId: string): Promise<boolean> => {
    if (!financeId) {
      console.error('❌ [useClaimTask] No financeId provided')
      toast({
        title: 'Error',
        description: 'ID task tidak valid',
        variant: 'destructive',
      })
      return false
    }

    try {
      console.log('🔍 [useClaimTask] Starting claim for:', financeId)
      setLoading(true)

      const result = await financeApi.claimTask(financeId)

      console.log('📊 [useClaimTask] API result:', result)

      if (result.success) {
        console.log('✅ [useClaimTask] Claim successful')
        
        toast({
          title: 'Berhasil',
          description: result.message || 'Task berhasil di-claim',
        })
        
        return true
      } else {
        console.error('❌ [useClaimTask] Claim failed:', result.error)
        
        toast({
          title: 'Error',
          description: result.error || 'Gagal claim task',
          variant: 'destructive',
        })
        
        return false
      }
    } catch (error: any) {
      console.error('❌ [useClaimTask] Exception:', error)
      
      const errorMessage = error?.message || 'Terjadi kesalahan saat claim task'
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      
      return false
    } finally {
      setLoading(false)
      console.log('🏁 [useClaimTask] Finished')
    }
  }, [toast])

  return { claimTask, loading }
}

// ============================================
// HOOK: useReleaseTask
// ============================================

export function useReleaseTask() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const releaseTask = useCallback(
    async (financeId: string): Promise<boolean> => {
      if (!financeId) {
        console.error('❌ [useReleaseTask] No financeId provided')
        toast({
          title: 'Error',
          description: 'ID task tidak valid',
          variant: 'destructive',
        })
        return false
      }

      setLoading(true)
      
      try {
        console.log('🔓 [useReleaseTask] Releasing claim for:', financeId)
        
        const result = await financeApi.releaseClaim(financeId)

        console.log('📊 [useReleaseTask] API result:', result)

        if (result.success) {
          console.log('✅ [useReleaseTask] Release successful')
          
          toast({
            title: 'Berhasil',
            description: result.message || 'Berhasil release claim',
          })
          
          return true
        } else {
          throw new Error(result.error || 'Failed to release claim')
        }
      } catch (err: any) {
        console.error('❌ [useReleaseTask] Error:', err)
        
        const errorMessage = err?.message || 'Gagal release claim'
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        
        return false
      } finally {
        setLoading(false)
        console.log('🏁 [useReleaseTask] Finished')
      }
    },
    [toast],
  )

  return { releaseTask, loading }
}

// ============================================
// HELPER: Format currency
// ============================================

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'Rp 0'
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================
// HELPER: Format date
// ============================================

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================
// HELPER: Format datetime
// ============================================

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-'
  
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================
// HELPER: Get payment type label
// ============================================

export function getPaymentTypeLabel(paymentType: string | null | undefined): string {
  if (!paymentType) return 'Invoice'
  
  const labels: Record<string, string> = {
    pnbp: 'PNBP',
    dp: 'DP',
    pelunasan: 'Pelunasan',
    invoice: 'Invoice',
  }
  
  return labels[paymentType.toLowerCase()] || paymentType
}

// ============================================
// HELPER: Get status color
// ============================================

export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'gray'
  
  const colors: Record<string, string> = {
    pending: 'yellow',
    sent: 'blue',
    awaitingpayment: 'purple',
    completed: 'green',
    hold: 'red',
  }
  
  return colors[status.toLowerCase()] || 'gray'
}
