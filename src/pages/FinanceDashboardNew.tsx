// src/pages/FinanceDashboardNew.tsx
import { useState } from 'react'
import { useFinanceDashboard, useFinanceStatistics } from '@/hooks/useFinance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  RefreshCw,
  Wallet,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { FinanceTable } from '@/components/finance/FinanceTable'
import { FinanceDetailDialog } from '@/components/finance/FinanceDetailDialog'
import type { FinanceRecord } from '@/lib/api/finance'

const ITEMS_PER_PAGE = 10

export function FinanceDashboardNew() {
  const {
    data: dashboard,
    loading: dashLoading,
    refresh: refreshDashboard,
  } = useFinanceDashboard()
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useFinanceStatistics()
  
  console.log('[FinanceDashboardNew] stats hook', {
    statsLoading,
    statsError,
    stats,
  })
  
  const [refreshing, setRefreshing] = useState(false)

  // Detail Dialog
  const [selectedRow, setSelectedRow] = useState<FinanceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refreshDashboard(), refreshStats()])
    setCurrentPage(1) // reset ke halaman pertama setelah refresh
    setRefreshing(false)
  }

  const handleViewDetail = (row: FinanceRecord) => {
    setSelectedRow(row)
    setDetailOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // DEBUG: pastikan data benar-benar sudah sampai di halaman ini
  console.log('[FinanceDashboardNew] state', {
    dashLoading,
    statsLoading,
    dashboardLength: dashboard?.length ?? 0,
    stats,
  })

  if (dashLoading || statsLoading) {
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
          <h1 className="text-3xl font-bold">Dashboard Keuangan</h1>
          <p className="text-muted-foreground">
            Sistem Billing: Biaya Layanan → DP → Invoice (Pelunasan) — {dashboard?.length ?? 0} records
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

{/* Statistics Cards - Row 2: Billing Breakdown */}
<div className="grid gap-4 md:grid-cols-2">
  {/* Total Nominal Pending */}
  <Card className="border-orange-200 dark:border-orange-900">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Tagihan</CardTitle>
      <Wallet className="h-4 w-4 text-orange-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
        {formatCurrency(stats?.total_amount_pending ?? 0)}
      </div>
      <p className="text-xs text-muted-foreground">
        Total nominal yang belum lunas
      </p>
    </CardContent>
  </Card>

  {/* Nominal Selesai Bulan Ini */}
  <Card className="border-green-200 dark:border-green-900">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">Pembayaran</CardTitle>
      <Receipt className="h-4 w-4 text-green-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
        {formatCurrency(stats?.total_amount_completed_month ?? 0)}
      </div>
      <p className="text-xs text-muted-foreground">
        Diterima bulan ini
      </p>
    </CardContent>
  </Card>

</div>


      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <FinanceTable
            data={dashboard ?? []}          // <-- penting: selalu array
            onRefresh={handleRefresh}
            onViewDetail={handleViewDetail}
            itemsPerPage={ITEMS_PER_PAGE}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            search={search}
            onSearchChange={setSearch}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <FinanceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        finance={selectedRow}
      />
    </div>
  )
}
