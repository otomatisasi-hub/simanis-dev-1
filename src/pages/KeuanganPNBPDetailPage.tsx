'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Calendar,
  CheckCircle2,
  Loader2,
  PauseCircle,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface Client {
  full_name: string
}

interface Service {
  id: string
  title: string
  deadline?: string | null
  clients?: Client
}

interface PnbpRequest {
  id: string
  service_id: string
  status: 'pending' | 'completed' | 'hold'
  notes?: string | null
  holdreason?: string | null
  services?: Service
  fileurl?: string | null
}

export function KeuanganPNBPDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [request, setRequest] = useState<PnbpRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)

  // form
  const [deadline, setDeadline] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [notes, setNotes] = useState('')
  const [holdReason, setHoldReason] = useState('')

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [holdDialogOpen, setHoldDialogOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchRequestDetail(id as string)
    }
  }, [id])

  const fetchRequestDetail = async (requestId: string) => {
    try {
      setLoading(true)

      // Ambil token dari Supabase
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token

      // SESUAIKAN PATH DENGAN BACKEND-MU:
      // kalau endpointmu /apipnbprequest/:id, ganti di sini.
      const response = await fetch(
        `${API_URL}/api/pnbp/request/${requestId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Data tidak ditemukan')
      }

      const data = result.data as PnbpRequest
      setRequest(data)

      setNotes(data.notes || '')

      const dl = data.services?.deadline
      if (dl) {
        const iso = dl.includes('T') ? dl.slice(0, 10) : dl
        setDeadline(iso)
      } else {
        setDeadline(new Date().toISOString().slice(0, 10))
      }

      // default tanggal bayar = hari ini
      setPaidAt(new Date().toISOString().slice(0, 10))
    } catch (error: any) {
      console.error('❌ Fetch PNBP detail error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!request) return

    try {
      if (!paidAt) {
        throw new Error('Tanggal bayar harus diisi')
      }

      setSubmitLoading(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('User tidak terautentikasi')
      }

      // 1) Tandai PNBP sebagai completed
      // SESUAIKAN PATH DENGAN BACKEND-MU:
      // kalau endpointmu /apipnbpcomplete, ganti di sini.
      const response = await fetch(`${API_URL}/api/pnbp/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          paidAt,
          notes: notes || null,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`,
        )
      }

      toast({
        title: 'Berhasil',
        description: 'PNBP berhasil diproses dan diselesaikan',
      })
      navigate('/keuangan/workload')
    } catch (error: any) {
      console.error('❌ Submit PNBP error:', error)
      toast({
        title: 'Error',
        description:
          error.message || 'Terjadi kesalahan saat memproses PNBP',
        variant: 'destructive',
      })
    } finally {
      setSubmitLoading(false)
      setSubmitDialogOpen(false)
    }
  }

  const handleHold = async () => {
    if (!request || !holdReason.trim()) {
      toast({
        title: 'Error',
        description: 'Alasan hold harus diisi',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitLoading(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error('User tidak terautentikasi')
      }

      // SESUAIKAN PATH DENGAN BACKEND-MU:
      // kalau endpointmu /apipnbphold, ganti di sini.
      const response = await fetch(`${API_URL}/api/pnbp/hold`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          reason: holdReason.trim(),
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`,
        )
      }

      toast({
        title: 'Berhasil',
        description: 'PNBP berhasil di-hold',
      })
      navigate('/keuangan/workload')
    } catch (error: any) {
      console.error('❌ Hold PNBP error:', error)
      toast({
        title: 'Error',
        description:
          error.message || 'Terjadi kesalahan saat hold PNBP',
        variant: 'destructive',
      })
    } finally {
      setSubmitLoading(false)
      setHoldDialogOpen(false)
    }
  }

  const progressLabel = useMemo(() => {
    if (!request) return '-'
    if (request.status === 'completed') return '100%'
    if (request.status === 'pending') return '50%'
    if (request.status === 'hold') return 'On Hold'
    return '-'
  }, [request])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBEA]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#FFFBEA]">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Request PNBP tidak ditemukan</p>
              <Button
                onClick={() => navigate('/keuangan/workload')}
                className="mt-4"
              >
                Kembali
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const serviceTitle = request.services?.title || 'Layanan'
  const clientName = request.services?.clients?.full_name || 'N/A'
  const dueLabel = deadline
    ? new Date(deadline).toLocaleDateString('id-ID')
    : '-'

  return (
    <div className="min-h-screen bg-[#FFFBEA]">
      <Header />

      <main className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">
            Dashboard
          </h1>
          <p className="text-gray-600">Keuangan - PNBP</p>
        </div>

        <Card className="bg-[#E8F5E9] shadow-lg border-2 border-gray-300 mb-6">
          <CardContent className="p-6">
            {/* DETAIL */}
            <div className="mb-6 bg-white p-4 rounded-lg border-2 border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Layanan</span> :{' '}
                    {serviceTitle}
                  </p>
                  <p className="text-sm text-gray-600">
                    Klien : {clientName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Jatuh Tempo : {dueLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    Status
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-2">
                    Progress {progressLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* BUKTI BAYAR PNBP */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-300 mb-6">
              <Label className="text-sm font-semibold">
                Bukti Bayar PNBP
              </Label>
              {request.fileurl ? (
                <>
                  <a
                    href={`${API_URL}/${request.fileurl.replace(
                      /^\/?/,
                      '',
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 underline text-blue-600"
                  >
                    Lihat / Unduh Bukti Bayar
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    Klik tautan di atas untuk melihat dokumen bukti bayar
                    yang telah diunggah notaris.
                  </p>
                </>
              ) : (
                <p className="text-gray-500 italic mt-1">
                  Bukti bayar belum diupload oleh notaris.
                </p>
              )}
            </div>

            {/* FORM PROSES */}
            <div className="bg-white p-6 rounded-lg border-2 border-gray-300">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">
                      Deadline (Opsional) :
                    </Label>
                    <div className="flex items-center gap-2 mt-1 max-w-xs">
                      <Input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                      <Calendar className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Tanggal Bayar PNBP :
                    </Label>
                    <Input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className="mt-1 max-w-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Catatan (Opsional) :
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tambahkan catatan..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => setSubmitDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-8"
                    disabled={submitLoading}
                  >
                    Proses
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 px-8"
                    onClick={() => setHoldDialogOpen(true)}
                    disabled={submitLoading}
                  >
                    Hold
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 px-8"
                    onClick={() => navigate('/keuangan/workload')}
                    disabled={submitLoading}
                  >
                    Kembali
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Dialog Submit */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Konfirmasi Proses
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Apakah Anda yakin ingin menyelesaikan proses PNBP ini?
            </p>

            {notes && (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                <p className="text-sm font-semibold text-gray-700">
                  Catatan:
                </p>
                <p className="text-sm text-gray-600">{notes}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-sm font-semibold text-blue-700">
                Tanggal Bayar:
              </p>
              <p className="text-sm text-blue-600">
                {paidAt
                  ? new Date(paidAt).toLocaleDateString('id-ID')
                  : '-'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
              disabled={submitLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ya, Proses
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hold */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <PauseCircle className="h-5 w-5" />
              Hold PNBP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Dengan hold, notaris dapat melanjutkan proses dengan catatan
              PNBP belum selesai.
            </p>

            <div className="space-y-2">
              <Label htmlFor="hold-reason">
                Alasan Hold <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="hold-reason"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Jelaskan alasan hold..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHoldDialogOpen(false)}
              disabled={submitLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleHold}
              disabled={submitLoading || !holdReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Hold
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default KeuanganPNBPDetailPage
