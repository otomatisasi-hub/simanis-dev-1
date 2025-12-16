import { useState, useCallback, useEffect } from 'react'
import { financeApi } from '@/lib/api/finance'
import { useToast } from '@/hooks/use-toast'
import type { FinanceRecord } from '@/lib/api/finance'

export function useFinanceWorkload() {
  const [workload, setWorkload] = useState<FinanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchWorkload = useCallback(async () => {
    try {
      setLoading(true)

      console.log('📡 [useFinanceWorkload] Fetching workload...')

      const result = await financeApi.getWorkload()

      console.log('📥 [useFinanceWorkload] API Response:', result)

      if (result.success && result.data) {
        console.log('📦 [useFinanceWorkload] Raw data length:', result.data.length)

        if (result.data.length > 0) {
          console.log('📦 [useFinanceWorkload] First raw item:', result.data[0])
        }

        // ✅ Sesuaikan dengan hasil getfinanceuserworkload
        const transformed = result.data.map((item: any) => {
          const transformedItem: FinanceRecord = {
            // IDs
            service_finance_id: item.finance_id,
            payment_request_id: item.payment_request_id,
            service_id: item.service_id,

            // Tipe follow up & payment
            follow_up_type: item.follow_up_type,          // 'Biaya Layanan' | 'Invoice'
            payment_type: item.payment_type || null,      // 'pnbp' | 'dp' | 'invoice_pelunasan' | null
            follow_up_type: item.payment_type || null,

            // Status finance row
            status: item.status,                          // pending | completed | on_hold | dsb

            // Client info
            client_name: item.client_name || 'Unknown',
            client_phone: item.client_phone || null,      // kalau backend belum kirim, bisa null

            // Service info
            service_title: item.service_title || 'Unknown Service',
            sub_layanan: item.sub_layanan || null,        // optional

            // Financial info (sementara 0, karena function belum return nominal/due_date)
            nominal: item.nominal || 0,
            due_date: item.due_date || null,

            // Claim info
            claimed_at: item.claimed_at,
            claimed_by: null,                             // tidak dikirim, hanya difilter di SQL

            // File info (belum ada di function)
            finance_file_url: null,
            finance_file_name: null,
            payment_proof_url: null,
            payment_proof_name: null,

            // Timestamps (belum dikirim)
            requested_at: null,
            sent_at: null,
            paid_at: null,

            // Requester info
            requested_by_name: null,
          }

          console.log('🔄 [Transform] Item transformed:', transformedItem)

          return transformedItem
        })

        console.log('✅ [useFinanceWorkload] Transformed data:', transformed)
        setWorkload(transformed)
      } else {
        console.warn('⚠️ [useFinanceWorkload] No data or failed response')
        setWorkload([])
      }
    } catch (err: any) {
      console.error('❌ [useFinanceWorkload] Error:', err)
      toast({
        title: 'Error',
        description: err.message || 'Gagal load workload',
        variant: 'destructive',
      })
      setWorkload([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchWorkload()
  }, [fetchWorkload])

  return {
    data: workload,
    workload,
    loading,
    refresh: fetchWorkload,
  }
}
