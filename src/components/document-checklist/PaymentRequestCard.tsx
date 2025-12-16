'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  Eye,
  Download,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Interface dengan status baru (camelCase untuk layer React)
export interface PaymentRequest {
  id: string
  serviceid: string
  paymenttype: 'pnbp' | 'invoice' | 'pelunasan' | 'dp' | 'lainnya'
  status: 'pending' | 'sent' | 'awaitingpayment' | 'completed' | 'hold'
  amount?: number
  duedate?: string
  notes?: string | null

  // File dari keuangan ke notaris
  sentat?: string | null
  financefileurl?: string | null
  financefilename?: string | null

  // Bukti bayar dari notaris
  paidat?: string | null
  paymentproofurl?: string | null
  paymentproofname?: string | null

  // Validasi & hold
  completedat?: string | null
  validatedby?: string | null
  holdreason?: string | null
}

interface PaymentRequestCardProps {
  type: 'pnbp' | 'invoice'
  serviceId: string
  stepInstanceId?: string
  existingRequest?: PaymentRequest
  onRequestSent?: () => void
  onFileUploaded?: () => void
  onRefresh?: () => void
}

export function PaymentRequestCard({
  type,
  serviceId,
  stepInstanceId,
  existingRequest,
  onRequestSent,
  onFileUploaded,
  onRefresh,
}: PaymentRequestCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Local copy (optimistic UI)
  const [localRequest, setLocalRequest] = useState<PaymentRequest | undefined>(existingRequest)

  // Sync ketika existingRequest dari parent berubah
  useEffect(() => {
    setLocalRequest(existingRequest)
  }, [existingRequest])

  // Dialog request
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestAmount, setRequestAmount] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [requestDueDate, setRequestDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  )

  // Upload bukti bayar
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // Untuk catatan di dialog konfirmasi
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  console.log('🔍 [PaymentRequestCard] Rendered with:', {
    type,
    status: localRequest?.status,
    financefileurl: localRequest?.financefileurl,
    paymentproofurl: localRequest?.paymentproofurl,
    paidat: localRequest?.paidat,
  })

  // Derived status
  const isCompleted = localRequest?.status === 'completed'
  const isPending = localRequest?.status === 'pending'
  const isSent = localRequest?.status === 'sent'
  const isAwaitingPayment = localRequest?.status === 'awaitingpayment'
  const isHold = localRequest?.status === 'hold'

  const title = type === 'pnbp' ? 'PNBP' : 'Invoice'

  // Format Rp (string → string berformat)
  const formatRupiah = (value: string) => {
    const numeric = value.replace(/\D/g, '')
    if (!numeric) return ''
    return Number(numeric).toLocaleString('id-ID')
  }

  // Parse Rp (string berformat → number)
  const parseRupiah = (value: string): number => {
    const numeric = value.replace(/\D/g, '')
    return numeric ? parseInt(numeric, 10) : 0
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRupiah(e.target.value)
    setRequestAmount(formatted)
  }

  // Badge status
  const getStatusBadge = () => {
    if (!localRequest) return null

    const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        label: 'Menunggu Keuangan',
      },
      sent: {
        color: 'bg-blue-100 text-blue-800',
        icon: FileText,
        label: 'Dokumen Terkirim',
      },
      awaitingpayment: {
        color: 'bg-purple-100 text-purple-800',
        icon: Clock,
        label: 'Menunggu Validasi',
      },
      completed: {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
        label: 'Selesai',
      },
      hold: {
        color: 'bg-orange-100 text-orange-800',
        icon: AlertCircle,
        label: 'Ditahan',
      },
    }

    const config = statusConfig[localRequest.status] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-sm px-3 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Request payment
  const handleRequestPayment = async () => {
    const amount = parseRupiah(requestAmount)

    if (!amount || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Nominal harus diisi dan lebih besar dari 0',
        variant: 'destructive',
      })
      return
    }

    if (!serviceId) {
      toast({
        title: 'Error',
        description: 'Service ID tidak valid',
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

      if (sessionError || !session?.access_token) {
        throw new Error('User tidak terautentikasi')
      }

      // Sesuaikan path dengan backend-mu (contoh: /apipnbprequest, /apiinvoicerequest)
      const endpoint = type === 'pnbp' ? '/api/pnbp/request' : '/api/invoice/request'

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId,
          workflowStepInstanceId: stepInstanceId,
          amount,
          dueDate: requestDueDate,
          notes: requestNotes || null,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Request gagal')
      }

      toast({
        title: 'Berhasil',
        description: `Request ${title} sebesar ${formatCurrency(amount)} telah dikirim ke Keuangan`,
      })

      const backendData = result.data as { id: string } | undefined

      // Simpan state lokal (optimistic)
      setLocalRequest({
        id: backendData?.id || crypto.randomUUID(),
        serviceid: serviceId,
        paymenttype: type,
        status: 'pending',
        amount,
        duedate: requestDueDate,
        notes: requestNotes || null,
        sentat: null,
        financefileurl: null,
        financefilename: null,
        paidat: null,
        paymentproofurl: null,
        paymentproofname: null,
        completedat: null,
        validatedby: null,
        holdreason: null,
      })

      // Reset dialog
      setRequestDialogOpen(false)
      setRequestAmount('')
      setRequestNotes('')
      setRequestDueDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      )

      // Callback ke parent
      onRequestSent?.()
      onFileUploaded?.()
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Upload bukti bayar
  const handleUploadPaymentProof = async () => {
    if (!uploadFile || !localRequest?.id) {
      toast({
        title: 'Error',
        description: 'File dan tanggal bayar harus diisi',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('requestId', localRequest.id)
      formData.append('paidAt', paidDate)
      formData.append('notes', notes)

      // Sesuaikan path dengan backend-mu (tanpa /api kalau apiFetch sudah menambahkan base)
      const endpoint =
        type === 'pnbp'
          ? '/api/pnbp/upload-payment-proof'
          : '/api/invoice/upload-payment-proof'

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const raw = await response.text()
        console.error('[UploadPaymentProof] HTTP error', response.status, raw)
        throw new Error(`Upload gagal (HTTP ${response.status})`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Gagal upload bukti pembayaran')
      }

      toast({
        title: 'Berhasil',
        description: 'Bukti pembayaran berhasil diupload dan menunggu validasi',
      })

      setUploadDialogOpen(false)
      setUploadFile(null)
      setNotes('')
      setPaidDate(new Date().toISOString().slice(0, 10))

      // Biarkan source of truth tetap di backend: paksa refetch
      onRefresh?.()
      onFileUploaded?.()
      onRequestSent?.()
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal upload bukti pembayaran',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Ukuran file maksimal 10MB',
          variant: 'destructive',
        })
        return
      }

      setUploadFile(file)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <>
      <Card className="border-2">
        <CardHeader className="bg-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            {localRequest && getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* BELUM ADA REQUEST */}
          {!localRequest && (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                Belum ada request {title} untuk layanan ini
              </p>
              <Button
                onClick={() => setRequestDialogOpen(true)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Request {title}
              </Button>
            </div>
          )}

          {/* STATUS PENDING */}
          {isPending && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="font-semibold text-yellow-900">Menunggu Proses Keuangan</p>
              </div>

              {localRequest?.amount && (
                <div className="bg-white border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">Nominal yang direquest:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(localRequest.amount)}
                  </p>
                  {localRequest.duedate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Jatuh tempo: {formatDate(localRequest.duedate)}
                    </p>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600">
                Request Anda sedang diproses oleh bagian keuangan. Anda akan mendapat notifikasi
                ketika {type === 'pnbp' ? 'bukti PNBP' : 'invoice'} sudah tersedia.
              </p>

              {localRequest?.notes && (
                <div className="mt-3 bg-white p-2 rounded border text-sm text-gray-700">
                  <span className="font-semibold">Catatan:</span> {localRequest.notes}
                </div>
              )}
            </div>
          )}

          {/* STATUS SENT */}
          {isSent && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">
                    {type === 'pnbp' ? 'Bukti PNBP Tersedia' : 'Invoice Tersedia'}
                  </h4>
                </div>

                {localRequest?.amount && (
                  <div className="bg-white border border-green-200 p-3 rounded mb-3">
                    <p className="text-sm text-gray-600">Nominal:</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatCurrency(localRequest.amount)}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-700 mb-3">
                  Dokumen dikirim pada{' '}
                  <span className="font-semibold">
                    {localRequest?.sentat
                      ? new Date(localRequest.sentat).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </p>

                {localRequest?.financefileurl ? (
                  <div className="bg-white border border-green-200 p-3 rounded flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">
                        {localRequest.financefilename || 'Dokumen'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`${API_URL}${localRequest.financefileurl}`, '_blank')
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Lihat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = `${API_URL}${localRequest.financefileurl}`
                          a.download = localRequest.financefilename || 'dokumen'
                          a.click()
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-900 mb-1">
                          File Belum Tersedia
                        </p>
                        <p className="text-sm text-yellow-800">
                          File {type === 'pnbp' ? 'bukti PNBP' : 'invoice'} sedang diproses atau
                          belum diupload oleh keuangan.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {localRequest?.financefileurl && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Upload Bukti Pembayaran dari Klien
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Tanggal Bayar</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="date"
                          value={paidDate}
                          onChange={(e) => setPaidDate(e.target.value)}
                          className="max-w-xs"
                        />
                        <Calendar className="h-5 w-5 text-gray-500" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Bukti Transfer</Label>
                      <div className="mt-1">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload-proof"
                        />
                        <label
                          htmlFor="file-upload-proof"
                          className="border-2 border-dashed border-blue-300 rounded p-4 bg-blue-50 flex flex-col items-center cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                          {uploadFile ? (
                            <>
                              <FileText className="h-8 w-8 text-blue-600 mb-1" />
                              <p className="text-sm font-medium text-blue-600">
                                {uploadFile.name}
                              </p>
                              <p className="text-xs text-gray-500">Klik untuk ganti</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-blue-500 mb-1" />
                              <p className="text-sm text-gray-600">Klik untuk upload bukti</p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Catatan (Opsional)</Label>
                      <Textarea
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        placeholder="Tambahkan catatan..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => setUploadDialogOpen(true)}
                      disabled={!uploadFile || !paidDate || loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Mengupload...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Bukti Bayar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {!localRequest?.financefileurl && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Form upload bukti pembayaran akan tersedia setelah file dari keuangan tersedia
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STATUS AWAITING_PAYMENT */}
          {isAwaitingPayment && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                <p className="font-semibold text-purple-900">Menunggu Validasi Keuangan</p>
              </div>

              {localRequest?.amount && (
                <div className="bg-white border border-purple-200 p-3 rounded mb-3">
                  <p className="text-sm text-gray-600">Nominal:</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(localRequest.amount)}
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-700 mb-3">
                Bukti bayar diupload pada{' '}
                <span className="font-semibold">
                  {localRequest?.paidat
                    ? new Date(localRequest.paidat).toLocaleString('id-ID')
                    : '-'}
                </span>
              </p>

              {localRequest?.paymentproofurl && (
                <div className="bg-white border border-purple-200 p-3 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">
                      {localRequest.paymentproofname || 'Bukti Bayar'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(`${API_URL}${localRequest.paymentproofurl}`, '_blank')
                    }
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Lihat
                  </Button>
                </div>
              )}

              {localRequest?.notes && (
                <div className="mt-2 bg-white p-2 rounded border text-sm">
                  <span className="font-semibold">Catatan:</span> {localRequest.notes}
                </div>
              )}
            </div>
          )}

          {/* STATUS COMPLETED */}
          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="font-bold text-green-900 mb-1">Pembayaran Tervalidasi</h4>

              {localRequest?.amount && (
                <p className="text-xl font-bold text-green-700 mb-2">
                  {formatCurrency(localRequest.amount)}
                </p>
              )}

              <p className="text-sm text-gray-600">
                Divalidasi pada{' '}
                {localRequest?.completedat ? formatDate(localRequest.completedat) : '-'}
              </p>
            </div>
          )}

          {/* STATUS HOLD */}
          {isHold && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <p className="font-semibold text-orange-900">Proses Ditahan</p>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                Request ditahan oleh keuangan dengan alasan:
              </p>
              {localRequest?.holdreason && (
                <div className="bg-white border border-orange-200 p-2 rounded text-sm">
                  {localRequest.holdreason}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG REQUEST */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <DollarSign className="h-5 w-5" />
              Request {title} ke Keuangan
            </DialogTitle>
            <DialogDescription>
              Masukkan nominal dan informasi pembayaran yang akan direquest
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">
                Nominal {title} <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  Rp
                </span>
                <Input
                  type="text"
                  value={requestAmount}
                  onChange={handleAmountChange}
                  placeholder="1.000.000"
                  className="pl-10 text-lg font-semibold"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Contoh: 1.000.000 untuk satu juta rupiah
              </p>
            </div>

            <div>
              <Label className="text-sm font-semibold">Jatuh Tempo</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="date"
                  value={requestDueDate}
                  onChange={(e) => setRequestDueDate(e.target.value)}
                />
                <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Catatan (Opsional)</Label>
              <Textarea
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Tambahkan catatan untuk keuangan..."
                rows={3}
                className="mt-1"
              />
            </div>

            {requestAmount && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-xs text-blue-700 mb-1">Preview:</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(parseRupiah(requestAmount))}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestDialogOpen(false)
                setRequestAmount('')
                setRequestNotes('')
              }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleRequestPayment}
              disabled={loading || !requestAmount || parseRupiah(requestAmount) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Kirim Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI UPLOAD BUKTI BAYAR */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Upload className="h-5 w-5" />
              Konfirmasi Upload Bukti Bayar
            </DialogTitle>
            <DialogDescription>
              Pastikan informasi pembayaran sudah benar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {uploadFile && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-sm font-semibold text-blue-700">File:</p>
                <p className="text-sm text-blue-600">{uploadFile.name}</p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 p-3 rounded">
              <p className="text-sm font-semibold text-gray-700">Tanggal Bayar:</p>
              <p className="text-sm text-gray-600">{formatDate(paidDate)}</p>
            </div>

            {uploadNotes && (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">Catatan:</p>
                <p className="text-sm text-gray-600">{uploadNotes}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleUploadPaymentProof}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Ya, Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
