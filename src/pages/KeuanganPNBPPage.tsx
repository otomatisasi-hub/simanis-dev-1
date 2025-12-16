'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/custom-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Loader2, Search } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'

/**
 * Interface mengikuti bentuk data hasil endpoint /api/pnbp/requests
 * yang sudah disesuaikan dengan skema baru (step_order, step_name, dst).
 * Backend mengambil data dari:
 * - pnbp_requests
 * - services (join ke clients)
 * - workflow_step_instances -> workflow_instances -> workflow_template_steps
 */
interface WorkflowTemplateStep {
  id: string
  step_order: number
  step_name: string
}

interface WorkflowTemplate {
  id: string
  workflow_template_steps: WorkflowTemplateStep[]
}

interface WorkflowInstance {
  id: string
  workflow_templates?: WorkflowTemplate
}

interface WorkflowStepInstance {
  id: string
  step_order: number
  workflow_instances?: WorkflowInstance
}

interface Client {
  full_name: string
}

interface Service {
  title: string
  reference_number?: string
  clients?: Client
}

interface RequestedByProfile {
  full_name: string
}

interface PnbpRequest {
  id: string
  service_id: string
  workflow_step_instance_id: string
  status: 'pending' | 'completed' | 'hold'
  requested_at: string
  completed_at?: string
  hold_reason?: string
  notes?: string
  services?: Service
  workflow_step_instances?: WorkflowStepInstance
  requested_by_profile?: RequestedByProfile
}

export function KeuanganPNBPPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [requests, setRequests] = useState<PnbpRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Ambil data PNBP dari backend yang sudah menyesuaikan skema baru
  useEffect(() => {
    fetchPNBPRequests()

    // Auto refresh tiap 30 detik (opsional)
    const interval = setInterval(fetchPNBPRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchPNBPRequests = async () => {
    try {
      setLoading(true)

      // Ambil token Supabase untuk dipakai di backend
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session tidak ditemukan')

      // Panggil backend yang sudah men-join sesuai skema baru
      const response = await fetch('http://localhost:3001/api/pnbp/requests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mendapatkan daftar PNBP')
      }

      setRequests(result.data as PnbpRequest[])
    } catch (error: any) {
      console.error('Fetch PNBP requests error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: PnbpRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
        <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 font-normal">
          Pending
        </Badge>
        )
      case 'completed':
        return (
        <Badge className="bg-green-100 text-green-700 border border-green-300 font-normal">
          Selesai
        </Badge>
        )
      case 'hold':
        return (
        <Badge className="bg-orange-100 text-orange-700 border border-orange-300 font-normal">
          Ditahan
        </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  /**
   * Ambil nama step workflow berdasarkan step_order
   * dari workflow_template_steps (mengikuti skema baru).
   */
  const getStepName = (request: PnbpRequest): string => {
    try {
      const workflowStepInstance = request.workflow_step_instances
      if (!workflowStepInstance) return '-'

      const templateSteps =
        workflowStepInstance.workflow_instances?.workflow_templates
          ?.workflow_template_steps

      if (!templateSteps || templateSteps.length === 0) return '-'

      const currentStep = templateSteps.find(
        (step) => step.step_order === workflowStepInstance.step_order,
      )

      return currentStep?.step_name || '-'
    } catch (err) {
      console.error('Error getting step name:', err)
      return '-'
    }
  }

  const handleViewDetail = (requestId: string) => {
    navigate(`/keuangan/pnbp/${requestId}`)
  }

  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const serviceTitle = request.services?.title?.toLowerCase() || ''
    const clientName = request.services?.clients?.full_name?.toLowerCase() || ''
    const referenceNumber =
      request.services?.reference_number?.toLowerCase() || ''
    const stepName = getStepName(request).toLowerCase()

    return (
      serviceTitle.includes(searchLower) ||
      clientName.includes(searchLower) ||
      referenceNumber.includes(searchLower) ||
      stepName.includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            PNBP Requests
          </h2>
          <p className="text-muted-foreground">
            Kelola permintaan PNBP dari notaris
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Daftar Permintaan PNBP</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari layanan, klien, atau step..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada permintaan PNBP
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Klien</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Diminta Oleh</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request, index) => (
                      <TableRow key={request.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {request.services?.clients?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          {request.services?.title || '-'}
                        </TableCell>
                        <TableCell>
                          {request.requested_by_profile?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          {request.requested_at
                            ? new Date(
                                request.requested_at,
                              ).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(request.id)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Detail
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
