// src/types/payment.ts

export type PaymentStatus = 
  | 'pending' 
  | 'sent' 
  | 'awaitingpayment' 
  | 'completed' 
  | 'hold'

export interface PaymentRequest {
  id: string
  service_id: string
  step_instance_id: string
  status: PaymentStatus
  amount: number
  due_date: string
  
  // Fase 1: Request
  requested_at: string
  requested_by: string
  notes?: string
  
  // Fase 2: Keuangan kirim dokumen
  sent_at?: string
  finance_file_url?: string
  finance_file_name?: string
  
  // Fase 3: Notaris upload bukti bayar
  paid_at?: string
  payment_proof_url?: string
  payment_proof_name?: string
  
  // Fase 4: Validasi keuangan
  completed_at?: string
  validated_by?: string
  
  // Hold
  hold_reason?: string
  held_at?: string
}
