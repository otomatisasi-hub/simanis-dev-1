import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ClaimButton } from './ClaimButton'
import type { FinanceRecord } from '@/lib/api/finance'
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

interface FinanceTableProps {
  data: FinanceRecord[]
  onRefresh: () => void
  onViewDetail: (row: FinanceRecord) => void
  onReviewPayment?: (row: FinanceRecord) => void
  itemsPerPage: number
  currentPage: number
  onPageChange: (page: number) => void
  search: string
  onSearchChange: (value: string) => void
}

export function FinanceTable({
  data,
  onRefresh,
  onViewDetail,
  onReviewPayment,
  itemsPerPage,
  currentPage,
  onPageChange,
  search,
  onSearchChange,
}: FinanceTableProps) {
  const safeData = Array.isArray(data) ? data : []

  const filteredData = useMemo(() => {
    if (!search) return safeData
    const s = search.toLowerCase()

    return safeData.filter((item) => {
      const client = item.clientname?.toLowerCase() ?? ''
      const service = item.servicetitle?.toLowerCase() ?? ''
      const jenis = item.jenistransaksi?.toLowerCase() ?? ''
      const invoice = item.invoicenumber?.toLowerCase() ?? ''
      const modul = item.modul?.toLowerCase() ?? ''

      return (
        client.includes(s) ||
        service.includes(s) ||
        jenis.includes(s) ||
        invoice.includes(s) ||
        modul.includes(s)
      )
    })
  }, [safeData, search])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, currentPage, itemsPerPage])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / itemsPerPage) || 1,
  )

  const formatCurrency = (amount: number | null | undefined) => {
    const value = typeof amount === 'number' ? amount : 0
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatShortDate = (value: string | null | undefined) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
  
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = String(d.getFullYear()).slice(-2)
  
    return `${day}-${month}-${year}` // dd-mm-yy
  }
  

  const getStatusBadge = (status: string | null | undefined) => {
    const s = (status ?? 'unpaid').toLowerCase()

    const variants: Record<string, 'secondary' | 'default' | 'outline' | 'destructive'> = {
      pending: 'secondary',
      completed: 'default',
      paid: 'default',
      partial: 'outline',
      unpaid: 'destructive',
    }

    const labels: Record<string, string> = {
      pending: 'Pending',
      completed: 'Completed',
      paid: 'Paid',
      partial: 'Partial',
      unpaid: 'Unpaid',
    }

    return (
      <Badge variant={variants[s] ?? 'secondary'}>
        {labels[s] ?? status ?? 'Unknown'}
      </Badge>
    )
  }

  const getClaimBadge = (status: string | null | undefined) => {
    const s = (status ?? '').toLowerCase()

    const variants: Record<string, 'secondary' | 'default' | 'outline' | 'destructive'> = {
      biayalayanan: 'outline',
      available: 'default',
      claimed: 'secondary',
    }

    const labels: Record<string, string> = {
      biayalayanan: 'Biaya Layanan',
      available: 'Tersedia',
      claimed: 'Diklaim',
    }

    if (!s) {
      return (
        <Badge variant="secondary">
          -
        </Badge>
      )
    }

    return (
      <Badge variant={variants[s] ?? 'secondary'}>
        {labels[s] ?? status}
      </Badge>
    )
  }

  const handlePrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari klien, layanan, invoice, atau jenis transaksi..."
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value)
            onPageChange(1) // reset ke halaman pertama saat search berubah
          }}
          className="max-w-md"
        />
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tanggal Masuk</TableHead>
              <TableHead>Klien</TableHead>
              <TableHead>Layanan</TableHead>
              <TableHead>Nominal</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Sisa</TableHead>
              <TableHead>Diklaim Oleh</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="py-8 text-center text-muted-foreground"
                >
                  {search
                    ? 'Tidak ada data yang cocok dengan pencarian'
                    : 'Tidak ada data'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index + 1
                const sisa = row.sisabayar ?? 0
                const sudahBayar = row.totalbayar ?? 0

                return (
                  <TableRow key={row.id}>
                    <TableCell>{globalIndex}</TableCell>

                    {/* Modul */}
                    <TableCell>
                      <Badge variant="secondary">
                        {row.modul || '-'}
                      </Badge>
                    </TableCell>

                    {/* Jenis */}
                    <TableCell className="whitespace-nowrap">
                        <Badge className="whitespace-nowrap">
                          {formatShortDate(row.createdat)}
                        </Badge>
                      </TableCell>

                    {/* Klien */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.clientname}</p>
                        {row.clientphone && (
                          <p className="text-sm text-muted-foreground">
                            {row.clientphone}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Layanan */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.servicetitle}</p>
                        {row.sublayanan && (
                          <p className="text-sm text-muted-foreground">
                            {row.sublayanan}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Nominal + info sudah bayar */}
                    <TableCell className="text-right font-mono">
                      <div className="font-semibold text-lg">
                        {formatCurrency(row.nominal)}
                      </div>
                      {sudahBayar > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Sudah bayar {formatCurrency(sudahBayar)}
                        </p>
                      )}
                    </TableCell>

                    {/* Total Masuk */}
                    <TableCell className="text-right font-mono">
                      {sudahBayar > 0 ? formatCurrency(sudahBayar) : '-'}
                    </TableCell>

                    {/* Sisa Bayar */}
                    <TableCell className="text-right font-mono">
                      <span className={sisa > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {formatCurrency(sisa)}
                      </span>
                    </TableCell>

                    {/* Diklaim Oleh */}
                    <TableCell>
                      {row.claimedbyname ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {row.claimedbyname}
                          </Badge>
                          {row.claimedat && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(row.claimedat).toLocaleDateString(
                                'id-ID',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                },
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Belum diklaim
                        </span>
                      )}
                    </TableCell>

                    {/* Aksi */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewDetail(row)}
                          title="Lihat detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Review pembayaran hanya untuk Biaya Layanan yang bisa diproses */}
                        {onReviewPayment &&
                          row.jenistransaksi === 'Biaya Layanan' &&
                          row.canprocesspayment && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReviewPayment(row)}
                            >
                              Review
                            </Button>
                          )}

                        {/* Claim hanya jika canclaim true (PNBP / Invoice) */}
                        {row.canclaim && (
                          <ClaimButton
                            financeId={row.id}
                            onSuccess={onRefresh}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Halaman {currentPage} dari {totalPages} ({filteredData.length} data)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
