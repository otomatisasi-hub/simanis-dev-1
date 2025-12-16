'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Eye, Loader2, Search, FileText } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'

// Data dari service_finances (follow_up_type = 'Pembuatan Invoice')
interface Client {
  full_name: string
}

interface Service {
  title: string
  reference_number?: string
  clients?: Client
}

interface ServiceFinance {
  id: string
  service_id: string
  follow_up_type: string
  status: 'pending' | 'completed' | 'cancelled'
  due_date?: string | null
  amount?: number | null
  invoice_number?: string | null
  services?: Service
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function KeuanganInvoicePage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [rows, setRows] = useState<ServiceFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchInvoiceRequests()

    const interval = setInterval(fetchInvoiceRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchInvoiceRequests = async () => {
    try {
      setLoading(true)

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session tidak ditemukan')

      const response = await fetch(
        `${API_URL}/api/invoice/requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal mendapatkan daftar Invoice')
      }

      setRows(result.data as ServiceFinance[])
    } catch (error: any) {
      console.error('Fetch invoice requests error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Gagal memuat data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: ServiceFinance['status']) => {
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
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 border border-red-300 font-normal">
            Batal
          </Badge>
        )
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const handleViewDetail = (financeId: string) => {
    navigate(`/keuangan/invoice/${financeId}`)
  }

  const filteredRows = rows.filter((row) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    const serviceTitle = row.services?.title?.toLowerCase() || ''
    const clientName = row.services?.clients?.full_name?.toLowerCase() || ''
    const referenceNumber =
      row.services?.reference_number?.toLowerCase() || ''
    const invoiceNumber = row.invoice_number?.toLowerCase() || ''

    return (
      serviceTitle.includes(searchLower) ||
      clientName.includes(searchLower) ||
      referenceNumber.includes(searchLower) ||
      invoiceNumber.includes(searchLower)
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Invoice
            </h2>
            <p className="text-muted-foreground">
              Kelola permintaan pembuatan Invoice dari notaris
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Daftar Permintaan Invoice</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari layanan, klien, invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada permintaan Invoice
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Klien</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {row.services?.clients?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          {row.services?.title || '-'}
                        </TableCell>
                        <TableCell>
                          {row.invoice_number || '-'}
                        </TableCell>
                        <TableCell>
                          {row.due_date
                            ? new Date(row.due_date).toLocaleDateString(
                                'id-ID',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                },
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(row.id)}
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
