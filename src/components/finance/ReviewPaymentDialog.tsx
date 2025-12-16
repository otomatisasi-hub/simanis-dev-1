// src/components/finance/ReviewPaymentDialog.tsx
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { FinanceRecord } from '@/lib/api/finance'

type FeePayment = {
  id: string
  service_finance_id: string
  service_id: string
  payment_type: string
  amount: number | null
  paid_at: string | null
  confirmation_status: string
  file_url: string | null
  file_name: string | null
  notes: string | null
}

interface ReviewPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  finance: FinanceRecord | null
  onSuccess: () => void
}

export function ReviewPaymentDialog({ 
  open, 
  onOpenChange, 
  finance,
  onSuccess 
}: ReviewPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null)
  
  // Form inputs
  const [amountInput, setAmountInput] = useState('')
  const [statusInput, setStatusInput] = useState<'pending' | 'confirmed' | 'rejected'>('pending')
  const [paidAtInput, setPaidAtInput] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatRupiahInput = (value: string) => {
    const numeric = value.replace(/\D/g, '')
    if (!numeric) return ''
    return Number(numeric).toLocaleString('id-ID')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      confirmed: 'default',
      rejected: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  useEffect(() => {
    if (open && finance) {
      loadPayments()
    } else {
      // Reset on close
      setPayments([])
      setSelectedPayment(null)
      setAmountInput('')
      setStatusInput('pending')
      setPaidAtInput('')
    }
  }, [open, finance])

  const loadPayments = async () => {
    if (!finance?.service_id) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('service_fee_payments')
        .select('*')
        .eq('service_id', finance.service_id)
        .eq('payment_type', 'fee_payment')
        .order('paid_at', { ascending: true })

      if (error) throw error

      setPayments((data || []) as FeePayment[])
    } catch (err: any) {
      console.error('Load payments error:', err)
      toast.error(err.message || 'Gagal memuat pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPayment = (payment: FeePayment) => {
    setSelectedPayment(payment)
    setAmountInput(
      payment.amount != null ? Number(payment.amount).toLocaleString('id-ID') : ''
    )
    setStatusInput(
      (payment.confirmation_status as 'pending' | 'confirmed' | 'rejected') || 'pending'
    )
    setPaidAtInput(payment.paid_at ? payment.paid_at.slice(0, 10) : '')
  }

  const handleSavePayment = async () => {
    if (!selectedPayment) return

    const rawAmount = amountInput.replace(/\D/g, '')
    const amountNumber = rawAmount ? Number(rawAmount) : 0

    if (!amountNumber || amountNumber <= 0) {
      toast.error('Masukkan nominal pembayaran lebih dari 0')
      return
    }

    if (!paidAtInput) {
      toast.error('Pilih tanggal pembayaran')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from('service_fee_payments')
        .update({
          amount: amountNumber,
          paid_at: paidAtInput,
          confirmation_status: statusInput,
        })
        .eq('id', selectedPayment.id)

      if (error) throw error

      toast.success('Pembayaran berhasil diperbarui')
      
      // Reload payments
      await loadPayments()
      
      // Trigger parent refresh
      onSuccess()
    } catch (err: any) {
      console.error('Update payment error:', err)
      toast.error(err.message || 'Gagal menyimpan pembayaran')
    } finally {
      setLoading(false)
    }
  }

  if (!finance) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Pembayaran Biaya Layanan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Service Info */}
          <div className="space-y-1 pb-3 border-b">
            <p className="font-semibold">{finance.service_title}</p>
            <p className="text-muted-foreground">
              Klien: {finance.client_name}
            </p>
            <p className="text-muted-foreground">
              Biaya Layanan: {formatCurrency(finance.nominal)}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border rounded-md bg-muted/40">
              <p className="text-xs text-muted-foreground">Total Masuk</p>
              <p className="font-semibold">{formatCurrency(finance.total_bayar)}</p>
            </div>
            <div className="p-3 border rounded-md bg-muted/40">
              <p className="text-xs text-muted-foreground">Sisa Bayar</p>
              <p className="font-semibold">
                {formatCurrency(finance.sisa_bayar > 0 ? finance.sisa_bayar : 0)}
              </p>
            </div>
            <div className="p-3 border rounded-md bg-muted/40">
              <p className="text-xs text-muted-foreground">Status Pembayaran</p>
              <div className="mt-1">
                {getStatusBadge(finance.status_pembayaran)}
              </div>
            </div>
          </div>

          {/* Payments List */}
          <div>
            <h3 className="font-semibold mb-2">Daftar Pembayaran</h3>
            {loading && payments.length === 0 ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada pembayaran untuk layanan ini.
              </p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleDateString('id-ID')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {payment.amount != null
                            ? formatCurrency(Number(payment.amount))
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.confirmation_status)}
                        </TableCell>
                        <TableCell>
                          {payment.file_url ? (
                            <a
                              href={payment.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline hover:text-blue-800"
                            >
                              {payment.file_name || 'Lihat'}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={selectedPayment?.id === payment.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleSelectPayment(payment)}
                          >
                            Pilih
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="mt-4 border-t pt-4 space-y-3">
            <h3 className="font-semibold">Isi Nominal & Konfirmasi</h3>
            
            {!selectedPayment ? (
              <p className="text-sm text-muted-foreground">
                Pilih salah satu baris pembayaran di atas untuk diisi nominalnya.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Nominal (Rp)
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amountInput}
                      onChange={(e) => setAmountInput(formatRupiahInput(e.target.value))}
                      disabled={loading}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Tanggal Bayar
                    </label>
                    <Input
                      type="date"
                      value={paidAtInput}
                      onChange={(e) => setPaidAtInput(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Status Konfirmasi
                    </label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={statusInput}
                      onChange={(e) =>
                        setStatusInput(e.target.value as 'pending' | 'confirmed' | 'rejected')
                      }
                      disabled={loading}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPayment(null)}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSavePayment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Pembayaran'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
