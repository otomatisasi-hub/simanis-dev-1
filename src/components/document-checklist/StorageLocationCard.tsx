'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, MapPin, Eye } from 'lucide-react'

// Bentuk record yang datang dari document_storage_locations
type StorageRecord = {
  id?: string
  service_id?: string

  // kolom di tabel lokasi simpan
  storage_location?: string
  floor_number?: string | number
  rack_number?: string | number
  row_number?: string | number
  nomor_buku?: string | number | null
  nomor_lembar?: string | number | null
  year?: string | number | null
  month?: string | number | null
  notes?: string | null

  // kolom denormalisasi (opsional) kalau backend ikut simpan
  title?: string | null
  client_name?: string | null
  service_type?: string | null

  created_at?: string
  created_by?: string
  updated_at?: string
  updated_by?: string
}

// ServiceData mengikuti shape dari useDocumentChecklist
// (title, layanan, sublayanan, menulayanan, clients.fullname, dll) [file:133]
interface ServiceData {
  title?: string | null
  menulayanan?: string | null
  layanan?: string | null
  sublayanan?: string | null
  clients?: {
    fullname?: string | null
  } | null
}

interface StorageLocationCardProps {
  allStepsCompleted: boolean
  storageLocation: StorageRecord | null | undefined
  serviceData: ServiceData | null
  onOpenDialog: () => void
}

export function StorageLocationCard({
  allStepsCompleted,
  storageLocation,
  serviceData,
  onOpenDialog,
}: StorageLocationCardProps) {
  // Hanya tampil kalau semua step workflow sudah selesai
  if (!allStepsCompleted) return null

  // Helper untuk teks lokasi simpan (fallback kalau hanya punya field pecahan)
  const resolveLocationText = (): string => {
    if (!storageLocation) return '-'

    // Kalau backend sudah menyimpan string jadi storage_location, pakai itu
    if (storageLocation.storage_location) {
      return storageLocation.storage_location
    }

    // Rangkai dari pecahan jika perlu
    const parts: string[] = []

    if (storageLocation.rack_number) {
      parts.push(`No. Rak ${storageLocation.rack_number}`)
    }

    if (storageLocation.year && storageLocation.month) {
      // month di-backend biasanya angka 1–12 [file:133]
      const monthIndex = Number(storageLocation.month)
      const monthNames = [
        '',
        'Januari',
        'Februari',
        'Maret',
        'April',
        'Mei',
        'Juni',
        'Juli',
        'Agustus',
        'September',
        'Oktober',
        'November',
        'Desember',
      ]
      const monthName = monthNames[monthIndex] || storageLocation.month
      parts.push(`Minuta Notaris ${monthName} ${storageLocation.year}`)
    } else if (storageLocation.year) {
      parts.push(`Tahun ${storageLocation.year}`)
    }

    if (storageLocation.nomor_lembar) {
      parts.push(`No. ${storageLocation.nomor_lembar}`)
    }

    return parts.join(' ') || '-'
  }

  const locationText = resolveLocationText()

  // Data dari service (lebih akurat untuk judul, klien, layanan, kategori) [file:133]
  const serviceTitle = serviceData?.title ?? storageLocation?.title ?? '-'
  const clientName =
    serviceData?.clients?.fullname ?? storageLocation?.client_name ?? '-'
  const layanan = serviceData?.layanan ?? storageLocation?.service_type ?? '-'
  const kategori = serviceData?.sublayanan ?? serviceData?.menulayanan ?? '-'

  const nomorBuku =
    storageLocation?.nomor_buku != null && storageLocation.nomor_buku !== ''
      ? storageLocation.nomor_buku
      : '-'

  const nomorLembar =
    storageLocation?.nomor_lembar != null &&
    storageLocation.nomor_lembar !== ''
      ? storageLocation.nomor_lembar
      : '-'

  return (
    <Card className="bg-white shadow-lg border-2 border-gray-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Lokasi Simpan
          </h3>
          <Button
            onClick={onOpenDialog}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {storageLocation ? 'Edit Lokasi' : 'Tambah Lokasi'}
          </Button>
        </div>

        {storageLocation ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-left py-2 pr-4 whitespace-nowrap">No.</th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Judul Layanan
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Klien
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Layanan
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Kategori
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Nomor Buku
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Halaman
                    </th>
                    <th className="text-left py-2 pr-4 whitespace-nowrap">
                      Lokasi Simpan
                    </th>
                    <th className="text-center py-2 whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-blue-100 last:border-0">
                    <td className="py-3 pr-4">1.</td>
                    <td className="py-3 pr-4 font-medium">{serviceTitle}</td>
                    <td className="py-3 pr-4">{clientName}</td>
                    <td className="py-3 pr-4">{layanan}</td>
                    <td className="py-3 pr-4">{kategori}</td>
                    <td className="py-3 pr-4">{nomorBuku}</td>
                    <td className="py-3 pr-4">{nomorLembar}</td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                        {locationText}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full hover:bg-blue-100"
                        onClick={onOpenDialog}
                        title="Lihat/Edit Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {storageLocation.notes && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Catatan:</span>{' '}
                  {storageLocation.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>
              Belum ada lokasi simpan. Klik tombol di atas untuk menambahkan.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
