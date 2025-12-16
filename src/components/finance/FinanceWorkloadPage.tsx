'use client'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinanceWorkload } from '@/hooks/useFinance'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, Package, Search } from 'lucide-react'
// import { ReleaseClaimButton } from '@/components/finance/ReleaseClaimButton'

// ✅ Type yang sesuai dengan getfinanceuserworkload
// src/types/finance.ts atau di FinanceWorkloadPage.tsx
interface FinanceWorkloadItem {
  finance_id: string
  service_id: string
  follow_up_type: 'Biaya_Layanan' | 'Invoice'
  payment_type: string | null  // 'pnbp' | 'invoice' | 'pelunasan' | 'dp'
  payment_request_id: string | null  // ✅ Key field untuk tombol
  status: string
  claimed_at: string | null
  service_title: string
  client_name: string
  client_phone?: string | null
  sublayanan?: string | null
  nominal?: number
  due_date?: string | null
}


export function FinanceWorkloadPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: workload, loading, refresh } = useFinanceWorkload()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // ✅ Handle refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await refresh()
      toast({
        title: 'Berhasil',
        description: 'Data workload berhasil direfresh',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal refresh data workload',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  // ✅ Handle process payment (perbaiki typo)
  const handleProcessPayment = (item: FinanceWorkloadItem) => {
    if (!item.payment_request_id) {
      toast({
        title: "Error",
        description: "ID permintaan pembayaran tidak ditemukan",
        variant: "destructive",
      })
      return
    }
    navigate(`/keuangan/invoice/${item.payment_request_id}`)
  }

  // ✅ Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)

  // ✅ Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // ✅ Format datetime
  const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPaymentTypeBadge = (paymentType?: string | null) => {
    if (!paymentType) {
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          -
        </Badge>
      )
    }

    const normalized = paymentType.toLowerCase()

    const variants: Record<
      string,
      {
        label: string
        variant: 'default' | 'secondary' | 'outline'
      }
    > = {
      pnbp: { label: 'PNBP', variant: 'default' },
      dp: { label: 'DP', variant: 'secondary' },
      pelunasan: { label: 'Pelunasan', variant: 'secondary' },
      invoice_pelunasan: { label: 'Pelunasan', variant: 'secondary' },
      invoice: { label: 'Invoice', variant: 'outline' },
    }

    const config =
      variants[normalized] || {
        label: normalized.toUpperCase(),
        variant: 'default' as const,
      }

    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // ✅ Get button label
  const getProcessButtonLabel = (paymentType: string | null) => {
    if (!paymentType) return 'Proses'
    
    const normalized = paymentType.toLowerCase()
    switch (normalized) {
      case 'pnbp':
        return 'Proses'
      case 'dp':
        return 'Proses'
      case 'pelunasan':
      case 'invoice_pelunasan':
        return 'Proses'
      default:
        return 'Proses'
    }
  }

  // ✅ Filter workload
  const filteredWorkload = Array.isArray(workload)
    ? workload.filter((item) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()

        return (
          item.client_name?.toLowerCase().includes(q) ||
          item.service_title?.toLowerCase().includes(q) ||
          item.payment_type?.toLowerCase().includes(q)
        )
      })
    : []

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lembar Kerja Saya</h1>
          <p className="text-muted-foreground">
            Tugas keuangan yang telah Anda claim ({filteredWorkload.length} tugas)
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Tugas Yang Sedang Dikerjakan</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari klien, layanan, jenis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredWorkload.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Tidak ada tugas yang cocok dengan pencarian.'
                  : 'Belum ada tugas yang di-claim.'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Claim tugas dari dashboard untuk mulai bekerja.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Klien</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Diklaim</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkload.map((item, index) => (
                    <TableRow key={item.finance_id}>
                      <TableCell>{index + 1}</TableCell>

                      {/* Jenis Payment */}
                      <TableCell>
                        {getPaymentTypeBadge(item.payment_type)}
                      </TableCell>

                      {/* Klien */}
                      <TableCell>
                        <p className="font-medium">{item.client_name || '-'}</p>
                      </TableCell>

                      {/* Layanan */}
                      <TableCell>
                        <p className="font-medium">{item.service_title || '-'}</p>
                      </TableCell>

                      {/* Diklaim */}
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(item.claimed_at)}
                        </div>
                      </TableCell>

                      {/* Aksi */}
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          {/* ✅ Tombol hanya muncul untuk Invoice dengan payment_request_id */}
                          {item.follow_up_type === 'Invoice' && item.payment_request_id && (
                            <Button
                              size="sm"
                              onClick={() => handleProcessPayment(item)}
                              variant="default"
                            >
                              {getProcessButtonLabel(item.payment_type)}
                            </Button>
                          )}

                          {/* Tombol Release Claim
                          <ReleaseClaimButton
                            financeId={item.finance_id}
                            onSuccess={handleRefresh}
                          /> */}
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
    </div>
  )
}

export default FinanceWorkloadPage
